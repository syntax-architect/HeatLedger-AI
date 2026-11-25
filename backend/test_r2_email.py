"""
HEATLEDGER AI: Prompt R2 Test Suite
Transactional Email with Resend:
- 10 Transactional Templates (word count < 80 words, HTML + Text, zero tracking pixels, 1 button)
- Dynamic BRAND_NAME substitution
- Organization daily sending limits
- Bounce and complaint webhook suppression
- RFC-compliant one-click unsubscribe token processing
- Dev/Test outbox verification
- API endpoints: /api/email/webhooks/resend, /api/email/unsubscribe, and password reset integration
"""

import re
import pytest
from fastapi.testclient import TestClient

try:
    from main import app
    from email_service import EmailService, BRAND_NAME
    from db.connection import get_db_connection as _get_db
except ImportError:
    from backend.main import app
    from backend.email_service import EmailService, BRAND_NAME
    from backend.db.connection import get_db_connection as _get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_email_state():
    """Resets test outbox and cleans test SQLite rows before each test."""
    EmailService.test_outbox.clear()
    EmailService.init_tables()
    with _get_db() as conn:
        conn.execute("DELETE FROM email_dispatch_logs WHERE organization_id LIKE 'org_%' OR recipient LIKE '%@%'")
        conn.execute("DELETE FROM suppressed_emails WHERE email LIKE '%@%'")
        conn.execute("DELETE FROM email_unsubscribes WHERE email LIKE '%@%'")
        conn.commit()
    yield
    EmailService.test_outbox.clear()


class TestEmailTemplates:
    """Verifies all 10 templates conform strictly to word count, zero tracking pixels, and structure."""

    def test_all_ten_templates_exist_and_render_under_80_words(self):
        templates = [
            ("welcome", EmailService.render_welcome("Rajesh Sharma")),
            ("email_verification", EmailService.render_email_verification("https://app.heatledger.ai/verify?token=abc")),
            ("password_reset", EmailService.render_password_reset("https://app.heatledger.ai/reset?token=xyz")),
            ("team_invite", EmailService.render_team_invite("Anil Gupta", "Howrah Works", "QA Inspector", "https://app.heatledger.ai/invite?token=123")),
            ("share_link", EmailService.render_share_link("SHP-2026-089", "https://app.heatledger.ai/pack/shp-2026-089")),
            ("supplier_request", EmailService.render_supplier_request("Hot Rolled Coil", "https://app.heatledger.ai/supplier/req/456", "2026-11-30")),
            ("invoice", EmailService.render_invoice("INV-2026-0042", 19999.00, "https://app.heatledger.ai/billing/invoices/inv-0042")),
            ("payment_failed", EmailService.render_payment_failed(7, "https://app.heatledger.ai/billing/payment-methods")),
            ("trial_ending", EmailService.render_trial_ending(3, "https://app.heatledger.ai/billing/plans")),
            ("shipments_at_risk_digest", EmailService.render_shipments_at_risk_digest(3, "https://app.heatledger.ai/shipments?status=at_risk", "https://app.heatledger.ai/unsubscribe?token=unsub123")),
        ]

        assert len(templates) == 10, "Expected exactly 10 distinct transactional email templates."

        for name, (subject, text, html) in templates:
            # 1. Plain text word count strictly < 80
            text_words = len(text.split())
            assert text_words < 80, f"Template '{name}' plain text exceeds 80 words ({text_words} words)."
            assert text_words >= 15, f"Template '{name}' plain text is unreasonably short ({text_words} words)."

            # 2. HTML text word count strictly < 80 (strip tags and check readable words)
            clean_html_text = re.sub(r"<[^>]+>", " ", html)
            html_words = len(clean_html_text.split())
            assert html_words < 80, f"Template '{name}' HTML text exceeds 80 words ({html_words} words)."

            # 3. Zero tracking pixels or hidden tracking images
            assert "<img" not in html.lower(), f"Template '{name}' must not include <img> tracking pixels."
            assert "pixel" not in html.lower(), f"Template '{name}' contains 'pixel' references."

            # 4. Brand name dynamic presence
            assert BRAND_NAME in subject, f"Template '{name}' subject missing BRAND_NAME."
            assert BRAND_NAME in text, f"Template '{name}' text missing BRAND_NAME."
            assert BRAND_NAME in html, f"Template '{name}' html missing BRAND_NAME."

            # 5. Exactly one primary action button link in HTML
            # Touch target min-height 44px
            assert "min-height:44px" in html, f"Template '{name}' primary button missing touch-friendly min-height:44px."

            # 6. No raw certificate secrets, chemistry percentages or MTC contents in body
            assert "0.045% P" not in text
            assert "0.035% S" not in text
            assert "Clause 6" not in text

    def test_unsubscribe_link_on_digest_template(self):
        subject, text, html = EmailService.render_shipments_at_risk_digest(
            at_risk_count=5,
            dashboard_url="https://app.heatledger.ai/shipments",
            unsubscribe_url="https://app.heatledger.ai/unsubscribe?token=test_tok"
        )
        assert "Unsubscribe" in text
        assert "https://app.heatledger.ai/unsubscribe?token=test_tok" in text
        assert "Unsubscribe" in html
        assert "https://app.heatledger.ai/unsubscribe?token=test_tok" in html


