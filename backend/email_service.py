"""
HEATLEDGER AI: Transactional Email Engine with Resend (Prompt R2)
Specification:
1. Mailer Interface: ResendMailer (live), ConsoleMailer (dev), TestMailer (unit testing).
2. Domain Configuration: DKIM, SPF, and DMARC settings documented in RUNBOOK.md.
3. 10 Transactional Templates: All strictly under 80 words, one button each,
   HTML and text parts, zero tracking pixels, no certificate contents or personal data in body.
4. Non-essential mail includes one-click unsubscribe token & link.
5. Per-organization daily sending caps and bounce/complaint suppression list.
"""

import os
import io
import re
import json
import uuid
import time
import logging
import threading
import secrets
import sys
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH

logger = logging.getLogger("heatledger.email")

BRAND_NAME = os.getenv("BRAND_NAME", "HeatLedger")
APP_URL = os.getenv("APP_URL", "https://app.heatledger.ai")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL", "support@heatledger.ai")
FROM_EMAIL = os.getenv("FROM_EMAIL", f"{BRAND_NAME} <notifications@mail.heatledger.ai>")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")

# Process-wide shared outbox so dual imports ('email_service' vs 'backend.email_service') observe identical messages
if not hasattr(sys, "_hl_email_test_outbox"):
    setattr(sys, "_hl_email_test_outbox", [])


