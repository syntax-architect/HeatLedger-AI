"""
TEST SUITE: Prompt C6 - Value Screen & Money-at-Risk Engine
Validates:
1. Canonical 4-number home screen (Shipments this month, ready, blocked, money at risk)
2. Transparent mathematical money-at-risk formula
3. Configurable owner inputs and 'your estimate' labeling
4. Time-saved counter (minutes per shipment * shipments done)
5. Automated weekly owner email via Resend with top 3 actions and unsubscribe
6. 1-page director/banker PDF generation
7. Full FastAPI API router integration
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.roi_service import RoiService


@pytest.fixture
def test_client():
    return TestClient(app)


def test_c6_01_default_risk_parameters_and_transparency():
    """Confirms all risk parameters have transparent defaults and are labeled as 'your estimate'."""
    params = RoiService.get_plant_parameters("test_org_c6")
    assert "demurrage_per_day_inr" in params
    assert params["demurrage_per_day_inr"] == 15000.0
    assert params["quota_safeguard_rate"] == 0.25
    assert params["cbam_default_markup_rate"] == 0.10
    assert params["minutes_per_shipment"] == 45
    assert params["label"] == "your estimate"


def test_c6_02_money_at_risk_mathematical_precision():
    """Validates mathematical precision of the 4 cost components of money at risk."""
    custom_params = {
        "demurrage_per_day_inr": 20000.0,
        "default_hold_days": 4,
        "quota_safeguard_rate": 0.25,
        "cbam_default_markup_rate": 0.10,
        "cbam_price_eur_per_tonne": 80.0,
        "eur_to_inr_exchange_rate": 90.0,
        "reshipping_rejection_pct": 0.10,
        "label": "your estimate"
    }

    shipment = {
        "shipment_id": "SHP-TEST-01",
        "invoice_number": "INV-TEST-01",
        "invoice_value_inr": 1000000.0,
        "tonnes": 10.0,
        "container_count": 2,
        "hold_days": 4,
        "is_out_of_quota": True
    }

    res = RoiService.calculate_shipment_money_at_risk(shipment, custom_params)
    breakdown = res["breakdown"]

    # 1. Demurrage: ₹20,000/day * 4 days * 2 containers = ₹160,000
    assert breakdown["demurrage_inr"] == 160000.0

    # 2. Quota Safeguard: 25% of ₹1,000,000 = ₹250,000
    assert breakdown["quota_safeguard_inr"] == 250000.0

    # 3. CBAM default markup: 10 tonnes * 1.85 tCO2/t = 18.5 tCO2
    # 18.5 * 0.10 penalty * €80 * ₹90 = ₹13,320
    assert breakdown["cbam_default_markup_inr"] == 13320.0

    # 4. Re-shipping: 10% of ₹1,000,000 = ₹100,000
    assert breakdown["reshipping_rejection_inr"] == 100000.0

    # Total: 160,000 + 250,000 + 13,320 + 100,000 = ₹523,320
    assert res["total_money_at_risk_inr"] == 523320.0
    assert res["label"] == "your estimate"


def test_c6_03_four_numbers_home_screen():
    """Validates the canonical 4 numbers on the home screen."""
    summary = RoiService.get_value_screen_summary("test_org_c6")
    fn = summary["four_numbers"]

    assert fn["shipments_this_month"] == 4
    assert fn["shipments_ready"] == 2
    assert fn["shipments_blocked"] == 2
    assert fn["money_at_risk_inr"] > 0

    # Verify blocked reasons are itemized and never an accusation
    blocked_reasons = summary["blocked_reasons"]
    assert len(blocked_reasons) == 2
    for b in blocked_reasons:
        assert "money_at_risk_inr" in b
        assert len(b["reasons"]) > 0


def test_c6_04_time_saved_counter():
    """Validates the time saved counter derived from transparent minutes per shipment."""
    summary = RoiService.get_value_screen_summary("test_org_c6")
    ts = summary["time_saved"]

    assert ts["minutes_per_shipment"] == 45
    # 4 shipments * 45 mins = 180 mins = 3.0 hours
    assert ts["minutes_saved"] == 180
    assert ts["hours_saved"] == 3.0
    assert ts["label"] == "your estimate"


def test_c6_05_update_plant_risk_parameters():
    """Validates that owner can update their own parameters and calculations adapt immediately."""
    org_id = "org_custom_metallurgy_plant"
    updated = RoiService.update_plant_parameters(org_id, {
        "demurrage_per_day_inr": 25000.0,
        "minutes_per_shipment": 60
    })

    assert updated["demurrage_per_day_inr"] == 25000.0
    assert updated["minutes_per_shipment"] == 60

    summary = RoiService.get_value_screen_summary(org_id)
    assert summary["time_saved"]["minutes_per_shipment"] == 60
    assert summary["parameters_used"]["demurrage_per_day_inr"] == 25000.0


def test_c6_06_weekly_owner_email_generation_and_unsubscribe():
    """Validates weekly owner email composition, top 3 actions, and unsubscribe link."""
    email_res = RoiService.send_weekly_owner_email(
        organization_id="test_org_c6",
        owner_email="managing.director@howrahsteel.in",
        owner_name="Mr. S. Banerjee",
        test_mode=True
    )

    assert email_res["status"] == "simulated_success"
    assert email_res["recipient"] == "managing.director@howrahsteel.in"
    assert "₹" in email_res["subject"]
    assert "Protected" in email_res["subject"]
    assert "unsubscribe" in email_res["unsubscribe_url"].lower()


def test_c6_07_monthly_director_pdf_generation():
    """Validates the 1-page vector PDF 'What HeatLedger did for you' for a board director or banker."""
    pdf_bytes = RoiService.generate_monthly_director_pdf(
        organization_id="test_org_c6",
        plant_name="Howrah Precision Steel Works Ltd"
    )

    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")


def test_c6_08_api_value_screen_endpoints(test_client):
    """Hits all FastAPI endpoints in ValueScreen router."""
    # 1. Summary
    res = test_client.get("/api/value-screen/summary")
    assert res.status_code == 200
    data = res.json()
    assert "four_numbers" in data
    assert data["four_numbers"]["shipments_this_month"] >= 1

    # 2. Parameters
    res_p = test_client.get("/api/value-screen/parameters")
    assert res_p.status_code == 200
    assert "demurrage_per_day_inr" in res_p.json()

    # 3. Update parameters
    res_u = test_client.put("/api/value-screen/parameters", json={"minutes_per_shipment": 50})
    assert res_u.status_code == 200
    assert res_u.json()["parameters"]["minutes_per_shipment"] == 50

    # 4. Trigger weekly email
    res_e = test_client.post("/api/value-screen/trigger-weekly-email", json={
        "owner_email": "owner@steelplant.in",
        "owner_name": "Chief Executive",
        "test_mode": True
    })
    assert res_e.status_code == 200
    assert res_e.json()["status"] == "simulated_success"

    # 5. Director PDF download
    res_pdf = test_client.get("/api/value-screen/director-pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 500

    # 6. Unsubscribe
    res_unsub = test_client.get("/api/value-screen/unsubscribe?token=tok123&email=owner@steelplant.in")
    assert res_unsub.status_code == 200
    assert res_unsub.json()["status"] == "unsubscribed"
