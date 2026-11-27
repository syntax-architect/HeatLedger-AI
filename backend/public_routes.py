"""
HEATLEDGER AI: Public Routes and Webhook Allowlist (Prompt A1)
Specification: Prompt Pack v4 - Phase A (Task A1 Mandatory Login)

All API routes not explicitly listed here REQUIRE an authenticated session.
Missing or invalid authentication returns 401 Unauthorized.
"""

import hmac
import os
from typing import Any, Dict, List, Optional, Set
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from dependencies import get_current_user
    from auth_service import AuthService
    from role_matrix import enforce_role_matrix
except ImportError:
    from backend.dependencies import get_current_user
    from backend.auth_service import AuthService
    from backend.role_matrix import enforce_role_matrix

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
    "/api/auth/verify-email-otp",
    "/api/auth/resend-verification",
    "/api/auth/demo-login",
    "/api/auth/verify-pin",
    "/api/auth/logout",
    "/api/auth/refresh",
    "/api/auth/forgot-password",
    "/api/auth/request-password-reset",
    "/api/auth/verify-reset-otp",
    "/api/auth/reset-password",
    "/api/auth/reset-password-otp",
    "/api/auth/verify-token",
    "/api/team/accept-invite",
    "/api/pilot/leads",
    "/api/public/customers",
    "/api/public/plans",
    "/api/compliance/regulatory-constants",
    "/api/compliance/default-values",
    "/api/analytics/event",
    "/api/analytics/public-summary",
    "/api/analytics/track",
}

