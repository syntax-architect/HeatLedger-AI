"""
HEATLEDGER AI: Prompt B9 Test Suite
Indian GST Compliance (SAC 998313), Razorpay Webhooks, Replay Protection,
Plan Quota Limits, 14-Day Grace Period & GST Tax Invoice PDFs.
"""

import json
import uuid
import hmac
import hashlib
import pytest
import pymupdf as fitz
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from main import app
from billing_service import BillingService, PlanLimitExceededError
from backend.db.connection import get_db_connection

client = TestClient(app)
WEBHOOK_SECRET = "test_webhook_secret_key_heatledger_2026"


def get_owner_token() -> str:
    """Logs in as seeded plant owner to obtain valid JWT."""
    res = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!"
    })
    return res.json()["token"]


def test_b9_plans_and_coupons_metadata():
    """Verifies that billing plans expose SAC 998313 and statutory GST parameters."""
    res = client.get("/api/billing/plans")
    assert res.status_code == 200
    data = res.json()
    assert data["sac_code"] == "998313"
    assert data["gst_rate_pct"] == 18.0
    assert "PILOT_TRIAL" in data["plans"]
    assert "EXPORTER_STARTER" in data["plans"]
    assert "GROWTH_MULTI_PLANT" in data["plans"]
    assert "ENTERPRISE_CUSTOM" in data["plans"]
    assert any(c["code"] == "EEPC_INDIA_20" for c in data["available_coupons"])


def test_b9_gst_intra_state_vs_inter_state():
    """
    Tests Indian GST calculation:
    - West Bengal (State 19): Intra-state -> CGST 9% + SGST 9%, IGST 0.
    - Maharashtra / Other (State 27): Inter-state -> IGST 18%, CGST 0, SGST 0.
    """
    # 1. Intra-State (West Bengal, 19)
    intra = BillingService.calculate_gst_breakdown(base_amount_inr=10000.0, place_of_supply_state_code="19")
    assert intra["is_intra_state"] is True
    assert intra["taxable_amount_inr"] == 10000.0
    assert intra["cgst_inr"] == 900.0
    assert intra["sgst_inr"] == 900.0
    assert intra["igst_inr"] == 0.0
    assert intra["total_amount_inr"] == 11800.0

    # 2. Inter-State (Maharashtra, 27)
    inter = BillingService.calculate_gst_breakdown(base_amount_inr=10000.0, place_of_supply_state_code="27")
    assert inter["is_intra_state"] is False
    assert inter["taxable_amount_inr"] == 10000.0
    assert inter["cgst_inr"] == 0.0
    assert inter["sgst_inr"] == 0.0
    assert inter["igst_inr"] == 1800.0
    assert inter["total_amount_inr"] == 11800.0