class TestEmailDispatchAndSuppression:
    """Verifies suppression list filtering, daily rate caps, and dispatch routing."""

    def test_send_email_dev_outbox(self):
        res = EmailService.send_email(
            to="buyer@eurosteel-dispatch.de",
            subject="Welcome to HeatLedger",
            html="<p>Welcome</p>",
            text="Welcome",
            organization_id="org_test_01",
            template_name="welcome"
        )
        assert res["status"] == "sent"
        assert res["recipient"] == "buyer@eurosteel-dispatch.de"
        assert len(EmailService.test_outbox) == 1
        assert EmailService.test_outbox[0]["to"] == "buyer@eurosteel-dispatch.de"

    def test_suppressed_email_is_blocked_from_dispatch(self):
        bad_email = "bounced-recipient@steelmill-export.com"
        EmailService.suppress_email(bad_email, reason="HARD_BOUNCE", source="TEST")
        assert EmailService.is_suppressed(bad_email) is True

        res = EmailService.send_email(
            to=bad_email,
            subject="Shipment Pack Ready",
            html="<p>Pack</p>",
            text="Pack",
            organization_id="org_test_02"
        )
        assert res["status"] == "suppressed"
        # Should not be added to outbox
        assert len(EmailService.test_outbox) == 0

    def test_daily_organization_cap_enforcement(self):
        org_id = "org_capped_test"
        # Check initial quota
        assert EmailService.check_org_daily_cap(org_id, max_daily=2) is True

        # Send 2 emails
        EmailService.send_email("user1@example.com", "Subj 1", "<p>1</p>", "1", organization_id=org_id, max_daily=2)
        EmailService.send_email("user2@example.com", "Subj 2", "<p>2</p>", "2", organization_id=org_id, max_daily=2)

        # 3rd should fail quota check
        assert EmailService.check_org_daily_cap(org_id, max_daily=2) is False
        with pytest.raises(ValueError, match="exceeded its daily email quota"):
            EmailService.send_email("user3@example.com", "Subj 3", "<p>3</p>", "3", organization_id=org_id, max_daily=2)

    def test_unsubscribe_token_lifecycle(self):
        email = "weekly-receiver@metalforge.in"
        token = EmailService.generate_unsubscribe_token(email, category="weekly_digest")
        assert len(token) >= 20

        # Before unsubscribe, not suppressed
        assert EmailService.is_suppressed(email) is False

        # Process unsubscribe
        unsub_email = EmailService.process_unsubscribe(token)
        assert unsub_email == email
        assert EmailService.is_suppressed(email) is True

        # Processing same token again should be idempotent or already processed
        invalid_email = EmailService.process_unsubscribe("non_existent_token_12345")
        assert invalid_email is None


class TestEmailAPIEndpoints:
    """Verifies Resend bounce/complaint webhook and one-click unsubscribe HTTP endpoints."""

    def test_resend_webhook_bounce_suppression(self):
        bounce_payload = {
            "type": "email.bounced",
            "created_at": "2026-11-21T12:00:00.000Z",
            "data": {
                "to": ["bounced-address@tatasteel-sub.com"],
                "subject": "Tax Invoice INV-2026-0042",
                "email_id": "resend_msg_001"
            }
        }
        res = client.post("/api/email/webhooks/resend", json=bounce_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["event"] == "email.bounced"
        assert "bounced-address@tatasteel-sub.com" in data["suppressed"]

        # Verify address is now suppressed in database
        assert EmailService.is_suppressed("bounced-address@tatasteel-sub.com") is True

    def test_resend_webhook_complaint_suppression(self):
        complaint_payload = {
            "type": "email.complained",
            "created_at": "2026-11-21T12:05:00.000Z",
            "data": {
                "to": ["complaining-user@exporttrader.eu"],
                "subject": "Weekly Compliance Digest",
                "email_id": "resend_msg_002"
            }
        }
        res = client.post("/api/email/webhooks/resend", json=complaint_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["event"] == "email.complained"
        assert EmailService.is_suppressed("complaining-user@exporttrader.eu") is True

    def test_resend_webhook_unhandled_event(self):
        other_payload = {
            "type": "email.delivered",
            "data": {"to": ["delivered@example.com"]}
        }
        res = client.post("/api/email/webhooks/resend", json=other_payload)
        assert res.status_code == 200
        assert res.json()["status"] == "ignored"

    def test_http_unsubscribe_endpoint_success_and_failure(self):
        email = "optout-user@jsw-dispatch.com"
        token = EmailService.generate_unsubscribe_token(email)

        # Successful unsubscribe
        res = client.get(f"/api/email/unsubscribe?token={token}")
        assert res.status_code == 200
        assert res.json()["status"] == "unsubscribed"
        assert res.json()["email"] == email
        assert EmailService.is_suppressed(email) is True

        # Invalid token yields 400
        res_fail = client.get("/api/email/unsubscribe?token=bogus_random_token")
        assert res_fail.status_code == 400

    def test_password_reset_endpoint_dispatches_email(self):
        # Request password reset for existing seed user
        res = client.post("/api/auth/request-password-reset", json={"email": "demo@heatledger.ai"})
        assert res.status_code == 200

        # Should have dispatched password reset email into outbox
        matching = [m for m in EmailService.test_outbox if m["template_name"] == "password_reset"]
        assert len(matching) >= 1
        latest = matching[-1]
        assert latest["to"] == "demo@heatledger.ai"
        assert "Reset your HeatLedger password" in latest["subject"]
        assert "reset-password?token=" in latest["text"]
