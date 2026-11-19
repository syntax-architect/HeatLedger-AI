"""
Unit tests for Prompt P10: Consultant & Multi-Plant Mode (backend/consultant_service.py)
Tests multi-plant portfolio aggregation, strict RLS isolation, plant-owned access revocation,
white-label branding with mandatory verification footer, CSV bulk onboarding, and consolidated invoicing.
"""

import pytest
import uuid
try:
    from consultant_service import ConsultantService, init_consultant_db
except ImportError:
    from backend.consultant_service import ConsultantService, init_consultant_db


@pytest.fixture(scope="module")
def consultant_svc():
    init_consultant_db()
    return ConsultantService()


def test_p10_consultant_portfolio_overview(consultant_svc):
    c_org = "org_consultant_singhania"
    portfolio = consultant_svc.get_consultant_portfolio(c_org)

    assert portfolio["consultant_org_id"] == c_org
    assert portfolio["firm_name"] == "Singhania & Partners Global Trade Advisory"
    assert portfolio["total_clients"] >= 3
    assert portfolio["active_clients"] >= 3
    assert portfolio["monitored_tonnage_mt"] > 0
    assert portfolio["monthly_retainer_inr"] >= 29997.0
    assert len(portfolio["client_plants"]) >= 3


def test_p10_cross_client_at_risk_aggregation(consultant_svc):
    c_org = "org_consultant_singhania"
    at_risk = consultant_svc.get_cross_client_at_risk_shipments(c_org)

    assert len(at_risk) >= 2
    # Check that at-risk items contain plant_name, entity_identifier, block_reasons, cbam_due_date
    item = at_risk[0]
    assert "plant_name" in item
    assert "entity_identifier" in item
    assert "block_reasons" in item
    assert isinstance(item["block_reasons"], list)
    assert len(item["block_reasons"]) > 0
    assert "cbam_due_date" in item


def test_p10_cross_client_review_queue(consultant_svc):
    c_org = "org_consultant_singhania"
    queue = consultant_svc.get_cross_client_review_queue(c_org)

    assert len(queue) >= 2
    for q in queue:
        assert q["plant_id"].startswith("PLANT-")
        assert "entity_identifier" in q


def test_p10_rls_strict_access_control(consultant_svc):
    c_org = "org_consultant_singhania"

    # 1. Authorized plant access succeeds
    grant = consultant_svc.check_consultant_access(c_org, "PLANT-HOWRAH-01")
    assert grant["status"] == "ACTIVE"

    # 2. Unauthorized plant access is strictly forbidden
    with pytest.raises(PermissionError) as exc_info:
        consultant_svc.check_consultant_access(c_org, "PLANT-UNAUTHORIZED-SECRET-099")
    assert "Access Denied" in str(exc_info.value)

    # 3. Filtering at-risk shipments by unauthorized plant raises PermissionError
    with pytest.raises(PermissionError):
        consultant_svc.get_cross_client_at_risk_shipments(c_org, plant_id_filter="PLANT-UNAUTHORIZED-SECRET-099")


def test_p10_plant_owner_revocation_lifecycle(consultant_svc):
    c_org = "org_consultant_singhania"
    test_plant_id = f"PLANT-REVOKE-TEST-{uuid.uuid4().hex[:6]}"

    # Step 1: Invite/grant access to test plant
    consultant_svc.invite_or_grant_client_access(
        consultant_org_id=c_org,
        plant_id=test_plant_id,
        plant_name="Revocation Test Steel Works",
        plant_code="REV-01",
        gst_or_pan="19AABCR1234F1Z1",
        location="Asansol, West Bengal",
        duration_days=30,
        acting_user_id="usr_plant_owner",
    )

    # Access is active
    grant = consultant_svc.check_consultant_access(c_org, test_plant_id)
    assert grant["status"] == "ACTIVE"

    # Step 2: Plant owner exercises data sovereignty and revokes access
    revoke_res = consultant_svc.revoke_client_access(
        plant_id=test_plant_id,
        consultant_org_id=c_org,
        acting_user_id="usr_plant_owner",
    )
    assert revoke_res["success"] is True
    assert revoke_res["status"] == "REVOKED"

    # Step 3: Immediate RLS check must now reject queries
    with pytest.raises(PermissionError) as exc_info:
        consultant_svc.check_consultant_access(c_org, test_plant_id)
    assert "Access Revoked" in str(exc_info.value)


