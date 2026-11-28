"""
HEATLEDGER AI: Maker-Checker Workflow, Legal-Hold, Soft Delete & Comments Helpers
Extracted from audit_service.py for Prompt Pack v5 Task 6.1.
"""

import hashlib
import json
import re
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List

try:
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from db.connection import get_db_connection as _get_db


WORKFLOW_STATES = ["UPLOADED", "EXTRACTED", "REVIEWED", "APPROVED", "SIGNED", "RELEASED"]


def get_plant_config(audit_cls: Any, organization_id: str) -> Dict[str, Any]:
    """Loads per-plant maker-checker workflow settings with safe defaults."""
    audit_cls.init_tables()
    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM plant_workflow_configs WHERE organization_id = ?", (organization_id,))
            row = cur.fetchone()
            if row:
                return dict(row)
    return {
        "organization_id": organization_id,
        "small_plant_mode": 0,
        "require_separate_reviewer": 1,
        "retention_years": 10,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def update_plant_config(
    audit_cls: Any,
    organization_id: str,
    small_plant_mode: bool,
    require_separate_reviewer: bool = True,
    retention_years: int = 10,
) -> Dict[str, Any]:
    """Updates maker-checker workflow settings for an organization."""
    audit_cls.init_tables()
    now = datetime.now(timezone.utc).isoformat()
    with audit_cls._lock:
        with _get_db() as conn:
            conn.execute(
                """
                INSERT INTO plant_workflow_configs (
                    organization_id, small_plant_mode, require_separate_reviewer, retention_years, updated_at
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(organization_id) DO UPDATE SET
                    small_plant_mode = excluded.small_plant_mode,
                    require_separate_reviewer = excluded.require_separate_reviewer,
                    retention_years = excluded.retention_years,
                    updated_at = excluded.updated_at
                """,
                (organization_id, 1 if small_plant_mode else 0, 1 if require_separate_reviewer else 0, retention_years, now),
            )
            conn.commit()
    return {
        "status": "success",
        "organization_id": organization_id,
        "small_plant_mode": small_plant_mode,
        "require_separate_reviewer": require_separate_reviewer,
        "retention_years": retention_years,
    }


def _validate_transition_role(target_status: str, user_role: str, user_name: str, last_action_by: str, is_small: bool, cfg: Dict[str, Any]) -> None:
    """Enforces role permission and maker-checker segregation for a workflow state transition."""
    if target_status == "REVIEWED":
        if user_role not in ["DISPATCH", "QA", "QA_INSPECTOR", "QA_HEAD", "OWNER", "ADMIN"]:
            raise PermissionError(f"Role '{user_role}' cannot review certificates/shipments.")
    elif target_status == "APPROVED":
        if user_role not in ["QA", "QA_HEAD", "OWNER", "ADMIN"]:
            raise PermissionError(f"Role '{user_role}' cannot approve. Requires QA or QA_HEAD.")
        if not is_small and cfg.get("require_separate_reviewer", 1) and user_name == last_action_by:
            raise PermissionError("Maker-Checker Segregation Policy: The reviewer cannot approve their own review.")
    elif target_status == "SIGNED":
        if user_role not in ["QA_INSPECTOR", "QA_HEAD", "OWNER", "ADMIN"]:
            raise PermissionError(f"Role '{user_role}' cannot sign EN 10204 3.1 certificates. Requires QA_INSPECTOR.")
    elif target_status == "RELEASED":
        if user_role not in ["OWNER", "QA_HEAD", "QA", "ADMIN"]:
            raise PermissionError(f"Role '{user_role}' cannot release shipments for export dispatch.")


def transition_state(
    audit_cls: Any,
    organization_id: str,
    entity_type: str,
    entity_id: str,
    target_status: str,
    user_id: str,
    user_name: str,
    user_role: str,
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    """Executes a maker-checker workflow transition with role enforcement."""
    audit_cls.init_tables()
    cfg = audit_cls.get_plant_config(organization_id)
    is_small = bool(cfg.get("small_plant_mode", 0))

    if target_status not in WORKFLOW_STATES:
        raise ValueError(f"Invalid target workflow status '{target_status}'. Permitted: {WORKFLOW_STATES}")

    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM entity_workflow_records WHERE entity_id = ? AND organization_id = ?",
                (entity_id, organization_id),
            )
            record = cur.fetchone()

            if not record:
                cur.execute(
                    """
                    INSERT INTO entity_workflow_records (
                        entity_id, organization_id, entity_type, current_status, legal_hold,
                        is_deleted, last_action_by, last_action_role, updated_at
                    ) VALUES (?, ?, ?, 'UPLOADED', 0, 0, ?, ?, ?)
                    """,
                    (entity_id, organization_id, entity_type, user_name, user_role, datetime.now(timezone.utc).isoformat()),
                )
                current_status = "UPLOADED"
                last_action_by = user_name
            else:
                rec_dict = dict(record)
                if rec_dict.get("is_deleted", 0):
                    raise ValueError(f"Entity '{entity_id}' has been soft-deleted and cannot transition states.")
                current_status = rec_dict["current_status"]
                last_action_by = rec_dict["last_action_by"]

            _validate_transition_role(target_status, user_role, user_name, last_action_by, is_small, cfg)

            valid_next = {
                "UPLOADED": ["EXTRACTED", "REVIEWED"],
                "EXTRACTED": ["REVIEWED", "APPROVED"] if is_small else ["REVIEWED"],
                "REVIEWED": ["APPROVED", "SIGNED"] if is_small else ["APPROVED"],
                "APPROVED": ["SIGNED"],
                "SIGNED": ["RELEASED"],
                "RELEASED": [],
            }
            allowed = valid_next.get(current_status, [])
            if target_status not in allowed:
                raise ValueError(f"Cannot transition '{entity_id}' from '{current_status}' to '{target_status}'. Allowed next: {allowed}")

            now = datetime.now(timezone.utc).isoformat()
            cur.execute(
                """
                UPDATE entity_workflow_records
                SET current_status = ?, last_action_by = ?, last_action_role = ?, updated_at = ?
                WHERE entity_id = ? AND organization_id = ?
                """,
                (target_status, user_name, user_role, now, entity_id, organization_id),
            )

            action_name = {
                "REVIEWED": "REVIEW",
                "APPROVED": "APPROVE",
                "SIGNED": "SIGN",
                "RELEASED": "RELEASE",
            }.get(target_status, "EDIT")

            log_entry = audit_cls._append_log_unlocked(
                conn=conn,
                organization_id=organization_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action_name,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                ip_address=ip_address,
                before_state={"status": current_status},
                after_state={"status": target_status, "small_plant_mode": is_small},
            )
            conn.commit()

    return {
        "entity_id": entity_id,
        "previous_status": current_status,
        "new_status": target_status,
        "action_by": user_name,
        "action_role": user_role,
        "audit_sequence": log_entry["sequence_number"],
        "record_hash": log_entry["record_hash"],
    }


def set_legal_hold(
    audit_cls: Any,
    organization_id: str,
    entity_id: str,
    legal_hold: bool,
    user_id: str,
    user_name: str,
    user_role: str,
    reason: str,
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    """Toggles legal-hold flag on an entity to prevent any deletion."""
    audit_cls.init_tables()
    now = datetime.now(timezone.utc).isoformat()
    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM entity_workflow_records WHERE entity_id = ? AND organization_id = ?",
                (entity_id, organization_id),
            )
            row = cur.fetchone()
            if not row:
                cur.execute(
                    """
                    INSERT INTO entity_workflow_records (
                        entity_id, organization_id, entity_type, current_status, legal_hold,
                        is_deleted, last_action_by, last_action_role, updated_at
                    ) VALUES (?, ?, 'CERTIFICATE', 'UPLOADED', ?, 0, ?, ?, ?)
                    """,
                    (entity_id, organization_id, 1 if legal_hold else 0, user_name, user_role, now),
                )
                before_hold = False
                entity_type = "CERTIFICATE"
            else:
                before_hold = bool(row["legal_hold"])
                entity_type = row["entity_type"]
                cur.execute(
                    """
                    UPDATE entity_workflow_records
                    SET legal_hold = ?, updated_at = ?
                    WHERE entity_id = ? AND organization_id = ?
                    """,
                    (1 if legal_hold else 0, now, entity_id, organization_id),
                )

            action = "LEGAL_HOLD_ENABLE" if legal_hold else "LEGAL_HOLD_DISABLE"
            audit_cls._append_log_unlocked(
                conn=conn,
                organization_id=organization_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                ip_address=ip_address,
                before_state={"legal_hold": before_hold},
                after_state={"legal_hold": legal_hold, "reason": reason},
            )
            conn.commit()

    return {"entity_id": entity_id, "legal_hold": legal_hold, "reason": reason}


def delete_entity(
    audit_cls: Any,
    organization_id: str,
    entity_id: str,
    user_id: str,
    user_name: str,
    user_role: str,
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    """Soft-deletes an entity with strict legal-hold protection and immutable hash logging."""
    audit_cls.init_tables()
    if user_role not in ["OWNER", "ADMIN"]:
        raise PermissionError("Only plant OWNER or ADMIN can perform deletions.")

    now = datetime.now(timezone.utc).isoformat()
    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM entity_workflow_records WHERE entity_id = ? AND organization_id = ?",
                (entity_id, organization_id),
            )
            row = cur.fetchone()
            if not row:
                raise ValueError(f"Entity '{entity_id}' not found.")

            if row["legal_hold"]:
                raise PermissionError(
                    f"CRITICAL: Deletion rejected. Entity '{entity_id}' is locked under statutory Legal-Hold for active EU/UK audit."
                )

            cur.execute(
                """
                UPDATE entity_workflow_records
                SET is_deleted = 1, deleted_at = ?, deleted_by = ?, updated_at = ?
                WHERE entity_id = ? AND organization_id = ?
                """,
                (now, user_name, now, entity_id, organization_id),
            )

            audit_cls._append_log_unlocked(
                conn=conn,
                organization_id=organization_id,
                entity_type=row["entity_type"],
                entity_id=entity_id,
                action="DELETE",
                user_id=user_id,
                user_name=user_name,
                user_role=user_role,
                ip_address=ip_address,
                before_state={"is_deleted": 0, "status": row["current_status"]},
                after_state={"is_deleted": 1, "soft_delete": True},
            )
            conn.commit()

    return {"entity_id": entity_id, "status": "soft_deleted", "deleted_at": now}


def add_comment(
    audit_cls: Any,
    organization_id: str,
    entity_type: str,
    entity_id: str,
    author_id: str,
    author_name: str,
    author_role: str,
    comment_text: str,
    ip_address: str = "127.0.0.1",
) -> Dict[str, Any]:
    """Posts an immutable comment, parses @mentions, and queues in-app notifications."""
    audit_cls.init_tables()
    mentions = re.findall(r"@([\w.-]+)", comment_text)
    comment_id = f"cmt_{hashlib.sha256(f'{entity_id}{datetime.now().isoformat()}'.encode()).hexdigest()[:10]}"
    now = datetime.now(timezone.utc).isoformat()

    with audit_cls._lock:
        with _get_db() as conn:
            conn.execute(
                """
                INSERT INTO entity_comments (
                    id, organization_id, entity_type, entity_id, author_id,
                    author_name, author_role, comment_text, mentions_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    comment_id, organization_id, entity_type, entity_id, author_id,
                    author_name, author_role, comment_text, json.dumps(mentions), now,
                ),
            )

            for mention in mentions:
                notif_id = f"notif_{hashlib.sha256(f'{mention}{now}'.encode()).hexdigest()[:10]}"
                conn.execute(
                    """
                    INSERT INTO in_app_notifications (
                        id, organization_id, recipient_identifier, sender_name,
                        entity_type, entity_id, notification_text, created_at, is_read
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                    """,
                    (
                        notif_id, organization_id, mention, author_name,
                        entity_type, entity_id, f"{author_name} mentioned you in {entity_id}: \"{comment_text[:80]}\"", now,
                    ),
                )

            audit_cls._append_log_unlocked(
                conn=conn,
                organization_id=organization_id,
                entity_type=entity_type,
                entity_id=entity_id,
                action="COMMENT",
                user_id=author_id,
                user_name=author_name,
                user_role=author_role,
                ip_address=ip_address,
                before_state={},
                after_state={"comment_id": comment_id, "mentions": mentions, "snippet": comment_text[:120]},
            )
            conn.commit()

    return {
        "id": comment_id,
        "entity_id": entity_id,
        "author_name": author_name,
        "comment_text": comment_text,
        "mentions": mentions,
        "created_at": now,
    }


def list_comments(audit_cls: Any, organization_id: str, entity_id: str) -> List[Dict[str, Any]]:
    audit_cls.init_tables()
    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM entity_comments WHERE organization_id = ? AND entity_id = ? ORDER BY created_at ASC",
                (organization_id, entity_id),
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]


def list_notifications(audit_cls: Any, organization_id: str, recipient: str) -> List[Dict[str, Any]]:
    audit_cls.init_tables()
    with audit_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM in_app_notifications WHERE organization_id = ? AND recipient_identifier = ? ORDER BY created_at DESC",
                (organization_id, recipient),
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]
