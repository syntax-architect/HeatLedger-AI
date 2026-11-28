"""
HEATLEDGER AI: Billing, Plan Limits, Razorpay Webhooks & GST Invoice Engine (Prompt B9)
Specification:
- Indian GST Compliance: SAC 998313 (IT Software Services), 18% GST (CGST 9% + SGST 9% or IGST 18%).
- Razorpay webhook signature verification (HMAC-SHA256) and replay protection (idempotency).
- Plan limit enforcement, proration, failed-payment 14-day grace period, and coupon discounts.
- GST invoice PDF generator with supplier/customer GSTIN, place of supply, and QR code.
"""

import os
import re
import json
import threading
import time
import uuid
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple, Union, Union
import pymupdf as fitz

try:
    from backend.billing_invoices import (
        calculate_gst_breakdown as _inv_calculate_gst_breakdown,
        generate_gst_tax_invoice as _inv_generate_gst_tax_invoice,
        get_supplier_entity,
        load_plans_config as _load_plans_config,
        render_invoice_pdf as _inv_render_invoice_pdf,
    )
    from backend.db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from billing_invoices import (
        calculate_gst_breakdown as _inv_calculate_gst_breakdown,
        generate_gst_tax_invoice as _inv_generate_gst_tax_invoice,
        get_supplier_entity,
        load_plans_config as _load_plans_config,
        render_invoice_pdf as _inv_render_invoice_pdf,
    )
    from db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH

# HeatLedger Corporate & Tax Entity (Prompt Pack v5 Task 5.2: strictly from environment variables)
SAC_CODE = "998313"  # Information technology software services (CBAM compliance SaaS)
GST_RATE_PCT = 18.0

# Commercial Subscription Plans (canonical source: data/plans.json)
PLANS_JSON_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "plans.json")


def load_plans_config() -> Dict[str, Dict[str, Any]]:
    """Loads plans dynamically from plans.json with backward-compatible aliases."""
    return _load_plans_config(PLANS_JSON_PATH)


PLANS: Dict[str, Dict[str, Any]] = load_plans_config()
GRACE_PERIOD_DAYS = 7  # Prompt R1 Requirement: 7-day grace period

VALID_COUPONS: Dict[str, Dict[str, Any]] = {
    "EEPC_INDIA_20": {"discount_pct": 20.0, "description": "EEPC India Steel Exporters 20% Subsidy"},
    "HOWRAH_MSME": {"discount_pct": 25.0, "description": "Howrah Foundry & Forging Cluster Initiative"},
    "CBAM2026": {"discount_pct": 15.0, "description": "Early Definitive Regime Onboarding Discount"}
}


class PlanLimitExceededError(Exception):
    def __init__(self, current_usage: int, limit: int, plan_id: str):
        super().__init__(f"Monthly certificate limit of {limit} reached for plan {plan_id} ({current_usage}/{limit} used). Upgrade to continue.")
        self.current_usage = current_usage
        self.limit = limit
        self.plan_id = plan_id


