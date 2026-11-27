"""
HEATLEDGER AI: Pytest Configuration & Test Isolation Fixtures
Ensures test client requests provide test tenant authorization context
while strictly preserving raw unauthenticated testing for security/public route test suites.
"""

import pytest
from starlette.testclient import TestClient

try:
    from auth_service import AuthService
except ImportError:
    from backend.auth_service import AuthService

DEFAULT_TEST_TOKEN = AuthService.create_jwt(
    user_id="usr_qa_04",
    org_id="org_howrah_steel_01",
    role="QA_INSPECTOR",
)

_ORIGINAL_REQUEST = TestClient.request


@pytest.fixture(autouse=True)
def auto_auth_for_functional_tests(request, monkeypatch):
    """
    Automatically attaches a QA_INSPECTOR test token for legacy functional tests
    that do not explicitly test authentication/security boundaries.
    Security test suites (test_public_routes, test_auth_and_signing, test_owasp_security,
    test_h2_auth_roles, test_s2_auth_sessions) are excluded and test raw requests.
    """
    module_name = request.module.__name__
    security_modules = (
        "test_public_routes",
        "test_auth_and_signing",
        "test_owasp_security",
        "test_h2_auth_roles",
        "test_s2_auth_sessions",
        "test_tenant_isolation",
        "test_a2_tenant_from_session",
        "test_a5_plant_accounts_and_roles",
        "test_a6_attack_suite",
        "test_b3_b4_pipeline",
        "test_b1_pricing_truth",
        "test_b3_truth_and_claims",
        "test_v5_accounts",
        "test_v5_sessions_csrf_roles",
        "test_v5_public_surface",
    )

    if any(m in module_name for m in security_modules):
        return

    def patched_request(self, method, url, **kwargs):
        headers = kwargs.get("headers")
        if headers is None:
            kwargs["headers"] = {"Authorization": f"Bearer {DEFAULT_TEST_TOKEN}"}
        elif isinstance(headers, dict) and "Authorization" not in headers and "authorization" not in headers:
            new_headers = dict(headers)
            new_headers["Authorization"] = f"Bearer {DEFAULT_TEST_TOKEN}"
            kwargs["headers"] = new_headers
        return _ORIGINAL_REQUEST(self, method, url, **kwargs)

    monkeypatch.setattr(TestClient, "request", patched_request)
