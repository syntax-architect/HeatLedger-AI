"""
Test Suite for Prompt C7: Chase the Mill and Mill Scorecard Engine
Specifications:
1. Directory per plant (name, contact, plant location, email, phone) - tenant isolated.
2. Chase request generation ('Ask mill') with Resend email and WhatsApp-ready text with secure upload link.
3. Rate limit and abuse protection on mill link, 7-day expiry, tampered link returns 404.
4. Mill upload page: drag file, magic bytes check (PDF/JPEG/PNG), 15MB cap, attaches to heat.
5. Reminders at 2 and 5 days, stops when fulfilled.
6. Mill scorecard: on-time rate, missing fields, error rate, average days to respond.
7. Single-sentence legal disclaimer strictly preserved.
"""

import io
import time
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.main import app
from backend.supplier_service import (
    get_mill_chaser_service,
    MAX_UPLOAD_SIZE_BYTES,
)
from backend.db.connection import get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    """Ensure database connection is ready."""
    with get_db() as conn:
        conn.execute("SELECT 1")
    yield


def test_mill_directory_tenant_isolation():
    """Requirement 5: Mill directory per plant. No shared directory across organizations."""
    service = get_mill_chaser_service()
    org_a = f"org_tata_{int(time.time()*1000)}"
    org_b = f"org_jsw_{int(time.time()*1000)}"

    # Add mill for org_a
    mill_a = service.create_mill(
        org_id=org_a,
        mill_name="Kalinga Steel Mill",
        contact_person="Ramesh Patel",
        email="ramesh@kalingasteel.example.com",
        phone="+919876543210",
        plant_location="Jajpur, Odisha",
    )
    assert mill_a["id"] is not None
    assert mill_a["mill_name"] == "Kalinga Steel Mill"

    # Add mill for org_b
    service.create_mill(
        org_id=org_b,
        mill_name="Bellary Alloy Works",
        contact_person="Suresh Kumar",
        email="suresh@bellaryalloy.example.com",
        phone="+919876543211",
        plant_location="Toranagallu, Karnataka",
    )

    # Verify org_a sees only its own mills
    mills_org_a = service.list_mills(org_id=org_a)
    assert len(mills_org_a) == 1
    assert mills_org_a[0]["mill_name"] == "Kalinga Steel Mill"

    # Verify org_b sees only its own mills
    mills_org_b = service.list_mills(org_id=org_b)
    assert len(mills_org_b) == 1
    assert mills_org_b[0]["mill_name"] == "Bellary Alloy Works"


def test_create_chase_request_expiry_and_whatsapp_text():
    """Requirement 1 & 6: Ask mill request generation, 7 day expiry, WhatsApp text."""
    service = get_mill_chaser_service()
    org_id = f"org_chase_{int(time.time()*1000)}"

    mill = service.create_mill(
        org_id=org_id,
        mill_name="JSPL Raigarh",
        contact_person="Deepak Verma",
        email="deepak@jspl.example.com",
        phone="+919876543212",
        plant_location="Raigarh, Chhattisgarh",
    )

    heat_number = "HEAT-9921-X"
    missing_items = ["Country of Pour confirmation", "Yield strength test curve", "EN 10204 3.1 Stamp"]

    req = service.create_chase_request(
        org_id=org_id,
        heat_number=heat_number,
        mill_id=mill["id"],
        missing_items=missing_items,
        notes="Urgent EU customs dispatch requires original stamp",
    )

    assert req["id"] is not None
    assert req["token"] is not None
    assert req["status"] == "PENDING"
    assert req["missing_items"] == missing_items

    # Verify 7-day expiry calculation
    created_at = datetime.fromisoformat(req["created_at"])
    expires_at = datetime.fromisoformat(req["expires_at"])
    diff_days = (expires_at - created_at).total_seconds() / 86400
    assert 6.9 <= diff_days <= 7.1

    # Verify WhatsApp message contains heat number, missing items, and secure upload link
    wa_msg = req["whatsapp_message"]
    assert heat_number in wa_msg
    assert "Country of Pour" in wa_msg
    assert req["upload_url"] in wa_msg
    assert "Prepares documents for review. Not legal advice." in wa_msg


def test_public_token_resolution_and_tamper_protection():
    """Requirement 6: Public upload access with token; tampered/expired returns None/404."""
    service = get_mill_chaser_service()
    org_id = f"org_token_test_{int(time.time()*1000)}"

    req = service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-404-T",
        mill_name="Bhilai Steel",
        mill_contact_email="bhilai@sail.example.com",
        missing_items=["Melt and Pour Declaration"],
    )

    # 1. Valid token resolution
    resolved = service.get_request_by_token(req["token"])
    assert resolved is not None
    assert resolved["heat_number"] == "HEAT-404-T"

    # 2. Tampered token returns None
    tampered = service.get_request_by_token(req["token"] + "fake")
    assert tampered is None

    # 3. Non-existent token returns None
    assert service.get_request_by_token("completely_invalid_token_12345") is None


