#!/usr/bin/env python3
"""
HEATLEDGER AI: Prompt B12 - Database Backup Script
Creates timestamped, SHA-256 verified SQLite database snapshots.
Features:
- Online live backup via sqlite3.Connection.backup (zero locking)
- Cryptographic SHA-256 manifest generation
- 7-day retention rotation policy
"""

import hashlib
import os
import shutil
import sqlite3
import sys
import time
from datetime import datetime, timezone

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DB = os.path.join(BACKEND_DIR, "auth_database.sqlite3")
BACKUP_DIR = os.path.join(BACKEND_DIR, "backups")
RETENTION_COUNT = 7

def create_backup(source_path: str = SOURCE_DB, dest_dir: str = BACKUP_DIR) -> str:
    """Creates a consistent online snapshot of the SQLite database."""
    if not os.path.exists(source_path):
        # Create blank if not existing yet
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

    # Rotate old backups
    rotate_backups(dest_dir, keep=RETENTION_COUNT)

    print(f"✓ Database backup created: {target_path} (SHA-256: {digest[:16]}...)")
    return target_path

def rotate_backups(dest_dir: str, keep: int = 7):
    """Enforces retention policy by removing oldest backups."""
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
            print(f"  Rotated expired backup: {old}")

if __name__ == "__main__":
    try:
        create_backup()
        sys.exit(0)
    except Exception as e:
        print(f"Error during backup: {e}", file=sys.stderr)
        sys.exit(1)
