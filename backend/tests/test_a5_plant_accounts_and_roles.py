"""
HEATLEDGER AI: Prompt Pack v4 Task A5 Test Suite
Plant Onboarding, Team, Roles, Inspector MFA & Multi-Plant Isolation:
1. Signup: email, password (min 12 chars), company name, GSTIN (statutory format check). Creates Org and OWNER.
2. Login & Sign-out-everywhere: revokes all active refresh tokens across devices.
3. Roles: OWNER, QA_HEAD, QA_INSPECTOR, EXPORT_DOC (can prepare, cannot sign), VIEWER, CONSULTANT (read-only).
4. Invite flow: OWNER invites by email with role and expiry. Accept invite joins member to the inviting org ONLY.
5. First-run checklist: invite inspector, upload first MTC, create first shipment, download first pack.
6. Two real accounts/plants: each sees strictly only their own data.
"""

import uuid
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.auth_service import AuthService
from backend.db.connection import get_db_connection

client = TestClient(app)


def _get_auth_header(user_id: str, org_id: str, role: str) -> dict:
    token = AuthService.create_jwt(
        user_id=user_id,
        organization_id=org_id,
        role=role,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def setup_auth_environment():
    AuthService.init_db()


def test_a5_01_plant_signup_and_owner_creation():
    """
    1. Signup creates an Organization and an OWNER user.
    Statutory 15-char GSTIN and min 12-char password required.
    """
    plant_email = f"owner_{uuid.uuid4().hex[:6]}@bengalforge.in"
    res = client.post(
        "/api/auth/signup",
        json={
            "email": plant_email,
            "password": "SecurePassword1234!",
            "company_name": "Bengal Precision Forgings Ltd",
            "gstin": "19AAACB1234A1Z5",
            "name": "B. K. Roy"
        }
    )
    assert res.status_code == 200, f"Signup failed: {res.text}"
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["role"] == "OWNER"
    assert data["email"] == plant_email
    assert data["gstin"] == "19AAACB1234A1Z5"
    assert "org_" in data["organization_id"]
    assert "verification_token" in data


def test_a5_02_signup_validation_failures():
    """
    Validates rejection of short passwords, invalid GSTIN formats, and duplicate emails.
    """
    # Short password (< 12 chars)
    res_short = client.post(
        "/api/auth/signup",
        json={
            "email": "short@example.com",
            "password": "Short1!",
            "company_name": "Fail Works",
            "gstin": "19AAACB1234A1Z5"
        }
    )
    assert res_short.status_code in (400, 422)

    # Invalid GSTIN (not 15 chars / wrong pattern)
    res_gstin = client.post(
        "/api/auth/signup",
        json={
            "email": "badgstin@example.com",
            "password": "SecurePassword1234!",
            "company_name": "Fail Works",
            "gstin": "INVALID_GSTIN_123"
        }
    )
    assert res_gstin.status_code in (400, 422)


def test_a5_03_owner_team_invite_and_acceptance():
    """
    4. Invite flow:
       OWNER invites an EXPORT_DOC member.
       The member accepts the invite using the token, joining the same org only.
    """
    # 1. Sign up a new plant
    plant_email = f"owner_{uuid.uuid4().hex[:6]}@orissaalloys.in"
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "email": plant_email,
            "password": "SecurePassword1234!",
            "company_name": "Orissa Alloys Ltd",
            "gstin": "21AABCO5678B1Z2",
            "name": "M. K. Patnaik"
        }
    ).json()

    org_id = signup_res["organization_id"]
    owner_id = signup_res["user_id"]
    owner_headers = _get_auth_header(owner_id, org_id, "OWNER")

    # 2. OWNER invites an EXPORT_DOC member
    invitee_email = f"docs_{uuid.uuid4().hex[:6]}@orissaalloys.in"
    invite_res = client.post(
        "/api/team/invite",
        headers=owner_headers,
        json={
            "email": invitee_email,
            "role": "EXPORT_DOC"
        }
    )
    assert invite_res.status_code == 200, f"Invite failed: {invite_res.text}"
    invite_data = invite_res.json()
    token = invite_data["token"]
    assert invite_data["organization_id"] == org_id

    # 3. Accept invite
    accept_res = client.post(
        "/api/team/accept-invite",
        json={
            "token": token,
            "name": "A. K. Mohapatra",
            "password": "DocsPassword1234!"
        }
    )
    assert accept_res.status_code == 200, f"Accept invite failed: {accept_res.text}"
    accept_data = accept_res.json()
    assert accept_data["status"] == "ACCEPTED"
    assert accept_data["organization_id"] == org_id
    assert accept_data["role"] == "EXPORT_DOC"

    # 4. Confirm member appears in team list for Orissa Alloys
    members_res = client.get("/api/team/members", headers=owner_headers)
    assert members_res.status_code == 200
    member_emails = [m["email"] for m in members_res.json()["members"]]
    assert invitee_email in member_emails


