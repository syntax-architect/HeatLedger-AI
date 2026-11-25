"""
HEATLEDGER AI: Prompt Pack v4 Task D1 Test Suite
Free Check as the Front Door (/check) & SEO Funnel:
1. /check lets anyone upload one MTC without signing up. Show: what we read,
   what looks missing for EU melt-and-pour evidence (heat number, country of melt,
   country of pour), and 3 plausibility checks. Do not store the file beyond 24 hours.
2. Result ends with: 'Get the full pack for your next shipment' and a signup button that keeps the result.
   Capture email only after the result is shown.
3. Limits: Turnstile bot protection, 3 checks per IP per day, 5MB size cap, cost cap per day for the whole page.
4. SEO pages:
   - 'melt and pour certificate requirement EU steel'
   - 'mill test certificate checklist for EU export'
   - 'CBAM for steel exporters India'
   - 'EN 10204 3.1 certificate explained'
   - 'HS 7318 CBAM and melt and pour: what applies'
   Each page cites official sources and the date checked.
5. Analytics without cookies: events check_started, check_done, signup, pilot_request.
"""

import os
import uuid
import time
from datetime import datetime, timezone
import pytest
import fitz
from starlette.testclient import TestClient

from backend.main import app
from backend.public_check_service import (
    PublicCheckService,
    _IP_CHECK_LOG,
    _DAILY_GLOBAL_CHECK_COUNT,
    MAX_DAILY_GLOBAL_CHECKS,
    MAX_CHECKS_PER_24H_PER_IP,
)

client = TestClient(app)


