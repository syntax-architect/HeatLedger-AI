# ============================================================================
# HEATLEDGER AI: Database Migration Runner (Prompt S3)
# ============================================================================

import os
import sys
import glob
from datetime import datetime, timezone
from typing import List, Optional

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

try:
    from backend.db.connection import get_db_connection, is_postgres
except ImportError:
    from connection import get_db_connection, is_postgres

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "migrations")


def init_migrations_table(target_path: Optional[str] = None):
    with get_db_connection(target_path=target_path) as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            )
        """)


def get_applied_migrations(target_path: Optional[str] = None):
    init_migrations_table(target_path=target_path)
    with get_db_connection(target_path=target_path) as db:
        cur = db.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        return {row["version"] if is_postgres() else row[0] for row in cur.fetchall()}


def translate_to_sqlite(sql: str) -> str:
    """Translates PostgreSQL DDL constructs to SQLite equivalents for local dev fallback."""
    import re
    # Strip single-line comments first to avoid matching keywords inside comments
    sql = re.sub(r'--[^\n]*', '', sql)
    # Remove Postgres extensions
    sql = re.sub(r'\bCREATE\s+EXTENSION[^;]+;', '', sql, flags=re.IGNORECASE)
    # Remove RLS and Policies (Postgres specific)
    sql = re.sub(r'\bALTER\s+TABLE\s+[^;]+ENABLE\s+ROW\s+LEVEL\s+SECURITY;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bALTER\s+TABLE\s+[^;]+FORCE\s+ROW\s+LEVEL\s+SECURITY;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bDROP\s+POLICY[^;]+;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bCREATE\s+POLICY[^;]+;', '', sql, flags=re.IGNORECASE)
    # Remove Postgres privilege statements
    sql = re.sub(r'\bREVOKE\s+[^;]+;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bGRANT\s+[^;]+;', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bCOMMENT\s+ON[^;]+;', '', sql, flags=re.IGNORECASE)
    
    # Check if this migration contains the mass-balance trigger
    has_mass_balance = 'trg_enforce_mass_balance' in sql or 'enforce_mass_balance_conservation' in sql

    sql = re.sub(r'\bDROP\s+TRIGGER[^;]+;', '', sql, flags=re.IGNORECASE)
    # Remove PL/pgSQL functions and triggers
    sql = re.sub(r'\bCREATE\s+OR\s+REPLACE\s+FUNCTION.*?AS\s+\$\$.*?\$\$\s*LANGUAGE\s+[a-z]+(\s+[a-z]+)*;?', '', sql, flags=re.IGNORECASE | re.DOTALL)
    sql = re.sub(r'\bCREATE\s+TRIGGER[^;]+;', '', sql, flags=re.IGNORECASE)
    # Remove Postgres specific defaults
    sql = re.sub(r'DEFAULT\s+gen_random_uuid\(\)', '', sql, flags=re.IGNORECASE)
    sql = re.sub(r'DEFAULT\s+NOW\(\)', 'DEFAULT (CURRENT_TIMESTAMP)', sql, flags=re.IGNORECASE)
    sql = re.sub(r'DEFAULT\s+ARRAY\[[^\]]*\]', "DEFAULT '[]'", sql, flags=re.IGNORECASE)
    # Translate types using word boundaries
    sql = re.sub(r'\bUUID\b', 'TEXT', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bTIMESTAMPTZ\b', 'TEXT', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bBOOLEAN\s+DEFAULT\s+FALSE\b', 'INTEGER DEFAULT 0', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bBOOLEAN\s+DEFAULT\s+TRUE\b', 'INTEGER DEFAULT 1', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bBOOLEAN\b', 'INTEGER', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bBIGINT\b', 'INTEGER', sql, flags=re.IGNORECASE)
    sql = re.sub(r'NUMERIC\([0-9,\s]+\)', 'REAL', sql, flags=re.IGNORECASE)
    sql = re.sub(r'TEXT\[\]', 'TEXT', sql, flags=re.IGNORECASE)

    if has_mass_balance:
        sql += """
CREATE TRIGGER IF NOT EXISTS trg_enforce_mass_balance_insert
BEFORE INSERT ON shipment_items
BEGIN
    SELECT CASE
        WHEN (
            COALESCE((SELECT SUM(allocated_weight_grams) FROM shipment_items WHERE heat_id = NEW.heat_id), 0) + NEW.allocated_weight_grams
        ) > (SELECT initial_weight_grams FROM heat_numbers WHERE id = NEW.heat_id)
        THEN RAISE(ABORT, 'Phantom Heat Allocation Defect: Total allocated exceeds original mill received weight. Transaction rejected.')
    END;
END;

CREATE TRIGGER IF NOT EXISTS trg_enforce_mass_balance_update
BEFORE UPDATE ON shipment_items
BEGIN
    SELECT CASE
        WHEN (
            COALESCE((SELECT SUM(allocated_weight_grams) FROM shipment_items WHERE heat_id = NEW.heat_id AND id != NEW.id), 0) + NEW.allocated_weight_grams
        ) > (SELECT initial_weight_grams FROM heat_numbers WHERE id = NEW.heat_id)
        THEN RAISE(ABORT, 'Phantom Heat Allocation Defect: Total allocated exceeds original mill received weight. Transaction rejected.')
    END;
END;
"""
    return sql


def run_migrations(target_path: Optional[str] = None) -> List[str]:
    """
    Applies all unapplied numbered SQL migrations in sorted order.
    Returns the list of newly applied migration versions.
    """
    applied = get_applied_migrations(target_path=target_path)
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    applied_list = []

    for file_path in sql_files:
        version = os.path.basename(file_path)
        if version in applied:
            continue

        print(f"Applying migration: {version}...")
        with open(file_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        with get_db_connection(target_path=target_path, is_service_role=True) as db:
            if is_postgres() and target_path is None:
                db.execute(sql_content)
            else:
                translated = translate_to_sqlite(sql_content)
                raw = getattr(db, "_conn", None)
                if raw and hasattr(raw, "executescript"):
                    raw.executescript(translated)
                else:
                    for statement in translated.split(";"):
                        stmt = statement.strip()
                        if stmt:
                            db.execute(stmt)

            now_iso = datetime.now(timezone.utc).isoformat()
            db.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (version, now_iso)
            )
            applied_list.append(version)
            print(f"✓ Migration {version} applied successfully.")

    return applied_list


if __name__ == "__main__":
    applied_count = run_migrations()
    print(f"Migration run complete. Applied {applied_count} migrations.")
