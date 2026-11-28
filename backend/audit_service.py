"""
HEATLEDGER AI: Approvals, Roles & Tamper-Evident Audit Trail Engine (Prompt P9)

Specification & Requirements:
1. Workflow States for Certificates and Shipments:
   - UPLOADED -> EXTRACTED -> REVIEWED (DISPATCH or QA) -> APPROVED (QA) -> SIGNED (QA_INSPECTOR) -> RELEASED (OWNER or QA).
   - Configurable per plant (small plants can collapse steps).
2. Cryptographic Append-Only Hash Chain:
   - Every action (create, edit, approve, sign, release, share, delete, legal_hold) records:
     user, timestamp, IP, before_state, after_state, previous_hash, and current_hash.
   - Hash algorithm: SHA-256 over canonical string representation.
   - Nightly verification job walks the chain and flags any tampering or break.
3. Comments and @mentions on certificates and shipments:
   - In-app notification queue and email notification triggers.
4. Data retention settings with legal-hold flag:
   - Deletion requests handled as soft-delete plus an immutable audit record.
   - Legal-hold strictly forbids soft or hard deletion.
5. Audit Viewer APIs and Exports:
   - Filterable read-only log for all roles.
   - CSV export and PyMuPDF A4 Audit Certificate PDF export.
"""

import hashlib
import json
import os
import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    from backend.audit_exports import export_audit_csv, render_audit_pdf_certificate
    from backend.audit_schema import init_audit_tables, seed_demo_workflow
    from backend.audit_workflow import (
        WORKFLOW_STATES,
        add_comment as _wf_add_comment,
        delete_entity as _wf_delete_entity,
        get_plant_config as _wf_get_plant_config,
        list_comments as _wf_list_comments,
        list_notifications as _wf_list_notifications,
        set_legal_hold as _wf_set_legal_hold,
        transition_state as _wf_transition_state,
        update_plant_config as _wf_update_plant_config,
    )
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from audit_exports import export_audit_csv, render_audit_pdf_certificate
    from audit_schema import init_audit_tables, seed_demo_workflow
    from audit_workflow import (
        WORKFLOW_STATES,
        add_comment as _wf_add_comment,
        delete_entity as _wf_delete_entity,
        get_plant_config as _wf_get_plant_config,
        list_comments as _wf_list_comments,
        list_notifications as _wf_list_notifications,
        set_legal_hold as _wf_set_legal_hold,
        transition_state as _wf_transition_state,
        update_plant_config as _wf_update_plant_config,
    )
    from db.connection import get_db_connection as _get_db

GENESIS_PREVIOUS_HASH = "GENESIS_ROOT_HASH_0000000000000000000000000000000000000000000000000000000000000000"

ALLOWED_ACTIONS = [
    "CREATE", "EDIT", "REVIEW", "APPROVE", "SIGN", "RELEASE",
    "SHARE", "DELETE", "RESTORE", "LEGAL_HOLD_ENABLE", "LEGAL_HOLD_DISABLE", "COMMENT",
    "LOGIN", "LOGIN_FAILED", "LOGOUT", "TOKEN_REFRESH", "PASSWORD_RESET_REQUEST",
    "PASSWORD_RESET_SUCCESS", "STEP_UP", "TOTP_ENROL", "ROLE_CHANGE", "USER_REMOVED", "INVITE_MEMBER"
]


def _canonical_json(data: Any) -> str:
    """Produces deterministic canonical JSON for cryptographic hashing."""
    if data is None:
        return "{}"
    if isinstance(data, str):
        try:
            parsed = json.loads(data)
            return json.dumps(parsed, sort_keys=True, separators=(',', ':'))
        except Exception:
            return json.dumps({"raw": data}, sort_keys=True, separators=(',', ':'))
    return json.dumps(data, sort_keys=True, separators=(',', ':'))


def _compute_hash(
    seq: int,
    entity_type: str,
    entity_id: str,
    action: str,
    user_id: str,
    timestamp: str,
    before_state: str,
    after_state: str,
    prev_hash: str
) -> str:
    payload = f"{seq}|{entity_type}|{entity_id}|{action}|{user_id}|{timestamp}|{before_state}|{after_state}|{prev_hash}"
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


