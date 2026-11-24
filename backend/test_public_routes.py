"""
HEATLEDGER AI: Mandatory Authentication & Public Route Allowlist Audit (Prompt A1)
Specification: Prompt Pack v4 - Phase A (Task A1 Mandatory Login)

Proves that:
1. Every private route rejects requests without valid session cookie/Bearer token with HTTP 401.
2. Only routes explicitly registered in public_routes.py are accessible without credentials.
3. Global auth dependency protects all application routes.
"""

import pytest
from starlette.testclient import TestClient

try:
    from main import app
    from public_routes import (
        PUBLIC_EXACT_PATHS,
        PUBLIC_PREFIX_PATHS,
        WEBHOOK_PATHS,
        CRON_PREFIX_PATHS,
        is_public_route,
    )
    from auth_service import AuthService
except ImportError:
    from backend.main import app
    from backend.public_routes import (
        PUBLIC_EXACT_PATHS,
        PUBLIC_PREFIX_PATHS,
        WEBHOOK_PATHS,
        CRON_PREFIX_PATHS,
        is_public_route,
    )
    from backend.auth_service import AuthService


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def valid_auth_headers():
    token = AuthService.create_jwt(
        user_id="usr_qa_04",
        org_id="org_howrah_steel_01",
        role="QA_INSPECTOR",
    )
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# 1. Unit Tests for public_routes Allowlist
# ==============================================================================

def test_public_routes_allowlist_evaluation():
    """Verifies that is_public_route correctly classifies public vs protected endpoints."""
    # Public exact paths
    assert is_public_route("/") is True
    assert is_public_route("/healthz") is True
    assert is_public_route("/readyz") is True
    assert is_public_route("/api/auth/login") is True
    assert is_public_route("/api/auth/demo-login") is True
    assert is_public_route("/api/auth/verify-pin") is True

    # Public prefix paths (tools, verification, share tokens)
    assert is_public_route("/api/check") is True
    assert is_public_route("/api/check/cn-code") is True
    assert is_public_route("/api/share/token_abc123") is True
    assert is_public_route("/api/verify/hash_xyz987") is True
    assert is_public_route("/api/roi/share/proposal_token_1") is True

    # Webhooks (signature verified)
    assert is_public_route("/api/billing/webhook") is True
    assert is_public_route("/api/intake/webhook") is True
    assert is_public_route("/api/intake/whatsapp") is True

    # Cron paths (secret verified)
    assert is_public_route("/api/cron/check-deadlines") is True

    # Protected private endpoints must NEVER be public
    assert is_public_route("/api/suppliers") is False
    assert is_public_route("/api/cbam/workspace-data") is False
    assert is_public_route("/api/extraction/telemetry") is False
    assert is_public_route("/api/extraction/budget-status") is False
    assert is_public_route("/api/vitals/summary") is False
    assert is_public_route("/api/suppliers/templates/learned") is False
    assert is_public_route("/api/ledger/heats") is False
    assert is_public_route("/api/dossier/sign") is False
    assert is_public_route("/api/specs/grades") is False


# ==============================================================================
# 2. Integration Tests: Private Endpoints Return 401 Without Session
# ==============================================================================

def test_private_routes_return_401_without_cookie_or_token(client):
    """
    Prompt A1 Verification:
    Directly tests that private API routes identified in prompt pack v4 inspection
    return HTTP 401 when accessed without an authenticated session.
    """
    private_test_endpoints = [
        ("GET", "/api/suppliers"),
        ("GET", "/api/cbam/workspace-data"),
        ("GET", "/api/extraction/telemetry"),
        ("GET", "/api/extraction/budget-status"),
        ("GET", "/api/vitals/summary"),
        ("GET", "/api/suppliers/templates/learned"),
        ("GET", "/api/ledger/heats"),
        ("GET", "/api/audit/logs"),
        ("GET", "/api/notifications"),
        ("GET", "/api/specs/grades"),
    ]

    for method, path in private_test_endpoints:
        if method == "GET":
            res = client.get(path)
        else:
            res = client.post(path, json={})

        assert res.status_code == 401, (
            f"SECURITY BREACH: Protected endpoint {path} returned status {res.status_code} "
            f"instead of 401 when called without credentials."
        )
        data = res.json()
        assert "detail" in data


def test_public_routes_succeed_without_token(client):
    """Verifies that public health and auth routes remain accessible without credentials."""
    res_healthz = client.get("/healthz")
    assert res_healthz.status_code == 200

    res_readyz = client.get("/readyz")
    assert res_readyz.status_code == 200

    # Public check route
    res_check = client.get("/api/check")
    assert res_check.status_code in (200, 404, 405)  # Method not allowed or ok, but definitely not 401!
    assert res_check.status_code != 401


def test_authenticated_request_succeeds_with_bearer_token(client, valid_auth_headers):
    """Verifies that valid Bearer tokens or cookies pass global authentication gate."""
    res = client.get("/api/suppliers", headers=valid_auth_headers)
    assert res.status_code == 200
    assert "suppliers" in res.json() or isinstance(res.json(), list)


def test_authenticated_request_succeeds_with_session_cookie(client):
    """Verifies that httpOnly session cookie hl_access_token satisfies mandatory auth."""
    token = AuthService.create_jwt(
        user_id="usr_qa_04",
        org_id="org_howrah_steel_01",
        role="QA_INSPECTOR",
    )
    client.cookies.set("hl_access_token", token)
    res = client.get("/api/suppliers")
    assert res.status_code == 200


# ==============================================================================
# 3. Comprehensive Route Audit: No Route Lacks Auth Protection
# ==============================================================================

def test_startup_route_audit_no_unprotected_private_route(client):
    """
    Prompt A1 Requirement:
    Startup test that inspects all registered routes on the FastAPI app and ensures
    every single non-public route enforces 401 for unauthenticated calls.
    """
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", set())
        if not path or not methods:
            continue

        # Skip HEAD, OPTIONS
        active_methods = {m for m in methods if m not in ("HEAD", "OPTIONS")}
        if not active_methods:
            continue

        # If route has dynamic path parameters like {id}, substitute a placeholder
        test_path = path
        if "{" in test_path:
            import re
            test_path = re.sub(r"\{[a-zA-Z0-9_]+\}", "test_param", test_path)

        if is_public_route(test_path):
            continue

        # If not public, must reject unauthenticated call with 401
        for m in active_methods:
            response = client.request(m, test_path)
            assert response.status_code == 401, (
                f"UNPROTECTED ROUTE FOUND: {m} {path} (tested as {test_path}) returned "
                f"{response.status_code} instead of 401 when accessed without authentication!"
            )
