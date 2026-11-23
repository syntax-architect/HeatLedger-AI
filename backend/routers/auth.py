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
    from auth_service import AuthService
    from audit_service import AuditService
    from email_service import EmailService
    from dependencies import get_client_ip, get_current_user, require_roles
except ImportError:
    from backend.auth_service import AuthService
    from backend.audit_service import AuditService
    from backend.email_service import EmailService
    from backend.dependencies import get_client_ip, get_current_user, require_roles

logger = logging.getLogger("heatledger.security")

router = APIRouter(prefix="/api/auth", tags=["Authentication & Identity"])


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
        AuthService.record_login_failure(client_ip, username)
        try:
            AuditService.log_action(
                organization_id="org_howrah_steel_01",
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

    secure_cookie = (os.getenv("ENV") == "production") or (request.url.scheme == "https")
    response.set_cookie(
        key="hl_access_token",
        value=token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=900,
        path="/"
    )
    if refresh_token:
        response.set_cookie(
            key="hl_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/api/auth"
        )
    if csrf_token:
        response.set_cookie(
            key="hl_csrf_token",
            value=csrf_token,
            httponly=False,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/"
        )

    try:
        AuditService.log_action(
            organization_id=user.get("organization_id", "org_howrah_steel_01"),
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
    is_prod = os.getenv("ENV") == "production"
    demo_enabled = os.getenv("DEMO_MODE", "false").lower() == "true"
    if is_prod and not demo_enabled:
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

    token = data["token"]
    refresh_token = data.get("refresh_token")
    csrf_token = data.get("csrf_token")

    secure_cookie = (os.getenv("ENV") == "production") or (request.url.scheme == "https")
    response.set_cookie(
        key="hl_access_token",
        value=token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=900,
        path="/"
    )
    if refresh_token:
        response.set_cookie(
            key="hl_refresh_token",
            value=refresh_token,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/api/auth"
        )
    if csrf_token:
        response.set_cookie(
            key="hl_csrf_token",
            value=csrf_token,
            httponly=False,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/"
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
        response.delete_cookie("hl_access_token", path="/")
        response.delete_cookie("hl_refresh_token", path="/api/auth")
        response.delete_cookie("hl_csrf_token", path="/")
        raise HTTPException(status_code=401, detail=error or "Invalid or expired refresh token")

    token = data["token"]
    new_refresh = data.get("refresh_token")

    secure_cookie = (os.getenv("ENV") == "production") or (request.url.scheme == "https")
    response.set_cookie(
        key="hl_access_token",
        value=token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=900,
        path="/"
    )
    if new_refresh:
        response.set_cookie(
            key="hl_refresh_token",
            value=new_refresh,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/api/auth"
        )
    if new_refresh:
        response.set_cookie(
            key="hl_refresh_token",
            value=new_refresh,
            httponly=True,
            secure=secure_cookie,
            samesite="lax",
            max_age=30 * 86400,
            path="/api/auth"
        )
    return data


@router.post("/logout")
def logout(response: Response):
    """Clears authentication cookies."""
    response.delete_cookie("hl_access_token", path="/")
    response.delete_cookie("hl_refresh_token", path="/api/auth")
    response.delete_cookie("hl_csrf_token", path="/")
    return {"status": "logged_out"}


@router.post("/request-password-reset")
def request_password_reset_endpoint(payload: PasswordResetRequest, request: Request):
    """Initiates password reset workflow with secure one-time token."""
    client_ip = get_client_ip(request)
    is_locked, remaining_sec = AuthService.check_rate_limit(client_ip, payload.email)
    if is_locked:
        raise HTTPException(
            status_code=429,
            detail=f"Too many password reset requests. Please try again in {remaining_sec // 60 + 1} minutes."
        )

    success, message, token = AuthService.request_password_reset(payload.email)
    if token:
        app_url = os.getenv("APP_URL", "http://localhost:3000")
        reset_url = f"{app_url}/reset-password?token={token}"
        try:
            subject, text, html = EmailService.render_password_reset(reset_url)
            EmailService.send_email(
                to=payload.email,
                subject=subject,
                html=html,
                text=text,
                template_name="password_reset"
            )
        except Exception as e:
            logger.warning(f"[Password Reset Email] Failed to dispatch email to {payload.email}: {e}")
        if os.getenv("ENV") != "production":
            logger.info(f"[DEV CONSOLE MAILER] Password reset link for {payload.email}: {reset_url}")
    return {"status": "ok", "message": message, "dev_token": token if os.getenv("ENV") != "production" else None}


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
        raise HTTPException(status_code=400, detail=str(e))


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
            organization_id=user.get("organization_id", "org_howrah_steel_01"),
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
