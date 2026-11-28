#!/usr/bin/env python3
"""
HEATLEDGER AI: Prompt B12 / D4 / Task 2.1 - PostgreSQL Backup Script
Creates timestamped, SHA-256 verified PostgreSQL logical snapshots.
Features:
- Consistent PostgreSQL schema snapshot via psycopg3
- Cryptographic SHA-256 manifest generation
- Optional AES-256-GCM encryption
- 7-day retention rotation policy
"""

import sys
try:
    from backend.db.backup import create_backup, BACKUP_DIR
except ImportError:
    from db.backup import create_backup, BACKUP_DIR

if __name__ == "__main__":
    schema = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else None
    dst = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else BACKUP_DIR
    encrypt = "--encrypt" in sys.argv
    create_backup(source_schema=schema, dest_dir=dst, encrypt=encrypt)
