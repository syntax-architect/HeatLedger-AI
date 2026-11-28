"""
HEATLEDGER AI: Pytest Configuration & Hermetic Test Isolation Fixtures (Task 1.1)
1. Isolates all PostgreSQL schemas, uploaded/generated files, caches, and mutable JSON
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
import uuid
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
_PG_TEST_SCHEMA = f"test_hl_{uuid.uuid4().hex[:10]}"


def _load_database_url_if_missing() -> str:
    dsn = os.getenv("DATABASE_URL", "").strip() or os.getenv("TEST_DATABASE_URL", "").strip()
    if dsn:
        os.environ["DATABASE_URL"] = dsn
        return dsn
    for env_path in (_REPO_ROOT / ".env", _REPO_ROOT.parent / "HeatLedger-AI-main" / ".env"):
        if env_path.is_file():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("DATABASE_URL="):
                    val = line.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        os.environ["DATABASE_URL"] = val
                        return val
    return ""


def _create_ephemeral_pg_schema() -> None:
    import psycopg
    dsn = _load_database_url_if_missing()
    if not dsn:
        raise RuntimeError("DATABASE_URL or TEST_DATABASE_URL must be set to run pytest against PostgreSQL.")
    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://"):]
    with psycopg.connect(dsn, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(f"CREATE SCHEMA IF NOT EXISTS {_PG_TEST_SCHEMA}")
        conn.commit()
    os.environ["PG_TEST_SCHEMA"] = _PG_TEST_SCHEMA


def _cleanup_session_env():
    shutil.rmtree(_PYTEST_SESSION_DIR, ignore_errors=True)
    try:
        from backend.db.connection import reset_postgres_pool
        reset_postgres_pool()
    except Exception:
        pass
    dsn = os.getenv("DATABASE_URL", "").strip()
    if dsn:
        import psycopg
        if dsn.startswith("postgres://"):
            dsn = "postgresql://" + dsn[len("postgres://"):]
        try:
            with psycopg.connect(dsn, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.execute(f"DROP SCHEMA IF EXISTS {_PG_TEST_SCHEMA} CASCADE")
                conn.commit()
        except Exception:
            pass


atexit.register(_cleanup_session_env)

os.environ["ENV"] = "test"
_create_ephemeral_pg_schema()
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
    from backend.db.connection import set_tenant_context
    from backend.db.migrate import run_migrations
except ImportError:
    from auth_service import AuthService
    from db.connection import set_tenant_context
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
    from concurrent.futures import ThreadPoolExecutor

    # AuthService.init_db() already runs on module import; run remaining initializers in parallel.
    initializers = [
        ("backend.admin_service", "AdminService", "init_tables"),
        ("backend.audit_service", "AuditService", "init_tables"),
        ("backend.billing_service", "BillingService", "init_tables"),
        ("backend.cbam_service", "CBAMService", "init_db"),
        ("backend.cbam_service", "CBAMService", "init_workspace_tables"),
        ("backend.crypto_signing", "CryptoSigningService", "init_tables"),
        ("backend.email_service", "EmailService", "init_tables"),
        ("backend.intake_service", "IntakeService", "init_easy_intake_tables"),
        ("backend.intake_service", "IntakeService", "init_tables"),
        ("backend.integration_service", "IntegrationService", "_init_db"),
        ("backend.ledger_service", "LedgerService", "init_db"),
        ("backend.supplier_service", "SupplierService", "init_mill_chaser_tables"),
        ("backend.notification_service", "NotificationService", "_init_db"),
        ("backend.partner_service", "PartnerService", "init_db"),
        ("backend.portal_service", "PortalService", "init_tables"),
        ("backend.privacy_service", "PrivacyService", "init_tables"),
        ("backend.product_analytics_service", "ProductAnalyticsService", "init_tables"),
        ("backend.radar_service", "RadarService", "init_tables"),
        ("backend.readiness_service", "ReadinessService", "init_tables"),
        ("backend.regulatory_store", "RegulatoryStore", "init_tables"),
        ("backend.roi_service", "RoiService", "init_tables"),
        ("backend.supplier_service", "SupplierService", "init_request_tables"),
        ("backend.supplier_service", "SupplierService", "init_tables"),
        ("backend.support_service", "SupportService", "init_tables"),
        ("backend.traction_service", "TractionService", "init_db"),
        ("backend.token_budget_service", "TokenBudgetService", "_init_tables"),
    ]

    def _run_init(item):
        mod_name, attr_name, method_name = item
        try:
            mod = importlib.import_module(mod_name)
            obj = getattr(mod, attr_name) if attr_name else mod
            getattr(obj, method_name)()
        except Exception:
            pass

    def _run_fn(item):
        fn_mod, fn_name = item
        try:
            mod = importlib.import_module(fn_mod)
            fn = getattr(mod, fn_name, None)
            if callable(fn):
                fn()
        except Exception:
            pass

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(_run_init, initializers))
        list(
            pool.map(
                _run_fn,
                [
                    ("backend.privacy_service", "init_tables"),
                    ("backend.product_analytics_service", "init_tables"),
                    ("backend.support_service", "init_tables"),
                    ("backend.consultant_service", "init_consultant_db"),
                ],
            )
        )

    run_migrations()


@pytest.fixture(scope="session", autouse=True)
def hermetic_test_database():
    """Initializes the isolated session database once from migrations and cleans up on exit."""
    _bootstrap_hermetic_schema()
    yield
    _cleanup_session_env()


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
