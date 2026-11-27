"""
HEATLEDGER AI: Prompt Pack v5 Task 4.3 Verification Suite
Verifies Sessions, Cookies, Refresh Token Family Reuse Detection, Exhaustive CSRF Protection,
Declarative Role Matrix RBAC, and Strict JWT Validation:
  Run: pytest -k 'csrf or role_matrix or refresh_reuse'
"""

import base64
import json
import os
import time
import uuid

import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

from backend.auth_service import AuthService, LoginRateLimiter
from backend.db.connection import get_db_connection
from backend.main import app
from backend.public_routes import is_csrf_exempt_route
from backend.role_matrix import (
    CANONICAL_ROLES,
    ROLE_MATRIX,
    resolve_route_policy,
)

client = TestClient(app)


def _iter_all_api_routes(routes):
    """Recursively collects every APIRoute including FastAPI _IncludedRouter sub-routers."""
    for r in routes:
        if isinstance(r, APIRoute):
            yield r
        elif hasattr(r, "original_router"):
            yield from _iter_all_api_routes(r.original_router.routes)
        elif hasattr(r, "routes"):
            yield from _iter_all_api_routes(r.routes)


@pytest.fixture(autouse=True)
def reset_state():
    LoginRateLimiter.reset_for_tests()
    client.cookies.clear()
    yield
    client.cookies.clear()
    LoginRateLimiter.reset_for_tests()


def _create_verified_user_for_role(org_id: str, role: str):
    """Creates a real verified user in SQLite/DB for any canonical role and issues valid JWT + session cookies."""
    unique = uuid.uuid4().hex[:6]
    uid = f"usr_{role.lower()}_{unique}"
    email = f"{role.lower()}_{unique}@rolematrix.in"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT OR IGNORE INTO organizations (id, name, slug, created_at)
            VALUES (?, 'Role Matrix Forgings Ltd', ?, datetime('now'))
        """, (org_id, f"rm-{org_id[-6:]}"))
        conn.execute("""
            INSERT INTO users (id, email, password_hash, salt, name, emp_id, designation, totp_secret_hex, is_active, email_verified, created_at)
            VALUES (?, ?, '$argon2id$dummy', '', ?, ?, ?, '', 1, 1, datetime('now'))
        """, (uid, email, f"Test {role}", f"EMP-{unique}", role))
        conn.execute("""
            INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (f"mem_{uid}_{org_id}", uid, org_id, role))
        conn.commit()
    token = AuthService.create_jwt(user_id=uid, org_id=org_id, role=role)
    return uid, token


# ==============================================================================
# 1. Cookie Attributes & Documented CSRF Exception
# ==============================================================================

def test_v5_4_3_cookie_attributes_and_docs():
    res = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!",
    }, headers={"X-Forwarded-For": "198.51.100.80"})
    assert res.status_code == 200

    set_cookies = res.headers.get_list("set-cookie")
    by_name = {}
    for raw in set_cookies:
        name = raw.split("=", 1)[0].strip()
        by_name[name] = raw.lower()

    assert "hl_access_token" in by_name
    assert "httponly" in by_name["hl_access_token"]
    assert "samesite=lax" in by_name["hl_access_token"]
    assert "path=/" in by_name["hl_access_token"]

    assert "hl_refresh_token" in by_name
    assert "httponly" in by_name["hl_refresh_token"]
    assert "samesite=lax" in by_name["hl_refresh_token"]
    assert "path=/api/auth" in by_name["hl_refresh_token"]

    assert "hl_csrf_token" in by_name
    assert "httponly" not in by_name["hl_csrf_token"]  # Sole documented exception
    assert "samesite=lax" in by_name["hl_csrf_token"]

    # Check documentation of the sole httpOnly=False exception in docs/SECURITY.md
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    with open(os.path.join(repo_root, "docs", "SECURITY.md"), "r", encoding="utf-8") as f:
        sec_doc = f.read()
    assert "hl_csrf_token" in sec_doc and "httpOnly=False" in sec_doc


# ==============================================================================
# 2. Refresh Token Family Reuse Detection & Server-Side Logout
# ==============================================================================

