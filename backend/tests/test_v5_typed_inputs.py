"""
HEATLEDGER AI: Prompt Pack v5 Task 3.1 — Typed, Bounded Inputs & Mass-Assignment Protection
Proves:
1. No route handler in main.py or routers/*.py accepts an untyped dict/Dict/Any request body parameter.
2. Mass-assignment fields (organization_id, plant_id, user_id, role, plan, is_admin, price) are rejected (422)
   or stripped by extra='forbid' / typed schemas.
3. Global request body size limit rejects >1MB JSON and >15MB multipart uploads with 413 Payload Too Large.
4. Non-finite numbers (NaN/Infinity) and out-of-range inputs are rejected cleanly (400/422), never 500.
"""

import os
import re
import pytest
from fastapi.testclient import TestClient

from main import app
from auth_service import AuthService

client = TestClient(app)


def _owner_headers():
    res = TestClient(app).post(
        "/api/auth/login",
        json={"email": "owner@howrahsteel.in", "password": "OwnerSecretPassword2026!"},
    )
    assert res.status_code == 200, res.text
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def test_v5_3_1_no_bare_dict_or_any_request_body_params():
    """Ensures no API route function takes a bare dict, Dict, or Any as a request body parameter."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = [os.path.join(backend_dir, "main.py")]
    routers_dir = os.path.join(backend_dir, "routers")
    for fname in os.listdir(routers_dir):
        if fname.endswith(".py"):
            files.append(os.path.join(routers_dir, fname))

    pattern = re.compile(r"\b(body|payload|data|req|item)\s*:\s*(dict|Dict|Any)\b")
    offenders = []
    for path in files:
        with open(path, encoding="utf-8") as fh:
            for idx, line in enumerate(fh, start=1):
                if pattern.search(line) and "Depends(" not in line:
                    offenders.append(f"{os.path.basename(path)}:{idx}: {line.strip()}")

    assert offenders == [], f"Untyped dict/Any request body params found: {offenders}"


def test_v5_3_1_mass_assignment_rejected_422():
    """
    Posts privileged mass-assignment fields (organization_id, plant_id, user_id, role, plan, is_admin, price)
    to extra='forbid' endpoints and confirms 422 rejection.
    """
    headers = _owner_headers()

    # 1. Login endpoint with extra privilege fields
    res_login = client.post(
        "/api/auth/login",
        json={
            "email": "nobody@example.com",
            "password": "Password123!",
            "is_admin": True,
            "role": "PLATFORM_ADMIN",
            "organization_id": "org_victim",
        },
    )
    assert res_login.status_code == 422

    # 2. Leads CSV import with extra fields
    res_leads = client.post(
        "/api/leads/import-csv",
        headers=headers,
        json={
            "csv_content": "company_name,email\nAcme,a@acme.com",
            "organization_id": "org_victim",
            "is_admin": True,
        },
    )
    assert res_leads.status_code == 422

    # 3. Extraction correction rejects client-supplied user_id / role
    res_extract = client.post(
        "/api/extraction/correct",
        headers=headers,
        json={
            "sha256": "a" * 64,
            "field_name": "heat_number",
            "corrected_value": "H-123",
            "user_id": "usr_spoofed",
            "role": "OWNER",
        },
    )
    assert res_extract.status_code == 422

    # 4. Billing create-order rejects extra price / plan / organization_id overrides
    res_billing = client.post(
        "/api/billing/create-order",
        headers=headers,
        json={
            "plan_id": "EXPORTER_STARTER",
            "billing_cycle": "MONTHLY",
            "price": 0,
            "organization_id": "org_victim",
        },
    )
    assert res_billing.status_code == 422

    # 5. Melt-and-pour scope-check rejects extra organization_id / is_admin
    res_mnp = client.post(
        "/api/melt-and-pour/scope-check",
        headers=headers,
        json={
            "cn_codes": ["7208 51 00"],
            "organization_id": "org_victim",
            "is_admin": True,
        },
    )
    assert res_mnp.status_code == 422


def test_v5_3_1_global_body_size_limit_returns_413():
    """Global body size middleware rejects >1MB JSON and >15MB multipart uploads with 413."""
    headers = _owner_headers()

    # >1 MB JSON body
    oversized_json = '{"email":"' + ("a" * (1024 * 1024 + 512)) + '"}'
    res_json = client.post(
        "/api/auth/login",
        content=oversized_json.encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    assert res_json.status_code == 413
    assert res_json.json()["code"] == "PAYLOAD_TOO_LARGE"

    # >15 MB multipart upload (Content-Length header or actual body)
    res_upload = client.post(
        "/api/documents/upload",
        headers={
            **headers,
            "Content-Type": "multipart/form-data; boundary=----TestBoundary",
            "Content-Length": str(15 * 1024 * 1024 + 1024),
        },
        content=b"------TestBoundary--\r\n",
    )
    assert res_upload.status_code == 413
    assert res_upload.json()["code"] == "PAYLOAD_TOO_LARGE"


def test_v5_3_1_non_finite_numbers_and_bounds_rejected():
    """Rejects NaN/Infinity JSON numbers and over-limit bounds cleanly with 400/422."""
    headers = _owner_headers()

    res_nan = client.post(
        "/api/sales/roi-calculate",
        content=b'{"shipments_per_month": 15, "avg_shipment_value_inr": NaN}',
        headers={**headers, "Content-Type": "application/json"},
    )
    assert res_nan.status_code in (400, 422)

    res_inf = client.post(
        "/api/sales/roi-calculate",
        content=b'{"shipments_per_month": 15, "avg_shipment_value_inr": Infinity}',
        headers={**headers, "Content-Type": "application/json"},
    )
    assert res_inf.status_code in (400, 422)

    res_pct = client.post(
        "/api/sales/roi-calculate",
        json={"shipments_per_month": 15, "out_of_quota_share_pct": 150.0},
        headers=headers,
    )
    assert res_pct.status_code == 422
