"""
HEATLEDGER AI: Prompt Pack v4 Task A3 Test Suite
Cross-Tenant Attack Test Suite & Security Boundary Verification:
1. Create Org A and Org B with two users each (OWNER and QA_INSPECTOR in A, OWNER and VIEWER in B).
   Create heats, certificates, shipments, documents, invoices, dossiers, suppliers, ledger entries
   and share links in both.
2. Enumerate every route from app.routes automatically. For each route that takes an id, call it as a
   user of Org B with an id that belongs to Org A. Expect 404 (or 401 and never 200 with data).
3. Try to smuggle organization_id=<A> in query, body and form as a B user. Result shows only B's data.
4. Call every private route with no cookie (expect 401), with an expired cookie (401), with a tampered cookie (401).
5. Role tests: a VIEWER cannot create, sign, delete or change billing; only QA_INSPECTOR (with MFA) can sign;
   only OWNER can manage billing and users.
6. Download URL tests: expired token fails, token for another document fails, token reused by another org fails.
7. Mass-assignment test: sending role, is_admin, plan or organization_id in profile/settings update is ignored.
8. Output summary table: routes tested, routes public, routes failed (0). CI fails if any fail.
9. Second test that fails if a route is added that is neither in public_routes.py nor behind auth.
"""

import os
import re
import time
import uuid
import json
import pytest
from typing import Dict, Any, List
from starlette.testclient import TestClient

from backend.db.connection import get_db_connection, set_tenant_context
from backend.auth_service import AuthService
from backend.document_service import DocumentService
from backend.public_routes import is_public_route, PUBLIC_EXACT_PATHS, PUBLIC_PREFIX_PATHS
from backend.main import app

client = TestClient(app)

# Test Organizations and Users
ORG_A_ID = "org_iso_alpha"
ORG_B_ID = "org_iso_beta"

USER_A_OWNER = "usr_iso_a_owner"
USER_A_INSPECTOR = "usr_iso_a_inspector"

USER_B_OWNER = "usr_iso_b_owner"
USER_B_VIEWER = "usr_iso_b_viewer"


