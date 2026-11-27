"""
HEATLEDGER AI: Prompt Pack v5 Task 3.3 — Public Surface, URL Tricks, Cleanup & 404 Parity
Proves:
1. Every public, webhook, and cron route/prefix has a documented reason in PUBLIC_PATH_REASONS.
2. /api/check/cleanup requires X-Cron-Secret (returns 401 without it) and cannot be abused with max_age_seconds=0.
3. Private analytics (/api/analytics/emissions-trend, cbam-forecast, mill-benchmarking, inventory-grades, export.csv, summary)
   and /api/extraction/telemetry reject unauthenticated requests with 401.
4. /docs, /redoc, /openapi.json are excluded from public routes when ENV=production.
5. Missing resource vs cross-tenant resource return identical 404 status/body and comparable timing.
6. AuditService rejects missing organization_id instead of falling back to a default org.
"""

import time
import pytest
from fastapi.testclient import TestClient

from main import app
from auth_service import AuthService
from audit_service import AuditService
from settings import get_webhook_secret
from public_routes import (
    PUBLIC_EXACT_PATHS,
    PUBLIC_PREFIX_PATHS,
    WEBHOOK_PATHS,
    WEBHOOK_PREFIX_PATHS,
    CRON_EXACT_PATHS,
    CRON_PREFIX_PATHS,
    PUBLIC_PATH_REASONS,
    is_public_route,
)

client = TestClient(app)


def test_v5_3_3_every_public_path_has_documented_reason():
    """Fails if any public, webhook, or cron path/prefix is added without a reason entry."""
    all_entries = (
        set(PUBLIC_EXACT_PATHS)
        | set(PUBLIC_PREFIX_PATHS)
        | set(WEBHOOK_PATHS)
        | set(WEBHOOK_PREFIX_PATHS)
        | set(CRON_EXACT_PATHS)
        | set(CRON_PREFIX_PATHS)
    )
    missing = sorted(entry for entry in all_entries if not PUBLIC_PATH_REASONS.get(entry, "").strip())
    assert missing == [], f"Public/webhook/cron paths missing documented reason: {missing}"


def test_v5_3_3_check_cleanup_requires_cron_secret():
    """Unauthenticated POST /api/check/cleanup?max_age_seconds=0 must return 401."""
    res_unauth = client.post("/api/check/cleanup?max_age_seconds=0")
    assert res_unauth.status_code == 401

    res_wrong = client.post(
        "/api/check/cleanup?max_age_seconds=0",
        headers={"X-Cron-Secret": "wrong-cron-secret"},
    )
    assert res_wrong.status_code == 401

    cron_secret = get_webhook_secret("CRON_SECRET")
    res_ok = client.post(
        "/api/check/cleanup?max_age_seconds=0",
        headers={"X-Cron-Secret": cron_secret},
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "ok"


@pytest.mark.parametrize(
    "path",
    [
        "/api/analytics/emissions-trend",
        "/api/analytics/cbam-forecast",
        "/api/analytics/mill-benchmarking",
        "/api/analytics/inventory-grades",
        "/api/analytics/export.csv",
        "/api/analytics/summary",
        "/api/extraction/telemetry",
    ],
)
def test_v5_3_3_private_analytics_and_telemetry_require_auth(path):
    """Broad /api/analytics prefix is gone; private analytics and telemetry return 401 without session."""
    assert is_public_route(path) is False
    res = client.get(path)
    assert res.status_code == 401


def test_v5_3_3_docs_disabled_from_public_allowlist_in_production(monkeypatch):
    monkeypatch.setenv("ENV", "production")
    assert is_public_route("/docs") is False
    assert is_public_route("/docs/oauth2-redirect") is False
    assert is_public_route("/redoc") is False
    assert is_public_route("/openapi.json") is False


def test_v5_3_3_share_and_verify_unknown_tokens_return_404():
    """Unknown share and verification tokens must return 404."""
    r_share = client.get("/api/share/nonexistent_token_v5_check")
    r_verify = client.get("/api/verify/nonexistent_hash_v5_check")
    assert r_share.status_code == 404
    assert r_verify.status_code == 404


def test_v5_3_3_missing_vs_cross_tenant_404_parity_and_timing():
    """
    Missing resource ID and another plant's resource ID must return identical 404 status/body
    and comparable response timing so IDs cannot be probed.
    """
    token_b = AuthService.create_jwt(
        user_id="usr_probe_b",
        org_id="org_probe_plant_b",
        role="OWNER",
    )
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Warmup
    client.get("/api/heats/nonexistent_heat_id_999", headers=headers_b)

    t0 = time.perf_counter()
    res_missing = client.get("/api/heats/nonexistent_heat_id_999", headers=headers_b)
    dt_missing = time.perf_counter() - t0

    t1 = time.perf_counter()
    # Heat ID belonging to another org (or non-owned heat)
    res_other = client.get("/api/heats/heat_howrah_316l_001", headers=headers_b)
    dt_other = time.perf_counter() - t1

    assert res_missing.status_code == 404
    assert res_other.status_code == 404
    assert res_missing.json() == res_other.json()
    # Timing parity within generous CI tolerance (50ms)
    assert abs(dt_missing - dt_other) < 0.05


def test_v5_3_3_audit_service_requires_organization_id():
    with pytest.raises(ValueError, match="organization_id is required"):
        AuditService.list_audit_trail("")
    with pytest.raises(ValueError, match="organization_id is required"):
        AuditService.export_csv("   ")
    with pytest.raises(ValueError, match="organization_id is required"):
        AuditService.export_pdf_certificate("")
