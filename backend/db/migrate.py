# ============================================================================
# HEATLEDGER AI: PostgreSQL Database Migration Runner (Prompt S3 / Task 2.1)
# ============================================================================

import glob
import os
import sys
from datetime import datetime, timezone
from typing import List

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from connection import get_db_connection

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations")


def init_migrations_table():
    with get_db_connection(is_service_role=True) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ NOT NULL
            )
        """)


def get_applied_migrations():
    init_migrations_table()
    with get_db_connection(is_service_role=True) as db:
        cur = db.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        return {row["version"] for row in cur.fetchall()}


def run_migrations() -> List[str]:
    """
    Applies all unapplied numbered SQL migrations in sorted order to PostgreSQL.
    Returns the list of newly applied migration versions.
    """
    applied = get_applied_migrations()
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    applied_list = []

    for file_path in sql_files:
        version = os.path.basename(file_path)
        if version in applied:
            continue

        print(f"Applying migration: {version}...")
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with get_db_connection(is_service_role=True) as db:
            db.raw_connection.execute(sql_content)
            db.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (%s, %s)",
                (version, datetime.now(timezone.utc).isoformat()),
            )
        applied_list.append(version)
        print(f"Applied {version} successfully.")

    return applied_list


if __name__ == "__main__":
    newly_applied = run_migrations()
    if newly_applied:
        print(f"Migrated {len(newly_applied)} files: {newly_applied}")
    else:
        print("Database schema is up to date.")