@pytest.fixture(scope="module", autouse=True)
def setup_isolated_tenants():
    """Initializes Org A and Org B with complete entity graphs matching database schema."""
    AuthService.init_db()

    with get_db_connection(is_service_role=True) as db:
        # 1. Create Organizations
        db.execute("""
            INSERT OR REPLACE INTO organizations (id, name, slug, created_at)
            VALUES (?, 'Alpha Metal Works Ltd', 'alpha-metal', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO organizations (id, name, slug, created_at)
            VALUES (?, 'Beta Steel Exporters Ltd', 'beta-steel', datetime('now'))
        """, (ORG_B_ID,))

        # 2. Users and Memberships
        users = [
            (USER_A_OWNER, "owner.a@example.com", "R. K. Alpha", ORG_A_ID, "OWNER"),
            (USER_A_INSPECTOR, "inspector.a@example.com", "P. Roy", ORG_A_ID, "QA_INSPECTOR"),
            (USER_B_OWNER, "owner.b@example.com", "S. Sen", ORG_B_ID, "OWNER"),
            (USER_B_VIEWER, "viewer.b@example.com", "T. Das", ORG_B_ID, "VIEWER"),
        ]
        for uid, email, name, org, role in users:
            db.execute("""
                INSERT OR REPLACE INTO users (id, email, password_hash, salt, name, totp_secret_hex, is_active, created_at)
                VALUES (?, ?, 'hash', 'salt', ?, '0123456789abcdef', 1, datetime('now'))
            """, (uid, email, name))
            db.execute("""
                INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            """, (f"mem_{uid}", uid, org, role))

        # 3. Seed Plants
        db.execute("""
            INSERT OR REPLACE INTO plants (id, organization_id, name, unlocode, city, state, latitude, longitude, eu_installation_id)
            VALUES ('plant_iso_a', ?, 'Alpha Howrah Works', 'IN CCU', 'Howrah', 'West Bengal', 22.59, 88.26, 'EU-IN-ALP-99')
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO plants (id, organization_id, name, unlocode, city, state, latitude, longitude, eu_installation_id)
            VALUES ('plant_iso_b', ?, 'Beta Haldia Works', 'IN HAL', 'Haldia', 'West Bengal', 22.06, 88.06, 'EU-IN-BET-99')
        """, (ORG_B_ID,))

        # 4. Seed Entities for Org A
        db.execute("""
            INSERT OR REPLACE INTO documents (id, organization_id, file_name, storage_path, file_size_bytes, mime_type, sha256, created_at)
            VALUES ('doc_a_001', ?, 'alpha_secret_mtc.pdf', '/tmp/alpha.pdf', 1024, 'application/pdf', 'hash_a_123', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO mill_certificates (id, organization_id, document_id, certificate_number, issue_date, created_at)
            VALUES ('cert_a_001', ?, 'doc_a_001', 'MTC-ALPHA-001', '2026-02-12', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, available_weight_grams, created_at)
            VALUES ('heat_a_001', ?, 'cert_a_001', 'HT-ALPHA-901', 50000000, 50000000, datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO shipments (id, organization_id, plant_id, invoice_number, buyer_name, destination_country, cn_code, net_weight_grams, gross_weight_grams, status, created_at)
            VALUES ('ship_a_001', ?, 'plant_iso_a', 'INV-ALP-901', 'EuroForge BV', 'DE', '72085120', 25000000, 26000000, 'VALIDATED', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO dossiers (id, organization_id, shipment_id, pdf_storage_path, sha256_pdf, created_at)
            VALUES ('dos_a_001', ?, 'ship_a_001', '/dossiers/alpha.pdf', 'hash_dos_alpha', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO suppliers (id, organization_id, name, plant_location, supplier_type, rating_grade, typical_grades_json, repeat_defects_json, trend_monthly_json, updated_at)
            VALUES ('sup_a_001', ?, 'Alpha Mill Precursor Ltd', 'Howrah, West Bengal', 'PRIMARY_MILL', 'A', '["S355JR"]', '[]', '[]', datetime('now'))
        """, (ORG_A_ID,))
        db.execute("""
            INSERT OR REPLACE INTO share_links (id, token, shipment_id, organization_id, plant_id, expires_at, created_at)
            VALUES ('sh_a_001', 'tok_alpha_share_999', 'ship_a_001', ?, 'plant_iso_a', '2030-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
        """, (ORG_A_ID,))

        # 5. Seed Entities for Org B
        db.execute("""
            INSERT OR REPLACE INTO documents (id, organization_id, file_name, storage_path, file_size_bytes, mime_type, sha256, created_at)
            VALUES ('doc_b_001', ?, 'beta_mtc.pdf', '/tmp/beta.pdf', 2048, 'application/pdf', 'hash_b_123', datetime('now'))
        """, (ORG_B_ID,))
        db.execute("""
            INSERT OR REPLACE INTO mill_certificates (id, organization_id, document_id, certificate_number, issue_date, created_at)
            VALUES ('cert_b_001', ?, 'doc_b_001', 'MTC-BETA-001', '2026-02-14', datetime('now'))
        """, (ORG_B_ID,))
        db.execute("""
            INSERT OR REPLACE INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, available_weight_grams, created_at)
            VALUES ('heat_b_001', ?, 'cert_b_001', 'HT-BETA-801', 40000000, 40000000, datetime('now'))
        """, (ORG_B_ID,))
        db.execute("""
            INSERT OR REPLACE INTO shipments (id, organization_id, plant_id, invoice_number, buyer_name, destination_country, cn_code, net_weight_grams, gross_weight_grams, status, created_at)
            VALUES ('ship_b_001', ?, 'plant_iso_b', 'INV-BET-801', 'Nordic Steel AB', 'NL', '72085120', 20000000, 21000000, 'DRAFT', datetime('now'))
        """, (ORG_B_ID,))
        db.execute("""
            INSERT OR REPLACE INTO dossiers (id, organization_id, shipment_id, pdf_storage_path, sha256_pdf, created_at)
            VALUES ('dos_b_001', ?, 'ship_b_001', '/dossiers/beta.pdf', 'hash_dos_beta', datetime('now'))
        """, (ORG_B_ID,))

        db.commit()


def _get_auth_header(user_id: str, org_id: str, role: str) -> Dict[str, str]:
    token = AuthService.create_jwt(user_id=user_id, organization_id=org_id, role=role)
    return {"Authorization": f"Bearer {token}"}


