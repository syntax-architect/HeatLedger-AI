"""
HEATLEDGER AI: Enterprise Cryptographic Signing & Public Verification Engine
Module: crypto_signing.py
Specification: Ed25519 Asymmetric Key Pairs, EN 10204 Clause 6 Digital Signatures,
Immutable Versioning (Superseded/Revoked), and Byte-Level Tamper Verification.
"""

import base64
import hashlib
import os
import secrets
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519

try:
    from backend.db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from db.connection import get_db_connection as _get_db, SQLITE_DB_PATH as DB_PATH


class CryptoSigningService:
    """
    Manages Ed25519 digital signatures, public key publishing,
    and cryptographic verification for EN 10204 Clause 6 Dossiers.
    """

    @classmethod
    def init_tables(cls):
        """Initializes tables for Ed25519 signing keys and dossier signatures."""
        with _get_db(is_service_role=True) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS signing_keys (
                    key_id TEXT PRIMARY KEY,
                    algorithm TEXT NOT NULL DEFAULT 'Ed25519',
                    public_key_b64 TEXT NOT NULL,
                    private_key_b64 TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS dossier_signatures (
                    id TEXT PRIMARY KEY,
                    verification_code TEXT UNIQUE NOT NULL,
                    signer_user_id TEXT NOT NULL,
                    signer_name TEXT NOT NULL,
                    signer_role TEXT NOT NULL,
                    signer_designation TEXT,
                    organization_id TEXT NOT NULL,
                    invoice_number TEXT NOT NULL,
                    heat_numbers TEXT NOT NULL,
                    pdf_sha256 TEXT NOT NULL,
                    upstream_sha256 TEXT,
                    key_id TEXT NOT NULL,
                    signature_b64 TEXT NOT NULL,
                    public_key_b64 TEXT NOT NULL,
                    canonical_message TEXT NOT NULL,
                    signed_at TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1,
                    status TEXT NOT NULL CHECK(status IN ('VALID', 'SUPERSEDED', 'REVOKED')) DEFAULT 'VALID',
                    superseded_by TEXT,
                    revoked_at TEXT,
                    revoked_reason TEXT,
                    FOREIGN KEY(key_id) REFERENCES signing_keys(key_id)
                );
            """)

            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_signatures_code ON dossier_signatures(verification_code);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_signatures_hash ON dossier_signatures(pdf_sha256);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_signatures_invoice ON dossier_signatures(invoice_number);
            """)
            try:
                conn.execute("ALTER TABLE dossier_signatures ADD COLUMN signer_designation TEXT")
            except Exception:
                pass
            conn.commit()

            # Ensure at least one active Ed25519 key exists
            cls.get_or_create_active_key(conn)

    @classmethod
    def get_or_create_active_key(cls, conn: Optional[Any] = None) -> Tuple[str, str, ed25519.Ed25519PrivateKey]:
        """
        Retrieves the active Ed25519 signing key or generates a new one.
        Returns: (key_id, public_key_b64, private_key_obj)
        """
        local_conn = conn or _get_db()
        try:
            cursor = local_conn.cursor()
            cursor.execute("""
                SELECT key_id, public_key_b64, private_key_b64
                FROM signing_keys
                WHERE is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
            """)
            row = cursor.fetchone()
            if row:
                key_id = row["key_id"]
                pub_b64 = row["public_key_b64"]
                priv_b64 = row["private_key_b64"]
                priv_bytes = base64.b64decode(priv_b64)
                priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
                return key_id, pub_b64, priv_key

            # Generate new Ed25519 key
            priv_key = ed25519.Ed25519PrivateKey.generate()
            pub_key = priv_key.public_key()

            priv_b64 = base64.b64encode(priv_key.private_bytes_raw()).decode("utf-8")
            pub_b64 = base64.b64encode(pub_key.public_bytes_raw()).decode("utf-8")
            key_id = f"ed25519_key_{int(time.time())}"

            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT INTO signing_keys (key_id, algorithm, public_key_b64, private_key_b64, is_active, created_at)
                VALUES (?, 'Ed25519', ?, ?, 1, ?)
            """, (key_id, pub_b64, priv_b64, now))
            local_conn.commit()

            return key_id, pub_b64, priv_key
        finally:
            if not conn:
                local_conn.close()

    @classmethod
    def rotate_key(cls) -> Dict[str, Any]:
        """
        Generates a new active Ed25519 key pair, leaving old keys intact for historical verification.
        """
        with _get_db(is_service_role=True) as conn:
            # Deactivate previous active keys
            conn.execute("UPDATE signing_keys SET is_active = 0 WHERE is_active = 1")

            priv_key = ed25519.Ed25519PrivateKey.generate()
            pub_key = priv_key.public_key()
            priv_b64 = base64.b64encode(priv_key.private_bytes_raw()).decode("utf-8")
            pub_b64 = base64.b64encode(pub_key.public_bytes_raw()).decode("utf-8")
            key_id = f"ed25519_key_{int(time.time())}"
            now = datetime.now(timezone.utc).isoformat()

            conn.execute("""
                INSERT INTO signing_keys (key_id, algorithm, public_key_b64, private_key_b64, is_active, created_at)
                VALUES (?, 'Ed25519', ?, ?, 1, ?)
            """, (key_id, pub_b64, priv_b64, now))
            conn.commit()

        return {
            "key_id": key_id,
            "algorithm": "Ed25519",
            "public_key_b64": pub_b64,
            "created_at": now
        }

    @classmethod
    def list_public_keys(cls) -> List[Dict[str, Any]]:
        """Returns all public keys for open public verification."""
        cls.init_tables()
        with _get_db(is_service_role=True) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT key_id, algorithm, public_key_b64, is_active, created_at
                FROM signing_keys
                ORDER BY created_at DESC
            """)
            rows = cursor.fetchall()
            return [
                {
                    "key_id": row["key_id"],
                    "algorithm": row["algorithm"],
                    "public_key_b64": row["public_key_b64"],
                    "is_active": bool(row["is_active"]),
                    "created_at": row["created_at"]
                }
                for row in rows
            ]

    @classmethod
    def sign_dossier_pdf(
        cls,
        signer_user_id: str,
        signer_name: str,
        signer_role: str,
        organization_id: str,
        invoice_number: str,
        heat_numbers: List[str],
        pdf_bytes: bytes,
        upstream_sha256: Optional[str] = None,
        signer_designation: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Cryptographically signs a cover certificate PDF using the active Ed25519 private key.
        Enforces versioning: if the invoice was previously signed, marks the previous version as SUPERSEDED.
        Prompt R3: Records inspector name, designation, timestamp, pack hash, and key ID.
        """
        cls.init_tables()
        if signer_role not in ("QA_INSPECTOR", "QA_HEAD"):
            raise PermissionError("Access denied: Only a verified QA_INSPECTOR can apply legal digital signatures.")

        key_id, pub_b64, priv_key = cls.get_or_create_active_key()
        pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()
        up_hash = upstream_sha256 or "none"
        heat_str = ",".join(heat_numbers) if isinstance(heat_numbers, list) else str(heat_numbers)
        now = datetime.now(timezone.utc).isoformat()
        designation = signer_designation or "Head of Quality Assurance"

        with _get_db(is_service_role=True) as conn:
            cursor = conn.cursor()

            # Check if previous version exists for this invoice
            cursor.execute("""
                SELECT id, version, status
                FROM dossier_signatures
                WHERE invoice_number = ? AND status = 'VALID'
                ORDER BY version DESC
                LIMIT 1
            """, (invoice_number,))
            existing = cursor.fetchone()

            version = 1
            superseded_id = None
            if existing:
                version = existing["version"] + 1
                superseded_id = existing["id"]

            sig_id = f"sig_{secrets.token_hex(8)}"
            rand_code = secrets.token_hex(4).upper()
            year = datetime.now(timezone.utc).year
            verification_code = f"HL-{year}-{rand_code}"

            canonical_message = f"{invoice_number}|{heat_str}|{pdf_sha256}|{up_hash}|{now}|{key_id}|v{version}"
            signature_bytes = priv_key.sign(canonical_message.encode("utf-8"))
            signature_b64 = base64.b64encode(signature_bytes).decode("utf-8")

            # If superseding previous version, mark it as SUPERSEDED
            if superseded_id:
                cursor.execute("""
                    UPDATE dossier_signatures
                    SET status = 'SUPERSEDED', superseded_by = ?
                    WHERE id = ?
                """, (sig_id, superseded_id))

            cursor.execute("""
                INSERT INTO dossier_signatures (
                    id, verification_code, signer_user_id, signer_name, signer_role, signer_designation,
                    organization_id, invoice_number, heat_numbers, pdf_sha256, upstream_sha256,
                    key_id, signature_b64, public_key_b64, canonical_message, signed_at,
                    version, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VALID')
            """, (
                sig_id, verification_code, signer_user_id, signer_name, signer_role, designation,
                organization_id, invoice_number, heat_str, pdf_sha256, up_hash,
                key_id, signature_b64, pub_b64, canonical_message, now,
                version
            ))
            conn.commit()

        return {
            "signature_id": sig_id,
            "verification_code": verification_code,
            "status": "VALID",
            "version": version,
            "signed_at": now,
            "key_id": key_id,
            "pdf_sha256": pdf_sha256,
            "upstream_sha256": up_hash,
            "signature_b64": signature_b64,
            "public_key_b64": pub_b64,
            "signer_name": signer_name,
            "signer_role": signer_role,
            "signer_designation": designation,
            "invoice_number": invoice_number,
            "heat_numbers": heat_numbers,
            "canonical_message": canonical_message,
            "disclaimer": "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification."
        }

    @classmethod
    def lookup_signature(cls, code_or_hash: str) -> Optional[Dict[str, Any]]:
        """
        Looks up signature record by verification code (e.g. HL-2026-X9K4) or PDF SHA-256 hash.
        Omits all commercial pricing and trade secret data per Prompt H3.
        """
        cls.init_tables()
        clean = code_or_hash.strip()
        with _get_db(is_service_role=True) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT s.id, s.verification_code, s.signer_name, s.signer_role, s.signer_designation,
                       s.organization_id, o.name as org_name, s.invoice_number,
                       s.heat_numbers, s.pdf_sha256, s.upstream_sha256, s.key_id,
                       s.signature_b64, s.public_key_b64, s.canonical_message,
                       s.signed_at, s.version, s.status, s.superseded_by, s.revoked_at, s.revoked_reason
                FROM dossier_signatures s
                LEFT JOIN organizations o ON s.organization_id = o.id
                WHERE s.verification_code = ? OR s.pdf_sha256 = ?
                LIMIT 1
            """, (clean, clean.lower()))
            row = cursor.fetchone()
            if not row:
                return None

            return {
                "id": row["id"],
                "verification_code": row["verification_code"],
                "signer_name": row["signer_name"],
                "signer_role": row["signer_role"],
                "signer_designation": row["signer_designation"] or "Head of Quality Assurance",
                "organization_name": row["org_name"] or "Authorized Steel Exporter",
                "invoice_number": row["invoice_number"],
                "heat_numbers": row["heat_numbers"].split(","),
                "pdf_sha256": row["pdf_sha256"],
                "upstream_sha256": row["upstream_sha256"],
                "key_id": row["key_id"],
                "public_key_b64": row["public_key_b64"],
                "signature_b64": row["signature_b64"],
                "canonical_message": row["canonical_message"],
                "signed_at": row["signed_at"],
                "version": row["version"],
                "status": row["status"],
                "superseded_by": row["superseded_by"],
                "revoked_at": row["revoked_at"],
                "revoked_reason": row["revoked_reason"],
                "disclaimer": "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification."
            }

    @classmethod
    def verify_by_code(cls, code: str) -> Dict[str, Any]:
        """
        Public verification by verification code (e.g. HL-2026-XXXX).
        Returns validity status, signer metadata, and signature details.
        """
        sig = cls.lookup_signature(code)
        if not sig:
            return {"is_valid": False, "verification_status": "NOT_FOUND", "signature": None}
        is_valid = sig["status"] == "VALID"
        status_label = "AUTHENTIC_AND_VERIFIED" if is_valid else f"INVALID_{sig['status']}"
        return {
            "is_valid": is_valid,
            "verification_status": status_label,
            "signature": sig
        }

    @classmethod
    def verify_pdf_tamper_and_signature(
        cls,
        pdf_bytes: bytes,
        verification_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Takes raw PDF bytes and checks:
        1. Exact SHA-256 byte-match against stored signature record.
        2. Cryptographic Ed25519 signature validity using published public key.
        Returns detailed tamper and validity evaluation.
        """
        cls.init_tables()
        pdf_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        record = None
        if verification_code:
            record = cls.lookup_signature(verification_code)
        if not record:
            record = cls.lookup_signature(pdf_sha256)

        if not record:
            return {
                "verified": False,
                "status": "UNRECOGNIZED",
                "tampered": True,
                "error": "No registered cryptographic signature found for this document hash.",
                "computed_sha256": pdf_sha256
            }

        # Check byte-level SHA-256 match
        if record["pdf_sha256"] != pdf_sha256:
            return {
                "verified": False,
                "status": "TAMPERED",
                "tampered": True,
                "error": f"Cryptographic tamper detected: File hash ({pdf_sha256[:16]}...) does not match signed record ({record['pdf_sha256'][:16]}...).",
                "computed_sha256": pdf_sha256,
                "expected_sha256": record["pdf_sha256"],
                "verification_code": record["verification_code"]
            }

        # Cryptographically verify Ed25519 signature
        try:
            pub_bytes = base64.b64decode(record["public_key_b64"])
            pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
            sig_bytes = base64.b64decode(record["signature_b64"])
            pub_key.verify(sig_bytes, record["canonical_message"].encode("utf-8"))
            signature_valid = True
        except (InvalidSignature, Exception):
            signature_valid = False

        if not signature_valid:
            return {
                "verified": False,
                "status": "INVALID_SIGNATURE",
                "tampered": True,
                "error": "Ed25519 cryptographic signature verification failed.",
                "computed_sha256": pdf_sha256
            }

        return {
            "verified": True,
            "status": record["status"],
            "tampered": False,
            "version": record["version"],
            "verification_code": record["verification_code"],
            "signer_name": record["signer_name"],
            "signer_role": record["signer_role"],
            "signer_designation": record.get("signer_designation") or "Head of Quality Assurance",
            "organization_name": record["organization_name"],
            "invoice_number": record["invoice_number"],
            "heat_numbers": record["heat_numbers"],
            "signed_at": record["signed_at"],
            "pdf_sha256": record["pdf_sha256"],
            "upstream_sha256": record["upstream_sha256"],
            "key_id": record["key_id"],
            "public_key_b64": record["public_key_b64"],
            "disclaimer": "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification."
        }


# Initialize tables on load
CryptoSigningService.init_tables()
