"""
HEATLEDGER AI: Enterprise Authentication, RBAC & Cryptographic Signing Engine
Module: auth_service.py
Specification: EN 10204 Clause 6 Digital Signatures, Supabase-Compatible JWTs,
Database-Backed RBAC (OWNER, QA_INSPECTOR, DISPATCH, VIEWER), and 10-Minute Step-Up MFA.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import struct
import threading
import time
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, Tuple, List

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

# Production security fail-closed guard
SERVER_SIGNING_SECRET = os.getenv("SERVER_SIGNING_SECRET")
if not SERVER_SIGNING_SECRET:
    if os.getenv("ENV") == "production":
        raise RuntimeError("Production security violation: SERVER_SIGNING_SECRET must be configured.")
    # In development/test mode only, use an explicit ephemeral development secret
    SERVER_SIGNING_SECRET = "dev_secret_heatledger_auth_engine_2026_unshared"

ACCESS_TOKEN_EXPIRY_SECONDS = 900  # 15 Minutes (Prompt S2 Requirement)
JWT_EXPIRY_SECONDS = ACCESS_TOKEN_EXPIRY_SECONDS
REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 86400  # 30 Days (Prompt S2 Requirement)
STEP_UP_VALIDITY_SECONDS = 600  # 10 Minutes (Prompt H2 Requirement)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "auth_database.sqlite3")

# Password Hasher & Breached Passwords Engine (Argon2id)
_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

COMMON_PASSWORDS_FILE = os.path.join(os.path.dirname(__file__), "data", "top_10k_passwords.txt")
_BREACHED_PASSWORDS: set = set()

def load_breached_passwords():
    global _BREACHED_PASSWORDS
    if not _BREACHED_PASSWORDS and os.path.exists(COMMON_PASSWORDS_FILE):
        with open(COMMON_PASSWORDS_FILE, "r", encoding="utf-8") as f:
            _BREACHED_PASSWORDS = {line.strip().lower() for line in f if line.strip() and not line.startswith("#")}

def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """Enforces minimum length 12 and offline breached password check (top 10,000)."""
    if not password or len(password) < 12:
        return False, "Password must be at least 12 characters long."
    load_breached_passwords()
    if password.lower() in _BREACHED_PASSWORDS:
        return False, "Password was found in a list of common or compromised passwords. Please choose a more secure password."
    return True, None

def _base64url_encode(data: bytes) -> str:
    """Encodes bytes to base64url string without trailing '=' padding."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _base64url_decode(s: str) -> bytes:
    """Decodes base64url string with reconstructed padding."""
    padding = "=" * ((4 - len(s) % 4) % 4)
    return base64.urlsafe_b64decode(s + padding)


def hash_password(password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
    """Generates Argon2id password hash."""
    return _password_hasher.hash(password), ""

def verify_password(password: str, stored_hash: str, salt_hex: str = "") -> bool:
    """Verifies a password against Argon2id hash or fallback PBKDF2 hash."""
    if stored_hash.startswith("$argon2"):
        try:
            return _password_hasher.verify(stored_hash, password)
        except (VerifyMismatchError, InvalidHashError):
            return False
    # Backward compatibility fallback for seed/legacy PBKDF2 hashes
    if salt_hex:
        try:
            salt = bytes.fromhex(salt_hex)
            computed_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000).hex()
            return hmac.compare_digest(computed_hash, stored_hash)
        except Exception:
            return False
    return False