def test_p10_white_label_branding_and_immutable_footer(consultant_svc):
    c_org = "org_consultant_singhania"

    # Update white-label settings
    new_cfg = consultant_svc.update_white_label_config(
        c_org,
        {
            "firm_name": "Singhania ESG & CBAM Advisory LLP",
            "logo_url": "https://example.com/singhania-logo.png",
            "primary_color": "#064e3b",
            "secondary_color": "#059669",
            "custom_domain": "portal.singhaniacbam.in",
            "tagline": "Specialist European Green Deal & Cross-Border Carbon Verification",
            "show_consultant_brand_on_pdf": True,
            "show_consultant_brand_on_portal": True,
        },
    )

    assert new_cfg["firm_name"] == "Singhania ESG & CBAM Advisory LLP"
    assert new_cfg["primary_color"] == "#064e3b"
    assert new_cfg["custom_domain"] == "portal.singhaniacbam.in"

    # INVARIANT: Mandatory HeatLedger / Clause 6 verification footer is permanently retained
    assert "Prepared with HeatLedger AI" in new_cfg["mandatory_verification_footer"]
    assert "Clause 6" in new_cfg["mandatory_verification_footer"]


def test_p10_bulk_client_onboarding_csv(consultant_svc):
    c_org = "org_consultant_singhania"

    csv_data = """client_name,plant_code,gst_or_pan,location,role,duration_days
Kolkata Rolling Mills,KRM-01,19AACCK1111A1Z1,Kolkata West Bengal,QA_CONSULTANT,180
Rourkela Steel Spares,RSS-02,21AAACR2222B1Z2,Rourkela Odisha,COMPLIANCE_MANAGER,365
Salem Special Castings,SSC-03,33AAACS3333C1Z3,Salem Tamil Nadu,AUDITOR_READONLY,90
"""
    result = consultant_svc.bulk_onboard_clients_from_csv(c_org, csv_data, "usr_admin")

    assert result["total_processed"] == 3
    assert result["successfully_onboarded_count"] == 3
    assert result["error_count"] == 0
    assert len(result["onboarded_plants"]) == 3

    # Verify one was onboarded and is accessible
    grant = consultant_svc.check_consultant_access(c_org, "PLANT-KRM-01")
    assert grant["status"] == "ACTIVE"


def test_p10_consolidated_monthly_invoice(consultant_svc):
    c_org = "org_consultant_singhania"
    inv = consultant_svc.get_consolidated_invoice(c_org, billing_month="2026-04")

    assert inv["invoice_number"].startswith("INV-HL-2026-04-")
    assert inv["consultant_org_id"] == c_org
    assert inv["total_active_plants"] >= 3
    assert inv["subtotal_inr"] > 0
    assert inv["gst_18_pct_total_inr"] == round(inv["subtotal_inr"] * 0.18, 2)
    assert inv["commission_credit_inr"] > 0
    assert len(inv["line_items"]) == inv["total_active_plants"]


def test_p10_referral_tracking(consultant_svc):
    c_org = "org_consultant_singhania"
    referrals = consultant_svc.get_referral_tracking(c_org)

    assert "referral_code" in referrals
    assert "https://heatledger.ai/signup?ref=" in referrals["share_url"]
    assert referrals["client_discount_pct"] == 15.0
    assert referrals["consultant_commission_pct"] == 20.0
    assert referrals["active_referred_plants_count"] >= 3
    assert referrals["monthly_recurring_commission_inr"] > 0
    assert len(referrals["attributed_clients"]) >= 3


# ------------------------------------------------------------------------------
# FastAPI Endpoints Integration Tests for Prompt P10
# ------------------------------------------------------------------------------
from fastapi.testclient import TestClient
from main import app
from auth_service import AuthService

client = TestClient(app)


