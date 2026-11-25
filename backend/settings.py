"""
HEATLEDGER AI: Prompt Pack v4 D1 & Prompt Pack v5 Task 4.1 - Single Secret System
Built with pydantic-settings. Every variable has a type, description, and strict validation.
- Single signing secret: JWT_SECRET is the sole session & signature signing secret.
- Separate purpose-specific keys: JWT_SECRET, URL_SIGNING_SECRET, DOCUMENT_URL_SECRET,
  ENCRYPTION_KEY (with versioned key rotation), and inbound webhook secrets.
- Fail-closed startup: In EVERY environment except an explicit local TEST mode, the app
  refuses to start if any required secret is missing, shorter than 32 characters,
  contains 'dev_', 'example', 'changeme', or matches a known default.
- Versioned AES-256-GCM field encryption helpers for users.totp_secret_hex and sensitive fields.
"""

import base64
import hashlib
import os
import secrets
import sys
from functools import lru_cache
from typing import Dict, List, Optional, Tuple, Union

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

KNOWN_INSECURE_SECRETS = {
    "default_secret",
    "secret",
    "changeme",
    "change_me",
    "password",
    "admin",
    "123456",
}

FORBIDDEN_SECRET_SUBSTRINGS = (
    "dev_",
    "example",
    "changeme",
    "change_me",
    "placeholder",
    "replace_with",
)


def is_explicit_test_mode(env_value: Optional[str] = None) -> bool:
    """
    Returns True ONLY when explicitly executing inside an automated test runner
    or ENV=test/testing. Local dev, staging, and production all return False.
    """
    env_clean = (env_value if env_value is not None else os.getenv("ENV", "development")).strip().lower()
    if env_clean in ("test", "testing"):
        return True
    if os.getenv("PYTEST_CURRENT_TEST") is not None:
        return True
    if "pytest" in sys.modules:
        return True
    return False


def _get_ephemeral_test_secret(key_name: str) -> str:
    """
    Returns an ephemeral per-process test secret stored in sys (shared across
    both 'settings' and 'backend.settings' imports) ONLY in explicit test mode.
    Never used outside test mode, and never a hardcoded constant string.
    """
    cache: Optional[Dict[str, str]] = getattr(sys, "_hl_ephemeral_test_secrets", None)
    if cache is None:
        cache = {}
        setattr(sys, "_hl_ephemeral_test_secrets", cache)
    if key_name not in cache:
        cache[key_name] = secrets.token_hex(32)
    return cache[key_name]


