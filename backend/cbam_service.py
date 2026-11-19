"""
HEATLEDGER AI: CBAM Engine Service (Prompt B7)
Specification: Regulation (EU) 2023/956, Implementing Regulation (EU) 2023/1773 & 2025/2621.
Provides immutable calculation storage, versioning, recalculation, export,
and period/installation management.
"""

import os
import json
import sqlite3
import threading
import time
import uuid
import csv
import io
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from compliance_engine import ComplianceEngine, CBAMEmissionResult
from regulatory_store import RegulatoryStore


class CBAMService:
    DB_PATH = os.path.join(os.path.dirname(__file__), "cbam_ledger.db")
    _lock = threading.RLock()

    @classmethod
    def get_connection(cls) -> sqlite3.Connection:
        conn = sqlite3.connect(cls.DB_PATH, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        return conn

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
                        "INSERT INTO installations (id, name, country, unlocode, latitude, longitude, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
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
        writer = csv.writer(output)

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
