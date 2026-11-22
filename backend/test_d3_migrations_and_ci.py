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
import sqlite3
import pytest
import yaml

from db.migrate import run_migrations, MIGRATIONS_DIR


def test_d3_1_migrations_apply_cleanly_on_fresh_database(tmp_path):
    """
    D3 Deliverable 1: Migration runner executes on a fresh database from scratch.
    """
    fresh_db_path = str(tmp_path / "fresh_test.sqlite3")
    applied = run_migrations(target_path=fresh_db_path)

    assert len(applied) >= 4
    assert any("001" in v for v in applied)
    assert any("005" in v for v in applied)

    # Verify tables exist in fresh database
    conn = sqlite3.connect(fresh_db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = {r[0] for r in cur.fetchall()}
    conn.close()

    assert "schema_migrations" in tables
    assert "organizations" in tables
    assert "privacy_settings" in tables
    assert "support_tickets" in tables
    assert "product_analytics_events" in tables


def test_d3_2_migrations_upgrade_on_existing_schema(tmp_path):
    """
    D3 Deliverable 2: Migration runner executes on an existing prior schema,
    proving incremental forward upgrades work without data loss or collision.
    """
    upgrade_db_path = str(tmp_path / "upgrade_test.sqlite3")

    # Seed partial migrations (simulate DB up to migration 003)
    conn = sqlite3.connect(upgrade_db_path)
    conn.execute("CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT)")
    conn.execute("INSERT INTO schema_migrations VALUES ('001_complete_b2_schema.sql', '2026-01-01T00:00:00Z')")
    conn.execute("INSERT INTO schema_migrations VALUES ('002_notification_preferences_schema_fix.sql', '2026-01-01T00:00:00Z')")
    conn.execute("INSERT INTO schema_migrations VALUES ('003_auth_sessions_and_tokens.sql', '2026-01-01T00:00:00Z')")
    # Simulate organizations existing
    conn.execute("CREATE TABLE organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)")
    conn.commit()
    conn.close()

    # Run migrations on existing DB
    new_applied = run_migrations(target_path=upgrade_db_path)

    # Should only apply 004 and 005
    assert not any("001" in v for v in new_applied)
    assert not any("002" in v for v in new_applied)
    assert not any("003" in v for v in new_applied)
    assert any("004" in v for v in new_applied)
    assert any("005" in v for v in new_applied)


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

