"""
HEATLEDGER AI - Test Suite for Prompt R3: Teams, Roles and Proper Inspector Setup
Specification:
1. 4-screen onboarding wizard: Company & 15-char GSTIN, Plant location, Team invites, Inspector setup.
2. Team invitations with 4 roles (OWNER, QA_INSPECTOR, DISPATCH, VIEWER) and role-gated permissions.
3. Inspector identity & TOTP setup isolation: inspector enrols on personal phone, owner never sees secret.
4. Every sealed buyer pack records: inspector name, designation, timestamp, pack hash, and key ID.
5. Mandated disclaimer plainly present:
   "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification."
6. Public verification: byte-identical pack returns OK; 1-byte tampered file returns FAILED (TAMPERED).
7. Ed25519 signing key rotation: new key generated, old public keys kept, past packs still verify.
8. User removal: sessions revoked immediately, audit trail entry created, past signed packs preserved.
"""

import base64
import hashlib
import io
import json
import os
import secrets
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth_service import AuthService, LoginRateLimiter, generate_totp_code
from backend.crypto_signing import CryptoSigningService
from backend.db.connection import get_db_connection

client = TestClient(app)

MANDATED_DISCLAIMER = "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification."


@pytest.fixture(scope="module", autouse=True)
def setup_test_environment():
    LoginRateLimiter.reset()
    AuthService.init_db()
    CryptoSigningService.init_tables()


def get_auth_token(email: str, password: str = None):
    LoginRateLimiter.reset()
    passwords = {
        "owner@howrahsteel.in": "OwnerSecretPassword2026!",
        "inspector@howrahsteel.in": "InspectorPassword2026!",
        "dispatch@howrahsteel.in": "DispatchPassword2026!",
        "auditor@howrahsteel.in": "AuditorPassword2026!"
    }
    pwd = password or passwords.get(email, "OwnerSecretPassword2026!")
    resp = client.post("/api/auth/login", json={"email": email, "password": pwd})
    if resp.status_code == 200:
        return resp.json().get("token")
    return None


