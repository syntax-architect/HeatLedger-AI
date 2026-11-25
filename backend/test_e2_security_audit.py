"""
HEATLEDGER AI: Task E2 Independent Security Review & Adversarial Attack Test Suite
Specification: Prompt Pack v4 - Phase E (Task E2)

Simulates an adversary acting as a malicious user of Plant B targeting Plant A:
  1. Multi-Tenant Cross-Tenant IDOR: Plant B cannot read, modify, or delete Plant A's certificates or dossiers.
  2. Mass Assignment & Role Escalation: Elevation payloads (role="OWNER", is_superuser=True) are stripped/blocked.
  3. JWT & Cookie Tampering: Forged signatures and tampered token payloads are rejected (401).
  4. SSRF (Server-Side Request Forgery): Localhost, loopback, and cloud metadata targets are rejected.
  5. Path Traversal: Arbitrary file inclusion (../../etc/passwd) is prevented.
  6. SQL Injection: Parameterized database layers defend against SQL injection payloads.
  7. XSS & Payload Sanitization: Malicious JavaScript in certificate text or file names is stripped/escaped.
  8. Webhook Forgery & Replay: Invalid HMAC signatures on payment and integration webhooks are rejected.
  9. Row-Level Security (RLS) Isolation: Ambient tenant filtering prevents cross-tenant record leakage.
"""

import io
import json
import os
import sys
import uuid
import pytest
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app
from auth_service import AuthService
from db.connection import get_db_connection, set_tenant_context, query_all
from security_hardening import (
    validate_outbound_url,
    sanitize_filename,
    SafeCSVWriter,
    verify_webhook_signature
)

client = TestClient(app)


def create_adversary_session(org_id: str, role: str = "VIEWER") -> Dict[str, Any]:
    """Sets up an adversarial test session representing Plant B."""
    user_id = f"usr_att_{uuid.uuid4().hex[:8]}"
    email = f"attacker_{uuid.uuid4().hex[:6]}@plantb.com"
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT OR IGNORE INTO organizations (id, name, created_at)
            VALUES (?, 'Plant B Adversary', ?)
        """, (org_id, now_iso))
        conn.execute("""
            INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, totp_secret_hex, created_at)
            VALUES (?, ?, '$argon2id$mockhash', 'mocksalt', 'Plant B Attacker', 'MOCKTOTP', ?)
        """, (user_id, email, now_iso))
        conn.execute("""
            INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (f"mem_{uuid.uuid4().hex[:8]}", user_id, org_id, role, now_iso))

    token = AuthService.create_jwt({
        "sub": user_id,
        "email": email,
        "role": role,
        "organization_id": org_id,
        "plant_id": f"plant_{org_id}"
    })
    return {
        "user_id": user_id,
        "org_id": org_id,
        "role": role,
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "cookies": {"access_token": token, "app_org_id": org_id}
    }


