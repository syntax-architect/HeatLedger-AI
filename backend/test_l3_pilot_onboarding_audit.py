"""
HEATLEDGER AI: Prompt L3 Automated Test Suite
Specification: Phase 5 (Launch) - Prompt L3 (Pilot Onboarding Kit & 1-Shipment Audit)

Verifies:
1. Free 1-Shipment Audit execution (POST /api/pilot/audit/run).
2. Country of Melt & Pour detection and critical gap flagging (EU Reg 2026/1963).
3. Chemical composition out-of-spec detection (C, Mn, P, S).
4. Traceability & mass-balance weight delta analysis.
5. CBAM cost difference calculation (EU Default 3.135 vs Actual 1.850 tCO2e/t).
6. 1-Page vector PDF findings report generation with required statutory disclaimers.
7. Public capability share link (GET /api/share/audit/{token} & report.pdf).
8. Pilot Tracker pipeline management (GET /api/pilot/tracker & POST /api/pilot/tracker/update).
9. 4-Stage onboarding email sequence templates (GET /api/pilot/email-sequence).
10. Documentation verification: docs/PILOT_KIT.md, docs/PILOT_EMAIL_TEMPLATES.md, docs/PILOT_AGREEMENT.md.
"""

import os
import fitz
import pytest
from starlette.testclient import TestClient

from main import app
from roi_service import RoiService

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def test_client():
    return TestClient(app)


