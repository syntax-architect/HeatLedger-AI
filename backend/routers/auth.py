"""
HEATLEDGER AI: Authentication & Identity APIRouter (Prompt M4)
Handles:
- PIN verification
- Login / Demo login
- Token refresh & logout
- Password reset workflow
- TOTP enrolment & confirmation
- MFA Step-up authorization
- User profile & token verification
"""

import logging
import os
import time
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from auth_service import AuthService, LoginRateLimiter
    from audit_service import AuditService
    from email_service import EmailService
    from dependencies import get_client_ip, get_current_user, require_roles
    from error_handling import safe_http_error
except ImportError:
    from backend.auth_service import AuthService, LoginRateLimiter
    from backend.audit_service import AuditService
    from backend.email_service import EmailService
    from backend.dependencies import get_client_ip, get_current_user, require_roles
    from backend.error_handling import safe_http_error

logger = logging.getLogger("heatledger.security")

router = APIRouter(prefix="/api/auth", tags=["Authentication & Identity"])


def _set_session_cookies(
    response: Response,
    request: Request,
    access_token: str,
    refresh_token: Optional[str] = None,
    csrf_token: Optional[str] = None,
) -> None:
    """
    Sets hardened session cookies (Prompt Pack v5 Task 4.3):
    - hl_access_token: httpOnly=True, Secure (prod/HTTPS), SameSite=Lax, Path='/'
    - hl_refresh_token: httpOnly=True, Secure (prod/HTTPS), SameSite=Lax, Path='/api/auth'
    - hl_csrf_token: httpOnly=False (SOLE documented exception for Double Submit CSRF header),
      Secure (prod/HTTPS), SameSite=Lax, Path='/'
    """
    secure_cookie = (os.getenv("ENV") == "production") or (request.url.scheme == "https")
    cookie_domain = os.getenv("COOKIE_DOMAIN") or None
    response.set_cookie(
        key="hl_access_token",
        value=access_token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=900,
        path="/",
        domain=cookie_domain,
    )
    if refresh_token:
        response.set_cookie(
            key="hl_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/api/auth",
            domain=cookie_domain,
        )
    if csrf_token:
        response.set_cookie(
            key="hl_csrf_token",
            value=csrf_token,
            httponly=False,  # Documented sole exception: SPA reads Double-Submit CSRF token for X-CSRF-Token
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/",
            domain=cookie_domain,
        )


def _clear_session_cookies(response: Response) -> None:
    cookie_domain = os.getenv("COOKIE_DOMAIN") or None
    response.delete_cookie("hl_access_token", path="/", domain=cookie_domain)
    response.delete_cookie("hl_refresh_token", path="/api/auth", domain=cookie_domain)
    response.delete_cookie("hl_csrf_token", path="/", domain=cookie_domain)


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: str = Field(..., max_length=200)
    password: str = Field(..., min_length=12, max_length=128)
    company_name: str = Field(..., max_length=200)
    gstin: str = Field(..., max_length=15)
    name: Optional[str] = Field(default=None, max_length=120)
    turnstile_token: Optional[str] = None


class VerifyPinRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    pin: str = Field(..., min_length=4, max_length=16, description="6-digit inspector PIN")


class StepUpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(..., min_length=4, max_length=16, description="6-digit TOTP / Passkey step-up code")


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: Optional[str] = Field(default=None, max_length=128)
    email: Optional[str] = Field(default=None, max_length=128)
    password: Optional[str] = Field(default="", max_length=128)
    role: Optional[str] = Field(default=None, max_length=64)


class DemoLoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    role: Optional[str] = Field(default="QA_INSPECTOR", description="Role to assume: OWNER, QA_INSPECTOR, DISPATCH, VIEWER")


class RefreshTokenRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    refresh_token: Optional[str] = Field(default=None)


class PasswordResetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=128)


class ResetPasswordConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(..., min_length=16, max_length=512)
    new_password: str = Field(..., min_length=12, max_length=128)


class VerifyOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=200)
    otp: str = Field(..., min_length=6, max_length=6)


class ResetPasswordOtpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=200)
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=12, max_length=128)


class ResendVerificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(..., max_length=200)


class TotpConfirmRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    secret: str = Field(..., min_length=16, max_length=64)
    code: str = Field(..., min_length=6, max_length=8)


class VerifyTokenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(..., min_length=10, max_length=4096, description="Stateless JWT token")


@router.post("/verify-pin")
def verify_inspector_pin(payload: VerifyPinRequest):
    """
    Validates the 6-digit Inspector Security PIN/Passkey.
    Returns authenticated JWT token with role claims for Authorised QA Inspector.
    """
    success, data, error = AuthService.verify_inspector_pin(payload.pin)
    if not success:
        raise HTTPException(status_code=401, detail=error or "Invalid Inspector Security PIN")
    return data


