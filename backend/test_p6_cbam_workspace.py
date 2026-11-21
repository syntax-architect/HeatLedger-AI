"""
HEATLEDGER AI: Prompt P6 Verification Test Suite
CBAM Workspace, Proof-of-Value Comparison & Verifier Audit Memorandum
Specification: Regulation (EU) 2023/956, Implementing Regulation (EU) 2025/2621, and UK CBAM (2027 scope).
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app
from cbam_service import CBAMService

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_clean_workspace():
    CBAMService.init_db()
    CBAMService.seed_default_installation_if_empty()


def test_p6_workspace_data_profile_and_scope():
    """Verifies that workspace-data returns installation profile, products with scope tags, and precursors."""
    resp = client.get("/api/cbam/workspace-data?organization_id=org_howrah_steel_01")
    assert resp.status_code == 200
    data = resp.json()

    # 1. Installation Profile
    inst = data["installation"]
    assert inst["id"] == "IN-WB-4409"
    assert "Howrah Precision Forgings" in inst["name"]
    assert inst["unlocode"] == "IN CCU"
    assert len(inst["process_boundaries"]) >= 5
    assert any("Reheating Furnaces" in p for p in inst["process_boundaries"])
    assert any("Drop Forging Presses" in p for p in inst["process_boundaries"])
    assert len(inst["fuels"]) >= 2
    assert len(inst["electricity_connections"]) >= 2
    assert any("CESC" in c["provider"] or "HT" in c["feed_type"] for c in inst["electricity_connections"])

    # 2. Products by CN code with verified scope status
    products = data["products"]
    assert len(products) >= 4
    cn_map = {p["cn_code"].replace(" ", ""): p for p in products}

    # Flanges 7307 99 10 & 7307 91 00 confirmed in scope
    assert "73079910" in cn_map
    assert cn_map["73079910"]["scope_status"] == "CONFIRMED_IN_SCOPE"
    assert "73079100" in cn_map
    assert cn_map["73079100"]["scope_status"] == "CONFIRMED_IN_SCOPE"

    # Precursor Billets 7207 11 00 confirmed in scope
    assert "72071100" in cn_map
    assert cn_map["72071100"]["scope_status"] == "CONFIRMED_IN_SCOPE"

    # Other articles 7326 90 98 marked unverified/proposed downstream
    assert "73269098" in cn_map
    assert cn_map["73269098"]["scope_status"] == "UNVERIFIED_PROPOSED_SCOPE"
    assert "Proposed" in cn_map["73269098"]["scope_label"]

    # 3. Available Precursor records
    precursors = data["precursors"]
    assert len(precursors) >= 4
    suppliers = [p["supplier_name"] for p in precursors]
    assert any("Tata Steel" in s for s in suppliers)
    assert any("SAIL" in s or "Steel Authority" in s for s in suppliers)

    # 4. Sourced regulatory constants
    assert len(data["regulatory_constants"]) >= 5
    assert data["disclaimer"] == "Estimate for planning. Verified regulatory sources applied."


def test_p6_what_if_recalculation_eu_and_uk():
    """Verifies live What-If recalculations under EU and UK CBAM rules."""
    # EU Mode What-If
    eu_payload = {
        "cn_code": "7307 91 00",
        "net_shipment_tonnes": 24.5,
        "upstream_precursor_see": 1.65,
        "scrap_loss_ratio": 0.08,
        "monthly_grid_kwh": 145000.0,
        "monthly_solar_offset_kwh": 35000.0,
        "monthly_fuel_liters": 12000.0,
        "monthly_total_production_tonnes": 450.0,
        "renewable_grid_share_pct": 50.0,
        "scrap_recovery_improvement_pct": 10.0,
        "fuel_switch_option": "LPG",
        "jurisdiction": "EU",
        "year": 2026
    }
    resp_eu = client.post("/api/cbam/calculate-what-if", json=eu_payload)
    assert resp_eu.status_code == 200
    data_eu = resp_eu.json()

    assert data_eu["disclaimer"] == "Estimate for planning"
    assert data_eu["jurisdiction"] == "EU"
    assert data_eu["baseline"]["total_see"] > data_eu["what_if_simulated"]["simulated_total_see"]
    assert data_eu["emissions_reduction"]["carbon_cut_per_tonne"] > 0
    assert data_eu["emissions_reduction"]["incremental_shipment_savings_eur"] > 0
    assert data_eu["emissions_reduction"]["incremental_shipment_savings_inr"] > 0

    # UK Mode What-If
    uk_payload = {**eu_payload, "jurisdiction": "UK"}
    resp_uk = client.post("/api/cbam/calculate-what-if", json=uk_payload)
    assert resp_uk.status_code == 200
    data_uk = resp_uk.json()

    assert data_uk["jurisdiction"] == "UK"
    assert "UK CBAM" in data_uk["jurisdiction_note"]
    assert "UK ETS" in data_uk["emissions_reduction"]["ets_benchmark_price"]


def test_p6_verifier_summary_pdf_generation():
    """Verifies generation of official A4 Verifier Summary PDF using PyMuPDF."""
    pdf_payload = {
        "invoice_number": "EXP-2026-109",
        "cn_code": "7307 91 00",
        "net_tonnes": 24.5,
        "installation_id": "IN-WB-4409",
        "period_str": "2026-Q1",
        "jurisdiction": "EU",
        "total_see": 2.03,
        "direct_see": 0.07,
        "indirect_see": 0.18,
        "precursor_see": 1.78,
        "default_baseline": 4.20,
        "upstream_mill": "Tata Steel Limited, Jamshedpur Works",
        "heat_number": "TSJ-26-9021",
        "melt_country": "INDIA (IN)",
        "cost_diff_eur": 4008.0,
        "cost_diff_inr": 362724.0
    }
    resp = client.post("/api/cbam/verifier-summary-pdf", json=pdf_payload)
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "Verifier_Summary_EXP-2026-109.pdf" in resp.headers["content-disposition"]
    pdf_bytes = resp.content
    assert len(pdf_bytes) > 2000
    assert pdf_bytes.startswith(b"%PDF-")


def test_p6_cbam_calculations_and_csv_export():
    """Verifies persistent calculation and official CSV export."""
    calc_resp = client.post("/api/cbam/calculate", json={
        "invoice_number": "EXP-2026-P6-TEST",
        "cn_code": "73079100",
        "net_shipment_tonnes": 25.0,
        "upstream_precursor_see": 1.65,
        "scrap_loss_ratio": 0.08,
        "monthly_grid_kwh": 145000.0,
        "monthly_solar_offset_kwh": 35000.0,
        "monthly_fuel_liters": 12000.0,
        "monthly_total_production_tonnes": 450.0,
        "year": 2026,
        "country_of_origin": "IN"
    })
    assert calc_resp.status_code == 200
    calc_data = calc_resp.json()
    assert calc_data["status"] == "SUCCESS"
    calc_id = calc_data["calculation_id"]

    # Retrieve
    get_resp = client.get(f"/api/cbam/calculations/{calc_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["calculation_id"] == calc_id

    # Export CSV
    csv_resp = client.get(f"/api/cbam/calculations/{calc_id}/export-csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    text = csv_resp.text
    assert "HEATLEDGER AI - CBAM CALCULATION DATA SHEET" in text
    assert "EXP-2026-P6-TEST" in text
    assert "Precursor Embedded SEE" in text
    assert "Planning Estimate" in text
