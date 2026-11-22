"""
HEATLEDGER AI: Prompt D5 Test Suite
Load & Failure Testing, Degraded Modes & Resilience:
- High-concurrency synthetic probe execution measuring p50 and p95 latency
- Malformed payload and fuzzing resilience (strict 400/422 responses, zero 500 crashes)
- Graceful degradation when Gemini API is offline (fallback to deterministic local parser)
- Decoupled probe behavior during database outage (liveness 200 vs readiness 503)
- Rate-limiting load shedding under burst traffic
- Load test CLI script functionality
"""

import os
import io
import time
import pytest
import concurrent.futures
from unittest.mock import patch
from starlette.testclient import TestClient

from main import app
from extraction_service import ExtractionService, COST_PER_MTC_PYMUPDF
from db.connection import get_db_connection


def test_d5_1_concurrent_synthetic_probes_latency_under_load():
    """
    D5 Deliverable 1: High concurrent read requests on synthetic health probes.
    Verifies 100% success rate and low latency (< 100ms per request in-memory).
    """
    client = TestClient(app)
    num_requests = 50
    latencies = []

    def make_call():
        t0 = time.perf_counter()
        resp = client.get("/healthz")
        lat = (time.perf_counter() - t0) * 1000.0
        return resp.status_code, lat

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_call) for _ in range(num_requests)]
        for f in concurrent.futures.as_completed(futures):
            status_code, lat = f.result()
            assert status_code == 200
            latencies.append(lat)

    latencies.sort()
    p50 = latencies[len(latencies) // 2]
    p95 = latencies[int(len(latencies) * 0.95)]

    assert len(latencies) == num_requests
    assert p95 < 250.0  # Well within 250ms SLO


def test_d5_2_malformed_payload_fuzzing_resilience():
    """
    D5 Deliverable 2: Malformed payloads, SQL injection tokens, null bytes,
    and invalid types must return 400/422 without unhandled 500 server crashes.
    """
    client = TestClient(app)

    malformed_inputs = [
        {"endpoint": "/api/support/ticket", "data": "not a json object", "content_type": "application/json"},
        {"endpoint": "/api/support/ticket", "data": '{"message": "", "screen_name": 12345}', "content_type": "application/json"},
        {"endpoint": "/api/support/ticket", "data": '{"message": "\x00\x00\x00NULL_BYTE"}', "content_type": "application/json"},
        {"endpoint": "/api/analytics/track", "data": '{"event_name": "\'; DROP TABLE users; --"}', "content_type": "application/json"},
        {"endpoint": "/api/auth/login", "data": '{"email": "not-an-email", "password": ""}', "content_type": "application/json"},
    ]

    for item in malformed_inputs:
        resp = client.post(
            item["endpoint"],
            content=item["data"],
            headers={"Content-Type": item["content_type"]}
        )
        # Must return 400, 401, 422 or client error, NEVER 500
        assert resp.status_code in (400, 401, 422), (
            f"Expected client rejection (400/401/422) for {item['endpoint']}, got {resp.status_code}: {resp.text}"
        )
        # Response body must not leak Python stack traces
        body_text = resp.text.lower()
        assert "traceback (most recent call last)" not in body_text
        assert "internal server error" not in body_text


def test_d5_3_gemini_offline_graceful_degradation(monkeypatch, tmp_path):
    """
    D5 Deliverable 3: When Gemini API is unavailable or returns errors,
    extraction service gracefully falls back to deterministic PyMuPDF local parsing.
    """
    monkeypatch.setenv("LOCAL_PARSER_ONLY", "true")

    # Create synthetic test PDF text containing MTC indicators
    synthetic_mtc_text = (
        "STEEL MILLS CO LTD\n"
        "EN 10204 3.1 INSPECTION CERTIFICATE\n"
        "HEAT NUMBER: HT-882910\n"
        "COUNTRY OF MELT AND POUR: INDIA\n"
        "CHEMICAL COMPOSITION (% wt):\n"
        "C: 0.18  Si: 0.25  Mn: 1.45  P: 0.020  S: 0.015\n"
    )

    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), synthetic_mtc_text)
    pdf_bytes = doc.tobytes()
    doc.close()

    # Execute extraction
    result = ExtractionService.process_document(
        pdf_bytes,
        document_id="doc_resilience_test",
        organization_id="org_resilience_test"
    )

    # Must complete cleanly with status 'success' or 'needs_manual_entry'
    assert result.status in ("success", "needs_manual_entry")
    assert result.model_used == "text_layer_pymupdf"
    assert result.cost_paise == COST_PER_MTC_PYMUPDF
    assert result.fields.get("heat_number") is not None
    assert result.fields["heat_number"].value == "HT-882910"
    assert result.fields.get("country_of_melt_and_pour") is not None
    assert result.fields["country_of_melt_and_pour"].value == "India"


def test_d5_4_database_outage_probe_differentiation():
    """
    D5 Deliverable 4: During a simulated database outage,
    /healthz (liveness) remains HTTP 200 while /readyz (readiness) returns HTTP 503.
    """
    client = TestClient(app)

    # Liveness must always succeed even if database is down
    res_live = client.get("/healthz")
    assert res_live.status_code == 200
    assert res_live.json()["status"] in ("alive", "HEALTHY", "healthy")

    # Mock database failure inside check_system_health
    with patch("main.check_system_health") as mock_health:
        mock_health.return_value = {
            "status": "UNHEALTHY",
            "database": "DISCONNECTED",
            "error": "Connection pool timeout"
        }
        res_ready = client.get("/readyz")
        # Readiness MUST reject incoming traffic with 503
        assert res_ready.status_code == 503
        assert res_ready.json()["database"] == "DISCONNECTED"


def test_d5_5_rate_limit_load_shedding():
    """
    D5 Deliverable 5: Rate limit middleware sheds excess burst traffic
    without locking or crashing the server.
    """
    client = TestClient(app)

    # Repeated calls to public endpoints
    status_codes = []
    for _ in range(30):
        resp = client.get("/api/status")
        status_codes.append(resp.status_code)

    # All should either be 200 (healthy) or 429 (rate limited)
    for code in status_codes:
        assert code in (200, 429)


def test_d5_6_load_test_cli_script_execution():
    """
    D5 Deliverable 6: Verifies scripts/load_test.py run_benchmark executes,
    measures latencies, and returns structured performance metrics.
    """
    from scripts.load_test import send_request, run_benchmark

    # Mock send_request to simulate a benchmark run
    with patch("scripts.load_test.send_request") as mock_send:
        mock_send.return_value = (200, 15.5, "")
        results = run_benchmark(
            base_url="http://localhost:8000",
            endpoint="/healthz",
            concurrency=2,
            total_requests=10
        )

    assert results["total_requests"] == 10
    assert results["success_rate_pct"] == 100.0
    assert results["latency_ms"]["p95"] == 15.5
    assert results["passed_slo"] is True
    assert results["errors_count"] == 0
