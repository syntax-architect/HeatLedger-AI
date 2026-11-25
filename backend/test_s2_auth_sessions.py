"""
HEATLEDGER AI: Prompt S2 Test Suite
Specification:
- Argon2id password hashing, min length 12, offline breached-password check (top 10k).
- Short-lived 15-minute access token + 30-day rotating refresh token in SQLite DB.
- httpOnly, Secure, SameSite=Lax session cookies. Zero token storage in localStorage.
- Login rate limit: 5 failures / 15 minutes per IP and email. Uniform 401 (no account enumeration).
- Password reset via 30-minute signed one-time link, revoking active sessions.
- QA_INSPECTOR TOTP enrolment (QR/base32 + 6-digit confirm + 8 one-time recovery codes).
- 10-minute step-up validity for EN 10204 signing.
- Unified role & tenant checking on all routes (401 without session, 403 for wrong role).
- Audit trail logging for all authentication events.
"""

import hashlib
import json
import os
import time
import uuid
import pytest
from fastapi.testclient import TestClient

os.environ["TRUST_PROXY"] = "true"
from auth_service import AuthService, hash_password, verify_password, validate_password_strength, LoginRateLimiter
from audit_service import AuditService
from main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Ensure rate limiter is clean before each test."""
    LoginRateLimiter.reset_for_tests()


# ==============================================================================
# 1. Password Hashing & Password Strength (Argon2id + Breached List)
# ==============================================================================
def test_s2_1_argon2id_password_hashing():
    pwd = "CustomComplexPassword2026!"
    h, salt = hash_password(pwd)
    # Must use argon2id formatted string
    assert h.startswith("$argon2id$")
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword123!", h) is False


def test_s2_2_password_minimum_length_and_breached_offline_check():
    # 1. Less than 12 characters must fail
    short_pwd = "Short123!"
    valid, err = validate_password_strength(short_pwd)
    assert valid is False
    assert "at least 12 characters" in err

    # 2. Known common/breached password must fail offline check
    breached_pwd = "password123456"
    valid_b, err_b = validate_password_strength(breached_pwd)
    assert valid_b is False
    assert "breached or common" in err_b or "compromised" in err_b

    # 3. Strong compliant password passes
    strong_pwd = "SecureHowrahPlantSteel2026!"
    valid_s, err_s = validate_password_strength(strong_pwd)
    assert valid_s is True
    assert err_s is None


# ==============================================================================
# 2. Login, Rate Limiting & Account Enumeration Defense
# ==============================================================================
def test_s2_3_wrong_password_fails_with_uniform_message():
    res = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "CompletelyWrongPassword123!"
    }, headers={"X-Forwarded-For": "10.10.1.1"})
    assert res.status_code == 401
    assert "Invalid email or password" in res.text


def test_s2_4_nonexistent_email_returns_identical_uniform_message():
    # Account enumeration defense: nonexistent email must return exact same message as wrong password
    res = client.post("/api/auth/login", json={
        "email": "nonexistent_auditor_xyz99@howrahsteel.in",
        "password": "SomeRandomPassword123!"
    }, headers={"X-Forwarded-For": "10.10.1.2"})
    assert res.status_code == 401
    assert "Invalid email or password" in res.text


def test_s2_5_login_rate_limiting_per_ip_and_email():
    target_ip = "192.168.42.99"
    target_email = "victim_account@howrahsteel.in"

    # 5 failed attempts allowed
    for attempt in range(5):
        res = client.post("/api/auth/login", json={
            "email": target_email,
            "password": f"BadPassword_{attempt}_123!"
        }, headers={"X-Forwarded-For": target_ip})
        assert res.status_code == 401

    # 6th attempt must be locked out with HTTP 429
    res_lockout = client.post("/api/auth/login", json={
        "email": target_email,
        "password": "EvenIfThisWereCorrect!"
    }, headers={"X-Forwarded-For": target_ip})
    assert res_lockout.status_code == 429
    assert any(msg in res_lockout.text for msg in ["Too many failed login attempts", "Locked out", "Rate limit quota exceeded"])


# ==============================================================================
# 3. HttpOnly Session Cookies, Refresh Token Rotation & Replay Defense
# ==============================================================================
def test_s2_6_session_cookies_set_on_login():
    res = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!"
    }, headers={"X-Forwarded-For": "10.10.2.1"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert "refresh_token" in data
    assert data["expires_in"] == 900  # 15 minutes

    # Inspect cookies
    cookies = res.cookies
    assert "hl_access_token" in cookies
    assert "hl_refresh_token" in cookies
    assert "hl_csrf_token" in cookies


def test_s2_7_refresh_token_rotation_and_replay_detection():
    # Login to get initial refresh token
    res_login = client.post("/api/auth/login", json={
        "email": "inspector@howrahsteel.in",
        "password": "InspectorPassword2026!"
    }, headers={"X-Forwarded-For": "10.10.2.2"})
    assert res_login.status_code == 200
    initial_refresh = res_login.cookies.get("hl_refresh_token")

    # 1. Rotate refresh token successfully
    client.cookies.set("hl_refresh_token", initial_refresh, path="/api/auth")
    res_refresh = client.post("/api/auth/refresh")
    assert res_refresh.status_code == 200
    refreshed_data = res_refresh.json()
    assert "token" in refreshed_data
    rotated_refresh = res_refresh.cookies.get("hl_refresh_token")
    assert rotated_refresh != initial_refresh

    # 2. Token reuse attack: Presenting the old initial_refresh MUST fail and trigger revocation
    client.cookies.clear()
    res_reuse = client.post("/api/auth/refresh", cookies={"hl_refresh_token": initial_refresh})
    assert res_reuse.status_code == 401
    assert "reuse" in res_reuse.text.lower() or "revoked" in res_reuse.text.lower()


def test_s2_8_logout_revokes_session():
    # Login
    res_login = client.post("/api/auth/login", json={
        "email": "dispatch@howrahsteel.in",
        "password": "DispatchPassword2026!"
    }, headers={"X-Forwarded-For": "10.10.2.3"})
    assert res_login.status_code == 200

    # Logout
    res_logout = client.post("/api/auth/logout")
    assert res_logout.status_code == 200
    assert res_logout.json()["status"] == "logged_out"


# ==============================================================================
# 4. CSRF Protection for Cookie-Based State-Changing Requests
# ==============================================================================
def test_s2_9_csrf_protection_for_cookie_sessions():
    res_login = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!"
    }, headers={"X-Forwarded-For": "10.10.3.1"})
    access_cookie = res_login.cookies.get("hl_access_token")
    csrf_cookie = res_login.cookies.get("hl_csrf_token")

    # 1. State-changing POST using cookie WITHOUT X-CSRF-Token header -> 403
    client.cookies.clear()
    client.cookies.set("hl_access_token", access_cookie)
    client.cookies.set("hl_csrf_token", csrf_cookie)

    res_no_csrf = client.post("/api/auth/totp/enrol")
    assert res_no_csrf.status_code == 403
    assert "CSRF" in res_no_csrf.text

    # 2. State-changing POST WITH valid X-CSRF-Token matching cookie -> 200
    res_with_csrf = client.post("/api/auth/totp/enrol", headers={"X-CSRF-Token": csrf_cookie})
    assert res_with_csrf.status_code == 200


# ==============================================================================
# 5. Password Reset (30-minute signed token)
# ==============================================================================
def test_s2_10_password_reset_flow():
    import re
    from email_service import EmailService
    EmailService.test_outbox.clear()
    email = "auditor@howrahsteel.in"

    # 1. Request reset (API MUST NOT expose token in response body)
    res_req = client.post("/api/auth/request-password-reset", json={"email": email}, headers={"X-Forwarded-For": "10.10.4.1"})
    assert res_req.status_code == 200
    assert "dev_token" not in res_req.json()
    sent_email = next((m for m in reversed(EmailService.test_outbox) if m.get("to") == email and m.get("template_name") == "password_reset"), None)
    assert sent_email is not None
    m_tok = re.search(r"token=([A-Za-z0-9_\-]+)", sent_email["text"])
    assert m_tok is not None
    token = m_tok.group(1)

    # 2. Reset with weak password -> fails
    res_weak = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "weak"
    })
    assert res_weak.status_code in (400, 422)
    assert "at least 12 characters" in res_weak.text

    # 3. Reset with strong password -> succeeds
    new_strong = "NewAuditorStrongPassword2026!"
    res_reset = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": new_strong
    })
    assert res_reset.status_code == 200

    # 4. Old password fails; new password works
    res_old = client.post("/api/auth/login", json={"email": email, "password": "AuditorPassword2026!"})
    assert res_old.status_code == 401

    res_new = client.post("/api/auth/login", json={"email": email, "password": new_strong})
    assert res_new.status_code == 200

    # Restore original password for other test suites
    res_req_restore = client.post("/api/auth/request-password-reset", json={"email": email})
    assert res_req_restore.status_code == 200
    sent_restore = next((m for m in reversed(EmailService.test_outbox) if m.get("to") == email and m.get("template_name") == "password_reset"), None)
    assert sent_restore is not None
    tok_restore = re.search(r"token=([A-Za-z0-9_\-]+)", sent_restore["text"]).group(1)
    res_rest = client.post("/api/auth/reset-password", json={
        "token": tok_restore,
        "new_password": "AuditorPassword2026!"
    })
    assert res_rest.status_code == 200

    # 5. Reusing the reset token fails
    res_reuse = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "AnotherPassword2026!"
    })
    assert res_reuse.status_code == 400
    assert "already been used" in res_reuse.text or "expired" in res_reuse.text


# ==============================================================================
# 6. Real TOTP Enrolment & Recovery Codes for QA_INSPECTOR
# ==============================================================================
def test_s2_11_totp_enrolment_and_recovery_codes():
    # Login as QA Inspector
    res_login = client.post("/api/auth/login", json={
        "email": "inspector@howrahsteel.in",
        "password": "InspectorPassword2026!"
    })
    token = res_login.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Enrol TOTP
    res_enrol = client.post("/api/auth/totp/enrol", headers=headers)
    assert res_enrol.status_code == 200
    enrol_data = res_enrol.json()
    assert "secret" in enrol_data
    assert "otpauth_url" in enrol_data
    assert "recovery_codes" in enrol_data
    recovery_codes = enrol_data["recovery_codes"]
    assert len(recovery_codes) == 8
    secret_base32 = enrol_data["secret"]

    # 2. Confirm TOTP with valid 6-digit code
    from auth_service import generate_totp_code
    import base64
    pad = "=" * ((8 - len(secret_base32) % 8) % 8)
    secret_bytes = base64.b32decode(secret_base32 + pad)
    valid_code = generate_totp_code(secret_bytes)

    res_confirm = client.post("/api/auth/totp/confirm", json={
        "secret": secret_base32,
        "code": valid_code
    }, headers=headers)
    assert res_confirm.status_code == 200
    assert res_confirm.json()["status"] == "enrolled"

    # 3. Test step-up with 6-digit TOTP
    res_step = client.post("/api/auth/step-up", json={"code": valid_code}, headers=headers)
    assert res_step.status_code == 200
    assert res_step.json()["status"] == "step_up_verified"

    # 4. Test step-up with single-use recovery code
    used_rec = recovery_codes[0]
    res_rec = client.post("/api/auth/step-up", json={"code": used_rec}, headers=headers)
    assert res_rec.status_code == 200
    assert res_rec.json()["status"] == "step_up_verified"
    assert res_rec.json().get("via_recovery_code") is True

    # 5. Re-using the same recovery code must fail
    res_rec_reuse = client.post("/api/auth/step-up", json={"code": used_rec}, headers=headers)
    assert res_rec_reuse.status_code == 401


# ==============================================================================
# 7. Unified Role & Tenant Checking on All Routes
# ==============================================================================
def test_s2_12_non_public_route_returns_401_without_session():
    # Attempting to access protected endpoints without auth returns 401
    routes_to_test = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/admin/metrics"),
        ("GET", "/api/billing/subscription"),
        ("GET", "/api/consultant/portfolio"),
        ("GET", "/api/notifications"),
        ("POST", "/api/assistant/chat"),
    ]
    client.cookies.clear()
    for method, route in routes_to_test:
        if method == "POST":
            res = client.post(route, json={"message": "hello"})
        else:
            res = client.get(route)
        assert res.status_code == 401, f"Expected 401 for unauthenticated {route}, got {res.status_code}"


def test_s2_13_route_returns_403_for_wrong_role():
    # Login as VIEWER
    res_login = client.post("/api/auth/login", json={
        "email": "auditor@howrahsteel.in",
        "password": "AuditorPassword2026!"
    })
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    viewer_token = res_login.json()["token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # VIEWER attempting admin-only endpoint -> 403
    res_admin = client.get("/api/admin/metrics", headers=viewer_headers)
    assert res_admin.status_code == 403
    assert "Forbidden" in res_admin.text or "Insufficient privileges" in res_admin.text

    # VIEWER attempting release approval -> 403
    res_release = client.post("/api/readiness/approve-release", json={
        "shipment_id": "EXP-2026-99",
        "evaluation": {}
    }, headers=viewer_headers)
    assert res_release.status_code == 403


# ==============================================================================
# 8. Audit Trail Logging for Authentication Events
# ==============================================================================
def test_s2_14_audit_trail_records_auth_events():
    trail = AuditService.get_audit_trail(organization_id="org_howrah_steel_01")
    actions = [e["action"] for e in trail]
    # Verify auth events are in audit chain
    assert any("LOGIN" in a or "STEP_UP" in a for a in actions)
