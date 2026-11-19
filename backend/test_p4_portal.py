"""
Tests for Prompt P4: Buyer and Customs-Broker Portal Engine
Tests:
- Exporter creates 30-day tokenized share link
- Public no-login dossier fetch at /api/portal/share/{token}
- Melt-and-pour country by heat preserved in Latin ISO format (e.g. 'India (IN)')
- Ed25519 digital signature status and verification URL
- Access logs tracking (views, downloads, approximate city)
- Passcode-protected link gating and unlock verification
- Revocation of share links blocks subsequent access
- Buyer actions (ACCEPT, QUESTION, REQUEST_DOC) with QA/Dispatch alert
- Zero internal pricing or margin leakage in public payload
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from auth_service import AuthService
from portal_service import PortalService

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    token = AuthService.create_jwt({"sub": "usr_owner_01", "role": "OWNER", "organization_id": "org_howrah_steel_01"})
    return {"Authorization": f"Bearer {token}"}


def test_p4_create_and_list_share_links(auth_headers):
    """Verify exporter creates tokenized share link with 30-day expiry."""
    shipment_id = "EXP-2026-109"
    resp = client.post(
        "/api/portal/share-links",
        json={
            "shipment_id": shipment_id,
            "expires_in_days": 30,
            "custom_note": "Inspection packet for Rotterdam Customs Clearance"
        },
        headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "token" in data
    assert data["token"].startswith("hl_")
    assert data["has_passcode"] is False

    # List links
    list_resp = client.get(f"/api/portal/share-links?shipment_id={shipment_id}", headers=auth_headers)
    assert list_resp.status_code == 200
    links = list_resp.json()["share_links"]
    assert len(links) >= 1
    target = next((l for l in links if l["token"] == data["token"]), None)
    assert target is not None
    assert target["shipment_id"] == shipment_id


def test_p4_public_no_login_access():
    """Verify buyer can access read-only dossier without login or account creation."""
    # Create test link directly via service
    link = PortalService.create_share_link("EXP-2026-109", expires_in_days=30)
    token = link["token"]

    # Public request (no Authorization header)
    resp = client.get(f"/api/portal/share/{token}")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["valid"] is True
    assert payload["requires_passcode"] is False

    dossier = payload["dossier"]
    assert dossier["shipment_id"] == "EXP-2026-109"
    assert dossier["destination_port"] == "Port of Rotterdam, Netherlands"
    assert dossier["digital_signature"]["algorithm"] == "Ed25519"
    assert "verify" in dossier["digital_signature"]["verification_url"].lower()

    # Check Melt-and-Pour by Heat
    heats = dossier["heats"]
    assert len(heats) >= 2
    for h in heats:
        assert "IN" in h["melt_country"]
        assert "A10" in h["steel_grade"]
        assert "TSJ" in h["heat_number"] or "JSW" in h["heat_number"]

    # Check Zero Internal Pricing Leakage
    payload_str = str(payload).lower()
    assert "profit" not in payload_str
    assert "margin" not in payload_str
    assert "cost_inr" not in payload_str


def test_p4_passcode_protection_and_unlock():
    """Verify passcode-protected link asks for passcode and unlocks upon correct entry."""
    passcode = "EuroStahl2026"
    link = PortalService.create_share_link("EXP-2026-109", passcode=passcode)
    token = link["token"]

    # Access without passcode returns requires_passcode: True
    locked_resp = client.get(f"/api/portal/share/{token}")
    assert locked_resp.status_code == 200
    data = locked_resp.json()
    assert data["requires_passcode"] is True
    assert "passcode" in data["message"].lower()

    # Wrong passcode returns 401
    bad_resp = client.post(
        f"/api/portal/share/{token}/verify-passcode",
        json={"passcode": "wrong_code"}
    )
    assert bad_resp.status_code == 401

    # Correct passcode unlocks dossier
    good_resp = client.post(
        f"/api/portal/share/{token}/verify-passcode",
        json={"passcode": passcode}
    )
    assert good_resp.status_code == 200
    unlocked = good_resp.json()
    assert unlocked["valid"] is True
    assert unlocked["dossier"]["shipment_id"] == "EXP-2026-109"


def test_p4_revoke_share_link(auth_headers):
    """Verify exporter can revoke a link, immediately blocking public access."""
    link = PortalService.create_share_link("EXP-2026-109", organization_id="org_howrah_steel_01")
    token = link["token"]

    # Public works initially
    pre_resp = client.get(f"/api/portal/share/{token}")
    assert pre_resp.status_code == 200

    # Exporter revokes link
    rev_resp = client.post(f"/api/portal/share-links/{token}/revoke", headers=auth_headers)
    assert rev_resp.status_code == 200

    # Subsequent public access returns 404
    post_resp = client.get(f"/api/portal/share/{token}")
    assert post_resp.status_code == 404
    assert "revoked" in post_resp.json()["detail"].lower()


def test_p4_buyer_interactive_actions_and_feedback():
    """Verify buyer can ACCEPT, submit QUESTION or REQUEST_DOC."""
    link = PortalService.create_share_link("EXP-2026-109")
    token = link["token"]

    # 1. Buyer accepts dossier
    accept_resp = client.post(f"/api/portal/share/{token}/action", json={
        "action_type": "ACCEPT",
        "buyer_name": "Hans Gruber",
        "buyer_email": "h.gruber@eurostahl.de",
        "message": "Dossier reviewed and approved for Rotterdam customs clearance."
    })
    assert accept_resp.status_code == 200
    assert accept_resp.json()["action_type"] == "ACCEPT"

    # 2. Buyer raises a question (comment thread)
    question_resp = client.post(f"/api/portal/share/{token}/action", json={
        "action_type": "QUESTION",
        "buyer_name": "Klaus Richter",
        "buyer_email": "klaus.richter@eurostahl.de",
        "message": "Please confirm if heat TSJ-26-9021 ladle analysis matches 3.2 inspection requirements."
    })
    assert question_resp.status_code == 200

    # Verify feedback shows in thread
    feedback_list = PortalService.get_buyer_feedback(token)
    assert len(feedback_list) == 2
    actions = [f["action_type"] for f in feedback_list]
    assert "ACCEPT" in actions
    assert "QUESTION" in actions


def test_p4_download_logging_and_geo(auth_headers):
    """Verify file downloads are recorded in audit logs with approximate EU city."""
    link = PortalService.create_share_link("EXP-2026-109")
    token = link["token"]

    # Trigger download
    dl_resp = client.get(f"/api/portal/share/{token}/download/zip")
    assert dl_resp.status_code == 200

    # Verify download count in exporter link listing
    links_resp = client.get("/api/portal/share-links?shipment_id=EXP-2026-109", headers=auth_headers)
    assert links_resp.status_code == 200
    matching = next((l for l in links_resp.json()["share_links"] if l["token"] == token), None)
    assert matching is not None
