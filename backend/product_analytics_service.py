"""
HEATLEDGER AI: Prompt R7 - Product Analytics Engine
Strictly limited to 8 core lifecycle events. No third-party trackers.
Events:
1. signup
2. first_upload
3. first_shipment
4. first_pack
5. first_share
6. invite_sent
7. payment
8. churn_reason
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Set

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

logger = logging.getLogger("heatledger.product_analytics")

CANONICAL_EVENTS: Set[str] = {
    "signup",
    "first_upload",
    "first_shipment",
    "first_pack",
    "first_share",
    "invite_sent",
    "payment",
    "churn_reason"
}


class ProductAnalyticsService:
    @staticmethod
    def init_tables():
        with get_db_connection(is_service_role=True) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS product_analytics_events (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    user_id TEXT,
                    event_name TEXT NOT NULL,
                    properties_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_prod_analytics_org ON product_analytics_events(organization_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_prod_analytics_event ON product_analytics_events(event_name);")
            conn.commit()

    @classmethod
    def record_event(
        cls,
        organization_id: str,
        event_name: str,
        user_id: Optional[str] = None,
        properties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Records a product lifecycle event.
        Rejects non-canonical events. No third-party tracking cookies or scripts.
        """
        cls.init_tables()
        clean_event = event_name.strip().lower()
        if clean_event not in CANONICAL_EVENTS:
            raise ValueError(f"Event '{event_name}' is not in allowed product analytics schema: {sorted(list(CANONICAL_EVENTS))}")

        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        props_str = json.dumps(properties or {})

        with get_db_connection(is_service_role=True) as conn:
            conn.execute("""
                INSERT INTO product_analytics_events (id, organization_id, user_id, event_name, properties_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                event_id,
                organization_id,
                user_id or "anonymous",
                clean_event,
                props_str,
                now_iso
            ))
            conn.commit()

        logger.info(f"[Analytics] Event '{clean_event}' recorded for org {organization_id}")
        return {
            "event_id": event_id,
            "organization_id": organization_id,
            "event_name": clean_event,
            "created_at": now_iso
        }

    @classmethod
    def get_event_summary(cls, organization_id: Optional[str] = None) -> Dict[str, int]:
        """Returns event counts across all 8 canonical events for an org or globally."""
        cls.init_tables()
        summary = {evt: 0 for evt in CANONICAL_EVENTS}
        with get_db_connection(is_service_role=True) as conn:
            cur = conn.cursor()
            if organization_id:
                cur.execute("""
                    SELECT event_name, COUNT(*) as cnt
                    FROM product_analytics_events
                    WHERE organization_id = ?
                    GROUP BY event_name
                """, (organization_id,))
            else:
                cur.execute("""
                    SELECT event_name, COUNT(*) as cnt
                    FROM product_analytics_events
                    GROUP BY event_name
                """)
            for row in cur.fetchall():
                evt = row["event_name"]
                if evt in summary:
                    summary[evt] = row["cnt"]
        return summary