def test_v5_4_3_refresh_reuse_revokes_entire_family_and_server_logout():
    # 1. Login creates initial refresh token r1 inside family F1
    res_login = client.post("/api/auth/login", json={
        "email": "inspector@howrahsteel.in",
        "password": "InspectorPassword2026!",
    }, headers={"X-Forwarded-For": "198.51.100.81"})
    assert res_login.status_code == 200
    r1 = res_login.cookies.get("hl_refresh_token")
    assert r1

    # 2. Rotate r1 -> r2 (same family)
    res_rot = client.post("/api/auth/refresh", cookies={"hl_refresh_token": r1})
    assert res_rot.status_code == 200
    r2 = res_rot.cookies.get("hl_refresh_token")
    assert r2 and r2 != r1

    # 3. Replay old token r1 -> triggers reuse attack detection & revokes ENTIRE family (including r2!)
    client.cookies.clear()
    res_replay = client.post("/api/auth/refresh", cookies={"hl_refresh_token": r1})
    assert res_replay.status_code == 401
    assert "reuse" in res_replay.text.lower() or "revoked" in res_replay.text.lower()

    # Verify r2 (issued before replay) is NOW ALSO REVOKED because whole family was invalidated!
    res_victim = client.post("/api/auth/refresh", cookies={"hl_refresh_token": r2})
    assert res_victim.status_code == 401

    # 4. Server-side /logout revokes refresh token in DB
    res_login2 = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!",
    }, headers={"X-Forwarded-For": "198.51.100.82"})
    assert res_login2.status_code == 200
    r_logout = res_login2.cookies.get("hl_refresh_token")

    res_out = client.post("/api/auth/logout", cookies={"hl_refresh_token": r_logout})
    assert res_out.status_code == 200
    assert res_out.json().get("server_revoked") is True

    # Using logged-out refresh token must fail
    client.cookies.clear()
    res_after_logout = client.post("/api/auth/refresh", cookies={"hl_refresh_token": r_logout})
    assert res_after_logout.status_code == 401


# ==============================================================================
# 3. Exhaustive CSRF Enumeration Across ALL Mutating Routes
# ==============================================================================

def test_v5_4_3_csrf_all_mutating_routes_require_header():
    """
    Enumerates EVERY POST, PUT, PATCH, DELETE route in the FastAPI application.
    Non-exempt routes MUST fail with 403 when invoked with session cookies without X-CSRF-Token.
    """
    res_login = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!",
    }, headers={"X-Forwarded-For": "198.51.100.83"})
    assert res_login.status_code == 200
    access_cookie = res_login.cookies.get("hl_access_token")
    csrf_cookie = res_login.cookies.get("hl_csrf_token")
    client.cookies.clear()

    seen = set()
    checked_count = 0
    for route in _iter_all_api_routes(app.routes):
        for method in sorted(route.methods or set()):
            if method not in ("POST", "PUT", "PATCH", "DELETE"):
                continue
            # Substitute concrete safe path params for parameterized URLs
            concrete_path = (
                route.path
                .replace("{org_id}", "org_howrah_steel_01")
                .replace("{job_id}", "job_123")
                .replace("{user_id}", "usr_123")
                .replace("{pairing_id}", "pair_123")
                .replace("{key_id}", "key_123")
                .replace("{notification_id}", "notif_123")
                .replace("{entity_id}", "ent_123")
                .replace("{token}", "tok_123")
                .replace("{request_id}", "req_123")
                .replace("{bill_id}", "bill_123")
                .replace("{calc_id}", "calc_123")
                .replace("{reg_id}", "reg_123")
                .replace("{slug}", "slug_123")
                .replace("{sha256}", "a" * 64)
            )
            if (method, concrete_path) in seen:
                continue
            seen.add((method, concrete_path))

            if is_csrf_exempt_route(concrete_path):
                continue

            checked_count += 1
            cookies = {"hl_access_token": access_cookie, "hl_csrf_token": csrf_cookie}

            # 1) No X-CSRF-Token header -> MUST return 403
            res_missing = client.request(method, concrete_path, cookies=cookies, json={})
            assert res_missing.status_code == 403, (
                f"CSRF VULNERABILITY: {method} {concrete_path} returned {res_missing.status_code} "
                f"instead of 403 without X-CSRF-Token!"
            )
            assert "CSRF" in res_missing.text

            # 2) Mismatched X-CSRF-Token header -> MUST return 403
            res_wrong = client.request(
                method, concrete_path, cookies=cookies, headers={"X-CSRF-Token": "forged_csrf_value"}, json={}
            )
            assert res_wrong.status_code == 403

    assert checked_count >= 50, f"Expected >= 50 protected mutating routes checked, got {checked_count}"

    # Verify with valid CSRF token, middleware allows dispatch cleanly (e.g. /api/auth/sign-out-everywhere -> 200)
    res_ok = client.post(
        "/api/auth/sign-out-everywhere",
        cookies={"hl_access_token": access_cookie, "hl_csrf_token": csrf_cookie},
        headers={"X-CSRF-Token": csrf_cookie},
    )
    assert res_ok.status_code == 200


# ==============================================================================
# 4. Declarative Role Matrix Table & Generated Route-Group Access Tests
# ==============================================================================