@router.post("/login")
def login(payload: LoginRequest, request: Request, response: Response):
    """
    Prompt S2 Enterprise Authentication:
    - Login rate limiting per IP and per email (5 failures in 15 minutes).
    - Authenticates credentials against Argon2id database hashes.
    - Uniform error message: never reveals if an email exists.
    - Issues short-lived access token (15 min) in httpOnly, Secure, SameSite=Lax cookie.
    - Issues rotating refresh token (30 days) stored hashed in database.
    - Sets Double Submit CSRF token cookie.
    - Logs login attempt to tamper-evident cryptographic audit chain.
    """
    client_ip = get_client_ip(request)
    username = payload.username or payload.email or ""

    # Requirement D5: Production has no demo login and refuses demo accounts
    is_prod = os.getenv("ENV") == "production" or os.getenv("APP_ENV") == "production"
    if is_prod and "demo" in username.lower():
        raise HTTPException(status_code=403, detail="Demo accounts cannot log into production environment.")

    is_locked, remaining_sec = AuthService.check_rate_limit(client_ip, username)
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed login attempts. Locked out. Please try again in {remaining_sec // 60 + 1} minutes."
        )

    success, data, error = AuthService.authenticate_credentials(
        username=username,
        password=payload.password or "",
        role=payload.role,
        ip=client_ip,
        user_agent=request.headers.get("user-agent", "")
    )
    if not success:
        if data and data.get("code") == "EMAIL_NOT_VERIFIED":
            raise HTTPException(
                status_code=403,
                detail={
                    "detail": error or "Email address not verified.",
                    "code": "EMAIL_NOT_VERIFIED",
                }
            )
        AuthService.record_login_failure(client_ip, username)
        try:
            AuditService.log_action(
                organization_id="system",
                entity_type="AUTH",
                entity_id=username or "anonymous",
                action="LOGIN_FAILED",
                user_id="usr_anonymous",
                user_name=username or "anonymous",
                user_role="VIEWER",
                ip_address=client_ip,
                before_state=None,
                after_state={"error": error}
            )
        except Exception:
            pass
        raise HTTPException(status_code=401, detail=error or "Invalid email or password")

    AuthService.record_login_success(client_ip, username)

    token = data["token"]
    refresh_token = data.get("refresh_token")
    csrf_token = data.get("csrf_token")
    user = data["user"]

    _set_session_cookies(response, request, token, refresh_token, csrf_token)

    try:
        AuditService.log_action(
            organization_id=user.get("organization_id") or "system",
            entity_type="AUTH",
            entity_id=user["id"],
            action="LOGIN",
            user_id=user["id"],
            user_name=user["name"],
            user_role=user["role"],
            ip_address=client_ip,
            before_state=None,
            after_state={"email": user["email"], "role": user["role"]}
        )
    except Exception:
        pass

    return data


@router.post("/demo-login")
def demo_login(request: Request, response: Response, payload: Optional[DemoLoginRequest] = None):
    """
    Demo login endpoint: generates authenticated session for demonstration without credentials.
    Disabled in production unless DEMO_MODE=true.
    """
    is_prod = os.getenv("ENV") == "production" or os.getenv("APP_ENV") == "production"
    if is_prod:
        raise HTTPException(status_code=403, detail="Demo login disabled in production")

    client_ip = get_client_ip(request)
    role_to_assume = payload.role if (payload and payload.role) else "SANDBOX_DEMO"
    success, data, error = AuthService.authenticate_credentials(
        username="demo",
        password="",
        role=role_to_assume,
        ip=client_ip,
        user_agent=request.headers.get("user-agent", "")
    )
    if not success:
        raise HTTPException(status_code=500, detail="Demo account initialization failed")

    _set_session_cookies(
        response,
        request,
        data["token"],
        data.get("refresh_token"),
        data.get("csrf_token"),
    )
    return data


@router.post("/refresh")
def refresh_session(request: Request, response: Response, payload: Optional[RefreshTokenRequest] = None):
    """
    Rotates access token using refresh token from cookie or payload.
    """
    refresh_token = None
    if payload and payload.refresh_token:
        refresh_token = payload.refresh_token
    elif "hl_refresh_token" in request.cookies:
        refresh_token = request.cookies.get("hl_refresh_token")

    if not refresh_token:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    client_ip = get_client_ip(request)
    success, data, error = AuthService.rotate_refresh_token(
        raw_refresh_token=refresh_token,
        ip=client_ip,
        user_agent=request.headers.get("user-agent", "")
    )
    if not success:
        _clear_session_cookies(response)
        raise HTTPException(status_code=401, detail=error or "Invalid or expired refresh token")

    _set_session_cookies(
        response,
        request,
        data["token"],
        data.get("refresh_token"),
        data.get("csrf_token"),
    )
    return data


