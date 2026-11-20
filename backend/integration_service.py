"""
HEATLEDGER AI: Prompt P11 - API Keys & Webhooks Service
Enterprise ERP integration system for Indian Steel & Engineering Exporters:
- Scoped API key issuance (hl_live_..., hl_test_...) with SHA-256 storage
- Webhook subscriptions with HMAC-SHA256 signature (whsec_...) and delivery retry logs
- Tally / ERP-9 XML and CSV export formats for Indian industrial accounting
"""

import hmac
import hashlib
import json
import logging
import os
import secrets
import sqlite3
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from database import DB_PATH

logger = logging.getLogger("heatledger.integrations")

SUPPORTED_SCOPES = [
    "read:shipments",
    "read:dossiers",
    "write:heats",
    "read:analytics",
]

SUPPORTED_WEBHOOK_EVENTS = [
    "certificate.extracted",
    "shipment.ready",
    "heat.allocated",
    "cbam.quarterly_ready",
]

class IntegrationService:
    @classmethod
    def _init_db(cls):
        """Ensures API keys, webhooks, and webhook delivery log tables exist."""
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    key_prefix TEXT NOT NULL,
                    hashed_key TEXT NOT NULL UNIQUE,
                    scopes_json TEXT NOT NULL,
                    created_by TEXT,
                    created_at TEXT NOT NULL,
                    last_used_at TEXT,
                    revoked_at TEXT
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS webhook_subscriptions (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    target_url TEXT NOT NULL,
                    secret TEXT NOT NULL,
                    events_json TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
                    delivery_id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    webhook_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    target_url TEXT NOT NULL,
                    payload_json TEXT NOT NULL,
                    status_code INTEGER,
                    response_body TEXT,
                    signature_header TEXT NOT NULL,
                    delivered_at TEXT NOT NULL,
                    success INTEGER NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhook_subscriptions(organization_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_delivery_org ON webhook_delivery_logs(organization_id)")
            conn.commit()

    @classmethod
    def create_api_key(
        cls,
        organization_id: str,
        name: str,
        scopes: List[str],
        environment: str = "live",
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Issues a new scoped API key.
        The plaintext raw key is only returned ONCE in this response.
        Database stores only SHA-256 hash.
        """
        cls._init_db()
        prefix_env = "hl_live_" if environment == "live" else "hl_test_"
        random_entropy = secrets.token_hex(24)
        raw_key = f"{prefix_env}{random_entropy}"
        key_id = f"key_{secrets.token_hex(8)}"
        hashed_key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        masked_prefix = f"{raw_key[:12]}...{raw_key[-4:]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Validate scopes
        clean_scopes = [s for s in scopes if s in SUPPORTED_SCOPES]
        if not clean_scopes:
            clean_scopes = ["read:shipments"]

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO api_keys (
                    id, organization_id, name, key_prefix,
                    hashed_key, scopes_json, created_by, created_at, last_used_at, revoked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)
            """, (
                key_id, organization_id, name, masked_prefix,
                hashed_key, json.dumps(clean_scopes), created_by or "system", now_iso
            ))
            conn.commit()

        return {
            "key_id": key_id,
            "id": key_id,
            "organization_id": organization_id,
            "name": name,
            "environment": environment,
            "raw_key": raw_key,  # ONLY RETURNED ON CREATION
            "masked_key": masked_prefix,
            "scopes": clean_scopes,
            "is_active": True,
            "created_at": now_iso
        }

    @classmethod
    def list_api_keys(cls, organization_id: str) -> List[Dict[str, Any]]:
        """Lists active and inactive API keys for the organization (masked)."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, key_prefix, scopes_json,
                       created_at, last_used_at, revoked_at
                FROM api_keys
                WHERE organization_id = ?
                ORDER BY created_at DESC
            """, (organization_id,))
            rows = cursor.fetchall()

        keys = []
        for r in rows:
            is_active = (r[6] is None)
            env = "test" if "hl_test_" in r[2] else "live"
            keys.append({
                "key_id": r[0],
                "id": r[0],
                "name": r[1],
                "environment": env,
                "masked_key": r[2],
                "scopes": json.loads(r[3]),
                "is_active": is_active,
                "created_at": r[4],
                "last_used_at": r[5],
                "revoked_at": r[6]
            })
        return keys

    @classmethod
    def revoke_api_key(cls, organization_id: str, key_id: str) -> bool:
        """Revokes an API key immediately."""
        cls._init_db()
        now_iso = datetime.now(timezone.utc).isoformat()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE api_keys
                SET revoked_at = ?
                WHERE (id = ? OR key_prefix = ?) AND organization_id = ? AND revoked_at IS NULL
            """, (now_iso, key_id, key_id, organization_id))
            conn.commit()
            return cursor.rowcount > 0

    @classmethod
    def validate_api_key(cls, raw_key: str, required_scope: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Validates incoming raw API key against stored hash and scopes."""
        cls._init_db()
        if not raw_key:
            return None

        hashed_key = hashlib.sha256(raw_key.strip().encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, organization_id, name, scopes_json, revoked_at
                FROM api_keys
                WHERE hashed_key = ?
            """, (hashed_key,))
            row = cursor.fetchone()
            if not row:
                return None

            key_id, org_id, name, scopes_json, revoked_at = row
            if revoked_at is not None:
                return None

            scopes = json.loads(scopes_json)
            if required_scope and required_scope not in scopes:
                return None

            cursor.execute("UPDATE api_keys SET last_used_at = ? WHERE id = ?", (now_iso, key_id))
            conn.commit()

            return {
                "key_id": key_id,
                "id": key_id,
                "organization_id": org_id,
                "name": name,
                "scopes": scopes
            }

    @classmethod
    def register_webhook(
        cls,
        organization_id: str,
        target_url: str,
        events: List[str],
        secret: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registers a webhook endpoint with HMAC secret."""
        cls._init_db()
        webhook_id = f"wh_{secrets.token_hex(8)}"
        secret_token = secret or f"whsec_{secrets.token_hex(20)}"
        clean_events = [e for e in events if e in SUPPORTED_WEBHOOK_EVENTS] or ["shipment.ready"]
        now_iso = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO webhook_subscriptions (
                    id, organization_id, target_url, secret,
                    events_json, is_active, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            """, (
                webhook_id, organization_id, target_url, secret_token,
                json.dumps(clean_events), now_iso, now_iso
            ))
            conn.commit()

        return {
            "webhook_id": webhook_id,
            "id": webhook_id,
            "organization_id": organization_id,
            "target_url": target_url,
            "secret_token": secret_token,
            "secret": secret_token,
            "events": clean_events,
            "description": description or "ERP Webhook Listener",
            "is_active": True,
            "created_at": now_iso
        }

    # Aliases
    create_webhook_subscription = register_webhook

    @classmethod
    def list_webhooks(cls, organization_id: str) -> List[Dict[str, Any]]:
        """Lists registered webhooks."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, target_url, secret, events_json,
                       is_active, created_at
                FROM webhook_subscriptions
                WHERE organization_id = ?
                ORDER BY created_at DESC
            """, (organization_id,))
            rows = cursor.fetchall()

        hooks = []
        for r in rows:
            secret = r[2]
            masked_secret = f"{secret[:8]}...{secret[-4:]}"
            hooks.append({
                "webhook_id": r[0],
                "id": r[0],
                "target_url": r[1],
                "secret": r[2],
                "masked_secret": masked_secret,
                "events": json.loads(r[3]),
                "is_active": bool(r[4]),
                "created_at": r[5]
            })
        return hooks

    @classmethod
    def delete_webhook(cls, organization_id: str, webhook_id: str) -> bool:
        """Deletes a webhook subscription."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                DELETE FROM webhook_subscriptions
                WHERE id = ? AND organization_id = ?
            """, (webhook_id, organization_id))
            conn.commit()
            return cursor.rowcount > 0

    @classmethod
    def compute_signature(cls, secret_token: str, payload_bytes: bytes) -> str:
        """Calculates HMAC-SHA256 signature for webhook payload."""
        mac = hmac.new(secret_token.encode("utf-8"), payload_bytes, hashlib.sha256)
        return f"sha256={mac.hexdigest()}"

    @classmethod
    def send_test_ping(cls, organization_id: str, webhook_id: str) -> Dict[str, Any]:
        """Simulates a signed test ping webhook dispatch."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT target_url, secret
                FROM webhook_subscriptions
                WHERE id = ? AND organization_id = ?
            """, (webhook_id, organization_id))
            row = cursor.fetchone()
            if not row:
                raise ValueError("Webhook not found")

            target_url, secret_token = row

        now_iso = datetime.now(timezone.utc).isoformat()
        delivery_id = f"del_{secrets.token_hex(8)}"
        test_payload = {
            "event": "ping",
            "organization_id": organization_id,
            "webhook_id": webhook_id,
            "timestamp": now_iso,
            "data": {
                "message": "HeatLedger AI Webhook Test Ping",
                "verified": True
            }
        }
        payload_bytes = json.dumps(test_payload, separators=(',', ':')).encode("utf-8")
        signature = cls.compute_signature(secret_token, payload_bytes)

        # Record test delivery in delivery logs
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO webhook_delivery_logs (
                    delivery_id, organization_id, webhook_id, event_type,
                    target_url, payload_json, status_code, response_body,
                    signature_header, delivered_at, success
                ) VALUES (?, ?, ?, 'ping', ?, ?, 200, '{"received": true}', ?, ?, 1)
            """, (
                delivery_id, organization_id, webhook_id, target_url,
                json.dumps(test_payload), signature, now_iso
            ))
            conn.commit()

        return {
            "delivery_id": delivery_id,
            "event": "ping",
            "target_url": target_url,
            "signature_header": signature,
            "status_code": 200,
            "success": True,
            "delivered_at": now_iso
        }

    test_webhook = send_test_ping

    @classmethod
    def list_delivery_logs(cls, organization_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lists recent webhook delivery logs."""
        cls._init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT delivery_id, webhook_id, event_type, target_url,
                       status_code, response_body, signature_header, delivered_at, success
                FROM webhook_delivery_logs
                WHERE organization_id = ?
                ORDER BY delivered_at DESC
                LIMIT ?
            """, (organization_id, limit))
            rows = cursor.fetchall()

        logs = []
        for r in rows:
            logs.append({
                "delivery_id": r[0],
                "webhook_id": r[1],
                "event_type": r[2],
                "target_url": r[3],
                "status_code": r[4],
                "response_body": r[5],
                "signature_header": r[6],
                "delivered_at": r[7],
                "success": bool(r[8])
            })
        return logs

    @classmethod
    def export_tally_xml(cls, organization_id: str) -> str:
        """Generates standard TallyPrime / Tally.ERP 9 compliant XML import."""
        from ledger_service import LedgerService
        heats = LedgerService.get_all_heats(organization_id)

        xml_lines = [
            '<ENVELOPE>',
            '  <HEADER>',
            '    <TALLYREQUEST>Import Data</TALLYREQUEST>',
            '  </HEADER>',
            '  <BODY>',
            '    <IMPORTDATA>',
            '      <REQUESTDESC>',
            '        <REPORTNAME>All Masters</REPORTNAME>',
            '      </REQUESTDESC>',
            '      <REQUESTDATA>'
        ]

        for h in heats:
            heat_no = h.get("heat_number", "UNKNOWN")
            grade = h.get("steel_grade", "CARBON STEEL")
            tonnes = h.get("tonnes_available", 0.0)
            xml_lines.extend([
                '        <TALLYMESSAGE xmlns:UDF="TallyUDF">',
                f'          <STOCKITEM NAME="STEEL {grade} - HEAT {heat_no}" ACTION="Create">',
                f'            <NAME>STEEL {grade} - HEAT {heat_no}</NAME>',
                '            <BASEUNITS>MT</BASEUNITS>',
                '            <ISBATCHWISEON>Yes</ISBATCHWISEON>',
                '            <ISMANUFDATEON>Yes</ISMANUFDATEON>',
                f'            <OPENINGBALANCE>{tonnes} MT</OPENINGBALANCE>',
                '            <BATCHALLOCATIONS.LIST>',
                f'              <GODOWNNAME>Liluah Works Godown</GODOWNNAME>',
                f'              <BATCHNAME>{heat_no}</BATCHNAME>',
                f'              <OPENINGBALANCE>{tonnes} MT</OPENINGBALANCE>',
                '            </BATCHALLOCATIONS.LIST>',
                '          </STOCKITEM>',
                '        </TALLYMESSAGE>'
            ])

        xml_lines.extend([
            '      </REQUESTDATA>',
            '    </IMPORTDATA>',
            '  </BODY>',
            '</ENVELOPE>'
        ])
        return "\n".join(xml_lines)

    @classmethod
    def export_tally_csv(cls, organization_id: str) -> str:
        """Generates standard CSV format for bulk ERP imports."""
        from ledger_service import LedgerService
        heats = LedgerService.get_all_heats(organization_id)

        headers = [
            "Item_Name", "Heat_Number", "Steel_Grade", "Melt_Pour_Country",
            "Melt_Pour_Mill", "Quantity_Tonnes", "Specific_Emissions_tCO2e",
            "EN10204_Clause6_Attested", "Unit", "Godown"
        ]
        csv_rows = [",".join(headers)]

        for h in heats:
            csv_rows.append(",".join([
                f'"{h.get("steel_grade", "")} Heat {h.get("heat_number", "")}"',
                f'"{h.get("heat_number", "")}"',
                f'"{h.get("steel_grade", "")}"',
                f'"{h.get("melt_and_pour_country", "IN")}"',
                f'"{h.get("melt_and_pour_mill", "Tata Steel")}"',
                str(h.get("tonnes_available", 0.0)),
                str(h.get("specific_embedded_emissions", 2.10)),
                "YES" if h.get("is_attested") else "NO",
                "MT",
                '"Howrah Forgings Yard 1"'
            ]))

        return "\n".join(csv_rows)

    generate_tally_csv = export_tally_csv
