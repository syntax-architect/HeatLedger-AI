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

class LoginRateLimiter:
    """
    Database-backed rate limiter tracking failed attempts per IP and per Email.
    Persists lockout and progressive exponential backoff in `auth_rate_limits`.
    """
    _lock = threading.RLock()
    _table_ready = False
    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 900  # 15 minutes
    _DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQxMjM0NTY3OA$c29tZWR1bW15aGFzaGZvcnRpbWluZ3BhZGRpbmc"

    @classmethod
    def _ensure_table(cls, conn) -> None:
        if cls._table_ready:
            return
        conn.execute("""
            CREATE TABLE IF NOT EXISTS auth_rate_limits (
                rate_key TEXT PRIMARY KEY,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                window_start REAL NOT NULL,
                locked_until REAL NOT NULL DEFAULT 0,
                updated_at REAL NOT NULL
            )
        """)
        conn.commit()
        cls._table_ready = True

    @classmethod
    def _backoff_seconds(cls, attempts: int) -> int:
        if attempts < cls.MAX_ATTEMPTS:
            return 0
        # 5 failures -> 900s (15 min), 6 -> 1800s (30 min), 7+ -> 3600s (60 min)
        exponent = min(2, attempts - cls.MAX_ATTEMPTS)
        return cls.WINDOW_SECONDS * (2 ** exponent)

    @classmethod
    def _keys_for(cls, ip: str, email: str, prefix: str = "login") -> List[str]:
        keys: List[str] = []
        if ip:
            keys.append(f"{prefix}:ip:{ip.strip()}")
        email_norm = (email or "").strip().lower()
        if email_norm:
            keys.append(f"{prefix}:email:{email_norm}")
        return keys

    @classmethod
    def is_locked(cls, ip: str, email: str, prefix: str = "login") -> Tuple[bool, int]:
        now = time.time()
        keys = cls._keys_for(ip, email, prefix=prefix)
        if not keys:
            return False, 0

        with cls._lock:
            with get_db_connection(is_service_role=True) as conn:
                cls._ensure_table(conn)
                max_remaining = 0
                for key in keys:
                    row = conn.execute(
                        "SELECT attempt_count, window_start, locked_until FROM auth_rate_limits WHERE rate_key = ?",
                        (key,)
                    ).fetchone()
                    if not row:
                        continue
                    attempts = row[0] if not isinstance(row, dict) else row["attempt_count"]
                    win_start = row[1] if not isinstance(row, dict) else row["window_start"]
                    locked_until = row[2] if not isinstance(row, dict) else row["locked_until"]

                    if locked_until and locked_until > now:
                        max_remaining = max(max_remaining, int(locked_until - now))
                    elif now - win_start >= cls.WINDOW_SECONDS and locked_until <= now:
                        conn.execute("DELETE FROM auth_rate_limits WHERE rate_key = ?", (key,))
                    elif attempts >= cls.MAX_ATTEMPTS and now - win_start < cls.WINDOW_SECONDS:
                        remaining = int(cls.WINDOW_SECONDS - (now - win_start))
                        max_remaining = max(max_remaining, remaining)
                conn.commit()
                if max_remaining > 0:
                    return True, max(1, max_remaining)
        return False, 0

    @classmethod
    def record_failure(cls, ip: str, email: str, prefix: str = "login"):
        now = time.time()
        keys = cls._keys_for(ip, email, prefix=prefix)
        if not keys:
            return

        with cls._lock:
            with get_db_connection(is_service_role=True) as conn:
                cls._ensure_table(conn)
                for key in keys:
                    row = conn.execute(
                        "SELECT attempt_count, window_start, locked_until FROM auth_rate_limits WHERE rate_key = ?",
                        (key,)
                    ).fetchone()
                    if not row:
                        attempts = 1
                        win_start = now
                        locked_until = 0.0
                    else:
                        prev_attempts = row[0] if not isinstance(row, dict) else row["attempt_count"]
                        prev_start = row[1] if not isinstance(row, dict) else row["window_start"]
                        prev_locked = row[2] if not isinstance(row, dict) else row["locked_until"]
                        if now - prev_start >= cls.WINDOW_SECONDS and prev_locked <= now:
                            attempts = 1
                            win_start = now
                            locked_until = 0.0
                        else:
                            attempts = prev_attempts + 1
                            win_start = prev_start
                            backoff = cls._backoff_seconds(attempts)
                            locked_until = now + backoff if backoff > 0 else prev_locked

                    conn.execute("""
                        INSERT INTO auth_rate_limits
                        (rate_key, attempt_count, window_start, locked_until, updated_at)
                        VALUES (?, ?, ?, ?, ?)
                        ON CONFLICT (rate_key) DO UPDATE SET
                            attempt_count = excluded.attempt_count,
                            window_start = excluded.window_start,
                            locked_until = excluded.locked_until,
                            updated_at = excluded.updated_at
                    """, (key, attempts, win_start, locked_until, now))
                conn.commit()

    @classmethod
    def record_success(cls, ip: str, email: str, prefix: str = "login"):
        keys = cls._keys_for(ip, email, prefix=prefix)
        if not keys:
            return
        with cls._lock:
            with get_db_connection(is_service_role=True) as conn:
                cls._ensure_table(conn)
                for key in keys:
                    conn.execute("DELETE FROM auth_rate_limits WHERE rate_key = ?", (key,))
                conn.commit()

    @classmethod
    def reset(cls):
        with cls._lock:
            with get_db_connection(is_service_role=True) as conn:
                cls._ensure_table(conn)
                conn.execute("DELETE FROM auth_rate_limits")
                try:
                    conn.execute("DELETE FROM rate_limits")
                except Exception:
                    pass
                conn.commit()

    @classmethod
    def reset_for_tests(cls):
        cls.reset()