def _is_secret_insecure(secret_val: Optional[str]) -> Optional[str]:
    """
    Validates a secret value against length, known insecure values, and forbidden markers.
    Returns an error description string if invalid, or None if strong.
    """
    if not secret_val or len(secret_val.strip()) < 32:
        return "must be set and at least 32 characters"
    val_clean = secret_val.strip()
    val_lower = val_clean.lower()
    if val_clean in KNOWN_INSECURE_SECRETS or val_lower in KNOWN_INSECURE_SECRETS:
        return "equals a known insecure default secret"
    for marker in FORBIDDEN_SECRET_SUBSTRINGS:
        if marker in val_lower:
            return f"contains forbidden marker '{marker}'"
    if "default" in val_lower or "heatledger" in val_lower:
        return "contains weak placeholder keyword"
    return None


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

    # 1. Environment & Brand
    ENV: str = Field(
        default="development",
        description="Active deployment environment: test, local, development, staging, production"
    )
    BRAND_NAME: str = Field(
        default="HeatLedger AI",
        description="White-labeled brand name for exporter UI and documents"
    )
    DEMO_MODE: bool = Field(
        default=False,
        description="Demo mode toggle. Strictly forbidden in production paths."
    )

    # 2. Database & Storage
    DATABASE_URL: Optional[str] = Field(
        default=None,
        description="PostgreSQL / Supabase connection URI (postgresql://...)"
    )
    SQLITE_DB_PATH: str = Field(
        default="auth_database.sqlite3",
        description="Local SQLite fallback path when DATABASE_URL is not set"
    )

    # 3. Cryptography & Security Secrets (Single Source of Truth — NO hardcoded dev fallbacks)
    JWT_SECRET: str = Field(
        default="",
        description="Sole HMAC-SHA256 secret for user session & signature tokens (minimum 32 chars)"
    )
    JWT_KEY_ID: str = Field(
        default="k1",
        description="Active key identifier (kid) emitted in JWT headers for key rotation"
    )
    JWT_PREVIOUS_KEYS: Optional[str] = Field(
        default=None,
        description="Comma-separated 'kid:secret' entries for zero-downtime JWT verification rotation"
    )
    URL_SIGNING_SECRET: str = Field(
        default="",
        description="HMAC-SHA256 secret for signed buyer share URLs (minimum 32 chars)"
    )
    DOCUMENT_URL_SECRET: str = Field(
        default="",
        description="HMAC-SHA256 secret for short-lived document download tokens (minimum 32 chars)"
    )
    ENCRYPTION_KEY: str = Field(
        default="",
        description="Symmetric AES-256-GCM master key for database field encryption (minimum 32 chars)"
    )
    ENCRYPTION_KEY_VERSION: str = Field(
        default="v1",
        description="Active encryption key version identifier for key rotation"
    )
    ENCRYPTION_PREVIOUS_KEYS: Optional[str] = Field(
        default=None,
        description="Comma-separated 'version:secret' entries for zero-downtime key rotation"
    )

    # 4. Webhook & Internal Secrets
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = Field(
        default=None,
        description="HMAC-SHA256 signature secret for Razorpay webhook validation"
    )
    INTAKE_EMAIL_WEBHOOK_SECRET: Optional[str] = Field(
        default=None,
        description="HMAC-SHA256 signature secret for inbound email webhooks"
    )
    WHATSAPP_APP_SECRET: Optional[str] = Field(
        default=None,
        description="HMAC-SHA256 secret for Meta WhatsApp inbound webhook validation"
    )
    WHATSAPP_VERIFY_TOKEN: Optional[str] = Field(
        default=None,
        description="Verification challenge token for Meta WhatsApp webhook setup"
    )
    CRON_SECRET: Optional[str] = Field(
        default=None,
        description="Shared bearer secret authenticating internal cron cleanup requests"
    )

    # 5. CORS Origins Allowlist
    ALLOWED_ORIGINS: Union[List[str], str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173"
        ],
        description="Allowed CORS HTTP origins. In production: no wildcard, no localhost"
    )

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # 6. External API Services
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="Google Gemini API key for vision OCR escalation"
    )
    LOCAL_PARSER_ONLY: bool = Field(
        default=False,
        description="If True, bypasses external Gemini model escalation"
    )

    # 7. Razorpay Payment Gateway
    RAZORPAY_KEY_ID: Optional[str] = Field(
        default=None,
        description="Razorpay key ID (rzp_test_... in dev/staging, rzp_live_... in prod)"
    )
    RAZORPAY_KEY_SECRET: Optional[str] = Field(
        default=None,
        description="Razorpay API key secret"
    )

    # 8. Email & Error Observability
    RESEND_API_KEY: Optional[str] = Field(
        default=None,
        description="Resend API key for transactional emails (re_...)"
    )
    SENTRY_DSN: Optional[str] = Field(
        default=None,
        description="Sentry error tracking DSN (https://...)"
    )
    APP_RELEASE: str = Field(
        default="heatledger-ai@2.0.0",
        description="Release version tag for Sentry and build artifacts"
    )

    # 9. Feature Flags
    FEATURE_OCR_PROCESSING: bool = Field(default=True, description="Enable MTC OCR parsing")
    FEATURE_WHATSAPP_INGESTION: bool = Field(default=True, description="Enable WhatsApp intake webhook")
    FEATURE_CBAM_CALCULATION: bool = Field(default=True, description="Enable CBAM emissions calculations")
    FEATURE_EXTERNAL_WEBHOOKS: bool = Field(default=True, description="Enable outbound webhook deliveries")
    FEATURE_MAINTENANCE_MODE: bool = Field(default=False, description="Emergency maintenance mode switch")

    @model_validator(mode="after")
    def validate_production_constraints(self) -> "AppSettings":
        """
        Prompt D1 & Prompt v5 Task 4.1 Fail-Closed Security Guard:
        In EVERY environment except an explicit local TEST mode (unless ENV=production,
        which ALWAYS enforces strict production checks), refuse startup if any required
        secret is missing, short (<32 chars), contains dev_/example/changeme, or matches
        a known insecure default.
        """
        env_clean = (self.ENV or "development").strip().lower()
        in_test_mode = is_explicit_test_mode(env_clean)

        # In explicit test mode (when NOT testing ENV=production), inject ephemeral
        # per-process secrets ONLY for core keys left empty so tests remain hermetic.
        if in_test_mode and env_clean != "production":
            if not self.JWT_SECRET:
                self.JWT_SECRET = _get_ephemeral_test_secret("JWT_SECRET")
            if not self.URL_SIGNING_SECRET:
                self.URL_SIGNING_SECRET = _get_ephemeral_test_secret("URL_SIGNING_SECRET")
            if not self.DOCUMENT_URL_SECRET:
                self.DOCUMENT_URL_SECRET = _get_ephemeral_test_secret("DOCUMENT_URL_SECRET")
            if not self.ENCRYPTION_KEY:
                self.ENCRYPTION_KEY = _get_ephemeral_test_secret("ENCRYPTION_KEY")
            return self

        errors: List[str] = []

        # 1. Required Cryptographic Secrets in ALL non-test environments (and production)
        required_secrets = [
            ("JWT_SECRET", self.JWT_SECRET),
            ("URL_SIGNING_SECRET", self.URL_SIGNING_SECRET),
            ("DOCUMENT_URL_SECRET", self.DOCUMENT_URL_SECRET),
            ("ENCRYPTION_KEY", self.ENCRYPTION_KEY),
        ]
        for secret_name, secret_val in required_secrets:
            reason = _is_secret_insecure(secret_val)
            if reason:
                errors.append(f"{secret_name} {reason}.")

        # Also validate any webhook / cron secrets if provided (reject dev_/example/short)
        optional_webhook_secrets = [
            ("RAZORPAY_WEBHOOK_SECRET", self.RAZORPAY_WEBHOOK_SECRET),
            ("INTAKE_EMAIL_WEBHOOK_SECRET", self.INTAKE_EMAIL_WEBHOOK_SECRET),
            ("WHATSAPP_APP_SECRET", self.WHATSAPP_APP_SECRET),
            ("CRON_SECRET", self.CRON_SECRET),
        ]
        for wh_name, wh_val in optional_webhook_secrets:
            if wh_val:
                reason = _is_secret_insecure(wh_val)
                if reason:
                    errors.append(f"{wh_name} {reason}.")

        # Non-production non-test environments (e.g., local development/staging) fail closed on bad secrets
        if env_clean != "production":
            if errors:
                msg = f"Security startup failure ({env_clean}):\n" + "\n".join(f" - {e}" for e in errors)
                raise ValueError(msg)
            return self

        # --- Production-only strict invariants below (ENV=production) ---
        # 2. DATABASE_URL must be a real PostgreSQL connection
        if not self.DATABASE_URL or not (
            self.DATABASE_URL.startswith("postgresql://") or self.DATABASE_URL.startswith("postgres://")
        ):
            errors.append("DATABASE_URL must be configured with a PostgreSQL connection string in production.")

        # 3. DEMO_MODE must never be True in production
        if self.DEMO_MODE:
            errors.append("DEMO_MODE must be False in production.")

        # 4. CORS Origins: no wildcard, no localhost in production
        origins = self.ALLOWED_ORIGINS if isinstance(self.ALLOWED_ORIGINS, list) else [self.ALLOWED_ORIGINS]
        if not origins:
            errors.append("ALLOWED_ORIGINS cannot be empty in production.")
        for origin in origins:
            if origin == "*":
                errors.append("ALLOWED_ORIGINS cannot contain wildcard '*' in production.")
            if "localhost" in origin.lower() or "127.0.0.1" in origin:
                errors.append(f"ALLOWED_ORIGINS cannot include localhost origin '{origin}' in production.")

        # 5. Gemini API Key (unless LOCAL_PARSER_ONLY is True)
        if not self.LOCAL_PARSER_ONLY and (not self.GEMINI_API_KEY or "your_" in self.GEMINI_API_KEY.lower()):
            errors.append("GEMINI_API_KEY is required in production unless LOCAL_PARSER_ONLY=True.")

        # 6. Razorpay Keys & Webhook Secrets in Production
        if not self.RAZORPAY_KEY_ID:
            errors.append("RAZORPAY_KEY_ID is required in production.")
        elif not self.RAZORPAY_KEY_ID.startswith("rzp_live_"):
            errors.append(f"RAZORPAY_KEY_ID must be a live key ('rzp_live_...') in production, got '{self.RAZORPAY_KEY_ID[:12]}...'.")

        if not self.RAZORPAY_KEY_SECRET:
            errors.append("RAZORPAY_KEY_SECRET is required in production.")
        if not self.RAZORPAY_WEBHOOK_SECRET:
            errors.append("RAZORPAY_WEBHOOK_SECRET is required in production.")

        # 7. Resend API Key
        if not self.RESEND_API_KEY:
            errors.append("RESEND_API_KEY is required in production.")
        elif not self.RESEND_API_KEY.startswith("re_"):
            errors.append("RESEND_API_KEY must start with 're_' in production.")

        # 8. Sentry DSN
        if not self.SENTRY_DSN or not self.SENTRY_DSN.startswith("https://"):
            errors.append("SENTRY_DSN must be configured with a valid https URL in production.")

        if errors:
            msg = "Production startup configuration failure:\n" + "\n".join(f" - {e}" for e in errors)
            raise ValueError(msg)

        return self


