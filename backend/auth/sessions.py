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

class SessionsMixin:
    @classmethod
    def get_user_with_role(cls, user_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Loads user, organization, and strictly verified membership role from the database.
        The role is NEVER taken from user request payloads.
        Supports lookup by primary user id or official employee id (e.g. QA-04).
        """
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if organization_id:
                cursor.execute("""
                    SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                           u.last_step_up_at, m.role, o.id as org_id, o.name as org_name, o.is_sandbox
                    FROM users u
                    JOIN memberships m ON u.id = m.user_id
                    JOIN organizations o ON m.organization_id = o.id
                    WHERE (u.id = ? OR u.emp_id = ?) AND o.id = ? AND u.is_active = 1
                    LIMIT 1
                """, (user_id, user_id, organization_id))
            else:
                cursor.execute("""
                    SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                           u.last_step_up_at, m.role, o.id as org_id, o.name as org_name, o.is_sandbox
                    FROM users u
                    JOIN memberships m ON u.id = m.user_id
                    JOIN organizations o ON m.organization_id = o.id
                    WHERE (u.id = ? OR u.emp_id = ?) AND u.is_active = 1
                    LIMIT 1
                """, (user_id, user_id))
            row = cursor.fetchone()
            if not row and organization_id:
                cursor.execute("""
                    SELECT u.id, u.email, u.name, u.emp_id, u.designation, u.is_active,
                           u.last_step_up_at, m.role, o.id as org_id, o.name as org_name, o.is_sandbox
                    FROM users u
                    JOIN memberships m ON u.id = m.user_id
                    JOIN organizations o ON m.organization_id = o.id
                    WHERE (u.id = ? OR u.emp_id = ?) AND u.is_active = 1
                    LIMIT 1
                """, (user_id, user_id))
                row = cursor.fetchone()

            if not row:
                return None

            return {
                "id": row["id"],
                "email": row["email"],
                "name": row["name"],
                "emp_id": row["emp_id"],
                "designation": row["designation"],
                "is_active": bool(row["is_active"]),
                "last_step_up_at": row["last_step_up_at"],
                "role": row["role"],
                "organization_id": row["org_id"],
                "organization_name": row["org_name"],
                "is_sandbox": bool(row["is_sandbox"])
            }

    @classmethod
    def check_rate_limit(cls, ip: str, email: str) -> Tuple[bool, int]:
        """Checks if login attempts are rate-limited for this IP or email."""
        return LoginRateLimiter.is_locked(ip, email)

    @classmethod
    def record_login_failure(cls, ip: str, email: str):
        """Records a failed login attempt for rate limiting."""
        LoginRateLimiter.record_failure(ip, email)

    @classmethod
    def record_login_success(cls, ip: str, email: str):
        """Clears failure counter for this IP and email upon successful authentication."""
        LoginRateLimiter.record_success(ip, email)


    @classmethod
    def create_session(
        cls,
        user_id: str,
        ip: str = "",
        user_agent: str = "",
        family_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Prompt S2 & Pack v5 Task 4.3 Session Engine:
        Issues a short-lived (15 min) JWT access token and a rotating (30 days) refresh token
        bound to a session token family (`family_id`) for reuse detection.
        Stores the hashed refresh token in database and generates Double Submit CSRF token.
        """
        cls.init_db()
        user_data = cls.get_user_with_role(user_id)
        if not user_data:
            raise ValueError("User not found or inactive")

        now = int(time.time())
        token_claims = {
            "sub": user_data["id"],
            "user_id": user_data["id"],
            "email": user_data["email"],
            "name": user_data["name"],
            "role": user_data["role"],
            "org_id": user_data["organization_id"],
            "org_name": user_data["organization_name"],
            "iat": now,
            "exp": now + ACCESS_TOKEN_EXPIRY_SECONDS,
            "iss": "HeatLedger-Auth-Engine",
            "aud": "HeatLedger-API",
        }
        access_token = cls.create_jwt(token_claims)

        raw_refresh_token = secrets.token_urlsafe(32)
        refresh_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
        now_dt = datetime.now(timezone.utc)
        expires_at = (now_dt + timedelta(seconds=REFRESH_TOKEN_EXPIRY_SECONDS)).isoformat()
        now_iso = now_dt.isoformat()
        token_id = f"rft_{secrets.token_urlsafe(12)}"
        active_family = family_id or f"fam_{secrets.token_hex(8)}"
        csrf_token = secrets.token_urlsafe(24)

        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO refresh_tokens
                (id, user_id, token_hash, family_id, expires_at, revoked, created_at, replaced_by, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?)
            """, (token_id, user_id, refresh_hash, active_family, expires_at, now_iso, ip, user_agent))
            conn.commit()

        return {
            "token": access_token,
            "refresh_token": raw_refresh_token,
            "csrf_token": csrf_token,
            "family_id": active_family,
            "user": user_data,
            "expires_in": ACCESS_TOKEN_EXPIRY_SECONDS
        }

    @classmethod
    def rotate_refresh_token(
        cls,
        raw_refresh_token: str,
        ip: str = "",
        user_agent: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Rotates refresh token: validates existing token, marks it revoked,
        and generates a new session within the same token family.
        If an already-revoked token is replayed, revokes the ENTIRE token family immediately.
        """
        cls.init_db()
        if not raw_refresh_token:
            return False, None, "Refresh token required"

        token_hash = hashlib.sha256(raw_refresh_token.strip().encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, expires_at, revoked, family_id FROM refresh_tokens WHERE token_hash = ?
            """, (token_hash,))
            row = cursor.fetchone()
            if not row:
                return False, None, "Invalid refresh token"

            token_id = row["id"]
            user_id = row["user_id"]
            expires_at = row["expires_at"]
            revoked = row["revoked"]
            family_id = row["family_id"] if "family_id" in row.keys() else None
            if revoked == 1:
                # Token reuse attack! Immediately revoke the ENTIRE token family (plus user sessions if legacy null family)
                if family_id:
                    cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE family_id = ?", (family_id,))
                else:
                    cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
                conn.commit()
                return False, None, "Security violation: Refresh token reuse detected. Token family revoked."

            if expires_at < now_iso:
                return False, None, "Refresh token has expired"

            # Generate new session preserving the same family_id
            new_session = cls.create_session(user_id, ip=ip, user_agent=user_agent, family_id=family_id)

            # Mark old token as revoked and replaced
            cursor.execute("""
                UPDATE refresh_tokens SET revoked = 1, replaced_by = ? WHERE id = ?
            """, (new_session["refresh_token"][:16], token_id))
            conn.commit()

        return True, new_session, None

    @classmethod
    def revoke_refresh_token(cls, raw_refresh_token: str) -> bool:
        """Revokes a refresh token on logout."""
        cls.init_db()
        if not raw_refresh_token:
            return False
        token_hash = hashlib.sha256(raw_refresh_token.strip().encode("utf-8")).hexdigest()
        with get_db_connection() as conn:
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?", (token_hash,))
            conn.commit()
        return True


    @classmethod
    def authenticate_credentials(
        cls,
        username: str,
        password: str = "",
        role: Optional[str] = None,
        ip: str = "",
        user_agent: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Backward-compatible credential authenticator supporting username aliases and database verification.
        """
        cls.init_db()
        username_clean = (username or "").strip().lower()

        # Handle sandbox demo role / user
        if role == "SANDBOX_DEMO" or username_clean == "demo":
            env = os.getenv("ENV", "development").lower()
            demo_mode = os.getenv("DEMO_MODE", "true" if env != "production" else "false").lower() == "true"
            if env == "production" or not demo_mode:
                return False, None, "Demo account is disabled in production or when DEMO_MODE is off."
            user_data = cls.get_user_with_role("usr_sandbox_demo")
            if not user_data:
                return False, None, "Sandbox demo account not found"
            session = cls.create_session("usr_sandbox_demo", ip=ip, user_agent=user_agent)
            return True, session, None

        # Usernames mapping
        email_map = {
            "rkc": "inspector@howrahsteel.in",
            "qa-04": "inspector@howrahsteel.in",
            "inspector": "inspector@howrahsteel.in",
            "owner": "owner@howrahsteel.in",
            "dispatch": "dispatch@howrahsteel.in",
            "auditor": "auditor@howrahsteel.in",
            "viewer": "auditor@howrahsteel.in",
        }
        resolved_email = email_map.get(username_clean, username_clean)

        if not password:
            return False, None, "Password required for authentication"

        return cls.authenticate_email_password(resolved_email, password, ip=ip, user_agent=user_agent)

    @classmethod
    def verify_inspector_pin(cls, pin: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Fixed PIN authentication is permanently disabled.
        All step-up signing requires authentic RFC 6238 TOTP codes.
        """
        return False, None, "Fixed PINs have been permanently disabled. Use RFC 6238 TOTP step-up authentication."

    @classmethod
    def authenticate_email_password(
        cls,
        email: str,
        password: str,
        ip: str = "",
        user_agent: str = ""
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Authenticates against database-stored Argon2id or legacy PBKDF2 credentials.
        Fails if password is wrong, user does not exist, or email is unverified (403).
        """
        cls.init_db()
        email_clean = email.strip().lower()

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, password_hash, salt, is_active, COALESCE(email_verified, 1) AS email_verified FROM users WHERE email = ?
            """, (email_clean,))
            row = cursor.fetchone()
            if not row:
                # Constant-time dummy verify to equalize response timing for non-existent accounts
                try:
                    _password_hasher.verify(LoginRateLimiter._DUMMY_HASH, password or "dummy")
                except Exception:
                    pass
                return False, None, "Invalid email or password"

            user_id = row["id"]
            stored_hash = row["password_hash"]
            salt_hex = row["salt"]
            is_active = row["is_active"]
            email_verified = row["email_verified"]
            if not verify_password(password, stored_hash, salt_hex):
                return False, None, "Invalid email or password"

            if not is_active:
                return False, None, "Account is disabled. Contact system administrator."

            if not bool(email_verified):
                return False, {"code": "EMAIL_NOT_VERIFIED"}, "Email address not verified. Please verify your email before logging in."

        user_data = cls.get_user_with_role(user_id)
        if not user_data:
            return False, None, "No active organization membership found for this user."

        session = cls.create_session(user_id, ip=ip, user_agent=user_agent)
        return True, session, None


    @classmethod
    def revoke_all_sessions(cls, user_id: str) -> bool:
        """
        Prompt A5: Revoke all active sessions and refresh tokens across all devices for a user.
        """
        cls.init_db()
        with get_db_connection(is_service_role=True) as conn:
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
            conn.commit()
        return True

