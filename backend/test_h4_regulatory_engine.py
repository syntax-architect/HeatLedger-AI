"""
HEATLEDGER AI: Prompt H4 Regulatory Constants & Compliance Engine Test Suite
Specification: Sourced dated regulatory tables, versioned default values,
commission worked examples, missing data defenses, calculation trace generation,
Pint unit computations, and zero hardcoded numbers.
"""

import os
import sqlite3

import pytest
from fastapi.testclient import TestClient

os.environ["TRUST_PROXY"] = "true"
from compliance_engine import ComplianceEngine
from main import app
from regulatory_store import RegulatoryStore

client = TestClient(app)


def test_h4_1_commission_worked_example_and_deterministic_math():
    """
    Commission Guidance Worked Example:
    Installation producing forged steel pipe fittings (CN 7307) in India:
    - Monthly fuel: 12,000 Liters furnace oil (factor 2.68 kg CO2e/L)
    - Monthly production: 450 MT
    - Monthly net grid: 110,000 kWh (145,000 - 35,000 solar) (factor 0.727 tCO2e/MWh)
    - Precursor: 1.65 tCO2e/t with 8% scrap loss (factor 1.08)
    - Year: 2026 (10% markup)
    - CN 7307 India baseline: 3.82 tCO2e/t
    - Published ETS price: 75.36 EUR/tCO2e
    - Shipment: 24.5 MT
    """
    res = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-2026-H4-01",
        cn_code="7307",
        country_of_origin="IN",
        net_shipment_tonnes=24.5,
        upstream_precursor_see=1.65,
        scrap_loss_ratio=0.08,
        monthly_grid_kwh=145000,
        monthly_solar_offset_kwh=35000,
        monthly_fuel_liters=12000,
        monthly_total_production_tonnes=450,
        year=2026,
        eu_ets_price=75.36,
        inr_per_eur=90.50
    )

    assert res.status == "success"
    # Direct SEE = (12000 * 2.68 / 1000) / 450 = 32.16 / 450 = 0.0715 tCO2e/t
    assert pytest.approx(res.plant_direct_fuel_see, 0.001) == 0.0715
    # Indirect SEE = (110000 * 0.727 / 1000) / 450 = 79.97 / 450 = 0.1777 tCO2e/t
    assert pytest.approx(res.plant_indirect_power_see, 0.001) == 0.1777
    # Precursor SEE = 1.65 * 1.08 = 1.7820 tCO2e/t
    assert pytest.approx(res.precursor_embedded_see, 0.001) == 1.7820
    # Total Verified SEE = 0.0715 + 0.1777 + 1.7820 = 2.0311
    assert pytest.approx(res.total_verified_see, 0.002) == 2.0311

    # Baseline for CN 7307 India = 3.82 tCO2e/t
    assert res.eu_default_baseline == 3.82
    # 2026 Markup = 10%
    assert res.default_markup_pct == 10.0
    # Baseline with markup = 3.82 * 1.10 = 4.202 tCO2e/t
    assert pytest.approx(res.eu_default_with_markup, 0.001) == 4.2020

    # SEE delta = 4.2020 - 2.0311 = 2.1709 tCO2e/t
    assert pytest.approx(res.see_avoided_per_tonne, 0.002) == 2.1709
    # Carbon difference = 24.5 * 2.1709 = 53.19 tCO2e
    assert pytest.approx(res.total_carbon_avoided_tonnes, 0.05) == 53.19
    # Estimated cost difference EUR = 53.19 * 75.36 = ~4008 EUR
    assert pytest.approx(res.estimated_cost_difference_eur, 5.0) == 4008.0
    # Terminology check
    assert res.disclaimer == "Estimate for planning"


def test_h4_2_missing_precursor_data_returns_insufficient_data():
    """Prompt H4 requirement: If precursor data is missing, returns 'insufficient_data' instead of guessing."""
    res_none = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-2026-MISSING-01",
        cn_code="7307",
        net_shipment_tonnes=20.0,
        upstream_precursor_see=None,  # MISSING
        monthly_total_production_tonnes=300
    )
    assert res_none.status == "insufficient_data"
    assert "upstream_precursor_see" in res_none.missing_fields
    assert "insufficient data" in res_none.disclaimer.lower()

    # Zero production tonnage also triggers insufficient data guard
    res_zero_prod = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-2026-MISSING-02",
        cn_code="7307",
        net_shipment_tonnes=20.0,
        upstream_precursor_see=1.85,
        monthly_total_production_tonnes=0.0  # Invalid / missing
    )
    assert res_zero_prod.status == "insufficient_data"
    assert "monthly_total_production_tonnes" in res_zero_prod.missing_fields