@lru_cache()
def _cached_settings() -> AppSettings:
    return AppSettings()


def get_settings() -> AppSettings:
    """
    Returns AppSettings instance. In explicit test mode, reloads dynamically so
    monkeypatched environment variables take effect immediately.
    """
    if is_explicit_test_mode():
        return AppSettings()
    return _cached_settings()


# ==============================================================================
# Authoritative Secret Accessors (Zero env reading / dev fallbacks elsewhere)
# ==============================================================================

def get_jwt_secret() -> str:
    """Single signing secret for JWT session tokens and inspector document seals."""
    return get_settings().JWT_SECRET


def get_jwt_key_ring() -> Tuple[str, Dict[str, str]]:
    """
    Returns (active_kid, {kid: secret}) for JWT signing & key-id rotation verification.
    Supports active JWT_KEY_ID and optional JWT_PREVIOUS_KEYS ('k0:old_secret').
    """
    s = get_settings()
    active_kid = (s.JWT_KEY_ID or "k1").strip()
    ring: Dict[str, str] = {active_kid: s.JWT_SECRET}
    if s.JWT_PREVIOUS_KEYS:
        for entry in s.JWT_PREVIOUS_KEYS.split(","):
            entry = entry.strip()
            if ":" in entry:
                kid, sec = entry.split(":", 1)
                kid_clean = kid.strip()
                if kid_clean and sec.strip():
                    ring[kid_clean] = sec.strip()
    return active_kid, ring


