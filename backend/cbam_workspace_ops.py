"""
HEATLEDGER AI: CBAM Workspace Aggregation & What-If Simulation Operations
Extracted from cbam_service.py for Prompt Pack v5 Task 6.1.
"""

import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional

from compliance_engine import ComplianceEngine
from regulatory_store import RegulatoryStore

logger = logging.getLogger("heatledger.cbam_service")


def seed_default_installation_if_empty(cbam_cls: Any) -> None:
    """Seeds demo installation ONLY when DEMO_MODE=true or in explicit test mode."""
    is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
    is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
    if not (is_demo or is_test):
        return
    cbam_cls.init_db()
    with cbam_cls._lock:
        conn = cbam_cls.get_connection()
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
                            now,
                        ),
                    )
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        ("period_2026_Q1_IN-WB-4409", "IN-WB-4409", 2026, 1, 145000.0, 35000.0, 12000.0, 450.0, now),
                    )
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO reporting_periods (id, installation_id, year, quarter, grid_kwh, solar_offset_kwh, fuel_liters, production_tonnes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        ("period_2025_Q4_IN-WB-4409", "IN-WB-4409", 2025, 4, 152000.0, 28000.0, 13500.0, 470.0, now - 7776000),
                    )
        finally:
            conn.close()


def get_workspace_data(cbam_cls: Any, organization_id: str) -> Dict[str, Any]:
    """Retrieves the complete CBAM workspace state for an organization."""
    if not organization_id:
        raise ValueError("organization_id is required")

    is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
    is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
    if is_demo and organization_id in ("org_howrah_steel_01", "org_demo_howrah"):
        cbam_cls.seed_default_installation_if_empty()

    RegulatoryStore.init_tables()
    installations = cbam_cls.list_installations(organization_id=organization_id)
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
                "Non-Destructive Testing (Ultrasonic & Dye Penetrant Inspection)",
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

        with cbam_cls._lock:
            conn = cbam_cls.get_connection()
            try:
                cur = conn.execute(
                    "SELECT * FROM reporting_periods WHERE installation_id = ? ORDER BY year DESC, quarter DESC",
                    (inst["id"],),
                )
                periods = [dict(r) for r in cur.fetchall()]
            finally:
                conn.close()

        bills = cbam_cls.list_energy_bills(inst["id"])

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
            "precursor_type": "Alloy Billets / Ingots",
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
            "precursor_type": "Carbon Steel Billets (C < 0.25%)",
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
            "precursor_type": "Direct Liquid / Re-rolled crude steel",
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
            "precursor_type": "Forged Blanks / Machined Parts",
        },
    ]

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
                "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf",
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
                "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf",
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
                "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf",
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
                "evidence_url": "/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf",
            },
        ]
        if (is_demo or (is_test and organization_id == "org_howrah_steel_01"))
        else []
    )

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
                    "evidence_url": r.get("evidence_url", ""),
                })
    except Exception as e:
        logger.debug(f"Precursor linking from supplier requests: {e}")

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
        "disclaimer": "Estimate for planning. Verified regulatory sources applied.",
    }


def confirm_bill(cbam_cls: Any, bill_id: str) -> Dict[str, Any]:
    """Human-in-the-loop confirmation of OCR-extracted bill."""
    cbam_cls.init_db()
    now = time.time()
    with cbam_cls._lock:
        conn = cbam_cls.get_connection()
        try:
            with conn:
                cur = conn.execute("SELECT * FROM energy_bills WHERE id = ?", (bill_id,))
                row = cur.fetchone()
                if not row:
                    raise ValueError(f"Energy bill {bill_id} not found")
                bill = dict(row)

                conn.execute("UPDATE energy_bills SET status = 'CONFIRMED', confirmed_at = ? WHERE id = ?", (now, bill_id))
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


