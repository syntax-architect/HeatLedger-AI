"""
Test Suite for Prompt D3: Partner Channel for CAs, Consultants and Freight Forwarders
Specifications:
1. Partner signup (CA, export consultant, freight forwarder, CHA) with referral code and partner dashboard:
   leads, status, commission accrued.
2. Plants grant a partner read-only access per organization. Revoke anytime. The partner never sees other plants.
3. Commission: 20 percent of the first 12 months' fees for referred plants (configurable in plans.json),
   tracked strictly from paid invoices, never from forecasts or estimates.
4. Partner kit page: a 1-page PDF summary, a 5-slide deck outline, a WhatsApp message, and the free check link with their code.
5. Statutory disclaimer strictly maintained: "Prepares documents for review. Not legal advice."
"""

import time
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.partner_service import PartnerService, get_partner_service, LEGAL_DISCLAIMER
from backend.db.connection import get_db_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_partner_tables():
    PartnerService.init_db()
    yield


def test_partner_signup_and_unique_referral_code():
    """Requirement 1: Partner signup with unique referral code generation and idempotency."""
    service = get_partner_service()
    unique_email = f"ca.sharma.{int(time.time()*1000)}@taxassociates.example.com"

    partner = service.register_partner(
        name="Sunil Sharma",
        partner_type="CA",
        email=unique_email,
        firm_name="Sharma & Associates CA",
        phone="+919811223344",
        city="Mumbai",
        gstin="27AAAAA0000A1Z5"
    )

    assert partner["id"] is not None
    assert partner["email"] == unique_email.lower()
    assert partner["referral_code"].startswith("HL-CA-")
    assert partner["disclaimer"] == LEGAL_DISCLAIMER

    # Idempotent re-registration returns existing partner and code
    dup = service.register_partner(
        name="Sunil Sharma",
        partner_type="CA",
        email=unique_email,
        firm_name="Sharma & Associates CA",
    )
    assert dup["referral_code"] == partner["referral_code"]


def test_referral_lead_creation():
    """Requirement 1: Lead registration via partner referral code."""
    service = get_partner_service()
    unique_email = f"consultant.{int(time.time()*1000)}@steelconsult.example.com"

    partner = service.register_partner(
        name="Vikram Mehta",
        partner_type="EXPORT_CONSULTANT",
        email=unique_email,
        firm_name="Mehta Trade Consultants",
    )
    code = partner["referral_code"]

    # 1. Valid referral code generates lead
    lead = service.create_referral_lead(
        referral_code=code,
        company_name="Apex Forgings Ltd",
        contact_email="sales@apexforgings.example.com",
        contact_phone="+919876543210"
    )
    assert lead["referral_id"] is not None
    assert lead["partner_id"] == partner["id"]
    assert lead["status"] == "LEAD"

    # 2. Invalid code raises ValueError
    with pytest.raises(ValueError, match="Invalid partner referral code"):
        service.create_referral_lead(
            referral_code="NON_EXISTENT_CODE_999",
            company_name="Ghost Steel",
            contact_email="ghost@example.com"
        )


def test_commission_accrual_from_paid_invoices_only():
    """Requirement 3: 20% commission on first 12 months' fees, strictly from paid invoices, never forecasts."""
    service = get_partner_service()
    p_email = f"forwarder.{int(time.time()*1000)}@logisticshub.example.com"

    partner = service.register_partner(
        name="Rajesh Verma",
        partner_type="FREIGHT_FORWARDER",
        email=p_email,
        firm_name="Verma Global Freight",
    )
    code = partner["referral_code"]

    org_id = f"org_plant_referred_{int(time.time()*1000)}"
    ref_id = service.link_organization_to_referral(code, org_id)
    assert ref_id is not None

    # Invoice 1: Paid invoice for ₹19,999 (Plant Pro Monthly Subscription)
    invoice_id = f"inv_{int(time.time()*1000)}"
    invoice_amount = 19999.0
    now_dt = datetime.now(timezone.utc)

    comm = service.record_paid_invoice(
        organization_id=org_id,
        invoice_id=invoice_id,
        amount_inr=invoice_amount,
        payment_date=now_dt
    )

    assert comm is not None
    assert comm["partner_id"] == partner["id"]
    assert comm["invoice_amount_inr"] == invoice_amount
    assert comm["commission_percent"] == 20.0
    assert comm["commission_amount_inr"] == round(invoice_amount * 0.20, 2)  # ₹3,999.80
    assert comm["status"] == "ACCRUED"

    # Verify partner dashboard reflects the accrued commission
    dashboard = service.get_partner_dashboard(partner["id"])
    assert dashboard["summary"]["total_commission_accrued_inr"] == round(invoice_amount * 0.20, 2)
    assert dashboard["summary"]["paid_active_count"] == 1