def test_h4_3_mechanical_checks_return_missing_never_zero():
    """Prompt H4 requirement: Missing mechanical properties must return 'MISSING', never 0.0 or default PASS."""
    # ASTM A105 requires Tensile Strength and Yield Strength
    chem = {"C": 0.22, "Mn": 0.88, "Si": 0.25, "P": 0.015, "S": 0.010}
    standard_chem = {"C": {"min": 0.0, "max": 0.35}, "CEV": {"max": 0.47}}
    standard_mech = {
        "tensile_strength_mpa": {"min": 485.0, "max": 9999.0},
        "yield_strength_mpa": {"min": 250.0, "max": 9999.0}
    }

    # Certificate has NO mechanical readings provided
    extracted_mech_empty = {}

    report = ComplianceEngine.validate_metallurgy(
        extracted_chemistry=chem,
        extracted_mechanical=extracted_mech_empty,
        standard_chem_limits=standard_chem,
        standard_mech_limits=standard_mech,
        standard_code="ASTM A105",
        country_of_melt="GERMANY",
        country_of_melt_explicit=True
    )

    assert report.is_fully_compliant is False
    # Check mechanical rows
    for m in report.mechanical_checks:
        assert m["status"] == "MISSING"
        assert m["measured"] == "MISSING"
        assert m["measured"] != 0.0

    # Country of melt is Germany -> VERIFIED_GERMANY, not VERIFIED_INDIA
    assert report.country_of_melt_pour_status == "VERIFIED_GERMANY"


def test_h4_4_country_of_melt_never_defaults_to_india():
    """Prompt H4 requirement: Country of melt must come from confirmed field, never defaulted."""
    chem = {"C": 0.20}
    # Case 1: Unconfirmed / missing
    rep_missing = ComplianceEngine.validate_metallurgy(
        extracted_chemistry=chem,
        extracted_mechanical={},
        standard_chem_limits={},
        standard_mech_limits={},
        country_of_melt=None,
        country_of_melt_explicit=False
    )
    assert rep_missing.country_of_melt_pour_status == "DEFECT_MISSING_EXPLICIT_COUNTRY"
    assert "WARNING: Country of Melt and Pour not explicitly attested" in rep_missing.audit_notes[0]

    # Case 2: Explicit Japan
    rep_japan = ComplianceEngine.validate_metallurgy(
        extracted_chemistry=chem,
        extracted_mechanical={},
        standard_chem_limits={},
        standard_mech_limits={},
        country_of_melt="JAPAN",
        country_of_melt_explicit=True
    )
    assert rep_japan.country_of_melt_pour_status == "VERIFIED_JAPAN"


def test_h4_5_markup_schedule_by_reporting_year():
    """
    Implementing Regulation (EU) 2025/2621 markup schedule:
    - 2026: 10%
    - 2027: 20%
    - 2028: 30%
    """
    for year, expected_markup in [(2026, 10.0), (2027, 20.0), (2028, 30.0)]:
        res = ComplianceEngine.calculate_cbam_emissions(
            invoice_number=f"EXP-{year}-TEST",
            cn_code="7208",
            country_of_origin="IN",
            net_shipment_tonnes=100.0,
            upstream_precursor_see=2.0,
            monthly_total_production_tonnes=1000,
            year=year
        )
        assert res.default_markup_pct == expected_markup
        # Base for CN 7208 IN is 4.28
        assert res.eu_default_baseline == 4.28
        assert pytest.approx(res.eu_default_with_markup, 0.001) == 4.28 * (1.0 + expected_markup / 100.0)


def test_h4_6_calculation_trace_structure_and_transparency():
    """Prompt H4 requirement: Return calculation trace for every result for 'How this was calculated' drawer."""
    res = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-TRACE-2026",
        cn_code="7318",  # Fasteners
        country_of_origin="IN",
        net_shipment_tonnes=10.0,
        upstream_precursor_see=1.90,
        scrap_loss_ratio=0.05,
        monthly_grid_kwh=50000,
        monthly_solar_offset_kwh=10000,
        monthly_fuel_liters=4000,
        monthly_total_production_tonnes=200,
        year=2026
    )

    trace = res.calculation_trace
    assert trace["constants_version"] == "REG-2026-Q1-V1"
    assert "timestamp" in trace
    assert "Estimate for planning" in trace["disclaimer"]

    # Verify inputs are preserved
    assert trace["inputs_used"]["cn_code"] == "7318"
    assert trace["inputs_used"]["net_shipment_tonnes"] == 10.0

    # Verify sourced constants
    constants = trace["constants_applied"]
    assert constants["fuel_emission_factor"]["value"] == 2.68
    assert constants["grid_emission_factor"]["value"] == 0.727
    assert constants["cbam_certificate_price"]["value"] == 75.36
    assert constants["exchange_rate"]["value"] == 90.50

    # Verify steps
    steps = trace["steps"]
    step_ids = [s["step_id"] for s in steps]
    assert "DIRECT_EMISSIONS" in step_ids
    assert "INDIRECT_EMISSIONS" in step_ids
    assert "PRECURSOR_EMISSIONS" in step_ids
    assert "TOTAL_VERIFIED_SEE" in step_ids
    assert "DEFAULT_COMPARISON" in step_ids
    assert "ESTIMATED_COST_DIFFERENCE" in step_ids