def _get_auth_header(role="OWNER"):
    user_map = {
        "OWNER": ("usr_owner_01", "P. K. Banerjee", "OWNER"),
        "ADMIN": ("usr_owner_01", "P. K. Banerjee", "OWNER"),
        "QA_INSPECTOR": ("usr_qa_04", "R. K. Chatterjee", "QA_INSPECTOR"),
        "VIEWER": ("usr_viewer_01", "TÜV / SGS Customs Auditor", "VIEWER"),
    }
    uid, uname, urole = user_map.get(role, ("usr_owner_01", "P. K. Banerjee", "OWNER"))
    token = AuthService.create_jwt({
        "sub": uid,
        "user_id": uid,
        "name": uname,
        "role": urole,
        "org_id": "org_consultant_singhania",
        "organization_id": "org_consultant_singhania"
    })
    return {"Authorization": f"Bearer {token}"}


def test_p10_api_portfolio_and_at_risk():
    headers = _get_auth_header("OWNER")

    # 1. GET /api/consultant/portfolio
    p_resp = client.get("/api/consultant/portfolio", headers=headers)
    assert p_resp.status_code == 200
    p_data = p_resp.json()
    assert p_data["consultant_org_id"] == "org_consultant_singhania"
    assert p_data["active_clients"] >= 3

    # 2. GET /api/consultant/at-risk-shipments
    r_resp = client.get("/api/consultant/at-risk-shipments", headers=headers)
    assert r_resp.status_code == 200
    r_data = r_resp.json()
    assert len(r_data) >= 2
    assert "entity_identifier" in r_data[0]

    # 3. GET /api/consultant/review-queue
    q_resp = client.get("/api/consultant/review-queue", headers=headers)
    assert q_resp.status_code == 200
    assert len(q_resp.json()) >= 2


def test_p10_api_invite_revoke_lifecycle():
    headers = _get_auth_header("OWNER")
    plant_code = f"API-{uuid.uuid4().hex[:4].upper()}"
    plant_id = f"PLANT-{plant_code}"

    # 1. POST /api/consultant/clients/invite
    inv_resp = client.post("/api/consultant/clients/invite", json={
        "plant_id": plant_id,
        "plant_name": "API Test Alloy Plant",
        "plant_code": plant_code,
        "gst_or_pan": "19AABCA9999F1Z9",
        "location": "Durgapur, West Bengal",
        "role": "QA_CONSULTANT",
        "duration_days": 180
    }, headers=headers)
    assert inv_resp.status_code == 200
    assert inv_resp.json()["status"] == "ACTIVE"

    # 2. POST /api/consultant/clients/revoke
    rev_resp = client.post("/api/consultant/clients/revoke", json={
        "plant_id": plant_id,
        "consultant_org_id": "org_consultant_singhania"
    }, headers=headers)
    assert rev_resp.status_code == 200
    assert rev_resp.json()["status"] == "REVOKED"


def test_p10_api_bulk_onboard():
    headers = _get_auth_header("OWNER")
    csv_str = """client_name,plant_code,gst_or_pan,location,role,duration_days
Kanpur Fasteners,KNP-01,09AACCK9999Z1,Kanpur UP,QA_CONSULTANT,365
"""
    resp = client.post("/api/consultant/clients/bulk-onboard", json={
        "csv_content": csv_str
    }, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["successfully_onboarded_count"] == 1


def test_p10_api_white_label_and_invoice():
    headers = _get_auth_header("OWNER")

    # 1. GET /api/consultant/white-label
    wl_get = client.get("/api/consultant/white-label", headers=headers)
    assert wl_get.status_code == 200
    assert "mandatory_verification_footer" in wl_get.json()

    # 2. POST /api/consultant/white-label
    wl_post = client.post("/api/consultant/white-label", json={
        "firm_name": "Global Trade Advisory Services",
        "primary_color": "#064e3b",
        "secondary_color": "#047857",
        "show_consultant_brand_on_pdf": True
    }, headers=headers)
    assert wl_post.status_code == 200
    assert wl_post.json()["firm_name"] == "Global Trade Advisory Services"

    # 3. GET /api/consultant/consolidated-invoice
    inv_resp = client.get("/api/consultant/consolidated-invoice?billing_month=2026-04", headers=headers)
    assert inv_resp.status_code == 200
    assert inv_resp.json()["subtotal_inr"] > 0

    # 4. GET /api/consultant/referrals
    ref_resp = client.get("/api/consultant/referrals", headers=headers)
    assert ref_resp.status_code == 200
    assert "referral_code" in ref_resp.json()

