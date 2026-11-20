"""
HEATLEDGER AI: Prompt P14 - Notification Centre Service
Persistent notification delivery, user preferences, and rate-limiting system:
- Rate limit: max 10 alerts/hour/user to eliminate alert fatigue in busy rolling mills
- Categories / event_types: regulatory_deadline, compliance_alert, system_event, review_pending
- User preference toggles (email, in-app, whatsapp, regulatory, signoff)
"""

import json
import logging
import os
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from database import DB_PATH

logger = logging.getLogger("heatledger.notifications")

MAX_NOTIFICATIONS_PER_HOUR = 10

class NotificationService:
    @classmethod
    def _init_db(cls):
        """Ensures notification and user preference tables exist."""
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    deep_link TEXT,
                    severity TEXT NOT NULL,
                    dedup_hash TEXT,
                    read_at TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notification_preferences (
                    pref_id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    in_app INTEGER NOT NULL DEFAULT 1,
                    email INTEGER NOT NULL DEFAULT 1,
                    whatsapp INTEGER NOT NULL DEFAULT 0,
                    regulatory_deadlines INTEGER NOT NULL DEFAULT 1,
                    signoff_alerts INTEGER NOT NULL DEFAULT 1,
                    updated_at TEXT NOT NULL,
                    UNIQUE(organization_id, user_id)
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_org ON notifications(organization_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(organization_id, user_id, created_at)")
            conn.commit()

    @classmethod
    def create_notification(
        cls,
        organization_id: str,
        title: str,
        message: str,
        category: str = "compliance_alert",
        severity: str = "info",
        link: Optional[str] = None,
        recipient_id: Optional[str] = None,
        user_id: Optional[str] = None,
        event_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Creates a notification if the 10/hour rate limit for the user has not been exceeded.
        """
        cls._init_db()
        effective_user = user_id or recipient_id or "default_user"
        effective_cat = event_type or category or "compliance_alert"
        now = datetime.now(timezone.utc)
        one_hour_ago = (now - timedelta(hours=1)).isoformat()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            # Check rate limit
            cursor.execute("""
                SELECT COUNT(*) FROM notifications
                WHERE organization_id = ? AND user_id = ? AND created_at > ?
            """, (organization_id, effective_user, one_hour_ago))
            recent_count = cursor.fetchone()[0]

            if recent_count >= MAX_NOTIFICATIONS_PER_HOUR:
                logger.warning(f"Notification rate limit reached for {effective_user} ({recent_count}/hr)")
                return None

            notification_id = f"notif_{secrets.token_hex(8)}"
            now_iso = now.isoformat()
            dedup = f"{organization_id}:{effective_cat}:{secrets.token_hex(4)}"

            cursor.execute("""
                INSERT INTO notifications (
                    id, organization_id, user_id, event_type,
                    title, message, deep_link, severity, dedup_hash, read_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
            """, (
                notification_id, organization_id, effective_user,
                effective_cat, title, message, link, severity, dedup, now_iso
            ))
            conn.commit()

        return {
            "notification_id": notification_id,
            "id": notification_id,
            "organization_id": organization_id,
            "recipient_id": effective_user,
            "user_id": effective_user,
            "title": title,
            "message": message,
            "category": effective_cat,
            "event_type": effective_cat,
            "severity": severity,
            "link": link,
            "deep_link": link,
            "is_read": False,
            "read_at": None,
            "created_at": now_iso
        }

    @classmethod
    def list_notifications(
        cls,
        organization_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lists notifications for organization, auto-seeding defaults if empty."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM notifications WHERE organization_id = ?", (organization_id,))
            count = cursor.fetchone()[0]

            if count == 0:
                cls._seed_default_notifications(organization_id)

            query = """
                SELECT id, user_id, event_type, title, message, deep_link, severity, read_at, created_at
                FROM notifications
                WHERE organization_id = ?
            """
            params: List[Any] = [organization_id]
            if unread_only:
                query += " AND read_at IS NULL"
            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            rows = cursor.fetchall()

        notifs = []
        for r in rows:
            is_read = (r[7] is not None)
            notifs.append({
                "notification_id": r[0],
                "id": r[0],
                "recipient_id": r[1],
                "user_id": r[1],
                "category": r[2],
                "event_type": r[2],
                "title": r[3],
                "message": r[4],
                "link": r[5],
                "deep_link": r[5],
                "severity": r[6],
                "is_read": is_read,
                "read_at": r[7],
                "created_at": r[8]
            })
        return notifs

    @classmethod
    def mark_as_read(cls, organization_id: str, notification_id: str) -> bool:
        """Marks a single notification as read."""
        cls._init_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET read_at = ?
                WHERE id = ? AND organization_id = ? AND read_at IS NULL
            """, (now_iso, notification_id, organization_id))
            conn.commit()
            return cursor.rowcount > 0

    @classmethod
    def mark_all_read(cls, organization_id: str) -> int:
        """Marks all unread notifications as read."""
        cls._init_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE notifications
                SET read_at = ?
                WHERE organization_id = ? AND read_at IS NULL
            """, (now_iso, organization_id))
            conn.commit()
            return cursor.rowcount

    mark_all_as_read = mark_all_read

    @classmethod
    def get_preferences(
        cls,
        organization_id: str = "org_howrah_steel_01",
        user_id: str = "default_user",
        **kwargs
    ) -> Dict[str, Any]:
        """Retrieves user notification preferences or returns defaults."""
        cls._init_db()
        target_org = organization_id or kwargs.get("org_id", "org_howrah_steel_01")
        target_user = user_id or kwargs.get("user", "default_user")
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT prefs_json
                FROM notification_preferences
                WHERE organization_id = ? AND user_id = ?
            """, (target_org, target_user))
            row = cursor.fetchone()

        if row and row[0]:
            try:
                p = json.loads(row[0])
                return {
                    "organization_id": target_org,
                    "user_id": target_user,
                    "in_app": p.get("in_app", True),
                    "email": p.get("email", True),
                    "whatsapp": p.get("whatsapp", False),
                    "regulatory_deadlines": p.get("regulatory_deadlines", True),
                    "signoff_alerts": p.get("signoff_alerts", True),
                    **p
                }
            except Exception:
                pass

        return {
            "organization_id": target_org,
            "user_id": target_user,
            "in_app": True,
            "email": True,
            "whatsapp": False,
            "regulatory_deadlines": True,
            "signoff_alerts": True
        }

    @classmethod
    def update_preferences(
        cls,
        organization_id: str = "org_howrah_steel_01",
        user_id: str = "default_user",
        prefs: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Upserts user notification preferences."""
        cls._init_db()
        target_org = organization_id or kwargs.get("org_id", "org_howrah_steel_01")
        target_user = user_id or kwargs.get("user", "default_user")
        effective_prefs = prefs or kwargs.get("preferences", {})
        now_iso = datetime.now(timezone.utc).isoformat()
        payload_json = json.dumps(effective_prefs)

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO notification_preferences (
                    user_id, organization_id, prefs_json, updated_at
                ) VALUES (?, ?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET
                    organization_id = excluded.organization_id,
                    prefs_json = excluded.prefs_json,
                    updated_at = excluded.updated_at
            """, (target_user, target_org, payload_json, now_iso))
            conn.commit()

        return cls.get_preferences(organization_id=target_org, user_id=target_user)

    @classmethod
    def _seed_default_notifications(cls, organization_id: str):
        """Seeds realistic statutory alerts for Indian steel exporters."""
        now = datetime.now(timezone.utc)
        seeds = [
            (
                "CBAM Q1 2026 Declaration Due in 18 Days",
                "EU Transitional Registry filing deadline is April 30, 2026. 4 shipments are pending signed XML verification.",
                "regulatory_deadline",
                "warning",
                "/app/cbam",
                (now - timedelta(hours=2)).isoformat()
            ),
            (
                "Clause 6 Sign-Off Pending: Heat HT-2026-4401",
                "Shipment SH-2026-081 requires QA Manager digital stamp before customs release seal can be generated.",
                "review_pending",
                "critical",
                "/app/sign-off",
                (now - timedelta(hours=5)).isoformat()
            ),
            (
                "Primary Data Advantage Verified",
                "Q1 calculated specific emissions (2.05 tCO2e/t) successfully beat the EU default benchmark (2.85 tCO2e/t), saving ₹38.1 Lakhs.",
                "compliance_alert",
                "info",
                "/app/insights",
                (now - timedelta(hours=12)).isoformat()
            ),
        ]

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            for title, msg, cat, sev, link, created in seeds:
                notif_id = f"notif_{secrets.token_hex(8)}"
                cursor.execute("""
                    INSERT INTO notifications (
                        id, organization_id, user_id, event_type,
                        title, message, deep_link, severity, dedup_hash, read_at, created_at
                    ) VALUES (?, ?, 'default_user', ?, ?, ?, ?, ?, ?, NULL, ?)
                """, (notif_id, organization_id, cat, title, msg, link, sev, f"{organization_id}:{cat}", created))
            conn.commit()