# Concrete probe per route-group key in ROLE_MATRIX
ROLE_MATRIX_PROBES = [
    ("admin_platform", "GET", "/api/admin/metrics", None),
    ("billing_owner_mutations", "POST", "/api/billing/create-order", {"plan_id": "PLANT", "billing_cycle": "MONTHLY"}),
    ("billing_owner_mutations", "POST", "/api/billing/upgrade", {"plan_id": "PLANT_PRO", "billing_cycle": "ANNUAL"}),
    ("billing_coupon_preview", "POST", "/api/billing/apply-coupon", {"coupon_code": "EEPC_INDIA_20", "plan_id": "PLANT", "billing_cycle": "MONTHLY"}),
    ("billing_read", "GET", "/api/billing/subscription", None),
    ("team_management_mutations", "POST", "/api/team/invite", {"email": "newmember@rolematrix.in", "role": "VIEWER"}),
    ("org_impersonation_audit", "GET", "/api/org/impersonation-logs", None),
    ("privacy_gdpr", "POST", "/api/privacy/settings", {"retention_years": 7}),
    ("dossier_signing", "POST", "/api/dossier/sign-certificate", {"invoice_number": "INV-1", "heat_number": "H-1", "total_see": 1.8}),
    ("melt_and_pour_seal", "POST", "/api/melt-and-pour/seal-pack", {"shipment_data": {}, "signer_name": "Test"}),
    ("readiness_approve", "POST", "/api/readiness/approve-release", {"shipment_id": "SHP-1", "evaluation": {"score": 100, "status": "READY"}}),
    ("auth_mfa_enrol", "POST", "/api/auth/totp/enrol", {}),
    ("auth_self_service", "GET", "/api/auth/me", None),
    ("consultant_portal", "GET", "/api/consultant/portfolio", None),
    ("integrations_owner", "POST", "/api/integrations/api-keys", {"name": "ERP Key", "scopes": ["read:shipments"]}),
    ("operational_mutations", "POST", "/api/cbam/calculate-what-if", {"production_tonnes": 100}),
    ("operational_reads", "GET", "/api/team/members", None),
]


def test_v5_4_3_role_matrix_generated_checks():
    """
    Tests allowed and forbidden decisions across ALL 7 canonical roles
    generated directly from the authoritative ROLE_MATRIX table.
    """
    org_id = f"org_rm_{uuid.uuid4().hex[:6]}"
    tokens_by_role = {}
    uids_by_role = {}
    for role in CANONICAL_ROLES:
        uid, tok = _create_verified_user_for_role(org_id, role)
        tokens_by_role[role] = tok
        uids_by_role[role] = uid

    for group_key, method, path, payload in ROLE_MATRIX_PROBES:
        policy = ROLE_MATRIX[group_key]
        assert resolve_route_policy(path, method).group == group_key

        for role in CANONICAL_ROLES:
            headers = {"Authorization": f"Bearer {tokens_by_role[role]}"}
            res = client.request(method, path, headers=headers, json=payload)

            if role not in policy.allowed_roles:
                assert res.status_code == 403, (
                    f"ROLE MATRIX BREACH: {role} MUST get 403 on {method} {path} "
                    f"(group={group_key}, allowed={policy.allowed_roles}), got {res.status_code}: {res.text}"
                )
            elif policy.requires_step_up:
                # Without fresh TOTP step-up, even QA_INSPECTOR / QA_HEAD must get 403
                assert res.status_code == 403
                assert "step-up" in res.text.lower() or "mfa" in res.text.lower()
            else:
                # Allowed role passes RBAC (never rejected with 401 or role-matrix 403)
                assert res.status_code != 401, f"{role} got 401 on {method} {path}"
                if res.status_code == 403:
                    assert "role-matrix" not in res.text and "Insufficient privileges" not in res.text, (
                        f"Allowed role {role} wrongly blocked by RBAC on {method} {path}: {res.text}"
                    )

    # Verify fresh TOTP step-up unlocks dossier_signing for QA_INSPECTOR
    qa_uid = uids_by_role["QA_INSPECTOR"]
    qa_hdr = {"Authorization": f"Bearer {tokens_by_role['QA_INSPECTOR']}"}
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("UPDATE users SET last_step_up_at = ? WHERE id = ?", (int(time.time()), qa_uid))
        conn.commit()
    res_signed = client.post(
        "/api/dossier/sign-certificate",
        headers=qa_hdr,
        json={"invoice_number": "INV-RM-1", "heat_number": "HEAT-RM-1", "total_see": 1.85},
    )
    assert res_signed.status_code == 200, f"QA_INSPECTOR with fresh step-up failed to sign: {res_signed.text}"


