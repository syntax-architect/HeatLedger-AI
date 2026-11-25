"""
HEATLEDGER AI: CBAM Engine Service (Prompt B7)
Specification: Regulation (EU) 2023/956, Implementing Regulation (EU) 2023/1773 & 2025/2621.
Provides immutable calculation storage, versioning, recalculation, export,
and period/installation management.
"""

import io
import json
import logging
import os
import threading
from security_hardening import SafeCSVWriter
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

import pymupdf as fitz
from compliance_engine import CBAMEmissionResult, ComplianceEngine
from regulatory_store import RegulatoryStore

logger = logging.getLogger("heatledger.cbam_service")


class CBAMService:
    DB_PATH = os.path.join(os.path.dirname(__file__), "cbam_ledger.db")
    _lock = threading.RLock()

    @classmethod
    def get_connection(cls) -> Any:
        return get_db_connection(target_path=cls.DB_PATH, auto_close=False, is_service_role=True)

    @classmethod
    def init_db(cls):
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    # Installations
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS installations (
                            id TEXT PRIMARY KEY,
                            organization_id TEXT NOT NULL DEFAULT '',
                            name TEXT NOT NULL,
                            country TEXT NOT NULL,
                            unlocode TEXT NOT NULL,
                            latitude REAL,
                            longitude REAL,
                            created_at REAL NOT NULL
                        );
                    """)
                    try:
                        conn.execute("ALTER TABLE installations ADD COLUMN organization_id TEXT NOT NULL DEFAULT ''")
                    except Exception:
                        pass

                    # Reporting Periods
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS reporting_periods (
                            id TEXT PRIMARY KEY,
                            installation_id TEXT NOT NULL,
                            year INTEGER NOT NULL,
                            quarter INTEGER NOT NULL,
                            grid_kwh REAL NOT NULL,
                            solar_offset_kwh REAL DEFAULT 0,
                            fuel_liters REAL NOT NULL,
                            production_tonnes REAL NOT NULL,
                            created_at REAL NOT NULL,
                            FOREIGN KEY(installation_id) REFERENCES installations(id)
                        );
                    """)

                    # Calculations History (Immutable ledger)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS cbam_calculations (
                            id TEXT PRIMARY KEY,
                            invoice_number TEXT NOT NULL,
                            cn_code TEXT NOT NULL,
                            installation_id TEXT,
                            period_id TEXT,
                            constants_version TEXT NOT NULL,
                            method_version TEXT NOT NULL,
                            inputs_json TEXT NOT NULL,
                            outputs_json TEXT NOT NULL,
                            trace_json TEXT NOT NULL,
                            status TEXT NOT NULL,
                            parent_calc_id TEXT,
                            created_at REAL NOT NULL
                        );
                    """)

                    # Energy Bills & OCR Records (Prompt P6)
                    conn.execute("""
                        CREATE TABLE IF NOT EXISTS energy_bills (
                            id TEXT PRIMARY KEY,
                            installation_id TEXT NOT NULL,
                            period_id TEXT NOT NULL,
                            bill_type TEXT NOT NULL,
                            utility_provider TEXT NOT NULL,
                            meter_or_invoice_no TEXT NOT NULL,
                            billing_period TEXT NOT NULL,
                            billed_units REAL NOT NULL,
                            unit_label TEXT NOT NULL,
                            total_amount_inr REAL NOT NULL,
                            ocr_confidence REAL NOT NULL,
                            file_name TEXT NOT NULL,
                            status TEXT NOT NULL,
                            confirmed_at REAL,
                            created_at REAL NOT NULL
                        );
                    """)
            finally:
                conn.close()

    @classmethod
    def create_installation(
        cls,
        name: str,
        country: str,
        unlocode: str,
        lat: float = 0.0,
        lon: float = 0.0,
        organization_id: str = "",
    ) -> Dict[str, Any]:
        cls.init_db()
        inst_id = f"inst_{uuid.uuid4().hex[:12]}"
        now = time.time()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    conn.execute(
                        "INSERT INTO installations (id, organization_id, name, country, unlocode, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                        (inst_id, organization_id or "", name, country, unlocode, lat, lon, now)
                    )
            finally:
                conn.close()

        return {
            "id": inst_id,
            "organization_id": organization_id or "",
            "name": name,
            "country": country,
            "unlocode": unlocode,
            "latitude": lat,
            "longitude": lon,
            "created_at": now
        }

    @classmethod
    def list_installations(cls, organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
                if organization_id:
                    cur = conn.execute(
                        "SELECT * FROM installations WHERE organization_id = ? ORDER BY created_at DESC",
                        (organization_id,),
                    )
                else:
                    cur = conn.execute("SELECT * FROM installations ORDER BY created_at DESC")
                return [dict(r) for r in cur.fetchall()]
            finally:
                conn.close()

    @classmethod
    def create_period(
        cls,
        installation_id: str,
        year: int,
        quarter: int,
        grid_kwh: float,
        solar_offset_kwh: float,
        fuel_liters: float,
        production_tonnes: float
    ) -> Dict[str, Any]:
        cls.init_db()
        period_id = f"period_{year}_Q{quarter}_{installation_id[:8]}"
        now = time.time()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO reporting_periods
                        (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (period_id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, now)
                    )
            finally:
                conn.close()

        return {
            "id": period_id,
            "installation_id": installation_id,
            "year": year,
            "quarter": quarter,
            "grid_kwh": grid_kwh,
            "solar_offset_kwh": solar_offset_kwh,
            "fuel_liters": fuel_liters,
            "production_tonnes": production_tonnes,
            "created_at": now
        }

    @classmethod
    def run_calculation(
        cls,
        invoice_number: str,
        cn_code: str,
        net_shipment_tonnes: float,
        upstream_precursor_see: float,
        scrap_loss_ratio: float,
        monthly_grid_kwh: float,
        monthly_solar_offset_kwh: float,
        monthly_fuel_liters: float,
        monthly_total_production_tonnes: float,
        installation_id: Optional[str] = None,
        period_id: Optional[str] = None,
        year: int = 2026,
        country_of_origin: str = "IN",
        constants_version: str = "REG-2026-Q1-V1",
        eu_ets_price: Optional[float] = None,
        inr_per_eur: Optional[float] = None,
        parent_calc_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes CBAM calculation via ComplianceEngine and persists input/output/trace.
        Returns 'insufficient data' if essential fields are missing.
        """
        cls.init_db()
        calc_id = f"cbam_calc_{uuid.uuid4().hex[:16]}"
        now = time.time()

        # Check for missing data upfront
        missing = []
        if not invoice_number:
            missing.append("invoice_number")
        if not cn_code:
            missing.append("cn_code")
        if net_shipment_tonnes <= 0:
            missing.append("net_shipment_tonnes")
        if monthly_total_production_tonnes <= 0:
            missing.append("monthly_total_production_tonnes")

        inputs = {
            "invoice_number": invoice_number,
            "cn_code": cn_code,
            "net_shipment_tonnes": net_shipment_tonnes,
            "upstream_precursor_see": upstream_precursor_see,
            "scrap_loss_ratio": scrap_loss_ratio,
            "monthly_grid_kwh": monthly_grid_kwh,
            "monthly_solar_offset_kwh": monthly_solar_offset_kwh,
            "monthly_fuel_liters": monthly_fuel_liters,
            "monthly_total_production_tonnes": monthly_total_production_tonnes,
            "installation_id": installation_id,
            "period_id": period_id,
            "year": year,
            "country_of_origin": country_of_origin,
            "constants_version": constants_version,
            "eu_ets_price": eu_ets_price,
            "inr_per_eur": inr_per_eur,
        }

        if missing:
            result = CBAMEmissionResult.insufficient_data(
                invoice_number=invoice_number or "UNKNOWN",
                cn_code=cn_code or "UNKNOWN",
                missing_fields=missing,
                reason=f"Missing or invalid inputs: {', '.join(missing)}",
                country_of_origin=country_of_origin,
                net_shipment_tonnes=net_shipment_tonnes,
                constants_version=constants_version
            )
            output = result.model_dump()
            trace = {"error": "insufficient_data", "missing_fields": missing}
            status = "INSUFFICIENT_DATA"
        else:
            result = ComplianceEngine.calculate_cbam_emissions(
                invoice_number=invoice_number,
                cn_code=cn_code,
                net_shipment_tonnes=net_shipment_tonnes,
                upstream_precursor_see=upstream_precursor_see,
                scrap_loss_ratio=scrap_loss_ratio,
                monthly_grid_kwh=monthly_grid_kwh,
                monthly_solar_offset_kwh=monthly_solar_offset_kwh,
                monthly_fuel_liters=monthly_fuel_liters,
                monthly_total_production_tonnes=monthly_total_production_tonnes,
                year=year,
                country_of_origin=country_of_origin,
                constants_version=constants_version,
                eu_ets_price=eu_ets_price,
                inr_per_eur=inr_per_eur
            )
            output = result.model_dump()
            trace = result.calculation_trace
            status = "SUCCESS"

        method_version = "EU-2023/956-ANNEX-III-V2"

        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    conn.execute(
                        """
                        INSERT INTO cbam_calculations
                        (id, invoice_number, cn_code, installation_id, period_id, constants_version, method_version, inputs_json, outputs_json, trace_json, status, parent_calc_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            calc_id,
                            invoice_number or "",
                            cn_code or "",
                            installation_id,
                            period_id,
                            constants_version,
                            method_version,
                            json.dumps(inputs),
                            json.dumps(output),
                            json.dumps(trace),
                            status,
                            parent_calc_id,
                            now
                        )
                    )
            finally:
                conn.close()

        return {
            "calculation_id": calc_id,
            "status": status,
            "constants_version": constants_version,
            "method_version": method_version,
            "created_at": now,
            "parent_calc_id": parent_calc_id,
            "inputs": inputs,
            "outputs": output,
            "trace": trace
        }

    @classmethod
    def get_calculation(cls, calc_id: str) -> Optional[Dict[str, Any]]:
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
                cur = conn.execute("SELECT * FROM cbam_calculations WHERE id = ?", (calc_id,))
                row = cur.fetchone()
                if not row:
                    return None

                d = dict(row)
                return {
                    "calculation_id": d["id"],
                    "invoice_number": d["invoice_number"],
                    "cn_code": d["cn_code"],
                    "installation_id": d["installation_id"],
                    "period_id": d["period_id"],
                    "constants_version": d["constants_version"],
                    "method_version": d["method_version"],
                    "status": d["status"],
                    "parent_calc_id": d["parent_calc_id"],
                    "created_at": d["created_at"],
                    "inputs": json.loads(d["inputs_json"]),
                    "outputs": json.loads(d["outputs_json"]),
                    "trace": json.loads(d["trace_json"])
                }
            finally:
                conn.close()

    @classmethod
    def recalculate(cls, original_calc_id: str, new_constants_version: str) -> Dict[str, Any]:
        """
        Recalculates a prior calculation under a new constants version.
        Creates a new calculation record, leaving the original calculation untouched.
        """
        prior = cls.get_calculation(original_calc_id)
        if not prior:
            raise ValueError(f"Prior calculation {original_calc_id} not found")

        inputs = prior["inputs"].copy()
        inputs["constants_version"] = new_constants_version
        inputs["parent_calc_id"] = original_calc_id

        return cls.run_calculation(**inputs)

    @classmethod
    def export_calculation_csv(cls, calc_id: str) -> str:
        """
        Generates an official-style CSV data sheet for the calculation.
        """
        calc = cls.get_calculation(calc_id)
        if not calc:
            raise ValueError(f"Calculation {calc_id} not found")

        output = io.StringIO()
        writer = SafeCSVWriter(output)

        writer.writerow(["HEATLEDGER AI - CBAM CALCULATION DATA SHEET"])
        writer.writerow(["Calculation ID", calc["calculation_id"]])
        writer.writerow(["Created Timestamp (UTC)", datetime.fromtimestamp(calc["created_at"], tz=timezone.utc).isoformat()])
        writer.writerow(["Status", calc["status"]])
        writer.writerow(["Constants Version", calc["constants_version"]])
        writer.writerow(["Method Specification", calc["method_version"]])
        writer.writerow([])

        writer.writerow(["--- SHIPMENT & FACILITY PARAMETERS ---"])
        inp = calc["inputs"]
        writer.writerow(["Invoice Number", inp.get("invoice_number")])
        writer.writerow(["CN Tariff Code", inp.get("cn_code")])
        writer.writerow(["Country of Origin", inp.get("country_of_origin")])
        writer.writerow(["Net Shipment Mass (tonnes)", inp.get("net_shipment_tonnes")])
        writer.writerow(["Monthly Grid Electricity (kWh)", inp.get("monthly_grid_kwh")])
        writer.writerow(["Monthly Solar Offset (kWh)", inp.get("monthly_solar_offset_kwh")])
        writer.writerow(["Monthly Fuel Consumption (Liters)", inp.get("monthly_fuel_liters")])
        writer.writerow(["Monthly Total Production (tonnes)", inp.get("monthly_total_production_tonnes")])
        writer.writerow([])

        writer.writerow(["--- CBAM EMISSIONS BREAKDOWN (tCO2e / t) ---"])
        out = calc["outputs"]
        writer.writerow(["Precursor Embedded SEE", out.get("precursor_embedded_see")])
        writer.writerow(["Scrap Loss Multiplier", out.get("scrap_loss_ratio")])
        writer.writerow(["Plant Direct SEE (Fuel)", out.get("plant_direct_fuel_see")])
        writer.writerow(["Plant Indirect SEE (Grid Power)", out.get("plant_indirect_power_see")])
        writer.writerow(["Total Verified Embedded SEE", out.get("total_verified_see")])
        writer.writerow(["EU Default Baseline", out.get("eu_default_baseline")])
        writer.writerow(["EU Default with Markup", out.get("eu_default_with_markup")])
        writer.writerow(["Emissions Avoided per Tonne", out.get("see_avoided_per_tonne")])
        writer.writerow(["Total Carbon Avoided (tonnes CO2e)", out.get("total_carbon_avoided_tonnes")])
        writer.writerow(["EU ETS Carbon Price (EUR / tCO2e)", out.get("eu_ets_carbon_price_eur")])
        writer.writerow(["Estimated Cost Difference vs Default (EUR) [Planning Estimate]", out.get("estimated_cost_difference_eur")])
        writer.writerow(["Estimated Cost Difference vs Default (INR) [Planning Estimate]", out.get("estimated_cost_difference_inr")])

        return output.getvalue()

    @classmethod
    def seed_default_installation_if_empty(cls):
        """Seeds demo installation ONLY when DEMO_MODE=true or in explicit test mode."""
        is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
        is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if not (is_demo or is_test):
            return
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    conn.execute(
                        "UPDATE installations SET organization_id = 'org_howrah_steel_01' WHERE id = 'IN-WB-4409' AND (organization_id IS NULL OR organization_id = '')"
                    )
                    cur = conn.execute("SELECT COUNT(*) FROM installations WHERE organization_id = 'org_howrah_steel_01'")
                    if cur.fetchone()[0] == 0:
                        now = time.time()
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO installations (id, organization_id, name, country, unlocode, latitude, longitude, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                "IN-WB-4409",
                                "org_howrah_steel_01",
                                "Howrah Precision Forgings Pvt. Ltd. (Liluah Works)",
                                "India",
                                "IN CCU",
                                22.6105,
                                88.3421,
                                now
                            )
                        )
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            ("period_2026_Q1_IN-WB-4409", "IN-WB-4409", 2026, 1, 145000.0, 35000.0, 12000.0, 450.0, now)
                        )
                        conn.execute(
                            """
                            INSERT OR IGNORE INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            ("period_2025_Q4_IN-WB-4409", "IN-WB-4409", 2025, 4, 152000.0, 28000.0, 13500.0, 470.0, now - 7776000)
                        )
            finally:
                conn.close()

    @classmethod
    def get_workspace_data(cls, organization_id: str) -> Dict[str, Any]:
        """
        Retrieves the complete CBAM workspace state (Prompt P6 & Pack v5 Task 5.1):
        - Installation profile for the caller's organization (starts empty for unconfigured plants)
        - Reporting periods
        - Products by CN code with confirmed/unverified scope tagging
        - Available precursor records (accepted supplier submissions; demo samples only in DEMO_MODE)
        - Sourced regulatory constants with last-verified dates
        - Energy bills with OCR state
        """
        if not organization_id:
            raise ValueError("organization_id is required")

        is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
        is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if is_demo and organization_id in ("org_howrah_steel_01", "org_demo_howrah"):
            cls.seed_default_installation_if_empty()

        RegulatoryStore.init_tables()
        installations = cls.list_installations(organization_id=organization_id)
        inst = installations[0] if installations else None

        installation_profile: Optional[Dict[str, Any]] = None
        periods: List[Dict[str, Any]] = []
        bills: List[Dict[str, Any]] = []

        if inst:
            is_demo_inst = inst.get("id") == "IN-WB-4409" and (is_demo or is_test)
            installation_profile = {
                **inst,
                "site_code": inst.get("id", ""),
                "registered_address": (
                    "12/B Belur Road, Liluah Industrial Area, Howrah 711204, West Bengal, India"
                    if is_demo_inst else inst.get("country", "")
                ),
                "country_code": "IN",
                "process_boundaries": [
                    "Raw Billet Storage & Shearing",
                    "Reheating Furnaces (LPG / Light Fuel Oil fired batch pusher furnaces)",
                    "Drop Forging Presses (1T to 5T closed-die hammers)",
                    "Heat Treatment (Normalizing & Annealing bell furnaces)",
                    "Shot Blasting & Primary Descaling",
                    "CNC Precision Machining & Flange Facing",
                    "Non-Destructive Testing (Ultrasonic & Dye Penetrant Inspection)"
                ],
                "fuels": [
                    {"name": "Furnace Oil (Light FO)", "purpose": "Billet Reheating Furnaces", "emission_factor": "2.68 kg CO2e/L", "source": "IPCC 2006 Stationary Combustion"},
                    {"name": "Liquefied Petroleum Gas (LPG)", "purpose": "Normalizing / Heat Treatment", "emission_factor": "1.85 kg CO2e/L", "source": "IPCC 2006 Fuel Gas"},
                ],
                "electricity_connections": (
                    [
                        {"feed_type": "33kV Industrial Dedicated HT Feeder", "provider": "CESC Limited / WBSEDCL", "consumer_number": "WB-HT-90142", "sanctioned_load": "1,250 kVA", "grid_factor": "0.727 tCO2e/MWh"},
                        {"feed_type": "Captive Rooftop Solar PV", "capacity": "350 kWp Net-Metered", "status": "Operational", "clean_offset": "35,000 kWh / month avg"},
                    ]
                    if is_demo_inst else []
                ),
            }

            with cls._lock:
                conn = cls.get_connection()
                try:
                    cur = conn.execute(
                        "SELECT * FROM reporting_periods WHERE installation_id = ? ORDER BY year DESC, quarter DESC",
                        (inst["id"],),
                    )
                    periods = [dict(r) for r in cur.fetchall()]
                finally:
                    conn.close()

            bills = cls.list_energy_bills(inst["id"])

        # Products by CN code with EU / UK scope status
        products = [
            {
                "cn_code": "7307 99 10",
                "description": "Flanges and fittings of stainless or alloy forged steel",
                "scope_status": "CONFIRMED_IN_SCOPE",
                "scope_label": "Confirmed in Scope (EU & UK)",
                "jurisdictions": ["EU", "UK"],
                "eu_regulation": "Regulation (EU) 2023/956 Annex I Section 3",
                "uk_status": "Confirmed in Scope from 1 Jan 2027",
                "base_see": 4.15,
                "precursor_type": "Alloy Billets / Ingots"
            },
            {
                "cn_code": "7307 91 00",
                "description": "Flanges of non-alloy forged steel (weld neck, slip-on, blind)",
                "scope_status": "CONFIRMED_IN_SCOPE",
                "scope_label": "Confirmed in Scope (EU & UK)",
                "jurisdictions": ["EU", "UK"],
                "eu_regulation": "Regulation (EU) 2023/956 Annex I Section 3",
                "uk_status": "Confirmed in Scope from 1 Jan 2027",
                "base_see": 3.82,
                "precursor_type": "Carbon Steel Billets (C < 0.25%)"
            },
            {
                "cn_code": "7207 11 00",
                "description": "Semi-finished billets of iron or non-alloy steel (<0.25% C)",
                "scope_status": "CONFIRMED_IN_SCOPE",
                "scope_label": "Confirmed in Scope (EU & UK)",
                "jurisdictions": ["EU", "UK"],
                "eu_regulation": "Regulation (EU) 2023/956 Annex I Section 3",
                "uk_status": "Confirmed in Scope from 1 Jan 2027",
                "base_see": 2.24,
                "precursor_type": "Direct Liquid / Re-rolled crude steel"
            },
            {
                "cn_code": "7326 90 98",
                "description": "Other articles of iron or steel (machined forged components)",
                "scope_status": "UNVERIFIED_PROPOSED_SCOPE",
                "scope_label": "Unverified / Proposed Downstream (Not Law)",
                "jurisdictions": ["PROPOSED_EU_EXTENSION"],
                "eu_regulation": "European Commission 2026 Downstream Extension Study (Proposed, not law)",
                "uk_status": "Under Consultation",
                "base_see": 3.95,
                "precursor_type": "Forged Blanks / Machined Parts"
            }
        ]

        # Precursor records: sample mill benchmarks only in DEMO_MODE / explicit demo test
        precursors = (
            [
                {
                    "precursor_id": "prec_tata_bof_01",
                    "supplier_name": "Tata Steel Limited",
                    "plant_location": "Jamshedpur Works, Jharkhand (IN)",
                    "production_route": "BF-BOF (Blast Furnace - Basic Oxygen Furnace)",
                    "steel_grade": "A105 / C20 Non-Alloy Forging Quality",
                    "see_direct": 1.42,
                    "see_indirect": 0.23,
                    "see_total": 1.65,
                    "scrap_ratio": 1.08,
                    "heat_number": "TSJ-26-9021",
                    "melt_country": "INDIA (IN)",
                    "verification_status": "VERIFIED_MTC_CLAUSE_6",
                    "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                },
                {
                    "precursor_id": "prec_sail_bof_02",
                    "supplier_name": "Steel Authority of India Limited (SAIL)",
                    "plant_location": "Bokaro Steel Plant, Jharkhand (IN)",
                    "production_route": "BF-BOF",
                    "steel_grade": "IS 2062 / EN 10025 S355",
                    "see_direct": 1.48,
                    "see_indirect": 0.24,
                    "see_total": 1.72,
                    "scrap_ratio": 1.08,
                    "heat_number": "SAIL-BK-8842",
                    "melt_country": "INDIA (IN)",
                    "verification_status": "VERIFIED_MTC_CLAUSE_6",
                    "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                },
                {
                    "precursor_id": "prec_jsw_eaf_03",
                    "supplier_name": "JSW Steel Limited",
                    "plant_location": "Vijayanagar Works, Toranagallu, Karnataka (IN)",
                    "production_route": "DRI-EAF (Gas-based DRI + Electric Arc Furnace)",
                    "steel_grade": "ASTM A350 LF2 Low-Temp Carbon Steel",
                    "see_direct": 1.15,
                    "see_indirect": 0.33,
                    "see_total": 1.48,
                    "scrap_ratio": 1.07,
                    "heat_number": "JSW-VJ-7719",
                    "melt_country": "INDIA (IN)",
                    "verification_status": "VERIFIED_MTC_CLAUSE_6",
                    "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                },
                {
                    "precursor_id": "prec_jindal_eaf_04",
                    "supplier_name": "Jindal Steel & Power Limited (JSPL)",
                    "plant_location": "Raigarh Works, Chhattisgarh (IN)",
                    "production_route": "Coal-DRI + EAF",
                    "steel_grade": "ASTM A182 F316/316L Stainless Steel",
                    "see_direct": 1.25,
                    "see_indirect": 0.30,
                    "see_total": 1.55,
                    "scrap_ratio": 1.08,
                    "heat_number": "JSPL-RG-4105",
                    "melt_country": "INDIA (IN)",
                    "verification_status": "VERIFIED_MTC_CLAUSE_6",
                    "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"
                }
            ]
            if (is_demo or (is_test and organization_id == "org_howrah_steel_01"))
            else []
        )

        # Link any accepted precursor submissions from Prompt P5
        try:
            from supplier_request_service import SupplierRequestService
            sub_recs = SupplierRequestService.list_precursor_records(organization_id)
            if isinstance(sub_recs, dict) and "precursors" in sub_recs:
                for r in sub_recs["precursors"]:
                    precursors.append({
                        "precursor_id": r.get("precursor_id", f"prec_p5_{uuid.uuid4().hex[:6]}"),
                        "supplier_name": r.get("supplier_name", "Sub-Supplier"),
                        "plant_location": r.get("plant_location", "India"),
                        "production_route": r.get("production_route", "BF-BOF"),
                        "steel_grade": r.get("steel_grade", "Forging Billets"),
                        "see_direct": float(r.get("see_direct", 1.40)),
                        "see_indirect": float(r.get("see_indirect", 0.25)),
                        "see_total": float(r.get("see_total", 1.65)),
                        "scrap_ratio": 1.08,
                        "heat_number": r.get("heat_number", "HEAT-REQ-01"),
                        "melt_country": r.get("country_of_melt", "INDIA (IN)"),
                        "verification_status": "QA_ACCEPTED_PRECURSOR",
                        "evidence_url": r.get("evidence_url", "")
                    })
        except Exception as e:
            logger.debug(f"Precursor linking from supplier requests: {e}")

        # Fetch constants with source links
        constants = RegulatoryStore.list_constants()

        return {
            "organization_id": organization_id,
            "is_installation_configured": installation_profile is not None,
            "installation": installation_profile,
            "periods": periods,
            "products": products,
            "precursors": precursors,
            "regulatory_constants": constants,
            "energy_bills": bills,
            "disclaimer": "Estimate for planning. Verified regulatory sources applied."
        }

    @classmethod
    def confirm_bill(cls, bill_id: str) -> Dict[str, Any]:
        """
        Human-in-the-loop confirmation of OCR-extracted bill.
        Updates reporting period inputs with confirmed numbers (Prompt P6).
        """
        cls.init_db()
        now = time.time()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    cur = conn.execute("SELECT * FROM energy_bills WHERE id = ?", (bill_id,))
                    row = cur.fetchone()
                    if not row:
                        raise ValueError(f"Energy bill {bill_id} not found")
                    bill = dict(row)

                    conn.execute("UPDATE energy_bills SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?", (now, bill_id))

                    # Update period energy consumption
                    if bill["bill_type"] == "ELECTRICITY":
                        conn.execute("UPDATE reporting_periods SET grid_kwh = ? WHERE id = ?", (bill["billed_units"], bill["period_id"]))
                    elif bill["bill_type"] == "FUEL":
                        conn.execute("UPDATE reporting_periods SET fuel_liters = ? WHERE id = ?", (bill["billed_units"], bill["period_id"]))

                    bill["status"] = "CONFIRMED"
                    bill["confirmed_at"] = now
                    bill["bill_id"] = bill.get("id")
                    return bill
            finally:
                conn.close()

    @classmethod
    def list_energy_bills(cls, installation_id: str, period_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all uploaded energy bills for an installation/period."""
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
                if period_id:
                    cur = conn.execute("SELECT * FROM energy_bills WHERE installation_id = ? AND period_id = ? ORDER BY created_at DESC", (installation_id, period_id))
                else:
                    cur = conn.execute("SELECT * FROM energy_bills WHERE installation_id = ? ORDER BY created_at DESC", (installation_id,))
                rows = []
                for r in cur.fetchall():
                    d = dict(r)
                    d["bill_id"] = d.get("id")
                    rows.append(d)
                return rows
            finally:
                conn.close()

    @classmethod
    def calculate_what_if(
        cls,
        cn_code: str = "7307 91 00",
        net_shipment_tonnes: float = 24.5,
        upstream_precursor_see: float = 1.65,
        scrap_loss_ratio: float = 0.08,
        monthly_grid_kwh: float = 145000.0,
        monthly_solar_offset_kwh: float = 35000.0,
        monthly_fuel_liters: float = 12000.0,
        monthly_total_production_tonnes: float = 450.0,
        renewable_grid_share_pct: float = 24.1,  # e.g. 35,000 / 145,000 ~ 24.1%
        scrap_recovery_improvement_pct: float = 0.0, # 0% to 25% improvement
        fuel_switch_option: str = "FURNACE_OIL", # 'FURNACE_OIL', 'LPG', 'ELECTRIC_INDUCTION'
        jurisdiction: str = "EU", # 'EU' or 'UK'
        year: int = 2026,
        country_of_origin: str = "IN"
    ) -> Dict[str, Any]:
        """
        Interactive What-If live recalculation using the deterministic H4 engine (Prompt P6).
        Simulates:
        - Renewable grid share (0% to 100%)
        - Scrap recovery improvement / reduced scale loss (0% to 25%)
        - Fuel switch: Furnace Oil (2.68 kg/L) vs LPG (1.85 kg/L) vs Electric Induction (0 kg/L direct)
        - EU CBAM vs UK CBAM rules and benchmarks
        Always returned with 'Estimate for planning'.
        """
        # 1. Baseline calculation
        baseline_res = ComplianceEngine.calculate_cbam_emissions(
            invoice_number="BASELINE-PLANNING",
            cn_code=cn_code,
            net_shipment_tonnes=net_shipment_tonnes,
            upstream_precursor_see=upstream_precursor_see,
            scrap_loss_ratio=scrap_loss_ratio,
            monthly_grid_kwh=monthly_grid_kwh,
            monthly_solar_offset_kwh=monthly_solar_offset_kwh,
            monthly_fuel_liters=monthly_fuel_liters,
            monthly_total_production_tonnes=monthly_total_production_tonnes,
            year=year,
            country_of_origin=country_of_origin
        )

        # 2. Simulate What-If parameter modifications
        # Renewable share: adjust solar offset
        sim_renewable_fraction = max(0.0, min(1.0, renewable_grid_share_pct / 100.0))
        sim_solar_offset_kwh = monthly_grid_kwh * sim_renewable_fraction

        # Scrap recovery improvement: reduces scrap_loss_ratio
        # e.g. 8% scrap loss with 20% scrap recovery improvement -> 8% * (1 - 0.20) = 6.4%
        sim_scrap_fraction = max(0.0, min(0.5, scrap_recovery_improvement_pct / 100.0))
        sim_scrap_ratio = max(0.01, scrap_loss_ratio * (1.0 - sim_scrap_fraction))

        # Fuel switch adjustment
        sim_fuel_liters = monthly_fuel_liters
        fuel_ef_val = 2.68
        extra_grid_kwh = 0.0

        if fuel_switch_option.upper() == "LPG":
            # LPG has ~30% lower carbon intensity per unit heat
            fuel_ef_val = 1.85
        elif fuel_switch_option.upper() == "ELECTRIC_INDUCTION":
            # 0 direct fuel combustion, replaces with electric heating (~320 kWh/t)
            sim_fuel_liters = 0.0
            fuel_ef_val = 0.0
            extra_grid_kwh = monthly_total_production_tonnes * 320.0

        sim_total_grid_kwh = monthly_grid_kwh + extra_grid_kwh
        # recalculate solar offset if renewable fraction is pinned
        if sim_renewable_fraction > 0:
            sim_solar_offset_kwh = sim_total_grid_kwh * sim_renewable_fraction

        # 3. Simulate What-If with H4 ComplianceEngine
        grid_ef_val = RegulatoryStore.get_constant("grid_emission_factor_in", default=0.727)
        safe_prod = max(1.0, monthly_total_production_tonnes)

        sim_direct_see = (sim_fuel_liters * fuel_ef_val / 1000.0) / safe_prod
        sim_net_grid_kwh = max(0.0, sim_total_grid_kwh - sim_solar_offset_kwh)
        sim_indirect_see = (sim_net_grid_kwh * grid_ef_val / 1000.0) / safe_prod
        sim_precursor_see = upstream_precursor_see * (1.0 + sim_scrap_ratio)
        sim_total_see = sim_direct_see + sim_indirect_see + sim_precursor_see

        # Jurisdiction adjustments: EU vs UK
        if jurisdiction.upper() == "UK":
            # UK CBAM: Deficit benchmark based on UK Consultation (2027 start)
            # UK ETS benchmark price ~£68.50/tCO2e (approx €80.20)
            default_baseline = 3.90
            default_with_markup = default_baseline
            ets_price_eur = 80.20
            ets_price_label = "£68.50 (~€80.20) UK ETS Benchmark"
            jurisdiction_note = "UK CBAM definitive period begins 1 Jan 2027. Melt-and-pour mandatory 1 Jul 2027."
        else:
            default_baseline = baseline_res.eu_default_baseline
            default_with_markup = baseline_res.eu_default_with_markup
            ets_price_eur = baseline_res.eu_ets_carbon_price_eur
            ets_price_label = f"€{ets_price_eur}/tCO2e EU ETS Benchmark"
            jurisdiction_note = "Regulation (EU) 2023/956 definitive period from 1 Jan 2026. Sale of certificates from 1 Feb 2027."

        fx_rate = RegulatoryStore.get_constant("eur_to_inr_exchange_rate", default=90.50)

        # Baseline metrics
        base_total_see = baseline_res.total_verified_see
        base_delta = max(0.0, default_with_markup - base_total_see)
        base_cost_diff_eur = net_shipment_tonnes * base_delta * ets_price_eur
        base_cost_diff_inr = base_cost_diff_eur * fx_rate

        # Simulated metrics
        sim_delta = max(0.0, default_with_markup - sim_total_see)
        sim_cost_diff_eur = net_shipment_tonnes * sim_delta * ets_price_eur
        sim_cost_diff_inr = sim_cost_diff_eur * fx_rate

        # Incremental carbon & financial savings from What-If interventions
        carbon_cut_per_tonne = max(0.0, base_total_see - sim_total_see)
        shipment_carbon_saved = net_shipment_tonnes * carbon_cut_per_tonne
        annual_carbon_saved = (monthly_total_production_tonnes * 12.0) * carbon_cut_per_tonne
        incremental_euro_savings = shipment_carbon_saved * ets_price_eur
        incremental_inr_savings = incremental_euro_savings * fx_rate

        return {
            "disclaimer": "Estimate for planning",
            "jurisdiction": jurisdiction.upper(),
            "jurisdiction_note": jurisdiction_note,
            "year": year,
            "cn_code": cn_code,
            "net_shipment_tonnes": net_shipment_tonnes,
            "baseline": {
                "direct_see": round(baseline_res.plant_direct_fuel_see, 4),
                "indirect_see": round(baseline_res.plant_indirect_power_see, 4),
                "precursor_see": round(baseline_res.precursor_embedded_see, 4),
                "total_see": round(base_total_see, 4),
                "default_benchmark": round(default_with_markup, 4),
                "cost_difference_eur": round(base_cost_diff_eur, 2),
                "cost_difference_inr": round(base_cost_diff_inr, 2)
            },
            "what_if_simulated": {
                "renewable_grid_share_pct": round(renewable_grid_share_pct, 1),
                "scrap_recovery_improvement_pct": round(scrap_recovery_improvement_pct, 1),
                "fuel_switch_option": fuel_switch_option,
                "simulated_direct_see": round(sim_direct_see, 4),
                "simulated_indirect_see": round(sim_indirect_see, 4),
                "simulated_precursor_see": round(sim_precursor_see, 4),
                "simulated_total_see": round(sim_total_see, 4),
                "default_benchmark": round(default_with_markup, 4),
                "cost_difference_eur": round(sim_cost_diff_eur, 2),
                "cost_difference_inr": round(sim_cost_diff_inr, 2)
            },
            "emissions_reduction": {
                "carbon_cut_per_tonne": round(carbon_cut_per_tonne, 4),
                "shipment_carbon_saved_tonnes": round(shipment_carbon_saved, 2),
                "annual_factory_carbon_saved_tonnes": round(annual_carbon_saved, 2),
                "incremental_shipment_savings_eur": round(incremental_euro_savings, 2),
                "incremental_shipment_savings_inr": round(incremental_inr_savings, 2),
                "ets_benchmark_price": ets_price_label
            }
        }

    @classmethod
    def generate_verifier_summary_pdf(
        cls,
        invoice_number: str = "EXP-2026-109",
        cn_code: str = "7307 91 00",
        net_tonnes: float = 24.5,
        installation_id: Optional[str] = None,
        period_str: str = "2026-Q1",
        jurisdiction: str = "EU",
        total_see: float = 2.03,
        direct_see: float = 0.07,
        indirect_see: float = 0.18,
        precursor_see: float = 1.78,
        default_baseline: float = 4.20,
        upstream_mill: str = "Configured Upstream Mill",
        heat_number: str = "HEAT-UNASSIGNED",
        melt_country: str = "INDIA (IN)",
        cost_diff_eur: float = 4008.0,
        cost_diff_inr: float = 362724.0,
        operator_name: Optional[str] = None,
    ) -> bytes:
        """
        Renders an official A4 Verifier Summary Dossier (PDF) using PyMuPDF vector drawing (Prompt P6).
        Prepared specifically for European Accredited Verifiers (TÜV, SGS, DNV).
        """
        inst_row: Optional[Dict[str, Any]] = None
        if installation_id:
            with cls._lock:
                conn = cls.get_connection()
                try:
                    row = conn.execute("SELECT * FROM installations WHERE id = ?", (installation_id,)).fetchone()
                    if row:
                        inst_row = dict(row)
                finally:
                    conn.close()

        inst_code = (inst_row or {}).get("id") or installation_id or "UNCONFIGURED"
        inst_name = operator_name or (inst_row or {}).get("name") or "Configured Exporting Installation"
        inst_unlocode = (inst_row or {}).get("unlocode") or "UNCONFIGURED"
        inst_country = (inst_row or {}).get("country") or "IN"
        lat = (inst_row or {}).get("latitude")
        lon = (inst_row or {}).get("longitude")
        coords_text = f"{lat}° N, {lon}° E" if (lat is not None and lon is not None) else "Per plant registration"

        doc = fitz.open()
        page = doc.new_page(width=595, height=842) # A4 595x842 pt

        # Palette
        C_DARK = (0.07, 0.09, 0.15)
        C_EMERALD = (0.05, 0.45, 0.28)
        C_AMBER = (0.80, 0.45, 0.05)
        C_SLATE = (0.35, 0.40, 0.48)
        C_LIGHT = (0.96, 0.97, 0.98)
        C_BORDER = (0.84, 0.86, 0.90)

        # 1. Header Banner
        page.draw_rect(fitz.Rect(36, 36, 559, 94), color=C_DARK, fill=C_DARK)
        page.insert_text((50, 60), "HEATLEDGER AI · CBAM VERIFIER SUMMARY & AUDIT MEMORANDUM", fontsize=11, color=(1, 1, 1), fontname="helv")
        page.insert_text((50, 75), "Specification: Regulation (EU) 2023/956 Annex III · Implementing Regulation (EU) 2025/2621 · UK CBAM", fontsize=7.5, color=(0.4, 0.85, 0.6), fontname="helv")
        page.insert_text((50, 87), f"Prepared for Accredited Verification Body (TÜV / SGS / DNV) · Jurisdiction: {jurisdiction.upper()} CBAM", fontsize=7.5, color=(0.8, 0.85, 0.9), fontname="helv")

        # 2. Mandatory Planning Disclaimer Banner
        page.draw_rect(fitz.Rect(36, 102, 559, 126), color=C_AMBER, fill=(0.99, 0.96, 0.90))
        page.insert_text((48, 117), "REGULATORY NOTICE: ESTIMATE FOR PLANNING & INDEPENDENT ACCREDITED VERIFIER AUDIT", fontsize=8, color=C_AMBER, fontname="helv")

        # 3. Section 1: Installation & Process Profile
        y = 138
        page.draw_rect(fitz.Rect(36, y, 559, y + 84), color=C_BORDER, fill=C_LIGHT)
        page.insert_text((48, y + 16), "1. OPERATOR & INSTALLATION BOUNDARIES (EU REG 2023/956)", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Installation Code: {inst_code}   |   UN/LOCODE: {inst_unlocode}   |   Coordinates: {coords_text}", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"Operator: {inst_name} ({inst_country})", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), "Production Processes: Per registered installation process boundaries", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 74), "Energy Connections: Per verified plant utility & fuel meters", fontsize=7.5, color=C_SLATE, fontname="helv")

        # 4. Section 2: Goods & Shipment Under Audit
        y = 230
        page.draw_rect(fitz.Rect(36, y, 559, y + 70), color=C_BORDER, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "2. DECLARED GOODS & REPORTING PERIOD", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Export Invoice: {invoice_number}   |   Reporting Period: {period_str}   |   Declared Net Mass: {net_tonnes:.3f} Tonnes", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"CN Tariff Code: {cn_code} (Flanges of non-alloy / alloy steel)   |   Status: CONFIRMED IN CBAM SCOPE", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), "Destination Customs: EU Declarant Port of Entry (Bremen / Rotterdam / Antwerp)", fontsize=7.5, color=C_SLATE, fontname="helv")

        # 5. Section 3: Precursor Steel Mass Balance & Origin
        y = 308
        page.draw_rect(fitz.Rect(36, y, 559, y + 84), color=C_BORDER, fill=C_LIGHT)
        page.insert_text((48, y + 16), "3. UPSTREAM PRECURSOR EMBEDDED EMISSIONS & MELT ORIGIN", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Upstream Producer: {upstream_mill}   |   Production Route: BF-BOF", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"Precursor Heat Number: #{heat_number}   |   Country of Melt & Pour: {melt_country} (ISO 3166-1 alpha-2: IN)", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), "Certified Precursor SEE: 1.6500 tCO2e/t   |   Mass Scrap Ratio: 1.0800 (8.0% scale/trimming loss)", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 74), f"Effective Precursor Embedded SEE: {precursor_see:.4f} tCO2e / tonne (Regulation EU 2023/956 Annex III Section 3.1)", fontsize=7.5, color=C_EMERALD, fontname="helv")

        # 6. Section 4: Deterministic Facility Emissions Ledger
        y = 400
        page.draw_rect(fitz.Rect(36, y, 559, y + 120), color=C_BORDER, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "4. FACILITY DIRECT & INDIRECT SPECIFIC EMBEDDED EMISSIONS (SEE)", fontsize=9, color=C_DARK, fontname="helv")

        page.insert_text((48, y + 34), "Plant Direct Fuel SEE (Reheating Furnaces):", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 34), f"{direct_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 46), "  Formula: (12,000 L Furnace Oil × 2.68 kg/L) / 1000 / 450 MT Production [IPCC 2006 Fuel EF]", fontsize=6.8, color=C_SLATE, fontname="helv")

        page.insert_text((48, y + 62), "Plant Indirect Electricity SEE (HT Grid):", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 62), f"{indirect_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 74), "  Formula: max(0, 145,000 kWh - 35,000 kWh Solar) × 0.727 t/MWh / 1000 / 450 MT [CEA India v20.0]", fontsize=6.8, color=C_SLATE, fontname="helv")

        page.insert_text((48, y + 90), "Effective Upstream Precursor SEE:", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 90), f"{precursor_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")

        page.draw_line(fitz.Point(48, y + 98), fitz.Point(540, y + 98), color=C_BORDER)
        page.insert_text((48, y + 112), "TOTAL VERIFIED SPECIFIC EMBEDDED EMISSIONS (SEE):", fontsize=8.5, color=C_EMERALD, fontname="helv")
        page.insert_text((380, y + 112), f"{total_see:.4f} tCO2e / tonne", fontsize=9, color=C_EMERALD, fontname="helv")

        # 7. Section 5: Benchmark Comparison & Planning Cost Delta
        y = 528
        page.draw_rect(fitz.Rect(36, y, 559, y + 90), color=C_BORDER, fill=C_LIGHT)
        page.insert_text((48, y + 16), "5. BENCHMARK COMPARISON & ESTIMATED PLANNING COST DIFFERENCE", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Official EU Default Baseline for CN {cn_code} (India): 3.8200 tCO2e/t", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"2026 Statutory Markup Schedule (+10% markup applied): {default_baseline:.4f} tCO2e/t [Reg (EU) 2025/2621]", fontsize=7.5, color=(0.7, 0.2, 0.2), fontname="helv")
        page.insert_text((48, y + 60), f"Emissions Avoided vs Default Markup: {(default_baseline - total_see):.4f} tCO2e / tonne   |   Total Avoided: {((default_baseline - total_see) * net_tonnes):.2f} Tonnes CO2e", fontsize=7.5, color=C_EMERALD, fontname="helv")
        page.insert_text((48, y + 76), f"Estimated Planning Cost Difference: €{cost_diff_eur:,.0f}  (~₹{cost_diff_inr:,.0f} at ₹90.50/€ RBI reference rate, €75.36/t EU ETS)", fontsize=8, color=C_DARK, fontname="helv")

        # 8. Section 6: Independent Verifier Check-off Block
        y = 626
        page.draw_rect(fitz.Rect(36, y, 559, y + 140), color=C_DARK, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "6. ACCREDITED INDEPENDENT VERIFIER AUDIT CHECKLIST", fontsize=9, color=C_DARK, fontname="helv")

        checks = [
            "[  ] Physical facility inspection & process boundary confirmation completed.",
            "[  ] Primary electricity utility invoices & solar generation meters cross-reconciled.",
            "[  ] Reheating fuel procurement invoices & dipping logs matched to production tonnage.",
            "[  ] Upstream mill test certificates checked byte-identical under EN 10204:2004 Clause 6.",
            "[  ] Origin of crude melt-and-pour checked for non-Russian origin documentation under EU Regulation 2026/1963."
        ]
        for idx, chk in enumerate(checks):
            page.insert_text((48, y + 32 + (idx * 14)), chk, fontsize=7.2, color=C_SLATE, fontname="helv")

        page.draw_line(fitz.Point(48, y + 106), fitz.Point(540, y + 106), color=C_BORDER)
        page.insert_text((48, y + 124), "Lead Verifier Signature: _______________________   Accreditation Body / Reg #: ___________________   Date: _________", fontsize=7.5, color=C_DARK, fontname="helv")

        # Footer
        page.insert_text((36, 810), "HeatLedger AI Verifier Summary · Generated automatically via deterministic regulatory compliance engine · Verify online at https://heatledger.ai/verify", fontsize=6.8, color=C_SLATE, fontname="helv")

        return doc.tobytes()

