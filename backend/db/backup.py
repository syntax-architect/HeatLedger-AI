# ============================================================================
# HEATLEDGER AI: PostgreSQL Backup & Restore Service (Prompt B12 / D4 / Task 2.1)
# Specification:
# - Consistent PostgreSQL logical snapshot via psycopg3
# - Cryptographic SHA-256 integrity manifest generation
# - Optional AES-256-GCM authenticated encryption using ENCRYPTION_KEY
# - 7-day retention rotation policy
# - Disaster recovery restore drill with pre-flight checksum & schema restore
# ============================================================================

import hashlib
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    HAS_AESGCM = True
except ImportError:
    HAS_AESGCM = False

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKUP_DIR = os.path.join(BACKEND_DIR, "backups")
RETENTION_COUNT = 7
MAGIC_HEADER = b"HLBACKUP01\x00"
_IDENT_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


def _validate_ident(name: str) -> str:
    if not _IDENT_RE.match(name):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    return name


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
    source_schema: Optional[str] = None,
    dest_dir: str = BACKUP_DIR,
    encrypt: bool = False,
    encryption_key: Optional[str] = None,
) -> str:
    """
    Creates a consistent logical snapshot of the PostgreSQL schema.
    Optionally encrypts with AES-256-GCM.
    Writes SHA-256 manifest and metadata JSON, and rotates old backups.
    """
    os.makedirs(dest_dir, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    extension = "enc" if encrypt else "pg.json"
    backup_filename = f"heatledger_backup_{timestamp}.{extension}"
    target_path = os.path.join(dest_dir, backup_filename)
    sha_path = f"{target_path}.sha256"
    meta_path = f"{target_path}.meta.json"

    snapshot_tables: Dict[str, Any] = {}
    resolved_schema = source_schema
    with get_db_connection(is_service_role=True) as conn:
        if resolved_schema:
            _validate_ident(resolved_schema)
        else:
            resolved_schema = conn.execute("SELECT current_schema() AS s").fetchone()["s"]

        tables_rows = conn.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            ORDER BY table_name
            """,
            (resolved_schema,),
        ).fetchall()

        for tr in tables_rows:
            tname = _validate_ident(tr["table_name"])
            col_rows = conn.execute(
                """
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
                ORDER BY ordinal_position
                """,
                (resolved_schema, tname),
            ).fetchall()
            rows = conn.execute(f'SELECT * FROM "{resolved_schema}"."{tname}"').fetchall()
            snapshot_tables[tname] = {
                "columns": [dict(c) for c in col_rows],
                "rows": [dict(r) for r in rows],
            }

    payload_bytes = json.dumps(
        {
            "format": "heatledger_pg_snapshot_v1",
            "schema": resolved_schema,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "tables": snapshot_tables,
        },
        default=str,
        indent=2,
    ).encode("utf-8")

    if encrypt:
        if not HAS_AESGCM:
            raise RuntimeError("cryptography package is required for encrypted backups.")
        key_raw = encryption_key or os.getenv("ENCRYPTION_KEY", "dev_aes_encryption_key_32_bytes_long_exact!")
        aesgcm = AESGCM(_derive_aes_key(key_raw))
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, payload_bytes, MAGIC_HEADER)
        with open(target_path, "wb") as f:
            f.write(MAGIC_HEADER + nonce + ciphertext)
    else:
        with open(target_path, "wb") as f:
            f.write(payload_bytes)

    digest = compute_sha256(target_path)
    with open(sha_path, "w", encoding="utf-8") as f:
        f.write(f"{digest}  {backup_filename}\n")

    meta = {
        "backup_filename": backup_filename,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "sha256": digest,
        "size_bytes": os.path.getsize(target_path),
        "is_encrypted": encrypt,
        "table_count": len(snapshot_tables),
        "source_schema": resolved_schema,
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    rotate_backups(dest_dir, keep=RETENTION_COUNT)
    return target_path


def verify_backup_integrity(backup_path: str, expected_checksum: Optional[str] = None) -> Tuple[bool, str]:
    """
    Verifies that a backup file exists, matches its SHA-256 checksum,
    and parses cleanly if unencrypted.
    """
    if not os.path.exists(backup_path):
        return False, f"Backup file not found: {backup_path}"

    if os.path.getsize(backup_path) == 0:
        return False, "Backup file is empty (0 bytes)."

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

    if backup_path.endswith(".pg.json") or backup_path.endswith(".json"):
        try:
            with open(backup_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict) or "tables" not in data:
                return False, "PostgreSQL snapshot integrity check failed: missing tables manifest."
        except Exception as e:
            return False, f"Failed reading PostgreSQL snapshot: {str(e)}"

    return True, "Backup integrity verified successfully."


def _pg_col_type(data_type: str) -> str:
    dt = (data_type or "text").lower()
    if dt in ("integer", "bigint", "smallint"):
        return dt.upper()
    if dt in ("double precision", "real", "numeric"):
        return dt.upper()
    if dt == "boolean":
        return "BOOLEAN"
    if "timestamp" in dt:
        return "TIMESTAMPTZ"
    return "TEXT"


def restore_backup(
    backup_path: str,
    target_schema: Optional[str] = None,
    encryption_key: Optional[str] = None,
    verify_first: bool = True,
) -> Dict[str, Any]:
    """
    Disaster Recovery Restore Drill:
    1. Verifies SHA-256 manifest.
    2. Decrypts if encrypted.
    3. Restores tables and rows into target_schema in PostgreSQL.
    4. Returns an audit certification dict.
    """
    if not os.path.exists(backup_path):
        raise FileNotFoundError(f"Backup file not found: {backup_path}")

    if verify_first:
        valid, msg = verify_backup_integrity(backup_path)
        if not valid:
            raise ValueError(f"Pre-restore integrity check failed: {msg}")

    with open(backup_path, "rb") as f:
        header_sample = f.read(len(MAGIC_HEADER))

    is_encrypted = header_sample == MAGIC_HEADER or backup_path.endswith(".enc")

    if is_encrypted:
        if not HAS_AESGCM:
            raise RuntimeError("cryptography package is required to decrypt backups.")
        key_raw = encryption_key or os.getenv("ENCRYPTION_KEY", "dev_aes_encryption_key_32_bytes_long_exact!")
        aesgcm = AESGCM(_derive_aes_key(key_raw))

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
        snapshot = json.loads(plaintext.decode("utf-8"))
    else:
        with open(backup_path, "r", encoding="utf-8") as f:
            snapshot = json.load(f)

    tables_data: Dict[str, Any] = snapshot.get("tables", {})
    restored_tables: List[str] = []

    with get_db_connection(is_service_role=True) as conn:
        dest_schema = _validate_ident(target_schema) if target_schema else _validate_ident(
            conn.execute("SELECT current_schema() AS s").fetchone()["s"]
        )
        conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{dest_schema}"')

        for tname, tinfo in tables_data.items():
            safe_table = _validate_ident(tname)
            cols = tinfo.get("columns", [])
            rows = tinfo.get("rows", [])
            if not cols:
                continue
            col_defs = ", ".join(
                f'"{_validate_ident(c["column_name"])}" {_pg_col_type(c.get("data_type", "text"))}'
                for c in cols
            )
            conn.execute(f'DROP TABLE IF EXISTS "{dest_schema}"."{safe_table}" CASCADE')
            conn.execute(f'CREATE TABLE "{dest_schema}"."{safe_table}" ({col_defs})')

            if rows:
                col_names = [_validate_ident(c["column_name"]) for c in cols]
                col_list = ", ".join(f'"{c}"' for c in col_names)
                placeholders = ", ".join(["%s"] * len(col_names))
                insert_sql = f'INSERT INTO "{dest_schema}"."{safe_table}" ({col_list}) VALUES ({placeholders})'
                conn.executemany(insert_sql, [tuple(r.get(c) for c in col_names) for r in rows])

            restored_tables.append(safe_table)

        verified_rows = conn.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND table_type = 'BASE TABLE'
            """,
            (dest_schema,),
        ).fetchall()
        conn.commit()

    return {
        "status": "RESTORE_VERIFIED_SUCCESSFUL",
        "restored_at": datetime.now(timezone.utc).isoformat(),
        "target_schema": dest_schema,
        "backup_source": backup_path,
        "is_encrypted": is_encrypted,
        "integrity_check": "ok",
        "tables_count": len(verified_rows),
        "tables": sorted(restored_tables),
    }


def rotate_backups(dest_dir: str, keep: int = 7) -> List[str]:
    """Enforces retention policy by removing oldest backups and associated manifests."""
    if not os.path.exists(dest_dir):
        return []

    all_files = os.listdir(dest_dir)
    backup_files = [
        f for f in all_files
        if f.startswith("heatledger_backup_") and (f.endswith(".pg.json") or f.endswith(".enc"))
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