@router.post("/logout")
def logout(request: Request, response: Response, payload: Optional[RefreshTokenRequest] = None):
    """Revokes refresh token on the server and clears authentication cookies."""
    refresh_tok = None
    if payload and payload.refresh_token:
        refresh_tok = payload.refresh_token
    elif "hl_refresh_token" in request.cookies:
        refresh_tok = request.cookies.get("hl_refresh_token")

    if refresh_tok:
        AuthService.revoke_refresh_token(refresh_tok)

    _clear_session_cookies(response)
    return {"status": "logged_out", "server_revoked": True}


@router.post("/request-password-reset")
def request_password_reset_endpoint(payload: PasswordResetRequest, request: Request):
    """Initiates password reset workflow with secure one-time token (never returned in API response)."""
    client_ip = get_client_ip(request)
    is_locked, remaining_sec = LoginRateLimiter.is_locked(client_ip, payload.email, prefix="reset")
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many password reset requests. Please try again in {remaining_sec // 60 + 1} minutes."
        )

    LoginRateLimiter.record_failure(client_ip, payload.email, prefix="reset")
    success, message, token = AuthService.request_password_reset(payload.email)
    if token:
        otp_code = AuthService.create_otp(payload.email, "PASSWORD_RESET", ttl_minutes=15)
        app_url = os.getenv("APP_URL", "http://localhost:3000")
        reset_url = f"{app_url}/reset-password?token={token}"
        try:
            subject, text, html = EmailService.render_password_reset(reset_url, otp_code=otp_code)
            EmailService.send_email(
                to=payload.email,
                subject=subject,
                html=html,
                text=text,
                template_name="password_reset"
            )
        except Exception as e:
            logger.warning(f"[Password Reset Email] Failed to dispatch email to {payload.email}: {e}")
    return {"status": "ok", "message": message}


@router.post("/verify-reset-otp")
def verify_reset_otp_endpoint(payload: VerifyOtpRequest, request: Request):
    """Validates a 6-digit password reset OTP without consuming it yet."""
    client_ip = get_client_ip(request)
    is_locked, remaining_sec = LoginRateLimiter.is_locked(client_ip, payload.email, prefix="reset_otp")
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many verification attempts. Try again in {remaining_sec // 60 + 1} minutes."
        )
    ok, err = AuthService.verify_otp(payload.email, "PASSWORD_RESET", payload.otp, consume=False)
    if not ok:
        LoginRateLimiter.record_failure(client_ip, payload.email, prefix="reset_otp")
        raise HTTPException(status_code=400, detail=err or "Invalid or expired reset code.")
    return {"status": "valid", "message": "Code verified. Choose a new password."}