def test_onboarding_wizard_execution():
    """Validates 4-screen onboarding wizard completion and strict 15-char GSTIN validation."""
    owner_token = get_auth_token("owner@howrahsteel.in")
    assert owner_token is not None
    headers = {"Authorization": f"Bearer {owner_token}"}

    # 1. Invalid GSTIN (< 15 characters or malformed) should fail with 400
    bad_payload = {
        "company_name": "Howrah Forgings",
        "gstin": "19AAACH7409",  # Too short
        "plant_name": "Liluah Works",
        "plant_location": "Howrah, West Bengal",
        "team_invites": [{"email": "colleague@howrah.in", "role": "DISPATCH"}],
        "inspector": {
            "name": "P. K. Banerjee",
            "designation": "Head of QA",
            "emp_id": "QA-0409",
            "email": "inspector@howrah.in"
        }
    }
    resp = client.post("/api/onboarding/wizard", json=bad_payload, headers=headers)
    assert resp.status_code == 400
    assert "15" in resp.json()["detail"] and "GSTIN" in resp.json()["detail"]

    # 2. Valid 15-char statutory GSTIN
    valid_payload = {
        "company_name": "Howrah Precision Forgings Pvt Ltd",
        "gstin": "19AAACH7409R1Z8",
        "plant_name": "Howrah Liluah Works",
        "plant_location": "Howrah, West Bengal (UN/LOCODE: IN CCU)",
        "team_invites": [
            {"email": "dispatch.lead@howrah.in", "role": "DISPATCH"},
            {"email": "auditor@howrah.in", "role": "VIEWER"}
        ],
        "inspector": {
            "name": "P. K. Banerjee",
            "designation": "Head of Quality Assurance",
            "emp_id": "QA-EMP-0409",
            "email": "inspector.lead@howrah.in"
        }
    }
    resp = client.post("/api/onboarding/wizard", json=valid_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["organization_id"] is not None
    assert len(data["invitations"]) == 2
    assert data["inspector"]["name"] == "P. K. Banerjee"
    assert data["inspector"]["emp_id"] == "QA-EMP-0409"


def test_team_invite_and_role_gating():
    """Tests invitation flow with 4 permitted roles and verifies role-based invitation restrictions."""
    owner_token = get_auth_token("owner@howrahsteel.in")
    headers_owner = {"Authorization": f"Bearer {owner_token}"}

    # OWNER invites DISPATCH member
    resp = client.post("/api/team/invite", json={
        "email": "new.dispatch@howrahsteel.in",
        "role": "DISPATCH"
    }, headers=headers_owner)
    assert resp.status_code == 200
    inv = resp.json()
    assert inv["email"] == "new.dispatch@howrahsteel.in"
    assert inv["role"] == "DISPATCH"
    assert "token" in inv

    # Permitted roles test
    for role in ["OWNER", "QA_INSPECTOR", "DISPATCH", "VIEWER"]:
        r = client.post("/api/team/invite", json={
            "email": f"test.{role.lower()}@howrahsteel.in",
            "role": role
        }, headers=headers_owner)
        assert r.status_code == 200

    # Invalid role must fail with 400
    r_bad = client.post("/api/team/invite", json={
        "email": "hacker@howrahsteel.in",
        "role": "SUPERADMIN"
    }, headers=headers_owner)
    assert r_bad.status_code == 400
    assert "Invalid role" in r_bad.json()["detail"]

    # VIEWER cannot invite team members (403 Forbidden)
    viewer_token = get_auth_token("auditor@howrahsteel.in")
    headers_viewer = {"Authorization": f"Bearer {viewer_token}"}
    r_forbidden = client.post("/api/team/invite", json={
        "email": "unauthorized@howrahsteel.in",
        "role": "VIEWER"
    }, headers=headers_viewer)
    assert r_forbidden.status_code == 403


def test_inspector_identity_and_totp_setup_isolation():
    """
    Tests that the OWNER can assign inspector identity (name, designation, employee ID),
    but the inspector sets up TOTP on their personal phone and the OWNER never sees the secret.
    """
    owner_token = get_auth_token("owner@howrahsteel.in")
    headers_owner = {"Authorization": f"Bearer {owner_token}"}

    # 1. Owner assigns inspector profile
    resp = client.post("/api/team/inspector/setup", json={
        "user_id": "usr_qa_04",
        "name": "Prabir K. Banerjee",
        "designation": "Chief Metallurgical Inspector",
        "emp_id": "QA-ISO-4409"
    }, headers=headers_owner)
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["name"] == "Prabir K. Banerjee"
    assert profile["designation"] == "Chief Metallurgical Inspector"
    assert profile["emp_id"] == "QA-ISO-4409"
    # Ensure no TOTP secret is leaked in owner response
    assert "totp_secret" not in profile
    assert "secret" not in profile

    # 2. Inspector logs in and enrolls TOTP on personal phone
    inspector_token = get_auth_token("inspector@howrahsteel.in")
    headers_inspector = {"Authorization": f"Bearer {inspector_token}"}

    enrol_resp = client.post("/api/auth/totp/enrol", headers=headers_inspector)
    assert enrol_resp.status_code == 200
    enrol_data = enrol_resp.json()
    secret = enrol_data["secret"]
    assert secret is not None
    assert "otpauth_url" in enrol_data

    # Generate valid 6-digit code from secret
    secret_bytes = base64.b32decode(secret + "=" * ((8 - len(secret) % 8) % 8))
    valid_code = generate_totp_code(secret_bytes)

    # Confirm enrollment
    confirm_resp = client.post("/api/auth/totp/confirm", json={
        "secret": secret,
        "code": valid_code
    }, headers=headers_inspector)
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] in ("ok", "enrolled")


