# ============================================================================
# HEATLEDGER AI: Database Backup Service (Prompt B12 / Prompt S3)
# ============================================================================

import hashlib
import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

from backend.db.connection import SQLITE_DB_PATH, is_postgres

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DB = SQLITE_DB_PATH
BACKUP_DIR = os.path.join(BACKEND_DIR, "backups")
RETENTION_COUNT = 7


def create_backup(source_path: str = SOURCE_DB, dest_dir: str = BACKUP_DIR) -> str:
    """Creates a consistent online snapshot of the database."""
    if not os.path.exists(source_path):
        conn = sqlite3.connect(source_path)
        conn.execute("CREATE TABLE IF NOT EXISTS _health (id INTEGER PRIMARY KEY);")
        conn.close()

    os.makedirs(dest_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    backup_filename = f"heatledger_backup_{timestamp}.sqlite3"
    target_path = os.path.join(dest_dir, backup_filename)
    sha_path = f"{target_path}.sha256"

    # Use SQLite online backup API for ACID safety
    src_conn = sqlite3.connect(source_path)
    dest_conn = sqlite3.connect(target_path)
    with dest_conn:
        src_conn.backup(dest_conn, pages=100)
    dest_conn.close()
    src_conn.close()

    # Compute SHA-256
    hasher = hashlib.sha256()
    with open(target_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    digest = hasher.hexdigest()

    with open(sha_path, "w", encoding="utf-8") as f:
        f.write(f"{digest}  {backup_filename}\n")

    rotate_backups(dest_dir, keep=RETENTION_COUNT)
    return target_path


def rotate_backups(dest_dir: str, keep: int = 7):
    """Enforces retention policy by removing oldest backups."""
    if not os.path.exists(dest_dir):
        return
    files = [
        f for f in os.listdir(dest_dir)
        if f.startswith("heatledger_backup_") and f.endswith(".sqlite3")
    ]
    files.sort(reverse=True)
    if len(files) > keep:
        for old in files[keep:]:
            old_path = os.path.join(dest_dir, old)
            old_sha = f"{old_path}.sha256"
            if os.path.exists(old_path):
                os.remove(old_path)
            if os.path.exists(old_sha):
                os.remove(old_sha)