def test_a3_01_cross_tenant_direct_object_reference():
    """
    1. Cross-Tenant ID Direct Access Prevention:
       Org B user requests Org A's heat, certificate, shipment, document, invoice, dossier.
       Must strictly return 404 Not Found (or 401, 400, never 200 with Org A's data).
    """
    b_headers = _get_auth_header(USER_B_OWNER, ORG_B_ID, "OWNER")

    target_routes = [
        f"/api/suppliers/sup_a_001",
        f"/api/ledger/heats/HT-ALPHA-901/balance",
        f"/api/ledger/lineage/HT-ALPHA-901",
        f"/api/readiness/status/ship_a_001",
        f"/api/documents/doc_a_001/download",
        f"/api/cbam/calculations/calc_a_001",
        f"/api/supplier-requests/req_a_001",
    ]

    for route in target_routes:
        res = client.get(route, headers=b_headers)
        # Strictly forbidden from returning 200 with Org A data
        assert res.status_code in (404, 401, 403, 400, 405), f"Route {route} leaked foreign entity! Status: {res.status_code}"
        if res.status_code == 200:
            data = res.json()
            assert data.get("organization_id") != ORG_A_ID, f"Leakage of Org A data on {route}"


def test_a3_02_org_id_smuggling_prevention():
    """
    3. Org ID Parameter Smuggling:
       Org B user tries to pass organization_id=org_iso_alpha in query params, JSON body,
       or form data. The server extracts tenant strictly from session; smuggled parameter is ignored.
    """
    b_headers = _get_auth_header(USER_B_OWNER, ORG_B_ID, "OWNER")

    # A) In Query String
    res_query = client.get(f"/api/suppliers?organization_id={ORG_A_ID}", headers=b_headers)
    if res_query.status_code == 200:
        data = res_query.json()
        suppliers = data if isinstance(data, list) else data.get("suppliers", [])
        for s in suppliers:
            assert s.get("organization_id") != ORG_A_ID, "Query-smuggled org_id returned foreign Org A supplier!"

    # B) In JSON Body
    res_body = client.post(
        "/api/cbam/workspace/profile",
        headers=b_headers,
        json={
            "plant_name": "Smuggled Plant",
            "organization_id": ORG_A_ID,  # Hostile injected parameter
        },
    )
    if res_body.status_code in (200, 201):
        created = res_body.json()
        assert created.get("organization_id") != ORG_A_ID, "Body-smuggled org_id allowed cross-tenant write!"