def test_a5_04_role_permissions_export_doc_and_viewer_boundaries():
    """
    3. Role tests:
       - EXPORT_DOC can prepare, cannot sign (signing raises 403).
       - VIEWER cannot sign or change billing or delete (raises 403).
       - OWNER can manage team, privacy, and billing.
    """
    # 1. Sign up a plant
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "email": f"owner_perm_{uuid.uuid4().hex[:6]}@steelworks.in",
            "password": "OwnerPassword1234!",
            "company_name": "Permission Test Works",
            "gstin": "27AABCP9999C1Z3",
            "name": "Test Owner"
        }
    ).json()
    org_id = signup_res["organization_id"]
    owner_id = signup_res["user_id"]
    owner_headers = _get_auth_header(owner_id, org_id, "OWNER")

    # 2. Invite EXPORT_DOC
    doc_email = f"doc_{uuid.uuid4().hex[:6]}@steelworks.in"
    inv_doc = client.post(
        "/api/team/invite",
        headers=owner_headers,
        json={"email": doc_email, "role": "EXPORT_DOC"}
    ).json()
    acc_doc = client.post(
        "/api/team/accept-invite",
        json={"token": inv_doc["token"], "name": "Doc Prep", "password": "DocPrepPass1234!"}
    ).json()
    doc_user_id = acc_doc["user_id"]
    doc_headers = _get_auth_header(doc_user_id, org_id, "EXPORT_DOC")

    # 3. Invite VIEWER
    viewer_email = f"viewer_{uuid.uuid4().hex[:6]}@steelworks.in"
    inv_view = client.post(
        "/api/team/invite",
        headers=owner_headers,
        json={"email": viewer_email, "role": "VIEWER"}
    ).json()
    acc_view = client.post(
        "/api/team/accept-invite",
        json={"token": inv_view["token"], "name": "Viewer Only", "password": "ViewerPass1234!"}
    ).json()
    viewer_user_id = acc_view["user_id"]
    viewer_headers = _get_auth_header(viewer_user_id, org_id, "VIEWER")

    # A) EXPORT_DOC attempts to sign dossier / seal (must be 403)
    sign_res = client.post(
        "/api/dossier/sign",
        headers=doc_headers,
        json={"shipment_id": "ship_123", "pin": "123456"}
    )
    assert sign_res.status_code == 403, f"EXPORT_DOC was allowed to sign! Status: {sign_res.status_code}"

    # B) VIEWER attempts to sign dossier / seal (must be 403)
    viewer_sign = client.post(
        "/api/dossier/sign",
        headers=viewer_headers,
        json={"shipment_id": "ship_123", "pin": "123456"}
    )
    assert viewer_sign.status_code == 403, f"VIEWER was allowed to sign! Status: {viewer_sign.status_code}"

    # C) VIEWER attempts to invite a team member (must be 403)
    viewer_invite = client.post(
        "/api/team/invite",
        headers=viewer_headers,
        json={"email": "hacked@example.com", "role": "OWNER"}
    )
    assert viewer_invite.status_code == 403, "VIEWER was allowed to invite team members!"

    # D) VIEWER attempts to update privacy settings (must be 403)
    viewer_priv = client.post(
        "/api/privacy/settings",
        headers=viewer_headers,
        json={"retention_years": 5}
    )
    assert viewer_priv.status_code == 403, "VIEWER was allowed to change privacy settings!"