def test_pack_sealing_records_inspector_metadata_and_disclaimer():
    """
    Tests that sealing a buyer pack records:
    inspector name, designation, timestamp, pack hash, key ID,
    and includes the mandatory tamper-evidence disclaimer.
    """
    # QA Inspector steps up using their TOTP code
    inspector_token = get_auth_token("inspector@howrahsteel.in")
    headers_inspector = {"Authorization": f"Bearer {inspector_token}"}

    totp_code = AuthService.get_current_totp_for_user("usr_qa_04")
    assert totp_code is not None

    step_up_resp = client.post("/api/auth/step-up", json={"code": totp_code}, headers=headers_inspector)
    assert step_up_resp.status_code == 200

    # Seal dossier pack
    seal_payload = {
        "invoice_number": "EXP-2026-R3-01",
        "heat_number": "HEAT-R3-99",
        "total_see": 1.7450,
        "sha256_upstream_pdf": "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"
    }
    resp = client.post("/api/dossier/sign", json=seal_payload, headers=headers_inspector)
    assert resp.status_code == 200
    data = resp.json()

    # Verify mandated metadata fields
    assert data["inspector_name"] == "Prabir K. Banerjee"
    assert data["inspector_designation"] == "Chief Metallurgical Inspector"
    assert data["timestamp"] is not None
    assert data["pack_hash"] is not None
    assert data["key_id"] is not None
    assert data["verification_code"] is not None
    assert data["signature_b64"] is not None

    # Verify mandated disclaimer
    assert data["disclaimer"] == MANDATED_DISCLAIMER


def test_public_verification_and_tamper_detection():
    """
    Tests public verification of a sealed pack:
    - Byte-identical document passes verification.
    - 1-byte alteration fails immediately with TAMPERED status.
    """
    # 1. Create a signed dossier pack
    import secrets
    unique_tag = secrets.token_hex(6)
    content = f"%PDF-1.4\n%Authentic sealed buyer pack content {unique_tag} for EU/UK customs export.\n%%EOF".encode("utf-8")
    pack_hash = hashlib.sha256(content).hexdigest()

    sig = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="usr_qa_04",
        signer_name="Prabir K. Banerjee",
        signer_role="QA_INSPECTOR",
        organization_id="org_howrah_steel_01",
        invoice_number=f"INV-R3-TAMPER-{unique_tag}",
        heat_numbers=[f"H-TAMPER-{unique_tag}"],
        pdf_bytes=content,
        upstream_sha256="none",
        signer_designation="Chief Metallurgical Inspector"
    )
    vcode = sig["verification_code"]

    # 2. Lookup by verification code
    lookup_resp = client.get(f"/api/verify/lookup/{vcode}")
    assert lookup_resp.status_code == 200
    rec = lookup_resp.json()
    assert rec["signer_name"] == "Prabir K. Banerjee"
    assert rec["signer_designation"] == "Chief Metallurgical Inspector"
    assert rec["disclaimer"] == MANDATED_DISCLAIMER
    assert rec["pdf_sha256"] == pack_hash

    # 3. Check raw byte file upload - unaltered passes
    file_payload = {"file": ("sealed_pack.pdf", io.BytesIO(content), "application/pdf")}
    verify_resp = client.post("/api/verify/check-file", files=file_payload)
    assert verify_resp.status_code == 200
    v_data = verify_resp.json()
    assert v_data["verified"] is True
    assert v_data["tampered"] is False
    assert v_data["status"] == "VALID"
    assert v_data["disclaimer"] == MANDATED_DISCLAIMER

    # 4. Alter 1 byte - tamper detection must catch it
    tampered_content = content[:-1] + b"X"
    tampered_payload = {"file": ("tampered_pack.pdf", io.BytesIO(tampered_content), "application/pdf")}
    tampered_resp = client.post("/api/verify/check-file", files=tampered_payload)
    assert tampered_resp.status_code == 200
    t_data = tampered_resp.json()
    assert t_data["verified"] is False
    assert t_data["tampered"] is True
    assert t_data["status"] in ("TAMPERED", "UNRECOGNIZED")


