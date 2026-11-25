"""
HEATLEDGER AI: Prompt Pack v5 Task 4.2 Test Suite
Real Signup, Verification, Onboarding, Enumeration Defense & Impersonation Audit:
1. Signup does NOT return verification_token in API response; only emailed.
2. Unverified user login fails with HTTP 403 EMAIL_NOT_VERIFIED until verified; 200 after; token single-use & 24h expiry.
3. Onboarding wizard has zero 'TemporaryInspectorPass123!' and zero hardcoded 'IN CCU' / Kolkata defaults.
4. Password reset & signup resist account enumeration (no leaked dev_token, identical message, rate limited).
5. DB-backed lockout & exponential backoff stored in auth_rate_limits.
6. Admin impersonation stores SHA-256 hash, <= 15 min expiry, audited, and visible to org OWNER.
"""

import hashlib
import os
import re
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from backend.admin_service import AdminService
from backend.auth_service import AuthService, LoginRateLimiter
from backend.db.connection import get_db_connection
from backend.email_service import EmailService
from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_auth_state():
    LoginRateLimiter.reset_for_tests()
    EmailService.test_outbox.clear()
    yield
    LoginRateLimiter.reset_for_tests()


def _extract_token_from_outbox(recipient: str, template_name: str) -> str:
    for msg in reversed(EmailService.test_outbox):
        if msg.get("to") == recipient.lower() and msg.get("template_name") == template_name:
            m = re.search(r"token=([A-Za-z0-9_\-]+)", msg.get("text", ""))
            if m:
                return m.group(1)
    raise AssertionError(f"No {template_name} email with token found for {recipient}")


# ==============================================================================
# 1. Signup, Email Verification Gate (403 -> 200), Single-Use & 24h Expiry
# ==============================================================================

def test_v5_4_2_signup_email_verification_gate_and_single_use():
    unique = uuid.uuid4().hex[:6]
    email = f"owner_{unique}@punesteelforge.in"
    password = "PuneForgeStrongPassword2026!"

    # 1. Sign up -> response MUST NOT contain verification_token
    res_signup = client.post("/api/auth/signup", json={
        "email": email,
        "password": password,
        "company_name": "Pune Steel Forge Pvt Ltd",
        "gstin": "27AABCP1234A1Z5",
        "name": "S. Kulkarni",
    })
    assert res_signup.status_code == 200
    body = res_signup.json()
    assert "verification_token" not in body, "Signup API MUST NOT expose verification_token in response"
    assert "token" not in body
    assert body.get("requires_email_verification") is True

    # 2. Extract emailed verification token from EmailService outbox; verify DB stores SHA-256 hash ONLY
    raw_token = _extract_token_from_outbox(email, "email_verification")
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    with get_db_connection(is_service_role=True) as conn:
        row_raw = conn.execute("SELECT token_hash FROM email_verification_tokens WHERE token_hash = ?", (raw_token,)).fetchone()
        assert row_raw is None, "Plaintext verification token must NEVER be stored in database"
        row_hashed = conn.execute("SELECT token_hash, verified FROM email_verification_tokens WHERE token_hash = ?", (token_hash,)).fetchone()
        assert row_hashed is not None

    # 3. Attempting login before email verification returns 403 EMAIL_NOT_VERIFIED
    res_unverified = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    }, headers={"X-Forwarded-For": "198.51.100.42"})
    assert res_unverified.status_code == 403
    err_detail = res_unverified.json().get("detail")
    assert (isinstance(err_detail, dict) and err_detail.get("code") == "EMAIL_NOT_VERIFIED") or "EMAIL_NOT_VERIFIED" in res_unverified.text

    # Wrong password for unverified account still returns 401 (not 403) so email/verification cannot be probed without password
    res_wrong_pw = client.post("/api/auth/login", json={
        "email": email,
        "password": "WrongPassword123456!",
    }, headers={"X-Forwarded-For": "198.51.100.43"})
    assert res_wrong_pw.status_code == 401

    # 4. Verify email using emailed token -> succeeds
    res_verify = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert res_verify.status_code == 200
    assert res_verify.json()["status"] == "verified"

    # 5. Reusing same verification token fails
    res_reuse = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert res_reuse.status_code == 400

    # 6. Login now succeeds with 200
    res_login = client.post("/api/auth/login", json={
        "email": email,
        "password": password,
    }, headers={"X-Forwarded-For": "198.51.100.44"})
    assert res_login.status_code == 200
    assert "token" in res_login.json()


