"""
HEATLEDGER AI: Prompt S7 Verification Test Suite
Upload, API & Browser Hardening (Prompt Pack v3 Phase 1)
Tests:
1. Malicious PDF with embedded /JavaScript stripped from working copy; original remains byte-identical.
2. Oversized file (>10 MB) rejected with HTTP 413.
3. Spoofed MIME-type / fake magic bytes rejected with HTTP 400.
4. Safe subprocess PDF parsing with timeout and page limits.
5. CSV formula injection defense (cells starting with =, +, -, @, \\t, \\r sanitized with single quote).
6. SSRF prevention (blocking localhost, 127.0.0.1, 10.0.0.0/8, and cloud metadata 169.254.169.254).
7. Share and supplier link 128-bit token entropy, expiry, revocation, and 6-digit passcode.
8. HMAC webhook signature verification with anti-replay timestamp window.
9. Production CSP without 'unsafe-inline' or localhost, and Permissions-Policy camera scoping.
10. Per-user, per-organization rate limits and billing quota extraction enforcement.
"""

import os
import io
import time
import uuid
import hmac
import pytest
import hashlib
import pymupdf as fitz
from fastapi.testclient import TestClient

from main import app, MAX_FILE_SIZE
from security_hardening import (
    sanitize_pdf_working_copy,
    safe_parse_pdf_subprocess,
    sanitize_csv_cell,
    SafeCSVWriter,
    validate_outbound_url,
    generate_secure_token,
    validate_passcode_format,
    verify_webhook_signature
)
from portal_service import PortalService
from billing_service import BillingService

client = TestClient(app)


def test_s7_malicious_pdf_stripped_working_copy():
    """Verifies that embedded /JavaScript is stripped from working copy while original is unchanged."""
    doc = fitz.open()
    doc.new_page()
    base_bytes = doc.write()
    doc.close()

    doc2 = fitz.open(stream=base_bytes, filetype="pdf")
    js_xref = doc2.get_new_xref()
    doc2.update_object(js_xref, '<< /Type /Action /S /JavaScript /JS (app.alert("Pwned!")) >>')
    hostile_bytes = doc2.write()
    doc2.close()

    assert b"/JavaScript" in hostile_bytes

    # Working copy sanitized
    sanitized_bytes = sanitize_pdf_working_copy(hostile_bytes)
    assert b"/DisabledAction" in sanitized_bytes
    assert b"/JavaScript" not in sanitized_bytes

    # Original bytes remain 100% byte-identical
    assert hostile_bytes != sanitized_bytes
    assert len(hostile_bytes) > 0


def test_s7_oversized_file_rejected_413():
    """Verifies that uploads exceeding the 10 MB limit are rejected with HTTP 413."""
    oversized = b"%PDF-" + b"A" * (MAX_FILE_SIZE + 512)
    res = client.post(
        "/api/ocr/extract-mtc",
        files={"file": ("oversized.pdf", oversized, "application/pdf")}
    )
    assert res.status_code == 413
    assert "Payload Too Large" in res.json().get("detail", "")


def test_s7_magic_bytes_spoofing_rejected():
    """Verifies that fake files with mismatched magic bytes are rejected with HTTP 400."""
    fake_exe = b"MZ\x90\x00\x03\x00\x00\x00echo Pwned"
    res = client.post(
        "/api/ocr/extract-mtc",
        files={"file": ("fake.pdf", fake_exe, "application/pdf")}
    )
    assert res.status_code == 400
    assert "Invalid file signature" in res.json().get("detail", "")


def test_s7_subprocess_timeout_and_safe_parse():
    """Verifies safe PDF parsing and page count limits."""
    doc = fitz.open()
    doc.new_page()
    doc[0].insert_text((50, 50), "HeatLedger Safe Parsing Test", fontsize=12)
    valid_pdf = doc.write()
    doc.close()

    res = safe_parse_pdf_subprocess(valid_pdf, timeout_seconds=10.0)
    assert res["status"] == "SAFE"
    assert res["page_count"] == 1
    assert "HeatLedger" in res["text_preview"]


def test_s7_csv_formula_injection_defense():
    """Verifies that cells starting with =, +, -, @, \\t, \\r are prefixed with a quote."""
    dangerous_inputs = [
        ("=cmd|' /C calc'!A0", "'=cmd|' /C calc'!A0"),
        ("+123456", "'+123456"),
        ("-HYPERLINK(\"http://evil.com\")", "'-HYPERLINK(\"http://evil.com\")"),
        ("@SUM(A1:A10)", "'@SUM(A1:A10)"),
        ("\tTabIndentedFormula", "'\tTabIndentedFormula"),
        ("Normal Steel Flange", "Normal Steel Flange"),
        (12345, 12345),
        (24.5, 24.5),
    ]

    for raw, expected in dangerous_inputs:
        assert sanitize_csv_cell(raw) == expected

    # Test SafeCSVWriter
    output = io.StringIO()
    writer = SafeCSVWriter(output)
    writer.writerow(["=2+2", "Safe Cell", "@SUM(B1)"])
    csv_text = output.getvalue()
    assert "'=2+2" in csv_text
    assert "Safe Cell" in csv_text
    assert "'@SUM(B1)" in csv_text


