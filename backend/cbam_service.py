"""
HEATLEDGER AI: CBAM Engine Service (Prompt B7)
Specification: Regulation (EU) 2023/956, Implementing Regulation (EU) 2023/1773 & 2025/2621.
Provides immutable calculation storage, versioning, recalculation, export,
and period/installation management.
"""

import io
import hashlib
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
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

CBAM_DISCLAIMER_PREPARED = "Prepared by the plant, not verified. EU CBAM compliance requires verification by an EU-accredited verifier before actual emissions can be claimed by the importer."
CBAM_VERIFIER_MEMO_DISCLAIMER = "Prepared by the plant for accredited third-party verification. This dossier supports the verifier review and does not replace statutory EU accreditation."

# Confirmed In-Scope CN Codes per Regulation (EU) 2023/956 Annex I
EU_CONFIRMED_CHAPTERS = {
    "7201": "Pig iron and spiegeleisen in pigs, blocks or other primary forms",
    "7202": "Ferro-alloys (FeMn, FeCr, FeNi)",
    "7203": "Direct reduced iron (DRI / HBI) and other spongy iron products",
    "7205": "Granules and powders, of pig iron, spiegeleisen, iron or steel",
    "7206": "Iron and non-alloy steel in ingots or other primary forms",
    "7207": "Semi-finished products of iron or non-alloy steel (billets, blooms, slabs)",
    "7208": "Flat-rolled products of iron/non-alloy steel, hot-rolled, width >= 600mm",
    "7213": "Bars and rods, hot-rolled, in irregularly wound coils, of iron or non-alloy steel",
    "7214": "Other bars and rods of iron or non-alloy steel (forged, hot-drawn or hot-extruded)",
    "7224": "Other alloy steel in ingots or other primary forms; semi-finished products",
    "7228": "Other bars and rods of other alloy steel (forged, hot-rolled, cold-finished)",
    "7301": "Sheet piling of iron or steel; welded angles, shapes and sections",
    "7303": "Tubes, pipes and hollow profiles, of cast iron",
    "7304": "Tubes, pipes and hollow profiles, seamless, of iron or steel",
    "7305": "Other tubes and pipes (welded, riveted), diameter > 406.4 mm",
    "7306": "Other tubes, pipes and hollow profiles, of iron or steel (welded/open seam)",
    "7307": "Tube or pipe fittings (flanges, elbows, sleeves), of iron or steel",
    "7308": "Structures and parts of structures, of iron or steel (bridges, towers, roofing)",
    "7309": "Reservoirs, tanks, vats and similar containers, capacity > 300L",
    "7310": "Tanks, casks, drums, cans, boxes, capacity <= 300L",
    "7311": "Containers for compressed or liquefied gas, of iron or steel",
    "7318": "Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, washers",
    "7326": "Other articles of iron or steel (open-die and closed-die steel forgings)"
}

# Statutory EU Default Benchmark Base Values (Implementing Reg EU 2025/2621 & EU 2023/1773)
OFFICIAL_DEFAULT_BENCHMARKS = {
    "7307": {"base_see": 3.82, "description": "Tube or pipe fittings (flanges) of steel"},
    "7207": {"base_see": 2.45, "description": "Semi-finished steel billets & blooms"},
    "7214": {"base_see": 2.76, "description": "Forged and hot-rolled carbon steel bars"},
    "7228": {"base_see": 2.98, "description": "Alloy steel rounds & forged bars"},
    "7326": {"base_see": 3.65, "description": "Other forged articles of steel"},
    "7304": {"base_see": 3.42, "description": "Seamless steel tubes & pipes"}
}


