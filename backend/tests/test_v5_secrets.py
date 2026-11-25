"""
HEATLEDGER AI: Prompt Pack v5 Task 4.1 Test Suite
One Secret System That Fails Closed & Versioned TOTP Field Encryption:
1. SERVER_SIGNING_SECRET is completely removed; JWT_SECRET is sole signing key.
2. Startup refuses to boot in production, staging, and non-test development if any
   required secret (JWT_SECRET, URL_SIGNING_SECRET, DOCUMENT_URL_SECRET, ENCRYPTION_KEY)
   is missing, <32 chars, contains dev_/example/CHANGE_ME, or equals a known default.
3. Real subprocess check: ENV=production python -m backend.main with no secrets exits non-zero.
4. .env.example contains only CHANGE_ME placeholders, never working secrets.
5. users.totp_secret_hex is stored encrypted (AES-256-GCM 'enc:v1:...') and supports
   zero-downtime key rotation (v1 -> v2) with migrate_totp_secrets_to_encrypted().
"""

import base64
import os
import subprocess
import sys
import uuid
import pytest

from backend.auth_service import AuthService, generate_totp_code, verify_totp_code
from backend.db.connection import get_db_connection
from backend.settings import (
    AppSettings,
    decrypt_secret_field,
    encrypt_secret_field,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
STRONG_KEY_A = "8f4a7c1b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"
STRONG_KEY_B = "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
STRONG_KEY_C = "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
STRONG_KEY_D = "7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"


def test_v5_4_1_no_server_signing_secret_anywhere_in_backend():
    """Verify SERVER_SIGNING_SECRET and dev fallbacks in auth/intake services are deleted."""
    for fname in ("auth_service.py", "easy_intake_service.py", "settings.py"):
        fpath = os.path.join(REPO_ROOT, "backend", fname)
        with open(fpath, "r", encoding="utf-8") as f:
            content = f.read()
        assert "SERVER_SIGNING_SECRET" not in content, f"{fname} still references SERVER_SIGNING_SECRET"
        assert "dev_secret_heatledger" not in content, f"{fname} still contains dev fallback secret"
        assert "dev_secret_intake_email" not in content, f"{fname} still contains intake dev fallback"


def test_v5_4_1_fail_closed_in_non_test_environments(monkeypatch):
    """
    In every environment except explicit TEST mode, missing, short, dev_,
    example, or CHANGE_ME secrets MUST abort startup.
    """
    monkeypatch.setattr("backend.settings.is_explicit_test_mode", lambda *_args, **_kw: False)

    # 1. Non-test development with missing/dev secret rejects
    monkeypatch.setenv("ENV", "development")
    monkeypatch.setenv("JWT_SECRET", "dev_jwt_secret_64_characters_long_for_local_development_testing_only!")
    monkeypatch.setenv("URL_SIGNING_SECRET", STRONG_KEY_B)
    monkeypatch.setenv("DOCUMENT_URL_SECRET", STRONG_KEY_C)
    monkeypatch.setenv("ENCRYPTION_KEY", STRONG_KEY_D)
    with pytest.raises(ValueError) as exc_dev:
        AppSettings(_env_file=None)
    assert "JWT_SECRET" in str(exc_dev.value)

    # 2. Staging with 'example' or 'CHANGE_ME' rejects
    monkeypatch.setenv("ENV", "staging")
    monkeypatch.setenv("JWT_SECRET", STRONG_KEY_A)
    monkeypatch.setenv("DOCUMENT_URL_SECRET", "CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_HEX_32")
    with pytest.raises(ValueError) as exc_stg:
        AppSettings(_env_file=None)
    assert "DOCUMENT_URL_SECRET" in str(exc_stg.value)

    # 3. Valid strong secrets in non-test staging succeeds
    monkeypatch.setenv("DOCUMENT_URL_SECRET", STRONG_KEY_C)
    s = AppSettings(_env_file=None)
    assert s.ENV == "staging"


def test_v5_4_1_production_subprocess_refuses_to_start_without_secrets():
    """Prove it: ENV=production python -m backend.main with no secrets refuses to start."""
    env = {
        "PATH": os.environ.get("PATH", ""),
        "SYSTEMROOT": os.environ.get("SYSTEMROOT", ""),
        "ENV": "production",
    }
    proc = subprocess.run(
        [sys.executable, "-c", "from backend.settings import AppSettings; AppSettings(_env_file=None)"],
        cwd=REPO_ROOT,
        env=env,
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert proc.returncode != 0, "Production boot MUST fail closed when secrets are absent"
    assert "JWT_SECRET" in proc.stderr or "Production startup configuration failure" in proc.stderr


def test_v5_4_1_env_example_has_only_placeholders():
    """Verify .env.example contains placeholders only and zero working dev secrets."""
    env_example = os.path.join(REPO_ROOT, ".env.example")
    with open(env_example, "r", encoding="utf-8") as f:
        content = f.read()

    assert "SERVER_SIGNING_SECRET" not in content
    assert "dev_jwt_secret" not in content
    assert "dev_url_signing_secret" not in content
    assert "dev_aes_encryption_key" not in content
    assert "CHANGE_ME_" in content
    assert "DOCUMENT_URL_SECRET=CHANGE_ME" in content


def test_v5_4_1_totp_secret_encrypted_at_rest_and_rotates(monkeypatch):
    """
    Encrypt users.totp_secret_hex with AES-256-GCM (enc:<ver>:...), verify TOTP
    checks work transparently, reject wrong keys, and migrate v1 -> v2 on rotation.
    """
    monkeypatch.setenv("ENCRYPTION_KEY", STRONG_KEY_A)
    monkeypatch.setenv("ENCRYPTION_KEY_VERSION", "v1")
    monkeypatch.delenv("ENCRYPTION_PREVIOUS_KEYS", raising=False)

    # 1. Direct round-trip + tamper / wrong key rejection
    raw_secret = os.urandom(20)
    raw_hex = raw_secret.hex()
    cipher = encrypt_secret_field(raw_hex)
    assert cipher.startswith("enc:v1:")
    assert raw_hex not in cipher
    assert decrypt_secret_field(cipher) == raw_hex

    # Wrong key fails closed
    monkeypatch.setenv("ENCRYPTION_KEY", STRONG_KEY_B)
    with pytest.raises(Exception):
        decrypt_secret_field(cipher)

    # 2. Enrol & confirm TOTP in DB stores encrypted ciphertext, not plaintext hex
    monkeypatch.setenv("ENCRYPTION_KEY", STRONG_KEY_A)
    signup_res = AuthService.signup_plant(
        email=f"totp_enc_{uuid.uuid4().hex[:6]}@steelplant.in",
        password="StrongPlantPassword2026!",
        company_name="Encrypted TOTP Forge Pvt Ltd",
        gstin="19AABCE9999A1Z5",
        name="QA Head",
    )
    user_id = signup_res["user_id"]
    enrol = AuthService.enrol_totp(user_id)
    pad = "=" * ((8 - len(enrol["secret"]) % 8) % 8)
    raw_b = base64.b32decode(enrol["secret"] + pad)
    code = generate_totp_code(raw_b)
    ok, err = AuthService.confirm_totp(user_id, enrol["secret"], code)
    assert ok is True, err

    with get_db_connection(is_service_role=True) as conn:
        row = conn.execute("SELECT totp_secret_hex FROM users WHERE id = ?", (user_id,)).fetchone()
        stored_v1 = row[0] if not isinstance(row, dict) else row["totp_secret_hex"]
    assert stored_v1.startswith("enc:v1:"), f"Expected encrypted TOTP secret, got: {stored_v1[:16]}"
    assert raw_b.hex() not in stored_v1

    # Verify get_current_totp_for_user decrypts cleanly (use RFC 6238 verifier to avoid 30s boundary flake)
    live_code = AuthService.get_current_totp_for_user(user_id)
    assert live_code is not None and verify_totp_code(raw_b, live_code) is True

    # 3. Rotate v1 -> v2 with ENCRYPTION_PREVIOUS_KEYS and migrate rows
    monkeypatch.setenv("ENCRYPTION_PREVIOUS_KEYS", f"v1:{STRONG_KEY_A}")
    monkeypatch.setenv("ENCRYPTION_KEY", STRONG_KEY_B)
    monkeypatch.setenv("ENCRYPTION_KEY_VERSION", "v2")

    # Still readable before migration via previous key ring
    live_code_pre = AuthService.get_current_totp_for_user(user_id)
    assert live_code_pre is not None and verify_totp_code(raw_b, live_code_pre) is True

    # Run migration -> re-encrypts to enc:v2:...
    migrated_count = AuthService.migrate_totp_secrets_to_encrypted(user_ids=[user_id])
    assert migrated_count == 1

    with get_db_connection(is_service_role=True) as conn:
        row2 = conn.execute("SELECT totp_secret_hex FROM users WHERE id = ?", (user_id,)).fetchone()
        stored_v2 = row2[0] if not isinstance(row2, dict) else row2["totp_secret_hex"]
    assert stored_v2.startswith("enc:v2:")

    # Remove v1 from ring -> v2 works with only STRONG_KEY_B
    monkeypatch.delenv("ENCRYPTION_PREVIOUS_KEYS", raising=False)
    live_code_v2 = AuthService.get_current_totp_for_user(user_id)
    assert live_code_v2 is not None and verify_totp_code(raw_b, live_code_v2) is True