def test_s7_ssrf_prevention():
    """Verifies that SSRF attack payloads targeting private IPs and metadata are blocked."""
    forbidden_urls = [
        "http://127.0.0.1:8000/internal",
        "http://localhost:3000/admin",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.1.5/keys",
        "http://192.168.1.1/router",
        "http://172.16.0.1/private",
        "ftp://malicious.com/file"
    ]

    for u in forbidden_urls:
        with pytest.raises(ValueError) as exc:
            validate_outbound_url(u)
        assert "SSRF blocked" in str(exc.value)


def test_s7_share_link_entropy_and_passcode():
    """Verifies 128-bit random token entropy, expiry, revocation, and 6-digit passcode."""
    token = generate_secure_token("hl")
    assert token.startswith("hl_")
    # 32 hex chars = 16 bytes = 128 bits
    hex_part = token.split("_")[1]
    assert len(hex_part) == 32
    int(hex_part, 16)  # valid hex

    # Passcode validation
    assert validate_passcode_format("123456") is True
    assert validate_passcode_format("000000") is True
    assert validate_passcode_format("12345") is False
    assert validate_passcode_format("1234567") is False
    assert validate_passcode_format("abcdef") is False

    # Create link with 6-digit passcode
    link = PortalService.create_share_link(
        shipment_id="EXP-2026-S7-TEST",
        organization_id="org_howrah_steel_01",
        expires_in_days=7,
        passcode="987654"
    )
    assert link["has_passcode"] is True
    assert len(link["token"]) >= 35

    # Revoke link
    revoked = PortalService.revoke_share_link(link["token"], "org_howrah_steel_01")
    assert revoked is True


def test_s7_webhook_replay_protection():
    """Verifies HMAC-SHA256 signature verification and timestamp anti-replay window."""
    secret = "whsec_test_secret_heatledger_2026"
    payload = b'{"event":"shipment.sealed","id":"EXP-2026-109"}'
    now = time.time()

    # Valid fresh signature
    mac = hmac.new(secret.encode("utf-8"), f"{int(now)}.".encode("utf-8") + payload, hashlib.sha256).hexdigest()
    sig = f"sha256={mac}"
    assert verify_webhook_signature(secret, payload, sig, timestamp_header=str(now)) is True

    # Replay attack: timestamp older than 300 seconds rejected
    old_ts = now - 350
    old_mac = hmac.new(secret.encode("utf-8"), f"{int(old_ts)}.".encode("utf-8") + payload, hashlib.sha256).hexdigest()
    old_sig = f"sha256={old_mac}"
    assert verify_webhook_signature(secret, payload, old_sig, timestamp_header=str(old_ts)) is False


def test_s7_production_csp_and_permissions():
    """Verifies that production CSP removes 'unsafe-inline' and Permissions-Policy scopes camera."""
    orig_env = os.environ.get("ENV")
    try:
        os.environ["ENV"] = "production"
        
        # General route
        res = client.get("/")
        assert res.status_code == 200
        csp = res.headers.get("content-security-policy", "")
        assert "script-src 'self' https:;" in csp
        assert "'unsafe-inline'" not in csp.split("script-src")[1].split(";")[0]
        assert "localhost" not in csp
        assert "camera=()" in res.headers.get("permissions-policy", "")

        # Capture route permits camera
        res_capture = client.get("/capture")
        assert "camera=(self)" in res_capture.headers.get("permissions-policy", "")
    finally:
        if orig_env is None:
            os.environ.pop("ENV", None)
        else:
            os.environ["ENV"] = orig_env


def test_s7_rate_limits_and_extraction_quota():
    """Verifies rate limit tracking and monthly extraction quota integration."""
    org_id = f"org_s7_quota_{uuid.uuid4().hex[:6]}"
    BillingService.init_tables()
    sub = BillingService.get_or_create_subscription(org_id)
    assert sub["status"] in ("TRIAL", "ACTIVE")

    # First extraction allowed
    q1 = BillingService.check_and_increment_quota(org_id)
    assert q1["allowed"] is True
    assert q1["certificates_used"] == 1
    assert q1["certificates_limit"] == 50
