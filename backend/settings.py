"""
HEATLEDGER AI: Prompt D1 - Centralized Settings & Environment Validation
Built with pydantic-settings. Every variable has a type, description, and safe defaults
for local development only. In production (ENV=production), the application validates
and refuses to start if any required secret or production constraint is violated.
"""

import os
from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

KNOWN_INSECURE_SECRETS = {
    "default_secret",
    "secret",
    "changeme",
    "password",
    "admin",
    "123456",
}


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
        description="Active deployment environment: local, development, staging, production"
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

    # 3. Cryptography & Security Secrets
    JWT_SECRET: str = Field(
        default="dev_jwt_secret_64_characters_long_for_local_development_testing_only!",
        description="HMAC-SHA256 secret for user session tokens (minimum 32 chars in prod)"
    )
    URL_SIGNING_SECRET: str = Field(
        default="dev_url_signing_secret_64_characters_for_local_development_testing!",
        description="HMAC-SHA256 secret for signed buyer share URLs (minimum 32 chars in prod)"
    )
    DOCUMENT_URL_SECRET: str = Field(
        default="dev_document_url_secret_64_characters_long_for_local_dev_only!!",
        description="HMAC secret for secure document delivery tokens"
    )
    ENCRYPTION_KEY: str = Field(
        default="dev_aes_encryption_key_32_bytes_long_exact!",
        description="Symmetric key for database field encryption (minimum 32 chars in prod)"
    )

    # 4. CORS Origins Allowlist
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

    # 5. External API Services
    GEMINI_API_KEY: Optional[str] = Field(
        default=None,
        description="Google Gemini API key for vision OCR escalation"
    )
    LOCAL_PARSER_ONLY: bool = Field(
        default=False,
        description="If True, bypasses external Gemini model escalation"
    )

    # 6. Razorpay Payment Gateway
    RAZORPAY_KEY_ID: Optional[str] = Field(
        default=None,
        description="Razorpay key ID (rzp_test_... in dev/staging, rzp_live_... in prod)"
    )
    RAZORPAY_KEY_SECRET: Optional[str] = Field(
        default=None,
        description="Razorpay API key secret"
    )
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = Field(
        default=None,
        description="HMAC-SHA256 signature secret for Razorpay webhook validation"
    )

    # 7. Email & Error Observability
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

    # 8. Feature Flags (Default OFF for retired/experimental features)
    FEATURE_OCR_PROCESSING: bool = Field(default=True, description="Enable MTC OCR parsing")
    FEATURE_WHATSAPP_INGESTION: bool = Field(default=True, description="Enable WhatsApp intake webhook")
    FEATURE_CBAM_CALCULATION: bool = Field(default=True, description="Enable CBAM emissions calculations")
    FEATURE_EXTERNAL_WEBHOOKS: bool = Field(default=True, description="Enable outbound webhook deliveries")
    FEATURE_MAINTENANCE_MODE: bool = Field(default=False, description="Emergency maintenance mode switch")

    @model_validator(mode="after")
    def validate_production_constraints(self) -> "AppSettings":
        """
        Prompt D1 Invariant:
        In production (ENV=production), validate all mandatory secrets and refuse startup
        if anything required is missing, placeholder, or insecure.
        """
        env_clean = self.ENV.strip().lower()
        if env_clean != "production":
            return self

        errors: List[str] = []

        # 1. DATABASE_URL must be a real PostgreSQL connection
        if not self.DATABASE_URL or not (
            self.DATABASE_URL.startswith("postgresql://") or self.DATABASE_URL.startswith("postgres://")
        ):
            errors.append("DATABASE_URL must be configured with a PostgreSQL connection string in production.")

        # 2. DEMO_MODE must never be True in production
        if self.DEMO_MODE:
            errors.append("DEMO_MODE must be False in production.")

        # 3. Cryptographic Secrets Length and Randomness
        for secret_name, secret_val in [
            ("JWT_SECRET", self.JWT_SECRET),
            ("URL_SIGNING_SECRET", self.URL_SIGNING_SECRET),
            ("ENCRYPTION_KEY", self.ENCRYPTION_KEY),
        ]:
            val_lower = (secret_val or "").lower()
            if not secret_val or len(secret_val) < 32:
                errors.append(f"{secret_name} must be set and at least 32 characters in production.")
            elif (
                secret_val in KNOWN_INSECURE_SECRETS
                or "dev" in val_lower
                or "default" in val_lower
                or "test" in val_lower
            ):
                errors.append(f"{secret_name} is using an insecure or development default secret.")

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

        # 6. Razorpay Keys in Production
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
def get_settings() -> AppSettings:
    """Returns singleton cached AppSettings instance."""
    return AppSettings()