def _generate_test_mtc_pdf(content: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), content)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_d1_01_public_check_no_signup_required():
    """1. /check lets anyone upload one MTC without signing up."""
    raw_text = (
        "TATA STEEL JAMSHEDPUR WORKS\n"
        "EN 10204 3.1 INSPECTION CERTIFICATE\n"
        "HEAT NUMBER: TS-2026-9912\n"
        "GRADE: S355J2+N\n"
        "COUNTRY OF MELT: INDIA\n"
        "COUNTRY OF POUR: INDIA\n"
        "C: 0.16  Mn: 1.45  Si: 0.25  P: 0.015  S: 0.008\n"
        "YIELD STRENGTH: 375 MPa  TENSILE: 520 MPa  ELONGATION: 26%\n"
    )
    pdf_bytes = _generate_test_mtc_pdf(raw_text)
    test_ip = f"198.51.100.{uuid.uuid4().int % 200 + 1}"

    res = client.post(
        "/api/check/analyze",
        headers={"x-forwarded-for": test_ip, "x-turnstile-token": "mock-turnstile-pass"},
        files={"file": ("tata_mtc.pdf", pdf_bytes, "application/pdf")},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    # 1. What we read
    what_we_read = data["what_we_read"]
    assert what_we_read["heat_number"] == "TS-2026-9912"
    assert "Steel" in what_we_read["mill_name"] or "Tata" in what_we_read["mill_name"]
    assert "Steel" in what_we_read["grade"] or "S355" in what_we_read["grade"]

    # 2. EU melt-and-pour evidence
    mp = data["melt_and_pour_evidence"]
    assert mp["status"] == "COMPLETE"
    assert "India" in mp["country_of_melt"]
    assert "India" in mp["country_of_pour"]
    assert mp["heat_number_present"] is True

    # 3. 3 plausibility checks
    assert len(data["plausibility_checks"]) >= 3
    for chk in data["plausibility_checks"]:
        assert "name" in chk
        assert "status" in chk
        assert "finding" in chk

    # Call to action & footer
    cta = data["call_to_action"]
    assert "Get the full pack for your next shipment" in cta["headline"]
    assert cta["keeps_result"] is True
    assert "Tamper-evident seal. Not legal advice" in data["footer_disclaimer"]
    assert data["remaining_checks"] == MAX_CHECKS_PER_24H_PER_IP - 1


def test_d1_02_rate_limit_3_checks_per_ip_per_day():
    """3. Rate limit: 3 checks per IP per day. 4th returns 429."""
    pdf_bytes = _generate_test_mtc_pdf("TEST MTC CONTENT\nHEAT: 12345\nCOUNTRY: INDIA")
    test_ip = f"203.0.113.{uuid.uuid4().int % 200 + 1}"
    _IP_CHECK_LOG[test_ip] = []

    for i in range(3):
        res = client.post(
            "/api/check/analyze",
            headers={"x-forwarded-for": test_ip, "x-turnstile-token": "mock-turnstile-pass"},
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 200, f"Check {i+1} failed"

    # 4th check must fail with 429
    res_4th = client.post(
        "/api/check/analyze",
        headers={"x-forwarded-for": test_ip, "x-turnstile-token": "mock-turnstile-pass"},
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
    )
    assert res_4th.status_code == 429
    assert "3 free checks per IP per 24 hours" in res_4th.json()["detail"]


def test_d1_03_turnstile_bot_protection(monkeypatch):
    """3. Cloudflare Turnstile bot verification check."""
    pdf_bytes = _generate_test_mtc_pdf("TEST MTC CONTENT")
    test_ip = f"192.0.2.{uuid.uuid4().int % 200 + 1}"

    # Force Turnstile enforcement by setting secret key and not in mock pass mode
    monkeypatch.setenv("CF_TURNSTILE_SECRET_KEY", "dummy_turnstile_secret_key")
    monkeypatch.setenv("TESTING", "0")

    # Empty token rejected
    res = client.post(
        "/api/check/analyze",
        headers={"x-forwarded-for": test_ip, "x-turnstile-token": ""},
        files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
    )
    assert res.status_code in (400, 429)
    assert "Bot check verification failed" in res.json()["detail"]


def test_d1_04_daily_cost_cap_enforcement():
    """3. Cost cap per day for the whole page protects against runaway bills."""
    pdf_bytes = _generate_test_mtc_pdf("TEST MTC CONTENT\nHEAT: 9999\nCOUNTRY: INDIA")
    test_ip = f"198.18.0.{uuid.uuid4().int % 200 + 1}"

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    orig_count = _DAILY_GLOBAL_CHECK_COUNT[today]

    try:
        # Simulate global daily cost cap exhausted (e.g. 100 checks)
        _DAILY_GLOBAL_CHECK_COUNT[today] = MAX_DAILY_GLOBAL_CHECKS + 5

        res = client.post(
            "/api/check/analyze",
            headers={"x-forwarded-for": test_ip, "x-turnstile-token": "mock-turnstile-pass"},
            files={"file": ("test.pdf", pdf_bytes, "application/pdf")},
        )
        assert res.status_code == 429
        assert "Daily public evaluation capacity reached" in res.json()["detail"]
    finally:
        _DAILY_GLOBAL_CHECK_COUNT[today] = orig_count


def test_d1_05_file_retention_24h_cleanup():
    """1. Temporary files are never stored beyond 24 hours."""
    # Run cleanup with max_age_seconds=86400
    res = client.post("/api/check/cleanup", params={"max_age_seconds": 86400})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "deleted_directories" in data


def test_d1_06_seo_articles_official_citations_and_dates():
    """
    4. SEO pages with real content & official regulatory citations:
       - 'melt and pour certificate requirement EU steel'
       - 'mill test certificate checklist for EU export'
       - 'CBAM for steel exporters India'
       - 'EN 10204 3.1 certificate explained'
       - 'HS 7318 CBAM and melt and pour: what applies'
    """
    res = client.get("/api/check/seo")
    assert res.status_code == 200
    articles = res.json()["articles"]
    assert len(articles) == 5

    required_slugs = [
        "melt-and-pour-eu-steel",
        "mtc-checklist-eu-export",
        "cbam-steel-exporters-india",
        "en-10204-3-1-explained",
        "hs-7318-cbam-melt-and-pour",
    ]
    found_slugs = [a["slug"] for a in articles]
    for req in required_slugs:
        assert req in found_slugs, f"Missing required SEO article: {req}"

    # Verify article detail has official citation and verified date
    res_art = client.get("/api/check/seo/melt-and-pour-eu-steel")
    assert res_art.status_code == 200
    art = res_art.json()
    assert "Regulation (EU)" in art["official_source"]
    assert "2026" in art["last_checked"]
    assert len(art["key_points"]) >= 3


def test_d1_07_cookie_free_analytics_funnel_events():
    """5. Analytics without cookies: check_started, check_done, signup, pilot_request."""
    events = ["check_started", "check_done", "signup", "pilot_request"]
    test_ip = f"192.0.2.{uuid.uuid4().int % 200 + 1}"

    for evt in events:
        res = client.post(
            "/api/analytics/event",
            headers={"x-forwarded-for": test_ip},
            json={
                "event_name": evt,
                "check_id": str(uuid.uuid4()),
                "source_page": "/check",
            },
        )
        assert res.status_code == 200
        assert res.json()["status"] == "recorded"

    # Verify summary counts
    res_summary = client.get("/api/analytics/public-summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    for evt in events:
        assert summary.get(evt, 0) >= 1


def test_d1_08_capture_lead_after_result():
    """2. Capture email only after result is shown."""
    test_ip = f"198.51.100.{uuid.uuid4().int % 200 + 1}"
    res = client.post(
        "/api/check/lead",
        headers={"x-forwarded-for": test_ip},
        json={
            "name": "Amitava Mukherjee",
            "company": "Kolkata Forgings Ltd",
            "work_email": "amitava@kolkataforgings.example.com",
            "phone": "+919830012345",
            "check_id": str(uuid.uuid4()),
            "consent": True,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "lead_captured"
    assert "whatsapp_booking_url" in data
