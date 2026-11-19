"""
Tests for Prompt P3: WhatsApp and Email Intake Engine
Tests:
- Meta webhook verification handshake (hub.mode, hub.challenge, hub.verify_token)
- HMAC-SHA256 signature verification and invalid signature rejection
- Idempotency by external message id
- Web app pairing code generation and linking via WhatsApp text message
- Opt-out ('STOP') and Opt-in ('START') handling
- WhatsApp media upload (photo/PDF) storage and review link generation
- Email-in recipient matching, sender allow-list enforcement, tracking pixel removal, and attachment intake
- Monthly message budget cap and banner alert status
"""

import base64
import hashlib
import hmac
import os
import uuid
import pytest
from fastapi.testclient import TestClient

from main import app
from intake_service import IntakeService, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN
from auth_service import AuthService

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    token = AuthService.create_jwt({"sub": "usr_owner_01", "role": "OWNER", "organization_id": "org_demo_howrah"})
    return {"Authorization": f"Bearer {token}"}


def test_p3_meta_webhook_verification():
    """Verify Meta WhatsApp Cloud API subscription challenge handshake."""
    challenge = "11582049210"
    # Success case
    resp = client.get(f"/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token={WHATSAPP_VERIFY_TOKEN}&hub.challenge={challenge}")
    assert resp.status_code == 200
    assert resp.text == challenge

    # Failure case: bad token
    bad_resp = client.get(f"/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge={challenge}")
    assert bad_resp.status_code == 403


def test_p3_signature_verification_and_tamper_rejection():
    """Verify HMAC-SHA256 signature enforcement on WhatsApp webhook."""
    raw_payload = b'{"sender_phone": "+919876543210", "message_id": "msg_sig_01", "text_body": "HELP"}'
    valid_sig = "sha256=" + hmac.new(WHATSAPP_APP_SECRET.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest()

    # Valid signature
    resp = client.post(
        "/api/webhooks/whatsapp",
        content=raw_payload,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_sig}
    )
    assert resp.status_code == 200

    # Tampered payload with old signature
    tampered_payload = b'{"sender_phone": "+919876543210", "message_id": "msg_sig_01", "text_body": "TAMPERED"}'
    tampered_resp = client.post(
        "/api/webhooks/whatsapp",
        content=tampered_payload,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": valid_sig}
    )
    assert tampered_resp.status_code == 403


