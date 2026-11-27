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
    from backend.db.connection import get_db_connection as _raw_get_db_connection, SQLITE_DB_PATH as DB_PATH
    from backend.settings import (
        decrypt_secret_field,
        encrypt_secret_field,
        get_encryption_key_version,
        get_jwt_key_ring,
        get_jwt_secret,
    )
except ImportError:
    from db.connection import get_db_connection as _raw_get_db_connection, SQLITE_DB_PATH as DB_PATH
    from settings import (
        decrypt_secret_field,
        encrypt_secret_field,
        get_encryption_key_version,
        get_jwt_key_ring,
        get_jwt_secret,
    )

def get_db_connection(*args, **kwargs):
    if "is_service_role" not in kwargs:
        kwargs["is_service_role"] = True
    return _raw_get_db_connection(*args, **kwargs)

ACCESS_TOKEN_EXPIRY_SECONDS = 900  # 15 Minutes (Prompt S2 Requirement)
JWT_EXPIRY_SECONDS = ACCESS_TOKEN_EXPIRY_SECONDS
REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 86400  # 30 Days (Prompt S2 Requirement)
STEP_UP_VALIDITY_SECONDS = 600  # 10 Minutes (Prompt H2 Requirement)

# Password Hasher & Breached Passwords Engine (Argon2id)
_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)

COMMON_PASSWORDS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "top_10k_passwords.txt")
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


def generate_totp_code(secret_bytes: Union[bytes, str], time_step: int = 30) -> str:
    """
    Standard RFC 6238 Time-Based One-Time Password (TOTP) algorithm.
    Generates authentic 6-digit code for current time window.
    Accepts raw bytes, base32 string, hex string, or ascii string.
    """
    if isinstance(secret_bytes, str):
        secret_str = secret_bytes.strip()
        try:
            import base64
            secret_bytes = base64.b32decode(secret_str, casefold=True)
        except Exception:
            try:
                secret_bytes = bytes.fromhex(secret_str)
            except Exception:
                secret_bytes = secret_str.encode("utf-8")

    counter = int(time.time() // time_step)
    msg = struct.pack(">Q", counter)
    h = hmac.new(secret_bytes, msg, hashlib.sha1).digest()
    offset = h[-1] & 0x0F
    code_int = ((h[offset] & 0x7F) << 24 |
                (h[offset + 1] & 0xFF) << 16 |
                (h[offset + 2] & 0xFF) << 8 |
                (h[offset + 3] & 0xFF)) % 1000000
    return f"{code_int:06d}"


def verify_totp_code(secret_bytes: Union[bytes, str], code: str, time_step: int = 30) -> bool:
    """
    Verifies 6-digit TOTP code across current and adjacent ±1 time window (clock drift tolerance).
    Accepts raw bytes, base32 string, hex string, or ascii string.
    """
    cleaned = code.strip()
    if not cleaned.isdigit() or len(cleaned) != 6:
        return False

    if isinstance(secret_bytes, str):
        secret_str = secret_bytes.strip()
        try:
            import base64
            secret_bytes = base64.b32decode(secret_str, casefold=True)
        except Exception:
            try:
                secret_bytes = bytes.fromhex(secret_str)
            except Exception:
                secret_bytes = secret_str.encode("utf-8")

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