class BillingService:
    _lock = threading.RLock()

    @classmethod
    def init_tables(cls):
        with cls._lock:
            with _get_db() as conn:
                # Subscriptions
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS subscriptions (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT NOT NULL UNIQUE,
                        plan_id TEXT NOT NULL,
                        billing_cycle TEXT NOT NULL CHECK(billing_cycle IN ('MONTHLY', 'ANNUAL')),
                        status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIAL')),
                        certificates_used INTEGER NOT NULL DEFAULT 0,
                        certificates_limit INTEGER NOT NULL,
                        current_period_start TEXT NOT NULL,
                        current_period_end TEXT NOT NULL,
                        grace_period_until TEXT,
                        razorpay_subscription_id TEXT,
                        created_at TEXT NOT NULL
                    );
                """)

                # Invoices with Indian GST breakdown
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS invoices (
                        id TEXT PRIMARY KEY,
                        invoice_number TEXT UNIQUE NOT NULL,
                        organization_id TEXT NOT NULL,
                        plan_id TEXT NOT NULL,
                        billing_cycle TEXT NOT NULL,
                        base_amount_inr REAL NOT NULL,
                        discount_inr REAL NOT NULL DEFAULT 0,
                        taxable_amount_inr REAL NOT NULL,
                        gst_rate_pct REAL NOT NULL DEFAULT 18.0,
                        cgst_inr REAL NOT NULL DEFAULT 0,
                        sgst_inr REAL NOT NULL DEFAULT 0,
                        igst_inr REAL NOT NULL DEFAULT 0,
                        total_amount_inr REAL NOT NULL,
                        sac_code TEXT NOT NULL DEFAULT '998313',
                        supplier_gstin TEXT NOT NULL,
                        customer_gstin TEXT,
                        place_of_supply TEXT NOT NULL,
                        payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PENDING', 'FAILED', 'REFUNDED')),
                        razorpay_payment_id TEXT,
                        pdf_path TEXT,
                        created_at TEXT NOT NULL
                    );
                """)

                # Check if old SQLite table schema needs migration to include REFUNDED
                try:
                    from db.connection import is_postgres as _is_pg
                except ImportError:
                    from backend.db.connection import is_postgres as _is_pg

                if not _is_pg():
                    cur = conn.cursor()
                    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'")
                    row = cur.fetchone()
                    if row and row[0] and "REFUNDED" not in row[0]:
                        conn.execute("ALTER TABLE invoices RENAME TO invoices_old")
                        conn.execute("""
                            CREATE TABLE invoices (
                                id TEXT PRIMARY KEY,
                                invoice_number TEXT UNIQUE NOT NULL,
                                organization_id TEXT NOT NULL,
                                plan_id TEXT NOT NULL,
                                billing_cycle TEXT NOT NULL,
                                base_amount_inr REAL NOT NULL,
                                discount_inr REAL NOT NULL DEFAULT 0,
                                taxable_amount_inr REAL NOT NULL,
                                gst_rate_pct REAL NOT NULL DEFAULT 18.0,
                                cgst_inr REAL NOT NULL DEFAULT 0,
                                sgst_inr REAL NOT NULL DEFAULT 0,
                                igst_inr REAL NOT NULL DEFAULT 0,
                                total_amount_inr REAL NOT NULL,
                                sac_code TEXT NOT NULL DEFAULT '998313',
                                supplier_gstin TEXT NOT NULL,
                                customer_gstin TEXT,
                                place_of_supply TEXT NOT NULL,
                                payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'PENDING', 'FAILED', 'REFUNDED')),
                                razorpay_payment_id TEXT,
                                pdf_path TEXT,
                                created_at TEXT NOT NULL
                            );
                        """)
                        conn.execute("INSERT INTO invoices SELECT * FROM invoices_old")
                        conn.execute("DROP TABLE invoices_old")

                    # Check if legacy invoices table has strict CHECK constraint
                    cur = conn.cursor()
                    cur.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='invoices'")
                    row = cur.fetchone()
                    if row and row[0] and "REFUNDED" not in row[0] and "CHECK" in row[0]:
                        conn.execute("ALTER TABLE invoices RENAME TO invoices_old")
                        conn.execute("""
                            CREATE TABLE invoices (
                                id TEXT PRIMARY KEY,
                                invoice_number TEXT UNIQUE NOT NULL,
                                organization_id TEXT NOT NULL,
                                plan_id TEXT NOT NULL,
                                billing_cycle TEXT NOT NULL,
                                base_amount_inr REAL NOT NULL,
                                discount_inr REAL NOT NULL DEFAULT 0,
                                taxable_amount_inr REAL NOT NULL,
                                gst_rate_pct REAL NOT NULL DEFAULT 18.0,
                                cgst_inr REAL NOT NULL DEFAULT 0,
                                sgst_inr REAL NOT NULL DEFAULT 0,
                                igst_inr REAL NOT NULL DEFAULT 0,
                                total_amount_inr REAL NOT NULL,
                                sac_code TEXT NOT NULL DEFAULT '998313',
                                supplier_gstin TEXT NOT NULL,
                                customer_gstin TEXT,
                                place_of_supply TEXT NOT NULL,
                                payment_status TEXT NOT NULL,
                                razorpay_payment_id TEXT,
                                pdf_path TEXT,
                                created_at TEXT NOT NULL
                            );
                        """)
                        conn.execute("INSERT INTO invoices SELECT * FROM invoices_old")
                        conn.execute("DROP TABLE invoices_old")
                        conn.commit()

                # Idempotent Webhook Events (blocks replay attacks)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS webhook_events (
                        event_id TEXT PRIMARY KEY,
                        event_type TEXT NOT NULL,
                        payload_hash TEXT NOT NULL,
                        processed_at TEXT NOT NULL
                    );
                """)
                conn.commit()

    @classmethod
    def get_founding_offer_status(cls) -> Dict[str, Any]:
        """
        Prompt B1: Founding offer, first 5 plants only.
        Counter shown honestly ('2 of 5 left') from the database.
        """
        cls.init_tables()
        try:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT COUNT(*) as cnt FROM subscriptions WHERE plan_id = 'FOUNDING_OFFER' AND status = 'ACTIVE'"
                )
                row = cur.fetchone()
                claimed = int(row["cnt"]) if row else 0
                total_slots = 5
                remaining = max(0, total_slots - claimed)
                return {
                    "total_slots": total_slots,
                    "claimed_slots": claimed,
                    "remaining_slots": remaining,
                    "display_text": f"{remaining} of {total_slots} left",
                    "is_available": remaining > 0
                }
        except Exception:
            return {
                "total_slots": 5,
                "claimed_slots": 0,
                "remaining_slots": 5,
                "display_text": "5 of 5 left",
                "is_available": True
            }

    @classmethod
    def check_upi_autopay_eligibility(cls, amount_inr: float) -> Dict[str, Any]:
        """
        Prompt B1: UPI AutoPay is capped near 15,000 per debit.
        Plant Pro and annual plans use cards, e-NACH, or bank transfer with a Razorpay payment link.
        """
        UPI_AUTOPAY_MAX_LIMIT_INR = 15000.0
        if amount_inr > UPI_AUTOPAY_MAX_LIMIT_INR:
            return {
                "is_upi_autopay_eligible": False,
                "supported_methods": ["card", "enach", "bank_transfer"],
                "notice": f"Amount (₹{amount_inr:,.0f}) exceeds ₹{UPI_AUTOPAY_MAX_LIMIT_INR:,.0f} UPI AutoPay limit. Please pay using Corporate Card, e-NACH, or Bank Transfer."
            }
        return {
            "is_upi_autopay_eligible": True,
            "supported_methods": ["upi_autopay", "upi", "card", "netbanking"],
            "notice": "Eligible for UPI AutoPay instant mandate."
        }

    @classmethod
    def get_or_create_subscription(cls, organization_id: str) -> Dict[str, Any]:
        """Fetches active subscription or initializes Free Pilot Trial."""
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM subscriptions WHERE organization_id = ?", (organization_id,))
                row = cur.fetchone()
                if row:
                    return dict(row)

                # Initialize default trial
                sub_id = f"sub_{uuid.uuid4().hex[:12]}"
                plan = PLANS["PILOT_TRIAL"]
                now_dt = datetime.now(timezone.utc)
                start_iso = now_dt.isoformat()
                end_iso = (now_dt + timedelta(days=30)).isoformat()

                conn.execute("""
                    INSERT INTO subscriptions (
                        id, organization_id, plan_id, billing_cycle, status,
                        certificates_used, certificates_limit, current_period_start,
                        current_period_end, created_at
                    ) VALUES (?, ?, 'PILOT_TRIAL', 'MONTHLY', 'TRIAL', 0, ?, ?, ?, ?)
                """, (sub_id, organization_id, plan["certificate_limit"], start_iso, end_iso, start_iso))
                conn.commit()

                cur.execute("SELECT * FROM subscriptions WHERE id = ?", (sub_id,))
                return dict(cur.fetchone())

    @classmethod
    def update_subscription_tier(cls, organization_id: str, new_plan_id: str, new_limit: int) -> Dict[str, Any]:
        """Upgrades or modifies subscription tier and updates certificate limit."""
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                sub = cls.get_or_create_subscription(organization_id)
                now_dt = datetime.now(timezone.utc)
                start_iso = now_dt.isoformat()
                end_iso = (now_dt + timedelta(days=30)).isoformat()
                conn.execute("""
                    UPDATE subscriptions
                    SET plan_id = ?, certificates_limit = ?, status = 'ACTIVE',
                        current_period_start = ?, current_period_end = ?
                    WHERE organization_id = ?
                """, (new_plan_id, new_limit, start_iso, end_iso, organization_id))
                conn.commit()
                cur = conn.cursor()
                cur.execute("SELECT * FROM subscriptions WHERE organization_id = ?", (organization_id,))
                return dict(cur.fetchone())

    @classmethod
    def check_and_increment_quota(cls, organization_id: str) -> Dict[str, Any]:
        """
        Enforces plan limits.
        Raises PlanLimitExceededError if limit is reached.
        Otherwise increments certificates_used and returns quota telemetry.
        """
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                sub = cls.get_or_create_subscription(organization_id)

                # Check if past due beyond grace period
                if sub["status"] == "PAST_DUE" and sub["grace_period_until"]:
                    grace_dt = datetime.fromisoformat(sub["grace_period_until"])
                    if datetime.now(timezone.utc) > grace_dt:
                        raise PermissionError(f"Subscription locked: Payment past due beyond {GRACE_PERIOD_DAYS}-day grace period. Settle outstanding invoice to resume.")

                used = sub["certificates_used"]
                limit = sub["certificates_limit"]

                if used >= limit:
                    raise PlanLimitExceededError(used, limit, sub["plan_id"])

                new_used = used + 1
                conn.execute(
                    "UPDATE subscriptions SET certificates_used = ? WHERE id = ?",
                    (new_used, sub["id"])
                )
                conn.commit()

                usage_pct = (new_used / limit) * 100 if limit > 0 else 100
                warning = None
                if usage_pct >= 100:
                    warning = "QUOTA_EXHAUSTED"
                elif usage_pct >= 80:
                    warning = "QUOTA_WARNING_80_PERCENT"

                return {
                    "allowed": True,
                    "certificates_used": new_used,
                    "certificates_limit": limit,
                    "remaining": limit - new_used,
                    "usage_pct": round(usage_pct, 1),
                    "warning": warning,
                    "plan_id": sub["plan_id"]
                }

    @classmethod
    def calculate_gst_breakdown(
        cls,
        base_amount_inr: float,
        place_of_supply_state_code: str,
        discount_inr: float = 0.0,
    ) -> Dict[str, Any]:
        return _inv_calculate_gst_breakdown(
            base_amount_inr=base_amount_inr,
            place_of_supply_state_code=place_of_supply_state_code,
            discount_inr=discount_inr,
            sac_code=SAC_CODE,
            gst_rate_pct=GST_RATE_PCT,
        )

    @classmethod
    def generate_gst_tax_invoice(
        cls,
        organization_id: str,
        plan_id: str,
        billing_cycle: str = "MONTHLY",
        customer_gstin: Optional[str] = None,
        place_of_supply: str = "West Bengal (19)",
        coupon_code: Optional[str] = None,
        razorpay_payment_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        supplier = get_supplier_entity()
        return _inv_generate_gst_tax_invoice(
            billing_cls=cls,
            supplier=supplier,
            plans=PLANS,
            valid_coupons=VALID_COUPONS,
            sac_code=SAC_CODE,
            base_dir=os.path.dirname(os.path.abspath(__file__)),
            organization_id=organization_id,
            plan_id=plan_id,
            billing_cycle=billing_cycle,
            customer_gstin=customer_gstin,
            place_of_supply=place_of_supply,
            coupon_code=coupon_code,
            razorpay_payment_id=razorpay_payment_id,
        )

    @classmethod
    def list_invoices(cls, organization_id: str) -> List[Dict[str, Any]]:
        """Returns all GST tax invoices for an organization."""
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                cur.execute(
                    "SELECT * FROM invoices WHERE organization_id = ? ORDER BY created_at DESC",
                    (organization_id,)
                )
                return [dict(row) for row in cur.fetchall()]

    @classmethod
    def get_invoice(cls, invoice_id: str) -> Optional[Dict[str, Any]]:
        """Fetches invoice record by id or invoice_number."""
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM invoices WHERE id = ? OR invoice_number = ?", (invoice_id, invoice_id))
                row = cur.fetchone()
                return dict(row) if row else None

    @classmethod
    def render_invoice_pdf(
        cls,
        invoice_number: str,
        date_str: str,
        plan_name: str,
        billing_cycle: str,
        tax: Dict[str, Any],
        customer_gstin: Optional[str],
        place_of_supply: str,
        razorpay_payment_id: Optional[str],
    ) -> bytes:
        return _inv_render_invoice_pdf(
            supplier=get_supplier_entity(),
            sac_code=SAC_CODE,
            invoice_number=invoice_number,
            date_str=date_str,
            plan_name=plan_name,
            billing_cycle=billing_cycle,
            tax=tax,
            customer_gstin=customer_gstin,
            place_of_supply=place_of_supply,
            razorpay_payment_id=razorpay_payment_id,
        )

    @classmethod
    def verify_webhook_signature(cls, raw_body: Union[bytes, str], signature_header: str, secret: str) -> bool:
        """Verifies Razorpay HMAC-SHA256 signature against webhook secret."""
        if not signature_header or not secret:
            return False
        body_bytes = raw_body.encode("utf-8") if isinstance(raw_body, str) else raw_body
        expected = hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature_header)

    @classmethod
    def process_razorpay_webhook(cls, event: Dict[str, Any], raw_body: bytes, signature: str, secret: str) -> Dict[str, Any]:
        """
        Idempotent Razorpay webhook processor.
        Handles: payment.captured, subscription.charged, subscription.halted, payment.failed
        """
        if not cls.verify_webhook_signature(raw_body, signature, secret):
            raise PermissionError("Invalid Razorpay webhook signature")

        event_id = event.get("id") or str(uuid.uuid4())
        event_type = event.get("event")

        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                cur.execute("SELECT event_id FROM webhook_events WHERE event_id = ?", (event_id,))
                if cur.fetchone():
                    # Idempotent response for replayed webhook
                    return {"status": "ignored", "reason": "event_already_processed", "event_id": event_id}

                payload_hash = hashlib.sha256(raw_body).hexdigest()
                now_iso = datetime.now(timezone.utc).isoformat()
                conn.execute(
                    "INSERT INTO webhook_events (event_id, event_type, payload_hash, processed_at) VALUES (?, ?, ?, ?)",
                    (event_id, event_type, payload_hash, now_iso)
                )

                # Process event business logic
                if event_type in ("payment.captured", "order.paid"):
                    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
                    if not entity:
                        entity = event.get("payload", {}).get("order", {}).get("entity", {})
                    notes = entity.get("notes", {})
                    org_id = notes.get("organization_id")
                    plan_id = notes.get("plan_id", "PLANT")
                    plan = PLANS.get(plan_id, PLANS.get("PLANT"))
                    cert_limit = plan.get("certificate_limit") or plan.get("certificate_limit_monthly", 100)
                    if org_id:
                        now_dt = datetime.now(timezone.utc)
                        start_iso = now_dt.isoformat()
                        end_iso = (now_dt + timedelta(days=plan.get("validity_days", 30))).isoformat()
                        conn.execute("""
                            UPDATE subscriptions
                            SET plan_id = ?, status = 'ACTIVE', certificates_used = 0,
                                certificates_limit = ?, current_period_start = ?,
                                current_period_end = ?, grace_period_until = NULL
                            WHERE organization_id = ?
                        """, (plan_id, cert_limit, start_iso, end_iso, org_id))
                        order_id = entity.get("order_id") or entity.get("id")
                        pay_id = entity.get("id")
                        if order_id:
                            conn.execute("""
                                UPDATE invoices
                                SET payment_status = 'PAID', razorpay_payment_id = ?
                                WHERE id = ? OR razorpay_payment_id = ?
                            """, (pay_id, order_id, order_id))

                elif event_type == "subscription.charged":
                    entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
                    notes = entity.get("notes", {})
                    org_id = notes.get("organization_id")
                    if org_id:
                        now_dt = datetime.now(timezone.utc)
                        start_iso = now_dt.isoformat()
                        end_iso = (now_dt + timedelta(days=30)).isoformat()
                        conn.execute("""
                            UPDATE subscriptions
                            SET status = 'ACTIVE', certificates_used = 0,
                                current_period_start = ?, current_period_end = ?,
                                grace_period_until = NULL
                            WHERE organization_id = ?
                        """, (start_iso, end_iso, org_id))

                elif event_type == "subscription.cancelled":
                    entity = event.get("payload", {}).get("subscription", {}).get("entity", {})
                    notes = entity.get("notes", {})
                    org_id = notes.get("organization_id")
                    if org_id:
                        conn.execute("UPDATE subscriptions SET status = 'CANCELED' WHERE organization_id = ?", (org_id,))

                elif event_type == "payment.failed":
                    # Grant 7-day grace period (Prompt R1)
                    entity = event.get("payload", {}).get("payment", {}).get("entity", {})
                    notes = entity.get("notes", {})
                    org_id = notes.get("organization_id")
                    if org_id:
                        grace_until = (datetime.now(timezone.utc) + timedelta(days=GRACE_PERIOD_DAYS)).isoformat()
                        conn.execute("""
                            UPDATE subscriptions
                            SET status = 'PAST_DUE', grace_period_until = ?
                            WHERE organization_id = ?
                        """, (grace_until, org_id))

                elif event_type == "refund.processed":
                    entity = event.get("payload", {}).get("refund", {}).get("entity", {})
                    payment_id = entity.get("payment_id")
                    if payment_id:
                        conn.execute("UPDATE invoices SET payment_status = 'REFUNDED' WHERE razorpay_payment_id = ?", (payment_id,))

                conn.commit()

        return {"status": "processed", "event_id": event_id, "event_type": event_type}