class AuditService:
    _lock = threading.RLock()

    @classmethod
    def init_tables(cls):
        init_audit_tables(cls)

    @classmethod
    def _seed_demo_workflow(cls, conn: Any):
        seed_demo_workflow(cls, conn)

    # --------------------------------------------------------------------------
    # Cryptographic Hash Chain Logging
    # --------------------------------------------------------------------------
    @classmethod
    def _append_log_unlocked(
        cls,
        conn: Any,
        organization_id: str,
        entity_type: str,
        entity_id: str,
        action: str,
        user_id: str,
        user_name: str,
        user_role: str,
        ip_address: str,
        before_state: Any,
        after_state: Any
    ) -> Dict[str, Any]:
        cur = conn.cursor()
        cur.execute("SELECT sequence_number, record_hash FROM audit_log_chain ORDER BY sequence_number DESC LIMIT 1")
        last_row = cur.fetchone()

        if last_row:
            seq = last_row["sequence_number"] + 1
            prev_hash = last_row["record_hash"]
        else:
            seq = 1
            prev_hash = GENESIS_PREVIOUS_HASH

        now = datetime.now(timezone.utc).isoformat()
        canon_before = _canonical_json(before_state)
        canon_after = _canonical_json(after_state)

        record_hash = _compute_hash(
            seq=seq,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            user_id=user_id,
            timestamp=now,
            before_state=canon_before,
            after_state=canon_after,
            prev_hash=prev_hash
        )

        cur.execute("""
            INSERT INTO audit_log_chain (
                sequence_number, organization_id, entity_type, entity_id, action,
                user_id, user_name, user_role, ip_address, timestamp,
                before_state, after_state, previous_hash, record_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            seq, organization_id, entity_type, entity_id, action,
            user_id, user_name, user_role, ip_address, now,
            canon_before, canon_after, prev_hash, record_hash
        ))

        return {
            "sequence_number": seq,
            "organization_id": organization_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role,
            "ip_address": ip_address,
            "timestamp": now,
            "before_state": canon_before,
            "after_state": canon_after,
            "previous_hash": prev_hash,
            "record_hash": record_hash
        }

    @classmethod
    def log_action(
        cls,
        organization_id: str,
        entity_type: str,
        entity_id: str,
        action: str,
        user_id: str,
        user_name: str,
        user_role: str,
        ip_address: str,
        before_state: Any = None,
        after_state: Any = None
    ) -> Dict[str, Any]:
        """
        Public entrypoint to append an immutable record to the hash chain.
        """
        cls.init_tables()
        if action not in ALLOWED_ACTIONS:
            raise ValueError(f"Invalid audit action '{action}'. Permitted: {ALLOWED_ACTIONS}")

        with cls._lock:
            with _get_db() as conn:
                record = cls._append_log_unlocked(
                    conn=conn,
                    organization_id=organization_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    action=action,
                    user_id=user_id,
                    user_name=user_name,
                    user_role=user_role,
                    ip_address=ip_address,
                    before_state=before_state,
                    after_state=after_state
                )
                conn.commit()
        return record

    # --------------------------------------------------------------------------
    # Chain Verification & Tamper Detection
    # --------------------------------------------------------------------------
    @classmethod
    def verify_hash_chain(cls, organization_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Nightly verification job and integrity validator.
        Walks the entire append-only chain and verifies mathematical linkage.
        """
        cls.init_tables()
        with cls._lock:
            with _get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT * FROM audit_log_chain ORDER BY sequence_number ASC")
                rows = cur.fetchall()

        if not rows:
            return {
                "valid": True,
                "total_records": 0,
                "chain_broken": False,
                "tampered_sequence": None,
                "message": "Empty audit chain. Zero records logged."
            }

        org_rows = [r for r in rows if r["organization_id"] == organization_id] if organization_id else rows
        total_count = len(org_rows)

        expected_prev_hash = GENESIS_PREVIOUS_HASH
        for idx, row in enumerate(rows):
            seq = row["sequence_number"]
            prev_hash = row["previous_hash"]
            rec_hash = row["record_hash"]

            # 1. Verify previous_hash linkage
            if idx == 0:
                if prev_hash != GENESIS_PREVIOUS_HASH:
                    return {
                        "valid": False,
                        "total_records": total_count,
                        "chain_broken": True,
                        "tampered_sequence": seq,
                        "error_type": "GENESIS_LINKAGE_VIOLATION",
                        "message": f"Genesis block at sequence {seq} does not match root genesis anchor."
                    }
            else:
                if prev_hash != expected_prev_hash:
                    return {
                        "valid": False,
                        "total_records": total_count,
                        "chain_broken": True,
                        "tampered_sequence": seq,
                        "error_type": "HASH_CHAIN_DISCONTINUITY",
                        "message": f"Hash chain broken at sequence {seq}. Stored prev_hash {prev_hash[:12]} does not match calculated {expected_prev_hash[:12]}."
                    }

            # 2. Recompute row's hash from canonical fields
            computed = _compute_hash(
                seq=seq,
                entity_type=row["entity_type"],
                entity_id=row["entity_id"],
                action=row["action"],
                user_id=row["user_id"],
                timestamp=row["timestamp"],
                before_state=row["before_state"],
                after_state=row["after_state"],
                prev_hash=prev_hash
            )

            if computed != rec_hash:
                return {
                    "valid": False,
                    "total_records": total_count,
                    "chain_broken": True,
                    "tampered_sequence": seq,
                    "error_type": "RECORD_CONTENT_MUTATION",
                    "message": f"Record content modified at sequence {seq}. SHA256 checksum mismatch."
                }

            expected_prev_hash = rec_hash

        return {
            "valid": True,
            "total_records": total_count,
            "chain_broken": False,
            "tampered_sequence": None,
            "last_verified_sequence": rows[-1]["sequence_number"],
            "last_verified_hash": rows[-1]["record_hash"],
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "message": f"Cryptographic integrity verified. All {len(rows)} audit records sealed in unbroken SHA-256 chain."
        }

    # --------------------------------------------------------------------------
    # Workflow State Transitions & Maker-Checker Rule
    # --------------------------------------------------------------------------
    @classmethod
    def get_plant_config(cls, organization_id: str) -> Dict[str, Any]:
        return _wf_get_plant_config(cls, organization_id)

    @classmethod
    def update_plant_config(
        cls,
        organization_id: str,
        small_plant_mode: bool,
        require_separate_reviewer: bool,
        retention_years: int,
    ) -> Dict[str, Any]:
        return _wf_update_plant_config(
            cls, organization_id, small_plant_mode, require_separate_reviewer, retention_years
        )

    @classmethod
    def transition_state(
        cls,
        organization_id: str,
        entity_type: str,
        entity_id: str,
        target_status: str,
        user_id: str,
        user_name: str,
        user_role: str,
        ip_address: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        return _wf_transition_state(
            cls, organization_id, entity_type, entity_id,
            target_status, user_id, user_name, user_role, ip_address,
        )

    # --------------------------------------------------------------------------
    # Legal-Hold & Soft Delete (delegated)
    # --------------------------------------------------------------------------
    @classmethod
    def set_legal_hold(
        cls,
        organization_id: str,
        entity_id: str,
        legal_hold: bool,
        user_id: str,
        user_name: str,
        user_role: str,
        reason: str,
        ip_address: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        return _wf_set_legal_hold(
            cls, organization_id, entity_id, legal_hold,
            user_id, user_name, user_role, reason, ip_address,
        )

    @classmethod
    def delete_entity(
        cls,
        organization_id: str,
        entity_id: str,
        user_id: str,
        user_name: str,
        user_role: str,
        ip_address: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        return _wf_delete_entity(cls, organization_id, entity_id, user_id, user_name, user_role, ip_address)

    # --------------------------------------------------------------------------
    # Comments & @mentions (delegated)
    # --------------------------------------------------------------------------
    @classmethod
    def add_comment(
        cls,
        organization_id: str,
        entity_type: str,
        entity_id: str,
        author_id: str,
        author_name: str,
        author_role: str,
        comment_text: str,
        ip_address: str = "127.0.0.1",
    ) -> Dict[str, Any]:
        return _wf_add_comment(
            cls, organization_id, entity_type, entity_id,
            author_id, author_name, author_role, comment_text, ip_address,
        )

    @classmethod
    def list_comments(cls, organization_id: str, entity_id: str) -> List[Dict[str, Any]]:
        return _wf_list_comments(cls, organization_id, entity_id)

    @classmethod
    def list_notifications(cls, organization_id: str, recipient: str) -> List[Dict[str, Any]]:
        return _wf_list_notifications(cls, organization_id, recipient)

    # --------------------------------------------------------------------------
    # Audit Viewer & Filtering
    # --------------------------------------------------------------------------
    @classmethod
    def list_audit_trail(
        cls,
        organization_id: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        action: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        if not organization_id or not organization_id.strip():
            raise ValueError("organization_id is required")
        cls.init_tables()
        with cls._lock:
            with _get_db() as conn:
                cur = conn.cursor()
                query = "SELECT * FROM audit_log_chain WHERE organization_id = ?"
                params: List[Any] = [organization_id]

                if entity_type:
                    query += " AND entity_type = ?"
                    params.append(entity_type)
                if entity_id:
                    query += " AND entity_id = ?"
                    params.append(entity_id)
                if action:
                    query += " AND action = ?"
                    params.append(action)

                query += " ORDER BY sequence_number DESC LIMIT ? OFFSET ?"
                params.extend([limit, offset])

                cur.execute(query, params)
                rows = cur.fetchall()

                # Get total count
                count_query = "SELECT COUNT(*) FROM audit_log_chain WHERE organization_id = ?"
                count_params: List[Any] = [organization_id]
                if entity_type:
                    count_query += " AND entity_type = ?"
                    count_params.append(entity_type)
                if entity_id:
                    count_query += " AND entity_id = ?"
                    count_params.append(entity_id)
                if action:
                    count_query += " AND action = ?"
                    count_params.append(action)

                cur.execute(count_query, count_params)
                total_count = cur.fetchone()[0]

        records = [dict(r) for r in rows]
        integrity = cls.verify_hash_chain(organization_id)

        return {
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "integrity_verified": integrity["valid"],
            "integrity_status": integrity,
            "records": records
        }

    # --------------------------------------------------------------------------
    # CSV and PyMuPDF PDF Exports (delegated)
    # --------------------------------------------------------------------------
    @classmethod
    def get_audit_trail(cls, organization_id: str) -> List[Dict[str, Any]]:
        """Convenience query returning list of audit records."""
        res = cls.list_audit_trail(organization_id=organization_id, limit=200)
        return res.get("records", [])

    @classmethod
    def export_csv(cls, organization_id: str) -> str:
        if not organization_id or not organization_id.strip():
            raise ValueError("organization_id is required")
        cls.init_tables()
        result = cls.list_audit_trail(organization_id=organization_id, limit=5000)
        return export_audit_csv(result["records"])

    @classmethod
    def export_pdf_certificate(cls, organization_id: str) -> bytes:
        """
        Generates an official A4 Audit Trail & Hash Chain Attestation Certificate via PyMuPDF.
        """
        if not organization_id or not organization_id.strip():
            raise ValueError("organization_id is required")
        cls.init_tables()
        audit_data = cls.list_audit_trail(organization_id=organization_id, limit=25)
        org_display_name = organization_id
        try:
            with _get_db() as conn:
                cur = conn.cursor()
                cur.execute("SELECT name FROM organizations WHERE id = ?", (organization_id,))
                org_row = cur.fetchone()
                if org_row and org_row[0]:
                    org_display_name = org_row[0]
        except Exception:
            pass
        return render_audit_pdf_certificate(org_display_name, audit_data)