def test_v5_4_2_expired_verification_token_rejected():
    unique = uuid.uuid4().hex[:6]
    email = f"exp_{unique}@punesteelforge.in"
    client.post("/api/auth/signup", json={
        "email": email,
        "password": "ExpiredTestPassword2026!",
        "company_name": "Expired Forge Pvt Ltd",
        "gstin": "27AABCE5678B1Z2",
        "name": "Test Owner",
    })
    raw_token = _extract_token_from_outbox(email, "email_verification")
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

    expired_iso = (datetime.now(timezone.utc) - timedelta(hours=25)).isoformat()
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("UPDATE email_verification_tokens SET expires_at = ? WHERE token_hash = ?", (expired_iso, token_hash))
        conn.commit()

    res_exp = client.post("/api/auth/verify-email", json={"token": raw_token})
    assert res_exp.status_code == 400


# ==============================================================================
# 2. Onboarding Wizard: Zero TemporaryInspectorPass123! & Zero Hardcoded IN CCU
# ==============================================================================

def test_v5_4_2_onboarding_no_static_password_no_kolkata_hardcode():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(repo_root, "auth_service.py"), "r", encoding="utf-8") as f:
        src = f.read()
    assert "TemporaryInspectorPass123!" not in src

    unique = uuid.uuid4().hex[:6]
    owner_signup = AuthService.signup_plant(
        email=f"own_wiz_{unique}@nagpuralloy.in",
        password="NagpurOwnerPassword2026!",
        company_name="Nagpur Alloy Forgings Ltd",
        gstin="27AABCN9999C1Z5",
        name="N. Kulkarni",
    )
    insp_email = f"qa_{unique}@nagpuralloy.in"
    wizard_res = AuthService.setup_onboarding_wizard(
        company_name="Nagpur Alloy Forgings Ltd",
        gstin="27AABCN9999C1Z5",
        plant_name="Hingna MIDC Works",
        plant_location="Nagpur, Maharashtra (UN/LOCODE: IN NAG)",
        team_invites=[],
        inspector_data={
            "name": "R. Deshmukh",
            "emp_id": "QA-901",
            "designation": "Lead Metallurgist",
            "email": insp_email,
        },
        owner_user_id=owner_signup["user_id"],
    )
    assert wizard_res["city"] == "Nagpur"
    assert wizard_res["state"] == "Maharashtra"
    assert wizard_res["unlocode"] == "IN NAG"

    # Verify DB row has Nagpur / Maharashtra / IN NAG (not Kolkata / IN CCU)
    with get_db_connection(is_service_role=True) as conn:
        plant = conn.execute("SELECT city, state, unlocode FROM plants WHERE id = ?", (wizard_res["plant_id"],)).fetchone()
        assert plant["city"] == "Nagpur"
        assert plant["state"] == "Maharashtra"
        assert plant["unlocode"] == "IN NAG"

    # Invited inspector receives setup link by email and sets their own password
    setup_token = _extract_token_from_outbox(insp_email, "inspector_setup")
    ok_set, err_set = AuthService.reset_password_with_token(setup_token, "InspectorChosenSecret2026!")
    assert ok_set is True, err_set

    # Can now authenticate with their own chosen password
    ok_login, session_data, err_login = AuthService.authenticate_email_password(insp_email, "InspectorChosenSecret2026!")
    assert ok_login is True, err_login
    assert session_data["user"]["email"] == insp_email


# ==============================================================================
# 3. Account Enumeration Defense & Database-Backed Lockout / Exponential Backoff
# ==============================================================================

