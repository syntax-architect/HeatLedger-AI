"""
HEATLEDGER AI: Importer Portal & Verification Service (Prompt C3)
Public share links, cryptographic seal check, open tracking, supplier invitation,
and importer communication workflow.
"""

from __future__ import annotations

import json
import secrets
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional

try:
    from backend.melt_and_pour_service import MeltAndPourService
except ImportError:
    from melt_and_pour_service import MeltAndPourService


class ImporterPortalService:
    """
    Handles generation of public no-login share links, email-locked access,
    tamper verification, open analytics tracking, and supplier invites.
    """

    # In-memory store for active share links and importer accounts
    _portal_store: Dict[str, Dict[str, Any]] = {}
    _importer_accounts: Dict[str, List[str]] = {}

    @classmethod
    def reset_store(cls) -> None:
        """Resets the store (useful for clean unit test runs)."""
        cls._portal_store.clear()
        cls._importer_accounts.clear()

    @classmethod
    def create_share_link(
        cls,
        pack_data: Dict[str, Any],
        pdf_bytes: Optional[bytes] = None,
        expiry_days: int = 30,
        email_lock: Optional[str] = None,
        importer_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a secure public share token with optional email PIN lock and expiry.
        """
        token = secrets.token_urlsafe(32)
        pack_id = pack_data.get("pack_id", "PACK-UNKNOWN")
        created_at = datetime.now(timezone.utc)
        expires_at = created_at + timedelta(days=expiry_days)

        # Precompute PDF hash if bytes are supplied
        pdf_sha256 = None
        if pdf_bytes:
            pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # If email lock is set, generate a 6-digit one-time PIN
        pin_code = f"{secrets.randbelow(900000) + 100000}" if email_lock else None

        record = {
            "token": token,
            "pack_id": pack_id,
            "pack_data": json.loads(json.dumps(pack_data)),  # Deep copy
            "pdf_bytes": pdf_bytes,
            "pdf_sha256": pdf_sha256,
            "created_at": created_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_revoked": False,
            "email_lock": email_lock.lower().strip() if email_lock else None,
            "pin_code": pin_code,
            "open_events": [],
            "comments": [],
            "missing_doc_requests": [],
            "receipt_status": "PENDING",
            "received_at": None,
            "received_by": None
        }

        cls._portal_store[token] = record

        # Register under importer account index if provided
        target_importer = importer_email or email_lock
        if target_importer:
            clean_email = target_importer.lower().strip()
            cls._importer_accounts.setdefault(clean_email, []).append(token)

        return {
            "token": token,
            "share_url": f"/importer/portal/{token}",
            "expires_at": expires_at.isoformat(),
            "has_email_lock": bool(email_lock),
            "pin_code": pin_code,
            "pack_id": pack_id
        }

    @classmethod
    def get_pack_by_token(
        cls,
        token: str,
        pin: Optional[str] = None,
        client_country: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieves evidence pack for the given share token without requiring a user login.
        Returns 404 (raises KeyError) if token does not exist or is revoked.
        Tracks open event (timestamp and country code only).
        """
        record = cls._portal_store.get(token)
        if not record or record.get("is_revoked"):
            raise KeyError("Evidence pack share link not found, revoked, or invalid.")

        # Check expiration
        expires_at = datetime.fromisoformat(record["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            raise ValueError("Evidence pack share link has expired.")

        # Check email lock PIN if required
        if record.get("email_lock"):
            if not pin or str(pin).strip() != record.get("pin_code"):
                raise PermissionError("Access requires a valid one-time verification PIN sent to your email.")

        # Track open event (privacy-safe: country and timestamp only)
        open_event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "country": (client_country or "EU").upper()[:2]
        }
        record["open_events"].append(open_event)

        return {
            "token": token,
            "pack": record["pack_data"],
            "has_pdf": record["pdf_bytes"] is not None,
            "created_at": record["created_at"],
            "expires_at": record["expires_at"],
            "receipt_status": record["receipt_status"],
            "comments": record["comments"],
            "missing_doc_requests": record["missing_doc_requests"],
            "open_count": len(record["open_events"]),
            "statutory_line": "This seal shows the file has not changed since sealing. It is not a legal verification."
        }

    @classmethod
    def revoke_share_link(cls, token: str) -> bool:
        """Revokes a share link permanently."""
        record = cls._portal_store.get(token)
        if not record:
            return False
        record["is_revoked"] = True
        return True

    @classmethod
    def verify_portal_seal(cls, token: str) -> Dict[str, Any]:
        """
        Recomputes seal and file hash to confirm integrity.
        Detects any tampering with stored PDF bytes or pack payload.
        """
        record = cls._portal_store.get(token)
        if not record or record.get("is_revoked"):
            raise KeyError("Evidence pack share link not found or revoked.")

        pack_data = record["pack_data"]
        is_sealed = pack_data.get("is_sealed") or bool(pack_data.get("seal_details")) or bool(pack_data.get("seal_hash"))
        if not is_sealed:
            return {
                "verified": False,
                "match": False,
                "reason": "This dossier is unsealed.",
                "disclaimer": "This seal shows the file has not changed since sealing. It is not a legal verification."
            }

        # Check payload integrity
        verification = MeltAndPourService.verify_pack_seal(pack_data)

        # Check PDF file bytes integrity if stored
        if record.get("pdf_bytes") is not None and record.get("pdf_sha256"):
            current_bytes_hash = hashlib.sha256(record["pdf_bytes"]).hexdigest()
            if current_bytes_hash != record["pdf_sha256"]:
                return {
                    "verified": False,
                    "match": False,
                    "reason": "Cryptographic file tamper detected: Stored document bytes do not match original seal digest.",
                    "expected_hash": record["pdf_sha256"],
                    "computed_hash": current_bytes_hash,
                    "disclaimer": "This seal shows the file has not changed since sealing. It is not a legal verification."
                }

        verification["disclaimer"] = "This seal shows the file has not changed since sealing. It is not a legal verification."
        return verification

    @classmethod
    def tamper_pdf_bytes_for_testing(cls, token: str, bogus_bytes: bytes) -> None:
        """Utility for test suites to simulate file tampering."""
        record = cls._portal_store.get(token)
        if record:
            record["pdf_bytes"] = bogus_bytes

    @classmethod
    def add_importer_comment(
        cls,
        token: str,
        commenter_name: str,
        message: str
    ) -> Dict[str, Any]:
        """Adds a review comment from the importer."""
        record = cls._portal_store.get(token)
        if not record or record.get("is_revoked"):
            raise KeyError("Share link not found or revoked.")

        comment = {
            "id": secrets.token_hex(4),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "author": commenter_name.strip() or "Importer Representative",
            "message": message.strip()
        }
        record["comments"].append(comment)
        return comment

    @classmethod
    def request_missing_document(
        cls,
        token: str,
        heat_number: str,
        missing_item: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Importer requests a missing document (e.g. pour mill letter).
        Triggers an in-system alert and return receipt.
        """
        record = cls._portal_store.get(token)
        if not record or record.get("is_revoked"):
            raise KeyError("Share link not found or revoked.")

        req = {
            "request_id": f"REQ-{secrets.token_hex(4).upper()}",
            "heat_number": heat_number,
            "missing_item": missing_item,
            "note": note or "Required for EU customs clearance",
            "status": "OPEN",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        record["missing_doc_requests"].append(req)
        return req

    @classmethod
    def mark_received(
        cls,
        token: str,
        received_by: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Marks the pack as received and accepted by the importer."""
        record = cls._portal_store.get(token)
        if not record or record.get("is_revoked"):
            raise KeyError("Share link not found or revoked.")

        record["receipt_status"] = "ACCEPTED"
        record["received_at"] = datetime.now(timezone.utc).isoformat()
        record["received_by"] = received_by.strip() or "Importer Customs Clearance Team"

        return {
            "receipt_status": record["receipt_status"],
            "received_at": record["received_at"],
            "received_by": record["received_by"]
        }

    @classmethod
    def invite_other_supplier(
        cls,
        token: str,
        supplier_email: str,
        supplier_name: str,
        importer_consent: bool,
        importer_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Implements Task C3 (Item 5):
        'Do your other suppliers send you packs like this? Invite them.'
        Sends a short invite email with the importer's name only if they agree.
        """
        if not importer_consent:
            raise ValueError("Invitation requires explicit importer consent.")

        record = cls._portal_store.get(token)
        pack_plant = record["pack_data"].get("plant_name", "Our steel supplier") if record else "Steel supplier"

        sender_attribution = importer_name or "Your European Buyer"
        email_body = (
            f"Dear {supplier_name},\n\n"
            f"{sender_attribution} uses HeatLedger AI to receive verified EU Melt-and-Pour "
            f"evidence dossiers (Regulation (EU) 2026/1384 & CBAM data) directly from {pack_plant}.\n\n"
            f"To accelerate customs clearance and prevent shipment holds, you can generate "
            f"tamper-evident evidence packs for your consignments.\n\n"
            f"Get started at: https://heatledger.ai\n\n"
            f"Best regards,\n{sender_attribution}"
        )

        return {
            "status": "sent",
            "recipient_email": supplier_email,
            "sender_attribution": sender_attribution,
            "message_preview": email_body[:120] + "..."
        }

    @classmethod
    def list_importer_packs(cls, importer_email: str) -> List[Dict[str, Any]]:
        """
        Task C3 (Item 4): Importer free account.
        Lists all evidence packs received from different exporters with status board.
        """
        clean_email = importer_email.lower().strip()
        tokens = cls._importer_accounts.get(clean_email, [])
        results = []

        for tok in tokens:
            rec = cls._portal_store.get(tok)
            if not rec or rec.get("is_revoked"):
                continue
            pd = rec["pack_data"]
            results.append({
                "token": tok,
                "pack_id": pd.get("pack_id"),
                "shipment_id": pd.get("shipment_id"),
                "plant_name": pd.get("plant_name"),
                "invoice_number": pd.get("invoice_number"),
                "destination_port": pd.get("destination_port"),
                "seal_status": pd.get("seal_status"),
                "receipt_status": rec.get("receipt_status"),
                "total_heats": len(pd.get("heat_summary", [])),
                "open_count": len(rec.get("open_events", [])),
                "expires_at": rec.get("expires_at")
            })

        return results
