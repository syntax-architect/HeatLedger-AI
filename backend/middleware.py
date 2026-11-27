"""
HEATLEDGER AI: HTTP Middleware, Rate Limiting, Size Limits & Exception Handlers
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

try:
    from auth_service import AuthService
    from dependencies import get_client_ip
    from db.connection import get_db_connection
except ImportError:
    from backend.auth_service import AuthService
    from backend.dependencies import get_client_ip
    from backend.db.connection import get_db_connection

logger = logging.getLogger("heatledger.security")

MAX_JSON_BODY_BYTES = 1 * 1024 * 1024
MAX_UPLOAD_BODY_BYTES = 15 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Prompt D1 & D5 Startup Configuration & Security Check:
    Loads pydantic-settings AppSettings. Refuses to start in production if
    any mandatory secret or production requirement is missing or violated.
    """
    env_str = os.getenv("ENV", os.getenv("APP_ENV", "development")).lower()
    demo_mode_flag = os.getenv("DEMO_MODE", "false").lower() in ("true", "1")
    if env_str == "production" and demo_mode_flag:
        raise RuntimeError("Startup security failure: Production refuses to boot if DEMO_MODE=true.")

    try:
        try:
            from backend.settings import AppSettings
        except ImportError:
            from settings import AppSettings
        settings = AppSettings()
        logger.info(f"[STARTUP] Configuration loaded via pydantic-settings. Environment: {settings.ENV}, Brand: {settings.BRAND_NAME}")
    except Exception as e:
        err_msg = str(e)
        if "known default" in err_msg.lower() or "default" in err_msg.lower():
            raise RuntimeError(f"Startup security failure: secret is a known default: {e}")
        raise RuntimeError(f"Startup security failure: {e}")
    yield


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """OWASP API Security Middleware: defense-in-depth headers, fingerprinting strip, correlation ID."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id

        try:
            response: Response = await call_next(request)
        except Exception as e:
            logger.error(f"[{request_id}] Unhandled server exception: {e}", exc_info=True)
            response = JSONResponse(
                status_code=500,
                content={"error": "Internal processing error", "request_id": request_id},
            )

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "0"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"

        if request.url.path.startswith("/capture") or request.url.path.startswith("/api/capture"):
            response.headers["Permissions-Policy"] = "camera=(self), microphone=(), geolocation=(), payment=()"
        else:
            response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"

        is_prod = os.getenv("ENV", "").lower() == "production"
        if is_prod:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https:; "
                "style-src 'self' 'unsafe-inline' https:; "
                "img-src 'self' data: blob: https:; "
                "font-src 'self' data: https:; "
                "connect-src 'self' https://api.heatledger.ai https://*.supabase.co; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https:; "
                "style-src 'self' 'unsafe-inline' https:; "
                "img-src 'self' data: blob: https:; "
                "font-src 'self' data: https:; "
                "connect-src 'self' http: https: ws: wss:; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )

        if request.url.path.startswith("/api"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"

        if "server" in response.headers:
            del response.headers["server"]
        response.headers["X-Powered-By"] = "HeatLedger-Core-SE"
        response.headers["X-Request-ID"] = request_id
        return response


class SlidingWindowRateLimiter(BaseHTTPMiddleware):
    """Database-backed rate limiter keyed by user/org or client IP (Prompt Pack v5 Task 2.4)."""

    _table_ready: bool = False

    def __init__(self, app):
        super().__init__(app)

    @classmethod
    def _ensure_table(cls, conn) -> None:
        if cls._table_ready:
            return
        conn.execute("""
            CREATE TABLE IF NOT EXISTS rate_limits (
                rate_key TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0,
                window_start REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)
        conn.commit()
        cls._table_ready = True

    @classmethod
    def _check_and_increment(cls, key: str, limit: int, window: int, now: float) -> tuple[bool, int, int]:
        """Atomically increments `rate_limits` for `key` and returns (allowed, remaining, retry_after)."""
        with get_db_connection(is_service_role=True) as conn:
            cls._ensure_table(conn)
            row = conn.execute(
                """
                INSERT INTO rate_limits (rate_key, count, window_start, updated_at)
                VALUES (?, 1, ?, ?)
                ON CONFLICT(rate_key) DO UPDATE SET
                    count = CASE
                        WHEN ? - rate_limits.window_start >= ? THEN 1
                        ELSE rate_limits.count + 1
                    END,
                    window_start = CASE
                        WHEN ? - rate_limits.window_start >= ? THEN ?
                        ELSE rate_limits.window_start
                    END,
                    updated_at = ?
                RETURNING count, window_start
                """,
                (key, now, now, now, window, now, window, now, now),
            ).fetchone()
            conn.commit()

        count = row[0] if not isinstance(row, dict) else row["count"]
        win_start = row[1] if not isinstance(row, dict) else row["window_start"]
        if count > limit:
            retry_after = max(1, int(window - (now - win_start)))
            return False, 0, retry_after
        return True, max(0, limit - count), 0

    def _get_route_limit(self, path: str) -> tuple[str, int, int] | None:
        if path.startswith("/api/webhooks"):
            return None
        elif path.startswith("/api/auth/verify-pin") or path.startswith("/api/auth/login"):
            return ("auth_bruteforce", 5, 900)
        elif "/verify-passcode" in path:
            return ("portal_passcode_bruteforce", 10, 900)
        elif path.startswith("/api/assistant"):
            return ("assistant_rate_limit", 20, 60)
        elif path.startswith("/api/leads"):
            return ("leads_rate_limit", 5, 900)
        elif path.startswith("/api/portal/share-links") or path.startswith("/api/share"):
            return ("share_link_creation", 20, 60)
        elif path.startswith("/api/ocr"):
            return ("ocr", 10, 60)
        elif path.startswith("/api/dossier") or path.startswith("/api/compliance") or path.startswith("/api/auth"):
            return ("api_general", 60, 60)
        elif path == "/" or path.startswith("/api"):
            return ("api_general", 60, 60)
        return None

    async def dispatch(self, request: Request, call_next):
        if os.getenv("DISABLE_RATE_LIMITER", "false").lower() == "true":
            return await call_next(request)

        route_limit = self._get_route_limit(request.url.path)
        if not route_limit:
            return await call_next(request)

        bucket, limit, window = route_limit
        client_ip = get_client_ip(request)

        if client_ip in ("testclient", "127.0.0.1", "::1", "localhost") and os.getenv("TESTING_RATE_LIMIT", "false").lower() != "true":
            return await call_next(request)

        user_id = None
        org_id = None
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            valid, claims, _ = AuthService.verify_jwt(token)
            if valid and claims:
                user_id = claims.get("user_id") or claims.get("sub")
                org_id = claims.get("org_id") or claims.get("organization_id")

        keys_to_check = []
        if user_id:
            keys_to_check.append((f"user:{user_id}:{bucket}", limit))
        if org_id:
            keys_to_check.append((f"org:{org_id}:{bucket}", limit * 3))
        if not user_id and not org_id:
            keys_to_check.append((f"ip:{client_ip}:{bucket}", limit))

        now = time.time()
        remaining = limit
        for key, cur_limit in keys_to_check:
            allowed, key_remaining, retry_after = self._check_and_increment(key, cur_limit, window, now)
            if not allowed:
                request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
                logger.warning(f"[{request_id}] Rate limit exceeded for {key} on bucket '{bucket}'. Retry after {retry_after}s.")
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": "Too Many Requests",
                        "detail": f"Rate limit quota exceeded: Maximum {cur_limit} requests per minute. Retry after {retry_after} seconds.",
                    },
                    headers={
                        "X-RateLimit-Limit": str(cur_limit),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(retry_after),
                    },
                )
            remaining = min(remaining, key_remaining)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