def test_v5_4_2_account_enumeration_and_db_lockout():
    # 1. Password reset gives identical response for known and unknown emails (no dev_token)
    res_unknown = client.post(
        "/api/auth/request-password-reset",
        json={"email": "nonexistent_user_xyz@example.in"},
        headers={"X-Forwarded-For": "203.0.113.10"},
    )
    res_known = client.post(
        "/api/auth/request-password-reset",
        json={"email": "owner@howrahsteel.in"},
        headers={"X-Forwarded-For": "203.0.113.11"},
    )
    assert res_unknown.status_code == 200
    assert res_known.status_code == 200
    assert res_unknown.json() == res_known.json()
    assert "dev_token" not in res_known.json()

    # 2. Signup on already-registered email gives identical HTTP 200 uniform response (no leakage)
    unique = uuid.uuid4().hex[:6]
    dup_email = f"dup_{unique}@salemsteel.in"
    first = client.post("/api/auth/signup", json={
        "email": dup_email,
        "password": "SalemStrongPassword2026!",
        "company_name": "Salem Specialty Steel",
        "gstin": "33AABCS1111E1Z5",
        "name": "V. Natarajan",
    })
    second = client.post("/api/auth/signup", json={
        "email": dup_email,
        "password": "SalemStrongPassword2026!",
        "company_name": "Salem Specialty Steel",
        "gstin": "33AABCS1111E1Z5",
        "name": "V. Natarajan",
    })
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["message"] == second.json()["message"]

    # 3. Repeated login failures persist lockout & backoff in auth_rate_limits table
    test_ip = f"203.0.113.{uuid.uuid4().int % 200 + 20}"
    target_email = f"bruteforce_{unique}@salemsteel.in"
    for _ in range(5):
        LoginRateLimiter.record_failure(test_ip, target_email)

    is_locked, rem_5 = LoginRateLimiter.is_locked(test_ip, target_email)
    assert is_locked is True
    assert rem_5 >= 800

    # Additional failure increases exponential backoff duration
    LoginRateLimiter.record_failure(test_ip, target_email)
    is_locked_6, rem_6 = LoginRateLimiter.is_locked(test_ip, target_email)
    assert is_locked_6 is True
    assert rem_6 > 900

    with get_db_connection(is_service_role=True) as conn:
        row = conn.execute(
            "SELECT attempt_count, locked_until FROM auth_rate_limits WHERE rate_key = ?",
            (f"login:email:{target_email}",),
        ).fetchone()
        assert row is not None
        assert row["attempt_count"] >= 6


# ==============================================================================
# 4. Admin Impersonation: SHA-256 Storage, <= 15m Expiry, Audit & Owner Visibility
# ==============================================================================

def test_v5_4_2_admin_impersonation_sha256_and_owner_visibility():
    unique = uuid.uuid4().hex[:6]
    owner_email = f"own_{unique}@raipurcast.in"
    signup = AuthService.signup_plant(
        email=owner_email,
        password="RaipurCastPassword2026!",
        company_name="Raipur Castings Pvt Ltd",
        gstin="22AABCR4444F1Z5",
        name="A. Shukla",
    )
    org_id = signup["organization_id"]
    owner_id = signup["user_id"]

    # Verify email and generate OWNER JWT
    raw_verif = _extract_token_from_outbox(owner_email, "email_verification")
    assert AuthService.verify_email(raw_verif)[0] is True
    owner_jwt = AuthService.create_jwt(user_id=owner_id, org_id=org_id, role="OWNER")

    imp = AdminService.generate_impersonation_token(
        admin_user_id="usr_platform_admin_01",
        target_org_id=org_id,
        reason="Ticket #HL-882: Assisting with CBAM SEE calculation review",
    )
    assert imp["duration_seconds"] <= 900
    assert "ADMIN IMPERSONATION ACTIVE" in imp["banner_text"]
    raw_imp_token = imp["token"]

    # DB stores SHA-256 hash, NEVER plaintext token
    expected_hash = hashlib.sha256(raw_imp_token.encode("utf-8")).hexdigest()
    with get_db_connection(is_service_role=True) as conn:
        row = conn.execute(
            "SELECT token_hash, duration_seconds, admin_user_id, reason FROM admin_impersonation_logs WHERE id = ?",
            (imp["impersonation_id"],),
        ).fetchone()
        assert row["token_hash"] == expected_hash
        assert row["token_hash"] != raw_imp_token
        assert row["duration_seconds"] == 900
        assert row["admin_user_id"] == "usr_platform_admin_01"

    # verify_impersonation_token accepts raw token & validates against hash
    verified_imp = AdminService.verify_impersonation_token(raw_imp_token)
    assert verified_imp is not None
    assert verified_imp["target_org_id"] == org_id
    assert AdminService.verify_impersonation_token("imp_tok_forged_token_123456") is None

    # Owner can view impersonation logs on their organization
    res_logs = client.get("/api/org/impersonation-logs", headers={"Authorization": f"Bearer {owner_jwt}"})
    assert res_logs.status_code == 200
    logs = res_logs.json()["logs"]
    assert any(l["id"] == imp["impersonation_id"] and l["reason"].startswith("Ticket #HL-882") for l in logs)
