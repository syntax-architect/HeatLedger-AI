"""
HEATLEDGER AI: Pytest Configuration & Hermetic Test Isolation Fixtures (Task 1.1)
1. Isolates all SQLite databases, uploaded/generated files, caches, and mutable JSON
   configs into an ephemeral temporary directory per pytest session. No test may read
   or mutate committed repo databases or committed data/ files.
2. Bootstraps the fresh temporary database from migrations and service table definitions
   so tests run deterministically from any clean checkout.
3. Resets ambient tenant context between every test to eliminate cross-test leakage.
4. Automatically attaches a QA_INSPECTOR test token for legacy functional tests while
   preserving raw unauthenticated testing for security/public route suites.
"""

import atexit
import os
import shutil
import sys
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Hermetic Temporary Environment (MUST execute before importing backend.*)
# ---------------------------------------------------------------------------
_REPO_ROOT = Path(__file__).resolve().parent.parent
_BACKEND_DIR = _REPO_ROOT / "backend"

for _p in (str(_REPO_ROOT), str(_BACKEND_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

_PYTEST_SESSION_DIR = tempfile.mkdtemp(prefix="heatledger_pytest_")


def _cleanup_session_dir():
    shutil.rmtree(_PYTEST_SESSION_DIR, ignore_errors=True)


atexit.register(_cleanup_session_dir)

os.environ["ENV"] = "test"
os.environ.setdefault("SQLITE_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_heatledger.sqlite3"))
os.environ.setdefault("LEDGER_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_ledger.sqlite3"))
os.environ.setdefault("CBAM_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_cbam.db"))
os.environ.setdefault("CONSULTANT_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_consultant.db"))
os.environ.setdefault("OCR_CACHE_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_ocr_cache.sqlite3"))
os.environ.setdefault("REGULATORY_DB_PATH", os.path.join(_PYTEST_SESSION_DIR, "test_regulatory.db"))
os.environ.setdefault("PUBLIC_CHECKS_DIR", os.path.join(_PYTEST_SESSION_DIR, "public_checks"))
os.environ.setdefault("STORAGE_ROOT", os.path.join(_PYTEST_SESSION_DIR, "storage"))
os.environ.setdefault("INVOICES_DIR", os.path.join(_PYTEST_SESSION_DIR, "invoices"))
os.environ.setdefault("GOLDEN_RESULTS_DIR", os.path.join(_PYTEST_SESSION_DIR, "golden_results"))

# Copy mutable JSON config fixtures into session temp dir so tests never dirty data/
_SRC_CBAM_RULES = _REPO_ROOT / "data" / "cbam_pricing_rules.json"
if _SRC_CBAM_RULES.exists() and "CBAM_RULES_PATH" not in os.environ:
    _TMP_CBAM_RULES = os.path.join(_PYTEST_SESSION_DIR, "cbam_pricing_rules.json")
    shutil.copy2(_SRC_CBAM_RULES, _TMP_CBAM_RULES)
    os.environ["CBAM_RULES_PATH"] = _TMP_CBAM_RULES

_SRC_RISK_PARAMS = _REPO_ROOT / "data" / "plant_risk_parameters.json"
if _SRC_RISK_PARAMS.exists() and "PLANT_RISK_PARAMS_PATH" not in os.environ:
    _TMP_RISK_PARAMS = os.path.join(_PYTEST_SESSION_DIR, "plant_risk_parameters.json")
    shutil.copy2(_SRC_RISK_PARAMS, _TMP_RISK_PARAMS)
    os.environ["PLANT_RISK_PARAMS_PATH"] = _TMP_RISK_PARAMS

# ---------------------------------------------------------------------------
# 2. Imports & Test Fixtures
# ---------------------------------------------------------------------------
import pytest
from starlette.testclient import TestClient

try:
    from backend.auth_service import AuthService
    from backend.db.connection import is_postgres, set_tenant_context
    from backend.db.migrate import run_migrations
except ImportError:
    from auth_service import AuthService
    from db.connection import is_postgres, set_tenant_context
    from db.migrate import run_migrations