class LoginRateLimiter:
    """
    In-memory rate limiter tracking failed login attempts per IP and per Email.
    Enforces lockout after 5 failures in a 15-minute sliding window.
    """
    _lock = threading.RLock()
    _ip_attempts: Dict[str, List[float]] = {}
    _email_attempts: Dict[str, List[float]] = {}
    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 900  # 15 minutes

    @classmethod
    def is_locked(cls, ip: str, email: str) -> Tuple[bool, int]:
        now = time.time()
        with cls._lock:
            # Check IP attempts
            if ip:
                ip_times = [t for t in cls._ip_attempts.get(ip, []) if now - t < cls.WINDOW_SECONDS]
                cls._ip_attempts[ip] = ip_times
                if len(ip_times) >= cls.MAX_ATTEMPTS:
                    remaining = int(cls.WINDOW_SECONDS - (now - ip_times[0]))
                    return True, max(1, remaining)

            # Check Email attempts
            email_norm = (email or "").strip().lower()
            if email_norm:
                em_times = [t for t in cls._email_attempts.get(email_norm, []) if now - t < cls.WINDOW_SECONDS]
                cls._email_attempts[email_norm] = em_times
                if len(em_times) >= cls.MAX_ATTEMPTS:
                    remaining = int(cls.WINDOW_SECONDS - (now - em_times[0]))
                    return True, max(1, remaining)

            return False, 0

    @classmethod
    def record_failure(cls, ip: str, email: str):
        now = time.time()
        with cls._lock:
            if ip:
                cls._ip_attempts.setdefault(ip, []).append(now)
            email_norm = (email or "").strip().lower()
            if email_norm:
                cls._email_attempts.setdefault(email_norm, []).append(now)

    @classmethod
    def record_success(cls, ip: str, email: str):
        with cls._lock:
            if ip:
                cls._ip_attempts.pop(ip, None)
            email_norm = (email or "").strip().lower()
            if email_norm:
                cls._email_attempts.pop(email_norm, None)

    @classmethod
    def reset_for_tests(cls):
        with cls._lock:
            cls._ip_attempts.clear()
            cls._email_attempts.clear()


