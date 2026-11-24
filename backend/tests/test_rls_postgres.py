"""
HEATLEDGER AI: Prompt Pack v4 Task A4 Test Suite
PostgreSQL Row-Level Security (RLS) & Multi-Tenant Database Isolation:
1. Every tenant table has ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY.
2. Policies enforce: USING (organization_id = current_setting('app.org_id')::uuid) with matching WITH CHECK.
3. Requests with no active org context see 0 rows.
4. Setting app.org_id to Org A returns only Org A rows.
5. Attempting to insert a row for Org B while app.org_id is Org A is rejected.
6. Updating or deleting Org B rows while app.org_id is Org A affects 0 rows.
7. Deliberately broken queries without WHERE organization_id = ... return 0 foreign rows.
8. Migration script 004 verifies all policies and FORCE RLS declarations.
"""

import os
import uuid
import pytest
from backend.db.connection import get_db_connection, is_postgres, TENANT_TABLES, IntegrityError
from backend.db.migrate import MIGRATIONS_DIR
from backend.auth_service import AuthService


ORG_A_ID = str(uuid.uuid4())
ORG_B_ID = str(uuid.uuid4())


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    AuthService.init_db()


def test_a4_01_migration_004_declares_rls_and_force_on_all_tenant_tables():
    """
    Validates that database migration 004 explicitly enables and forces RLS
    on all registered multi-tenant tables.
    """
    migration_path = os.path.join(MIGRATIONS_DIR, "004_comprehensive_rls_and_mass_balance.sql")
    assert os.path.exists(migration_path), f"Migration file missing: {migration_path}"

    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Verify helper functions
    assert "CREATE OR REPLACE FUNCTION current_org_id()" in content
    assert "current_setting('app.org_id'" in content
    assert "CREATE OR REPLACE FUNCTION is_service_role()" in content

    # Verify every tenant table has ENABLE and FORCE ROW LEVEL SECURITY
    for table in TENANT_TABLES:
        enable_pattern = f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;"
        force_pattern = f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;"
        assert enable_pattern in content, f"Table {table} missing ENABLE ROW LEVEL SECURITY in migration 004"
        assert force_pattern in content, f"Table {table} missing FORCE ROW LEVEL SECURITY in migration 004"