def get_url_signing_secret() -> str:
    """Dedicated HMAC secret for public share URLs."""
    return get_settings().URL_SIGNING_SECRET


def get_document_url_secret() -> str:
    """Dedicated HMAC secret for short-lived document download tokens."""
    return get_settings().DOCUMENT_URL_SECRET


def get_webhook_secret(name: str) -> str:
    """
    Reads an inbound webhook secret (RAZORPAY_WEBHOOK_SECRET, INTAKE_EMAIL_WEBHOOK_SECRET,
    WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN, CRON_SECRET) from settings.
    Fails closed if unconfigured outside explicit test mode.
    """
    s = get_settings()
    val = getattr(s, name, None)
    if val:
        return val
    if is_explicit_test_mode(s.ENV):
        return _get_ephemeral_test_secret(name)
    raise RuntimeError(f"Required webhook secret '{name}' is not configured.")


# ==============================================================================
# Versioned AES-256-GCM Field Encryption & Key Rotation (Task 4.1)
# ==============================================================================

def _derive_32_byte_key(raw_key: str) -> bytes:
    """Derives a 256-bit key cleanly from arbitrary-length secret material."""
    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def _get_encryption_key_ring() -> Tuple[str, Dict[str, bytes]]:
    """
    Returns (active_version, {version: 32_byte_key}) combining ENCRYPTION_KEY
    and optional ENCRYPTION_PREVIOUS_KEYS ('v0:old_secret,v0b:older_secret').
    """
    s = get_settings()
    active_ver = (s.ENCRYPTION_KEY_VERSION or "v1").strip()
    ring: Dict[str, bytes] = {active_ver: _derive_32_byte_key(s.ENCRYPTION_KEY)}
    if s.ENCRYPTION_PREVIOUS_KEYS:
        for entry in s.ENCRYPTION_PREVIOUS_KEYS.split(","):
            entry = entry.strip()
            if ":" in entry:
                ver, key_mat = entry.split(":", 1)
                ver_clean = ver.strip()
                if ver_clean and key_mat.strip():
                    ring[ver_clean] = _derive_32_byte_key(key_mat.strip())
    return active_ver, ring