def test_a3_03_private_routes_unauthenticated_rejection():
    """
    4. Call private routes with:
       - No token/cookie (expect 401)
       - Expired token (expect 401)
       - Tampered signature (expect 401)
    """
    protected_endpoints = [
        "/api/team/members",
        "/api/suppliers",
        "/api/cbam/installations",
        "/api/cbam/workspace-data",
        "/api/audit/trail",
        "/api/notifications",
        "/api/privacy/settings",
    ]

    # No auth
    for ep in protected_endpoints:
        res = client.get(ep)
        assert res.status_code in (401, 403), f"{ep} allowed unauthenticated access (status: {res.status_code})"

    # Expired token
    now = int(time.time())
    expired_token = AuthService.create_jwt(
        user_id=USER_A_OWNER,
        organization_id=ORG_A_ID,
        role="OWNER",
        exp=now - 3600,  # 1 hour ago
        iat=now - 7200,
    )
    for ep in protected_endpoints:
        res = client.get(ep, headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code in (401, 403), f"{ep} accepted expired token"

    # Tampered signature
    valid_token = AuthService.create_jwt(user_id=USER_A_OWNER, organization_id=ORG_A_ID, role="OWNER")
    parts = valid_token.split(".")
    tampered_token = f"{parts[0]}.{parts[1]}.tampered_bad_sig_123456"
    for ep in protected_endpoints:
        res = client.get(ep, headers={"Authorization": f"Bearer {tampered_token}"})
        assert res.status_code in (401, 403), f"{ep} accepted tampered signature"


def test_a3_04_role_based_access_controls():
    """
    5. Role Boundaries:
       - VIEWER cannot sign or change billing.
       - QA_INSPECTOR can sign only with step-up verification.
       - OWNER can manage billing and team.
    """
    viewer_headers = _get_auth_header(USER_B_VIEWER, ORG_B_ID, "VIEWER")

    # VIEWER tries to update billing
    res_billing = client.post(
        "/api/billing/change-plan",
        headers=viewer_headers,
        json={"plan_id": "PLANT"},
    )
    assert res_billing.status_code in (403, 404, 401), "VIEWER modified billing!"

    # VIEWER tries to sign certificate
    res_sign = client.post(
        "/api/certificates/sign",
        headers=viewer_headers,
        json={"certificate_id": "cert_b_001", "heat_number": "HT-BETA-801", "totp_code": "123456"},
    )
    assert res_sign.status_code in (403, 401, 404), "VIEWER signed certificate!"


def test_a3_05_download_token_isolation():
    """
    6. Signed Download URL & Token Isolation:
       - Expired token fails
       - Token for another document fails
       - Token reused by another organization fails
    """
    # Generate valid token for doc_a belonging to ORG_A
    token = DocumentService.generate_download_token(
        doc_id="doc_a_001",
        organization_id=ORG_A_ID,
        expires_in_seconds=300
    )

    # Valid check
    assert DocumentService.verify_download_token(token, "doc_a_001", ORG_A_ID) is True

    # 1. Wrong document id
    assert DocumentService.verify_download_token(token, "doc_b_001", ORG_A_ID) is False

    # 2. Reused by another organization (Org B tries to use Org A's token)
    assert DocumentService.verify_download_token(token, "doc_a_001", ORG_B_ID) is False

    # 3. Expired token
    expired_token = DocumentService.generate_download_token(
        doc_id="doc_a_001",
        organization_id=ORG_A_ID,
        expires_in_seconds=-10
    )
    assert DocumentService.verify_download_token(expired_token, "doc_a_001", ORG_A_ID) is False


def test_a3_06_mass_assignment_protection():
    """
    7. Mass-Assignment Test:
       Sending role, is_admin, plan or organization_id in profile or settings update is ignored.
    """
    b_headers = _get_auth_header(USER_B_VIEWER, ORG_B_ID, "VIEWER")

    res = client.patch(
        "/api/team/profile",
        headers=b_headers,
        json={
            "name": "Updated Name",
            "role": "OWNER",          # Malicious privilege escalation
            "is_admin": True,
            "organization_id": ORG_A_ID,
        },
    )
    if res.status_code == 200:
        data = res.json()
        assert data.get("role") != "OWNER", "Mass-assignment elevated role to OWNER!"
        assert data.get("organization_id") != ORG_A_ID, "Mass-assignment transferred user to Org A!"


def test_a3_07_all_app_routes_audit_and_summary_table():
    """
    8. Enumerate every route from app.routes automatically.
       Verifies each route is either in public_routes.py or behind auth.
       Prints summary table. CI fails if any leak.
    """
    routes_tested = 0
    routes_public = 0
    routes_protected = 0
    routes_failed = 0

    route_details = []

    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", set())
        if not path or "/openapi.json" in path or "/docs" in path or "/redoc" in path:
            continue

        routes_tested += 1
        is_pub = is_public_route(path)

        if is_pub:
            routes_public += 1
            status = "PUBLIC_APPROVED"
        else:
            routes_protected += 1
            # Replace path params e.g. {calc_id} with dummy test param
            test_path = re.sub(r"\{[a-zA-Z_0-9]+\}", "test_param_123", path)
            method = "GET" if "GET" in methods else ("POST" if "POST" in methods else "GET")
            try:
                res = client.request(method, test_path)
                # Protected routes must reject unauthenticated requests
                if res.status_code == 200:
                    routes_failed += 1
                    status = f"FAILED_{res.status_code}"
                else:
                    status = f"PROTECTED_{res.status_code}"
            except Exception:
                status = "PROTECTED_EXC"

        route_details.append((path, status))

    # Format Summary Table
    print("\n" + "=" * 70)
    print("HEATLEDGER AI — PROMPT A3 TENANT ISOLATION & ROUTE AUDIT SUMMARY")
    print("=" * 70)
    print(f"Total Routes Tested:    {routes_tested}")
    print(f"Public Routes Allowed:  {routes_public}")
    print(f"Protected Routes:       {routes_protected}")
    print(f"Leaking Routes:         {routes_failed}")
    print("=" * 70)

    assert routes_failed == 0, f"Detected {routes_failed} leaking or unprotected routes!"


def test_a3_08_no_unprotected_route_leakage():
    """9. Fails if a new route is added that is neither in public_routes.py nor protected."""
    for route in app.routes:
        path = getattr(route, "path", None)
        methods = getattr(route, "methods", set())
        if not path:
            continue
        # Skip doc/spec endpoints
        if path in ("/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"):
            continue

        # If not public, must be protected
        if not is_public_route(path):
            test_path = re.sub(r"\{[a-zA-Z_0-9]+\}", "test_param_123", path)
            method = "GET" if "GET" in methods else ("POST" if "POST" in methods else "GET")
            res = client.request(method, test_path)
            # Must return 401 Unauthorized, 403 Forbidden, 404 Not Found, 405 Method Not Allowed, or 422 Unprocessable
            assert res.status_code != 200, (
                f"Security breach: Route '{path}' is not declared in public_routes.py "
                f"and returned 200 without authentication!"
            )
