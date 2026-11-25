"""
HEATLEDGER AI: Prompt R7 - In-App Support, Help Links & Problem Reporting
Provides:
- WhatsApp help URL generator with prefilled message (Org ID, Screen Name)
- Email mailto URL generator (Org ID, Screen Name, Request ID)
- Support ticket database logger attaching screen name and request id (no document contents)
"""

import logging
import re
import urllib.parse
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

logger = logging.getLogger("heatledger.support")

DEFAULT_SUPPORT_PHONE = "+919876543210"
DEFAULT_SUPPORT_EMAIL = "support@heatledger.ai"


class SupportService:
    @staticmethod
    def init_tables():
        with get_db_connection(is_service_role=True) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS support_tickets (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    user_id TEXT,
                    screen_name TEXT NOT NULL,
                    request_id TEXT,
                    message TEXT NOT NULL,
                    contact_email TEXT,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    created_at TEXT NOT NULL
                );
            """)
            conn.commit()

    @classmethod
    def get_whatsapp_url(cls, phone: str, text: str) -> str:
        """Builds generic universal WhatsApp link with custom text."""
        clean_phone = re.sub(r"[^\d]", "", phone)
        encoded_text = urllib.parse.quote(text)
        return f"https://wa.me/{clean_phone}?text={encoded_text}"

    @classmethod
    def build_whatsapp_help_url(
        cls,
        organization_id: str,
        screen_name: str,
        phone_number: str = DEFAULT_SUPPORT_PHONE
    ) -> str:
        """
        Builds standard WhatsApp universal link with prefilled context message.
        Compatible with mobile phones (wa.me) and desktop WhatsApp web.
        """
        # Strip all non-digit characters except leading plus if any, wa.me takes digits only
        clean_phone = re.sub(r"[^\d]", "", phone_number)
        msg = f"Hi HeatLedger Support, Org: {organization_id}, Screen: {screen_name}"
        encoded_msg = urllib.parse.quote(msg)
        return f"https://wa.me/{clean_phone}?text={encoded_msg}"

    @classmethod
    def build_email_help_url(
        cls,
        organization_id: str,
        screen_name: str,
        request_id: Optional[str] = None,
        recipient_email: str = DEFAULT_SUPPORT_EMAIL
    ) -> str:
        """Builds mailto link with prefilled subject and body."""
        subject = f"HeatLedger Support - Org {organization_id}"
        req_line = f"\nRequest ID: {request_id}" if request_id else ""
        body = f"Screen: {screen_name}{req_line}\n\nDescribe the issue:\n"
        encoded_subject = urllib.parse.quote(subject)
        encoded_body = urllib.parse.quote(body)
        return f"mailto:{recipient_email}?subject={encoded_subject}&body={encoded_body}"

    @classmethod
    def create_ticket(
        cls,
        organization_id: str,
        screen_name: str,
        message: str,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        contact_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a problem report record.
        Strictly forbids attaching raw certificate or document bytes.
        """
        cls.init_tables()
        if not message or not message.strip():
            raise ValueError("Support message cannot be empty.")

        ticket_id = f"tkt_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Sanitize message to strip any inadvertent tokens
        safe_message = re.sub(r"Bearer\s+[A-Za-z0-9_\-\.]+", "[REDACTED_TOKEN]", message.strip())

        with get_db_connection(is_service_role=True) as conn:
            conn.execute("""
                INSERT INTO support_tickets (
                    id, organization_id, user_id, screen_name, request_id, message, contact_email, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
            """, (
                ticket_id,
                organization_id,
                user_id or "anonymous",
                screen_name.strip(),
                request_id or "N/A",
                safe_message,
                contact_email,
                now_iso
            ))
            conn.commit()

        logger.info(f"[Support] Ticket {ticket_id} created for org {organization_id} on screen {screen_name} (req: {request_id})")
        return {
            "ticket_id": ticket_id,
            "organization_id": organization_id,
            "screen_name": screen_name,
            "request_id": request_id,
            "status": "OPEN",
            "created_at": now_iso,
            "message": "Problem report received. Support will investigate."
        }