def test_b9_coupon_discount_calculation():
    """Tests coupon validation endpoint and net-of-discount GST computation."""
    res = client.post("/api/billing/apply-coupon", json={
        "coupon_code": "EEPC_INDIA_20",
        "plan_id": "EXPORTER_STARTER",
        "billing_cycle": "MONTHLY",
        "place_of_supply": "West Bengal (19)"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["coupon_code"] == "EEPC_INDIA_20"
    assert data["discount_pct"] == 20.0
    tax = data["tax_breakdown"]
    # Monthly base: 9999 (PLANT / EXPORTER_STARTER). 20% discount = 1999.80. Taxable = 7999.20.
    assert tax["base_amount_inr"] == 9999.0
    assert tax["discount_inr"] == 1999.8
    assert tax["taxable_amount_inr"] == 7999.2
    assert tax["cgst_inr"] == round(7999.2 * 0.09, 2)
    assert tax["sgst_inr"] == round(7999.2 * 0.09, 2)


def test_b9_order_creation_and_gst_invoice_pdf():
    """
    Creates an order, generates an authentic GST tax invoice PDF with SAC 998313,
    and downloads it.
    """
    token = get_owner_token()

    res = client.post(
        "/api/billing/create-order",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "plan_id": "EXPORTER_STARTER",
            "billing_cycle": "MONTHLY",
            "customer_gstin": "19AABCT1332L1Z1",
            "place_of_supply": "West Bengal (19)",
            "coupon_code": "EEPC_INDIA_20"
        }
    )
    assert res.status_code == 200
    order_data = res.json()
    assert order_data["status"] == "order_created"
    assert "invoice_id" in order_data
    order_data["invoice_id"]
    pdf_url = order_data["download_url"]

    # Verify PDF download
    pdf_res = client.get(pdf_url)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert len(pdf_res.content) > 1000

    # Inspect PDF contents using PyMuPDF
    doc = fitz.open(stream=pdf_res.content, filetype="pdf")
    assert len(doc) == 1
    page_text = doc[0].get_text()
    assert "HEATLEDGER AI · TAX INVOICE" in page_text
    assert "SAC Code: 998313" in page_text
    assert "Exporter Starter" in page_text


def test_b9_razorpay_webhook_replay_protection():
    """
    Simulates Razorpay webhook:
    1. Valid HMAC signature processes successfully.
    2. Exact duplicate event_id is rejected/ignored with idempotent 200.
    3. Invalid signature is rejected with 400.
    """
    event_id = f"evt_test_{uuid.uuid4().hex[:8]}"
    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:8]}",
                    "amount": 1499900,
                    "currency": "INR",
                    "status": "captured"
                }
            }
        }
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    valid_sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()

    # 1. First delivery -> 200 Processed
    res1 = client.post(
        "/api/billing/webhook",
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        content=raw_bytes
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "processed"

    # 2. Replayed delivery (same event_id) -> 200 Ignored (Idempotent)
    res2 = client.post(
        "/api/billing/webhook",
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        content=raw_bytes
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ignored"
    assert res2.json()["reason"] == "event_already_processed"

    # 3. Bad signature -> 400
    res3 = client.post(
        "/api/billing/webhook",
        headers={"X-Razorpay-Signature": "invalid_tampered_signature_hex", "Content-Type": "application/json"},
        content=raw_bytes
    )
    assert res3.status_code == 400


def test_b9_failed_payment_14_day_grace_period():
    """
    Tests that payment.failed webhook sets subscription status to PAST_DUE
    with a 14-day grace period.
    """
    org_id = f"org_grace_{uuid.uuid4().hex[:6]}"
    BillingService.get_or_create_subscription(org_id)

    event_id = f"evt_fail_{uuid.uuid4().hex[:8]}"
    payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_{uuid.uuid4().hex[:8]}",
                    "notes": {"organization_id": org_id}
                }
            }
        }
    }
    raw_bytes = json.dumps(payload).encode("utf-8")
    valid_sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), raw_bytes, hashlib.sha256).hexdigest()

    res = client.post(
        "/api/billing/webhook",
        headers={"X-Razorpay-Signature": valid_sig, "Content-Type": "application/json"},
        content=raw_bytes
    )
    assert res.status_code == 200
    assert res.json()["status"] == "processed"

    # Verify subscription record
    sub = BillingService.get_or_create_subscription(org_id)
    assert sub["status"] == "PAST_DUE"
    assert sub["grace_period_until"] is not None

    grace_dt = datetime.fromisoformat(sub["grace_period_until"])
    now_dt = datetime.now(timezone.utc)
    diff_days = (grace_dt - now_dt).days
    assert diff_days in (6, 7, 13, 14)


def test_b9_plan_quota_exhaustion_and_telemetry():
    """
    Tests that BillingService.check_and_increment_quota tracks certificates
    and raises PlanLimitExceededError when limit is hit.
    """
    org_id = f"org_quota_{uuid.uuid4().hex[:6]}"
    # Initialize subscription with limit of 2
    BillingService.init_tables()
    with BillingService._lock:
        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO subscriptions (
                    id, organization_id, plan_id, billing_cycle, status,
                    certificates_used, certificates_limit, current_period_start,
                    current_period_end, created_at
                ) VALUES (?, ?, 'EXPORTER_STARTER', 'MONTHLY', 'ACTIVE', 0, 2, ?, ?, ?)
            """, (
                f"sub_{uuid.uuid4().hex[:8]}",
                org_id,
                datetime.now(timezone.utc).isoformat(),
                (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                datetime.now(timezone.utc).isoformat()
            ))
            conn.commit()

    # 1st use -> Allowed
    q1 = BillingService.check_and_increment_quota(org_id)
    assert q1["certificates_used"] == 1
    assert q1["remaining"] == 1

    # 2nd use -> Allowed (100% quota exhausted warning)
    q2 = BillingService.check_and_increment_quota(org_id)
    assert q2["certificates_used"] == 2
    assert q2["remaining"] == 0
    assert q2["warning"] == "QUOTA_EXHAUSTED"

    # 3rd use -> PlanLimitExceededError
    with pytest.raises(PlanLimitExceededError) as exc_info:
        BillingService.check_and_increment_quota(org_id)
    assert "limit of 2 reached" in str(exc_info.value)
