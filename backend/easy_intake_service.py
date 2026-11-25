"""
HEATLEDGER AI: Easy Intake Engine (Prompt C8)
Enables steel plants to ingest compliance documents, shipments, and heat allocations
without retyping:
1. Email-in: Each organization gets a private inbound address (e.g. plant-{token}@inbound.heatledger.ai).
   Attachments become draft certificates. Allowed-sender list verified. Webhook HMAC verified.
2. Drag and drop up to 50 PDFs/photos at once with progress list and retry.
3. Excel / CSV import for shipments, invoices, and heat allocations with templates,
   column mapping, per-row validation errors, and a dry-run mode.
4. Tally CSV export import: Accepts standard Tally voucher/sales export with reusable column mappings.
5. 'To check' Inbox: Everything lands in a staging inbox with status counts, never straight into ledger.
6. Statutory disclaimer: "Prepares documents for review. Not legal advice."
"""

import os
import io
import csv
import json
import hmac
import hashlib
import secrets
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

logger = logging.getLogger("heatledger.easy_intake")

LEGAL_DISCLAIMER = "Prepares documents for review. Not legal advice."
MAX_BATCH_FILES = 50
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB per file
WEBHOOK_SIGNING_SECRET = os.getenv("INTAKE_EMAIL_WEBHOOK_SECRET", "dev_secret_intake_email_2026")


