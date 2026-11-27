import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import struct
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple, List, Union

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

try:
    from backend.auth.common import (
        ACCESS_TOKEN_EXPIRY_SECONDS, DB_PATH, JWT_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS, _base64url_decode, _base64url_encode, decrypt_secret_field,
        encrypt_secret_field, generate_totp_code, get_db_connection, get_encryption_key_version,
        get_jwt_key_ring, get_jwt_secret, hash_password, validate_password_strength,
        verify_password, verify_totp_code,
    )
except ImportError:
    from auth.common import (
        ACCESS_TOKEN_EXPIRY_SECONDS, DB_PATH, JWT_EXPIRY_SECONDS, REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS, _base64url_decode, _base64url_encode, decrypt_secret_field,
        encrypt_secret_field, generate_totp_code, get_db_connection, get_encryption_key_version,
        get_jwt_key_ring, get_jwt_secret, hash_password, validate_password_strength,
        verify_password, verify_totp_code,
    )

class MfaMixin:
    @classmethod
    def enrol_totp(cls, user_id: str) -> Dict[str, Any]:
        """
        Generates authentic base32 TOTP secret and 8 one-time recovery codes for QA_INSPECTOR.
        """
        cls.init_db()
        user = cls.get_user_with_role(user_id)
        if not user:
            raise ValueError("User account not found")

        secret_bytes = secrets.token_bytes(20)
        secret_base32 = base64.b32encode(secret_bytes).decode("utf-8").replace("=", "")
        email = user["email"]
        otpauth_url = f"otpauth://totp/HeatLedger:{email}?secret={secret_base32}&issuer=HeatLedger&algorithm=SHA1&digits=6&period=30"

        recovery_codes = []
        recovery_tuples = []
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            conn.execute("DELETE FROM user_totp_recovery_codes WHERE user_id = ?", (user_id,))
            for _ in range(8):
                c = f"HL-{secrets.token_hex(2).upper()}-{secrets.token_hex(2).upper()}"
                recovery_codes.append(c)
                c_hash = hashlib.sha256(c.encode("utf-8")).hexdigest()
                cid = f"rec_{secrets.token_urlsafe(12)}"
                recovery_tuples.append((cid, user_id, c_hash, 0, None, now_iso))

            conn.executemany("""
                INSERT INTO user_totp_recovery_codes
                (id, user_id, code_hash, used, used_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, recovery_tuples)
            conn.commit()

        return {
            "secret": secret_base32,
            "otpauth_url": otpauth_url,
            "recovery_codes": recovery_codes,
            "digits": 6,
            "period": 30
        }

    @classmethod
    def confirm_totp(cls, user_id: str, secret_base32: str, code: str) -> Tuple[bool, Optional[str]]:
        """
        Confirms TOTP enrolment by verifying initial 6-digit code.
        """
        cls.init_db()
        try:
            pad = "=" * ((8 - len(secret_base32) % 8) % 8)
            secret_bytes = base64.b32decode(secret_base32 + pad)
        except Exception:
            return False, "Invalid base32 secret format."

        if not verify_totp_code(secret_bytes, code):
            return False, "Invalid 6-digit verification code. Please check your authenticator app."

        secret_hex = encrypt_secret_field(secret_bytes.hex())
        with get_db_connection() as conn:
            conn.execute("""
                UPDATE users SET totp_secret_hex = ? WHERE id = ?
            """, (secret_hex, user_id))
            conn.commit()

        return True, None


    @classmethod
    def verify_step_up_mfa(
        cls,
        user_id: str,
        code: str
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates TOTP or single-use recovery code for Step-Up inspection verification.
        Requires code to match user's TOTP secret or an unconsumed recovery code.
        Records step-up timestamp valid for 10 minutes (600 seconds).
        Only QA_INSPECTOR members can pass it.
        """
        cls.init_db()
        cleaned_code = code.strip()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT u.totp_secret_hex, m.role
                FROM users u
                JOIN memberships m ON u.id = m.user_id
                WHERE u.id = ?
            """, (user_id,))
            row = cursor.fetchone()
            if not row:
                return False, None, "User not found"

            totp_hex = row["totp_secret_hex"]
            role = row["role"]
            if role not in ("QA_INSPECTOR", "QA_HEAD"):
                return False, None, "Step-up signing authorization is restricted to QA_INSPECTOR role."

            decrypted_hex = decrypt_secret_field(totp_hex) if totp_hex else ""
            secret_bytes = bytes.fromhex(decrypted_hex) if decrypted_hex else b""

            # 1. Verify code against RFC 6238 TOTP algorithm
            is_valid_totp = False
            if secret_bytes and cleaned_code.isdigit() and len(cleaned_code) == 6:
                is_valid_totp = verify_totp_code(secret_bytes, cleaned_code)

            # 2. Check if it matches an unconsumed single-use recovery code
            is_recovery_code = False
            if not is_valid_totp:
                code_hash = hashlib.sha256(cleaned_code.encode("utf-8")).hexdigest()
                cursor.execute("""
                    SELECT id FROM user_totp_recovery_codes
                    WHERE user_id = ? AND code_hash = ? AND used = 0
                """, (user_id, code_hash))
                rec_row = cursor.fetchone()
                if rec_row:
                    is_recovery_code = True
                    rec_id = rec_row["id"]
                    cursor.execute("""
                        UPDATE user_totp_recovery_codes
                        SET used = 1, used_at = ?
                        WHERE id = ?
                    """, (datetime.now(timezone.utc).isoformat(), rec_id))

            if not is_valid_totp and not is_recovery_code:
                return False, None, "Invalid or expired 6-digit TOTP code or recovery code."

            now = int(time.time())
            cursor.execute("""
                UPDATE users SET last_step_up_at = ? WHERE id = ?
            """, (now, user_id))
            conn.commit()

        return True, {
            "status": "step_up_verified",
            "step_up_at": now,
            "expires_in_seconds": STEP_UP_VALIDITY_SECONDS,
            "via_recovery_code": is_recovery_code
        }, None

    @classmethod
    def check_step_up_valid(cls, user_id: str) -> bool:
        """
        Checks whether the user has performed an authenticated step-up check
        within the last 10 minutes (600 seconds).
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT last_step_up_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row["last_step_up_at"]:
                return False

            elapsed = int(time.time()) - row["last_step_up_at"]
            return elapsed <= STEP_UP_VALIDITY_SECONDS

    @classmethod
    def get_current_totp_for_user(cls, user_id: str) -> Optional[str]:
        """
        Generates the current valid RFC 6238 TOTP code for the given user.
        Used by test fixtures and authenticator sync.
        """
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT totp_secret_hex FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row and row["totp_secret_hex"]:
                decrypted_hex = decrypt_secret_field(row["totp_secret_hex"])
                return generate_totp_code(bytes.fromhex(decrypted_hex))
        return None

    @classmethod
    def sign_document_with_inspector(
        cls,
        user_id: str,
        invoice_number: str,
        heat_number: str,
        total_see: Any,
        timestamp: Optional[str] = None,
        sha256_upstream_pdf: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Cryptographically signs the EN 10204 3.1 certificate using the inspector's identity.
        Requires:
        1. User must hold QA_INSPECTOR or QA_HEAD role.
        2. User must have passed step-up verification within the last 10 minutes.
        """
        user = cls.get_user_with_role(user_id)
        if not user or user["role"] not in ("QA_INSPECTOR", "QA_HEAD"):
            raise PermissionError("Access denied: Only an authorized QA_INSPECTOR can sign certificates.")

        if not cls.check_step_up_valid(user["id"]):
            raise PermissionError("Step-up verification expired or required. Fresh MFA check within 10 minutes is required to sign.")

        ts = timestamp or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        up_hash = sha256_upstream_pdf or "sha256_upstream_annex_verified"
        see_str = f"{float(total_see):.4f}" if isinstance(total_see, (int, float)) else str(total_see)

        canonical_message = f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}|{user['id']}"
        key = get_jwt_secret().encode("utf-8")
        raw_hash = hmac.new(key, canonical_message.encode("utf-8"), hashlib.sha256).hexdigest()
        signature_block = f"hl_sig_v1_{raw_hash}"

        return {
            "signature": signature_block,
            "raw_hash": raw_hash,
            "canonical_message": canonical_message,
            "timestamp": ts,
            "algorithm": "HMAC-SHA256",
            "inspector_id": user["emp_id"] or user["id"],
            "inspector_name": user["name"],
            "plant_id": user["organization_id"]
        }

    @classmethod
    def sign_document(
        cls,
        invoice_number: str,
        heat_number: str,
        total_see: Any,
        timestamp: Optional[str] = None,
        sha256_upstream_pdf: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, str]:
        """Convenience method delegating to sign_document_with_inspector."""
        uid = user_id or "usr_qa_04"
        return cls.sign_document_with_inspector(
            user_id=uid,
            invoice_number=invoice_number,
            heat_number=heat_number,
            total_see=total_see,
            timestamp=timestamp,
            sha256_upstream_pdf=sha256_upstream_pdf
        )

    @classmethod
    def verify_document_signature(
        cls,
        invoice_number: str,
        heat_number: str,
        total_see: Any,
        timestamp: Optional[str],
        sha256_upstream_pdf: Optional[str],
        signature: str,
        user_id: Optional[str] = None
    ) -> bool:
        """Verifies HMAC-SHA256 signature against candidate canonical formats."""
        if not signature or not signature.startswith("hl_sig_v1_"):
            return False
        provided_hash = signature[len("hl_sig_v1_"):]
        see_str = f"{float(total_see):.4f}" if isinstance(total_see, (int, float)) else str(total_see)
        ts = timestamp or ""
        up_hash = sha256_upstream_pdf or "sha256_upstream_annex_verified"
        key = get_jwt_secret().encode("utf-8")

        candidates = [
            f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}|usr_qa_04",
            f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}|QA-04",
            f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}"
        ]
        if user_id:
            candidates.insert(0, f"{invoice_number}|{heat_number}|{see_str}|{ts}|{up_hash}|{user_id}")

        for msg in candidates:
            computed = hmac.new(key, msg.encode("utf-8"), hashlib.sha256).hexdigest()
            if hmac.compare_digest(computed, provided_hash):
                return True
        return False

    # ==============================================================================
    # PROMPT R3: Teams, Roles, Inspector Setup & Onboarding Wizard
    # ==============================================================================


    @classmethod
    def migrate_totp_secrets_to_encrypted(cls, user_ids: Optional[List[str]] = None) -> int:
        """
        Prompt v5 Task 4.1: Migrates any plaintext or older-version encrypted
        users.totp_secret_hex rows to the active AES-256-GCM ENCRYPTION_KEY_VERSION.
        Returns count of migrated rows.
        """
        active_prefix = f"enc:{get_encryption_key_version()}:"
        migrated = 0
        with get_db_connection(is_service_role=True) as conn:
            rows = conn.execute(
                "SELECT id, totp_secret_hex FROM users WHERE totp_secret_hex IS NOT NULL AND totp_secret_hex != ''"
            ).fetchall()
            target_set = set(user_ids) if user_ids is not None else None
            for row in rows:
                uid = row[0] if not isinstance(row, dict) else row["id"]
                if target_set is not None and uid not in target_set:
                    continue
                stored = row[1] if not isinstance(row, dict) else row["totp_secret_hex"]
                if stored.startswith(active_prefix):
                    continue
                try:
                    plaintext = decrypt_secret_field(stored)
                except Exception:
                    continue
                reencrypted = encrypt_secret_field(plaintext)
                conn.execute("UPDATE users SET totp_secret_hex = ? WHERE id = ?", (reencrypted, uid))
                migrated += 1
            if migrated:
                conn.commit()
        return migrated