def test_l3_01_free_one_shipment_audit_execution(test_client):
    """Executes 1-shipment compliance audit and verifies statutory evaluations."""
    payload = {
        "exporter_name": "Bengal Precision Castings Ltd.",
        "plant_name": "Howrah Foundry Works",
        "invoice_number": "EXP-2026-BPC-44",
        "destination_country": "Germany (DE)",
        "cn_code": "730799",
        "weight_mt": 30.0,
        "certificates": [
            {
                "heat_number": "HT-BEN-101",
                "grade": "316L Stainless Steel",
                "melt_and_pour_country": "India",
                "chemistry": {"C": 0.025, "Mn": 1.40, "Si": 0.45, "P": 0.025, "S": 0.010},
                "has_signature": True,
                "allocated_weight_mt": 18.0
            },
            {
                "heat_number": "HT-SUPP-902",
                "grade": "S355JR Carbon Steel",
                "melt_and_pour_country": None,  # Missing origin
                "chemistry": {"C": 0.28, "Mn": 1.30, "Si": 0.20, "P": 0.042, "S": 0.015},  # C & P high
                "has_signature": False,
                "allocated_weight_mt": 12.0
            }
        ]
    }

    res = test_client.post("/api/pilot/audit/run", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["audit_id"].startswith("aud_")
    assert data["share_token"] is not None
    assert data["melt_pour_status"] == "CRITICAL_GAP"
    assert "HT-SUPP-902" in data["missing_melt_pour_heats"]
    assert len(data["chemistry_flags"]) >= 1
    assert data["overall_status"] == "BLOCKED_GAPS_IDENTIFIED"


def test_l3_02_chemistry_out_of_spec_detection(test_client):
    """Verifies that chemistry constituent deviations are identified and flagged."""
    payload = {
        "exporter_name": "Test Mill",
        "invoice_number": "INV-CHEM-01",
        "weight_mt": 10.0,
        "certificates": [
            {
                "heat_number": "HEAT-HIGH-C",
                "grade": "316L Stainless Steel",
                "melt_and_pour_country": "India",
                "chemistry": {"C": 0.045, "Mn": 1.2, "P": 0.02},  # 316L max is 0.030%
                "has_signature": True,
                "allocated_weight_mt": 10.0
            }
        ]
    }
    res = test_client.post("/api/pilot/audit/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert any("Carbon 0.045% exceeds 316L maximum" in flag for flag in data["chemistry_flags"])


def test_l3_03_cost_difference_calculation(test_client):
    """Validates CBAM financial cost difference logic."""
    payload = {
        "exporter_name": "Test Exporter",
        "invoice_number": "INV-COST-01",
        "weight_mt": 20.0
    }
    res = test_client.post("/api/pilot/audit/run", json=payload)
    assert res.status_code == 200
    cost_diff = res.json()["cost_difference"]

    # Declared weight: 20 MT
    # Excess emissions per MT = 3.135 - 1.850 = 1.285 tCO2e/MT
    # Total excess = 20 * 1.285 = 25.7 tCO2e
    # Exposure at ₹7,200/t = 25.7 * 7200 = ₹185,040
    assert cost_diff["declared_weight_mt"] == 20.0
    assert cost_diff["excess_emissions_tco2e"] == 25.7
    assert cost_diff["estimated_cost_difference_inr"] == 185040
    assert "Declared Tonnage" in cost_diff["formula"]


def test_l3_04_one_page_vector_pdf_findings_report(test_client):
    """Verifies 1-page vector PDF findings report generation with required watermarks and layout."""
    # First generate an audit
    res_run = test_client.post("/api/pilot/audit/run", json={"exporter_name": "Howrah Heavy Works"})
    audit_id = res_run.json()["audit_id"]

    # Request PDF
    pdf_res = test_client.get(f"/api/pilot/audit/{audit_id}/report.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # Parse with PyMuPDF
    doc = fitz.open(stream=pdf_res.content, filetype="pdf")
    assert len(doc) == 1, "Audit findings report must be strictly 1 page"

    page_text = doc[0].get_text()
    assert "HEATLEDGER AI" in page_text
    assert "1-SHIPMENT COMPLIANCE AUDIT" in page_text
    assert "NOT LEGAL ADVICE" in page_text
    assert "Estimated CBAM Financial Impact" in page_text
    doc.close()


def test_l3_05_capability_share_link(test_client):
    """Verifies public capability share link accesses audit findings without authentication."""
    res_run = test_client.post("/api/pilot/audit/run", json={"exporter_name": "Public Share Plant"})
    share_token = res_run.json()["share_token"]

    # Public read JSON
    share_res = test_client.get(f"/api/share/audit/{share_token}")
    assert share_res.status_code == 200
    assert share_res.json()["exporter_name"] == "Public Share Plant"

    # Public read PDF
    pdf_res = test_client.get(f"/api/share/audit/{share_token}/report.pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"


def test_l3_06_pilot_tracker_pipeline(test_client):
    """Verifies pilot tracker stages, hour savings, and payment status tracking."""
    res = test_client.get("/api/pilot/tracker")
    assert res.status_code == 200
    plants = res.json()["plants"]
    assert len(plants) >= 3

    # Update plant stage
    update_payload = {
        "plant_id": plants[0]["id"],
        "updates": {
            "stage": "CONVERTED_MONTHLY",
            "payment_status": "CONVERTED",
            "hours_saved": 28.5
        }
    }
    up_res = test_client.post("/api/pilot/tracker/update", json=update_payload)
    assert up_res.status_code == 200
    updated = up_res.json()
    assert updated["stage"] == "CONVERTED_MONTHLY"
    assert updated["payment_status"] == "CONVERTED"
    assert updated["hours_saved"] == 28.5


def test_l3_07_email_sequence_templates(test_client):
    """Validates 4-stage onboarding sequence (Day 0, 2, 7, 14) and token interpolation."""
    res = test_client.get("/api/pilot/email-sequence")
    assert res.status_code == 200
    tpls = res.json()["templates"]

    assert "day_0" in tpls
    assert "day_2" in tpls
    assert "day_7" in tpls
    assert "day_14" in tpls

    # Verify interpolation
    rendered = RoiService.render_email_template("day_0", {
        "contact_name": "Mr. S. K. Roy",
        "plant_name": "Howrah Foundry"
    })
    assert "Dear Mr. S. K. Roy" in rendered["body"]
    assert "EU Regulation 2026/1963" in rendered["body"]


def test_l3_08_pilot_documentation_and_agreements():
    """Confirms pilot agreement, email sequence, and pilot kit docs exist with lawyer notices."""
    kit_path = os.path.join(REPO_ROOT, "docs", "PILOT_KIT.md")
    email_path = os.path.join(REPO_ROOT, "docs", "PILOT_EMAIL_TEMPLATES.md")
    agreement_path = os.path.join(REPO_ROOT, "docs", "PILOT_AGREEMENT.md")

    assert os.path.exists(kit_path), "Missing docs/PILOT_KIT.md"
    assert os.path.exists(email_path), "Missing docs/PILOT_EMAIL_TEMPLATES.md"
    assert os.path.exists(agreement_path), "Missing docs/PILOT_AGREEMENT.md"

    with open(agreement_path, "r", encoding="utf-8") as f:
        text = f.read()
    assert "FOR LAWYER REVIEW" in text
    assert "NOT LEGAL ADVICE" in text
    assert "₹25,000" in text
