"""
HEATLEDGER AI: Unit Tests for ROI & Proof-of-Value Report Engine (Prompt P8)
Verifies:
1. Metrics derived from measured real events only.
2. Hours saved formula with owner-entered editable baseline.
3. Gate release blocks breakdown.
4. Estimated CBAM cost difference per shipment strictly labelled 'Estimate for planning'.
5. One-page printable executive PDF generation.
6. Shareable link for the owner and board members.
7. Monthly email summary generator.
8. Annual view for renewals & MSME 90% subsidy application grant data.
"""

import pytest
from roi_service import RoiService


@pytest.fixture(autouse=True)
def setup_roi():
    RoiService.init_tables()
    RoiService.update_plant_config("org_howrah_steel_01", 45.0, 550.0)


def test_p8_monthly_roi_report_calculation():
    report = RoiService.get_monthly_report(organization_id="org_howrah_steel_01", month_period="2026-01")

    assert report["organization_id"] == "org_howrah_steel_01"
    assert report["certificates_processed"] == 142
    assert report["measured_review_minutes_per_cert"] == 3.2
    assert report["baseline_minutes_per_cert"] == 45.0

    # Hours saved = (45 - 3.2) * 142 / 60 = 41.8 * 142 / 60 = 98.9 hours
    assert report["hours_saved"] > 90.0
    assert "formula_hours_saved" in report
    assert "45.0m manual baseline" in report["formula_hours_saved"]
    assert "3.2m measured AI review" in report["formula_hours_saved"]
    assert "hours saved" in report["formula_hours_saved"]

    # Financial conversion
    assert report["hours_saved_value_inr"] > 50000.0  # 98.9 * 550
    assert report["estimated_cbam_savings_eur"] == 24680.0
    assert report["estimated_cbam_savings_inr"] == 2233540.0
    assert report["cbam_disclaimer"] == "Estimate for planning"

    # Blocks caught breakdown
    assert report["blocks_caught_count"] == 8
    breakdown = report["blocks_breakdown"]
    assert breakdown.get("MISSING_MELT_POUR_ORIGIN") == 4
    assert breakdown.get("CARBON_EQUIVALENT_CEV_EXCEEDED") == 2

    # ROI multiple against monthly subscription
    assert report["roi_multiple"] > 10.0


def test_p8_update_plant_baseline_config():
    # Owner customizes manual baseline to 60 minutes and ₹750/hr
    res = RoiService.update_plant_config(
        organization_id="org_howrah_steel_01",
        manual_baseline_minutes=60.0,
        qa_hourly_rate_inr=750.0
    )
    assert res["status"] == "success"

    # Verify report reflects customized baseline
    report = RoiService.get_monthly_report(organization_id="org_howrah_steel_01", month_period="2026-01")
    assert report["baseline_minutes_per_cert"] == 60.0
    assert report["qa_hourly_rate_inr"] == 750.0

    # Restore default
    RoiService.update_plant_config("org_howrah_steel_01", 45.0, 550.0)


def test_p8_annual_view_and_msme_subsidy_data():
    annual = RoiService.get_annual_view(organization_id="org_howrah_steel_01", year=2026)
    assert annual["year"] == 2026
    assert annual["total_certificates_processed"] >= 142
    assert annual["total_hours_saved"] > 90.0

    msme = annual["msme_subsidy_application_data"]
    assert msme["enterprise_category"].startswith("Medium")
    assert "90% Scheme" in msme["subsidized_software_scheme"]
    assert msme["claimable_subsidy_amount_inr"] == 107989.2
    assert len(msme["compliance_accreditations"]) == 3


def test_p8_pdf_one_page_report_generation():
    report = RoiService.get_monthly_report("org_howrah_steel_01", "2026-01")
    pdf_bytes = RoiService.generate_pdf_report(report)

    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF")

    import pymupdf as fitz
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert len(doc) == 1  # Strictly one-page executive memorandum
    text = doc[0].get_text()
    assert "EXECUTIVE PROOF-OF-VALUE AUDIT" in text
    assert "HOURS SAVED" in text
    assert "SHIPMENTS PROTECTED" in text
    assert "MANDATORY PLANNING DISCLAIMER" in text
    assert "Managing Director Signature" in text


def test_p8_shareable_link_and_public_access():
    link = RoiService.create_share_link("org_howrah_steel_01", "2026-01", "P. K. Banerjee")
    token = link["token"]
    assert token.startswith("roi_")

    public_rep = RoiService.get_public_report_by_token(token)
    assert public_rep is not None
    assert public_rep["plant_name"] == "Howrah Precision Forgings Pvt. Ltd. (Plant 1)"
    assert public_rep["hours_saved"] > 90.0


def test_p8_monthly_email_digest_generation():
    report = RoiService.get_monthly_report("org_howrah_steel_01", "2026-01")
    digest = RoiService.generate_email_digest(report)

    assert "Monthly ROI & Value Digest" in digest["subject"]
    assert "Key Measured Results" in digest["plain"]
    assert "Exact Formula:" in digest["plain"]
    assert "font-family" in digest["html"]
    assert "Hours Saved" in digest["html"]


