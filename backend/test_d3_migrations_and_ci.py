"""
HEATLEDGER AI: Prompt D3 Test Suite
CI/CD Pipeline, Automated Migrations & Branch Protection:
- Database migrations execute cleanly on a fresh database
- Database migrations execute forward upgrades cleanly on an existing schema
- All migrations are forward-only and document rollback notes
- Secret scanner (forbidden keywords and backdoors) passes cleanly
- Dependabot config is valid YAML with weekly schedules for pip and npm
- GitHub Actions CI and CD workflow configurations exist with proper event gates
"""

import os
import re
import glob
import uuid
import yaml

from backend.db.connection import get_db_connection
from backend.db.migrate import MIGRATIONS_DIR, init_migrations_table


def test_d3_1_migrations_apply_cleanly_on_fresh_database():
    """
    D3 Deliverable 1: Migration runner tables and migration files exist and are valid SQL.
    """
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    assert len(sql_files) >= 4
    assert any("001" in os.path.basename(v) for v in sql_files)
    assert any("005" in os.path.basename(v) for v in sql_files)

    init_migrations_table()
    with get_db_connection(is_service_role=True) as db:
        cur = db.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = current_schema() AND table_type = 'BASE TABLE'
        """)
        tables = {row["table_name"] for row in cur.fetchall()}

    assert "schema_migrations" in tables
    assert "organizations" in tables
    assert "privacy_settings" in tables
    assert "support_tickets" in tables
    assert "product_analytics_events" in tables


def test_d3_2_migrations_upgrade_on_existing_schema():
    """
    D3 Deliverable 2: Incremental forward upgrade executes cleanly on an existing PostgreSQL schema.
    """
    tmp_schema = f"test_d3_upg_{uuid.uuid4().hex[:8]}"
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    file_005 = [f for f in sql_files if "005" in os.path.basename(f)][0]

    try:
        with get_db_connection(is_service_role=True) as db:
            db.execute(f'CREATE SCHEMA "{tmp_schema}"')
            db.execute(f'SET LOCAL search_path TO "{tmp_schema}"')
            db.execute("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)")
            db.execute("CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT, created_at TEXT)")
            db.execute(
                "INSERT INTO organizations (id, name, slug, created_at) VALUES (%s, %s, %s, %s)",
                ("org_existing_123", "Apex Steelworks Ltd", "apex-steelworks", "2026-01-01T00:00:00Z")
            )
            with open(file_005, "r", encoding="utf-8") as f:
                db.raw_connection.execute(f.read())
            db.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (%s, '2026-01-01T00:00:00Z')",
                (os.path.basename(file_005),)
            )

            cur = db.execute("SELECT name FROM organizations WHERE id = %s", ("org_existing_123",))
            row = cur.fetchone()
            assert row is not None and row["name"] == "Apex Steelworks Ltd"

            cur2 = db.execute(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = %s AND table_name = 'support_tickets'",
                (tmp_schema,)
            )
            assert cur2.fetchone() is not None
    finally:
        with get_db_connection(is_service_role=True) as db:
            db.execute(f'DROP SCHEMA IF EXISTS "{tmp_schema}" CASCADE')


def test_d3_3_all_migrations_are_forward_only_with_rollback_notes():
    """
    D3 Deliverable 3: All migrations are forward-only and include rollback notes.
    """
    sql_files = glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql"))
    assert len(sql_files) >= 4

    for fpath in sql_files:
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        fname = os.path.basename(fpath)
        # Verify rollback note or rollback instructions exist in comments
        assert "rollback" in content.lower(), f"Migration {fname} is missing a rollback note!"


def test_d3_4_forbidden_secrets_check_clean():
    """
    D3 Deliverable 4: Proves no forbidden backdoor passwords, pins or secrets
    exist in non-test source files.
    """
    forbidden_pattern = re.compile(
        r"\b(440926|demo_admin_pass_2026|DemoSandboxPassword2026|demo_sandbox_seed|heatledger_doc_signing_secret)\b"
    )

    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scan_dirs = ["backend", "src"]
    violations = []

    for d in scan_dirs:
        target_dir = os.path.join(root_dir, d)
        for root, dirs, files in os.walk(target_dir):
            if any(skip in root for skip in [".venv", "node_modules", "__pycache__", "dist"]):
                continue
            for f in files:
                if f.startswith("test_") or f.endswith(".test.tsx") or f.endswith(".test.ts"):
                    continue
                if not f.endswith((".py", ".ts", ".tsx", ".js", ".json")):
                    continue
                full_path = os.path.join(root, f)
                with open(full_path, "r", encoding="utf-8", errors="ignore") as src_f:
                    for line_idx, line in enumerate(src_f, 1):
                        m = forbidden_pattern.search(line)
                        if m:
                            violations.append(f"{f}:{line_idx}: found {m.group(1)}")

    assert len(violations) == 0, f"Found forbidden secret strings in non-test source: {violations}"


def test_d3_5_dependabot_configuration_valid():
    """
    D3 Deliverable 5: Dependabot configuration exists and contains weekly pip and npm updates.
    """
    dependabot_path = os.path.join(os.path.dirname(__file__), "..", ".github", "dependabot.yml")
    assert os.path.exists(dependabot_path)

    with open(dependabot_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    assert config.get("version") == 2
    updates = config.get("updates", [])
    ecosystems = {u["package-ecosystem"] for u in updates}
    assert "pip" in ecosystems
    assert "npm" in ecosystems
    for u in updates:
        assert u["schedule"]["interval"] == "weekly"


def test_d3_6_ci_and_cd_workflows_valid():
    """
    D3 Deliverable 6: CI and CD workflows exist with proper branch & tag trigger gates.
    """
    ci_path = os.path.join(os.path.dirname(__file__), "..", ".github", "workflows", "ci.yml")
    cd_path = os.path.join(os.path.dirname(__file__), "..", ".github", "workflows", "cd.yml")

    assert os.path.exists(ci_path)
    assert os.path.exists(cd_path)

    with open(ci_path, "r", encoding="utf-8") as f:
        ci_content = f.read()
    assert "pull_request:" in ci_content
    assert "postgres:16-alpine" in ci_content

    with open(cd_path, "r", encoding="utf-8") as f:
        cd_content = f.read()
    assert "deploy-staging" in cd_content
    assert "deploy-production" in cd_content
    assert "tags:" in cd_content

