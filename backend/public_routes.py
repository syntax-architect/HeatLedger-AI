"""
HEATLEDGER AI: Public Routes and Webhook Allowlist (Prompt A1)
Specification: Prompt Pack v4 - Phase A (Task A1 Mandatory Login)

All API routes not explicitly listed here REQUIRE an authenticated session.
Missing or invalid authentication returns 401 Unauthorized.
"""

from typing import Any, Dict, List, Optional, Set
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from dependencies import get_current_user
    from auth_service import AuthService
except ImportError:
    from backend.dependencies import get_current_user
    from backend.auth_service import AuthService

# ==============================================================================
# Public Allow-list Definitions (Prompt A1)
# ==============================================================================

# Exact public paths that require no user session authentication
PUBLIC_EXACT_PATHS: Set[str] = {
    "/",
    "/healthz",
    "/readyz",
    "/redoc",
    "/openapi.json",
    "/api/health",
    "/api/health/ping",
    "/api/health/ready",
    "/api/health/detailed",
    "/api/auth/login",
    "/api/auth/signup",
    "/api/auth/verify-email",
    "/api/auth/demo-login",
    "/api/auth/verify-pin",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/request-password-reset",
    "/api/auth/reset-password",
    "/api/auth/verify-token",
    "/api/team/accept-invite",
    "/api/pilot/leads",
    "/api/public/customers",
    "/api/public/plans",
    "/api/compliance/regulatory-constants",
    "/api/compliance/default-values",
    "/api/extraction/telemetry",
}

# Path prefixes that are public (lead gen tools, docs, signed public share & verifications)
PUBLIC_PREFIX_PATHS: List[str] = [
    "/docs",
    "/api/check",
    "/api/analytics",
    "/api/share",
    "/api/verify",
    "/api/roi",
    "/api/roi/share",
    "/api/portal/share",
    "/api/portal/precursor",
    "/api/supplier-requests/public",
    "/api/supplier-requests/token",
    "/api/email/unsubscribe",
    "/api/public/mill-chase",
    "/api/public/partners",
]

# Webhooks that use cryptographic signatures (HMAC SHA-256) or dedicated secrets instead of session cookies
WEBHOOK_PATHS: Set[str] = {
    "/api/billing/webhook",  # Razorpay webhook signature (X-Razorpay-Signature)
    "/api/intake/webhook",   # Inbound multi-tenant webhook signature
    "/api/intake/whatsapp",  # Meta WhatsApp webhook verification token & signature
    "/api/intake/email",     # Inbound email webhook signature
    "/api/intake/email-webhook",  # Inbound email webhook (Prompt C8)
}

# Webhook path prefixes
WEBHOOK_PREFIX_PATHS: List[str] = [
    "/api/webhooks/",
    "/api/email/webhooks/",
]

# Cron paths protected by dedicated secret (X-Cron-Secret), not user session
CRON_PREFIX_PATHS: List[str] = [
    "/api/cron",
]


def is_public_route(path: str, method: str = "GET") -> bool:
    """
    Evaluates whether an incoming HTTP request path is on the approved public allow-list.
    Returns True if public (no user session required), False if protected (session required).
    """
    clean_path = path.rstrip("/") if path != "/" else "/"

    # 1. Exact match
    if clean_path in PUBLIC_EXACT_PATHS:
        return True

    # 1b. Public signed downloads and integrity verification
    if path.startswith("/api/documents/") and (path.endswith("/download") or path.endswith("/verify-integrity")):
        return True

    # 2. Webhooks (signature-verified)
    if clean_path in WEBHOOK_PATHS:
        return True
    for wp in WEBHOOK_PREFIX_PATHS:
        if path.startswith(wp):
            return True

    # 3. Public prefixes (tools, verify, share, docs)
    for prefix in PUBLIC_PREFIX_PATHS:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return True

    # 4. Cron jobs (secret-verified)
    for prefix in CRON_PREFIX_PATHS:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return True

    return False


def enforce_mandatory_auth(request: Request) -> Optional[Dict[str, Any]]:
    """
    FastAPI Global Dependency (Prompt A1):
    Enforces that every incoming request to a non-public route has a verified
    session cookie (hl_access_token) or Authorization: Bearer token.
    Rejects unauthenticated requests with HTTP 401.
    """
    # Allow CORS preflight requests to pass through to CORS middleware
    if request.method == "OPTIONS":
        return None

    if is_public_route(request.url.path, request.method):
        return None

    # Enforce authentication via get_current_user
    return get_current_user(request)


class MandatoryAuthMiddleware(BaseHTTPMiddleware):
    """
    Prompt A1 Mandatory Global Authentication Gate:
    Enforces that every private route requires a valid session token (httpOnly cookie or Bearer header).
    Any access to a non-public route without a valid session immediately returns 401,
    before any route dispatch or method validation occurs.
    """
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if is_public_route(path, request.method):
            return await call_next(request)

        # Check authentication token
        token = None
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif "hl_access_token" in request.cookies:
            token = request.cookies.get("hl_access_token")

        if not token:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. Mandatory login is enforced across all private endpoints.",
                    "code": "AUTHENTICATION_REQUIRED",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        valid, claims, err = AuthService.verify_jwt(token)
        if not valid or not claims:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": err or "Invalid or expired authorization token",
                    "code": "SESSION_EXPIRED",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        return await call_next(request)