def test_p3_idempotency_by_message_id(auth_headers):
    """Verify identical message_id is ignored on replay."""
    phone = f"+9198{uuid.uuid4().int % 90000000 + 10000000}"
    pair_res = IntakeService.generate_pairing_code("usr_owner_01", "org_demo_howrah", "plant-howrah-01", phone_number=phone)
    IntakeService.confirm_pairing(phone, pair_res["pairing_code"])

    msg_id = f"wamid_idemp_{uuid.uuid4().hex[:8]}"
    payload = {
        "sender_phone": phone,
        "message_id": msg_id,
        "message_type": "text",
        "text_body": "STATUS"
    }

    # First delivery
    resp1 = client.post("/api/webhooks/whatsapp", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "PROCESSED"

    # Second delivery with exact same message_id
    resp2 = client.post("/api/webhooks/whatsapp", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["status"] == "DUPLICATE_IGNORED"


def test_p3_pairing_workflow_and_linking(auth_headers):
    """Generate web pairing code and link phone via WhatsApp message."""
    # 1. Web app generates pairing code
    gen_resp = client.post(
        "/api/intake/whatsapp/generate-pairing-code",
        json={"plant_id": "plant-howrah-01", "user_id": "usr_owner_01"},
        headers=auth_headers
    )
    assert gen_resp.status_code == 200
    pairing_data = gen_resp.json()
    code = pairing_data["pairing_code"]
    phone = pairing_data["phone_number"]

    # 2. Staff sends pairing code via WhatsApp: "PAIR <code>"
    wa_resp = client.post("/api/webhooks/whatsapp", json={
        "sender_phone": phone,
        "message_id": f"msg_pair_{uuid.uuid4().hex[:8]}",
        "message_type": "text",
        "text_body": f"PAIR {code}"
    })
    assert wa_resp.status_code == 200
    result = wa_resp.json()
    assert result["status"] == "PAIRING_ATTEMPT"
    assert result["success"] is True

    # 3. Check pairings list in web app
    list_resp = client.get("/api/intake/whatsapp/pairings?plant_id=plant-howrah-01", headers=auth_headers)
    assert list_resp.status_code == 200
    active_pairings = [p for p in list_resp.json()["pairings"] if p["phone_number"] == phone]
    assert len(active_pairings) == 1
    assert active_pairings[0]["is_verified"] == 1


def test_p3_opt_out_and_opt_in():
    """Verify STOP command opts user out, and START opts user back in."""
    phone = f"+9198{uuid.uuid4().int % 90000000 + 10000000}"
    pair_res = IntakeService.generate_pairing_code("usr_owner_01", "org_demo_howrah", "plant-howrah-01", phone_number=phone)
    IntakeService.confirm_pairing(phone, pair_res["pairing_code"])

    # Send STOP
    stop_resp = client.post("/api/webhooks/whatsapp", json={
        "sender_phone": phone,
        "message_id": f"msg_opt_stop_{uuid.uuid4().hex[:6]}",
        "message_type": "text",
        "text_body": "STOP"
    })
    assert stop_resp.status_code == 200
    assert stop_resp.json()["status"] == "OPTED_OUT"
    assert "unsubscribed" in stop_resp.json()["reply"].lower()

    # While opted out, sending normal text returns SENDER_OPTED_OUT
    blocked_resp = client.post("/api/webhooks/whatsapp", json={
        "sender_phone": phone,
        "message_id": f"msg_opt_chk_{uuid.uuid4().hex[:6]}",
        "message_type": "text",
        "text_body": "Hello?"
    })
    assert blocked_resp.status_code == 200
    assert blocked_resp.json()["status"] == "SENDER_OPTED_OUT"

    # Send START
    start_resp = client.post("/api/webhooks/whatsapp", json={
        "sender_phone": phone,
        "message_id": f"msg_opt_start_{uuid.uuid4().hex[:6]}",
        "message_type": "text",
        "text_body": "START"
    })
    assert start_resp.status_code == 200
    assert start_resp.json()["status"] == "OPTED_IN"
    assert "re-enabled" in start_resp.json()["reply"].lower()


def test_p3_media_upload_and_untouched_storage():
    """Verify uploading a PDF/photo certificate via WhatsApp stores untouched original and replies with deep link."""
    phone = f"+9198{uuid.uuid4().int % 90000000 + 10000000}"
    pair_res = IntakeService.generate_pairing_code("usr_owner_01", "org_demo_howrah", "plant-howrah-01", phone_number=phone)
    IntakeService.confirm_pairing(phone, pair_res["pairing_code"])

    pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF"
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    expected_hash = hashlib.sha256(pdf_bytes).hexdigest()

    resp = client.post("/api/webhooks/whatsapp", json={
        "sender_phone": phone,
        "message_id": f"msg_media_{uuid.uuid4().hex[:8]}",
        "message_type": "document",
        "media_base64": pdf_b64,
        "media_filename": "Jindal_MTC_Test.pdf"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "PROCESSED"
    assert data["sha256"] == expected_hash
    assert "workbench" in data["reply"].lower()


def test_p3_email_in_allow_list_and_attachment_intake(auth_headers):
    """Verify inbound email matches plant address, enforces allow-list, and ingests certificate attachment."""
    plant_id = "plant-howrah-01"

    # 1. Configure plant allow-list to only allow @tatasteel.com and vendor@jspl.com
    client.post(
        "/api/intake/email/config",
        json={
            "plant_id": plant_id,
            "allow_list": ["@tatasteel.com", "vendor@jspl.com"],
            "is_active": True
        },
        headers=auth_headers
    )

    # 2. Unauthorized sender should be rejected
    unauth_resp = client.post("/api/webhooks/email-in", json={
        "sender_email": "spammer@random.com",
        "recipient_email": "docs-howrah@inbound.heatledger.ai",
        "subject": "Spam",
        "attachments": []
    })
    assert unauth_resp.status_code == 200
    assert unauth_resp.json()["status"] == "REJECTED_UNAUTHORIZED_SENDER"

    # 3. Authorized sender with certificate attachment
    test_pdf = b"%PDF-1.4 sample mtc certificate bytes"
    pdf_b64 = base64.b64encode(test_pdf).decode("ascii")

    auth_email_resp = client.post("/api/webhooks/email-in", json={
        "sender_email": "dispatch@tatasteel.com",
        "recipient_email": "docs-howrah@inbound.heatledger.ai",
        "subject": "MTC for PO-8819",
        "html_body": "<div>Here is the certificate.<img src='https://track.com/1x1.png' width='1' height='1'></div>",
        "attachments": [
            {
                "filename": "TataSteel_MTC_8819.pdf",
                "content_bytes": test_pdf.decode("latin1"),
                "size_bytes": 10240
            },
            {
                "filename": "tracking.png",
                "content_bytes": "pixel",
                "size_bytes": 68  # tiny tracker image should be stripped
            }
        ]
    })
    assert auth_email_resp.status_code == 200
    email_data = auth_email_resp.json()
    assert email_data["status"] == "PROCESSED"
    assert email_data["count"] == 1
    assert email_data["plant_id"] == plant_id


def test_p3_budget_status_and_audit_log(auth_headers):
    """Verify message budget reporting, cap threshold, and unified inbound log."""
    budget_resp = client.get("/api/intake/budget?plant_id=plant-howrah-01", headers=auth_headers)
    assert budget_resp.status_code == 200
    budget_data = budget_resp.json()
    assert "monthly_budget" in budget_data
    assert "messages_used" in budget_data
    assert budget_data["is_capped"] is False

    # Check unified inbound log
    log_resp = client.get("/api/intake/inbound-log?plant_id=plant-howrah-01", headers=auth_headers)
    assert log_resp.status_code == 200
    logs = log_resp.json()["logs"]
    assert len(logs) >= 1
    channels = {l["channel"] for l in logs}
    assert "WHATSAPP" in channels or "EMAIL" in channels
