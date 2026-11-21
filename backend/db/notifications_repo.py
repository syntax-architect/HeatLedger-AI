# ============================================================================
# HEATLEDGER AI: Notifications & Preferences Repository (Prompt S3)
# ============================================================================

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from .connection import query_all, query_one, execute_mutation


class NotificationsRepo:
    @staticmethod
    def create_notification(
        notif_id: str,
        organization_id: str,
        title: str,
        message: str,
        event_type: str = "compliance_alert",
        severity: str = "info",
        deep_link: Optional[str] = None,
        recipient_id: Optional[str] = None,
        dedup_hash: Optional[str] = None
    ) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        if not dedup_hash:
            dedup_hash = f"dedup_{notif_id}"
        sql = """
            INSERT INTO notifications
            (id, organization_id, user_id, event_type, title, message, deep_link, severity, dedup_hash, read_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
        """
        return execute_mutation(sql, (
            notif_id, organization_id, recipient_id or "all", event_type, title, message, deep_link, severity, dedup_hash, now_iso
        ))

    @staticmethod
    def list_notifications(
        organization_id: str,
        user_id: Optional[str] = None,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        sql = "SELECT * FROM notifications WHERE organization_id = ?"
        params: List[Any] = [organization_id]
        if user_id:
            sql += " AND (user_id = ? OR user_id = 'all')"
            params.append(user_id)
        if unread_only:
            sql += " AND read_at IS NULL"
        sql += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        return query_all(sql, params)

    @staticmethod
    def mark_as_read(notif_id: str, organization_id: str) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        sql = "UPDATE notifications SET read_at = ? WHERE id = ? AND organization_id = ?"
        return execute_mutation(sql, (now_iso, notif_id, organization_id))

    @staticmethod
    def mark_all_as_read(organization_id: str, user_id: Optional[str] = None) -> int:
        now_iso = datetime.now(timezone.utc).isoformat()
        if user_id:
            sql = "UPDATE notifications SET read_at = ? WHERE organization_id = ? AND (user_id = ? OR user_id = 'all')"
            return execute_mutation(sql, (now_iso, organization_id, user_id))
        else:
            sql = "UPDATE notifications SET read_at = ? WHERE organization_id = ?"
            return execute_mutation(sql, (now_iso, organization_id))

    # --- Preferences (Clean Schema Design: Columns and Code Match) ---
    @staticmethod
    def get_preferences(organization_id: str, user_id: str) -> Dict[str, Any]:
        sql = "SELECT * FROM notification_preferences WHERE organization_id = ? AND user_id = ? LIMIT 1"
        row = query_one(sql, (organization_id, user_id))
        if row:
            return {
                "organization_id": row["organization_id"],
                "user_id": row["user_id"],
                "in_app": bool(row.get("in_app", 1)),
                "email": bool(row.get("email", 1)),
                "whatsapp": bool(row.get("whatsapp", 0)),
                "regulatory_deadlines": bool(row.get("regulatory_deadlines", 1)),
                "signoff_alerts": bool(row.get("signoff_alerts", 1)),
                "updated_at": row.get("updated_at", "")
            }
        return {
            "organization_id": organization_id,
            "user_id": user_id,
            "in_app": True,
            "email": True,
            "whatsapp": False,
            "regulatory_deadlines": True,
            "signoff_alerts": True
        }

    @staticmethod
    def update_preferences(
        organization_id: str,
        user_id: str,
        prefs: Dict[str, Any]
    ) -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        pref_id = f"pref_{organization_id}_{user_id}"
        in_app = 1 if prefs.get("in_app", True) else 0
        email = 1 if prefs.get("email", True) else 0
        whatsapp = 1 if prefs.get("whatsapp", False) else 0
        regulatory_deadlines = 1 if prefs.get("regulatory_deadlines", True) else 0
        signoff_alerts = 1 if prefs.get("signoff_alerts", True) else 0

        sql = """
            INSERT INTO notification_preferences (
                pref_id, organization_id, user_id, in_app, email, whatsapp,
                regulatory_deadlines, signoff_alerts, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(organization_id, user_id) DO UPDATE SET
                in_app = excluded.in_app,
                email = excluded.email,
                whatsapp = excluded.whatsapp,
                regulatory_deadlines = excluded.regulatory_deadlines,
                signoff_alerts = excluded.signoff_alerts,
                updated_at = excluded.updated_at
        """
        execute_mutation(sql, (
            pref_id, organization_id, user_id, in_app, email, whatsapp,
            regulatory_deadlines, signoff_alerts, now_iso
        ))
        return NotificationsRepo.get_preferences(organization_id, user_id)