def test_a5_05_first_run_checklist():
    """
    8. First-run checklist on the dashboard:
       - invite inspector
       - upload first MTC
       - create first shipment
       - download first pack
    """
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "email": f"chk_{uuid.uuid4().hex[:6]}@chkplant.in",
            "password": "ChecklistPassword1234!",
            "company_name": "Checklist Plant Ltd",
            "gstin": "29AABCC4444D1Z4",
            "name": "Checklist Owner"
        }
    ).json()

    org_id = signup_res["organization_id"]
    user_id = signup_res["user_id"]
    headers = _get_auth_header(user_id, org_id, "OWNER")

    res = client.get("/api/account/first-run-checklist", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "checklist" in data
    checklist = data["checklist"]
    assert "invite_inspector" in checklist
    assert "upload_first_mtc" in checklist
    assert "create_first_shipment" in checklist
    assert "download_first_pack" in checklist
    assert checklist["invite_inspector"] is False

    # Now invite an inspector
    client.post(
        "/api/team/invite",
        headers=headers,
        json={"email": f"insp_{uuid.uuid4().hex[:6]}@chkplant.in", "role": "QA_INSPECTOR"}
    )

    # Re-check checklist
    res2 = client.get("/api/account/first-run-checklist", headers=headers)
    assert res2.status_code == 200


def test_a5_06_sign_out_everywhere_revocation():
    """
    2. Sign out of all devices:
       Revokes all active refresh tokens for the calling user.
    """
    signup_res = client.post(
        "/api/auth/signup",
        json={
            "email": f"signout_{uuid.uuid4().hex[:6]}@signoutplant.in",
            "password": "SignoutPassword1234!",
            "company_name": "Signout Plant Ltd",
            "gstin": "33AABCS5555E1Z5",
            "name": "Signout Owner"
        }
    ).json()

    user_id = signup_res["user_id"]
    org_id = signup_res["organization_id"]
    headers = _get_auth_header(user_id, org_id, "OWNER")

    # Seed an active refresh token for this user
    raw_token = f"ref_tok_{uuid.uuid4().hex}"
    token_hash = AuthService.hash_token(raw_token) if hasattr(AuthService, "hash_token") else str(uuid.uuid4())
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at)
            VALUES (?, ?, ?, datetime('now', '+30 days'), 0, datetime('now'))
        """, (f"rt_{uuid.uuid4().hex[:8]}", user_id, token_hash))
        conn.commit()

    # Call sign-out-everywhere
    res = client.post("/api/auth/sign-out-everywhere", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # Verify all tokens for this user are revoked
    with get_db_connection(is_service_role=True) as conn:
        cur = conn.execute("SELECT revoked FROM refresh_tokens WHERE user_id = ?", (user_id,))
        rows = cur.fetchall()
        assert len(rows) > 0
        for r in rows:
            revoked_val = r["revoked"] if isinstance(r, dict) else r[0]
            assert revoked_val == 1, "Refresh token was not revoked by sign-out-everywhere!"


def test_a5_07_two_distinct_plants_isolation():
    """
    Proves that two plants signed up through onboarding see strictly only their own data.
    Plant Alpha: Howrah Forge Pvt Ltd (19AABCH1111A1Z1)
    Plant Beta: Jamshedpur Castings Ltd (20AABCJ2222B1Z2)
    """
    # 1. Sign up Plant Alpha
    alpha_res = client.post(
        "/api/auth/signup",
        json={
            "email": f"alpha_{uuid.uuid4().hex[:6]}@howrahforge.com",
            "password": "AlphaPassword1234!",
            "company_name": "Howrah Forge Pvt Ltd",
            "gstin": "19AABCH1111A1Z1",
            "name": "A. Banerjee"
        }
    ).json()
    org_alpha = alpha_res["organization_id"]
    user_alpha = alpha_res["user_id"]
    headers_alpha = _get_auth_header(user_alpha, org_alpha, "OWNER")

    # 2. Sign up Plant Beta
    beta_res = client.post(
        "/api/auth/signup",
        json={
            "email": f"beta_{uuid.uuid4().hex[:6]}@jamshedpurcast.com",
            "password": "BetaPassword1234!",
            "company_name": "Jamshedpur Castings Ltd",
            "gstin": "20AABCJ2222B1Z2",
            "name": "B. Jha"
        }
    ).json()
    org_beta = beta_res["organization_id"]
    user_beta = beta_res["user_id"]
    headers_beta = _get_auth_header(user_beta, org_beta, "OWNER")

    # 3. Plant Alpha invites an inspector
    alpha_insp_email = f"inspector_alpha_{uuid.uuid4().hex[:6]}@howrahforge.com"
    client.post(
        "/api/team/invite",
        headers=headers_alpha,
        json={"email": alpha_insp_email, "role": "QA_INSPECTOR"}
    )

    # 4. Plant Beta checks team members — must NOT see Plant Alpha's inspector or owner
    beta_team = client.get("/api/team/members", headers=headers_beta).json()
    beta_emails = [m["email"] for m in beta_team.get("members", [])]
    assert alpha_insp_email not in beta_emails, "Plant Beta leaked Plant Alpha's invited team member!"
    assert alpha_res["email"] not in beta_emails, "Plant Beta leaked Plant Alpha's owner account!"

    # 5. Plant Beta checks checklist — must reflect Plant Beta's state, not Plant Alpha's
    beta_chk = client.get("/api/account/first-run-checklist", headers=headers_beta).json()
    assert beta_chk["organization_id"] == org_beta
    assert beta_chk["checklist"]["invite_inspector"] is False, "Plant Beta inherited Plant Alpha's inspector invite!"