def test_commission_12_month_eligibility_window():
    """Requirement 3: Commission expires after 12 months from first paid date."""
    service = get_partner_service()
    p_email = f"cha.{int(time.time()*1000)}@customsbroker.example.com"

    partner = service.register_partner(
        name="Anil Kulkarni",
        partner_type="CHA",
        email=p_email,
        firm_name="Kulkarni Clearing Agency",
    )
    code = partner["referral_code"]
    org_id = f"org_plant_window_{int(time.time()*1000)}"
    service.link_organization_to_referral(code, org_id)

    # First payment: Month 0
    t0 = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    comm_m0 = service.record_paid_invoice(org_id, "inv_m0", 10000.0, payment_date=t0)
    assert comm_m0 is not None
    assert comm_m0["commission_amount_inr"] == 2000.0

    # Second payment: Month 6 (within 12 months) -> Accrues commission
    t6 = t0 + timedelta(days=180)
    comm_m6 = service.record_paid_invoice(org_id, "inv_m6", 10000.0, payment_date=t6)
    assert comm_m6 is not None
    assert comm_m6["commission_amount_inr"] == 2000.0

    # Third payment: Month 14 (past 12 months) -> Zero commission accrued
    t14 = t0 + timedelta(days=420)
    comm_m14 = service.record_paid_invoice(org_id, "inv_m14", 10000.0, payment_date=t14)
    assert comm_m14 is None


def test_plant_read_only_access_delegation_and_revocation():
    """Requirement 2: Plants grant read-only access per org. Revoke anytime. Partner never sees other plants."""
    service = get_partner_service()

    # Partner 1
    p1 = service.register_partner(
        name="Pooja Rao",
        partner_type="CA",
        email=f"pooja.{int(time.time()*1000)}@raoca.example.com",
        firm_name="Rao & Co Chartered Accountants",
    )
    # Partner 2
    p2 = service.register_partner(
        name="Arjun Roy",
        partner_type="EXPORT_CONSULTANT",
        email=f"arjun.{int(time.time()*1000)}@royconsult.example.com",
        firm_name="Roy Trade Advisory",
    )

    plant_a = f"org_plant_a_{int(time.time()*1000)}"
    plant_b = f"org_plant_b_{int(time.time()*1000)}"

    # Plant A grants read-only access to Partner 1 only
    service.grant_plant_access(plant_a, p1["id"])

    # Verify Partner 1 can see Plant A
    p1_plants = service.list_accessible_plants_for_partner(p1["id"])
    assert len(p1_plants) == 1
    assert p1_plants[0]["organization_id"] == plant_a

    # Partner 2 has NO access to Plant A or Plant B
    p2_plants = service.list_accessible_plants_for_partner(p2["id"])
    assert len(p2_plants) == 0

    # Plant A revokes access from Partner 1
    rev = service.revoke_plant_access(plant_a, p1["id"])
    assert rev["status"] == "REVOKED"

    # Partner 1 now has 0 accessible plants
    p1_plants_after = service.list_accessible_plants_for_partner(p1["id"])
    assert len(p1_plants_after) == 0


def test_partner_kit_generation_and_statutory_disclaimer():
    """Requirement 4 & 5: Partner kit with 1-page PDF, 5-slide deck, WhatsApp message, and disclaimer."""
    service = get_partner_service()
    p = service.register_partner(
        name="Manoj Agarwal",
        partner_type="CA",
        email=f"manoj.{int(time.time()*1000)}@agarwalca.example.com",
        firm_name="Agarwal Compliance Associates",
    )

    kit = service.generate_partner_kit(p["id"])

    # Check 1-page summary
    assert "PARTNER PROGRAM KIT" in kit["one_page_summary_text"]
    assert p["referral_code"] in kit["one_page_summary_text"]
    assert "20% Commission" in kit["one_page_summary_text"]

    # Check 5-slide deck
    assert len(kit["slide_deck"]) == 5
    assert kit["slide_deck"][0]["title"] == "EU Steel Compliance Crisis: 2026 Mandates"
    assert "20% Revenue Share" in kit["slide_deck"][3]["title"]

    # Check WhatsApp message
    assert p["firm_name"] in kit["whatsapp_message"]
    assert kit["free_check_link"] in kit["whatsapp_message"]
    assert LEGAL_DISCLAIMER in kit["whatsapp_message"]

    # Statutory disclaimer check
    assert kit["disclaimer"] == LEGAL_DISCLAIMER


def test_public_router_endpoints():
    """Test HTTP API endpoints for public signup, code verification, and partner portal."""
    # 1. Public Signup
    signup_data = {
        "name": "Devendra Singhania",
        "partner_type": "EXPORT_CONSULTANT",
        "email": f"devendra.{int(time.time()*1000)}@singhaniatrade.example.com",
        "firm_name": "Singhania Exim Advisory",
        "city": "Kolkata",
        "phone": "+919830112233"
    }
    res = client.post("/api/public/partners/signup", json=signup_data)
    assert res.status_code == 200
    res_json = res.json()
    code = res_json["referral_code"]
    partner_id = res_json["id"]

    # 2. Public Code Verification
    verify_res = client.get(f"/api/public/partners/verify-code/{code}")
    assert verify_res.status_code == 200
    assert verify_res.json()["valid"] is True
    assert verify_res.json()["firm_name"] == "Singhania Exim Advisory"

    # 3. Public Lead Submission
    lead_data = {
        "referral_code": code,
        "company_name": "Howrah Steels & Alloys",
        "contact_email": "director@howrahsteels.example.com"
    }
    lead_res = client.post("/api/public/partners/lead", json=lead_data)
    assert lead_res.status_code == 200
    assert lead_res.json()["status"] == "LEAD"

    # 4. Partner Dashboard
    dash_res = client.get(f"/api/partners/{partner_id}/dashboard")
    assert dash_res.status_code == 200
    assert dash_res.json()["summary"]["leads_count"] == 1

    # 5. Partner Kit
    kit_res = client.get(f"/api/partners/{partner_id}/kit")
    assert kit_res.status_code == 200
    assert len(kit_res.json()["slide_deck"]) == 5
