"""
Tests for Prompt R1 (Prompt Pack v3): Real Billing with Razorpay
Verifies:
1. Plans configured in data/plans.json (Pilot 25k, Plant 9,999, Plant Pro 19,999, Consultant 6,999, Container Addon 2,499).
2. Razorpay webhook HMAC-SHA256 signature verification (signature mismatch rejected).
3. Webhook idempotency (duplicate/replayed webhooks safely ignored).
4. Test-mode payment upgrades the plan end-to-end.
5. Sequential GST tax invoice PDF with SAC 998313, customer GSTIN, and place of supply.
6. 7-day grace period on payment failure followed by read-only mode (never deletes data).
7. Subscription cancellation and refund note processing.
"""

import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
import pytest
import pymupdf as fitz
from fastapi.testclient import TestClient

from main import app
from billing_service import BillingService, PLANS, SAC_CODE, GST_RATE_PCT, GRACE_PERIOD_DAYS

client = TestClient(app)
WEBHOOK_SECRET = "test_webhook_secret_key_heatledger_2026"


@pytest.fixture(autouse=True)
def setup_billing_env():
    BillingService.init_tables()
    os.environ["RAZORPAY_WEBHOOK_SECRET"] = WEBHOOK_SECRET
    os.environ.setdefault("SUPPLIER_LEGAL_NAME", "HeatLedger Test Billing Entity")
    os.environ.setdefault("SUPPLIER_ADDRESS", "Test Industrial Zone, West Bengal")
    os.environ.setdefault("SUPPLIER_GSTIN", "19TESTG0000A1Z5")
    os.environ.setdefault("SUPPLIER_PAN", "TESTP0000A")
    os.environ.setdefault("SUPPORT_EMAIL", "billing-test@heatledger.example")
    yield


def test_r1_plans_loaded_from_config():
    """Verifies that Prompt R1 plans are loaded from config and match specifications."""
    assert "PILOT" in PLANS
    assert "PLANT" in PLANS
    assert "PLANT_PRO" in PLANS
    assert "CONSULTANT" in PLANS
    assert "CONTAINER_PACK_ADDON" in PLANS

    # Pilot: 25,000 INR one time (30 days, 50 certs)
    pilot = PLANS["PILOT"]
    assert pilot["price_inr"] == 25000
    assert pilot["certificate_limit"] == 50
    assert pilot["max_seats"] == 2

    # Plant: 9,999 INR monthly (100 certs)
    plant = PLANS["PLANT"]
    assert plant["price_monthly_inr"] == 9999
    assert plant["certificate_limit"] == 100

    # Plant Pro: 19,999 INR monthly (300 certs, 10 seats)
    plant_pro = PLANS["PLANT_PRO"]
    assert plant_pro["price_monthly_inr"] == 19999
    assert plant_pro["certificate_limit"] == 300
    assert plant_pro["max_seats"] == 10

    # Consultant: 6,999 INR per plant monthly (minimum 5 plants)
    consultant = PLANS["CONSULTANT"]
    assert consultant["price_per_plant_monthly_inr"] == 6999
    assert consultant["minimum_plants"] == 5

    # Add-on: 2,499 INR per container pack
    addon = PLANS["CONTAINER_PACK_ADDON"]
    assert addon["price_inr"] == 2499

    assert SAC_CODE == "998313"
    assert GST_RATE_PCT == 18.0
    assert GRACE_PERIOD_DAYS == 7


def test_r1_test_mode_payment_upgrades_plan_end_to_end():
    """
    Prompt R1: A test-mode payment upgrades the plan end-to-end.
    Webhooks must process payment.captured and set the subscription to ACTIVE with new quota.
    """
    org_id = f"org_test_upgrade_{uuid.uuid4().hex[:6]}"
    sub_init = BillingService.get_or_create_subscription(org_id)
    assert sub_init["status"] == "TRIAL"

    # Simulate payment.captured webhook payload
    event_id = f"evt_{uuid.uuid4().hex[:12]}"
    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_test_{uuid.uuid4().hex[:10]}",
                    "order_id": f"order_test_{uuid.uuid4().hex[:10]}",
                    "amount": 2359882,  # 19999 + 18% GST in paise
                    "currency": "INR",
                    "status": "captured",
                    "notes": {
                        "organization_id": org_id,
                        "plan_id": "PLANT_PRO"
                    }
                }
            }
        }
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    result = BillingService.process_razorpay_webhook(payload, raw_body, signature, WEBHOOK_SECRET)
    assert result["status"] == "processed"
    assert result["event_type"] == "payment.captured"

    # Verify subscription is upgraded end-to-end
    sub_upgraded = BillingService.get_or_create_subscription(org_id)
    assert sub_upgraded["status"] == "ACTIVE"
    assert sub_upgraded["plan_id"] == "PLANT_PRO"
    assert sub_upgraded["certificates_limit"] == 300
    assert sub_upgraded["certificates_used"] == 0
    assert sub_upgraded["grace_period_until"] is None


def test_r1_webhook_signature_mismatch_rejected():
    """Prompt R1: Signature mismatch rejected with PermissionError."""
    payload = {"id": "evt_bad_sig_123", "event": "order.paid"}
    raw_body = json.dumps(payload).encode("utf-8")
    tampered_sig = "invalid_signature_hash_0000000000000000000000000000000000000000"

    with pytest.raises(PermissionError) as exc_info:
        BillingService.process_razorpay_webhook(payload, raw_body, tampered_sig, WEBHOOK_SECRET)
    assert "Invalid Razorpay webhook signature" in str(exc_info.value)


