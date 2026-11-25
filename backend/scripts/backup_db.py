#!/usr/bin/env python3
"""
HEATLEDGER AI: Prompt B12 / D4 - Database Backup Script
Creates timestamped, SHA-256 verified SQLite database snapshots.
Features:
- Online live backup via sqlite3.Connection.backup (zero locking)
- Cryptographic SHA-256 manifest generation
- Optional AES-256-GCM encryption
- 7-day retention rotation policy
"""

import sys
try:
    from backend.db.backup import create_backup, SOURCE_DB, BACKUP_DIR
except ImportError:
    from db.backup import create_backup, SOURCE_DB, BACKUP_DIR

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else SOURCE_DB
    dst = sys.argv[2] if len(sys.argv) > 2 else BACKUP_DIR
    encrypt = "--encrypt" in sys.argv
    create_backup(source_path=src, dest_dir=dst, encrypt=encrypt)
