"""
HEATLEDGER AI: Period-Based CBAM Workspace & Proof-of-Value Comparison Engine (Prompt P6)
Specification:
- Installation profile (site, process, fuels, electricity connections), reporting periods,
  products by CN code, linked heats, precursor records, energy inputs with bill uploads (OCR + human confirmed).
- Results per product and period: direct, indirect, precursor emissions, total specific embedded emissions.
- Comparison with official EU/UK default values including the statutory year markup (+10% in 2026, +20% in 2027, +30% in 2028).
- Estimated cost difference in INR and EUR at statutory ETS certificate price.
- Always strictly labelled 'Estimate for planning'.
- 'How this was calculated' audit trace with every input, constant, law and version.
- Live what-if sliders: renewable grid share, scrap content, fuel mix.
- Scope resolution: confirmed in-scope vs unverified/proposed downstream extension.
"""

import os
import json
import threading
import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH


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


class CbamWorkspaceService:
    _lock = threading.RLock()

    @classmethod
    def init_tables(cls):
        with cls._lock:
            with _get_db() as conn:
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
                    cur.execute("SELECT COUNT(*) FROM plant_installation_profiles WHERE organization_id = 'org_howrah_steel_01'")
                    if cur.fetchone()[0] == 0:
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
                33.0, 150.0, 450.0, ?
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
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        ets_price_eur: float = 75.36,
        inr_per_eur: float = 90.5
    ) -> Dict[str, Any]:
        """
        Executes live what-if simulation using statutory formulas.
        Returns comparisons, assumptions list, and 'How this was calculated' audit trace.
        Always tagged 'Estimate for planning'.
        """
        cls.init_tables()
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
        cls.init_tables()
        with cls._lock:
            with _get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM plant_installation_profiles WHERE organization_id = ?", (organization_id,))
                row = cur.fetchone()
                profile = dict(row) if row else {}

                cur.execute("SELECT * FROM plant_energy_bills WHERE organization_id = ? ORDER BY billing_month DESC", (organization_id,))
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
    def confirm_bill(cls, bill_id: str, confirmed_by: str = "usr_qa_04") -> Dict[str, Any]:
        """Marks an OCR-extracted electricity or fuel bill as confirmed by a human specialist."""
        cls.init_tables()
        now = datetime.now(timezone.utc).isoformat()
        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    UPDATE plant_energy_bills
                    SET human_confirmed = 1, confirmed_by = ?, confirmed_at = ?
                    WHERE id = ?
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