@router.post("/reset-password-otp")
def reset_password_otp_endpoint(payload: ResetPasswordOtpRequest, request: Request):
    """Resets user password using their email + 6-digit OTP."""
    ok, err = AuthService.reset_password_with_otp(payload.email, payload.otp, payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Password reset failed.")
    return {"status": "ok", "message": "Password successfully reset. Please sign in with your new password."}


@router.post("/reset-password")
def reset_password_endpoint(payload: ResetPasswordConfirmRequest, request: Request):
    """Resets user password with Argon2id hash after validation checks."""
    client_ip = get_client_ip(request)
    success, error = AuthService.reset_password_with_token(payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "ok", "message": "Password successfully reset. Please sign in with your new password."}


@router.post("/totp/enrol")
def enrol_totp(user: Dict[str, Any] = Depends(require_roles(["QA_INSPECTOR", "QA_HEAD", "OWNER"]))):
    """Generates authentic base32 secret and 8 one-time recovery codes for QA_INSPECTOR."""
    try:
        data = AuthService.enrol_totp(user["id"])
        return data
    except Exception as e:
        raise safe_http_error(e, status_code=400, fallback_message="TOTP enrolment failed.", context="auth.enrol_totp")


@router.post("/totp/confirm")
def confirm_totp(payload: TotpConfirmRequest, user: Dict[str, Any] = Depends(require_roles(["QA_INSPECTOR", "QA_HEAD", "OWNER"]))):
    """Confirms TOTP configuration by verifying initial 6-digit authenticator code."""
    success, error = AuthService.confirm_totp(user["id"], payload.secret, payload.code)
    if not success:
        raise HTTPException(status_code=400, detail=error)
    return {"status": "enrolled", "message": "Two-factor authentication successfully configured."}


@router.post("/step-up")
def step_up_mfa(
    payload: StepUpRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Verifies 6-digit RFC 6238 TOTP code or recovery code for Step-Up signing authorization.
    Valid for 10 minutes.
    """
    success, data, error = AuthService.verify_step_up_mfa(user["id"], payload.code)
    if not success:
        status_code = 403 if "restricted" in (error or "").lower() else 401
        raise HTTPException(status_code=status_code, detail=error or "Step-up verification failed")

    try:
        AuditService.log_action(
            organization_id=user.get("organization_id") or user.get("org_id") or "system",
            entity_type="AUTH",
            entity_id=user["id"],
            action="STEP_UP",
            user_id=user["id"],
            user_name=user["name"],
            user_role=user["role"],
            ip_address="127.0.0.1",
            before_state=None,
            after_state={"status": "step_up_verified", "via_recovery_code": data.get("via_recovery_code", False)}
        )
    except Exception:
        pass

    return data


@router.get("/me")
def get_auth_me(user: Dict[str, Any] = Depends(get_current_user)):
    """Returns authenticated user profile, organization membership, role, and step-up status."""
    is_step_up_valid = AuthService.check_step_up_valid(user["id"])
    last_step_up = user.get("last_step_up_at") or 0
    expires_in = max(0, 600 - (int(time.time()) - last_step_up)) if is_step_up_valid else 0
    return {
        "user": user,
        "step_up_valid": is_step_up_valid,
        "step_up_expires_in_seconds": expires_in
    }


@router.post("/verify-token")
def verify_token(payload: VerifyTokenRequest):
    """Verifies an existing JWT token and returns claims if valid."""
    valid, claims, err = AuthService.verify_jwt(payload.token)
    if not valid:
        raise HTTPException(status_code=401, detail=err or "Invalid authorization token")
    return {"valid": True, "claims": claims}


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    token: str = Field(..., min_length=16, max_length=512)


@router.post("/verify-email")
def verify_email_post(payload: VerifyEmailRequest):
    """Consumes single-use 24-hour verification link and activates login for user."""
    ok, err = AuthService.verify_email(payload.token)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Invalid or expired verification link")
    return {"status": "verified", "message": "Email verified successfully. You may now sign in."}


@router.get("/verify-email")
def verify_email_get(token: str):
    """GET variant for clickable verification links."""
    ok, err = AuthService.verify_email(token)
    if not ok:
        raise HTTPException(status_code=400, detail=err or "Invalid or expired verification link")
    return {"status": "verified", "message": "Email verified successfully. You may now sign in."}


@router.post("/verify-email-otp")
def verify_email_otp_endpoint(payload: VerifyOtpRequest, request: Request):
    """Verifies newly created account email with a 6-digit OTP."""
    client_ip = get_client_ip(request)
    is_locked, remaining_sec = LoginRateLimiter.is_locked(client_ip, payload.email, prefix="verify_otp")
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many verification attempts. Try again in {remaining_sec // 60 + 1} minutes."
        )
    ok, err = AuthService.verify_email_with_otp(payload.email, payload.otp)
    if not ok:
        LoginRateLimiter.record_failure(client_ip, payload.email, prefix="verify_otp")
        raise HTTPException(status_code=400, detail=err or "Invalid or expired verification code.")
    LoginRateLimiter.record_success(client_ip, payload.email, prefix="verify_otp")
    return {"status": "verified", "message": "Email verified successfully. You may now sign in."}


@router.post("/resend-verification")
def resend_verification_endpoint(payload: ResendVerificationRequest, request: Request):
    """Resends a fresh 6-digit email verification OTP and link (rate-limited)."""
    client_ip = get_client_ip(request)
    is_locked, remaining_sec = LoginRateLimiter.is_locked(client_ip, payload.email, prefix="resend_verify")
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many resend requests. Try again in {remaining_sec // 60 + 1} minutes."
        )
    LoginRateLimiter.record_failure(client_ip, payload.email, prefix="resend_verify")
    _, msg = AuthService.resend_verification_email(payload.email)
    return {"status": "ok", "message": msg}


@router.post("/signup")
def signup(payload: SignupRequest, request: Request):
    """
    Prompt Pack v5 Task 4.2: Plant Onboarding & Signup
    - Token is emailed ONLY, never returned in response.
    - Account enumeration defended via identical status/message on duplicate emails.
    """
    try:
        return AuthService.signup_plant(
            email=payload.email,
            password=payload.password,
            company_name=payload.company_name,
            gstin=payload.gstin,
            name=payload.name or "Plant Owner"
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Invalid signup details.", context="auth.signup")


@router.post("/sign-out-everywhere")
def sign_out_everywhere(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Prompt A5: Revoke all sessions across all devices for the active user.
    """
    user_id = user.get("user_id") or user.get("id") or user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    AuthService.revoke_all_sessions(user_id)
    return {"status": "ok", "message": "All sessions revoked successfully."}