def test_h4_7_constants_versioning_and_reproducibility():
    """
    Prompt H4 requirement: Test that changing a constant version changes the result
    and records which version was used.
    """
    # 1. Calculation with default version v1
    res_v1 = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-VER-01",
        cn_code="7208",
        country_of_origin="IN",
        net_shipment_tonnes=50.0,
        upstream_precursor_see=1.80,
        monthly_total_production_tonnes=500,
        constants_version="REG-2026-Q1-V1"
    )
    assert res_v1.constants_version == "REG-2026-Q1-V1"
    assert res_v1.eu_default_baseline == 4.28

    # 2. Insert new constants version v2 into database
    RegulatoryStore.init_tables()
    with sqlite3.connect(RegulatoryStore.DB_PATH) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO cbam_default_values
            (cn_code, country, base_value, unit, source, version)
            VALUES ('7208', 'IN', 4.50, 'tCO2e/t', 'Commission 2026 Q3 Revised Table', 'REG-2026-Q3-V2')
        """)
        conn.commit()

    # 3. Calculation with new version v2
    res_v2 = ComplianceEngine.calculate_cbam_emissions(
        invoice_number="EXP-VER-02",
        cn_code="7208",
        country_of_origin="IN",
        net_shipment_tonnes=50.0,
        upstream_precursor_see=1.80,
        monthly_total_production_tonnes=500,
        constants_version="REG-2026-Q3-V2"
    )
    assert res_v2.constants_version == "REG-2026-Q3-V2"
    assert res_v2.eu_default_baseline == 4.50
    assert res_v2.eu_default_with_markup == 4.50 * 1.10

    # Old calculation remains untouched and reproducible
    assert res_v1.eu_default_baseline == 4.28


def test_h4_8_grep_check_no_hardcoded_regulatory_constants():
    """Prompt H4 requirement: No regulatory numbers (like hardcoded 2.98) appear in business logic code."""
    engine_file = os.path.join(os.path.dirname(__file__), "compliance_engine.py")
    with open(engine_file, "r", encoding="utf-8") as f:
        code = f.read()

    # Must NOT have hardcoded 2.98 in compliance_engine.py
    assert "2.98" not in code, "Violation: hardcoded 2.98 found in compliance_engine.py"
    # Must NOT have hardcoded 'WORKS: LILUAH' in compliance_engine.py
    assert "WORKS: LILUAH" not in code


def test_h4_9_regulatory_constants_and_defaults_endpoints():
    """Verify GET endpoints for constants and default values."""
    res_const = client.get("/api/compliance/regulatory-constants", headers={"X-Forwarded-For": "10.0.4.1"})
    assert res_const.status_code == 200
    constants = res_const.json()
    keys = [c["key"] for c in constants]
    assert "cbam_certificate_price_eur_2026_q1" in keys
    assert "cbam_markup_pct_2026" in keys
    assert "grid_emission_factor_in" in keys

    res_defs = client.get("/api/compliance/default-values?version=REG-2026-Q1-V1", headers={"X-Forwarded-For": "10.0.4.2"})
    assert res_defs.status_code == 200
    defaults = res_defs.json()
    assert len(defaults) >= 14
    cn7208 = next((d for d in defaults if d["cn_code"] == "7208" and d["country"] == "IN" and d["version"] == "REG-2026-Q1-V1"), None)
    assert cn7208 is not None
    assert cn7208["base_value"] == 4.28


def test_h4_10_xml_export_renamed_to_draft_data_sheet():
    """Prompt H4 requirement: Rename the XML export to 'CBAM data sheet (draft)', never claiming official schema."""
    payload = {
        "installation_id": "IN-WB-4409",
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "unlocode": "IN CCU",
        "latitude": 22.6105,
        "longitude": 88.3421,
        "cn_code": "73079100",
        "net_tonnes": 24.5,
        "total_see": 2.03,
        "direct_see": 0.07,
        "indirect_see": 0.18,
        "precursor_see": 1.78,
        "heat_number": "TSJ-26-9021",
        "melt_country": "IN"
    }

    res = client.post("/api/dossier/generate-xml", json=payload, headers={"X-Forwarded-For": "10.0.4.3"})
    assert res.status_code == 200
    xml_text = res.text
    # Labeled draft data sheet
    assert "CbamDataSheetDraft" in xml_text
    assert 'description="CBAM data sheet (draft)"' in xml_text
    assert 'status="DRAFT"' in xml_text
    # Does NOT claim to be official schema
    assert "urn:eu:cbam:registry:v1" not in xml_text