class EmailService:
    _lock = threading.RLock()
    _tables_initialized: bool = False
    test_outbox: List[Dict[str, Any]] = getattr(sys, "_hl_email_test_outbox")

    @classmethod
    def init_tables(cls):
        is_test_runner = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if cls._tables_initialized and not is_test_runner:
            return
        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS suppressed_emails (
                        email TEXT PRIMARY KEY,
                        reason TEXT NOT NULL,
                        source TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS email_dispatch_logs (
                        id TEXT PRIMARY KEY,
                        organization_id TEXT NOT NULL,
                        recipient TEXT NOT NULL,
                        template_name TEXT NOT NULL,
                        subject TEXT NOT NULL,
                        status TEXT NOT NULL,
                        message_id TEXT,
                        created_at TEXT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS email_unsubscribes (
                        token TEXT PRIMARY KEY,
                        email TEXT NOT NULL,
                        category TEXT NOT NULL,
                        created_at TEXT NOT NULL
                    );
                """)
                conn.commit()
                cls._tables_initialized = True

    @classmethod
    def is_suppressed(cls, email: str) -> bool:
        """Checks if recipient is on the bounce/complaint suppression list."""
        cls.init_tables()
        clean = email.strip().lower()
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM suppressed_emails WHERE email = ?", (clean,))
            return cur.fetchone() is not None

    @classmethod
    def suppress_email(cls, email: str, reason: str = "BOUNCE", source: str = "WEBHOOK") -> None:
        """Adds an email address to the suppression list."""
        cls.init_tables()
        clean = email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()
        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    INSERT INTO suppressed_emails (email, reason, source, created_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT (email) DO UPDATE SET
                        reason = excluded.reason,
                        source = excluded.source,
                        created_at = excluded.created_at
                """, (clean, reason, source, now_iso))
                conn.commit()
        logger.warning(f"[Email Suppression] Address {clean} suppressed due to {reason}.")

    @classmethod
    def check_org_daily_cap(cls, organization_id: str, max_daily: int = 100) -> bool:
        """Enforces daily sending cap per organization (rate limit)."""
        cls.init_tables()
        now = datetime.now(timezone.utc)
        today_prefix = now.strftime("%Y-%m-%d")
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("""
                SELECT COUNT(*) as cnt FROM email_dispatch_logs
                WHERE organization_id = ? AND created_at >= ?
            """, (organization_id, today_prefix))
            row = cur.fetchone()
            count = row["cnt"] if row else 0
            return count < max_daily

    # ==============================================================================
    # TEMPLATE RENDERERS (All strictly under 80 words, one button, HTML + Text)
    # ==============================================================================

    @classmethod
    def render_welcome(cls, name: str, app_url: str = APP_URL) -> Tuple[str, str, str]:
        subject = f"Welcome to {BRAND_NAME}"
        text = (
            f"Welcome to {BRAND_NAME}, {name}.\n\n"
            f"Your plant workspace is ready. You can now review mill certificates, "
            f"check melt-and-pour country evidence, and link heats to shipments.\n\n"
            f"Get Started: {app_url}\n\n"
            f"Reply to this email if you need help."
        )
        html = cls._wrap_html(
            title=f"Welcome to {BRAND_NAME}",
            body_p=f"Hello {name}, your plant workspace is ready. Review mill test certificates, check melt-and-pour country evidence, and prepare buyer packs.",
            button_text="Get Started",
            button_url=app_url
        )
        return subject, text, html

    @classmethod
    def render_email_verification(cls, verify_url: str, otp_code: Optional[str] = None) -> Tuple[str, str, str]:
        subject = f"Verify your email address for {BRAND_NAME}"
        otp_text = f"\nYour 6-digit verification code: {otp_code}\n" if otp_code else ""
        otp_html = f" Your 6-digit verification code is <strong>{otp_code}</strong>." if otp_code else ""
        text = (
            f"Verify your email address for {BRAND_NAME}.\n"
            f"{otp_text}\n"
            f"Confirm your email address using the code above or the link below. "
            f"Expires in 24 hours.\n\n"
            f"Verify Email: {verify_url}\n\n"
            f"If you did not sign up, ignore this email."
        )
        html = cls._wrap_html(
            title="Verify Your Email Address",
            body_p=f"Confirm your email address to activate your {BRAND_NAME} account.{otp_html} Valid for 24 hours.",
            button_text="Verify Email",
            button_url=verify_url
        )
        return subject, text, html

    @classmethod
    def render_password_reset(cls, reset_url: str, otp_code: Optional[str] = None) -> Tuple[str, str, str]:
        subject = f"Reset your {BRAND_NAME} password"
        otp_text = f"\nYour 6-digit reset code: {otp_code}\n" if otp_code else ""
        otp_html = f" Your 6-digit reset code is <strong>{otp_code}</strong>." if otp_code else ""
        text = (
            f"Reset your {BRAND_NAME} password.\n"
            f"{otp_text}\n"
            f"We received a request to reset your password. Enter the code above or click the link below. "
            f"Valid for 15 minutes.\n\n"
            f"Reset Password: {reset_url}\n\n"
            f"If you did not request this, contact support immediately."
        )
        html = cls._wrap_html(
            title="Password Reset Request",
            body_p=f"We received a request to reset your {BRAND_NAME} password.{otp_html} Use the code or click below. Valid for 15 minutes.",
            button_text="Reset Password",
            button_url=reset_url
        )
        return subject, text, html

    @classmethod
    def render_team_invite(cls, inviter_name: str, plant_name: str, role: str, invite_url: str) -> Tuple[str, str, str]:
        subject = f"You are invited to join {plant_name} on {BRAND_NAME}"
        text = (
            f"You are invited to join {plant_name} on {BRAND_NAME}.\n\n"
            f"{inviter_name} invited you to join the team as {role}. "
            f"Click the link below to accept and set up your account.\n\n"
            f"Accept Invitation: {invite_url}\n\n"
            f"This link expires in 7 days."
        )
        html = cls._wrap_html(
            title="Team Invitation",
            body_p=f"{inviter_name} has invited you to join {plant_name} on {BRAND_NAME} with the role of {role}.",
            button_text="Accept Invitation",
            button_url=invite_url
        )
        return subject, text, html

    @classmethod
    def render_share_link(cls, shipment_id: str, share_url: str, expires_days: int = 30) -> Tuple[str, str, str]:
        subject = f"{BRAND_NAME}: Customs pack ready for shipment {shipment_id}"
        text = (
            f"Customs evidence pack for shipment {shipment_id}.\n\n"
            f"The buyer-ready documentation pack for shipment {shipment_id} has been prepared on {BRAND_NAME}. "
            f"View the sealed manifest and certificates below.\n\n"
            f"View Shipment Pack: {share_url}\n\n"
            f"This link expires in {expires_days} days."
        )
        html = cls._wrap_html(
            title=f"Shipment {shipment_id} Customs Pack",
            body_p=f"A buyer-ready customs evidence pack has been prepared for shipment {shipment_id} on {BRAND_NAME}. View certificates and digital seal.",
            button_text="View Shipment Pack",
            button_url=share_url
        )
        return subject, text, html

    @classmethod
    def render_supplier_request(cls, product_name: str, request_url: str, deadline: str) -> Tuple[str, str, str]:
        subject = f"{BRAND_NAME}: CBAM precursor data request: {product_name}"
        text = (
            f"CBAM precursor data request for {product_name} on {BRAND_NAME}.\n\n"
            f"Please submit actual embedded emissions data for recent shipments of {product_name}. "
            f"The requested deadline is {deadline}.\n\n"
            f"Submit Data: {request_url}\n\n"
            f"Your submission keeps supply chains customs-ready."
        )
        html = cls._wrap_html(
            title="CBAM Precursor Data Request",
            body_p=f"Please provide specific embedded emissions data for recent supplies of {product_name} on {BRAND_NAME}. Requested deadline: {deadline}.",
            button_text="Submit Data",
            button_url=request_url
        )
        return subject, text, html

    @classmethod
    def render_invoice(cls, invoice_no: str, amount_inr: float, invoice_url: str) -> Tuple[str, str, str]:
        subject = f"Tax Invoice {invoice_no} from {BRAND_NAME}"
        text = (
            f"Tax Invoice {invoice_no} from {BRAND_NAME}.\n\n"
            f"Thank you for your payment of INR {amount_inr:,.2f}. "
            f"Your sequential GST tax invoice is ready to download.\n\n"
            f"Download Invoice: {invoice_url}\n\n"
            f"SAC 998313 and GST details are included."
        )
        html = cls._wrap_html(
            title=f"Tax Invoice {invoice_no}",
            body_p=f"Payment of INR {amount_inr:,.2f} received with thanks. Your sequential GST tax invoice is ready.",
            button_text="Download Invoice",
            button_url=invoice_url
        )
        return subject, text, html

    @classmethod
    def render_payment_failed(cls, days_left: int, update_url: str) -> Tuple[str, str, str]:
        subject = f"Payment failed for {BRAND_NAME} subscription"
        text = (
            f"Payment failed for your {BRAND_NAME} subscription.\n\n"
            f"We could not process your subscription renewal. You have {days_left} days "
            f"in your grace period before the account becomes read-only.\n\n"
            f"Update Payment Method: {update_url}\n\n"
            f"Your past data is safely preserved."
        )
        html = cls._wrap_html(
            title="Subscription Payment Failed",
            body_p=f"We could not process your renewal payment. You have {days_left} days of grace remaining before your workspace becomes read-only.",
            button_text="Update Billing",
            button_url=update_url
        )
        return subject, text, html

    @classmethod
    def render_trial_ending(cls, days_left: int, upgrade_url: str) -> Tuple[str, str, str]:
        subject = f"Your {BRAND_NAME} pilot ends in {days_left} days"
        text = (
            f"Your {BRAND_NAME} pilot trial ends in {days_left} days.\n\n"
            f"To keep processing mill certificates and generating sealed buyer packs without interruption, "
            f"choose a plant plan today.\n\n"
            f"Choose Plan: {upgrade_url}\n\n"
            f"Contact support if you need an extension."
        )
        html = cls._wrap_html(
            title="Pilot Trial Ending Soon",
            body_p=f"Your {BRAND_NAME} 30-day pilot trial ends in {days_left} days. Select a subscription plan to continue without interruption.",
            button_text="Choose Plan",
            button_url=upgrade_url
        )
        return subject, text, html

    @classmethod
    def render_shipments_at_risk_digest(cls, at_risk_count: int, dashboard_url: str, unsubscribe_url: str) -> Tuple[str, str, str]:
        subject = f"{BRAND_NAME} Digest: {at_risk_count} shipment(s) at risk"
        text = (
            f"Weekly Compliance Digest from {BRAND_NAME}.\n\n"
            f"{at_risk_count} shipment(s) are missing required melt-and-pour country evidence "
            f"or pending sign-off. Please review before dispatch.\n\n"
            f"Review Shipments: {dashboard_url}\n\n"
            f"Unsubscribe from weekly digest: {unsubscribe_url}"
        )
        html = cls._wrap_html(
            title="Weekly Compliance Digest",
            body_p=f"We identified {at_risk_count} shipment(s) missing mandatory melt-and-pour country evidence or awaiting sign-off. Review before customs dispatch.",
            button_text="Review Shipments",
            button_url=dashboard_url,
            unsubscribe_url=unsubscribe_url
        )
        return subject, text, html

    # ==============================================================================
    # HTML WRAPPER (Responsive, Minimal, Touch-friendly button, No tracking pixels)
    # ==============================================================================

    @classmethod
    def _wrap_html(
        cls,
        title: str,
        body_p: str,
        button_text: str,
        button_url: str,
        unsubscribe_url: Optional[str] = None
    ) -> str:
        footer_links = f"<p style='color:#64748b;font-size:11px;margin-top:24px;'>{BRAND_NAME} · Steel Compliance Operating System"
        if unsubscribe_url:
            footer_links += f" · <a href='{unsubscribe_url}' style='color:#64748b;text-decoration:underline;'>Unsubscribe</a>"
        footer_links += "</p>"

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
</head>
<body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <div style="font-weight:700;font-size:18px;color:#0f172a;margin-bottom:16px;">{BRAND_NAME}</div>
    <h1 style="font-size:18px;font-weight:600;margin:0 0 12px 0;color:#0f172a;">{title}</h1>
    <p style="font-size:14px;line-height:1.5;color:#334155;margin:0 0 24px 0;">{body_p}</p>
    <div style="margin:24px 0;">
      <a href="{button_url}" style="display:inline-block;padding:12px 24px;background-color:#0f172a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;min-height:44px;box-sizing:border-box;">{button_text}</a>
    </div>
    {footer_links}
  </div>
</body>
</html>"""

    # ==============================================================================
    # DISPATCH ENGINE (Resend, Console, Test outbox)
    # ==============================================================================

    @classmethod
    def send_email(
        cls,
        to: str,
        subject: str,
        html: str,
        text: str,
        organization_id: str = "org_system",
        template_name: str = "custom",
        attachments: Optional[List[Dict[str, Any]]] = None,
        is_essential: bool = True,
        max_daily: int = 100
    ) -> Dict[str, Any]:
        """
        Dispatches transactional email.
        - Checks suppression list.
        - Checks organization daily quota.
        - Selects Resend (production with API key) or Console/Test mailer.
        """
        cls.init_tables()
        clean_to = to.strip().lower()

        if cls.is_suppressed(clean_to):
            logger.info(f"[Email Suppressed] Skipped dispatch to {clean_to} (address suppressed).")
            return {"status": "suppressed", "recipient": clean_to}

        if not cls.check_org_daily_cap(organization_id, max_daily=max_daily):
            raise ValueError(f"Organization {organization_id} has exceeded its daily email quota.")

        message_id = f"msg_{secrets.token_hex(12)}"
        now_iso = datetime.now(timezone.utc).isoformat()
        api_key = os.getenv("RESEND_API_KEY") or RESEND_API_KEY
        env_mode = os.getenv("ENV", "development").strip().lower()
        in_pytest = bool(os.getenv("PYTEST_CURRENT_TEST")) or env_mode in ("test", "testing")
        use_live_resend = bool(api_key and api_key.startswith("re_") and not in_pytest)

        if use_live_resend:
            try:
                import httpx
                payload = {
                    "from": FROM_EMAIL,
                    "to": [clean_to],
                    "subject": subject,
                    "html": html,
                    "text": text
                }
                if attachments:
                    payload["attachments"] = attachments

                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                res = httpx.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10.0)
                if res.status_code in (200, 201):
                    res_data = res.json()
                    message_id = res_data.get("id", message_id)
                else:
                    logger.error(f"[Resend API Error] Status {res.status_code}: {res.text}")
            except Exception as e:
                logger.error(f"[Resend Dispatch Failed]: {e}")
        else:
            # Dev / Test mode
            record = {
                "id": message_id,
                "to": clean_to,
                "subject": subject,
                "text": text,
                "html": html,
                "template_name": template_name,
                "organization_id": organization_id,
                "sent_at": now_iso
            }
            cls.test_outbox.append(record)
            logger.info(f"[Mailer: Console/Test] Sent '{subject}' to {clean_to} (ID: {message_id})")
            if not os.getenv("PYTEST_CURRENT_TEST"):
                logger.info(f"[Mailer: Console Body for {clean_to}]\n{text}")

        # Record in audit dispatch log
        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    INSERT INTO email_dispatch_logs (
                        id, organization_id, recipient, template_name, subject, status, message_id, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'SENT', ?, ?)
                """, (f"disp_{secrets.token_hex(8)}", organization_id, clean_to, template_name, subject, message_id, now_iso))
                conn.commit()

        return {
            "status": "sent",
            "message_id": message_id,
            "recipient": clean_to,
            "subject": subject
        }

    @classmethod
    def generate_unsubscribe_token(cls, email: str, category: str = "weekly_digest") -> str:
        """Generates a secure one-click unsubscribe token."""
        cls.init_tables()
        token = secrets.token_urlsafe(24)
        now_iso = datetime.now(timezone.utc).isoformat()
        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    INSERT INTO email_unsubscribes (token, email, category, created_at)
                    VALUES (?, ?, ?, ?)
                """, (token, email.strip().lower(), category, now_iso))
                conn.commit()
        return token

    @classmethod
    def process_unsubscribe(cls, token: str) -> Optional[str]:
        """Processes one-click unsubscribe token and adds to suppression."""
        cls.init_tables()
        with cls._lock:
            with _get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT email, category FROM email_unsubscribes WHERE token = ?", (token,))
                row = cur.fetchone()
                if not row:
                    return None
                email = row["email"]
                category = row["category"]
                cls.suppress_email(email, reason=f"UNSUBSCRIBE_{category.upper()}", source="USER_LINK")
                return email
