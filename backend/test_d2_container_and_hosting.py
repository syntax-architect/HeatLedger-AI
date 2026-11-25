"""
HEATLEDGER AI: Prompt D2 Test Suite
Production Container, Hosting & Cloudflare Deployment:
- /healthz process liveness probe
- /readyz deep database readiness probe
- 10-minute short-lived HMAC signed document URLs
- Secure cron task execution endpoint (/api/cron/tick)
- Multi-stage Dockerfile verification (non-root appuser, gunicorn 2 workers, no compilers)
- Cloudflare Pages _headers & _redirects configuration verification
- Clean local docker-compose configuration
"""

import os
import re
import time
from fastapi.testclient import TestClient

from main import app
from document_service import DocumentService

client = TestClient(app)


def test_d2_1_liveness_probe_healthz():
    """
    D2 Deliverable 1: /healthz process liveness probe returns HTTP 200 immediately.
    """
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "alive"
    assert "timestamp" in data


def test_d2_2_readiness_probe_readyz():
    """
    D2 Deliverable 2: /readyz readiness probe verifies database connection.
    """
    res = client.get("/readyz")
    assert res.status_code == 200
    data = res.json()
    assert data["database"] == "CONNECTED"
    assert data["status"] in ["HEALTHY", "DEGRADED"]


def test_d2_3_signed_url_10_minute_expiration():
    """
    D2 Deliverable 3: Document signed URLs default to 10-minute (600s) expiration window.
    """
    now = int(time.time())
    url = DocumentService.generate_signed_url("mock_doc_99", action="download")

    # Parse expires query parameter
    m = re.search(r"expires=(\d+)", url)
    assert m is not None
    expires_at = int(m.group(1))

    # Delta should be approximately 600 seconds (allowing 5s test execution window)
    delta = expires_at - now
    assert 595 <= delta <= 605


def test_d2_4_cron_endpoint_security(monkeypatch):
    """
    D2 Deliverable 4: Scheduled tasks endpoint /api/cron/tick requires secret.
    """
    monkeypatch.setenv("CRON_SECRET", "super_secret_cron_token_123")

    # 1. Reject without secret
    res_unauth = client.post("/api/cron/tick")
    assert res_unauth.status_code == 401

    # 2. Reject with wrong secret
    res_bad = client.post("/api/cron/tick", headers={"X-Cron-Secret": "wrong_secret"})
    assert res_bad.status_code == 401

    # 3. Accept with correct secret
    res_ok = client.post("/api/cron/tick", headers={"X-Cron-Secret": "super_secret_cron_token_123"})
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "SUCCESS"


def test_d2_5_dockerfile_multi_stage_and_security():
    """
    D2 Deliverable 5: Dockerfile must be multi-stage, use python:3.12-slim,
    switch to non-root user 'appuser', use gunicorn with 2 uvicorn workers,
    and include HEALTHCHECK on /healthz.
    """
    dockerfile_path = os.path.join(os.path.dirname(__file__), "..", "Dockerfile")
    assert os.path.exists(dockerfile_path)

    with open(dockerfile_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "FROM python:3.12-slim AS builder" in content
    assert "FROM python:3.12-slim AS runner" in content
    assert "USER appuser" in content
    assert "HEALTHCHECK" in content and "/healthz" in content
    assert "gunicorn" in content
    assert "uvicorn.workers.UvicornWorker" in content


def test_d2_6_cloudflare_pages_config():
    """
    D2 Deliverable 6: Cloudflare Pages configuration includes SPA fallback,
    apex redirect, immutable asset cache headers, and strict security headers.
    """
    headers_path = os.path.join(os.path.dirname(__file__), "..", "public", "_headers")
    redirects_path = os.path.join(os.path.dirname(__file__), "..", "public", "_redirects")

    assert os.path.exists(headers_path)
    assert os.path.exists(redirects_path)

    with open(headers_path, "r", encoding="utf-8") as f:
        headers_content = f.read()
    assert "X-Frame-Options: DENY" in headers_content
    assert "max-age=31536000, immutable" in headers_content

    with open(redirects_path, "r", encoding="utf-8") as f:
        redirects_content = f.read()
    assert "/* /index.html 200" in redirects_content
    assert "www.heatledger.ai" in redirects_content


def test_d2_7_docker_compose_local_stack():
    """
    D2 Deliverable 7: docker-compose.yml configures local api, postgres db, and mailhog,
    without running a Vite dev server in Docker.
    """
    compose_path = os.path.join(os.path.dirname(__file__), "..", "docker-compose.yml")
    assert os.path.exists(compose_path)

    with open(compose_path, "r", encoding="utf-8") as f:
        compose_content = f.read()

    assert "postgres:16-alpine" in compose_content
    assert "mailhog" in compose_content
    assert "node:" not in compose_content  # Vite server removed from docker-compose
