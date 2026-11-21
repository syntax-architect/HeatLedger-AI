"""
HEATLEDGER AI: Prompt H2 Test Suite
Specification: Real database authentication, 4 roles (OWNER, QA_INSPECTOR, DISPATCH, VIEWER),
role body-claim tampering resistance, and 10-minute step-up MFA for EN 10204 3.1 signing.
"""

import os

from fastapi.testclient import TestClient

from auth_service import AuthService

os.environ["TRUST_PROXY"] = "true"
from main import app

client = TestClient(app)


def test_h2_1_bad_password_fails():
    res = client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "WrongPassword123!"
    }, headers={"X-Forwarded-For": "10.0.1.1"})
    assert res.status_code == 401
    assert "Invalid email or password" in res.text or "failed" in res.text


def test_h2_2_unauthenticated_protected_routes():
    res_me = client.get("/api/auth/me", headers={"X-Forwarded-For": "10.0.1.2"})
    assert res_me.status_code == 401

    res_step = client.post("/api/auth/step-up", json={"code": "123456"}, headers={"X-Forwarded-For": "10.0.1.2"})
    assert res_step.status_code == 401

    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93
    }, headers={"X-Forwarded-For": "10.0.1.2"})
    assert res_sign.status_code == 401


def test_h2_3_role_tampering_in_body_is_ignored():
    # Dispatch user tries to elevate to QA_INSPECTOR or OWNER via body
    res = client.post("/api/auth/login", json={
        "email": "dispatch@howrahsteel.in",
        "password": "DispatchPassword2026!",
        "role": "QA_INSPECTOR"  # Attacker tries to inject role claim
    }, headers={"X-Forwarded-For": "10.0.1.3"})
    assert res.status_code == 200
    data = res.json()
    token = data["token"]
    user = data["user"]
    # Role must strictly remain DISPATCH as stored in database
    assert user["role"] == "DISPATCH"

    # Verify /api/auth/me also returns DISPATCH
    res_me = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.3"
    })
    assert res_me.status_code == 200
    assert res_me.json()["user"]["role"] == "DISPATCH"


def test_h2_4_dispatch_user_cannot_sign():
    res_login = client.post("/api/auth/login", json={
        "email": "dispatch@howrahsteel.in",
        "password": "DispatchPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.1.4"})
    token = res_login.json()["token"]

    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.4"
    })
    assert res_sign.status_code == 403
    assert "Forbidden" in res_sign.text or "QA_INSPECTOR" in res_sign.text


def test_h2_5_viewer_user_cannot_sign():
    res_login = client.post("/api/auth/login", json={
        "email": "auditor@howrahsteel.in",
        "password": "AuditorPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.1.5"})
    token = res_login.json()["token"]

    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.5"
    })
    assert res_sign.status_code == 403


def test_h2_6_non_qa_inspector_cannot_step_up():
    res_login = client.post("/api/auth/login", json={
        "email": "dispatch@howrahsteel.in",
        "password": "DispatchPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.1.6"})
    token = res_login.json()["token"]

    res_step = client.post("/api/auth/step-up", json={
        "code": "123456"
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.6"
    })
    assert res_step.status_code == 403
    assert "QA_INSPECTOR" in res_step.text


def test_h2_7_qa_inspector_signing_requires_step_up():
    res_login = client.post("/api/auth/login", json={
        "email": "inspector@howrahsteel.in",
        "password": "InspectorPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.1.7"})
    token = res_login.json()["token"]

    # Invalidate step-up explicitly in DB to test expired/missing condition
    from backend.db.connection import get_db_connection
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET last_step_up_at = 0 WHERE id = 'usr_qa_04'")
        conn.commit()

    # Attempt signing without step-up
    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.7"
    })
    assert res_sign.status_code == 403
    assert "Step-up verification" in res_sign.text


def test_h2_8_qa_inspector_step_up_and_signing_success():
    res_login = client.post("/api/auth/login", json={
        "email": "inspector@howrahsteel.in",
        "password": "InspectorPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.1.8"})
    token = res_login.json()["token"]

    # Verify fixed PIN 440926 is rejected (backdoor removed)
    res_bad_step = client.post("/api/auth/step-up", json={
        "code": "440926"
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.8"
    })
    assert res_bad_step.status_code == 401

    # Step-up with authentic RFC 6238 TOTP
    totp_code = AuthService.get_current_totp_for_user("usr_qa_04")
    res_step = client.post("/api/auth/step-up", json={
        "code": totp_code
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.8"
    })
    assert res_step.status_code == 200
    assert res_step.json()["status"] == "step_up_verified"

    # Check /api/auth/me shows step-up is valid
    res_me = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.8"
    })
    assert res_me.status_code == 200
    me_data = res_me.json()
    assert me_data["step_up_valid"] is True
    assert me_data["step_up_expires_in_seconds"] > 580

    # Now sign certificate with QA_INSPECTOR + active step-up
    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-109",
        "heat_number": "TSJ-26-9021",
        "total_see": 1.93,
        "sha256_upstream_pdf": "8d7ae83f7d88f1f2790afd433986c97ea2990a578b771f5bf672c3ff52e58d6b"
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.1.8"
    })
    assert res_sign.status_code == 200
    sig_data = res_sign.json()
    assert sig_data["signature"].startswith("hl_sig_v1_")
    assert sig_data["algorithm"] in ["HMAC-SHA256", "Ed25519"]
    assert sig_data["inspector_id"] == "QA-04"
    assert sig_data["inspector_name"] == "R. K. Chatterjee"


def test_h2_9_demo_login_endpoint():
    res = client.post("/api/auth/demo-login", headers={"X-Forwarded-For": "10.0.1.9"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["is_sandbox"] is True
    assert data["user"]["role"] == "VIEWER"
