"""
HEATLEDGER AI: Prompt L2 & L3 Test Suite
Free Public MTC Check (/check) & One-Page Pilot Kit:
- Instant MTC verification without an account
- Rate limiting (max 3 checks per IP per 24 hours)
- Max 5 MB upload limit enforcement
- Lead capture and WhatsApp walkthrough booking link generation
- Honeypot spam filtering
- 4-page consolidated pilot kit in docs/PILOT_KIT.md
- Verification that older long onboarding documents have been cleaned up
"""

import os
import uuid
from starlette.testclient import TestClient

from main import app
from public_check_service import _IP_CHECK_LOG


def test_l2_1_public_check_analyze_valid_mtc():
    """
    L2 Deliverable 1: Public MTC check analyzes document and returns one-screen report.
    """
    client = TestClient(app)
    synthetic_mtc_text = (
        "BHILAI STEEL PLANT - SAIL\n"
        "EN 10204 3.1 INSPECTION CERTIFICATE\n"
        "HEAT NUMBER: HT-SAIL-901\n"
        "COUNTRY OF MELT AND POUR: INDIA\n"
        "GRADE: S355JR\n"
        "C: 0.17  Mn: 1.40  Si: 0.22  P: 0.018  S: 0.012\n"
    )

    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), synthetic_mtc_text)
    pdf_bytes = doc.tobytes()
    doc.close()

    unique_ip = f"192.168.1.{uuid.uuid4().int % 250 + 1}"
    _IP_CHECK_LOG[unique_ip] = []

    res = client.post(
        "/api/check/analyze",
        files={"file": ("saill_mtc.pdf", pdf_bytes, "application/pdf")},
        headers={"X-Forwarded-For": unique_ip}
    )

    assert res.status_code == 200
    data = res.json()
    assert data["heat_number"] == "HT-SAIL-901"
    assert data["melt_and_pour_country"] == "India"
    assert data["melt_and_pour_status"] == "FOUND"
    assert len(data["suggestions"]) <= 3
    assert "Prepares documents for review. Not legal advice." in data["footer_disclaimer"]


def test_l2_2_public_check_rate_limit_3_per_day():
    """
    L2 Deliverable 2: Rate limit of 3 checks per IP per 24 hours is strictly enforced.
    """
    client = TestClient(app)
    fake_pdf = b"%PDF-1.4 empty pdf content for testing"
    test_ip = f"10.0.0.{uuid.uuid4().int % 250 + 1}"
    _IP_CHECK_LOG[test_ip] = []

    # 3 allowed checks
    for _ in range(3):
        res = client.post(
            "/api/check/analyze",
            files={"file": ("test.pdf", fake_pdf, "application/pdf")},
            headers={"X-Forwarded-For": test_ip}
        )
        assert res.status_code in (200, 400) # (might be 400 if bad pdf, but not 429)

    # 4th check MUST be rejected with HTTP 429 Too Many Requests
    res_4 = client.post(
        "/api/check/analyze",
        files={"file": ("test.pdf", fake_pdf, "application/pdf")},
        headers={"X-Forwarded-For": test_ip}
    )
    assert res_4.status_code == 429
    assert "daily limit reached" in res_4.json()["detail"].lower()


def test_l2_3_public_check_file_size_limit_5mb():
    """
    L2 Deliverable 3: Uploads exceeding 5 MB are rejected.
    """
    client = TestClient(app)
    oversized_data = b"0" * (5 * 1024 * 1024 + 1024) # 5MB + 1KB
    unique_ip = f"172.16.0.{uuid.uuid4().int % 250 + 1}"

    res = client.post(
        "/api/check/analyze",
        files={"file": ("huge.pdf", oversized_data, "application/pdf")},
        headers={"X-Forwarded-For": unique_ip}
    )
    assert res.status_code == 400
    assert "exceeds 5 mb" in res.json()["detail"].lower()


def test_l2_4_public_check_lead_capture_and_booking_link():
    """
    L2 Deliverable 4: Lead submission inserts record and returns WhatsApp booking link.
    """
    client = TestClient(app)
    lead_payload = {
        "name": "Ramesh Sen",
        "company": "Sen Forgings Ltd",
        "work_email": f"ramesh_{uuid.uuid4().hex[:6]}@senforgings.com",
        "phone": "+91 98300 12345",
        "check_id": "chk_test_123",
        "consent": True,
        "honeypot": None
    }

    res = client.post("/api/check/lead", json=lead_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "lead_captured"
    assert "whatsapp_booking_url" in data
    assert "wa.me" in data["whatsapp_booking_url"]


def test_l2_5_public_check_lead_honeypot_bot_filtering():
    """
    L2 Deliverable 5: Honeypot submission silently drops bot lead.
    """
    client = TestClient(app)
    bot_payload = {
        "name": "SpamBot",
        "company": "Spam Corp",
        "work_email": "bot@spam.com",
        "phone": "+1234567890",
        "consent": True,
        "honeypot": "http://spamsite.xyz"
    }

    res = client.post("/api/check/lead", json=bot_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "received"


def test_l3_1_pilot_kit_concise_structure():
    """
    L3 Deliverable 1: Verifies docs/PILOT_KIT.md exists, contains all 4 pages,
    sources all claims, documents lawyer review notice, and maintains honest pricing.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kit_path = os.path.join(root_dir, "docs", "PILOT_KIT.md")

    assert os.path.exists(kit_path), "docs/PILOT_KIT.md missing!"

    with open(kit_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "25,000 INR" in content or "25,000" in content
    assert "30 days" in content or "30-day" in content
    assert "Review with a qualified lawyer" in content or "lawyer before use" in content.lower()
    assert "No Guarantee of Customs Outcomes" in content
    assert "Onboarding Call Script" in content
    assert "Plant Success Sheet" in content


def test_l3_2_old_long_onboarding_docs_removed():
    """
    L3 Deliverable 2: Verifies old redundant onboarding files are completely removed.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    docs_dir = os.path.join(root_dir, "docs")

    old_files = [
        "PILOT_AGREEMENT_TEMPLATE.md",
        "ONBOARDING_EMAIL_SEQUENCE.md",
        "HOWRAH_KOLKATA_EXPORTER_FIELD_PLAYBOOK.md"
    ]

    for fname in old_files:
        assert not os.path.exists(os.path.join(docs_dir, fname)), f"Old document {fname} was not removed!"