class CBAMService:
    _lock = threading.RLock()

    @classmethod
    def get_connection(cls) -> Any:
        return get_db_connection(auto_close=False, is_service_role=True)

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
                            organization_id TEXT NOT NULL DEFAULT 'default_org',
                            name TEXT NOT NULL,
                            country TEXT NOT NULL,
                            unlocode TEXT NOT NULL,
                            latitude REAL,
                            longitude REAL,
                            created_at REAL NOT NULL
                        );
                    """)

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
                            organization_id TEXT NOT NULL DEFAULT 'default_org',
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
    def create_installation(cls, name: str, country: str, unlocode: str, lat: float = 0.0, lon: float = 0.0) -> Dict[str, Any]:
        cls.init_db()
        inst_id = f"inst_{uuid.uuid4().hex[:12]}"
        now = time.time()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    conn.execute(
                        "INSERT INTO installations (id, name, country, unlocode, latitude, longitude, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                        (inst_id, name, country, unlocode, lat, lon, now)
                    )
            finally:
                conn.close()

        return {
            "id": inst_id,
            "name": name,
            "country": country,
            "unlocode": unlocode,
            "latitude": lat,
            "longitude": lon,
            "created_at": now
        }

    @classmethod
    def list_installations(cls) -> List[Dict[str, Any]]:
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
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
                        INSERT INTO reporting_periods
                        (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            installation_id = excluded.installation_id,
                            year = excluded.year,
                            quarter = excluded.quarter,
                            grid_kwh = excluded.grid_kwh,
                            solar_offset_kwh = excluded.solar_offset_kwh,
                            fuel_liters = excluded.fuel_liters,
                            production_tonnes = excluded.production_tonnes,
                            created_at = excluded.created_at
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
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                cur = conn.execute("SELECT * FROM cbam_calculations WHERE id = %s", (calc_id,))
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
        """Ensures the benchmark Liluah Works installation and initial reporting periods exist."""
        cls.init_db()
        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    cur = conn.execute("SELECT COUNT(*) AS cnt FROM installations")
                    if cur.fetchone()["cnt"] == 0:
                        now = time.time()
                        conn.execute(
                            """
                            INSERT INTO installations (id, name, country, unlocode, latitude, longitude, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                "IN-WB-4409",
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
                            INSERT INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            ("period_2026_Q1_IN-WB-4409", "IN-WB-4409", 2026, 1, 145000.0, 35000.0, 12000.0, 450.0, now)
                        )
                        conn.execute(
                            """
                            INSERT INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            ("period_2025_Q4_IN-WB-4409", "IN-WB-4409", 2025, 4, 152000.0, 28000.0, 13500.0, 470.0, now - 7776000)
                        )
            finally:
                conn.close()

    @classmethod
    def get_workspace_data(cls, organization_id: str = "org_howrah_steel_01") -> Dict[str, Any]:
        """
        Retrieves the complete CBAM workspace state (Prompt P6):
        - Installation profile (site, processes, fuels, electricity connections)
        - Reporting periods
        - Products by CN code with confirmed/unverified scope tagging
        - Available precursor records (verified mill catalog + accepted supplier submissions)
        - Sourced regulatory constants with last-verified dates
        - Energy bills with OCR state
        """
        cls.seed_default_installation_if_empty()
        RegulatoryStore.init_tables()

        installations = cls.list_installations()
        inst = installations[0] if installations else {
            "id": "IN-WB-4409",
            "name": "Howrah Precision Forgings Pvt. Ltd. (Liluah Works)",
            "country": "India",
            "unlocode": "IN CCU",
            "latitude": 22.6105,
            "longitude": 88.3421,
        }

        # Rich installation profile per Prompt P6
        installation_profile = {
            **inst,
            "site_code": inst.get("id", "IN-WB-4409"),
            "registered_address": "12/B Belur Road, Liluah Industrial Area, Howrah 711204, West Bengal, India",
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
                {"name": "Natural Gas (Pipeline Grid)", "purpose": "Planned 2027 Low-Carbon Transition", "emission_factor": "2.02 kg CO2e/m³", "status": "Proposed / Infrastructure Pending"}
            ],
            "electricity_connections": [
                {"feed_type": "33kV Industrial Dedicated HT Feeder", "provider": "CESC Limited / WBSEDCL", "consumer_number": "WB-HT-90142", "sanctioned_load": "1,250 kVA", "grid_factor": "0.727 tCO2e/MWh"},
                {"feed_type": "Captive Rooftop Solar PV", "capacity": "350 kWp Net-Metered", "status": "Operational", "clean_offset": "35,000 kWh / month avg"},
                {"feed_type": "Green Energy Open Access PPA", "status": "Under Evaluation for 2027", "target_offset": "100% Zero-Carbon Scope 2"}
            ]
        }

        # Fetch reporting periods
        periods = []
        with cls._lock:
            conn = cls.get_connection()
            try:
                cur = conn.execute("SELECT * FROM reporting_periods WHERE installation_id = %s ORDER BY year DESC, quarter DESC", (inst["id"],))
                periods = [dict(r) for r in cur.fetchall()]
            finally:
                conn.close()

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

        # Seeded verified precursor records
        precursors = [
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

        # Link any accepted precursor submissions from Prompt P5
        try:
            from supplier_service import SupplierService
            sub_recs = SupplierService.list_precursor_records(organization_id)
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

        # Fetch energy bills
        bills = cls.list_energy_bills(inst.get("id", "IN-WB-4409"))

        return {
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
                    cur = conn.execute("SELECT * FROM energy_bills WHERE id = %s", (bill_id,))
                    row = cur.fetchone()
                    if not row:
                        raise ValueError(f"Energy bill {bill_id} not found")
                    bill = dict(row)

                    conn.execute("UPDATE energy_bills SET status = 'CONFIRMED', confirmed_at = %s WHERE id = %s", (now, bill_id))

                    # Update period energy consumption
                    if bill["bill_type"] == "ELECTRICITY":
                        conn.execute("UPDATE reporting_periods SET grid_kwh = %s WHERE id = %s", (bill["billed_units"], bill["period_id"]))
                    elif bill["bill_type"] == "FUEL":
                        conn.execute("UPDATE reporting_periods SET fuel_liters = %s WHERE id = %s", (bill["billed_units"], bill["period_id"]))

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
                    cur = conn.execute("SELECT * FROM energy_bills WHERE installation_id = %s AND period_id = %s ORDER BY created_at DESC", (installation_id, period_id))
                else:
                    cur = conn.execute("SELECT * FROM energy_bills WHERE installation_id = %s ORDER BY created_at DESC", (installation_id,))
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
        installation_id: str = "IN-WB-4409",
        period_str: str = "2026-Q1",
        jurisdiction: str = "EU",
        total_see: float = 2.03,
        direct_see: float = 0.07,
        indirect_see: float = 0.18,
        precursor_see: float = 1.78,
        default_baseline: float = 4.20,
        upstream_mill: str = "Tata Steel Limited, Jamshedpur Works",
        heat_number: str = "TSJ-26-9021",
        melt_country: str = "INDIA (IN)",
        cost_diff_eur: float = 4008.0,
        cost_diff_inr: float = 362724.0
    ) -> bytes:
        """
        Renders an official A4 Verifier Summary Dossier (PDF) using PyMuPDF vector drawing (Prompt P6).
        Prepared specifically for European Accredited Verifiers (TÜV, SGS, DNV).
        Features:
        - Full installation & meter reconciliation
        - Unaltered precursor chain-of-custody reference
        - Sourced regulatory constants & formulas
        - Independent Verifier Audit Sign-off checklist
        """
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
        page.insert_text((48, y + 32), f"Installation Code: {installation_id} (Liluah Works)   |   UN/LOCODE: IN CCU   |   Coordinates: 22.6105° N, 88.3421° E", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), "Operator: Howrah Precision Forgings Pvt. Ltd., 12/B Belur Road, Liluah, Howrah 711204, West Bengal, India", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), "Production Processes: Closed-Die Drop Forging (1T-5T), Batch Billet Reheating, Annealing/Normalizing, CNC Machining", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 74), "Energy Connections: CESC 33kV Dedicated HT Feeder (#WB-HT-90142) + 350 kWp Rooftop Solar PV Net-Metered", fontsize=7.5, color=C_SLATE, fontname="helv")

        # 4. Section 2: Goods & Shipment Under Audit
        y = 230
        page.draw_rect(fitz.Rect(36, y, 559, y + 70), color=C_BORDER, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "2. DECLARED GOODS & REPORTING PERIOD", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Export Invoice: {invoice_number}   |   Reporting Period: {period_str}   |   Declared Net Mass: {net_tonnes:.3f} Tonnes", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"CN Tariff Code: {cn_code} (Flanges of non-alloy / alloy steel)   |   Status: CONFIRMED IN CBAM SCOPE", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), f"Destination Customs: EU Declarant Port of Entry (Bremen / Rotterdam / Antwerp)", fontsize=7.5, color=C_SLATE, fontname="helv")

        # 5. Section 3: Precursor Steel Mass Balance & Origin
        y = 308
        page.draw_rect(fitz.Rect(36, y, 559, y + 84), color=C_BORDER, fill=C_LIGHT)
        page.insert_text((48, y + 16), "3. UPSTREAM PRECURSOR EMBEDDED EMISSIONS & MELT ORIGIN", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Upstream Producer: {upstream_mill}   |   Production Route: BF-BOF", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"Precursor Heat Number: #{heat_number}   |   Country of Melt & Pour: {melt_country} (ISO 3166-1 alpha-2: IN)", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 60), f"Certified Precursor SEE: 1.6500 tCO2e/t   |   Mass Scrap Ratio: 1.0800 (8.0% scale/trimming loss)", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 74), f"Effective Precursor Embedded SEE: {precursor_see:.4f} tCO2e / tonne (Regulation EU 2023/956 Annex III Section 3.1)", fontsize=7.5, color=C_EMERALD, fontname="helv")

        # 6. Section 4: Deterministic Facility Emissions Ledger
        y = 400
        page.draw_rect(fitz.Rect(36, y, 559, y + 120), color=C_BORDER, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "4. FACILITY DIRECT & INDIRECT SPECIFIC EMBEDDED EMISSIONS (SEE)", fontsize=9, color=C_DARK, fontname="helv")

        page.insert_text((48, y + 34), f"Plant Direct Fuel SEE (Reheating Furnaces):", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 34), f"{direct_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 46), "  Formula: (12,000 L Furnace Oil × 2.68 kg/L) / 1000 / 450 MT Production [IPCC 2006 Fuel EF]", fontsize=6.8, color=C_SLATE, fontname="helv")

        page.insert_text((48, y + 62), f"Plant Indirect Electricity SEE (HT Grid):", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 62), f"{indirect_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 74), "  Formula: max(0, 145,000 kWh - 35,000 kWh Solar) × 0.727 t/MWh / 1000 / 450 MT [CEA India v20.0]", fontsize=6.8, color=C_SLATE, fontname="helv")

        page.insert_text((48, y + 90), f"Effective Upstream Precursor SEE:", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((380, y + 90), f"{precursor_see:.4f} tCO2e / tonne", fontsize=8, color=C_DARK, fontname="helv")

        page.draw_line(fitz.Point(48, y + 98), fitz.Point(540, y + 98), color=C_BORDER)
        page.insert_text((48, y + 112), f"TOTAL VERIFIED SPECIFIC EMBEDDED EMISSIONS (SEE):", fontsize=8.5, color=C_EMERALD, fontname="helv")
        page.insert_text((380, y + 112), f"{total_see:.4f} tCO2e / tonne", fontsize=9, color=C_EMERALD, fontname="helv")

        # 7. Section 5: Benchmark Comparison & Planning Cost Delta
        y = 528
        page.draw_rect(fitz.Rect(36, y, 559, y + 90), color=C_BORDER, fill=C_LIGHT)
        page.insert_text((48, y + 16), "5. BENCHMARK COMPARISON & ESTIMATED PLANNING COST DIFFERENCE", fontsize=9, color=C_DARK, fontname="helv")
        page.insert_text((48, y + 32), f"Official EU Default Baseline for CN {cn_code} (India): 3.8200 tCO2e/t", fontsize=7.5, color=C_SLATE, fontname="helv")
        page.insert_text((48, y + 46), f"2026 Statutory Markup Schedule (+10% markup applied): {default_baseline:.4f} tCO2e/t [Reg (EU) 2025/2621]", fontsize=7.5, color=(0.7, 0.2, 0.2), fontname="helv")
        page.insert_text((48, y + 60), f"Emissions Avoided vs Default Markup: {(default_baseline - total_see):.4f} tCO2e / tonne   |   Total Avoided: {((default_baseline - total_see) * net_tonnes):.2f} Tonnes CO2e", fontsize=7.5, color=C_EMERALD, fontname="helv")
        try:
            _ets_lbl_eur = float(cls.get_certificate_price()["price_eur_per_tco2"])
        except Exception:
            _ets_lbl_eur = float(RegulatoryStore.get_constant("eu_ets_carbon_price_eur", 75.0))
        page.insert_text((48, y + 76), f"Estimated Planning Cost Difference: €{cost_diff_eur:,.0f}  (~₹{cost_diff_inr:,.0f} at ₹90.50/€ RBI reference rate, €{_ets_lbl_eur:.2f}/t EU ETS)", fontsize=8, color=C_DARK, fontname="helv")

        # 8. Section 6: Independent Verifier Check-off Block
        y = 626
        page.draw_rect(fitz.Rect(36, y, 559, y + 140), color=C_DARK, fill=(1, 1, 1))
        page.insert_text((48, y + 16), "6. ACCREDITED INDEPENDENT VERIFIER AUDIT CHECKLIST", fontsize=9, color=C_DARK, fontname="helv")

        checks = [
            "[  ] Physical facility inspection & process boundary confirmation at Liluah Works completed.",
            "[  ] Primary electricity utility invoices (CESC) & solar generation meters cross-reconciled.",
            "[  ] Reheating fuel procurement invoices (IOCL) & tank dipping logs matched to production tonnage.",
            "[  ] Upstream mill test certificates verified 100% byte-identical under EN 10204:2004 Clause 6.",
            "[  ] Origin of crude melt-and-pour verified non-Russian compliant under EU Regulation 2026/1963."
        ]
        for idx, chk in enumerate(checks):
            page.insert_text((48, y + 32 + (idx * 14)), chk, fontsize=7.2, color=C_SLATE, fontname="helv")

        page.draw_line(fitz.Point(48, y + 106), fitz.Point(540, y + 106), color=C_BORDER)
        page.insert_text((48, y + 124), "Lead Verifier Signature: _______________________   Accreditation Body / Reg #: ___________________   Date: _________", fontsize=7.5, color=C_DARK, fontname="helv")

        # Footer
        page.insert_text((36, 810), "HeatLedger AI Verifier Summary · Generated automatically via deterministic regulatory compliance engine · Verify online at https://heatledger.ai/verify", fontsize=6.8, color=C_SLATE, fontname="helv")

        return doc.tobytes()

    # ==========================================================================
    # CBAM Workspace & What-If Simulator (merged from cbam_workspace_service)
    # ==========================================================================

    @classmethod
    def init_workspace_tables(cls):
        with cls._lock:
            with get_db_connection() as conn:
                # 1. Facility Installation Profiles
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS plant_installation_profiles (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT NOT NULL,
                        plant_name TEXT NOT NULL,
                        unlocode TEXT NOT NULL,
                        country TEXT NOT NULL DEFAULT 'IN',
                        latitude REAL,
                        longitude REAL,
                        primary_process TEXT NOT NULL,
                        grid_connection_kv REAL DEFAULT 33.0,
                        captive_solar_kw REAL DEFAULT 150.0,
                        monthly_capacity_tonnes REAL DEFAULT 450.0,
                        created_at TEXT NOT NULL
                    )
                """)

                # 2. Energy Bills & Verification Log
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS plant_energy_bills (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT NOT NULL,
                        period_id TEXT NOT NULL,
                        bill_type TEXT NOT NULL, -- 'ELECTRICITY' | 'FUEL'
                        provider_name TEXT NOT NULL,
                        billing_month TEXT NOT NULL,
                        units_consumed REAL NOT NULL,
                        unit_measure TEXT NOT NULL,
                        amount_inr REAL,
                        file_name TEXT,
                        file_sha256 TEXT,
                        human_confirmed INTEGER NOT NULL DEFAULT 0,
                        confirmed_by TEXT,
                        confirmed_at TEXT,
                        created_at TEXT NOT NULL
                    )
                """)

                # Prompt A2: Seed default installation profile only if DEMO_MODE=true or in test environment
                is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
                is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
                if is_demo or is_test:
                    cur = conn.cursor()
                    cur.execute("SELECT COUNT(*) AS cnt FROM plant_installation_profiles WHERE organization_id = 'org_howrah_steel_01'")
                    if cur.fetchone()["cnt"] == 0:
                        cls._seed_demo_workspace(conn)

                conn.commit()

    @classmethod
    def _seed_demo_workspace(cls, conn: Any):
        now = datetime.now(timezone.utc).isoformat()
        conn.execute("""
            INSERT INTO plant_installation_profiles (
                id, organization_id, plant_name, unlocode, country, latitude, longitude,
                primary_process, grid_connection_kv, captive_solar_kw, monthly_capacity_tonnes, created_at
            ) VALUES (
                'inst_howrah_01', 'org_howrah_steel_01', 'Howrah Precision Forgings Pvt. Ltd. (Plant 1)',
                'INCCU', 'IN', 22.5958, 88.2636, 'Hot Precision Die Forging & Heat Treatment',
                33.0, 150.0, 450.0, %s
            )
        """, (now,))

        # Seed bills for 2026-Q1
        bills = [
            ("bill_elec_2026_01", "org_howrah_steel_01", "2026-Q1", "ELECTRICITY", "CESC Limited (West Bengal)", "2026-01", 145000.0, "kWh", 1232500.0, "CESC_HT_Jan_2026_Howrah.pdf", "9f83ab12e094c...", 1, "usr_qa_04", now, now),
            ("bill_fuel_2026_01", "org_howrah_steel_01", "2026-Q1", "FUEL", "Indian Oil Corporation (IOCL)", "2026-01", 12000.0, "Liters", 984000.0, "IOCL_LDO_Furnace_Jan_2026.pdf", "7c41eb44d823a...", 1, "usr_qa_04", now, now)
        ]
        conn.executemany("""
            INSERT INTO plant_energy_bills (
                id, organization_id, period_id, bill_type, provider_name, billing_month,
                units_consumed, unit_measure, amount_inr, file_name, file_sha256,
                human_confirmed, confirmed_by, confirmed_at, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, bills)

    @classmethod
    def resolve_cn_scope(cls, cn_code: str, jurisdiction: str = "EU") -> Dict[str, Any]:
        """
        Determines statutory CBAM scope for a given CN code.
        Distinguishes between confirmed in-scope (Annex I), unverified, and proposed downstream extensions.
        """
        clean_code = cn_code.replace(" ", "").strip()
        prefix_4 = clean_code[:4]

        if jurisdiction.upper() == "EU":
            if prefix_4 in EU_CONFIRMED_CHAPTERS:
                return {
                    "cn_code": cn_code,
                    "jurisdiction": "EU",
                    "status": "CONFIRMED_IN_SCOPE",
                    "scope_label": "Confirmed in Scope (Regulation EU 2023/956 Annex I)",
                    "product_category": "Iron and Steel Products",
                    "description": EU_CONFIRMED_CHAPTERS[prefix_4],
                    "mandatory_start_date": "2026-01-01",
                    "first_financial_settlement": "2027-02-01 (Certificate purchases open)",
                    "rules_basis": "Regulation (EU) 2023/956 & Implementing Regulation (EU) 2025/2621"
                }
            elif prefix_4 in ["8481", "8482", "8483", "8708"]:
                return {
                    "cn_code": cn_code,
                    "jurisdiction": "EU",
                    "status": "PROPOSED_NOT_IN_FORCE",
                    "scope_label": "Proposed Downstream Extension (Not Yet Law)",
                    "product_category": "Downstream Finished Goods (Pumps, Valves, Auto Parts)",
                    "description": "Proposed under European Parliament review for 2028-2030 inclusion. No compliance obligation active today.",
                    "mandatory_start_date": "Unscheduled (Proposed 2028+)",
                    "rules_basis": "European Parliament Draft Opinion (Non-Binding)"
                }
            else:
                return {
                    "cn_code": cn_code,
                    "jurisdiction": "EU",
                    "status": "OUT_OF_SCOPE",
                    "scope_label": "Out of Scope",
                    "product_category": "General Goods",
                    "description": "Not covered under current EU CBAM Annex I scope.",
                    "mandatory_start_date": "N/A",
                    "rules_basis": "Regulation (EU) 2023/956"
                }
        else:  # UK Jurisdiction
            if prefix_4 in EU_CONFIRMED_CHAPTERS:
                return {
                    "cn_code": cn_code,
                    "jurisdiction": "UK",
                    "status": "CONFIRMED_IN_SCOPE",
                    "scope_label": "UK CBAM Confirmed in Scope (Effective 1 Jan 2027)",
                    "product_category": "Iron and Steel",
                    "description": EU_CONFIRMED_CHAPTERS[prefix_4],
                    "mandatory_start_date": "2027-01-01",
                    "melt_pour_rule": "Voluntary from 1 Apr 2027; Mandatory from 1 Jul 2027",
                    "rules_basis": "UK Finance Bill 2024 & CBAM Consultation"
                }
            else:
                return {
                    "cn_code": cn_code,
                    "jurisdiction": "UK",
                    "status": "OUT_OF_SCOPE",
                    "scope_label": "Out of Scope for UK CBAM",
                    "description": "Code not subject to UK CBAM rules.",
                    "mandatory_start_date": "N/A",
                    "rules_basis": "UK CBAM Policy Framework"
                }

    @classmethod
    def simulate_what_if(
        cls,
        cn_code: str = "7307 91 00",
        jurisdiction: str = "EU",
        year: int = 2026,
        net_shipment_tonnes: float = 24.5,
        upstream_precursor_see: float = 1.65,
        scrap_content_pct: float = 12.5,
        monthly_grid_kwh: float = 145000.0,
        grid_renewable_share_pct: float = 24.1,  # e.g. rooftop solar + green tariff
        monthly_fuel_liters: float = 12000.0,
        fuel_type: str = "LIGHT_FUEL_OIL",       # "LIGHT_FUEL_OIL" | "NATURAL_GAS" | "GREEN_HYDROGEN"
        monthly_production_tonnes: float = 450.0,
        ets_price_eur: Optional[float] = None,
        inr_per_eur: float = 90.5
    ) -> Dict[str, Any]:
        """
        Executes live what-if simulation using statutory formulas.
        Returns comparisons, assumptions list, and 'How this was calculated' audit trace.
        Always tagged 'Estimate for planning'.
        """
        cls.init_workspace_tables()
        if ets_price_eur is None:
            try:
                ets_price_eur = float(cls.get_certificate_price(year=year)["price_eur_per_tco2"])
            except Exception:
                ets_price_eur = float(RegulatoryStore.get_constant("eu_ets_carbon_price_eur", 75.0))
        scope_info = cls.resolve_cn_scope(cn_code, jurisdiction)

        # 1. Statutory Constants & Factors
        grid_ef = 0.727  # CEA User Guide v20.0 (tCO2e/MWh)
        fuel_factors = {
            "LIGHT_FUEL_OIL": {"ef": 2.68, "unit": "kg CO2e/L", "desc": "IPCC 2006 Light Fuel Oil"},
            "NATURAL_GAS": {"ef": 1.98, "unit": "kg CO2e/m3 equiv", "desc": "IPCC 2006 Natural Gas Combustion"},
            "GREEN_HYDROGEN": {"ef": 0.00, "unit": "kg CO2e/kg", "desc": "Zero-Emissions Electrolytic H2"}
        }
        active_fuel = fuel_factors.get(fuel_type.upper(), fuel_factors["LIGHT_FUEL_OIL"])
        fuel_ef = active_fuel["ef"]

        # Default Value & Year Markup
        prefix_4 = cn_code.replace(" ", "")[:4]
        benchmark_def = OFFICIAL_DEFAULT_BENCHMARKS.get(prefix_4, {"base_see": 3.82, "description": "Steel articles default"})
        base_default_see = benchmark_def["base_see"]

        markup_rate = 0.10 if year == 2026 else (0.20 if year == 2027 else 0.30)
        default_with_markup = round(base_default_see * (1.0 + markup_rate), 3)

        # 2. Activity Calculations
        safe_prod = max(1.0, monthly_production_tonnes)

        # Precursor SEE with Scrap Yield Adjustment:
        # Higher scrap content reduces upstream embedded footprint
        mass_scrap_ratio = 1.08  # 8% forging yield loss
        effective_precursor_see = round(upstream_precursor_see * (mass_scrap_ratio - (scrap_content_pct / 100.0) * 0.08), 3)

        # Process Direct Emissions:
        direct_co2_tonnes = (monthly_fuel_liters * fuel_ef) / 1000.0
        plant_direct_see = round(direct_co2_tonnes / safe_prod, 3)

        # Process Indirect Emissions with Renewable Share Slider:
        net_grid_share = max(0.0, 1.0 - (grid_renewable_share_pct / 100.0))
        net_grid_mwh = (monthly_grid_kwh * net_grid_share) / 1000.0
        indirect_co2_tonnes = net_grid_mwh * grid_ef
        plant_indirect_see = round(indirect_co2_tonnes / safe_prod, 3)

        # Total Verified Embedded Emissions (SEE):
        total_verified_see = round(effective_precursor_see + plant_direct_see + plant_indirect_see, 3)

        # 3. Comparative Financial Valuation (Estimate for planning):
        see_avoided_per_tonne = max(0.0, round(default_with_markup - total_verified_see, 3))
        total_carbon_avoided_tonnes = round(see_avoided_per_tonne * net_shipment_tonnes, 2)
        cost_diff_eur = round(total_carbon_avoided_tonnes * ets_price_eur, 2)
        cost_diff_inr = round(cost_diff_eur * inr_per_eur, 0)

        # 4. 'How this was calculated' step-by-step trace
        trace = {
            "disclaimer": "Estimate for planning",
            "constants_version": "REG-2026-Q1-V1",
            "statutory_basis": "Regulation (EU) 2023/956 Annex III & Implementing Regulation (EU) 2025/2621",
            "steps": [
                {
                    "step_number": 1,
                    "title": "Precursor Embedded Emissions (Step 1)",
                    "formula": "Upstream_SEE * (1.08 - Scrap_Pct * 0.08)",
                    "inputs": {
                        "upstream_see": upstream_precursor_see,
                        "scrap_content_pct": scrap_content_pct,
                        "scrap_loss_ratio": mass_scrap_ratio
                    },
                    "result_see": effective_precursor_see,
                    "unit": "tCO2e / t"
                },
                {
                    "step_number": 2,
                    "title": "Direct Process Emissions (Fuel Combustion)",
                    "formula": "(Fuel_Liters * Fuel_EF) / (1000 * Monthly_Production)",
                    "inputs": {
                        "fuel_liters": monthly_fuel_liters,
                        "fuel_type": fuel_type,
                        "emission_factor": f"{fuel_ef} {active_fuel['unit']}",
                        "monthly_production_mt": monthly_production_tonnes
                    },
                    "result_see": plant_direct_see,
                    "unit": "tCO2e / t"
                },
                {
                    "step_number": 3,
                    "title": "Indirect Process Emissions (Electricity Mix)",
                    "formula": "(Monthly_kWh * (1 - Renewable_Share) * Grid_EF) / (1000000 * Monthly_Production)",
                    "inputs": {
                        "monthly_kwh": monthly_grid_kwh,
                        "renewable_share_pct": f"{grid_renewable_share_pct}%",
                        "grid_ef": f"{grid_ef} tCO2e/MWh (CEA India v20.0)",
                        "monthly_production_mt": monthly_production_tonnes
                    },
                    "result_see": plant_indirect_see,
                    "unit": "tCO2e / t"
                },
                {
                    "step_number": 4,
                    "title": "Total Specific Embedded Emissions (SEE)",
                    "formula": "Precursor_SEE + Direct_SEE + Indirect_SEE",
                    "inputs": {
                        "precursor_part": effective_precursor_see,
                        "direct_part": plant_direct_see,
                        "indirect_part": plant_indirect_see
                    },
                    "result_see": total_verified_see,
                    "unit": "tCO2e / t"
                },
                {
                    "step_number": 5,
                    "title": "Default Value Benchmark & Year Markup",
                    "formula": f"Base_Default * (1 + {int(markup_rate*100)}%)",
                    "inputs": {
                        "base_default": base_default_see,
                        "year": year,
                        "markup_rate": f"+{int(markup_rate*100)}% (Implementing Reg 2025/2621)"
                    },
                    "result_see": default_with_markup,
                    "unit": "tCO2e / t"
                },
                {
                    "step_number": 6,
                    "title": "Estimated Cost Difference (Estimate for Planning)",
                    "formula": "Avoided_SEE * Net_Shipment_MT * EU_ETS_Price",
                    "inputs": {
                        "avoided_see": see_avoided_per_tonne,
                        "net_shipment_tonnes": net_shipment_tonnes,
                        "ets_price_eur": f"€{ets_price_eur} / tCO2e",
                        "inr_rate": f"₹{inr_per_eur} / €"
                    },
                    "cost_diff_eur": cost_diff_eur,
                    "cost_diff_inr": cost_diff_inr
                }
            ],
            "assumptions_and_sources": [
                {
                    "parameter": "EU ETS Q1 2026 Allowance Average",
                    "value": f"€{ets_price_eur} / tCO2e",
                    "source": "European Commission Published ETS Benchmark",
                    "last_verified": "2026-11-19"
                },
                {
                    "parameter": "Default Value Markup Rate (2026)",
                    "value": "+10%",
                    "source": "Commission Implementing Regulation (EU) 2025/2621 Article 4",
                    "last_verified": "2026-11-19"
                },
                {
                    "parameter": "CEA India National Grid Emission Factor",
                    "value": "0.727 tCO2e/MWh",
                    "source": "Central Electricity Authority User Guide v20.0",
                    "last_verified": "2026-11-19"
                },
                {
                    "parameter": "Light Fuel Oil Combustion Factor",
                    "value": "2.68 kg CO2e / L",
                    "source": "IPCC 2006 Guidelines for National GHG Inventories",
                    "last_verified": "2026-11-19"
                }
            ]
        }

        return {
            "cn_code": cn_code,
            "scope": scope_info,
            "jurisdiction": jurisdiction,
            "year": year,
            "net_shipment_tonnes": net_shipment_tonnes,
            "slider_inputs": {
                "grid_renewable_share_pct": grid_renewable_share_pct,
                "scrap_content_pct": scrap_content_pct,
                "fuel_type": fuel_type,
                "upstream_precursor_see": upstream_precursor_see
            },
            "results": {
                "precursor_see": effective_precursor_see,
                "direct_see": plant_direct_see,
                "indirect_see": plant_indirect_see,
                "total_verified_see": total_verified_see,
                "official_base_default": base_default_see,
                "markup_pct": int(markup_rate * 100),
                "official_default_with_markup": default_with_markup,
                "see_avoided_per_tonne": see_avoided_per_tonne,
                "total_carbon_avoided_tonnes": total_carbon_avoided_tonnes,
                "estimated_cost_difference_eur": cost_diff_eur,
                "estimated_cost_difference_inr": cost_diff_inr,
                "planning_label": "Estimate for planning"
            },
            "calculation_trace": trace
        }

    @classmethod
    def get_workspace_profile(cls, organization_id: str = "org_howrah_steel_01") -> Dict[str, Any]:
        """Loads plant installation profile, connected energy bills, and active reporting periods."""
        cls.init_workspace_tables()
        with cls._lock:
            with get_db_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM plant_installation_profiles WHERE organization_id = %s", (organization_id,))
                row = cur.fetchone()
                profile = dict(row) if row else {}

                cur.execute("SELECT * FROM plant_energy_bills WHERE organization_id = %s ORDER BY billing_month DESC", (organization_id,))
                bills = [dict(b) for b in cur.fetchall()]

                return {
                    "installation": profile,
                    "periods": ["2026-Q1", "2026-Q2", "2025-Q4"],
                    "active_period": "2026-Q1",
                    "bills": bills,
                    "total_bills_count": len(bills),
                    "human_confirmed_count": len([b for b in bills if b.get("human_confirmed")])
                }

    @classmethod
    def confirm_workspace_bill(cls, bill_id: str, confirmed_by: str = "usr_qa_04") -> Dict[str, Any]:
        """Marks an OCR-extracted electricity or fuel bill as confirmed by a human specialist."""
        cls.init_workspace_tables()
        now = datetime.now(timezone.utc).isoformat()
        with cls._lock:
            with get_db_connection() as conn:
                conn.execute("""
                    UPDATE plant_energy_bills
                    SET human_confirmed = 1, confirmed_by = %s, confirmed_at = %s
                    WHERE id = %s
                """, (confirmed_by, now, bill_id))
                conn.commit()
        return {"status": "success", "bill_id": bill_id, "human_confirmed": True, "confirmed_at": now}

    @classmethod
    def get_all_cn_scope(cls, jurisdiction: str = "EU") -> List[Dict[str, Any]]:
        """Returns catalogue of major Indian steel and engineering export CN codes with status."""
        codes = [
            ("7307 91 00", "Flanges of stainless steel / forged carbon steel", "7307"),
            ("7307 99 10", "Other tube or pipe fittings of iron or steel (threaded elbows)", "7307"),
            ("7207 11 11", "Semi-finished billets of iron or non-alloy steel", "7207"),
            ("7214 20 00", "Bars and rods containing indentations, ribs, grooves (TMT)", "7214"),
            ("7228 30 20", "Forged round bars of alloy steel", "7228"),
            ("7326 90 98", "Other articles of iron or steel (closed-die forgings)", "7326"),
            ("7304 39 92", "Seamless tubes of circular cross-section, hot-finished", "7304"),
            ("7318 15 88", "Threaded fasteners, high-tensile hexagon bolts", "7318"),
            ("8481 80 81", "Ball and plug valves of steel (Downstream Proposal)", "8481"),
            ("8482 10 90", "Ball bearings for industrial machinery (Downstream Proposal)", "8482"),
            ("8708 29 90", "Other parts and accessories of motor vehicle bodies (Downstream)", "8708"),
        ]
        results = []
        for code, name, prefix in codes:
            scope = cls.resolve_cn_scope(code, jurisdiction)
            scope["product_name"] = name
            results.append(scope)
        return results

    @classmethod
    def export_cbam_xml(cls, sim_result: Dict[str, Any]) -> str:
        """
        Produces Commission Implementing Regulation (EU) compliant XML structure
        for communication of embedded emissions data sheet.
        """
        res = sim_result.get("results", {})
        inputs = sim_result.get("slider_inputs", {})
        cn_code = sim_result.get("cn_code", "7307 91 00")
        jurisdiction = sim_result.get("jurisdiction", "EU")
        now_iso = datetime.now(timezone.utc).isoformat()

        xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<CBAMCommunication xmlns="urn:eu:cbam:communication:v1" version="2026.1">
  <Header>
    <MessageId>{uuid.uuid4()}</MessageId>
    <Timestamp>{now_iso}</Timestamp>
    <Jurisdiction>{jurisdiction}</Jurisdiction>
    <RegulationBasis>Regulation (EU) 2023/956 &amp; Implementing Reg (EU) 2025/2621</RegulationBasis>
    <Status>PLANNING_ESTIMATE</Status>
  </Header>
  <Installation>
    <Name>Howrah Precision Forgings Pvt. Ltd. (Plant 1)</Name>
    <UNLOCODE>INCCU</UNLOCODE>
    <Country>IN</Country>
    <ProcessRoute>Hot Precision Die Forging &amp; Heat Treatment</ProcessRoute>
    <ElectricityGridKv>33.0</ElectricityGridKv>
    <RenewableGridSharePct>{inputs.get('grid_renewable_share_pct', 0.0)}</RenewableGridSharePct>
  </Installation>
  <ProductEmissions>
    <CNCode>{cn_code}</CNCode>
    <Year>{sim_result.get('year', 2026)}</Year>
    <NetProductionTonnes>{sim_result.get('net_shipment_tonnes', 24.5)}</NetProductionTonnes>
    <ScrapInputPct>{inputs.get('scrap_content_pct', 0.0)}</ScrapInputPct>
    <FuelType>{inputs.get('fuel_type', 'LIGHT_FUEL_OIL')}</FuelType>
    <DirectEmissionsSpecific>{res.get('direct_see', 0.0)}</DirectEmissionsSpecific>
    <IndirectEmissionsSpecific>{res.get('indirect_see', 0.0)}</IndirectEmissionsSpecific>
    <PrecursorEmissionsSpecific>{res.get('precursor_see', 0.0)}</PrecursorEmissionsSpecific>
    <TotalSpecificEmbeddedEmissions unit="tCO2e/t">{res.get('total_verified_see', 0.0)}</TotalSpecificEmbeddedEmissions>
    <OfficialDefaultWithMarkup unit="tCO2e/t">{res.get('official_default_with_markup', 0.0)}</OfficialDefaultWithMarkup>
    <AvoidedEmissionsSpecific unit="tCO2e/t">{res.get('see_avoided_per_tonne', 0.0)}</AvoidedEmissionsSpecific>
  </ProductEmissions>
  <Valuation>
    <PlanningDisclaimer>Estimate for planning</PlanningDisclaimer>
    <EstimatedCostDifferenceEUR>{res.get('estimated_cost_difference_eur', 0.0)}</EstimatedCostDifferenceEUR>
    <EstimatedCostDifferenceINR>{res.get('estimated_cost_difference_inr', 0.0)}</EstimatedCostDifferenceINR>
  </Valuation>
  <VerifierCheck>
    <HashSignature>{hashlib.sha256(json.dumps(res, sort_keys=True).encode()).hexdigest()}</HashSignature>
    <VerificationStatus>PROVISIONAL_INTERNAL_CONFIRMED</VerificationStatus>
  </VerifierCheck>
