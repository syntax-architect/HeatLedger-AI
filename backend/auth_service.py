"""
HEATLEDGER AI: Enterprise Authentication, RBAC & Cryptographic Signing Engine
Facade assembling modular auth mixins (Prompt Pack v5 Task 6.1).
"""

try:
    from backend.auth import (  # noqa: F401
        ACCESS_TOKEN_EXPIRY_SECONDS,
        DB_PATH,
        JWT_EXPIRY_SECONDS,
        REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS,
        AuthSchemaMixin,
        InvitesMixin,
        LoginRateLimiter,
        MfaMixin,
        PasswordsMixin,
        SessionsMixin,
        SignupMixin,
        TokensMixin,
        _base64url_decode,
        _base64url_encode,
        generate_totp_code,
        get_db_connection,
        hash_password,
        validate_password_strength,
        verify_password,
        verify_totp_code,
    )
except ImportError:
    from auth import (  # noqa: F401
        ACCESS_TOKEN_EXPIRY_SECONDS,
        DB_PATH,
        JWT_EXPIRY_SECONDS,
        REFRESH_TOKEN_EXPIRY_SECONDS,
        STEP_UP_VALIDITY_SECONDS,
        AuthSchemaMixin,
        InvitesMixin,
        LoginRateLimiter,
        MfaMixin,
        PasswordsMixin,
        SessionsMixin,
        SignupMixin,
        TokensMixin,
        generate_totp_code,
        get_db_connection,
        hash_password,
        validate_password_strength,
        verify_password,
        verify_totp_code,
    )
    from auth.common import _base64url_decode, _base64url_encode  # noqa: F401


class AuthService(
    AuthSchemaMixin,
    TokensMixin,
    SessionsMixin,
    PasswordsMixin,
    MfaMixin,
    SignupMixin,
    InvitesMixin,
):
    """
    Database-backed authentication service with Supabase-compatible JWTs,
    strict role permissions (OWNER, QA_INSPECTOR, DISPATCH, VIEWER),
    and 10-minute step-up MFA verification.
    """
    _db_initialized: bool = False


AuthService.init_db()