def get_encryption_key() -> str:
    """Returns active raw encryption key string from centralized settings."""
    return get_settings().ENCRYPTION_KEY


def get_encryption_key_version() -> str:
    """Returns active encryption key version identifier."""
    return (get_settings().ENCRYPTION_KEY_VERSION or "v1").strip()


def encrypt_secret_field(plaintext: str) -> str:
    """
    Encrypts a sensitive database field (e.g., users.totp_secret_hex) using
    AES-256-GCM with random 96-bit nonce and key version tag.
    Output format: 'enc:<version>:<nonce_b64url>:<ciphertext_tag_b64url>'
    """
    if not plaintext:
        return ""
    if plaintext.startswith("enc:"):
        return plaintext
    active_ver, ring = _get_encryption_key_ring()
    aesgcm = AESGCM(ring[active_ver])
    nonce = os.urandom(12)
    aad = active_ver.encode("utf-8")
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), aad)
    nonce_b64 = base64.urlsafe_b64encode(nonce).decode("ascii").rstrip("=")
    ct_b64 = base64.urlsafe_b64encode(ct).decode("ascii").rstrip("=")
    return f"enc:{active_ver}:{nonce_b64}:{ct_b64}"


def _b64_pad(s: str) -> str:
    return s + "=" * ((4 - len(s) % 4) % 4)


def decrypt_secret_field(stored: str) -> str:
    """
    Decrypts an encrypted field written by encrypt_secret_field().
    Supports transparent rotation across keys listed in ENCRYPTION_PREVIOUS_KEYS.
    Legacy unencrypted values (no 'enc:' prefix) are returned as-is for migration compatibility.
    """
    if not stored:
        return ""
    if not stored.startswith("enc:"):
        return stored

    parts = stored.split(":", 3)
    if len(parts) != 4:
        raise ValueError("Malformed encrypted field envelope")

    _, version, nonce_b64, ct_b64 = parts
    _, ring = _get_encryption_key_ring()
    if version not in ring:
        raise ValueError(f"Unknown encryption key version '{version}' — check ENCRYPTION_PREVIOUS_KEYS")

    nonce = base64.urlsafe_b64decode(_b64_pad(nonce_b64))
    ct = base64.urlsafe_b64decode(_b64_pad(ct_b64))
    aesgcm = AESGCM(ring[version])
    plaintext_bytes = aesgcm.decrypt(nonce, ct, version.encode("utf-8"))
    return plaintext_bytes.decode("utf-8")