def test_r1_webhook_idempotency_duplicate_ignored():
    """Prompt R1: Replayed/duplicate webhooks do nothing (safely ignored)."""
    event_id = f"evt_idemp_{uuid.uuid4().hex[:10]}"
    payload = {
        "id": event_id,
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_dup_001",
                    "amount": 1179882,
                    "notes": {"organization_id": "org_dup_test", "plan_id": "PLANT"}
                }
            }
        }
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    # First attempt: processed
    res1 = BillingService.process_razorpay_webhook(payload, raw_body, signature, WEBHOOK_SECRET)
    assert res1["status"] == "processed"

    # Second attempt (replay attack or retry): safely ignored
    res2 = BillingService.process_razorpay_webhook(payload, raw_body, signature, WEBHOOK_SECRET)
    assert res2["status"] == "ignored"
    assert res2["reason"] == "event_already_processed"


def test_r1_sequential_gst_invoice_pdf():
    """
    Prompt R1: GST invoice PDF per payment with business name, GSTIN field,
    SAC code 998313, place of supply, and sequential invoice number.
    """
    org_id = f"org_inv_{uuid.uuid4().hex[:6]}"
    inv_res = BillingService.generate_gst_tax_invoice(
        organization_id=org_id,
        plan_id="PLANT",
        billing_cycle="MONTHLY",
        customer_gstin="27AAACH1234F1Z5",  # Maharashtra (State Code 27)
        place_of_supply="Maharashtra (27)"
    )

    assert "HL-TAX-2026-" in inv_res["invoice_number"]
    assert inv_res["sac_code"] == "998313"
    assert os.path.exists(inv_res["pdf_path"])

    # Inspect PDF contents
    with open(inv_res["pdf_path"], "rb") as f:
        pdf_bytes = f.read()

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_text = doc[0].get_text()
    doc.close()

    assert "HEATLEDGER AI · TAX INVOICE" in page_text
    assert "SAC Code: 998313" in page_text
    assert "27AAACH1234F1Z5" in page_text
    assert "Maharashtra (27)" in page_text
    # Maharashtra is inter-state relative to WB (19) -> IGST 18%
    assert "IGST @ 18.0%:" in page_text


def test_r1_7_day_grace_period_and_read_only_mode():
    """
    Prompt R1: Failed payment: 7-day grace period, then read-only mode (never delete data).
    """
    org_id = f"org_grace_{uuid.uuid4().hex[:6]}"
    BillingService.get_or_create_subscription(org_id)

    # Trigger payment.failed webhook
    event_id = f"evt_fail_{uuid.uuid4().hex[:10]}"
    payload = {
        "id": event_id,
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": f"pay_test_{uuid.uuid4().hex[:8]}",
                    "notes": {"organization_id": org_id}
                }
            }
        }
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = hmac.new(WEBHOOK_SECRET.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()

    BillingService.process_razorpay_webhook(payload, raw_body, signature, WEBHOOK_SECRET)

    sub = BillingService.get_or_create_subscription(org_id)
    assert sub["status"] == "PAST_DUE"
    assert sub["grace_period_until"] is not None

    # Within grace period: operations still allowed
    res_quota = BillingService.check_and_increment_quota(org_id)
    assert res_quota["allowed"] is True

    # Simulate past 7-day grace expiration
    expired_grace = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    with BillingService._lock:
        from billing_service import _get_db
        with _get_db() as conn:
            conn.execute(
                "UPDATE subscriptions SET grace_period_until = ? WHERE organization_id = ?",
                (expired_grace, org_id)
            )
            conn.commit()

    # Beyond grace: locked into read-only mode (PermissionError)
    with pytest.raises(PermissionError) as exc_info:
        BillingService.check_and_increment_quota(org_id)
    assert "Subscription locked: Payment past due beyond 7-day grace period" in str(exc_info.value)


def test_r1_subscription_cancellation_and_refund():
    """Prompt R1: Webhooks for subscription cancellation and refund note."""
    org_id = f"org_cancel_{uuid.uuid4().hex[:6]}"
    BillingService.get_or_create_subscription(org_id)

    # 1. Test subscription.cancelled
    cancel_payload = {
        "id": f"evt_cancel_{uuid.uuid4().hex[:8]}",
        "event": "subscription.cancelled",
        "payload": {
            "subscription": {
                "entity": {
                    "id": "sub_rzp_cancel_test",
                    "notes": {"organization_id": org_id}
                }
            }
        }
    }
    cancel_raw = json.dumps(cancel_payload).encode("utf-8")
    cancel_sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), cancel_raw, hashlib.sha256).hexdigest()

    BillingService.process_razorpay_webhook(cancel_payload, cancel_raw, cancel_sig, WEBHOOK_SECRET)
    sub = BillingService.get_or_create_subscription(org_id)
    assert sub["status"] == "CANCELED"

    # 2. Test refund.processed
    pay_id = f"pay_test_refund_{uuid.uuid4().hex[:6]}"
    inv = BillingService.generate_gst_tax_invoice(
        organization_id=org_id,
        plan_id="PLANT",
        razorpay_payment_id=pay_id
    )

    refund_payload = {
        "id": f"evt_refund_{uuid.uuid4().hex[:8]}",
        "event": "refund.processed",
        "payload": {
            "refund": {
                "entity": {
                    "payment_id": pay_id,
                    "amount": 1179882
                }
            }
        }
    }
    refund_raw = json.dumps(refund_payload).encode("utf-8")
    refund_sig = hmac.new(WEBHOOK_SECRET.encode("utf-8"), refund_raw, hashlib.sha256).hexdigest()

    BillingService.process_razorpay_webhook(refund_payload, refund_raw, refund_sig, WEBHOOK_SECRET)
    inv_updated = BillingService.get_invoice(inv["invoice_id"])
    assert inv_updated["payment_status"] == "REFUNDED"
