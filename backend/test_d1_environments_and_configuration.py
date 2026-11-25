"""
HEATLEDGER AI: Prompt D1 Test Suite
Environments, Configuration & Production Hardening:
- pydantic-settings AppSettings loads safe development defaults in local mode
- Production mode (ENV=production) validates all mandatory variables and refuses startup
  if any secret, database connection, or security invariant is violated
- Proves no hardcoded passwords, tokens, or demo shortcuts in production configuration
- Proves CORS origins reject wildcard and localhost in production
- Proves Razorpay keys must be live mode (rzp_live_) in production
"""

import pytest
from settings import AppSettings


def test_d1_1_development_mode_loads_safe_defaults(monkeypatch):
    """
    D1 Deliverable 1: Local development environment uses safe defaults
    and loads successfully without requiring external cloud accounts.
    """
    monkeypatch.setenv("ENV", "development")
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("RAZORPAY_KEY_ID", raising=False)
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("SENTRY_DSN", raising=False)

    settings = AppSettings()
    assert settings.ENV == "development"
    assert settings.BRAND_NAME == "HeatLedger AI"
    assert settings.DEMO_MODE is False
    assert len(settings.JWT_SECRET) >= 32
    assert "localhost" in settings.ALLOWED_ORIGINS[0]


def test_d1_2_production_mode_missing_database_url_fails(monkeypatch):
    """
    D1 Deliverable 2: Production mode refuses startup if DATABASE_URL is missing
    or not a real PostgreSQL connection string.
    """
    monkeypatch.setenv("ENV", "production")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    with pytest.raises(ValueError) as excinfo:
        AppSettings()
    assert "DATABASE_URL" in str(excinfo.value)


def test_d1_3_production_mode_demo_mode_true_fails(monkeypatch):
    """
    D1 Deliverable 3: Production mode refuses startup if DEMO_MODE is True.
    """
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DEMO_MODE", "true")
    monkeypatch.setenv("DATABASE_URL", "postgresql://produser:prodsecret123@db.supabase.co:5432/postgres")

    with pytest.raises(ValueError) as excinfo:
        AppSettings()
    assert "DEMO_MODE must be False in production" in str(excinfo.value)


def test_d1_4_production_mode_insecure_secrets_rejected(monkeypatch):
    """
    D1 Deliverable 4: Production mode refuses startup if JWT_SECRET, URL_SIGNING_SECRET,
    or ENCRYPTION_KEY are short (<32 chars) or using development default keywords.
    """
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://produser:prodsecret123@db.supabase.co:5432/postgres")
    monkeypatch.setenv("JWT_SECRET", "short_secret")

    with pytest.raises(ValueError) as excinfo:
        AppSettings()
    assert "JWT_SECRET" in str(excinfo.value)


def test_d1_5_production_mode_cors_wildcard_and_localhost_rejected(monkeypatch):
    """
    D1 Deliverable 5: Production mode strictly forbids wildcard '*' and localhost CORS origins.
    """
    # 1. Wildcard rejected
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://produser:prodsecret123@db.supabase.co:5432/postgres")
    monkeypatch.setenv("ALLOWED_ORIGINS", "*")

    with pytest.raises(ValueError) as excinfo:
        AppSettings()
    assert "ALLOWED_ORIGINS" in str(excinfo.value)

    # 2. Localhost rejected
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:5173,https://app.heatledger.ai")
    with pytest.raises(ValueError) as excinfo_local:
        AppSettings()
    assert "localhost" in str(excinfo_local.value).lower()


def test_d1_6_production_mode_requires_live_razorpay_and_resend_keys(monkeypatch):
    """
    D1 Deliverable 6: Production mode validates payment gateway and email keys:
    - RAZORPAY_KEY_ID must be live key ('rzp_live_...')
    - RESEND_API_KEY must start with 're_'
    - SENTRY_DSN must be a valid https URL
    """
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://produser:prodsecret123@db.supabase.co:5432/postgres")
    monkeypatch.setenv("JWT_SECRET", "a" * 64)
    monkeypatch.setenv("URL_SIGNING_SECRET", "b" * 64)
    monkeypatch.setenv("ENCRYPTION_KEY", "c" * 32)
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.heatledger.ai,https://heatledger.ai")
    monkeypatch.setenv("LOCAL_PARSER_ONLY", "true")

    # Pass test key in production -> must fail
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_invalid_in_prod")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "mock_secret")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "mock_wh_secret")
    monkeypatch.setenv("RESEND_API_KEY", "re_mock_api_key_valid")
    monkeypatch.setenv("SENTRY_DSN", "https://public@sentry.io/123456")

    with pytest.raises(ValueError) as excinfo:
        AppSettings()
    assert "rzp_live_" in str(excinfo.value)


def test_d1_7_production_mode_fully_configured_succeeds(monkeypatch):
    """
    D1 Deliverable 7: Fully compliant production configuration passes validation cleanly.
    """
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql://produser:prodpass9988@db.supabase.co:5432/postgres")
    monkeypatch.setenv("JWT_SECRET", "8f4a7c1b2e3d4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a")
    monkeypatch.setenv("URL_SIGNING_SECRET", "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b")
    monkeypatch.setenv("ENCRYPTION_KEY", "7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://app.heatledger.ai,https://heatledger.ai")
    monkeypatch.setenv("LOCAL_PARSER_ONLY", "true")
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_live_abc123456789")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "rzp_live_secret_998877")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_live_abcdef123456")
    monkeypatch.setenv("RESEND_API_KEY", "re_live_resend_api_key_9999")
    monkeypatch.setenv("SENTRY_DSN", "https://pubkey@sentry.io/4501234567")
    monkeypatch.setenv("DEMO_MODE", "false")

    settings = AppSettings()
    assert settings.ENV == "production"
    assert settings.RAZORPAY_KEY_ID.startswith("rzp_live_")
    assert settings.RESEND_API_KEY.startswith("re_")
    assert len(settings.ALLOWED_ORIGINS) == 2


def test_d1_8_feature_flags_and_brand_configuration():
    """
    D1 Deliverable 8: Verifies feature flags default state and configurable BRAND_NAME.
    """
    settings = AppSettings(BRAND_NAME="Tata Steel Compliance Portal")
    assert settings.BRAND_NAME == "Tata Steel Compliance Portal"
    assert settings.FEATURE_OCR_PROCESSING is True
    assert settings.FEATURE_MAINTENANCE_MODE is False