DEFAULT_TEST_TOKEN = AuthService.create_jwt(
    user_id="usr_qa_04",
    org_id="org_howrah_steel_01",
    role="QA_INSPECTOR",
)

_ORIGINAL_REQUEST = TestClient.request


def _bootstrap_hermetic_schema():
    """Builds a clean test database schema from service definitions and migrations."""
    import importlib

    # Initialize auth & service tables first so live service schemas (e.g. share_links,
    # subscriptions, suppliers, api_keys, notification_preferences) take precedence over
    # legacy CREATE TABLE IF NOT EXISTS blocks in early migration files.
    AuthService.init_db()

    initializers = [
        ("backend.admin_service", "AdminService", "init_tables"),
        ("backend.audit_service", "AuditService", "init_tables"),
        ("backend.billing_service", "BillingService", "init_tables"),
        ("backend.cbam_service", "CBAMService", "init_db"),
        ("backend.cbam_service", "CBAMService", "init_workspace_tables"),
        ("backend.crypto_signing", "CryptoSigningService", "init_tables"),
        ("backend.easy_intake_service", "EasyIntakeService", "init_db"),
        ("backend.email_service", "EmailService", "init_tables"),
        ("backend.intake_service", "IntakeService", "init_tables"),
        ("backend.integration_service", "IntegrationService", "_init_db"),
        ("backend.ledger_service", "LedgerService", "init_db"),
        ("backend.mill_chaser_service", "MillChaserService", "init_db"),
        ("backend.notification_service", "NotificationService", "_init_db"),
        ("backend.partner_service", "PartnerService", "init_db"),
        ("backend.portal_service", "PortalService", "init_tables"),
        ("backend.privacy_service", "PrivacyService", "init_tables"),
        ("backend.product_analytics_service", "ProductAnalyticsService", "init_tables"),
        ("backend.radar_service", "RadarService", "init_tables"),
        ("backend.readiness_service", "ReadinessService", "init_tables"),
        ("backend.regulatory_store", "RegulatoryStore", "init_tables"),
        ("backend.roi_service", "ROIService", "init_tables"),
        ("backend.supplier_request_service", "SupplierRequestService", "init_db"),
        ("backend.supplier_service", "SupplierService", "init_tables"),
        ("backend.support_service", "SupportService", "init_tables"),
        ("backend.traction_service", "TractionService", "init_db"),
        ("backend.token_budget_service", "TokenBudgetService", "init_tables"),
    ]

    for mod_name, attr_name, method_name in initializers:
        try:
            mod = importlib.import_module(mod_name)
            obj = getattr(mod, attr_name) if attr_name else mod
            getattr(obj, method_name)()
        except Exception:
            pass

    for fn_mod, fn_name in [
        ("backend.privacy_service", "init_tables"),
        ("backend.product_analytics_service", "init_tables"),
        ("backend.support_service", "init_tables"),
        ("backend.consultant_service", "init_consultant_db"),
    ]:
        try:
            mod = importlib.import_module(fn_mod)
            fn = getattr(mod, fn_name, None)
            if callable(fn):
                fn()
        except Exception:
            pass

    db_target = None if is_postgres() else os.environ["SQLITE_DB_PATH"]
    run_migrations(target_path=db_target)


@pytest.fixture(scope="session", autouse=True)
def hermetic_test_database():
    """Initializes the isolated session database once from migrations and cleans up on exit."""
    _bootstrap_hermetic_schema()
    yield
    _cleanup_session_dir()


@pytest.fixture(autouse=True)
def reset_ambient_tenant_context():
    """Ensures every test starts and ends with clean ambient tenant context."""
    set_tenant_context(None, None)
    yield
    set_tenant_context(None, None)


@pytest.fixture(autouse=True)
def auto_auth_for_functional_tests(request, monkeypatch):
    """
    Automatically attaches a QA_INSPECTOR test token for legacy functional tests
    that do not explicitly test authentication/security boundaries.
    Security test suites are excluded and test raw requests.
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