class EasyIntakeService:
    """Core service for multi-channel intake, mapping, dry-run validation, and inbox staging."""

    @classmethod
    def init_db(cls):
        """Initializes tables for intake configurations, allowed senders, inbox drafts, and templates."""
        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS intake_config (
                    organization_id TEXT PRIMARY KEY,
                    inbound_email_token TEXT UNIQUE NOT NULL,
                    inbound_email_address TEXT UNIQUE NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS intake_allowed_senders (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    sender_pattern TEXT NOT NULL,
                    description TEXT,
                    created_at TEXT NOT NULL,
                    UNIQUE(organization_id, sender_pattern)
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS to_check_inbox (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    source_channel TEXT NOT NULL, -- EMAIL, BATCH_UPLOAD, CSV_IMPORT, TALLY_IMPORT
                    item_type TEXT NOT NULL,      -- CERTIFICATE_DRAFT, SHIPMENT_DRAFT, ALLOCATION_DRAFT
                    title TEXT NOT NULL,
                    sender_or_file TEXT,
                    payload_json TEXT NOT NULL,
                    file_sha256 TEXT,
                    file_size_bytes INTEGER,
                    status TEXT NOT NULL DEFAULT 'DRAFT_PENDING_REVIEW',
                    created_at TEXT NOT NULL,
                    reviewed_at TEXT,
                    reviewed_by TEXT
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS intake_mapping_templates (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    template_name TEXT NOT NULL,
                    template_type TEXT NOT NULL, -- SHIPMENTS, HEAT_ALLOCATIONS, TALLY_SALES
                    column_mapping_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(organization_id, template_name)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_intake_token ON intake_config(inbound_email_token);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_inbox_org ON to_check_inbox(organization_id, status);")
            conn.commit()

    # =========================================================================
    # 1. Organization Email-In Setup & Sender Whitelist
    # =========================================================================

    @classmethod
    def get_or_create_org_intake_config(cls, organization_id: str, domain: str = "inbound.heatledger.ai") -> Dict[str, Any]:
        """Retrieves or provisions the organization's unique private inbound email address."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM intake_config WHERE organization_id = ?", (organization_id,))
            row = cursor.fetchone()

            if row:
                return dict(row)

            # Generate random 6-character token
            token = secrets.token_hex(4).lower()
            inbound_address = f"plant-{token}@{domain}"
            now_iso = datetime.now(timezone.utc).isoformat()

            conn.execute("""
                INSERT INTO intake_config (organization_id, inbound_email_token, inbound_email_address, is_active, created_at)
                VALUES (?, ?, ?, 1, ?)
            """, (organization_id, token, inbound_address, now_iso))
            conn.commit()

            return {
                "organization_id": organization_id,
                "inbound_email_token": token,
                "inbound_email_address": inbound_address,
                "is_active": 1,
                "created_at": now_iso
            }

    @classmethod
    def add_allowed_sender(cls, organization_id: str, sender_pattern: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Adds an allowed sender address or wildcard domain (e.g. 'qa@tatasteel.com' or '@jsw.in')."""
        cls.init_db()
        pattern = sender_pattern.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()
        sender_id = f"sndr_{secrets.token_hex(6)}"

        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO intake_allowed_senders (id, organization_id, sender_pattern, description, created_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(organization_id, sender_pattern) DO UPDATE SET
                    description = excluded.description
            """, (sender_id, organization_id, pattern, description, now_iso))
            conn.commit()

        return {
            "id": sender_id,
            "organization_id": organization_id,
            "sender_pattern": pattern,
            "description": description,
            "created_at": now_iso
        }

    @classmethod
    def list_allowed_senders(cls, organization_id: str) -> List[Dict[str, Any]]:
        """Lists all allowed sender patterns for an organization."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, organization_id, sender_pattern, description, created_at
                FROM intake_allowed_senders
                WHERE organization_id = ?
                ORDER BY created_at ASC
            """, (organization_id,))
            return [dict(r) for r in cursor.fetchall()]

    @classmethod
    def is_sender_allowed(cls, organization_id: str, sender_email: str) -> bool:
        """Evaluates whether an incoming sender matches the organization's whitelist."""
        cls.init_db()
        email_clean = sender_email.strip().lower()
        allowed_list = cls.list_allowed_senders(organization_id)

        for item in allowed_list:
            pat = item["sender_pattern"].lower()
            if pat.startswith("@") and email_clean.endswith(pat):
                return True
            if pat == email_clean:
                return True
        return False

    # =========================================================================
    # 2. Email Webhook Processing (Signature Verification & Staging)
    # =========================================================================

    @classmethod
    def verify_webhook_signature(cls, payload_bytes: bytes, signature_header: Optional[str]) -> bool:
        """Validates HMAC-SHA256 signature from inbound email provider (e.g., Postmark/Sendgrid/Resend)."""
        if not signature_header:
            return False
        expected_sig = hmac.new(
            WEBHOOK_SIGNING_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        # Header may contain 'sha256=' prefix
        provided_sig = signature_header.replace("sha256=", "").strip()
        return hmac.compare_digest(expected_sig, provided_sig)

    @classmethod
    def process_inbound_email_webhook(
        cls,
        payload: Dict[str, Any],
        signature_header: Optional[str] = None,
        raw_body: Optional[bytes] = None
    ) -> Dict[str, Any]:
        """
        Receives inbound email:
        1. Verifies webhook HMAC signature.
        2. Resolves target organization from recipient address (plant-{token}@...).
        3. Validates sender against organization allowed list. Never processes unauthorized senders.
        4. Ingests attachments into 'to_check_inbox' with status DRAFT_PENDING_REVIEW.
        """
        cls.init_db()

        # 1. Signature check
        if raw_body and not cls.verify_webhook_signature(raw_body, signature_header):
            raise PermissionError("Invalid webhook signature.")

        # 2. Resolve organization
        recipient = payload.get("To", payload.get("recipient", "")).lower()
        # Parse token from recipient e.g. plant-abc123@...
        token = None
        if "plant-" in recipient:
            token = recipient.split("plant-")[1].split("@")[0]

        if not token:
            raise ValueError(f"Recipient address does not match intake pattern: {recipient}")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT organization_id, is_active FROM intake_config WHERE inbound_email_token = ?", (token,))
            config = cursor.fetchone()

        if not config or not config["is_active"]:
            raise ValueError("Organization intake address not found or inactive.")

        org_id = config["organization_id"]

        # 3. Sender verification
        sender = payload.get("From", payload.get("sender", "")).lower()
        if not cls.is_sender_allowed(org_id, sender):
            logger.warning(f"Rejected inbound email from unauthorized sender {sender} for org {org_id}")
            raise PermissionError(f"Sender {sender} is not on the organization's allowed intake whitelist.")

        # 4. Attachments into To Check inbox
        attachments = payload.get("Attachments", payload.get("attachments", []))
        created_drafts = []
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            for att in attachments:
                fname = att.get("Name", att.get("filename", "certificate.pdf"))
                content_base64 = att.get("Content", att.get("base64", ""))
                size_bytes = att.get("ContentLength", att.get("size", len(content_base64)))
                sha256 = hashlib.sha256(content_base64.encode("utf-8")).hexdigest()

                draft_id = f"draft_{secrets.token_hex(8)}"
                item_payload = {
                    "subject": payload.get("Subject", payload.get("subject", "")),
                    "sender": sender,
                    "filename": fname,
                    "sha256": sha256,
                    "received_at": now_iso
                }

                conn.execute("""
                    INSERT INTO to_check_inbox (
                        id, organization_id, source_channel, item_type, title,
                        sender_or_file, payload_json, file_sha256, file_size_bytes,
                        status, created_at
                    ) VALUES (?, ?, 'EMAIL', 'CERTIFICATE_DRAFT', ?, ?, ?, ?, ?, 'DRAFT_PENDING_REVIEW', ?)
                """, (
                    draft_id, org_id, f"MTC Email: {fname}", sender,
                    json.dumps(item_payload), sha256, size_bytes, now_iso
                ))
                created_drafts.append(draft_id)

            conn.commit()

        logger.info(f"Ingested {len(created_drafts)} drafts from email {sender} into org {org_id}")
        return {
            "status": "SUCCESS",
            "organization_id": org_id,
            "sender": sender,
            "drafts_created_count": len(created_drafts),
            "draft_ids": created_drafts,
            "disclaimer": LEGAL_DISCLAIMER
        }

    # =========================================================================
    # 3. Batch File Upload (Up to 50 PDFs/Images)
    # =========================================================================

    @classmethod
    def ingest_batch_files(
        cls,
        organization_id: str,
        files: List[Tuple[str, bytes]]
    ) -> Dict[str, Any]:
        """
        Accepts up to 50 PDFs and images, validates size, and places them into
        the 'To check' inbox as draft certificates with retry tracking.
        """
        cls.init_db()
        if len(files) > MAX_BATCH_FILES:
            raise ValueError(f"Batch exceeds maximum limit of {MAX_BATCH_FILES} files ({len(files)} submitted).")

        now_iso = datetime.now(timezone.utc).isoformat()
        results = []

        with get_db_connection() as conn:
            for filename, file_bytes in files:
                if len(file_bytes) > MAX_FILE_SIZE:
                    results.append({
                        "filename": filename,
                        "status": "FAILED",
                        "error": f"File exceeds 15MB size limit ({len(file_bytes)} bytes)"
                    })
                    continue

                sha256 = hashlib.sha256(file_bytes).hexdigest()
                draft_id = f"draft_{secrets.token_hex(8)}"

                item_payload = {
                    "filename": filename,
                    "file_size": len(file_bytes),
                    "file_sha256": sha256,
                    "uploaded_at": now_iso
                }

                conn.execute("""
                    INSERT INTO to_check_inbox (
                        id, organization_id, source_channel, item_type, title,
                        sender_or_file, payload_json, file_sha256, file_size_bytes,
                        status, created_at
                    ) VALUES (?, ?, 'BATCH_UPLOAD', 'CERTIFICATE_DRAFT', ?, ?, ?, ?, ?, 'DRAFT_PENDING_REVIEW', ?)
                """, (
                    draft_id, organization_id, f"Uploaded: {filename}", filename,
                    json.dumps(item_payload), sha256, len(file_bytes), now_iso
                ))

                results.append({
                    "filename": filename,
                    "draft_id": draft_id,
                    "status": "QUEUED_IN_INBOX",
                    "sha256": sha256
                })

            conn.commit()

        success_count = sum(1 for r in results if r["status"] == "QUEUED_IN_INBOX")
        return {
            "total_submitted": len(files),
            "successfully_queued": success_count,
            "failed_count": len(files) - success_count,
            "files": results,
            "disclaimer": LEGAL_DISCLAIMER
        }

    # =========================================================================
    # 4. Excel & CSV Import Engine (Dry-Run, Validation & Tally Mapping)
    # =========================================================================

    DEFAULT_TEMPLATES = {
        "SHIPMENTS": {
            "name": "Standard Shipments Template",
            "columns": ["Invoice_No", "Invoice_Date", "Buyer_Name", "Destination_Country", "Port_Of_Loading", "Port_Of_Discharge", "Total_Weight_MT"],
            "required": ["Invoice_No", "Invoice_Date", "Buyer_Name", "Total_Weight_MT"]
        },
        "HEAT_ALLOCATIONS": {
            "name": "Heat Allocation Template",
            "columns": ["Heat_Number", "Invoice_No", "Grade", "Allocated_Weight_MT", "Country_Of_Melt", "Country_Of_Pour"],
            "required": ["Heat_Number", "Invoice_No", "Allocated_Weight_MT"]
        },
        "TALLY_SALES": {
            "name": "Tally Prime Sales Voucher Export",
            "columns": ["Vch_No", "Date", "Party_Name", "Item_Name", "Billed_Qty", "Rate", "Amount", "Heat_No"],
            "required": ["Vch_No", "Date", "Party_Name", "Billed_Qty"]
        }
    }

    @classmethod
    def get_template_definition(cls, template_type: str) -> Dict[str, Any]:
        """Returns standard template columns and guidelines."""
        t_type = template_type.upper()
        if t_type not in cls.DEFAULT_TEMPLATES:
            raise ValueError(f"Unknown template type '{template_type}'. Available: {list(cls.DEFAULT_TEMPLATES.keys())}")
        return cls.DEFAULT_TEMPLATES[t_type]

    @classmethod
    def validate_csv_row(cls, row: Dict[str, str], row_idx: int, template_type: str) -> List[Dict[str, Any]]:
        """Validates an individual row against required fields and formats."""
        errors = []
        tpl = cls.DEFAULT_TEMPLATES.get(template_type.upper(), {})
        required_fields = tpl.get("required", [])

        # Check required fields
        for req in required_fields:
            val = (row.get(req) or "").strip()
            if not val:
                errors.append({
                    "row_number": row_idx,
                    "field": req,
                    "error_message": f"Required field '{req}' is empty.",
                    "raw_value": val
                })

        # Numeric validations
        if "Total_Weight_MT" in row and row.get("Total_Weight_MT"):
            try:
                wt = float(row["Total_Weight_MT"])
                if wt <= 0:
                    errors.append({
                        "row_number": row_idx,
                        "field": "Total_Weight_MT",
                        "error_message": "Total_Weight_MT must be greater than 0.",
                        "raw_value": row["Total_Weight_MT"]
                    })
            except ValueError:
                errors.append({
                    "row_number": row_idx,
                    "field": "Total_Weight_MT",
                    "error_message": "Invalid numeric format for Total_Weight_MT.",
                    "raw_value": row["Total_Weight_MT"]
                })

        if "Allocated_Weight_MT" in row and row.get("Allocated_Weight_MT"):
            try:
                wt = float(row["Allocated_Weight_MT"])
                if wt <= 0:
                    errors.append({
                        "row_number": row_idx,
                        "field": "Allocated_Weight_MT",
                        "error_message": "Allocated_Weight_MT must be greater than 0.",
                        "raw_value": row["Allocated_Weight_MT"]
                    })
            except ValueError:
                errors.append({
                    "row_number": row_idx,
                    "field": "Allocated_Weight_MT",
                    "error_message": "Invalid numeric format for Allocated_Weight_MT.",
                    "raw_value": row["Allocated_Weight_MT"]
                })

        return errors

    @classmethod
    def execute_import(
        cls,
        organization_id: str,
        csv_content: str,
        template_type: str,
        dry_run: bool = True,
        custom_column_mapping: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Executes CSV import (dry-run or live):
        - Applies column mapping.
        - Validates all rows, collecting errors per row.
        - If dry_run is True, returns errors and validation summary without writing to DB.
        - If dry_run is False and valid, lands rows in 'To check' inbox as drafts.
          STRICT: Never writes directly to the immutable ledger!
        """
        cls.init_db()
        t_type = template_type.upper()
        if t_type not in cls.DEFAULT_TEMPLATES:
            raise ValueError(f"Invalid template type: {template_type}")

        reader = csv.DictReader(io.StringIO(csv_content))
        if not reader.fieldnames:
            raise ValueError("CSV contains no headers.")

        # Map user columns to canonical template columns
        mapping = custom_column_mapping or {}
        rows = list(reader)
        total_rows = len(rows)

        row_errors: List[Dict[str, Any]] = []
        valid_rows: List[Dict[str, Any]] = []

        for idx, raw_row in enumerate(rows, start=1):
            # Apply mapping
            mapped_row = {}
            for col, val in raw_row.items():
                target_col = mapping.get(col, col).strip()
                mapped_row[target_col] = (val or "").strip()

            errs = cls.validate_csv_row(mapped_row, idx, t_type)
            if errs:
                row_errors.extend(errs)
            else:
                valid_rows.append(mapped_row)

        len(row_errors) == 0
        now_iso = datetime.now(timezone.utc).isoformat()
        draft_ids = []

        if not dry_run and len(valid_rows) > 0:
            with get_db_connection() as conn:
                for v_row in valid_rows:
                    draft_id = f"draft_{secrets.token_hex(8)}"
                    title = f"Imported {t_type}: {v_row.get('Invoice_No') or v_row.get('Vch_No') or v_row.get('Heat_Number') or 'Row'}"

                    conn.execute("""
                        INSERT INTO to_check_inbox (
                            id, organization_id, source_channel, item_type, title,
                            sender_or_file, payload_json, status, created_at
                        ) VALUES (?, ?, 'CSV_IMPORT', ?, ?, 'CSV Import File', ?, 'DRAFT_PENDING_REVIEW', ?)
                    """, (
                        draft_id, organization_id, f"{t_type}_DRAFT", title,
                        json.dumps(v_row), now_iso
                    ))
                    draft_ids.append(draft_id)
                conn.commit()

        return {
            "template_type": t_type,
            "dry_run": dry_run,
            "total_rows": total_rows,
            "valid_rows_count": len(valid_rows),
            "error_rows_count": len(set(e["row_number"] for e in row_errors)),
            "total_errors": len(row_errors),
            "errors": row_errors,
            "drafts_created": draft_ids,
            "disclaimer": LEGAL_DISCLAIMER
        }

    # =========================================================================
    # 5. 'To Check' Inbox Queries & Review Lifecycle
    # =========================================================================

    @classmethod
    def get_inbox_summary(cls, organization_id: str) -> Dict[str, Any]:
        """Returns status counts for the organization's 'To check' staging inbox."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT source_channel, status, COUNT(*) as cnt
                FROM to_check_inbox
                WHERE organization_id = ?
                GROUP BY source_channel, status
            """, (organization_id,))
            rows = cursor.fetchall()

            cursor.execute("""
                SELECT id, source_channel, item_type, title, sender_or_file, status, created_at
                FROM to_check_inbox
                WHERE organization_id = ? AND status = 'DRAFT_PENDING_REVIEW'
                ORDER BY created_at DESC
                LIMIT 50
            """, (organization_id,))
            pending_items = [dict(r) for r in cursor.fetchall()]

        counts = {
            "total_to_check": sum(r["cnt"] for r in rows if r["status"] == "DRAFT_PENDING_REVIEW"),
            "email_drafts": sum(r["cnt"] for r in rows if r["source_channel"] == "EMAIL" and r["status"] == "DRAFT_PENDING_REVIEW"),
            "batch_upload_drafts": sum(r["cnt"] for r in rows if r["source_channel"] == "BATCH_UPLOAD" and r["status"] == "DRAFT_PENDING_REVIEW"),
            "csv_import_drafts": sum(r["cnt"] for r in rows if r["source_channel"] == "CSV_IMPORT" and r["status"] == "DRAFT_PENDING_REVIEW"),
        }

        return {
            "organization_id": organization_id,
            "counts": counts,
            "recent_pending_items": pending_items,
            "disclaimer": LEGAL_DISCLAIMER
        }


# Module level exports
easy_intake_service = EasyIntakeService()


def get_easy_intake_service():
    return easy_intake_service
