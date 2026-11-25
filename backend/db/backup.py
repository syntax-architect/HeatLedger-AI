# ============================================================================
# HEATLEDGER AI: Database Backup & Restore Service (Prompt B12 / Prompt D4)
# Specification:
# - Online live snapshot using SQLite online backup API (zero table locking)
# - Cryptographic SHA-256 integrity manifest generation
# - Optional AES-256-GCM authenticated encryption using ENCRYPTION_KEY
# - 7-day retention rotation policy
# - Disaster recovery restore drill with pre-flight checksum and PRAGMA validation
# ============================================================================

import glob
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    HAS_AESGCM = True
except ImportError:
    HAS_AESGCM = False

from backend.db.connection import SQLITE_DB_PATH, is_postgres

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SOURCE_DB = SQLITE_DB_PATH
BACKUP_DIR = os.path.join(BACKEND_DIR, "backups")
RETENTION_COUNT = 7

MAGIC_HEADER = b"HLBACKUP01\x00"


def _derive_aes_key(key_str: str) -> bytes:
    """Derives a fixed 32-byte key from any input string."""
    return hashlib.sha256(key_str.encode("utf-8")).digest()


def compute_sha256(file_path: str) -> str:
    """Computes SHA-256 digest of a local file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def create_backup(
    source_path: str = SOURCE_DB,
    dest_dir: str = BACKUP_DIR,
    encrypt: bool = False,
    encryption_key: Optional[str] = None
) -> str:
    """
    Creates a consistent, online snapshot of the database.
    Optionally encrypts with AES-256-GCM.
    Writes SHA-256 manifest and metadata JSON.
    Rotates existing backups enforcing 7-day retention.
    """
    if not os.path.exists(source_path):
        conn = sqlite3.connect(source_path)
        conn.execute("CREATE TABLE IF NOT EXISTS _health (id INTEGER PRIMARY KEY);")
        conn.close()

    os.makedirs(dest_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    extension = "enc" if encrypt else "sqlite3"
    backup_filename = f"heatledger_backup_{timestamp}.{extension}"
    target_path = os.path.join(dest_dir, backup_filename)
    sha_path = f"{target_path}.sha256"
    meta_path = f"{target_path}.meta.json"

    # Temporary SQLite raw snapshot
    temp_raw = target_path + ".tmp_raw"

    try:
        # SQLite online backup API for ACID safety without holding locks
        src_conn = sqlite3.connect(source_path)
        dest_conn = sqlite3.connect(temp_raw)
        with dest_conn:
            src_conn.backup(dest_conn, pages=100)

        # Inspect table counts
        cur = dest_conn.cursor()
        cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
        table_count = cur.fetchone()[0]
        dest_conn.close()
        src_conn.close()

        if encrypt:
            if not HAS_AESGCM:
                raise RuntimeError("cryptography package is required for encrypted backups.")
            try:
                from backend.settings import get_encryption_key
            except ImportError:
                from settings import get_encryption_key
            key_raw = encryption_key or get_encryption_key()
            key_bytes = _derive_aes_key(key_raw)
            aesgcm = AESGCM(key_bytes)
            nonce = os.urandom(12)

            with open(temp_raw, "rb") as f:
                raw_bytes = f.read()

            ciphertext = aesgcm.encrypt(nonce, raw_bytes, MAGIC_HEADER)
            with open(target_path, "wb") as f:
                f.write(MAGIC_HEADER + nonce + ciphertext)
            os.remove(temp_raw)
        else:
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(temp_raw, target_path)

        # Calculate final checksum
        digest = compute_sha256(target_path)
        with open(sha_path, "w", encoding="utf-8") as f:
            f.write(f"{digest}  {backup_filename}\n")

        # Metadata manifest
        meta = {
            "backup_filename": backup_filename,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "sha256": digest,
            "size_bytes": os.path.getsize(target_path),
            "is_encrypted": encrypt,
            "table_count": table_count,
            "source_db": os.path.basename(source_path)
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        rotate_backups(dest_dir, keep=RETENTION_COUNT)
        return target_path

    finally:
        if os.path.exists(temp_raw):
            try:
                os.remove(temp_raw)
            except OSError:
                pass


def verify_backup_integrity(backup_path: str, expected_checksum: Optional[str] = None) -> Tuple[bool, str]:
    """
    Verifies that a backup file exists, matches its SHA-256 checksum,
    and passes SQLite integrity check if unencrypted.
    """
    if not os.path.exists(backup_path):
        return False, f"Backup file not found: {backup_path}"

    if os.path.getsize(backup_path) == 0:
        return False, "Backup file is empty (0 bytes)."

    # Verify SHA-256
    actual_digest = compute_sha256(backup_path)

    if expected_checksum:
        if actual_digest != expected_checksum:
            return False, f"Checksum mismatch: expected {expected_checksum}, calculated {actual_digest}"
    else:
        sha_file = f"{backup_path}.sha256"
        if os.path.exists(sha_file):
            with open(sha_file, "r", encoding="utf-8") as f:
                first_part = f.read().strip().split()[0]
            if actual_digest != first_part:
                return False, f"Checksum manifest mismatch: expected {first_part}, calculated {actual_digest}"

    # If unencrypted SQLite file, run PRAGMA integrity_check
    if backup_path.endswith(".sqlite3") or backup_path.endswith(".db"):
        try:
            conn = sqlite3.connect(f"file:{backup_path}?mode=ro", uri=True)
            cur = conn.cursor()
            cur.execute("PRAGMA integrity_check")
            row = cur.fetchone()
            conn.close()
            if not row or row[0].lower() != "ok":
                return False, f"SQLite integrity check failed: {row}"
        except Exception as e:
            return False, f"Failed reading SQLite database: {str(e)}"

    return True, "Backup integrity verified successfully."


def restore_backup(
    backup_path: str,
    target_path: str,
    encryption_key: Optional[str] = None,
    verify_first: bool = True
) -> Dict[str, Any]:
    """
    Disaster Recovery Restore Drill:
    1. Verifies SHA-256 manifest.
    2. Decrypts if encrypted.
    3. Restores to target_path atomically.
    4. Executes PRAGMA integrity_check on the restored database.
    5. Returns an audit certification dict.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    if verify_first:
        valid, msg = verify_backup_integrity(backup_path)
        if not valid:
            raise ValueError(f"Pre-restore integrity check failed: {msg}")

    # Prepare temp destination for atomic swap
    target_dir = os.path.dirname(os.path.abspath(target_path))
    os.makedirs(target_dir, exist_ok=True)
    temp_target = target_path + ".restore_drill_tmp"

    try:
        # Check if file has MAGIC_HEADER (encrypted)
        with open(backup_path, "rb") as f:
            header_sample = f.read(len(MAGIC_HEADER))

        is_encrypted = header_sample == MAGIC_HEADER or backup_path.endswith(".enc")

        if is_encrypted:
            if not HAS_AESGCM:
                raise RuntimeError("cryptography package is required to decrypt backups.")
            try:
                from backend.settings import get_encryption_key
            except ImportError:
                from settings import get_encryption_key
            key_raw = encryption_key or get_encryption_key()
            key_bytes = _derive_aes_key(key_raw)
            aesgcm = AESGCM(key_bytes)

            with open(backup_path, "rb") as f:
                hdr = f.read(len(MAGIC_HEADER))
                if hdr != MAGIC_HEADER:
                    raise ValueError("Encrypted backup missing valid magic header.")
                nonce = f.read(12)
                ciphertext = f.read()

            try:
                plaintext = aesgcm.decrypt(nonce, ciphertext, MAGIC_HEADER)
            except Exception as e:
                raise ValueError(f"Decryption failed: corrupted data or invalid key. ({str(e)})")

            with open(temp_target, "wb") as f:
                f.write(plaintext)
        else:
            shutil.copy2(backup_path, temp_target)

        # Run SQLite integrity check on restored database
        conn = sqlite3.connect(temp_target)
        cur = conn.cursor()
        cur.execute("PRAGMA integrity_check")
        integrity_res = cur.fetchone()[0]
        if integrity_res.lower() != "ok":
            conn.close()
            raise ValueError(f"Restored database failed integrity check: {integrity_res}")

        cur.execute("SELECT count(*) FROM sqlite_master WHERE type='table'")
        tables_count = cur.fetchone()[0]
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        table_names = [r[0] for r in cur.fetchall()]
        conn.close()

        # Atomic replacement
        if os.path.exists(target_path):
            backup_old = target_path + ".pre_restore_bak"
            os.replace(target_path, backup_old)
        os.replace(temp_target, target_path)

        return {
            "status": "RESTORE_VERIFIED_SUCCESSFUL",
            "restored_at": datetime.now(timezone.utc).isoformat(),
            "target_path": target_path,
            "backup_source": backup_path,
            "is_encrypted": is_encrypted,
            "integrity_check": integrity_res,
            "tables_count": tables_count,
            "tables": table_names
        }

    finally:
        if os.path.exists(temp_target):
            try:
                os.remove(temp_target)
            except OSError:
                pass


def rotate_backups(dest_dir: str, keep: int = 7) -> List[str]:
    """Enforces retention policy by removing oldest backups and associated manifests."""
    if not os.path.exists(dest_dir):
        return []

    # Find all backup files (.sqlite3 and .enc)
    all_files = os.listdir(dest_dir)
    backup_files = [
        f for f in all_files
        if f.startswith("heatledger_backup_") and (f.endswith(".sqlite3") or f.endswith(".enc"))
    ]
    backup_files.sort(reverse=True)

    deleted = []
    if len(backup_files) > keep:
        for old in backup_files[keep:]:
            old_base = os.path.join(dest_dir, old)
            for related in [old_base, f"{old_base}.sha256", f"{old_base}.meta.json"]:
                if os.path.exists(related):
                    try:
                        os.remove(related)
                        deleted.append(related)
                    except OSError:
                        pass
    return deleted
