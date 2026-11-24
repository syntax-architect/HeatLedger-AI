"""
HEATLEDGER AI: Common FastAPI Dependencies & Authentication Hooks (Prompt M4)
Provides reusable dependency injectors for user authentication, CSRF checks,
tenant context injection, and role enforcement.
"""

import hmac
import os
from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, Request

try:
    from auth_service import AuthService
except ImportError:
    from backend.auth_service import AuthService


def get_client_ip(request: Request) -> str:
    """Extracts client IP from proxy headers or socket address."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


def get_current_user(request: Request) -> Dict[str, Any]:
    """
    FastAPI Dependency:
    Extracts Bearer token from Authorization header or httpOnly session cookie (hl_access_token).
    Enforces Double Submit CSRF protection for cookie-based state-changing requests.
    Queries user and verified organization membership role directly from the database.
    Rejects missing/expired tokens with 401.
    """
    token = None
    from_cookie = False

    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
    elif "hl_access_token" in request.cookies:
        token = request.cookies.get("hl_access_token")
        from_cookie = True

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization Bearer header or session cookie"
        )

    # CSRF protection for cookie sessions on state-changing requests
    if from_cookie and request.method in ("POST", "PUT", "DELETE", "PATCH"):
        csrf_header = request.headers.get("x-csrf-token") or request.headers.get("X-CSRF-Token")
        csrf_cookie = request.cookies.get("hl_csrf_token")
        if not csrf_header or not csrf_cookie or not hmac.compare_digest(csrf_header, csrf_cookie):
            raise HTTPException(
                status_code=403,
                detail="CSRF protection check failed: missing or invalid X-CSRF-Token header"
            )

    valid, claims, err = AuthService.verify_jwt(token)
    if not valid or not claims:
        raise HTTPException(
            status_code=401,
            detail=err or "Invalid or expired authorization token"
        )

    user_id = claims.get("user_id") or claims.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    org_id = claims.get("org_id") or claims.get("organization_id")
    user = AuthService.get_user_with_role(user_id, org_id)
    if not user:
        raise HTTPException(status_code=401, detail="User account or organization membership not found")

    user_org_id = user.get("organization_id") or user.get("org_id")
    user["organization_id"] = user_org_id
    user["org_id"] = user_org_id
    request.state.organization_id = user_org_id
    try:
        from backend.db.connection import set_tenant_context
    except ImportError:
        from db.connection import set_tenant_context
    set_tenant_context(org_id=user_org_id, is_service_role=False)
    return user


def get_org_context(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    FastAPI Dependency (Prompt A2: Tenant from Session):
    Extracts {organization_id, user_id, role} strictly from the verified session context.
    Never accepts organization_id or plant_id from query, form, or body for access decisions.
    """
    org_id = user.get("organization_id") or user.get("org_id")
    user_id = user.get("id") or user.get("user_id") or user.get("sub")
    role = user.get("role", "VIEWER")

    if not org_id:
        raise HTTPException(
            status_code=401,
            detail="Session has no verified organization membership."
        )

    return {
        "organization_id": org_id,
        "user_id": user_id,
        "role": role,
    }


def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """
    FastAPI Dependency:
    Optionally extracts Bearer token or session cookie if present.
    Returns user dict or None if unauthenticated.
    """
    try:
        return get_current_user(request)
    except HTTPException:
        return None


def require_roles(allowed_roles: List[str]):
    """
    FastAPI Dependency Factory:
    Enforces that authenticated user holds one of the allowed roles (OWNER, QA_INSPECTOR, DISPATCH, VIEWER).
    """
    def _role_checker(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = user.get("role", "")
        normalized_role = "QA_INSPECTOR" if user_role == "QA_HEAD" else user_role
        normalized_allowed = [
            "QA_INSPECTOR" if r == "QA_HEAD" else r for r in allowed_roles
        ]
        if normalized_role not in normalized_allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: Insufficient privileges. Required role in {allowed_roles}, your role is {user_role}"
            )
        return user
    return _role_checker


def require_qa_head(request: Request) -> Dict[str, Any]:
    """
    FastAPI Dependency:
    Backward-compatible dependency checking QA Inspector authorization.
    """
    user = get_current_user(request)
    if user.get("role") not in ("QA_INSPECTOR", "QA_HEAD"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Authorised QA Inspector credentials required"
        )
    return user


def require_qa_inspector_step_up(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    FastAPI Dependency:
    Enforces Prompt H2 signing requirements:
    1. Caller must hold QA_INSPECTOR role.
    2. Caller must have passed 6-digit MFA / passkey step-up check within last 10 minutes (600s).
    """
    if user.get("role") not in ("QA_INSPECTOR", "QA_HEAD"):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: QA_INSPECTOR role required to sign certificates"
        )
    if not AuthService.check_step_up_valid(user["id"]):
        raise HTTPException(
            status_code=403,
            detail="Step-up verification expired or required. Fresh MFA check within 10 minutes is required to sign."
        )
    return user
