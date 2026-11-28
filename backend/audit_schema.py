"""
HEATLEDGER AI: Audit Trail Schema Initialization & Demo Seeding
Extracted from audit_service.py for Prompt Pack v5 Task 6.1.
"""

import os
from datetime import datetime, timezone
from typing import Any

try:
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from db.connection import get_db_connection as _get_db


def seed_demo_workflow(audit_cls: Any, conn: Any) -> None:
    """Seeds sample EN 10204 workflow records and genesis audit chain rows for demo/test runs."""
    now = datetime.now(timezone.utc).isoformat()
    records = [
        ("EXP-2026-109", "org_howrah_steel_01", "SHIPMENT", "SIGNED", 0, 0, None, None, "R. K. Chatterjee", "QA_INSPECTOR", now),
        ("EXP-2026-110", "org_howrah_steel_01", "SHIPMENT", "APPROVED", 0, 0, None, None, "S. N. Sharma", "QA", now),
        ("EXP-2026-111", "org_howrah_steel_01", "SHIPMENT", "UPLOADED", 0, 0, None, None, "A. K. Verma", "DISPATCH", now),
        ("TSJ-26-9021", "org_howrah_steel_01", "CERTIFICATE", "SIGNED", 1, 0, None, None, "R. K. Chatterjee", "QA_INSPECTOR", now),
    ]
    conn.executemany(
        """
        INSERT INTO entity_workflow_records (
            entity_id, organization_id, entity_type, current_status, legal_hold,
            is_deleted, deleted_at, deleted_by, last_action_by, last_action_role, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        records,
    )

    audit_cls._append_log_unlocked(
        conn,
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id="EXP-2026-109",
        action="CREATE",
        user_id="usr_dispatch_01",
        user_name="A. K. Verma",
        user_role="DISPATCH",
        ip_address="192.168.1.42",
        before_state={},
        after_state={"status": "UPLOADED", "invoice": "EXP-2026-109", "gross_mt": 24.5},
    )
    audit_cls._append_log_unlocked(
        conn,
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id="EXP-2026-109",
        action="REVIEW",
        user_id="usr_dispatch_01",
        user_name="A. K. Verma",
        user_role="DISPATCH",
        ip_address="192.168.1.42",
        before_state={"status": "UPLOADED"},
        after_state={"status": "REVIEWED"},
    )
    audit_cls._append_log_unlocked(
        conn,
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id="EXP-2026-109",
        action="APPROVE",
        user_id="usr_qa_head_01",
        user_name="S. N. Sharma",
        user_role="QA",
        ip_address="192.168.1.18",
        before_state={"status": "REVIEWED"},
        after_state={"status": "APPROVED"},
    )
    audit_cls._append_log_unlocked(
        conn,
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id="EXP-2026-109",
        action="SIGN",
        user_id="usr_qa_04",
        user_name="R. K. Chatterjee",
        user_role="QA_INSPECTOR",
        ip_address="192.168.1.22",
        before_state={"status": "APPROVED"},
        after_state={"status": "SIGNED", "ecdsa_p256_signed": True},
    )


def init_audit_tables(audit_cls: Any) -> None:
    """Creates audit chain, workflow config, comments, and notification tables."""
    with audit_cls._lock:
        with _get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log_chain (
                    sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    user_role TEXT NOT NULL,
                    ip_address TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    before_state TEXT NOT NULL,
                    after_state TEXT NOT NULL,
                    previous_hash TEXT NOT NULL,
                    record_hash TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS plant_workflow_configs (
                    organization_id TEXT PRIMARY KEY,
                    small_plant_mode INTEGER NOT NULL DEFAULT 0,
                    require_separate_reviewer INTEGER NOT NULL DEFAULT 1,
                    retention_years INTEGER NOT NULL DEFAULT 10,
                    updated_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entity_comments (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    author_id TEXT NOT NULL,
                    author_name TEXT NOT NULL,
                    author_role TEXT NOT NULL,
                    comment_text TEXT NOT NULL,
                    mentions_json TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS in_app_notifications (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    recipient_identifier TEXT NOT NULL,
                    sender_name TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    notification_text TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    is_read INTEGER NOT NULL DEFAULT 0
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS entity_workflow_records (
                    entity_id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    current_status TEXT NOT NULL,
                    legal_hold INTEGER NOT NULL DEFAULT 0,
                    is_deleted INTEGER NOT NULL DEFAULT 0,
                    deleted_at TEXT,
                    deleted_by TEXT,
                    last_action_by TEXT NOT NULL,
                    last_action_role TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)

            is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
            is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
            if is_demo or is_test:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM plant_workflow_configs WHERE organization_id = 'org_howrah_steel_01'")
                if cur.fetchone()[0] == 0:
                    now = datetime.now(timezone.utc).isoformat()
                    conn.execute(
                        """
                        INSERT INTO plant_workflow_configs (
                            organization_id, small_plant_mode, require_separate_reviewer, retention_years, updated_at
                        ) VALUES ('org_howrah_steel_01', 0, 1, 10, ?)
                        """,
                        (now,),
                    )

                cur.execute("SELECT COUNT(*) FROM entity_workflow_records WHERE organization_id = 'org_howrah_steel_01'")
                if cur.fetchone()[0] == 0:
                    seed_demo_workflow(audit_cls, conn)

            conn.commit()
