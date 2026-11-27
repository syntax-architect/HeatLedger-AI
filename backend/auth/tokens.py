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

class TokensMixin:
    @classmethod
    def create_jwt(cls, payload: Optional[Dict[str, Any]] = None, **kwargs) -> str:
        """Issues an HMAC-SHA256 signed JWT token."""
        claims = dict(payload) if payload else {}
        if kwargs:
            if "user_id" in kwargs:
                claims.setdefault("sub", kwargs["user_id"])
                claims.setdefault("user_id", kwargs["user_id"])
            if "email" in kwargs:
                claims.setdefault("email", kwargs["email"])
            if "role" in kwargs:
                claims.setdefault("role", kwargs["role"])
            if "organization_id" in kwargs:
                claims.setdefault("org_id", kwargs["organization_id"])
            for k, v in kwargs.items():
                claims.setdefault(k, v)

        now = int(time.time())
        claims.setdefault("iat", now)
        claims.setdefault("exp", now + ACCESS_TOKEN_EXPIRY_SECONDS)
        claims.setdefault("iss", "HeatLedger-Auth-Engine")
        claims.setdefault("aud", "HeatLedger-API")

        active_kid, ring = get_jwt_key_ring()
        key = ring[active_kid].encode("utf-8")
        header = {"alg": "HS256", "typ": "JWT", "kid": active_kid}

        header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
        payload_bytes = json.dumps(claims, separators=(",", ":")).encode("utf-8")

        encoded_header = _base64url_encode(header_bytes)
        encoded_payload = _base64url_encode(payload_bytes)

        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        signature = hmac.new(key, signing_input, hashlib.sha256).digest()
        encoded_sig = _base64url_encode(signature)

        return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

    @classmethod
    def verify_jwt(cls, token: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Verifies JWT with strict security checks (Prompt Pack v5 Task 4.3):
        - Fixed algorithm HS256 (rejects 'none' and algorithm confusion attacks)
        - Required key id (kid) resolved against JWT key ring for rotation
        - Constant-time HMAC-SHA256 verification
        - Required iss ('HeatLedger-Auth-Engine'), aud ('HeatLedger-API'), and numeric exp
        """
        try:
            parts = token.strip().split(".")
            if len(parts) != 3:
                return False, None, "Invalid JWT token structure"

            encoded_header, encoded_payload, encoded_sig = parts
            header_bytes = _base64url_decode(encoded_header)
            header = json.loads(header_bytes.decode("utf-8"))

            if not isinstance(header, dict):
                return False, None, "Invalid JWT header format"
            if header.get("alg") != "HS256":
                return False, None, f"Unsupported or insecure JWT algorithm: {header.get('alg')}"
            if header.get("typ") not in (None, "JWT"):
                return False, None, "Invalid JWT token type"

            kid = header.get("kid")
            _, ring = get_jwt_key_ring()
            if not kid or kid not in ring:
                return False, None, f"Unknown or missing JWT key id (kid): {kid}"

            key = ring[kid].encode("utf-8")
            signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
            expected_sig = hmac.new(key, signing_input, hashlib.sha256).digest()
            actual_sig = _base64url_decode(encoded_sig)

            if not hmac.compare_digest(expected_sig, actual_sig):
                return False, None, "Cryptographic signature verification failed"

            payload_bytes = _base64url_decode(encoded_payload)
            payload = json.loads(payload_bytes.decode("utf-8"))
            if not isinstance(payload, dict):
                return False, None, "Invalid JWT payload format"

            if payload.get("iss") != "HeatLedger-Auth-Engine":
                return False, None, "Invalid JWT issuer (iss)"
            aud = payload.get("aud")
            if aud != "HeatLedger-API" and not (isinstance(aud, list) and "HeatLedger-API" in aud):
                return False, None, "Invalid JWT audience (aud)"

            exp = payload.get("exp")
            if not isinstance(exp, (int, float)):
                return False, None, "Missing or invalid JWT expiration (exp)"
            if time.time() > exp:
                return False, None, "JWT token has expired"

            return True, payload, None
        except Exception as e:
            return False, None, f"Token decode error: {str(e)}"


    @classmethod
    def create_otp(cls, email: str, purpose: str, ttl_minutes: int = 15) -> str:
        """
        Generates a 6-digit numeric OTP, invalidates prior unused OTPs for the same
        (email, purpose), and persists its SHA-256 hash in auth_otp_codes.
        """
        cls.init_db()
        email_clean = (email or "").strip().lower()
        otp = f"{secrets.randbelow(1000000):06d}"
        otp_hash = hashlib.sha256(f"{purpose}:{email_clean}:{otp}".encode("utf-8")).hexdigest()
        now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat()
        expires_iso = (now_dt + timedelta(minutes=ttl_minutes)).isoformat()
        otp_id = f"otp_{secrets.token_urlsafe(10)}"

        with get_db_connection(is_service_role=True) as conn:
            conn.execute(
                "UPDATE auth_otp_codes SET used = 1 WHERE email = ? AND purpose = ? AND used = 0",
                (email_clean, purpose),
            )
            conn.execute("""
                INSERT INTO auth_otp_codes (id, email, purpose, otp_hash, attempts, expires_at, used, created_at)
                VALUES (?, ?, ?, ?, 0, ?, 0, ?)
            """, (otp_id, email_clean, purpose, otp_hash, expires_iso, now_iso))
            conn.commit()
        return otp

    @classmethod
    def verify_otp(cls, email: str, purpose: str, otp: str, consume: bool = True) -> Tuple[bool, Optional[str]]:
        """
        Verifies a 6-digit OTP against auth_otp_codes with 5-attempt lockout and expiry checks.
        """
        cls.init_db()
        email_clean = (email or "").strip().lower()
        otp_clean = (otp or "").strip()
        if not otp_clean.isdigit() or len(otp_clean) != 6:
            return False, "Please enter a valid 6-digit verification code."

        now_iso = datetime.now(timezone.utc).isoformat()
        candidate_hash = hashlib.sha256(f"{purpose}:{email_clean}:{otp_clean}".encode("utf-8")).hexdigest()

        with get_db_connection(is_service_role=True) as conn:
            row = conn.execute("""
                SELECT id, otp_hash, attempts, expires_at
                FROM auth_otp_codes
                WHERE email = ? AND purpose = ? AND used = 0
                ORDER BY created_at DESC
                LIMIT 1
            """, (email_clean, purpose)).fetchone()
            if not row:
                return False, "Verification code is invalid or has expired. Please request a new code."

            otp_id = row["id"]
            stored_hash = row["otp_hash"]
            attempts = int(row["attempts"] or 0)
            expires_at = row["expires_at"]

            if expires_at < now_iso:
                conn.execute("UPDATE auth_otp_codes SET used = 1 WHERE id = ?", (otp_id,))
                conn.commit()
                return False, "Verification code has expired. Please request a new code."

            if attempts >= 5:
                conn.execute("UPDATE auth_otp_codes SET used = 1 WHERE id = ?", (otp_id,))
                conn.commit()
                return False, "Too many incorrect attempts. Please request a new verification code."

            if not hmac.compare_digest(stored_hash, candidate_hash):
                conn.execute("UPDATE auth_otp_codes SET attempts = attempts + 1 WHERE id = ?", (otp_id,))
                conn.commit()
                remaining = max(0, 4 - attempts)
                return False, f"Incorrect 6-digit code. {remaining} attempt(s) remaining."

            if consume:
                conn.execute("UPDATE auth_otp_codes SET used = 1 WHERE id = ?", (otp_id,))
                conn.commit()

        return True, None

    @classmethod
    def verify_email_with_otp(cls, email: str, otp: str) -> Tuple[bool, Optional[str]]:
        """Verifies a newly registered user's email address using their 6-digit OTP."""
        ok, err = cls.verify_otp(email, "EMAIL_VERIFY", otp, consume=True)
        if not ok:
            return False, err

        email_clean = (email or "").strip().lower()
        with get_db_connection(is_service_role=True) as conn:
            conn.execute("UPDATE users SET email_verified = 1 WHERE email = ?", (email_clean,))
            conn.execute("UPDATE email_verification_tokens SET verified = 1 WHERE email = ?", (email_clean,))
            conn.commit()
        return True, None

    @classmethod
    def resend_verification_email(cls, email: str) -> Tuple[bool, str]:
        """Generates and sends a fresh 6-digit OTP and verification link if the account is unverified."""
        cls.init_db()
        email_clean = (email or "").strip().lower()
        uniform_msg = "If this account exists and requires verification, a new 6-digit code and link have been sent."
        if "@" not in email_clean:
            return True, uniform_msg

        with get_db_connection(is_service_role=True) as conn:
            row = conn.execute(
                "SELECT id, email_verified FROM users WHERE email = ? AND is_active = 1",
                (email_clean,),
            ).fetchone()
            if not row or bool(row["email_verified"]):
                return True, uniform_msg
            user_id = row["id"]

            mem = conn.execute("SELECT organization_id FROM memberships WHERE user_id = ? LIMIT 1", (user_id,)).fetchone()
            org_id = mem["organization_id"] if mem else "org_system"

            verif_token = secrets.token_urlsafe(32)
            verif_token_hash = hashlib.sha256(verif_token.encode("utf-8")).hexdigest()
            now_iso = datetime.now(timezone.utc).isoformat()
            expires_iso = datetime.fromtimestamp(time.time() + 86400, timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO email_verification_tokens (token_hash, user_id, email, created_at, expires_at, verified)
                VALUES (?, ?, ?, ?, ?, 0)
            """, (verif_token_hash, user_id, email_clean, now_iso, expires_iso))
            conn.commit()

        otp_code = cls.create_otp(email_clean, "EMAIL_VERIFY", ttl_minutes=15)
        try:
            try:
                from email_service import EmailService
            except ImportError:
                from backend.email_service import EmailService
            app_url = os.getenv("APP_URL", "http://localhost:3000")
            verify_url = f"{app_url}/verify-email?token={verif_token}"
            subj, txt, htm = EmailService.render_email_verification(verify_url, otp_code=otp_code)
            EmailService.send_email(
                to=email_clean,
                subject=subj,
                html=htm,
                text=txt,
                organization_id=org_id,
                template_name="email_verification",
            )
        except Exception:
            pass
        return True, uniform_msg


    @classmethod
    def verify_email(cls, token: str) -> Tuple[bool, Optional[str]]:
        """
        Prompt Pack v5 Task 4.2: Single-use 24-hour email verification token check.
        Verifies SHA-256 token hash, marks token consumed and sets users.email_verified = 1.
        """
        cls.init_db()
        if not token or not token.strip():
            return False, "Invalid or missing verification token."

        token_hash = hashlib.sha256(token.strip().encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection(is_service_role=True) as conn:
            row = conn.execute("""
                SELECT user_id, expires_at, verified FROM email_verification_tokens WHERE token_hash = ?
            """, (token_hash,)).fetchone()
            if not row:
                return False, "Verification link is invalid or has expired."

            user_id = row[0] if not isinstance(row, dict) else row["user_id"]
            expires_at = row[1] if not isinstance(row, dict) else row["expires_at"]
            verified = row[2] if not isinstance(row, dict) else row["verified"]

            if verified == 1 or expires_at < now_iso:
                return False, "Verification link has already been used or has expired."

            conn.execute("UPDATE email_verification_tokens SET verified = 1 WHERE token_hash = ?", (token_hash,))
            conn.execute("UPDATE users SET email_verified = 1 WHERE id = ?", (user_id,))
            conn.commit()

        return True, None