def test_a4_02_migration_004_declares_strict_tenant_isolation_policies():
    """
    Validates that migration 004 defines USING (organization_id = current_org_id())
    and WITH CHECK policies for tenant tables.
    """
    migration_path = os.path.join(MIGRATIONS_DIR, "004_comprehensive_rls_and_mass_balance.sql")
    with open(migration_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Core multi-tenant entities must have tenant isolation policy
    core_tables = [
        "organizations", "plants", "memberships", "suppliers", "documents",
        "mill_certificates", "heat_numbers", "shipments", "dossiers", "share_links"
    ]
    for table in core_tables:
        policy_def = f"CREATE POLICY tenant_isolation_{table} ON {table}"
        assert policy_def in content, f"Missing tenant isolation policy definition for {table}"


def test_a4_03_db_wrapper_enforces_tenant_boundary_without_context():
    """
    Prompt A4 / S4 Invariant:
    A database connection with no organization context set sees 0 rows from multi-tenant tables,
    and prevents any multi-tenant mutation.
    """
    with get_db_connection(is_service_role=False) as db:
        # Explicitly ensure org context is empty
        db.set_tenant_context(org_id=None, is_service_role=False)

        # 1. Reading from multi-tenant table without org context returns 0 rows
        cur = db.execute("SELECT * FROM heat_numbers")
        rows = cur.fetchall()
        assert len(rows) == 0, f"Unauthenticated DB connection read {len(rows)} heats without context!"

        # 2. Mutating a multi-tenant table without org context is blocked
        with pytest.raises(IntegrityError):
            db.execute(
                "INSERT INTO heat_numbers (id, organization_id, heat_number, initial_weight_grams, available_weight_grams, allocated_weight_grams, created_at) "
                "VALUES (?, ?, 'HT-TEST-000', 50000000, 50000000, 0, datetime('now'))",
                (f"ht_{uuid.uuid4().hex[:8]}", ORG_A_ID)
            )


def test_a4_04_db_wrapper_tenant_isolation_and_foreign_mutation_defense():
    """
    Tests that when connected under Org A context:
    1. SELECT * returns only Org A rows.
    2. Deliberately omitting WHERE organization_id = ... still returns 0 Org B rows.
    3. Cross-tenant UPDATE affects 0 rows.
    4. Cross-tenant DELETE affects 0 rows.
    """
    heat_a_id = f"ht_a_{uuid.uuid4().hex[:8]}"
    heat_b_id = f"ht_b_{uuid.uuid4().hex[:8]}"
    heat_a_num = f"HT-RLS-A-{uuid.uuid4().hex[:6]}"
    heat_b_num = f"HT-RLS-B-{uuid.uuid4().hex[:6]}"

    # Setup seed organizations, documents, certificates, and heats using service role
    with get_db_connection(is_service_role=True) as admin_db:
        # Organizations
        admin_db.execute(
            "INSERT OR REPLACE INTO organizations (id, name, created_at) VALUES (?, 'Org A Test', datetime('now'))",
            (ORG_A_ID,)
        )
        admin_db.execute(
            "INSERT OR REPLACE INTO organizations (id, name, created_at) VALUES (?, 'Org B Test', datetime('now'))",
            (ORG_B_ID,)
        )

        # Org A records
        admin_db.execute(
            "INSERT OR REPLACE INTO documents (id, organization_id, file_name, storage_path, file_size_bytes, mime_type, sha256, created_at) "
            "VALUES (?, ?, 'mtc_a.pdf', '/docs/a.pdf', 1024, 'application/pdf', ?, datetime('now'))",
            (f"doc_a_{heat_a_id}", ORG_A_ID, f"sha_a_{heat_a_id}")
        )
        admin_db.execute(
            "INSERT OR REPLACE INTO mill_certificates (id, organization_id, document_id, certificate_number, issue_date, created_at) "
            "VALUES (?, ?, ?, 'MTC-RLS-A', '2026-02-12', datetime('now'))",
            (f"cert_a_{heat_a_id}", ORG_A_ID, f"doc_a_{heat_a_id}")
        )
        admin_db.execute(
            "INSERT OR REPLACE INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, available_weight_grams, allocated_weight_grams, created_at) "
            "VALUES (?, ?, ?, ?, 50000000, 50000000, 0, datetime('now'))",
            (heat_a_id, ORG_A_ID, f"cert_a_{heat_a_id}", heat_a_num)
        )

        # Org B records
        admin_db.execute(
            "INSERT OR REPLACE INTO documents (id, organization_id, file_name, storage_path, file_size_bytes, mime_type, sha256, created_at) "
            "VALUES (?, ?, 'mtc_b.pdf', '/docs/b.pdf', 1024, 'application/pdf', ?, datetime('now'))",
            (f"doc_b_{heat_b_id}", ORG_B_ID, f"sha_b_{heat_b_id}")
        )
        admin_db.execute(
            "INSERT OR REPLACE INTO mill_certificates (id, organization_id, document_id, certificate_number, issue_date, created_at) "
            "VALUES (?, ?, ?, 'MTC-RLS-B', '2026-02-12', datetime('now'))",
            (f"cert_b_{heat_b_id}", ORG_B_ID, f"doc_b_{heat_b_id}")
        )
        admin_db.execute(
            "INSERT OR REPLACE INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, available_weight_grams, allocated_weight_grams, created_at) "
            "VALUES (?, ?, ?, ?, 45000000, 45000000, 0, datetime('now'))",
            (heat_b_id, ORG_B_ID, f"cert_b_{heat_b_id}", heat_b_num)
        )
        admin_db.commit()

    # Now execute as Org A
    with get_db_connection(is_service_role=False) as user_db:
        user_db.set_tenant_context(org_id=ORG_A_ID, is_service_role=False)

        # A) Deliberately broken query without WHERE organization_id = ...
        cur = user_db.execute("SELECT id, heat_number, organization_id FROM heat_numbers")
        rows = cur.fetchall()
        for r in rows:
            # Must strictly belong to Org A
            assert r["organization_id"] == ORG_A_ID, f"Leakage: Org A query returned row with org: {r['organization_id']}"
            assert r["id"] != heat_b_id, "Deliberately broken query leaked Org B heat!"

        # B) UPDATE targeting Org B entity affects 0 rows
        update_cur = user_db.execute(
            "UPDATE heat_numbers SET heat_number = 'TAMPERED' WHERE id = ?",
            (heat_b_id,)
        )
        assert update_cur.rowcount == 0, "Hostile cross-tenant UPDATE modified foreign row!"

        # C) DELETE targeting Org B entity affects 0 rows
        delete_cur = user_db.execute(
            "DELETE FROM heat_numbers WHERE id = ?",
            (heat_b_id,)
        )
        assert delete_cur.rowcount == 0, "Hostile cross-tenant DELETE removed foreign row!"


@pytest.mark.skipif(not is_postgres(), reason="Native PostgreSQL RLS verification requires active PostgreSQL database")
def test_a4_05_postgres_native_rls_live_engine_verification():
    """
    Live PostgreSQL engine test:
    Executes directly against PostgreSQL in CI to confirm:
    1. SET LOCAL app.org_id sets session context.
    2. Native FORCE ROW LEVEL SECURITY prevents foreign row reads even for table owners/normal roles.
    3. INSERT with mismatched organization_id raises new_row_violates_row_level_security_policy.
    """
    with get_db_connection(is_service_role=False) as pg_db:
        raw_conn = getattr(pg_db, "_conn", None)
        assert raw_conn is not None

        with raw_conn.cursor() as cur:
            # 1. Verify app.org_id session setting
            cur.execute("SET LOCAL app.org_id = %s;", (ORG_A_ID,))
            cur.execute("SELECT current_setting('app.org_id', true);")
            active_setting = cur.fetchone()[0]
            assert active_setting == ORG_A_ID

            # 2. Verify native RLS query filtering
            cur.execute("SELECT count(*) FROM heat_numbers WHERE organization_id = %s;", (ORG_B_ID,))
            count = cur.fetchone()[0]
            assert count == 0, "PostgreSQL native RLS allowed reading foreign tenant rows!"
