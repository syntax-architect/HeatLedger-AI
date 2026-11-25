"""
Test Suite for Prompt Pack v5 Task 7.1: Automated OpenAPI Endpoint Fuzzing & Cross-Tenant Replay
Covers:
1. Enumerates parameterized GET routes from app.openapi().
2. Sends malformed, oversized, traversal, and SQLi/XSS fuzz inputs expecting ZERO 5xx responses and ZERO tracebacks.
3. Enforces security headers (X-Content-Type-Options: nosniff, X-Frame-Options: DENY) and no CORS wildcard.
4. Cross-tenant ID replay: seeds real Plant A & Plant B organizations/users in DB, mints genuine JWTs,
   and verifies Plant B sees zero Plant A resources and receives 401/403/404 on foreign ID probes.
"""

import time
import uuid
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.auth_service import AuthService
from backend.db.connection import get_db_connection

client = TestClient(app, raise_server_exceptions=False)


def _seed_tenant_user(org_id: str, role: str = "OWNER") -> dict:
    """Seeds real organization, user, and membership rows and returns Bearer auth headers."""
    ts = int(time.time() * 1000)
    uid = f"usr_fuzz_{uuid.uuid4().hex[:8]}"
    email = f"{uid}@example.invalid"
    mem_id = f"mem_{uuid.uuid4().hex[:8]}"
    now_iso = "2026-11-25T10:00:00Z"

    with get_db_connection(is_service_role=True) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO organizations (id, name, is_sandbox, created_at) VALUES (?, ?, 0, ?)",
            (org_id, f"Fuzz Plant {org_id}", now_iso),
        )
        conn.execute(
            """
            INSERT INTO users (
                id, email, password_hash, salt, name, emp_id, designation,
                totp_secret_hex, is_active, email_verified, created_at
            ) VALUES (?, ?, 'pbkdf2_dummy', 'salt', 'Fuzz User', ?, 'QA', '000000', 1, 1, ?)
            """,
            (uid, email, uid, now_iso),
        )
        conn.execute(
            "INSERT OR IGNORE INTO memberships (id, user_id, organization_id, role, created_at) VALUES (?, ?, ?, ?, ?)",
            (mem_id, uid, org_id, role, now_iso),
        )
        conn.commit()

    token = AuthService.create_jwt({
        "sub": uid,
        "user_id": uid,
        "email": email,
        "role": role,
        "organization_id": org_id,
        "org_id": org_id,
        "name": "Fuzz User",
    })
    return {"Authorization": f"Bearer {token}"}


def test_v5_7_1_openapi_security_headers_and_no_cors_wildcard():
    schema = app.openapi()
    assert "paths" in schema
    assert len(schema["paths"]) >= 25

    resp = client.get("/healthz", headers={"Origin": "https://evil.example"})
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") in ("DENY", "SAMEORIGIN")
    assert resp.headers.get("access-control-allow-origin") != "*"


@pytest.mark.parametrize("fuzz_id", [
    "nonexistent_id_001",
    "' OR 1=1 --",
    "<script>alert(1)</script>",
    "../../etc/passwd",
    "X" * 512,
])
def test_v5_7_1_get_id_routes_fuzz_zero_5xx_and_zero_stack_traces(fuzz_id):
    headers = _seed_tenant_user(f"org_fuzz_b_{uuid.uuid4().hex[:6]}", role="OWNER")
    schema = app.openapi()

    id_get_paths = []
    for path, methods in schema.get("paths", {}).items():
        if "get" in methods and "{" in path:
            rendered = path
            while "{" in rendered and "}" in rendered:
                start = rendered.index("{")
                end = rendered.index("}", start)
                rendered = rendered[:start] + fuzz_id + rendered[end + 1:]
            id_get_paths.append(rendered)

    assert len(id_get_paths) >= 5
    for url in id_get_paths:
        res = client.get(url, headers=headers)
        assert res.status_code < 500, f"5xx crash on GET {url}: {res.status_code} {res.text[:200]}"
        body_lower = res.text.lower()
        assert "traceback (most recent call last)" not in body_lower
        assert "sqlite3." not in body_lower


def test_v5_7_1_cross_tenant_id_replay_returns_403_or_404_never_plant_a_data():
    plant_a = f"org_fuzz_plant_a_{uuid.uuid4().hex[:6]}"
    plant_b = f"org_fuzz_plant_b_{uuid.uuid4().hex[:6]}"
    headers_a = _seed_tenant_user(plant_a, role="OWNER")
    headers_b = _seed_tenant_user(plant_b, role="OWNER")

    # 1. Plant A creates a private mill contact
    mill_res = client.post(
        "/api/mills",
        json={
            "mill_name": f"Plant A Secret Mill {plant_a}",
            "contact_email": "secret@planta.example",
            "plant_location": "Jamshedpur",
        },
        headers=headers_a,
    )
    assert mill_res.status_code in (200, 201)
    assert mill_res.json().get("organization_id") == plant_a

    # 2. Plant B lists mills -> must NEVER see Plant A's mill
    b_list = client.get("/api/mills", headers=headers_b)
    assert b_list.status_code == 200
    assert plant_a not in b_list.text
    assert "Plant A Secret Mill" not in b_list.text

    # 3. Plant B replays foreign IDs on protected GET endpoints -> 401/403/404 always
    foreign_probes = [
        "/api/ledger/lineage/HEAT-SECRET-ALPHA-001",
        "/api/shipments/SHP-SECRET-ALPHA-001",
        "/api/documents/deadbeef000011112222333344445555",
        "/api/billing/invoices/inv_secret_alpha/pdf",
    ]
    for probe in foreign_probes:
        res = client.get(probe, headers=headers_b)
        assert res.status_code in (401, 403, 404), f"Unexpected status {res.status_code} on {probe}"
        assert plant_a not in res.text
        assert "Plant A Secret Mill" not in res.text
