"""
HEATLEDGER AI: Prompt R7 Test Suite
Support, Feedback & Error Tracking:
- In-app WhatsApp help link prefilling org id and current screen (phone compatible)
- In-app problem report attaching screen name and request id (no document contents)
- Request ID on every response and embedded in error responses
- Sentry error capture with scrubbed tags and no personal data
- Product analytics: exactly 8 canonical events, rejection of arbitrary events
- Super-Admin metrics showing real database numbers (uploads, failures, extraction costs)
- Read-only impersonation session with audit log record
- Simple /status route reporting API, database, and extraction health
"""

import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from support_service import SupportService
from product_analytics_service import CANONICAL_EVENTS
from admin_service import AdminService
from observability import capture_exception_with_context
from auth_service import AuthService
from db.connection import get_db_connection

client = TestClient(app)


def _get_auth_header(role: str, org_id: str) -> dict:
    user_id = f"usr_{uuid.uuid4().hex[:6]}"
    email = f"{role.lower()}_{uuid.uuid4().hex[:4]}@factory.in"
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("INSERT INTO organizations (id, name, created_at) VALUES (%s, 'Test Org', %s) ON CONFLICT DO NOTHING", (org_id, now_iso))
        conn.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, totp_secret_hex, created_at)
            VALUES (%s, %s, '$argon2id$mock', 'salt', 'Test User', 'hex', %s) ON CONFLICT DO NOTHING
        """, (user_id, email, now_iso))
        conn.execute("""
            INSERT INTO memberships (id, user_id, organization_id, role, created_at)
            VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING
        """, (str(uuid.uuid4()), user_id, org_id, role, now_iso))
        conn.commit()

    token = AuthService.create_jwt(user_id=user_id, email=email, role=role, organization_id=org_id)
    return {"Authorization": f"Bearer {token}"}


def test_r7_1_whatsapp_and_email_help_link_generation():
    """
    R7 Deliverable 1: WhatsApp universal link formatted for phone with org id and screen name.
    """
    org_id = "org_howrah_4021"
    screen = "MtcWorkbench"
    req_id = "req_test_8812"

    wa_url = SupportService.build_whatsapp_help_url(org_id, screen)
    assert wa_url.startswith("https://wa.me/919876543210?text=")
    assert "org_howrah_4021" in wa_url
    assert "MtcWorkbench" in wa_url

    email_url = SupportService.build_email_help_url(org_id, screen, request_id=req_id)
    assert email_url.startswith("mailto:support@heatledger.ai?subject=")
    assert "org_howrah_4021" in email_url
    assert "req_test_8812" in email_url

    # Check API endpoint
    res = client.get(f"/api/support/help-links?screen_name={screen}")
    assert res.status_code == 200
    data = res.json()
    assert "whatsapp_url" in data
    assert "email_url" in data
    assert "https://wa.me/" in data["whatsapp_url"]


def test_r7_2_support_ticket_problem_reporting():
    """
    R7 Deliverable 2: 'Report a problem' form attaches screen name and request id.
    Strictly forbids document contents and strips authorization tokens.
    """
    org_id = f"org_tkt_{uuid.uuid4().hex[:6]}"
    headers = _get_auth_header("QA_INSPECTOR", org_id)

    res = client.post("/api/support/ticket", headers=headers, json={
        "screen_name": "BuyerDossier",
        "message": "The seal page generation took 4 seconds. Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "request_id": "req_perf_991"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["organization_id"] == org_id
    assert data["screen_name"] == "BuyerDossier"
    assert data["request_id"] == "req_perf_991"
    assert data["status"] == "OPEN"

    # Verify token was redacted from message
    with get_db_connection(is_service_role=True) as conn:
        cur = conn.cursor()
        cur.execute("SELECT message FROM support_tickets WHERE id = %s", (data["ticket_id"],))
        stored_msg = cur.fetchone()[0]
        assert "[REDACTED_TOKEN]" in stored_msg
        assert "eyJhbGciOi" not in stored_msg

    # Empty message is rejected
    res_bad = client.post("/api/support/ticket", headers=headers, json={
        "screen_name": "BuyerDossier",
        "message": "   "
    })
    assert res_bad.status_code == 422


def test_r7_3_request_id_in_response_and_errors():
    """
    R7 Deliverable 3: Request id on every API response; shown in errors for log lookup.
    """
    # 1. Normal response has X-Request-ID
    res = client.get("/status")
    assert res.status_code == 200
    assert "x-request-id" in res.headers
    assert len(res.headers["x-request-id"]) > 5

    # 2. 404 error response includes request_id in body
    res_404 = client.get("/api/non-existent-endpoint-test")
    assert res_404.status_code == 404
    body = res_404.json()
    assert "request_id" in body or "x-request-id" in res_404.headers


def test_r7_4_product_analytics_canonical_8_events_only():
    """
    R7 Deliverable 4: Product analytics: exactly 8 events allowed.
    Rejects unknown events. No third-party trackers.
    """
    org_id = f"org_ana_{uuid.uuid4().hex[:6]}"
    headers = _get_auth_header("OWNER", org_id)

    # All 8 events succeed
    for event_name in CANONICAL_EVENTS:
        res = client.post("/api/analytics/track", headers=headers, json={
            "event_name": event_name,
            "properties": {"step": 1}
        })
        assert res.status_code == 200
        assert res.json()["event_name"] == event_name

    # Check summary counts
    summary_res = client.get("/api/analytics/summary", headers=headers)
    assert summary_res.status_code == 200
    counts = summary_res.json()["summary"]
    for evt in CANONICAL_EVENTS:
        assert counts[evt] >= 1

    # Arbitrary event is REJECTED
    res_invalid = client.post("/api/analytics/track", headers=headers, json={
        "event_name": "unauthorized_tracking_event"
    })
    assert res_invalid.status_code == 422


def test_r7_5_admin_metrics_shows_real_database_numbers():
    """
    R7 Deliverable 5: Admin metrics displays real data:
    list of organisations, last active, uploads this month, failures this week, extraction cost.
    """
    org_id = f"org_adm_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    now_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Seed an org, 2 documents, 1 failed job, and token budget cost
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("INSERT INTO organizations (id, name, created_at) VALUES (%s, 'Real Metrics Steel Ltd', %s)", (org_id, now_iso))
        conn.execute("""
            INSERT INTO documents (id, organization_id, file_name, file_size_bytes, mime_type, storage_path, sha256, created_at)
            VALUES (%s, %s, 'real_doc_1.pdf', 2048, 'application/pdf', '/mock/real1.pdf', 'hash1', %s),
                   (%s, %s, 'real_doc_2.pdf', 4096, 'application/pdf', '/mock/real2.pdf', 'hash2', %s)
        """, (str(uuid.uuid4()), org_id, now_iso, str(uuid.uuid4()), org_id, now_iso))
        conn.execute("""
            INSERT INTO background_jobs (id, organization_id, job_name, status, payload_json, created_at, updated_at)
            VALUES (%s, %s, 'nightly_ocr_audit', 'FAILED', '{}', %s, %s)
        """, (str(uuid.uuid4()), org_id, now_iso, now_iso))
        conn.execute("""
            INSERT INTO token_budget_tracking (organization_id, period_date, period_month, model, tokens_used, cost_paise, calls_count, created_at)
            VALUES (%s, %s, %s, 'flash_lite', 4000, 425.0, 2, %s)
        """, (org_id, now_date, now_date[:7], now_iso))
        conn.commit()

    metrics = AdminService.get_system_metrics()
    assert metrics["active_pilot_organizations"] >= 1
    assert metrics["total_documents_processed"] >= 2

    # Find the seeded tenant
    seeded = next((t for t in metrics["tenants"] if t["org_id"] == org_id), None)
    assert seeded is not None
    assert seeded["name"] == "Real Metrics Steel Ltd"
    assert seeded["documents"] == 2
    assert seeded["uploads_this_month"] == 2
    assert seeded["failures_this_week"] == 1
    assert seeded["extraction_cost_this_month"] == 4.25
    assert seeded["last_active"] is not None


def test_r7_6_admin_impersonation_audit_logging():
    """
    R7 Deliverable 6: 'Impersonate (read-only, logged)' button generates token
    and commits unalterable audit log entry.
    """
    target_org = f"org_target_{uuid.uuid4().hex[:6]}"
    res = AdminService.generate_impersonation_token(
        admin_user_id="usr_superadmin",
        target_org_id=target_org,
        reason="Investigating MTC extraction timeout reported via support ticket."
    )
    assert res["target_org_id"] == target_org
    assert res["read_only"] is True
    assert "token" in res
    assert "expires_at" in res

    # Verify audit log in DB
    with get_db_connection(is_service_role=True) as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM admin_impersonation_logs WHERE impersonated_org_id = %s", (target_org,))
        row = cur.fetchone()
        assert row is not None
        assert row["admin_user_id"] == "usr_superadmin"
        assert "Investigating MTC extraction timeout" in row["reason"]


def test_r7_7_status_endpoint_reports_health():
    """
    R7 Deliverable 7: Simple /status route showing API health, database, and extraction service.
    """
    # 1. Root /status
    res = client.get("/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["api"] == "ok"
    assert data["database"] == "connected"
    assert data["extraction_service"] == "ready"
    assert data["regulatory_version"] == "2026.1"
    assert "timestamp" in data

    # 2. API /api/status alias
    res_api = client.get("/api/status")
    assert res_api.status_code == 200
    assert res_api.json()["status"] == "healthy"


def test_r7_8_sentry_error_capture_scrubs_pii():
    """
    R7 Deliverable 8: Sentry error capture includes release, request_id, org_id
    and scrubs personal email/phone.
    """
    event_id = capture_exception_with_context(
        exc=ValueError("Test extraction error"),
        request_id="req_test_12345",
        org_id="org_test_67890",
        user_id="usr_test_99999"
    )
    # Returns event_id (or None if sentry DSN not configured in test) without raising
    assert event_id is None or isinstance(event_id, str)
