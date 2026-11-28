#!/usr/bin/env python3
"""
HEATLEDGER AI: Hot PostgreSQL Backup CLI (Prompt D4 / Task 2.1)
Usage:
  python scripts/backup_db.py [--schema NAME] [--dest DIR] [--encrypt] [--key KEY] [--keep N]
"""

import argparse
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.backup import BACKUP_DIR, RETENTION_COUNT, create_backup


def main():
    parser = argparse.ArgumentParser(description="HeatLedger AI PostgreSQL Backup Tool")
    parser.add_argument("--schema", default=None, help="PostgreSQL schema name (defaults to current_schema())")
    parser.add_argument("--dest", default=BACKUP_DIR, help="Destination directory for backups")
    parser.add_argument("--encrypt", action="store_true", help="Encrypt snapshot using AES-256-GCM")
    parser.add_argument("--key", default=None, help="Encryption key (defaults to ENCRYPTION_KEY env)")
    parser.add_argument("--keep", type=int, default=RETENTION_COUNT, help="Number of backups to retain")

    args = parser.parse_args()

    print("[HEATLEDGER BACKUP] Starting live PostgreSQL snapshot...")
    print(f"  Schema:      {args.schema or 'current_schema()'}")
    print(f"  Destination: {args.dest}")
    print(f"  Encryption:  {'ENABLED (AES-256-GCM)' if args.encrypt else 'DISABLED'}")

    target = create_backup(
        source_schema=args.schema,
        dest_dir=args.dest,
        encrypt=args.encrypt,
        encryption_key=args.key,
    )

    print(f"[HEATLEDGER BACKUP] SUCCESS: Snapshot saved to {target}")
    print(f"  Checksum:    {target}.sha256")
    print(f"  Metadata:    {target}.meta.json")


if __name__ == "__main__":
    main()