def _reject_non_finite_json(constant: str):
    raise ValueError(f"Non-finite JSON constant '{constant}' is not permitted")


class RequestBodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Prompt Pack v5 Task 3.1: Reject oversized JSON (>1MB) and upload (>15MB) bodies with 413,
    and reject non-standard NaN/Infinity JSON constants with 400."""

    async def dispatch(self, request: Request, call_next):
        if request.method in ("POST", "PUT", "PATCH"):
            content_type = (request.headers.get("content-type") or "").lower()
            limit = MAX_UPLOAD_BODY_BYTES if "multipart/form-data" in content_type else MAX_JSON_BODY_BYTES
            raw_len = request.headers.get("content-length")
            if raw_len is not None:
                try:
                    if int(raw_len) > limit:
                        return JSONResponse(
                            status_code=413,
                            content={"detail": f"Request body exceeds maximum allowed size ({limit} bytes).", "code": "PAYLOAD_TOO_LARGE"},
                        )
                except ValueError:
                    return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})
            body = await request.body()
            if len(body) > limit:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request body exceeds maximum allowed size ({limit} bytes).", "code": "PAYLOAD_TOO_LARGE"},
                )
            if body and "application/json" in content_type:
                try:
                    json.loads(body.decode("utf-8"), parse_constant=_reject_non_finite_json)
                except (ValueError, UnicodeDecodeError):
                    return JSONResponse(
                        status_code=400,
                        content={"detail": "Invalid JSON payload (non-finite numbers or malformed encoding).", "code": "INVALID_JSON"},
                    )
        return await call_next(request)


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(HTTPException)
    async def custom_http_exception_handler(request: Request, exc: HTTPException):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        if exc.status_code >= 500:
            logger.error(f"[{request_id}] Internal error on {request.url.path}: {exc.detail}", exc_info=True)
            return JSONResponse(
                status_code=500,
                content={"error": "Internal processing error", "request_id": request_id},
                headers={"X-Request-ID": request_id},
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(Exception)
    async def global_unhandled_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal processing error", "request_id": request_id},
            headers={"X-Request-ID": request_id},
        )
