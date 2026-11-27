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

try:
    from backend.auth.rate_limit import LoginRateLimiter
except ImportError:
    from auth.rate_limit import LoginRateLimiter

class PasswordsMixin:
    @classmethod
    def validate_password_strength(cls, password: str) -> Tuple[bool, Optional[str]]:
        """Enforces minimum length 12 and offline breached password check (top 10,000)."""
        return validate_password_strength(password)


    @classmethod
    def request_password_reset(cls, email: str) -> Tuple[bool, str, Optional[str]]:
        """
        Initiates password reset via signed one-time link that expires in 30 minutes.
        Uniform message and equalized timing prevent account enumeration attacks.
        """
        cls.init_db()
        email_clean = (email or "").strip().lower()
        uniform_message = "If this email is registered, a password reset link has been generated."

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ? AND is_active = 1", (email_clean,))
            row = cursor.fetchone()
            if not row:
                # Constant-time dummy work to equalize timing for unknown emails
                _ = hashlib.sha256(secrets.token_urlsafe(32).encode("utf-8")).hexdigest()
                try:
                    _password_hasher.verify(LoginRateLimiter._DUMMY_HASH, "dummy_password_for_timing_only")
                except Exception:
                    pass
                return True, uniform_message, None

            user_id = row["id"]
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
            now_dt = datetime.now(timezone.utc)
            expires_at = (now_dt + timedelta(minutes=30)).isoformat()
            now_iso = now_dt.isoformat()

            reset_id = f"rst_{secrets.token_urlsafe(12)}"
            conn.execute("""
                INSERT INTO password_resets (id, user_id, token_hash, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, ?)
            """, (reset_id, user_id, token_hash, expires_at, now_iso))
            conn.commit()

        return True, uniform_message, raw_token

    @classmethod
    def reset_password_with_token(cls, token: str, new_password: str) -> Tuple[bool, Optional[str]]:
        """
        Resets user password after validating 30-minute signed token and password complexity.
        Revokes all existing refresh sessions for that user upon completion.
        """
        cls.init_db()
        is_strong, err = validate_password_strength(new_password)
        if not is_strong:
            return False, err

        token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?
            """, (token_hash,))
            row = cursor.fetchone()
            if not row:
                return False, "Invalid or expired password reset link."

            rst_id = row["id"]
            user_id = row["user_id"]
            expires_at = row["expires_at"]
            used = row["used"]
            if used == 1 or expires_at < now_iso:
                return False, "Password reset link has already been used or has expired (30-minute limit)."

            new_hash, _ = hash_password(new_password)
            cursor.execute("UPDATE users SET password_hash = ?, salt = '' WHERE id = ?", (new_hash, user_id))
            cursor.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (rst_id,))
            cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
            conn.commit()

        return True, None


    @classmethod
    def reset_password_with_otp(cls, email: str, otp: str, new_password: str) -> Tuple[bool, Optional[str]]:
        """Resets user password after validating a 6-digit OTP and password strength."""
        cls.init_db()
        is_strong, err = validate_password_strength(new_password)
        if not is_strong:
            return False, err

        ok, otp_err = cls.verify_otp(email, "PASSWORD_RESET", otp, consume=True)
        if not ok:
            return False, otp_err

        email_clean = (email or "").strip().lower()
        with get_db_connection(is_service_role=True) as conn:
            row = conn.execute("SELECT id FROM users WHERE email = ? AND is_active = 1", (email_clean,)).fetchone()
            if not row:
                return False, "Account not found or inactive."
            user_id = row["id"]
            new_hash, _ = hash_password(new_password)
            conn.execute("UPDATE users SET password_hash = ?, salt = '' WHERE id = ?", (new_hash, user_id))
            conn.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
            conn.commit()
        return True, None

