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

class AuthSchemaMixin:
    _db_initialized: bool = False

    @classmethod
    def init_db(cls):
        """Initializes tables and seeds default organization and role accounts."""
        is_test_runner = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
        if cls._db_initialized and not is_test_runner:
            return
        with get_db_connection(is_service_role=True) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS organizations (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    slug TEXT,
                    is_sandbox INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
            """)
            conn.commit()
            for alter_sql in (
                "ALTER TABLE organizations ADD COLUMN slug TEXT",
                "ALTER TABLE organizations ADD COLUMN is_sandbox INTEGER DEFAULT 0",
            ):
                try:
                    conn.execute(alter_sql)
                    conn.commit()
                except Exception:
                    conn.rollback()
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
                    email_verified INTEGER NOT NULL DEFAULT 1,
                    last_step_up_at INTEGER,
                    created_at TEXT NOT NULL
                );
            """)
            conn.commit()
            try:
                conn.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 1")
                conn.commit()
            except Exception:
                conn.rollback()
            conn.execute("""
                CREATE TABLE IF NOT EXISTS email_verification_tokens (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    email TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    verified INTEGER NOT NULL DEFAULT 0
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_rate_limits (
                    rate_key TEXT PRIMARY KEY,
                    attempt_count INTEGER NOT NULL DEFAULT 0,
                    window_start REAL NOT NULL,
                    locked_until REAL NOT NULL DEFAULT 0,
                    updated_at REAL NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_otp_codes (
                    id TEXT PRIMARY KEY,
                    email TEXT NOT NULL,
                    purpose TEXT NOT NULL,
                    otp_hash TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    expires_at TEXT NOT NULL,
                    used INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
            """)
            LoginRateLimiter._table_ready = True
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memberships (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('OWNER', 'QA_HEAD', 'QA_INSPECTOR', 'EXPORT_DOC', 'DISPATCH', 'VIEWER', 'CONSULTANT', 'PLATFORM_ADMIN', 'ADMIN')),
                    created_at TEXT NOT NULL,
                    UNIQUE(user_id, organization_id),
                    FOREIGN KEY(user_id) REFERENCES users(id),
                    FOREIGN KEY(organization_id) REFERENCES organizations(id)
                );
            """)
            if not getattr(conn, "_is_pg", False):
                try:
                    m_ddl = conn.execute(
                        "SELECT sql FROM sqlite_master WHERE type='table' AND name='memberships'"
                    ).fetchone()
                    if m_ddl and "'PLATFORM_ADMIN'" not in (m_ddl[0] or ""):
                        conn.execute("""
                            CREATE TABLE memberships_v5 (
                                id TEXT PRIMARY KEY,
                                user_id TEXT NOT NULL,
                                organization_id TEXT NOT NULL,
                                role TEXT NOT NULL CHECK(role IN ('OWNER', 'QA_HEAD', 'QA_INSPECTOR', 'EXPORT_DOC', 'DISPATCH', 'VIEWER', 'CONSULTANT', 'PLATFORM_ADMIN', 'ADMIN')),
                                created_at TEXT NOT NULL,
                                UNIQUE(user_id, organization_id),
                                FOREIGN KEY(user_id) REFERENCES users(id),
                                FOREIGN KEY(organization_id) REFERENCES organizations(id)
                            )
                        """)
                        conn.execute("""
                            INSERT INTO memberships_v5 (id, user_id, organization_id, role, created_at)
                            SELECT id, user_id, organization_id, role, created_at FROM memberships
                        """)
                        conn.execute("DROP TABLE memberships")
                        conn.execute("ALTER TABLE memberships_v5 RENAME TO memberships")
                except Exception:
                    pass

            # Prompt S2 Tables: Rotating Refresh Tokens (with family tracking), Password Resets & Recovery Codes
            conn.execute("""
                CREATE TABLE IF NOT EXISTS refresh_tokens (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    token_hash TEXT NOT NULL UNIQUE,
                    family_id TEXT,
                    expires_at TEXT NOT NULL,
                    revoked INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL,
                    replaced_by TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            conn.commit()
            try:
                conn.execute("ALTER TABLE refresh_tokens ADD COLUMN family_id TEXT")
                conn.commit()
            except Exception:
                conn.rollback()
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

            # Prompt A2 & Item 8: Seed sample data only if DEMO_MODE=true or in test environment
            is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
            is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
            if is_demo or is_test:
                # Seed Default Org
                org_id = "org_howrah_steel_01"
                conn.execute("""
                    INSERT OR IGNORE INTO organizations (id, name, slug, is_sandbox, created_at)
                    VALUES (?, ?, 'howrah-steel', 0, datetime('now'))
                """, (org_id, "Howrah Precision Forgings Pvt. Ltd."))

                # Seed Sandbox Demo Org
                sandbox_org_id = "org_sandbox_demo_00"
                conn.execute("""
                    INSERT OR IGNORE INTO organizations (id, name, slug, is_sandbox, created_at)
                    VALUES (?, ?, 'sandbox-demo', 1, datetime('now'))
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
                    raw_totp_hex = hashlib.sha256(u["totp_seed"]).digest()[:16].hex()
                    totp_hex = encrypt_secret_field(raw_totp_hex)
                    conn.execute("""
                        INSERT OR IGNORE INTO users
                        (id, email, password_hash, salt, name, emp_id, designation, totp_secret_hex, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                    """, (u["id"], u["email"], p_hash, salt, u["name"], u["emp_id"], u["designation"], totp_hex))
                    # Ensure seed user TOTP remains readable across test runs / key changes
                    existing_totp = conn.execute("SELECT totp_secret_hex FROM users WHERE id = ?", (u["id"],)).fetchone()
                    if existing_totp and existing_totp[0]:
                        try:
                            dec = decrypt_secret_field(existing_totp[0])
                            if not existing_totp[0].startswith(f"enc:{get_encryption_key_version()}:"):
                                conn.execute("UPDATE users SET totp_secret_hex = ? WHERE id = ?", (encrypt_secret_field(dec), u["id"]))
                        except Exception:
                            conn.execute("UPDATE users SET totp_secret_hex = ? WHERE id = ?", (totp_hex, u["id"]))

                    conn.execute("""
                        INSERT OR IGNORE INTO memberships
                        (id, user_id, organization_id, role, created_at)
                        VALUES (?, ?, ?, ?, datetime('now'))
                    """, (f"mem_{u['id']}_{u['org_id']}", u["id"], u["org_id"], u["role"]))

                conn.commit()
        cls._db_initialized = True