def test_mill_upload_magic_bytes_and_size_validation():
    """Requirement 2 & 6: File magic bytes validation, size limit, and fulfillment."""
    service = get_mill_chaser_service()
    org_id = f"org_upload_test_{int(time.time()*1000)}"

    req = service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-UPLOAD-1",
        mill_name="Electrosteel Steels",
        mill_contact_email="qa@electrosteel.example.com",
        missing_items=["Mill Test Certificate PDF"],
    )

    token = req["token"]

    # 1. Attempt upload with executable / invalid magic bytes -> Rejected
    bad_bytes = b"MZ\x90\x00\x03\x00\x00\x00"  # Windows EXE header
    with pytest.raises(ValueError, match="Invalid file"):
        service.fulfill_chase_upload(
            token=token,
            file_bytes=bad_bytes,
            filename="malicious.pdf",
        )

    # 2. Attempt upload exceeding 15MB -> Rejected
    oversized_bytes = b"%PDF-1.4 " + (b"0" * (MAX_UPLOAD_SIZE_BYTES + 100))
    with pytest.raises(ValueError, match="exceeds maximum"):
        service.fulfill_chase_upload(
            token=token,
            file_bytes=oversized_bytes,
            filename="huge_cert.pdf",
        )

    # 3. Valid PDF upload -> Accepted and fulfilled
    valid_pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"
    result = service.fulfill_chase_upload(
        token=token,
        file_bytes=valid_pdf_content,
        filename="verified_heat_cert.pdf",
    )

    assert result["status"] == "FULFILLED"
    assert result["uploaded_file_name"] == "verified_heat_cert.pdf"
    assert result["file_sha256"] is not None

    # 4. Attempting to re-upload to an already fulfilled token fails
    with pytest.raises(ValueError, match="already fulfilled"):
        service.fulfill_chase_upload(
            token=token,
            file_bytes=valid_pdf_content,
            filename="duplicate.pdf",
        )


def test_reminder_tracking_and_auto_stop():
    """Requirement 3: Reminders at 2 and 5 days, stops when fulfilled."""
    service = get_mill_chaser_service()
    org_id = f"org_remind_{int(time.time()*1000)}"

    req = service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-REMIND-1",
        mill_name="Durgapur Steel Plant",
        mill_contact_email="dsp@sail.example.com",
        missing_items=["Spectro Chemical Analysis"],
    )

    req_id = req["id"]

    # At day 0: No reminder due
    due_day0 = service.check_due_reminders(now=datetime.now(timezone.utc))
    assert not any(r["id"] == req_id for r in due_day0)

    # At day 2.1: Day 2 reminder due
    day2_time = datetime.now(timezone.utc) + timedelta(days=2, hours=2)
    due_day2 = service.check_due_reminders(now=day2_time)
    assert any(r["id"] == req_id and r["reminder_stage"] == 1 for r in due_day2)

    # Record reminder sent
    service.record_reminder_sent(req_id, reminder_stage=1, sent_at=day2_time.isoformat())

    # Fulfill request before day 5
    valid_pdf = b"%PDF-1.4 valid test mtc document %%EOF"
    service.fulfill_chase_upload(req["token"], valid_pdf, "heat_mtc.pdf")

    # At day 5.1: Request is already FULFILLED, so NO reminder is sent!
    day5_time = datetime.now(timezone.utc) + timedelta(days=5, hours=2)
    due_day5 = service.check_due_reminders(now=day5_time)
    assert not any(r["id"] == req_id for r in due_day5)


def test_mill_scorecard_metrics():
    """Requirement 4: Mill scorecard: on-time rate, error rate, average days to respond."""
    service = get_mill_chaser_service()
    org_id = f"org_scorecard_{int(time.time()*1000)}"

    mill = service.create_mill(
        org_id=org_id,
        mill_name="Kalyani Steels Pune",
        contact_person="Anil Deshmukh",
        email="anil@kalyani.example.com",
        phone="+919876543299",
        plant_location="Pune, Maharashtra",
    )

    mill_id = mill["id"]

    # Create Request 1: Fulfilled quickly (1 day)
    req1 = service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-SCORE-1",
        mill_id=mill_id,
        missing_items=["MTC"],
    )
    service.fulfill_chase_upload(
        token=req1["token"],
        file_bytes=b"%PDF-1.4 test 1 %%EOF",
        filename="mtc1.pdf",
    )

    # Create Request 2: Still pending
    service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-SCORE-2",
        mill_id=mill_id,
        missing_items=["Tensile Test Curve"],
    )

    # Compute scorecard
    scorecard = service.get_mill_scorecard(org_id=org_id)
    assert len(scorecard) >= 1

    mill_stat = next(s for s in scorecard if s["mill_id"] == mill_id)
    assert mill_stat["total_requests"] == 2
    assert mill_stat["fulfilled_count"] == 1
    assert mill_stat["pending_count"] == 1
    assert "average_response_days" in mill_stat
    assert mill_stat["score_grade"] in ["A", "B", "C", "D", "PENDING"]


def test_public_router_endpoints():
    """Verify HTTP API access for both authenticated plant owner and public mill representative."""
    # 1. Create chase request via service
    service = get_mill_chaser_service()
    org_id = f"org_http_{int(time.time()*1000)}"

    req = service.create_chase_request(
        org_id=org_id,
        heat_number="HEAT-HTTP-99",
        mill_name="Essar Hazira",
        mill_contact_email="logistics@essar.example.com",
        missing_items=["Carbon Equivalent Formula verification"],
    )
    token = req["token"]

    # 2. Public Mill Representative accesses upload page details without login
    res = client.get(f"/api/public/mill-chase/{token}")
    assert res.status_code == 200
    data = res.json()
    assert data["heat_number"] == "HEAT-HTTP-99"
    assert data["disclaimer"] == "Prepares documents for review. Not legal advice."

    # 3. Public Mill Representative uploads document without login
    files = {"file": ("mill_cert.pdf", io.BytesIO(b"%PDF-1.4 cert content %%EOF"), "application/pdf")}
    upload_res = client.post(f"/api/public/mill-chase/{token}/upload", files=files)
    assert upload_res.status_code == 200
    assert upload_res.json()["status"] == "FULFILLED"

    # 4. Tampered token returns 404
    bad_res = client.get("/api/public/mill-chase/non_existent_fake_token_404")
    assert bad_res.status_code == 404