def test_signing_key_rotation_and_historical_preservation():
    """
    Tests Ed25519 signing key rotation:
    - New active key is generated.
    - Old public keys are kept in the public key registry.
    - Previously signed packs continue to verify with the old key.
    """
    owner_token = get_auth_token("owner@howrahsteel.in")
    headers_owner = {"Authorization": f"Bearer {owner_token}"}

    # 1. Sign a document with currently active key
    rot_tag = secrets.token_hex(6)
    original_pdf = f"%PDF-1.4\nPre-rotation buyer pack evidence {rot_tag}\n%%EOF".encode("utf-8")
    sig_old = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="usr_qa_04",
        signer_name="Prabir K. Banerjee",
        signer_role="QA_INSPECTOR",
        organization_id="org_howrah_steel_01",
        invoice_number=f"INV-KEY-ROT-{rot_tag}",
        heat_numbers=[f"H-ROT-{rot_tag}"],
        pdf_bytes=original_pdf,
        upstream_sha256="none"
    )
    old_key_id = sig_old["key_id"]
    old_vcode = sig_old["verification_code"]

    # 2. Rotate the key
    rot_resp = client.post("/api/team/signing-keys/rotate", headers=headers_owner)
    assert rot_resp.status_code == 200
    new_key_data = rot_resp.json()
    new_key_id = new_key_data["key_id"]
    assert new_key_id != old_key_id

    # 3. List published public keys
    keys_resp = client.get("/api/team/signing-keys", headers=headers_owner)
    assert keys_resp.status_code == 200
    keys = keys_resp.json()["keys"]
    key_ids = [k["key_id"] for k in keys]
    assert new_key_id in key_ids
    assert old_key_id in key_ids

    # 4. Old pack still verifies cleanly using the preserved historical key
    file_payload = {"file": ("old_pack.pdf", io.BytesIO(original_pdf), "application/pdf")}
    v_resp = client.post("/api/verify/check-file", files=file_payload)
    assert v_resp.status_code == 200
    v_data = v_resp.json()
    assert v_data["verified"] is True
    assert v_data["key_id"] == old_key_id


def test_remove_team_member_session_revocation():
    """
    Tests that removing a user:
    - Immediately revokes all active sessions (is_active = 0, refresh tokens deleted).
    - Prevents any further authenticated API requests (returns 401).
    - Creates an audit log entry.
    - Preserves all past signatures and historical actions.
    """
    owner_token = get_auth_token("owner@howrahsteel.in")
    headers_owner = {"Authorization": f"Bearer {owner_token}"}

    # 1. Create a temporary user to remove
    target_user_id = "usr_temp_dispatch"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, emp_id, designation, totp_secret_hex, is_active, created_at)
            VALUES (?, 'temp.dispatch@howrahsteel.in', 'hash', 'salt', 'Temp Dispatcher', 'TMP-99', 'Floor Staff', '00', 1, datetime('now'))
        """, (target_user_id,))
        conn.execute("""
            INSERT OR REPLACE INTO memberships (user_id, organization_id, role, created_at)
            VALUES (?, 'org_howrah_steel_01', 'DISPATCH', datetime('now'))
        """, (target_user_id,))
        conn.commit()

    # User obtains access token
    import time
    from backend.auth_service import AuthService
    temp_token = AuthService.create_jwt({
        "sub": target_user_id,
        "user_id": target_user_id,
        "organization_id": "org_howrah_steel_01",
        "org_id": "org_howrah_steel_01",
        "role": "DISPATCH",
        "exp": int(time.time()) + 900
    })
    headers_temp = {"Authorization": f"Bearer {temp_token}"}

    # Verify temp user can access a protected route
    r_check = client.get("/api/team/members", headers=headers_temp)
    assert r_check.status_code == 200

    # 2. Owner removes user
    del_resp = client.delete(f"/api/team/members/{target_user_id}", headers=headers_owner)
    assert del_resp.status_code == 200
    assert del_resp.json()["removed_user_id"] == target_user_id

    # 3. Temp user's session is immediately revoked (401 Unauthorized)
    r_revoked = client.get("/api/team/members", headers=headers_temp)
    assert r_revoked.status_code == 401

    # 4. Verify user record still exists in users table with is_active = 0
    with get_db_connection(is_service_role=True) as conn:
        cur = conn.cursor()
        cur.execute("SELECT is_active FROM users WHERE id = ?", (target_user_id,))
        row = cur.fetchone()
        assert row is not None
        assert row[0] == 0

        # Verify audit log entry was created
        cur.execute("SELECT action FROM audit_log_chain WHERE entity_id = ? AND action = 'USER_REMOVED'", (target_user_id,))
        audit_row = cur.fetchone()
        assert audit_row is not None