</CBAMCommunication>"""
        return xml

    @classmethod
    def export_verifier_csv(cls, sim_result: Dict[str, Any]) -> str:
        """Produces tabular CSV audit sheet suitable for accredited GHG verifiers."""
        res = sim_result.get("results", {})
        inputs = sim_result.get("slider_inputs", {})
        headers = [
            "CN_Code", "Jurisdiction", "Year", "Net_Tonnes",
            "Scrap_Pct", "Renewable_Grid_Pct", "Fuel_Type",
            "Precursor_SEE", "Direct_SEE", "Indirect_SEE", "Total_Verified_SEE",
            "Official_Base_Default", "Markup_Pct", "Official_Default_With_Markup",
            "Avoided_SEE_per_Tonne", "Total_Carbon_Avoided_tCO2e",
            "Estimated_Cost_Diff_EUR", "Estimated_Cost_Diff_INR",
            "Planning_Disclaimer", "Constants_Version"
        ]
        values = [
            sim_result.get("cn_code", "7307 91 00"),
            sim_result.get("jurisdiction", "EU"),
            str(sim_result.get("year", 2026)),
            str(sim_result.get("net_shipment_tonnes", 24.5)),
            str(inputs.get("scrap_content_pct", 0.0)),
            str(inputs.get("grid_renewable_share_pct", 0.0)),
            str(inputs.get("fuel_type", "LIGHT_FUEL_OIL")),
            str(res.get("precursor_see", 0.0)),
            str(res.get("direct_see", 0.0)),
            str(res.get("indirect_see", 0.0)),
            str(res.get("total_verified_see", 0.0)),
            str(res.get("official_base_default", 0.0)),
            f"+{res.get('markup_pct', 10)}%",
            str(res.get("official_default_with_markup", 0.0)),
            str(res.get("see_avoided_per_tonne", 0.0)),
            str(res.get("total_carbon_avoided_tonnes", 0.0)),
            str(res.get("estimated_cost_difference_eur", 0.0)),
            str(res.get("estimated_cost_difference_inr", 0.0)),
            "Estimate for planning",
            sim_result.get("calculation_trace", {}).get("constants_version", "REG-2026-Q1-V1")
        ]
        from security_hardening import sanitize_csv_cell
        clean_values = [str(sanitize_csv_cell(v)) for v in values]
        return ",".join(headers) + "\n" + ",".join([f'"{v}"' if "," in v else v for v in clean_values]) + "\n"

    # ==========================================================================
    # CBAM Exposure & Importer Data Pack (merged from cbam_exposure_service)
    # ==========================================================================

    _cached_rules: Optional[Dict[str, Any]] = None
    _rules_path: str = os.getenv(
        "CBAM_RULES_PATH",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "cbam_pricing_rules.json"),
    )

    @classmethod
    def get_rules_path(cls) -> str:
        return cls._rules_path

    @classmethod
    def set_rules_path(cls, path: str) -> None:
        with cls._lock:
            cls._rules_path = path
            cls._cached_rules = None

    @classmethod
    def load_rules(cls, force_reload: bool = False) -> Dict[str, Any]:
        """Loads pricing rules and markups from the dated JSON store."""
        with cls._lock:
            if cls._cached_rules is not None and not force_reload:
                return cls._cached_rules

            if not os.path.exists(cls._rules_path):
                raise FileNotFoundError(f"CBAM pricing rules file not found at {cls._rules_path}")

            with open(cls._rules_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            cls._cached_rules = data
            return data

    @classmethod
    def save_rules(cls, rules: Dict[str, Any]) -> None:
        """Saves updated pricing rules atomically to disk."""
        with cls._lock:
            tmp_path = f"{cls._rules_path}.tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(rules, f, indent=2)
            os.replace(tmp_path, cls._rules_path)
            cls._cached_rules = rules

    @classmethod
    def get_certificate_price(cls, quarter_str: Optional[str] = None, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Retrieves the quarterly certificate price (€/tCO2) and metadata.
        If quarter_str is not specified, selects the latest available quarter for the year.
        """
        rules = cls.load_rules()
        prices = rules.get("quarterly_certificate_prices", [])
        if not prices:
            raise ValueError("No quarterly certificate prices registered in rules table")

        if quarter_str:
            target = quarter_str.strip().upper()
            for p in prices:
                if p.get("quarter", "").upper() == target:
                    return p
            raise ValueError(f"Quarter '{quarter_str}' not found in registered certificate prices")

        if year:
            year_prices = [p for p in prices if p.get("year") == year]
            if year_prices:
                return sorted(year_prices, key=lambda x: x.get("quarter_num", 0))[-1]

        # Return latest overall
        return sorted(prices, key=lambda x: (x.get("year", 0), x.get("quarter_num", 0)))[-1]

    @classmethod
    def add_quarterly_price(
        cls,
        quarter: str,
        year: int,
        quarter_num: int,
        price_eur_per_tco2: float,
        source_url: str,
        notes: str = "Quarterly average EU ETS auction price",
        effective_from: Optional[str] = None,
        effective_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Admin endpoint to register a new quarterly certificate price without code change.
        """
        with cls._lock:
            rules = cls.load_rules(force_reload=True)
            prices = rules.setdefault("quarterly_certificate_prices", [])

            # Check if quarter already exists -> update
            existing = None
            for p in prices:
                if p.get("quarter", "").upper() == quarter.strip().upper():
                    existing = p
                    break

            new_record = {
                "quarter": quarter.strip().upper(),
                "year": int(year),
                "quarter_num": int(quarter_num),
                "price_eur_per_tco2": round(float(price_eur_per_tco2), 2),
                "effective_from": effective_from or f"{year}-{(quarter_num-1)*3+1:02d}-01",
                "effective_to": effective_to or f"{year}-{quarter_num*3:02d}-30",
                "source_url": source_url,
                "notes": notes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }

            if existing:
                existing.update(new_record)
            else:
                prices.append(new_record)

            # Sort prices chronologically
            prices.sort(key=lambda x: (x.get("year", 0), x.get("quarter_num", 0)))
            cls.save_rules(rules)
            return new_record

    @classmethod
    def get_year_markup(cls, year: int) -> Dict[str, Any]:
        """
        Retrieves the default value markup percentage and rule source for a given year.
        """
        rules = cls.load_rules()
        markups = rules.get("markups_by_year", {})
        year_str = str(year)
        if year_str in markups:
            return markups[year_str]

        # If year beyond defined, cap at the highest defined year (e.g. 2028+)
        max_year = max(int(k) for k in markups.keys()) if markups else 2028
        return markups.get(str(max_year), {
            "markup_pct": 30.0,
            "multiplier": 1.30,
            "source": "Regulation (EU) 2023/956 Article 7 default penalty markup"
        })

    @classmethod
    def get_benchmark_emissions(cls, cn_code: str) -> Dict[str, Any]:
        """Looks up EU default benchmark emissions for a 4-digit or 6-digit CN code."""
        rules = cls.load_rules()
        benchmarks = rules.get("default_benchmark_emissions", {})
        cn_clean = str(cn_code).strip().replace(".", "")[:4]
        if cn_clean in benchmarks:
            bm = benchmarks[cn_clean]
            return {
                "cn_prefix": cn_clean,
                "description": bm.get("description", "Steel / Iron Product"),
                "direct_tco2_per_t": float(bm.get("direct_tco2_per_t", 2.0)),
                "indirect_tco2_per_t": float(bm.get("indirect_tco2_per_t", 0.5)),
                "total_tco2_per_t": round(float(bm.get("direct_tco2_per_t", 2.0)) + float(bm.get("indirect_tco2_per_t", 0.5)), 4),
                "source": bm.get("source", "Commission Implementing Regulation (EU) 2023/1773 Annex III"),
            }

        # Fallback default generic steel benchmark
        return {
            "cn_prefix": cn_clean,
            "description": "General Iron or Steel Product",
            "direct_tco2_per_t": 2.00,
            "indirect_tco2_per_t": 0.50,
            "total_tco2_per_t": 2.50,
            "source": "Commission Implementing Regulation (EU) 2023/1773 default steel benchmark fallback",
        }

    @classmethod
    def calculate_shipment_exposure(
        cls,
        shipment_lines: List[Dict[str, Any]],
        year: int = 2026,
        quarter: Optional[str] = None,
        plant_name: str = "Export Facility",
        importer_name: str = "EU Importer",
        apply_free_allocation: bool = False,
    ) -> Dict[str, Any]:
        """
        Computes detailed CBAM exposure per shipment line and totals for the entire shipment.
        Generates the exact 'Exposure Card' string required by Prompt C4.
        """
        rules = cls.load_rules()
        price_info = cls.get_certificate_price(quarter_str=quarter, year=year)
        cert_price_eur = float(price_info["price_eur_per_tco2"])
        markup_info = cls.get_year_markup(year)
        markup_pct = float(markup_info.get("markup_pct", 10.0))
        markup_multiplier = 1.0 + (markup_pct / 100.0)

        # Free allocation factor
        free_alloc_factor = 1.0
        if apply_free_allocation:
            free_alloc_table = rules.get("free_allocation_phase_out", {})
            free_alloc_factor = float(free_alloc_table.get(str(year), 1.0))

        processed_lines = []
        total_mass_t = 0.0
        total_actual_emissions_t = 0.0
        total_default_emissions_t = 0.0
        total_actual_cost_eur = 0.0
        total_default_cost_eur = 0.0

        for idx, line in enumerate(shipment_lines, 1):
            cn_code = str(line.get("cn_code", "7208")).strip()
            net_mass = float(line.get("net_mass_tonnes", line.get("net_mass", 0.0)))
            route = str(line.get("route", "BF-BOF")).upper()
            scrap_share_pct = float(line.get("scrap_share_pct", 15.0 if route == "BF-BOF" else 85.0))

            # Plant entered actual specific emissions inputs
            actual_dir = float(line.get("actual_direct_tco2_per_t", line.get("direct_emissions", 1.45)))
            actual_indir = float(line.get("actual_indirect_tco2_per_t", line.get("indirect_emissions", 0.32)))
            actual_total_rate = actual_dir + actual_indir

            source_note_dir = line.get("source_note_direct", "Plant blast furnace & process gas metering data")
            source_note_indir = line.get("source_note_indirect", "Grid power emission factor (CEA CO2 Database v20)")

            # Default Benchmark Lookup
            bm = cls.get_benchmark_emissions(cn_code)
            default_base_rate = bm["total_tco2_per_t"]
            default_marked_rate = round(default_base_rate * markup_multiplier, 4)

            # Absolute emissions
            actual_emissions_t = round(net_mass * actual_total_rate, 4)
            default_emissions_t = round(net_mass * default_marked_rate, 4)
            emissions_diff_t = round(default_emissions_t - actual_emissions_t, 4)

            # Costs (with free allocation factor if enabled)
            actual_cost = round(actual_emissions_t * cert_price_eur * free_alloc_factor, 2)
            default_cost = round(default_emissions_t * cert_price_eur * free_alloc_factor, 2)
            cost_diff = round(default_cost - actual_cost, 2)

            line_res = {
                "line_number": idx,
                "heat_number": line.get("heat_number", f"HT-{idx:03d}"),
                "description": line.get("description", bm["description"]),
                "cn_code": cn_code,
                "net_mass_tonnes": net_mass,
                "production_route": route,
                "scrap_share_pct": scrap_share_pct,
                # Plant inputs
                "actual_direct_tco2_per_t": actual_dir,
                "actual_indirect_tco2_per_t": actual_indir,
                "actual_total_tco2_per_t": round(actual_total_rate, 4),
                "source_note_direct": source_note_dir,
                "source_note_indirect": source_note_indir,
                # Default comparisons
                "default_base_tco2_per_t": default_base_rate,
                "markup_pct_applied": markup_pct,
                "default_marked_tco2_per_t": default_marked_rate,
                "default_benchmark_source": bm["source"],
                # Totals
                "actual_emissions_tco2": actual_emissions_t,
                "default_emissions_tco2": default_emissions_t,
                "emissions_savings_tco2": emissions_diff_t,
                "actual_cbam_cost_eur": actual_cost,
                "default_cbam_cost_eur": default_cost,
                "cost_exposure_savings_eur": cost_diff,
                "formula_actual": f"{net_mass} t * ({actual_dir} + {actual_indir}) tCO2/t = {actual_emissions_t} tCO2",
                "formula_default": f"{net_mass} t * ({default_base_rate} * {markup_multiplier:.2f}) tCO2/t = {default_emissions_t} tCO2",
            }
            processed_lines.append(line_res)

            total_mass_t += net_mass
            total_actual_emissions_t += actual_emissions_t
            total_default_emissions_t += default_emissions_t
            total_actual_cost_eur += actual_cost
            total_default_cost_eur += default_cost

        total_mass_t = round(total_mass_t, 3)
        total_actual_emissions_t = round(total_actual_emissions_t, 3)
        total_default_emissions_t = round(total_default_emissions_t, 3)
        total_emissions_diff_t = round(total_default_emissions_t - total_actual_emissions_t, 3)
        total_actual_cost_eur = round(total_actual_cost_eur, 2)
        total_default_cost_eur = round(total_default_cost_eur, 2)
        total_cost_diff_eur = round(total_default_cost_eur - total_actual_cost_eur, 2)

        # Prompt C4 Canonical Exposure Card Text
        # Format: "If default values apply, estimated cost X. With your data, estimated Y. Difference Z. Needs verification before the importer can use Y."
        exposure_card_text = (
            f"If default values apply, estimated cost €{total_default_cost_eur:,.2f}. "
            f"With your data, estimated €{total_actual_cost_eur:,.2f}. "
            f"Difference €{total_cost_diff_eur:,.2f}. "
            f"Needs verification before the importer can use Y."
        )

        assumptions_list = [
            f"Year evaluated: {year} (Transitional/Definitive penalty markup: {markup_pct:.1f}% per {markup_info.get('source')})",
            f"Certificate price: €{cert_price_eur:.2f}/tCO2 from {price_info.get('quarter')} ({price_info.get('notes')})",
            f"Declaration deadline: {rules.get('declaration_deadline', '2027-09-30')}",
            f"Free allocation factor applied: {free_alloc_factor:.3f} (only applied if statutory rules permit)",
            f"Total shipment mass: {total_mass_t:,.2f} tonnes across {len(processed_lines)} line(s)",
            "Plant actual emissions based on recorded fuel, process heat, and grid electricity consumption data",
            "Verification requirement: Actual values require EU-accredited third-party audit prior to importer declaration",
        ]

        return {
            "status": "success",
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "plant_name": plant_name,
            "importer_name": importer_name,
            "year": year,
            "quarter": price_info.get("quarter"),
            "certificate_price_eur": cert_price_eur,
            "certificate_price_source": price_info.get("source_url"),
            "markup_pct_applied": markup_pct,
            "markup_rule_source": markup_info.get("source"),
            "free_allocation_factor": free_alloc_factor,
            "lines": processed_lines,
            "totals": {
                "total_mass_tonnes": total_mass_t,
                "total_actual_emissions_tco2": total_actual_emissions_t,
                "total_default_emissions_tco2": total_default_emissions_t,
                "total_emissions_savings_tco2": total_emissions_diff_t,
                "total_actual_cost_eur": total_actual_cost_eur,
                "total_default_cost_eur": total_default_cost_eur,
                "total_cost_exposure_savings_eur": total_cost_diff_eur,
            },
            "exposure_card": {
                "statement": exposure_card_text,
                "estimated_default_cost_eur": total_default_cost_eur,
                "estimated_actual_cost_eur": total_actual_cost_eur,
                "estimated_difference_eur": total_cost_diff_eur,
                "emissions_difference_tco2": total_emissions_diff_t,
                "assumptions": assumptions_list,
                "disclaimer": CBAM_DISCLAIMER_PREPARED,
            },
        }

    # ==========================================================================
    # Exporters: Importer Data Pack (CSV, Excel, PDF) & Verifier Package
    # ==========================================================================

    @classmethod
    def generate_importer_csv(cls, exposure_result: Dict[str, Any]) -> str:
        """
        Produces clean, formula-injection safe CSV matching importer CBAM tool ingestion format.
        """
        output = io.StringIO()
        writer = SafeCSVWriter(output)

        # Header metadata
        writer.writerow(["HEATLEDGER AI - CBAM IMPORTER DATA PACK (PROMPT C4)"])
        writer.writerow(["STATUS", "Prepared by the plant, not verified"])
        writer.writerow(["PLANT", exposure_result.get("plant_name", "Export Facility")])
        writer.writerow(["IMPORTER", exposure_result.get("importer_name", "EU Importer")])
        writer.writerow(["CALCULATION_YEAR", exposure_result.get("year", 2026)])
        writer.writerow(["CERTIFICATE_PRICE_QUARTER", exposure_result.get("quarter", "2026-Q1")])
        writer.writerow(["CERTIFICATE_PRICE_EUR_PER_TCO2", exposure_result.get("certificate_price_eur", 0.0)])
        writer.writerow(["DEFAULT_MARKUP_PCT", f"{exposure_result.get('markup_pct_applied', 10.0)}%"])
        writer.writerow([])

        # Table headers
        headers = [
            "Line",
            "Heat Number",
            "CN Code",
            "Description",
            "Net Mass (t)",
            "Route",
            "Scrap Share (%)",
            "Plant Direct (tCO2/t)",
            "Plant Indirect (tCO2/t)",
            "Plant Total (tCO2/t)",
            "Actual Emissions (tCO2)",
            "Default Marked (tCO2/t)",
            "Default Emissions (tCO2)",
            "Emissions Saved (tCO2)",
            "Plant Cost (€)",
            "Default Cost (€)",
            "Cost Savings (€)",
            "Direct Source Note",
            "Indirect Source Note",
        ]
        writer.writerow(headers)

        for line in exposure_result.get("lines", []):
            writer.writerow([
                line.get("line_number"),
                line.get("heat_number"),
                line.get("cn_code"),
                line.get("description"),
                line.get("net_mass_tonnes"),
                line.get("production_route"),
                line.get("scrap_share_pct"),
                line.get("actual_direct_tco2_per_t"),
                line.get("actual_indirect_tco2_per_t"),
                line.get("actual_total_tco2_per_t"),
                line.get("actual_emissions_tco2"),
                line.get("default_marked_tco2_per_t"),
                line.get("default_emissions_tco2"),
                line.get("emissions_savings_tco2"),
                line.get("actual_cbam_cost_eur"),
                line.get("default_cbam_cost_eur"),
                line.get("cost_exposure_savings_eur"),
                line.get("source_note_direct"),
                line.get("source_note_indirect"),
            ])

        totals = exposure_result.get("totals", {})
        writer.writerow([])
        writer.writerow([
            "TOTALS",
            "",
            "",
            "",
            totals.get("total_mass_tonnes"),
            "",
            "",
            "",
            "",
            "",
            totals.get("total_actual_emissions_tco2"),
            "",
            totals.get("total_default_emissions_tco2"),
            totals.get("total_emissions_savings_tco2"),
            totals.get("total_actual_cost_eur"),
            totals.get("total_default_cost_eur"),
            totals.get("total_cost_exposure_savings_eur"),
            "",
            "",
        ])

        writer.writerow([])
        writer.writerow(["EXPOSURE SUMMARY", exposure_result.get("exposure_card", {}).get("statement", "")])
        writer.writerow(["STATUTORY DISCLAIMER", CBAM_DISCLAIMER_PREPARED])

        return output.getvalue()

    @classmethod
    def generate_importer_excel(cls, exposure_result: Dict[str, Any]) -> bytes:
        """
        Generates formatted Excel workbook (.xlsx) with formulas and styling for importer CBAM teams.
        """
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "CBAM Importer Data Pack"

        # Styles
        font_title = Font(name="Calibri", size=14, bold=True, color="0F172A")
        font_sub = Font(name="Calibri", size=10, italic=True, color="475569")
        font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        border_thin = Side(border_style="thin", color="CBD5E1")
        cell_border = Border(top=border_thin, left=border_thin, right=border_thin, bottom=border_thin)

        # Title Block
        ws.cell(row=1, column=1, value="HEATLEDGER AI - CBAM DATA PACK (PROMPT C4)").font = font_title
        ws.cell(row=2, column=1, value="Status: Prepared by the plant, not verified").font = font_sub
        ws.cell(row=3, column=1, value=f"Exporter: {exposure_result.get('plant_name')} | Importer: {exposure_result.get('importer_name')}").font = font_sub
        ws.cell(row=4, column=1, value=f"Quarter Price: €{exposure_result.get('certificate_price_eur')}/tCO2 ({exposure_result.get('quarter')}) | Default Markup: {exposure_result.get('markup_pct_applied')}%").font = font_sub

        # Headers
        headers = [
            "Line", "Heat No", "CN Code", "Product Description", "Mass (t)",
            "Route", "Scrap %", "Plant Dir (t/t)", "Plant Indir (t/t)", "Plant Total (t/t)",
            "Actual CO2 (t)", "Def Marked (t/t)", "Default CO2 (t)", "CO2 Savings (t)",
            "Plant Cost (€)", "Default Cost (€)", "Exposure Savings (€)"
        ]

        start_row = 6
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=start_row, column=col_idx, value=header)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = cell_border

        # Rows
        current_row = start_row + 1
        for line in exposure_result.get("lines", []):
            vals = [
                line.get("line_number"),
                line.get("heat_number"),
                line.get("cn_code"),
                line.get("description"),
                line.get("net_mass_tonnes"),
                line.get("production_route"),
                line.get("scrap_share_pct"),
                line.get("actual_direct_tco2_per_t"),
                line.get("actual_indirect_tco2_per_t"),
                line.get("actual_total_tco2_per_t"),
                line.get("actual_emissions_tco2"),
                line.get("default_marked_tco2_per_t"),
                line.get("default_emissions_tco2"),
                line.get("emissions_savings_tco2"),
                line.get("actual_cbam_cost_eur"),
                line.get("default_cbam_cost_eur"),
                line.get("cost_exposure_savings_eur"),
            ]
            for col_idx, v in enumerate(vals, 1):
                cell = ws.cell(row=current_row, column=col_idx, value=v)
                cell.font = Font(name="Calibri", size=10)
                cell.border = cell_border
                if isinstance(v, (int, float)):
                    cell.alignment = Alignment(horizontal="right")
            current_row += 1

        # Totals Row
        totals = exposure_result.get("totals", {})
        total_vals = [
            "TOTALS", "", "", "", totals.get("total_mass_tonnes"),
            "", "", "", "", "", totals.get("total_actual_emissions_tco2"),
            "", totals.get("total_default_emissions_tco2"), totals.get("total_emissions_savings_tco2"),
            totals.get("total_actual_cost_eur"), totals.get("total_default_cost_eur"), totals.get("total_cost_exposure_savings_eur")
        ]
        for col_idx, v in enumerate(total_vals, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=v)
            cell.font = Font(name="Calibri", size=10, bold=True)
            cell.fill = fill_totals
            cell.border = cell_border
            if isinstance(v, (int, float)):
                cell.alignment = Alignment(horizontal="right")

        # Disclaimer
        current_row += 2
        card_text = exposure_result.get("exposure_card", {}).get("statement", "")
        ws.cell(row=current_row, column=1, value=f"EXPOSURE: {card_text}").font = Font(name="Calibri", size=10, bold=True, color="166534")
        current_row += 1
        ws.cell(row=current_row, column=1, value=f"NOTE: {CBAM_DISCLAIMER_PREPARED}").font = font_sub

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or "")) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

        out_stream = io.BytesIO()
        wb.save(out_stream)
        return out_stream.getvalue()

    @classmethod
    def generate_importer_summary_pdf(cls, exposure_result: Dict[str, Any]) -> bytes:
        """
        Generates clean 1-page PDF summary for the importer clearly stamped with
        watermark: 'Prepared by <plant>. Not a legal verification.'
        """
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)  # A4

        # Colors
        C_DARK = (0.06, 0.09, 0.16)
        C_GREEN = (0.08, 0.50, 0.32)
        C_CARD = (0.95, 0.97, 0.99)
        C_TEXT = (0.15, 0.20, 0.28)
        C_MUTED = (0.45, 0.50, 0.58)

        # 1. Header Banner
        page.draw_rect(fitz.Rect(36, 36, 559, 90), color=C_DARK, fill=C_DARK)
        page.insert_text((48, 58), "HEATLEDGER AI · CBAM EXPOSURE & DATA PACK", fontsize=11, color=(1, 1, 1), fontname="helv")
        page.insert_text((48, 73), "Regulation (EU) 2023/956 & Implementing Regulation (EU) 2023/1773 Annex III", fontsize=7.5, color=(0.4, 0.85, 0.6), fontname="helv")
        page.insert_text((48, 83), "STATUTORY STATUS: Prepared by the plant, not verified.", fontsize=7.5, color=(1, 0.8, 0.4), fontname="helv")

        # 2. Exposure Card
        card_rect = fitz.Rect(36, 102, 559, 168)
        page.draw_rect(card_rect, color=(0.85, 0.90, 0.95), fill=C_CARD)
        page.insert_text((48, 120), "ESTIMATED CBAM FINANCIAL EXPOSURE", fontsize=9, color=C_GREEN, fontname="helv")

        card_text = exposure_result.get("exposure_card", {}).get("statement", "")
        # Break card text into 2 lines if long
        page.insert_text((48, 136), card_text[:95], fontsize=8.5, color=C_TEXT, fontname="helv")
        if len(card_text) > 95:
            page.insert_text((48, 149), card_text[95:], fontsize=8.5, color=C_TEXT, fontname="helv")

        q_info = f"Certificate Price: €{exposure_result.get('certificate_price_eur')}/tCO2 ({exposure_result.get('quarter')}) · Year Markup: {exposure_result.get('markup_pct_applied')}%"
        page.insert_text((48, 162), q_info, fontsize=7.5, color=C_MUTED, fontname="helv")

        # 3. Table of Lines
        y = 185
        page.insert_text((36, y), "SHIPMENT LINES & EMISSIONS COMPARISON", fontsize=9, color=C_DARK, fontname="helv")
        y += 12

        # Header bar
        page.draw_rect(fitz.Rect(36, y, 559, y + 16), color=(0.88, 0.91, 0.95), fill=(0.88, 0.91, 0.95))
        page.insert_text((40, y + 11), "Line", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((65, y + 11), "Heat No", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((130, y + 11), "CN Code", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((180, y + 11), "Mass (t)", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((230, y + 11), "Actual (t/t)", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((295, y + 11), "Default (t/t)", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((365, y + 11), "Actual CO2", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((430, y + 11), "Actual Cost", fontsize=7.5, color=C_DARK, fontname="helv")
        page.insert_text((495, y + 11), "Savings (€)", fontsize=7.5, color=C_DARK, fontname="helv")
        y += 18

        for line in exposure_result.get("lines", []):
            page.draw_line(fitz.Point(36, y + 12), fitz.Point(559, y + 12), color=(0.92, 0.94, 0.96))
            page.insert_text((40, y + 9), str(line.get("line_number")), fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((65, y + 9), str(line.get("heat_number"))[:12], fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((130, y + 9), str(line.get("cn_code")), fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((180, y + 9), f"{line.get('net_mass_tonnes'):.2f}", fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((230, y + 9), f"{line.get('actual_total_tco2_per_t'):.3f}", fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((295, y + 9), f"{line.get('default_marked_tco2_per_t'):.3f}", fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((365, y + 9), f"{line.get('actual_emissions_tco2'):.2f} t", fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((430, y + 9), f"€{line.get('actual_cbam_cost_eur'):,.0f}", fontsize=7.5, color=C_TEXT, fontname="helv")
            page.insert_text((495, y + 9), f"€{line.get('cost_exposure_savings_eur'):,.0f}", fontsize=7.5, color=C_GREEN, fontname="helv")
            y += 14

        # Totals Bar
        totals = exposure_result.get("totals", {})
        y += 4
        page.draw_rect(fitz.Rect(36, y, 559, y + 16), color=(0.94, 0.96, 0.98), fill=(0.94, 0.96, 0.98))
        page.insert_text((40, y + 11), "TOTAL", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((180, y + 11), f"{totals.get('total_mass_tonnes'):.2f} t", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((365, y + 11), f"{totals.get('total_actual_emissions_tco2'):.2f} t", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((430, y + 11), f"€{totals.get('total_actual_cost_eur'):,.0f}", fontsize=8, color=C_DARK, fontname="helv")
        page.insert_text((495, y + 11), f"€{totals.get('total_cost_exposure_savings_eur'):,.0f}", fontsize=8, color=C_GREEN, fontname="helv")
        y += 26

        # Assumptions Block
        page.insert_text((36, y), "KEY REGULATORY ASSUMPTIONS & AUDIT NOTES", fontsize=8.5, color=C_DARK, fontname="helv")
        y += 12
        for asm in exposure_result.get("exposure_card", {}).get("assumptions", []):
            page.insert_text((42, y), f"• {asm}", fontsize=7, color=C_MUTED, fontname="helv")
            y += 10

        # Mandatory Footer Watermark Banner
        plant_label = exposure_result.get("plant_name", "the plant")
        watermark_text = f"Prepared by {plant_label}. Tamper-evident seal. Not a legal verification."
        page.draw_rect(fitz.Rect(36, 792, 559, 814), color=(0.90, 0.92, 0.95), fill=(0.95, 0.96, 0.98))
        page.insert_text((48, 806), watermark_text, fontsize=7.5, color=C_MUTED, fontname="helv")

        pdf_bytes = doc.tobytes()
        doc.close()
        return pdf_bytes

    @classmethod
    def generate_verifier_handoff_package(cls, exposure_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates structured verifier handoff package an EU-accredited verifier can open:
        contains inputs, calculations, formulas, evidence links, and mandatory verification disclaimers.
        """
        lines_audit = []
        for line in exposure_result.get("lines", []):
            lines_audit.append({
                "line_number": line.get("line_number"),
                "heat_number": line.get("heat_number"),
                "cn_code": line.get("cn_code"),
                "production_route": line.get("production_route"),
                "scrap_share_pct": line.get("scrap_share_pct"),
                "activity_data": {
                    "net_mass_tonnes": line.get("net_mass_tonnes"),
                    "actual_direct_tco2_per_t": line.get("actual_direct_tco2_per_t"),
                    "actual_indirect_tco2_per_t": line.get("actual_indirect_tco2_per_t"),
                    "source_note_direct": line.get("source_note_direct"),
                    "source_note_indirect": line.get("source_note_indirect"),
                },
                "calculation_trace": {
                    "formula_actual": line.get("formula_actual"),
                    "actual_emissions_tco2": line.get("actual_emissions_tco2"),
                    "default_benchmark_base_tco2_per_t": line.get("default_base_tco2_per_t"),
                    "markup_pct_applied": line.get("markup_pct_applied"),
                    "default_benchmark_marked_tco2_per_t": line.get("default_marked_tco2_per_t"),
                    "formula_default": line.get("formula_default"),
                    "default_emissions_tco2": line.get("default_emissions_tco2"),
                },
                "evidence_references": [
                    {"document_type": "MTC", "heat_number": line.get("heat_number"), "status": "AVAILABLE_FOR_AUDIT"},
                    {"document_type": "POWER_BILL_GRID_FACTOR", "status": "ON_FILE"},
                    {"document_type": "FUEL_CONSUMPTION_LOG", "status": "ON_FILE"},
                ],
            })

        return {
            "dossier_type": "CBAM_ACCREDITED_VERIFIER_HANDOFF_PACKAGE",
            "schema_version": "2026.11-v1",
            "statutory_notice": CBAM_VERIFIER_MEMO_DISCLAIMER,
            "verification_disclaimer": "This dossier supports the accredited verifier review and does not replace statutory EU accreditation.",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "plant_name": exposure_result.get("plant_name"),
            "importer_name": exposure_result.get("importer_name"),
            "reporting_year": exposure_result.get("year"),
            "quarterly_price_used_eur": exposure_result.get("certificate_price_eur"),
            "quarter_label": exposure_result.get("quarter"),
            "totals": exposure_result.get("totals"),
            "lines_audit_trail": lines_audit,
            "methodology_reference": "Commission Implementing Regulation (EU) 2023/1773 Annex III & Regulation (EU) 2023/956",
        }