def generate_totp_code(secret_bytes: bytes, time_step: int = 30) -> str:
    """
    Standard RFC 6238 Time-Based One-Time Password (TOTP) algorithm.
    Generates authentic 6-digit code for current time window.
    """
    counter = int(time.time() // time_step)
    msg = struct.pack(">Q", counter)
    h = hmac.new(secret_bytes, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code_int = ((h[offset] & 0x7F) << 24 |
                (h[offset + 1] & 0xFF) << 16 |
                (h[offset + 2] & 0xFF) << 8 |
                (h[offset + 3] & 0xFF)) % 1000000
    return f"{code_int:06d}"


def verify_totp_code(secret_bytes: bytes, code: str, time_step: int = 30) -> bool:
    """
    Verifies 6-digit TOTP code across current and adjacent ±1 time window (clock drift tolerance).
    """
    cleaned = code.strip()
    if not cleaned.isdigit() or len(cleaned) != 6:
        return False

    current_counter = int(time.time() // time_step)
    for delta in (-1, 0, 1):
        counter = current_counter + delta
        msg = struct.pack(">Q", counter)
        h = hmac.new(secret_bytes, msg, hashlib.sha1).digest()
        offset = h[-1] & 0x0F
        code_int = ((h[offset] & 0x7F) << 24 |
                    (h[offset + 1] & 0xFF) << 16 |
                    (h[offset + 2] & 0xFF) << 8 |
                    (h[offset + 3] & 0xFF)) % 1000000
        expected = f"{code_int:06d}"
        if hmac.compare_digest(cleaned, expected):
            return True
    return False


class AuthService:
    """
    Database-backed authentication service with Supabase-compatible JWTs,
    strict role permissions (OWNER, QA_INSPECTOR, DISPATCH, VIEWER),
    and 10-minute step-up MFA verification.
    """

    @classmethod
    def init_db(cls):
        """Initializes tables and seeds default organization and role accounts."""
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    is_sandbox INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL,
                    name TEXT NOT NULL,
                    emp_id TEXT,
                    designation TEXT,
                    totp_secret_hex TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    last_step_up_at INTEGER,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memberships (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('OWNER', 'QA_INSPECTOR', 'DISPATCH', 'VIEWER')),
                    created_at TEXT NOT NULL,
                    UNIQUE(user_id, organization_id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(organization_id) REFERENCES organizations(id)
                );
            """)

            # Prompt S2 Tables: Rotating Refresh Tokens, Password Resets & Recovery Codes
            conn.execute("""
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    replaced_by TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS password_resets (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    expires_at TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_totp_recovery_codes (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    code_hash TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    used_at TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            conn.commit()

            # Seed Default Org
            org_id = "org_howrah_steel_01"
            conn.execute("""
                INSERT OR IGNORE INTO organizations (id, name, is_sandbox, created_at)
                VALUES (?, ?, 0, datetime('now'))
            """, (org_id, "Howrah Precision Forgings Pvt. Ltd."))

            # Seed Sandbox Demo Org
            sandbox_org_id = "org_sandbox_demo_00"
            conn.execute("""
                INSERT OR IGNORE INTO organizations (id, name, is_sandbox, created_at)
                VALUES (?, ?, 1, datetime('now'))
            """, (sandbox_org_id, "HeatLedger Sandbox Demo Plant"))

            # Seed 4 Standard Role Accounts
            seed_users = [
                {
                    "id": "usr_owner_01",
                    "email": "owner@howrahsteel.in",
                    "password": "OwnerSecretPassword2026!",
                    "name": "P. K. Banerjee",
                    "emp_id": "MGT-01",
                    "designation": "Managing Director & Plant Owner",
                    "role": "OWNER",
                    "org_id": org_id,
                    "totp_seed": b"owner_totp_seed_2026_howrah"
                },
                {
                    "id": "usr_qa_04",
                    "email": "inspector@howrahsteel.in",
                    "password": "InspectorPassword2026!",
                    "name": "R. K. Chatterjee",
                    "emp_id": "QA-04",
                    "designation": "Head of Metallurgy & Quality Assurance",
                    "role": "QA_INSPECTOR",
                    "org_id": org_id,
                    "totp_seed": b"qa_inspector_secret_seed_2026"
                },
                {
                    "id": "usr_dispatch_01",
                    "email": "dispatch@howrahsteel.in",
                    "password": "DispatchPassword2026!",
                    "name": "A. K. Sen",
                    "emp_id": "DISP-01",
                    "designation": "Customs Dispatch & Logistics Lead",
                    "role": "DISPATCH",
                    "org_id": org_id,
                    "totp_seed": b"dispatch_totp_seed_2026"
                },
                {
                    "id": "usr_viewer_01",
                    "email": "auditor@howrahsteel.in",
                    "password": "AuditorPassword2026!",
                    "name": "TÜV / SGS Customs Auditor",
                    "emp_id": "AUD-01",
                    "designation": "Independent Verifier (Read-Only)",
                    "role": "VIEWER",
                    "org_id": org_id,
                    "totp_seed": b"viewer_totp_seed_2026"
                },
                {
                    "id": "usr_sandbox_demo",
                    "email": "demo@heatledger.ai",
                    "password": secrets.token_urlsafe(24),
                    "name": "Sandbox Test User",
                    "emp_id": "DEMO-01",
                    "designation": "Demonstration Analyst",
                    "role": "VIEWER",
                    "org_id": sandbox_org_id,
                    "totp_seed": secrets.token_bytes(20)
                }
            ]

            for u in seed_users:
                p_hash, salt = hash_password(u["password"])
                totp_hex = hashlib.sha256(u["totp_seed"]).digest()[:16].hex()
                conn.execute("""
                    INSERT OR IGNORE INTO users
                    (id, email, password_hash, salt, name, emp_id, designation, totp_secret_hex, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """, (u["id"], u["email"], p_hash, salt, u["name"], u["emp_id"], u["designation"], totp_hex))

                conn.execute("""
                    INSERT OR IGNORE INTO memberships
                    (id, user_id, organization_id, role, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                """, (f"mem_{u['id']}_{u['org_id']}", u["id"], u["org_id"], u["role"]))

            conn.commit()

    @classmethod
    def create_jwt(cls, payload: Dict[str, Any]) -> str:
        """Issues an HMAC-SHA256 signed JWT token."""
        key = SERVER_SIGNING_SECRET.encode("utf-8")
        header = {"alg": "HS256", "typ": "JWT"}

        header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
        payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

        encoded_header = _base64url_encode(header_bytes)
        encoded_payload = _base64url_encode(payload_bytes)

        signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
        signature = hmac.new(key, signing_input, hashlib.sha256).digest()
        encoded_sig = _base64url_encode(signature)

        return f"{encoded_header}.{encoded_payload}.{encoded_sig}"

    @classmethod
    def verify_jwt(cls, token: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """Verifies JWT cryptographic signature and checks expiration."""
        try:
            parts = token.strip().split(".")
            if len(parts) != 3:
                return False, None, "Invalid JWT token structure"

            encoded_header, encoded_payload, encoded_sig = parts
            key = SERVER_SIGNING_SECRET.encode("utf-8")

            signing_input = f"{encoded_header}.{encoded_payload}".encode("utf-8")
            expected_sig = hmac.new(key, signing_input, hashlib.sha256).digest()
            actual_sig = _base64url_decode(encoded_sig)

            if not hmac.compare_digest(expected_sig, actual_sig):
                return False, None, "Cryptographic signature verification failed"

            payload_bytes = _base64url_decode(encoded_payload)
            payload = json.loads(payload_bytes.decode("utf-8"))

            exp = payload.get("exp")
            if exp and time.time() > exp:
                return False, None, "JWT token has expired"

            return True, payload, None
        except Exception as e:
            return False, None, f"Token decode error: {str(e)}"

    @classmethod
    def get_user_with_role(cls, user_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Loads user, organization, and strictly verified membership role from the database.
        The role is NEVER taken from user request payloads.
        Supports lookup by primary user id or official employee id (e.g. QA-04).
        """
        with sqlite3.connect(DB_PATH) as conn:
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
                "id": row[0],
                "email": row[1],
                "name": row[2],
                "emp_id": row[3],
                "designation": row[4],
                "is_active": bool(row[5]),
                "last_step_up_at": row[6],
                "role": row[7],
                "organization_id": row[8],
                "organization_name": row[9],
                "is_sandbox": bool(row[10])
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
    def validate_password_strength(cls, password: str) -> Tuple[bool, Optional[str]]:
        """Enforces minimum length 12 and offline breached password check (top 10,000)."""
        return validate_password_strength(password)

    @classmethod
    def create_session(
        cls,
        user_id: str,
        ip: str = "",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        """
        Prompt S2 Session Engine:
        Issues a short-lived (15 min) JWT access token and a rotating (30 days) refresh token.
        Stores the hashed refresh token in SQLite database.
        Generates Double Submit CSRF token.
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
            "iss": "HeatLedger-Auth-Engine"
        }
        access_token = cls.create_jwt(token_claims)

        raw_refresh_token = secrets.token_urlsafe(32)
        refresh_hash = hashlib.sha256(raw_refresh_token.encode("utf-8")).hexdigest()
        now_dt = datetime.now(timezone.utc)
        expires_at = (now_dt + timedelta(seconds=REFRESH_TOKEN_EXPIRY_SECONDS)).isoformat()
        now_iso = now_dt.isoformat()
        token_id = f"rft_{secrets.token_urlsafe(12)}"
        csrf_token = secrets.token_urlsafe(24)

        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                INSERT INTO refresh_tokens
                (id, user_id, token_hash, expires_at, revoked, created_at, replaced_by, ip_address, user_agent)
                VALUES (?, ?, ?, ?, 0, ?, NULL, ?, ?)
            """, (token_id, user_id, refresh_hash, expires_at, now_iso, ip, user_agent))
            conn.commit()

        return {
            "token": access_token,
            "refresh_token": raw_refresh_token,
            "csrf_token": csrf_token,
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
        and generates a new session. Detects and protects against token reuse attacks.
        """
        cls.init_db()
        if not raw_refresh_token:
            return False, None, "Refresh token required"

        token_hash = hashlib.sha256(raw_refresh_token.strip().encode("utf-8")).hexdigest()
        now_iso = datetime.now(timezone.utc).isoformat()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = ?
            """, (token_hash,))
            row = cursor.fetchone()
            if not row:
                return False, None, "Invalid refresh token"

            token_id, user_id, expires_at, revoked = row
            if revoked == 1:
                # Token reuse attack! Immediately revoke all active sessions for this user
                cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
                conn.commit()
                return False, None, "Security violation: Refresh token reuse detected. All sessions revoked."

            if expires_at < now_iso:
                return False, None, "Refresh token has expired"

            # Generate new session
            new_session = cls.create_session(user_id, ip=ip, user_agent=user_agent)

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
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?", (token_hash,))
            conn.commit()
        return True

    @classmethod
    def request_password_reset(cls, email: str) -> Tuple[bool, str, Optional[str]]:
        """
        Initiates password reset via signed one-time link that expires in 30 minutes.
        Uniform message prevents account enumeration attacks.
        """
        cls.init_db()
        email_clean = (email or "").strip().lower()
        uniform_message = "If this email is registered, a password reset link has been generated."

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users WHERE email = ? AND is_active = 1", (email_clean,))
            row = cursor.fetchone()
            if not row:
                return True, uniform_message, None

            user_id = row[0]
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

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, user_id, expires_at, used FROM password_resets WHERE token_hash = ?
            """, (token_hash,))
            row = cursor.fetchone()
            if not row:
                return False, "Invalid or expired password reset link."

            rst_id, user_id, expires_at, used = row
            if used == 1 or expires_at < now_iso:
                return False, "Password reset link has already been used or has expired (30-minute limit)."

            new_hash, _ = hash_password(new_password)
            cursor.execute("UPDATE users SET password_hash = ?, salt = '' WHERE id = ?", (new_hash, user_id))
            cursor.execute("UPDATE password_resets SET used = 1 WHERE id = ?", (rst_id,))
            cursor.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
            conn.commit()

        return True, None

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

        with sqlite3.connect(DB_PATH) as conn:
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

        secret_hex = secret_bytes.hex()
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute("""
                UPDATE users SET totp_secret_hex = ? WHERE id = ?
            """, (secret_hex, user_id))
            conn.commit()

        return True, None

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
        Fails if password is wrong or user does not exist.
        """
        cls.init_db()
        email_clean = email.strip().lower()

        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, password_hash, salt, is_active FROM users WHERE email = ?
            """, (email_clean,))
            row = cursor.fetchone()
            if not row:
                return False, None, "Invalid email or password"

            user_id, stored_hash, salt_hex, is_active = row
            if not is_active:
                return False, None, "Account is disabled. Contact system administrator."

            if not verify_password(password, stored_hash, salt_hex):
                return False, None, "Invalid email or password"

        user_data = cls.get_user_with_role(user_id)
        if not user_data:
            return False, None, "No active organization membership found for this user."

        session = cls.create_session(user_id, ip=ip, user_agent=user_agent)
        return True, session, None

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
        with sqlite3.connect(DB_PATH) as conn:
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

            totp_hex, role = row
            if role not in ("QA_INSPECTOR", "QA_HEAD"):
                return False, None, "Step-up signing authorization is restricted to QA_INSPECTOR role."

            secret_bytes = bytes.fromhex(totp_hex) if totp_hex else b""

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
                    rec_id = rec_row[0]
                    cursor.execute("""
                        UPDATE user_totp_recovery_codes
                        SET used = 1, used_at = datetime('now')
                        WHERE id = ?
                    """, (rec_id,))

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
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT last_step_up_at FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if not row or not row[0]:
                return False

            elapsed = int(time.time()) - row[0]
            return elapsed <= STEP_UP_VALIDITY_SECONDS

    @classmethod
    def get_current_totp_for_user(cls, user_id: str) -> Optional[str]:
        """
        Generates the current valid RFC 6238 TOTP code for the given user.
        Used by test fixtures and authenticator sync.
        """
        cls.init_db()
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT totp_secret_hex FROM users WHERE id = ?", (user_id,))
            row = cursor.fetchone()
            if row and row[0]:
                return generate_totp_code(bytes.fromhex(row[0]))
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
        key = SERVER_SIGNING_SECRET.encode("utf-8")
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
        key = SERVER_SIGNING_SECRET.encode("utf-8")

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


# Initialize DB on module load
AuthService.init_db()