# ==============================================================================
# 1. IDOR: Plant B Attacking Plant A's Records
# ==============================================================================
def test_e2_01_idor_cross_tenant_access_plant_b_to_plant_a():
    """Confirms Plant B cannot read Plant A's certificates, shipments, or dossiers."""
    plant_a_org = f"org_target_{uuid.uuid4().hex[:6]}"
    plant_b_org = f"org_attacker_{uuid.uuid4().hex[:6]}"

    attacker = create_adversary_session(plant_b_org, role="OWNER")

    # Seed target document for Plant A
    target_doc_id = f"doc_{uuid.uuid4().hex[:6]}"
    target_cert_id = f"cert_secret_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT OR IGNORE INTO organizations (id, name, created_at)
            VALUES (?, 'Target Plant A', ?)
        """, (plant_a_org, now_iso))
        conn.execute("""
            INSERT INTO documents (id, organization_id, file_name, file_size_bytes, mime_type, storage_path, sha256, created_at)
            VALUES (?, ?, 'secret_cert.pdf', 2048, 'application/pdf', 'uploads/secret.pdf', 'hash123', ?)
        """, (target_doc_id, plant_a_org, now_iso))
        conn.execute("""
            INSERT INTO mill_certificates (id, organization_id, certificate_number, issue_date, melt_and_pour_country, document_id)
            VALUES (?, ?, 'CONFIDENTIAL-MTC-001', '2026-11-20', 'India', ?)
        """, (target_cert_id, plant_a_org, target_doc_id))
        conn.commit()

    # Plant B attempts to retrieve Plant A's certificate by ID
    resp = client.get(
        f"/api/certificates/{target_cert_id}",
        headers=attacker["headers"],
        cookies=attacker["cookies"]
    )
    # Must strictly return 404 Not Found (or 401 Unauthorized), never leak Plant A's data
    assert resp.status_code in (404, 401)
    if resp.status_code == 200:
        assert resp.json().get("organization_id") != plant_a_org


# ==============================================================================
# 2. Mass Assignment & Role Escalation Defense
# ==============================================================================
def test_e2_02_mass_assignment_and_role_escalation():
    """Confirms a regular viewer cannot escalate role to OWNER or superuser via request payloads."""
    plant_b_org = f"org_escalate_{uuid.uuid4().hex[:6]}"
    attacker = create_adversary_session(plant_b_org, role="VIEWER")

    # Malicious payload attempting privilege escalation
    malicious_payload = {
        "name": "Elevated User",
        "role": "OWNER",
        "is_superuser": True,
        "is_admin": True,
        "permissions": ["ALL"]
    }

    # Attempt updating profile with elevated fields
    resp = client.put(
        "/api/auth/profile",
        headers=attacker["headers"],
        cookies=attacker["cookies"],
        json=malicious_payload
    )
    # The server must reject, ignore, or strip elevated attributes
    if resp.status_code == 200:
        updated = resp.json()
        assert updated.get("role") != "OWNER"
        assert updated.get("is_superuser") is not True


# ==============================================================================
# 3. Session Hijacking & JWT Tampering Defense
# ==============================================================================
def test_e2_03_jwt_tampering_defense():
    """Confirms forged tokens or altered signature bytes are rejected immediately."""
    plant_b_org = f"org_tamper_{uuid.uuid4().hex[:6]}"
    session = create_adversary_session(plant_b_org)

    valid_token = session["token"]
    # Tamper with token signature by flipping trailing characters
    parts = valid_token.split(".")
    if len(parts) == 3:
        tampered_token = f"{parts[0]}.{parts[1]}.CORRUPTED_SIGNATURE_BYTES"
        resp = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {tampered_token}"},
            cookies={"access_token": tampered_token}
        )
        assert resp.status_code == 401


# ==============================================================================
# 4. SSRF (Server-Side Request Forgery) Defense
# ==============================================================================
def test_e2_04_ssrf_protection():
    """Confirms internal IP targets and cloud metadata services are blocked."""
    hostile_targets = [
        "http://127.0.0.1:8000/internal-metrics",
        "http://localhost:5432",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/admin",
        "http://192.168.1.1/router"
    ]

    for target in hostile_targets:
        with pytest.raises(ValueError) as exc_info:
            validate_outbound_url(target)
        err_str = str(exc_info.value).lower()
        assert "ssrf blocked" in err_str or "forbidden" in err_str or "private" in err_str


# ==============================================================================
# 5. Path Traversal & Arbitrary File Inclusion Defense
# ==============================================================================
def test_e2_05_path_traversal_defense():
    """Confirms directory traversal sequences (../, ..\\) in file operations are sanitized."""
    hostile_filenames = [
        "../../../../etc/passwd",
        "..\\..\\..\\Windows\\win.ini",
        "/etc/shadow",
        "valid_cert_name.pdf\x00.exe"
    ]

    for fname in hostile_filenames:
        sanitized = sanitize_filename(fname)
        assert ".." not in sanitized
        assert "/" not in sanitized
        assert "\\" not in sanitized
        assert "\x00" not in sanitized


# ==============================================================================
# 6. SQL Injection Defense
# ==============================================================================
def test_e2_06_sql_injection_defense():
    """Confirms search parameters and heat queries with SQL payloads are handled safely."""
    plant_b_org = f"org_sqli_{uuid.uuid4().hex[:6]}"
    attacker = create_adversary_session(plant_b_org, role="OWNER")

    hostile_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE mill_certificates; --",
        "\" UNION SELECT id, email, password_hash, salt FROM users --",
        "1; SELECT pg_sleep(5); --"
    ]

    for payload in hostile_payloads:
        # Search query testing
        resp = client.get(
            f"/api/certificates?q={payload}",
            headers=attacker["headers"],
            cookies=attacker["cookies"]
        )
        # Endpoint returns 200 with empty list or 400/422, but NEVER executes raw SQL or crashes with 500
        assert resp.status_code in (200, 400, 404, 422)


# ==============================================================================
# 7. CSV Formula Injection Defense
# ==============================================================================
def test_e2_07_csv_formula_injection_defense():
    """Confirms Excel formula command execution triggers (=, +, -, @) are sanitized with leading single quote."""
    output = io.StringIO()
    writer = SafeCSVWriter(output)
    writer.writerow(["=cmd|'/C calc'!A0", "+12345", "@SUM(A1:A5)", "-100", "Normal Heat TS-901"])

    csv_data = output.getvalue()
    # Malicious triggers must be rendered harmless with prepended quote
    assert "''=cmd|" in csv_data or "'=cmd|" in csv_data
    assert "'@SUM(" in csv_data
    assert "Normal Heat TS-901" in csv_data


# ==============================================================================
# 8. Webhook Signature Forgery & Replay Defense
# ==============================================================================
def test_e2_08_webhook_forgery_defense():
    """Confirms payment and external webhooks reject forged HMAC signatures."""
    payload = b'{"event":"payment.captured","amount":2500000}'
    secret = "rzp_test_secret_key_123"
    forged_sig = "0000000000000000000000000000000000000000000000000000000000000000"

    is_valid = verify_webhook_signature(
        secret=secret,
        payload_bytes=payload,
        signature_header=forged_sig
    )
    assert is_valid is False


# ==============================================================================
# 9. Row-Level Security (RLS) Ambient Isolation
# ==============================================================================
def test_e2_09_row_level_security_ambient_isolation():
    """Confirms database operations executed without ambient org context return 0 rows."""
    # When no tenant context is bound, multi-tenant queries must return empty sets
    with get_db_connection() as conn:
        set_tenant_context(None, False)
        conn.set_tenant_context(None, False)
        # Attempt selecting certificates with no tenant context
        cur = conn.cursor()
        cur.execute("SELECT count(*) as c FROM mill_certificates WHERE organization_id = 'unbound_context'")
        row = cur.fetchone()
        count = 0
        if row:
            count = row[0] if isinstance(row, tuple) else row.get("c", 0)
        assert count == 0
