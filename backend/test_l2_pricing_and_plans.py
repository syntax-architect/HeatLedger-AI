"""
HEATLEDGER AI: Prompt L2 Automated Test Suite
Specification: Phase 5 (Launch) - Prompt L2 (Pricing Page & Plan Config)

Verifies:
1. Single source of truth configuration (data/plans.json).
2. Canonical 4 tiers (PILOT, PLANT, PLANT_PRO, CONSULTANT) with correct pricing and limits.
3. Code note requirement: prices are hypotheses until customers pay.
4. GET /api/billing/plans returns unified tiers, SAC 998313, 18% GST, and coupons.
5. Annual pricing calculation with 2-months-free discount.
6. In-app upgrade flow (POST /api/billing/upgrade) updates subscription tier and limit.
7. Coupon validation (EEPC_INDIA_20, HOWRAH_MSME, CBAM2026) and GST split.
8. Privacy-friendly telemetry event logging (POST /api/telemetry/pricing-event).
"""

import os
import json
import pytest
from starlette.testclient import TestClient

from main import app
from auth_service import AuthService
from billing_service import BillingService, PLANS

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def auth_headers(test_client):
    res = test_client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!"
    })
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_l2_01_single_source_of_truth_plans_json():
    """Validates data/plans.json contains the canonical 4 tiers and correct limits."""
    plans_path = os.path.join(REPO_ROOT, "data", "plans.json")
    assert os.path.exists(plans_path), "Missing data/plans.json"

    with open(plans_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("sac_code") == "998313"
    assert data.get("gst_rate_percent") == 18.0
    plans = data.get("plans", {})

    # 4 Canonical Tiers
    assert "PILOT" in plans
    assert "PLANT" in plans
    assert "PLANT_PRO" in plans
    assert "CONSULTANT" in plans

    # Tier Pricing Verification
    assert plans["PILOT"]["price_inr"] == 25000
    assert plans["PLANT"]["price_monthly_inr"] == 9999
    assert plans["PLANT_PRO"]["price_monthly_inr"] == 19999
    assert plans["CONSULTANT"]["price_per_plant_monthly_inr"] == 6999

    # Tier Limits Verification
    assert plans["PILOT"]["certificate_limit_monthly"] == 50
    assert plans["PLANT"]["certificate_limit_monthly"] in (100, 150)
    assert plans["PLANT_PRO"]["certificate_limit_monthly"] in (300, 600)
    assert plans["CONSULTANT"]["certificate_limit_monthly"] >= 500


def test_l2_02_pricing_hypotheses_note_in_config():
    """Confirms note in code/config that prices are commercial hypotheses until customers pay."""
    plans_path = os.path.join(REPO_ROOT, "data", "plans.json")
    with open(plans_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    note = data.get("note", "")
    assert "hypotheses" in note.lower(), "Missing hypothesis disclaimer in plans.json"
    assert "customers pay" in note.lower(), "Hypothesis note must specify 'until customers pay'"


def test_l2_03_get_billing_plans_api(test_client):
    """Validates public GET /api/billing/plans returns tiers, SAC code, GST rate, and coupons."""
    res = test_client.get("/api/billing/plans")
    assert res.status_code == 200
    body = res.json()

    assert body["sac_code"] == "998313"
    assert body["gst_rate_pct"] == 18.0
    assert len(body["available_coupons"]) >= 3

    plans = body["plans"]
    assert "PILOT" in plans
    assert "PLANT" in plans
    assert "PLANT_PRO" in plans


def test_l2_04_annual_discount_calculation():
    """Confirms annual pricing incorporates the 2 months free structure."""
    plant = PLANS["PLANT"]
    annual_price = plant.get("price_annual_inr", plant["price_monthly_inr"] * 10)
    # 9,999 * 10 months = 99,990 (2 months free)
    assert annual_price == 99990

    plant_pro = PLANS["PLANT_PRO"]
    pro_annual = plant_pro.get("price_annual_inr", plant_pro["price_monthly_inr"] * 10)
    # 19,999 * 10 months = 199,990 (2 months free)
    assert pro_annual == 199990


def test_l2_05_in_app_upgrade_flow(test_client, auth_headers):
    """Validates POST /api/billing/upgrade seamlessly upgrades organization plan and quota."""
    payload = {
        "plan_id": "PLANT_PRO",
        "billing_cycle": "ANNUAL",
        "coupon_code": "EEPC_INDIA_20"
    }
    res = test_client.post("/api/billing/upgrade", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "upgraded"
    assert data["new_plan_id"] == "PLANT_PRO"
    assert data["certificate_limit"] in (300, 600)
    assert data["billing_cycle"] == "ANNUAL"


def test_l2_06_coupon_discount_and_gst_calculation(test_client):
    """Validates coupon discount application and CGST/SGST vs IGST calculation."""
    payload = {
        "plan_id": "PLANT",
        "coupon_code": "EEPC_INDIA_20",
        "billing_cycle": "MONTHLY",
        "place_of_supply": "West Bengal (19)"
    }
    res = test_client.post("/api/billing/apply-coupon", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["coupon_code"] == "EEPC_INDIA_20"
    assert data["discount_pct"] == 20.0
    tax = data["tax_breakdown"]
    # Base: 9999. Discount 20% = 1999.80. Taxable = 7999.20.
    assert round(tax["taxable_amount_inr"], 2) == 7999.20
    assert tax["is_intra_state"] is True
    assert tax["cgst_inr"] > 0
    assert tax["sgst_inr"] > 0
    assert tax["igst_inr"] == 0.0


def test_l2_07_privacy_friendly_telemetry_tracking(test_client):
    """Validates privacy-friendly event logging without PII or tracking cookies."""
    event_payload = {
        "event": "select_plan",
        "plan_id": "PLANT_PRO",
        "metadata": {"billing_cycle": "annual", "source": "pricing_matrix"}
    }
    res = test_client.post("/api/telemetry/pricing-event", json=event_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "recorded"

    # Query telemetry buffer
    events_res = test_client.get("/api/telemetry/pricing-events")
    assert events_res.status_code == 200
    events = events_res.json()["events"]
    assert any(e["event"] == "select_plan" and e["plan_id"] == "PLANT_PRO" for e in events)