# Path prefixes that are public (lead gen tools, docs, signed public share & verifications)
PUBLIC_PREFIX_PATHS: List[str] = [
    "/docs",
    "/api/check",
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
CRON_EXACT_PATHS: Set[str] = {
    "/api/check/cleanup",
}

CRON_PREFIX_PATHS: List[str] = [
    "/api/cron",
]

# Documented security justification for every public, webhook, and cron entry (Prompt Pack v5 Task 3.3)
PUBLIC_PATH_REASONS: Dict[str, str] = {
    "/": "Root service status probe",
    "/healthz": "Kubernetes/Fly.io liveness probe",
    "/readyz": "Database readiness probe",
    "/redoc": "API reference docs (disabled in production)",
    "/openapi.json": "OpenAPI schema (disabled in production)",
    "/docs": "Swagger UI docs prefix (disabled in production)",
    "/api/health": "Service health check",
    "/api/health/ping": "Lightweight liveness ping",
    "/api/health/ready": "Readiness check",
    "/api/health/detailed": "System readiness check",
    "/api/auth/login": "Session bootstrap: password login",
    "/api/auth/signup": "Account registration (requires email verification)",
    "/api/auth/verify-email": "Single-use email verification token redemption",
    "/api/auth/verify-email-otp": "Email OTP verification",
    "/api/auth/resend-verification": "Rate-limited verification email resend",
    "/api/auth/demo-login": "Sandbox demo login (returns 403 in production)",
    "/api/auth/verify-pin": "Sandbox QA PIN login (blocked in production)",
    "/api/auth/logout": "Session termination",
    "/api/auth/refresh": "Refresh token rotation via httpOnly cookie",
    "/api/auth/forgot-password": "Password reset initiation (anti-enumeration)",
    "/api/auth/request-password-reset": "Password reset initiation alias (anti-enumeration)",
    "/api/auth/verify-reset-otp": "Password reset OTP check",
    "/api/auth/reset-password": "Password reset token redemption",
    "/api/auth/reset-password-otp": "Password reset OTP redemption",
    "/api/auth/verify-token": "Stateless token validity check",
    "/api/team/accept-invite": "One-time invited user password/account activation",
    "/api/pilot/leads": "Public marketing pilot lead capture",
    "/api/public/customers": "Public marketing customer showcase",
    "/api/public/plans": "Public pricing plans metadata",
    "/api/compliance/regulatory-constants": "Public CBAM/EU regulatory reference constants",
    "/api/compliance/default-values": "Public CBAM default emission factors",
    "/api/analytics/event": "Cookie-free public funnel event ingestion",
    "/api/analytics/public-summary": "Aggregated cookie-free public funnel counts",
    "/api/analytics/track": "Privacy-safe product funnel event tracker",
    "/api/check": "Public free MTC/CN-code check tool (cleanup excluded via CRON_EXACT_PATHS)",
    "/api/share": "Token-authenticated sealed dossier share view",
    "/api/verify": "Cryptographic hash/QR verification endpoint",
    "/api/roi": "Public ROI calculator",
    "/api/roi/share": "Token-authenticated ROI proposal share view",
    "/api/portal/share": "Token-authenticated importer portal share view",
    "/api/portal/precursor": "Token-authenticated precursor portal view",
    "/api/supplier-requests/public": "Public supplier request status/metadata by token",
    "/api/supplier-requests/token": "Token-authenticated supplier submission link",
    "/api/email/unsubscribe": "Signed one-click email unsubscribe link",
    "/api/public/mill-chase": "Token-authenticated mill chase response link",
    "/api/public/partners": "Public partner program metadata/application",
    "/api/documents/{id}/download": "HMAC-signed time-limited document download",
    "/api/documents/{id}/verify-integrity": "Public document SHA-256 integrity verification",
    "/api/billing/webhook": "Razorpay webhook (HMAC-SHA256 verified)",
    "/api/intake/webhook": "Inbound intake webhook (signature verified)",
    "/api/intake/whatsapp": "Meta WhatsApp webhook (verify token & HMAC verified)",
    "/api/intake/email": "Inbound email webhook (signature verified)",
    "/api/intake/email-webhook": "Inbound email webhook Prompt C8 (signature verified)",
    "/api/webhooks/": "Generic signature-verified webhooks prefix",
    "/api/email/webhooks/": "Email provider signature-verified webhooks prefix",
    "/api/check/cleanup": "Cron-secret protected 24h temporary upload cleanup",
    "/api/cron": "Cron-secret protected scheduled task prefix",
}

# Explicit CSRF-exempt route sets (Prompt Pack v5 Task 4.3):
# Exempt ONLY cryptographic webhook endpoints, secret-authenticated cron routes,
# and unauthenticated public/session-bootstrap routes (login/signup/verify/refresh/logout).
# EVERY protected state-changing route (POST/PUT/PATCH/DELETE) enforces Double-Submit CSRF for cookie sessions.
CSRF_EXEMPT_EXACT_PATHS: Set[str] = WEBHOOK_PATHS | PUBLIC_EXACT_PATHS | CRON_EXACT_PATHS
CSRF_EXEMPT_PREFIX_PATHS: List[str] = WEBHOOK_PREFIX_PATHS + CRON_PREFIX_PATHS + PUBLIC_PREFIX_PATHS


def is_csrf_exempt_route(path: str) -> bool:
    """Returns True ONLY for explicitly listed webhooks, cron, signed-document, and public unauthenticated endpoints."""
    clean_path = path.rstrip("/") if path != "/" else "/"
    if clean_path in CSRF_EXEMPT_EXACT_PATHS:
        return True
    if path.startswith("/api/documents/") and (path.endswith("/download") or path.endswith("/verify-integrity")):
        return True
    for wp in WEBHOOK_PREFIX_PATHS:
        if path.startswith(wp):
            return True
    for prefix in CRON_PREFIX_PATHS + PUBLIC_PREFIX_PATHS:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return True
    return False


def _is_production_env() -> bool:
    return (
        os.getenv("ENV", "").strip().lower() == "production"
        or os.getenv("APP_ENV", "").strip().lower() == "production"
    )


def is_public_route(path: str, method: str = "GET") -> bool:
    """
    Evaluates whether an incoming HTTP request path is on the approved public allow-list.
    Returns True if public (no user session required), False if protected (session required).
    """
    clean_path = path.rstrip("/") if path != "/" else "/"

    # Docs & OpenAPI endpoints are disabled in production
    if _is_production_env() and (
        clean_path in ("/redoc", "/openapi.json")
        or clean_path == "/docs"
        or clean_path.startswith("/docs/")
    ):
        return False

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

    # 3. Cron jobs (secret-verified; check before public prefixes so /api/check/cleanup is never public)
    if clean_path in CRON_EXACT_PATHS:
        return True
    for prefix in CRON_PREFIX_PATHS:
        if path == prefix or path.startswith(prefix + "/") or path.startswith(prefix + "?"):
            return True

    # 4. Public prefixes (tools, verify, share, docs)
    for prefix in PUBLIC_PREFIX_PATHS:
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

    # Enforce authentication via get_current_user, then validate canonical ROLE_MATRIX
    user = get_current_user(request)
    enforce_role_matrix(request.url.path, request.method, user)
    return user


class MandatoryAuthMiddleware(BaseHTTPMiddleware):
    """
    Prompt A1 + Pack v5 Task 4.3 Global Authentication & CSRF Gate:
    - Enforces valid session token (httpOnly cookie or Bearer header) on every private route.
    - Enforces Double Submit CSRF validation on every non-exempt state-changing cookie request
      before any route dispatch occurs (403 on missing/invalid X-CSRF-Token).
    """
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if is_public_route(path, request.method):
            return await call_next(request)

        # Check authentication token
        token = None
        from_cookie = False
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
        elif "hl_access_token" in request.cookies:
            token = request.cookies.get("hl_access_token")
            from_cookie = True

        if not token:
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Authentication required. Mandatory login is enforced across all private endpoints.",
                    "code": "AUTHENTICATION_REQUIRED",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Enforce Double Submit CSRF protection on ALL non-exempt cookie-authenticated mutations
        if from_cookie and request.method in ("POST", "PUT", "DELETE", "PATCH") and not is_csrf_exempt_route(path):
            csrf_header = request.headers.get("x-csrf-token") or request.headers.get("X-CSRF-Token")
            csrf_cookie = request.cookies.get("hl_csrf_token")
            if not csrf_header or not csrf_cookie or not hmac.compare_digest(csrf_header, csrf_cookie):
                return JSONResponse(
                    status_code=403,
                    content={
                        "detail": "CSRF protection check failed: missing or invalid X-CSRF-Token header",
                        "code": "CSRF_VALIDATION_FAILED",
                    },
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