def test_p8_api_endpoints():
    from fastapi.testclient import TestClient
    from main import app
    from auth_service import AuthService

    client = TestClient(app)
    owner_token = AuthService.create_jwt({
        "sub": "usr_owner_01",
        "user_id": "usr_owner_01",
        "name": "P. K. Banerjee",
        "role": "OWNER",
        "org_id": "org_howrah_steel_01",
        "organization_id": "org_howrah_steel_01"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Monthly Report
    r_rep = client.get("/api/roi/monthly-report?month_period=2026-01", headers=headers)
    assert r_rep.status_code == 200
    rep_data = r_rep.json()
    assert rep_data["certificates_processed"] == 142
    assert rep_data["hours_saved"] > 90.0

    # 2. Config Update
    r_cfg = client.post("/api/roi/config", json={
        "manual_baseline_minutes": 50.0,
        "qa_hourly_rate_inr": 600.0
    }, headers=headers)
    assert r_cfg.status_code == 200
    assert r_cfg.json()["status"] == "success"

    # Reset config
    client.post("/api/roi/config", json={
        "manual_baseline_minutes": 45.0,
        "qa_hourly_rate_inr": 550.0
    }, headers=headers)

    # 3. Share link
    r_share = client.post("/api/roi/share-link", json={"month_period": "2026-01"}, headers=headers)
    assert r_share.status_code == 200
    token = r_share.json()["token"]

    # 4. Public access
    r_pub = client.get(f"/api/roi/public/{token}")
    assert r_pub.status_code == 200
    assert r_pub.json()["organization_id"] == "org_howrah_steel_01"

    # 5. Annual view & MSME
    r_ann = client.get("/api/roi/annual-view?year=2026", headers=headers)
    assert r_ann.status_code == 200
    ann_data = r_ann.json()
    assert "msme_subsidy_application_data" in ann_data
    assert ann_data["msme_subsidy_application_data"]["claimable_subsidy_amount_inr"] > 100000

    # 6. PDF Report
    r_pdf = client.post("/api/roi/pdf-report", json={"month_period": "2026-01"}, headers=headers)
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    assert len(r_pdf.content) > 5000

    # 7. Email Digest
    r_email = client.get("/api/roi/email-digest?month_period=2026-01", headers=headers)
    assert r_email.status_code == 200
    assert "Monthly ROI & Value Digest" in r_email.json()["subject"]


def test_p8_api_endpoints_full_cycle():
    from fastapi.testclient import TestClient
    from main import app
    from auth_service import AuthService

    client = TestClient(app)
    owner_token = AuthService.create_jwt({
        "sub": "usr_owner_01",
        "user_id": "usr_owner_01",
        "role": "OWNER",
        "org_id": "org_howrah_steel_01",
        "organization_id": "org_howrah_steel_01"
    })
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Monthly ROI report
    r_rep = client.get("/api/roi/monthly-report?month_period=2026-01", headers=headers)
    assert r_rep.status_code == 200
    rep_data = r_rep.json()
    assert rep_data["organization_id"] == "org_howrah_steel_01"
    assert rep_data["certificates_processed"] == 142
    assert rep_data["hours_saved"] > 90.0

    # 2. Update baseline config
    r_cfg = client.post("/api/roi/config", json={
        "manual_baseline_minutes": 50.0,
        "qa_hourly_rate_inr": 600.0
    }, headers=headers)
    assert r_cfg.status_code == 200
    assert r_cfg.json()["status"] == "success"

    # Verify query reflects new config
    r_rep_updated = client.get("/api/roi/monthly-report?month_period=2026-01", headers=headers)
    assert r_rep_updated.json()["baseline_minutes_per_cert"] == 50.0

    # 3. Create share link
    r_share = client.post("/api/roi/share-link", json={"month_period": "2026-01"}, headers=headers)
    assert r_share.status_code == 200
    token = r_share.json()["token"]
    assert token.startswith("roi_")

    # 4. Public endpoint without token in auth header
    r_pub = client.get(f"/api/roi/public/{token}")
    assert r_pub.status_code == 200
    assert r_pub.json()["organization_id"] == "org_howrah_steel_01"

    # Nonexistent token
    r_404 = client.get("/api/roi/public/roi_nonexistent999")
    assert r_404.status_code == 404

    # 5. Annual view & MSME subsidy
    r_ann = client.get("/api/roi/annual-view?year=2026", headers=headers)
    assert r_ann.status_code == 200
    ann_data = r_ann.json()
    assert ann_data["year"] == 2026
    assert ann_data["msme_subsidy_application_data"]["claimable_subsidy_amount_inr"] > 100000

    # 6. PDF report export
    r_pdf = client.post("/api/roi/pdf-report", json={
        "month_period": "2026-01",
        "custom_baseline_minutes": 45.0,
        "custom_hourly_rate": 550.0
    }, headers=headers)
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    assert len(r_pdf.content) > 5000

    # 7. Email digest preview
    r_email = client.get("/api/roi/email-digest?month_period=2026-01", headers=headers)
    assert r_email.status_code == 200
    assert "Monthly ROI & Value Digest" in r_email.json()["subject"]