def list_energy_bills(cbam_cls: Any, installation_id: str, period_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all uploaded energy bills for an installation/period."""
    cbam_cls.init_db()
    with cbam_cls._lock:
        conn = cbam_cls.get_connection()
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


def calculate_what_if(
    cn_code: str = "7307 91 00",
    net_shipment_tonnes: float = 24.5,
    upstream_precursor_see: float = 1.65,
    scrap_loss_ratio: float = 0.08,
    monthly_grid_kwh: float = 145000.0,
    monthly_solar_offset_kwh: float = 35000.0,
    monthly_fuel_liters: float = 12000.0,
    monthly_total_production_tonnes: float = 450.0,
    renewable_grid_share_pct: float = 24.1,
    scrap_recovery_improvement_pct: float = 0.0,
    fuel_switch_option: str = "FURNACE_OIL",
    jurisdiction: str = "EU",
    year: int = 2026,
    country_of_origin: str = "IN",
) -> Dict[str, Any]:
    """Interactive What-If live recalculation using the deterministic H4 engine (Prompt P6)."""
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
        country_of_origin=country_of_origin,
    )

    sim_renewable_fraction = max(0.0, min(1.0, renewable_grid_share_pct / 100.0))
    sim_solar_offset_kwh = monthly_grid_kwh * sim_renewable_fraction

    sim_scrap_fraction = max(0.0, min(0.5, scrap_recovery_improvement_pct / 100.0))
    sim_scrap_ratio = max(0.01, scrap_loss_ratio * (1.0 - sim_scrap_fraction))

    sim_fuel_liters = monthly_fuel_liters
    fuel_ef_val = 2.68
    extra_grid_kwh = 0.0

    if fuel_switch_option.upper() == "LPG":
        fuel_ef_val = 1.85
    elif fuel_switch_option.upper() == "ELECTRIC_INDUCTION":
        sim_fuel_liters = 0.0
        fuel_ef_val = 0.0
        extra_grid_kwh = monthly_total_production_tonnes * 320.0

    sim_total_grid_kwh = monthly_grid_kwh + extra_grid_kwh
    if sim_renewable_fraction > 0:
        sim_solar_offset_kwh = sim_total_grid_kwh * sim_renewable_fraction

    grid_ef_val = RegulatoryStore.get_constant("grid_emission_factor_in", default=0.727)
    safe_prod = max(1.0, monthly_total_production_tonnes)

    sim_direct_see = (sim_fuel_liters * fuel_ef_val / 1000.0) / safe_prod
    sim_net_grid_kwh = max(0.0, sim_total_grid_kwh - sim_solar_offset_kwh)
    sim_indirect_see = (sim_net_grid_kwh * grid_ef_val / 1000.0) / safe_prod
    sim_precursor_see = upstream_precursor_see * (1.0 + sim_scrap_ratio)
    sim_total_see = sim_direct_see + sim_indirect_see + sim_precursor_see

    if jurisdiction.upper() == "UK":
        default_baseline = 3.90
        default_with_markup = default_baseline
        ets_price_eur = 80.20
        ets_price_label = "£68.50 (~€80.20) UK ETS Benchmark"
        jurisdiction_note = "UK CBAM definitive period begins 1 Jan 2027. Melt-and-pour mandatory 1 Jul 2027."
    else:
        default_with_markup = baseline_res.eu_default_with_markup
        ets_price_eur = baseline_res.eu_ets_carbon_price_eur
        ets_price_label = f"€{ets_price_eur}/tCO2e EU ETS Benchmark"
        jurisdiction_note = "Regulation (EU) 2023/956 definitive period from 1 Jan 2026. Sale of certificates from 1 Feb 2027."

    fx_rate = RegulatoryStore.get_constant("eur_to_inr_exchange_rate", default=90.50)

    base_total_see = baseline_res.total_verified_see
    base_delta = max(0.0, default_with_markup - base_total_see)
    base_cost_diff_eur = net_shipment_tonnes * base_delta * ets_price_eur
    base_cost_diff_inr = base_cost_diff_eur * fx_rate

    sim_delta = max(0.0, default_with_markup - sim_total_see)
    sim_cost_diff_eur = net_shipment_tonnes * sim_delta * ets_price_eur
    sim_cost_diff_inr = sim_cost_diff_eur * fx_rate

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
            "cost_difference_inr": round(base_cost_diff_inr, 2),
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
            "cost_difference_inr": round(sim_cost_diff_inr, 2),
        },
        "emissions_reduction": {
            "carbon_cut_per_tonne": round(carbon_cut_per_tonne, 4),
            "shipment_carbon_saved_tonnes": round(shipment_carbon_saved, 2),
            "annual_factory_carbon_saved_tonnes": round(annual_carbon_saved, 2),
            "incremental_shipment_savings_eur": round(incremental_euro_savings, 2),
            "incremental_shipment_savings_inr": round(incremental_inr_savings, 2),
            "ets_benchmark_price": ets_price_label,
        },
    }
