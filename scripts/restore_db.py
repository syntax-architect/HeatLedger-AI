#!/usr/bin/env python3
"""
HEATLEDGER AI: Disaster Recovery Restore Drill CLI (Prompt D4)
Usage:
  python scripts/restore_db.py <backup_file> <target_db> [--key KEY] [--verify-only]
"""

import argparse
import json
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db.backup import verify_backup_integrity, restore_backup


def main():
    parser = argparse.ArgumentParser(description="HeatLedger AI Disaster Recovery Restore Tool")
    parser.add_argument("backup_file", help="Path to the backup file (.sqlite3 or .enc)")
    parser.add_argument("target_db", nargs="?", default=None, help="Target path for restored database")
    parser.add_argument("--key", default=None, help="Decryption key (if backup is encrypted)")
    parser.add_argument("--verify-only", action="store_true", help="Only verify checksum and integrity without restoring")

    args = parser.parse_args()

    print("[HEATLEDGER RESTORE DRILL] Initiating verification...")
    print(f"  Backup File: {args.backup_file}")

    valid, msg = verify_backup_integrity(args.backup_file)
    if not valid:
        print(f"[HEATLEDGER RESTORE DRILL] ERROR: Integrity check failed: {msg}")
        sys.exit(1)

    print(f"[HEATLEDGER RESTORE DRILL] Integrity check passed: {msg}")

    if args.verify_only:
        print("[HEATLEDGER RESTORE DRILL] Verification complete (--verify-only specified).")
        sys.exit(0)

    if not args.target_db:
        print("[HEATLEDGER RESTORE DRILL] ERROR: target_db must be specified to perform restoration.")
        sys.exit(1)

    print(f"  Target DB:   {args.target_db}")
    try:
        report = restore_backup(
            backup_path=args.backup_file,
            target_path=args.target_db,
            encryption_key=args.key,
            verify_first=True
        )
        print("[HEATLEDGER RESTORE DRILL] RESTORE SUCCESSFUL!")
        print(json.dumps(report, indent=2))
    except Exception as e:
        print(f"[HEATLEDGER RESTORE DRILL] FAILED: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
