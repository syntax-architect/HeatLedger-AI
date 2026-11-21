"""
Unit tests for Prompt P11: API Keys & Webhooks Integration Service
"""

import os
import pytest
import json
from backend.db.connection import get_db_connection, SQLITE_DB_PATH as DB_PATH
from integration_service import IntegrationService, SUPPORTED_SCOPES, SUPPORTED_WEBHOOK_EVENTS

TEST_ORG = "org_test_howrah_integrations"

@pytest.fixture(autouse=True)
def clean_db():
    IntegrationService._init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM api_keys WHERE organization_id = ?", (TEST_ORG,))
        cursor.execute("DELETE FROM webhook_subscriptions WHERE organization_id = ?", (TEST_ORG,))
        cursor.execute("DELETE FROM webhook_delivery_logs WHERE organization_id = ?", (TEST_ORG,))
        conn.commit()
    yield

def test_api_key_lifecycle_and_hashing():
    # 1. Create scoped live API key
    key_res = IntegrationService.create_api_key(
        organization_id=TEST_ORG,
        name="ERP Sync Production",
        scopes=["read:shipments", "write:heats"],
        environment="live"
    )

    assert key_res["key_id"].startswith("key_")
    assert key_res["raw_key"].startswith("hl_live_")
    assert "..." in key_res["masked_key"]
    assert key_res["scopes"] == ["read:shipments", "write:heats"]
    assert key_res["is_active"] is True

    # Verify raw key is NOT stored plaintext in SQLite DB
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT hashed_key, key_prefix FROM api_keys WHERE id = ?", (key_res["key_id"],))
        row = cursor.fetchone()
        assert row is not None
        assert row[0] != key_res["raw_key"]
        assert len(row[0]) == 64  # SHA-256 hex length

    # 2. Validate API key
    valid_res = IntegrationService.validate_api_key(key_res["raw_key"], required_scope="read:shipments")
    assert valid_res is not None
    assert valid_res["organization_id"] == TEST_ORG

    # 3. Scope restriction validation
    denied_res = IntegrationService.validate_api_key(key_res["raw_key"], required_scope="read:analytics")
    assert denied_res is None

    # 4. List keys (returns masked)
    keys_list = IntegrationService.list_api_keys(TEST_ORG)
    assert len(keys_list) == 1
    assert "raw_key" not in keys_list[0]
    assert keys_list[0]["masked_key"] == key_res["masked_key"]

    # 5. Revoke key
    revoked = IntegrationService.revoke_api_key(TEST_ORG, key_res["key_id"])
    assert revoked is True
    # Validation should now fail
    assert IntegrationService.validate_api_key(key_res["raw_key"]) is None

def test_webhook_subscription_and_hmac_ping():
    # 1. Register webhook
    hook_res = IntegrationService.create_webhook_subscription(
        organization_id=TEST_ORG,
        target_url="https://erp.howrahsteel.com/webhooks/heatledger",
        events=["shipment.ready", "certificate.extracted"],
        description="Main ERP Ingestion"
    )

    assert hook_res["webhook_id"].startswith("wh_")
    assert hook_res["secret_token"].startswith("whsec_")
    assert "shipment.ready" in hook_res["events"]

    # 2. List webhooks
    hooks = IntegrationService.list_webhooks(TEST_ORG)
    assert len(hooks) == 1
    assert hooks[0]["target_url"] == "https://erp.howrahsteel.com/webhooks/heatledger"

    # 3. Send test ping with HMAC-SHA256 signature
    ping_res = IntegrationService.send_test_ping(TEST_ORG, hook_res["webhook_id"])
    assert ping_res["success"] is True
    assert ping_res["signature_header"].startswith("sha256=")

    # 4. Verify delivery log
    logs = IntegrationService.list_delivery_logs(TEST_ORG)
    assert len(logs) == 1
    assert logs[0]["event_type"] == "ping"
    assert logs[0]["signature_header"] == ping_res["signature_header"]
    assert logs[0]["status_code"] == 200

    # 5. Delete webhook
    deleted = IntegrationService.delete_webhook(TEST_ORG, hook_res["webhook_id"])
    assert deleted is True
    assert len(IntegrationService.list_webhooks(TEST_ORG)) == 0

def test_tally_and_erp_exports():
    xml_out = IntegrationService.export_tally_xml(TEST_ORG)
    assert "<ENVELOPE>" in xml_out
    assert "<TALLYREQUEST>Import Data</TALLYREQUEST>" in xml_out
    assert "</ENVELOPE>" in xml_out

    csv_out = IntegrationService.export_tally_csv(TEST_ORG)
    assert "Item_Name,Heat_Number,Steel_Grade" in csv_out
    assert "Melt_Pour_Country" in csv_out