def test_v5_4_3_role_matrix_zero_any_logged_in_user_mutations():
    """
    Requirement 5: Audits every private POST, PUT, PATCH, DELETE route in the app
    and proves VIEWER cannot perform mutations (no 'any logged-in user' mutation routes).
    """
    org_id = f"org_nomut_{uuid.uuid4().hex[:6]}"
    _, viewer_tok = _create_verified_user_for_role(org_id, "VIEWER")

    for route in _iter_all_api_routes(app.routes):
        for method in sorted(route.methods or set()):
            if method not in ("POST", "PUT", "PATCH", "DELETE"):
                continue
            if is_csrf_exempt_route(route.path):
                continue
            if route.path in ("/api/auth/sign-out-everywhere",):
                continue

            policy = resolve_route_policy(route.path, method)
            assert "VIEWER" not in policy.allowed_roles, (
                f"Mutating route {method} {route.path} permits VIEWER in ROLE_MATRIX!"
            )


# ==============================================================================
# 5. Strict JWT Security: Algorithm Pinning, Aud/Iss/Exp, and Key ID (kid) Rotation
# ==============================================================================

def test_v5_4_3_jwt_alg_none_aud_iss_kid_and_rotation(monkeypatch):
    valid_token = AuthService.create_jwt(user_id="usr_qa_04", org_id="org_howrah_steel_01", role="QA_INSPECTOR")
    ok, claims, err = AuthService.verify_jwt(valid_token)
    assert ok is True, err
    assert claims["iss"] == "HeatLedger-Auth-Engine"
    assert claims["aud"] == "HeatLedger-API"
    assert claims["exp"] - claims["iat"] == 900  # 15 minutes

    hdr_b64, payload_b64, sig_b64 = valid_token.split(".")
    hdr = json.loads(base64.urlsafe_b64decode(hdr_b64 + "==").decode("utf-8"))
    assert hdr["alg"] == "HS256"
    assert hdr["kid"] == "k1"

    def _b64(obj):
        return base64.urlsafe_b64encode(json.dumps(obj, separators=(",", ":")).encode("utf-8")).decode("ascii").rstrip("=")

    # 1. alg='none' rejected
    alg_none = f"{_b64({'alg': 'none', 'typ': 'JWT', 'kid': 'k1'})}.{payload_b64}."
    assert AuthService.verify_jwt(alg_none)[0] is False

    # 2. Algorithm switching (HS384 / RS256) rejected
    alg_rs = f"{_b64({'alg': 'RS256', 'typ': 'JWT', 'kid': 'k1'})}.{payload_b64}.{sig_b64}"
    assert AuthService.verify_jwt(alg_rs)[0] is False

    # 3. Unknown kid rejected
    bad_kid = f"{_b64({'alg': 'HS256', 'typ': 'JWT', 'kid': 'k99'})}.{payload_b64}.{sig_b64}"
    assert AuthService.verify_jwt(bad_kid)[0] is False

    # 4. Wrong aud / iss rejected
    bad_aud = AuthService.create_jwt({"sub": "usr_qa_04", "aud": "OtherService", "iss": "HeatLedger-Auth-Engine"})
    assert AuthService.verify_jwt(bad_aud)[0] is False
    bad_iss = AuthService.create_jwt({"sub": "usr_qa_04", "aud": "HeatLedger-API", "iss": "EvilIssuer"})
    assert AuthService.verify_jwt(bad_iss)[0] is False

    # 5. Zero-downtime JWT kid rotation k1 -> k2
    old_secret = os.environ.get("JWT_SECRET", "")
    # Sign token under k1 using active test secret
    from backend.settings import get_jwt_secret
    k1_secret = get_jwt_secret()
    k2_secret = "f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3c2b1a0"

    monkeypatch.setenv("JWT_KEY_ID", "k2")
    monkeypatch.setenv("JWT_SECRET", k2_secret)
    monkeypatch.setenv("JWT_PREVIOUS_KEYS", f"k1:{k1_secret}")

    # k1 token remains valid during rotation window
    ok_old, _, err_old = AuthService.verify_jwt(valid_token)
    assert ok_old is True, err_old

    # Newly issued tokens use kid='k2'
    k2_token = AuthService.create_jwt(user_id="usr_qa_04", org_id="org_howrah_steel_01", role="QA_INSPECTOR")
    k2_hdr = json.loads(base64.urlsafe_b64decode(k2_token.split(".")[0] + "==").decode("utf-8"))
    assert k2_hdr["kid"] == "k2"
    assert AuthService.verify_jwt(k2_token)[0] is True
    if old_secret:
        monkeypatch.setenv("JWT_SECRET", old_secret)
