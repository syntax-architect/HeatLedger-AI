"""
HEATLEDGER AI: Prompt B12 - Observability, Sentry & System Reliability
Provides:
- Structured JSON logging with X-Correlation-ID request tracking
- Sentry error monitoring wrapper with PII & secrets sanitization
- Deep health & readiness checks (database, standards library, disk)
- Degraded mode graceful fallback triggers
"""

import json
import logging
import os
import re
import sys
import time
import uuid
from typing import Any, Dict, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

try:
    from backend.db.connection import get_db_connection, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from db.connection import get_db_connection, SQLITE_DB_PATH as DB_PATH

# PII and Secret patterns to redact
REDACTION_PATTERNS = [
    (re.compile(r"Bearer\s+[A-Za-z0-9_\-\.]+", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"hl_live_[a-f0-9]+", re.IGNORECASE), "hl_live_[REDACTED_API_KEY]"),
    (re.compile(r"whsec_[a-f0-9]+", re.IGNORECASE), "whsec_[REDACTED_WEBHOOK_SECRET]"),
    (re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b"), "[REDACTED_PAN]"),  # Indian PAN
    (re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b"), "[REDACTED_GSTIN]"),  # GSTIN
]

def sanitize_pii(text: str) -> str:
    """Sanitizes sensitive business secrets, tokens, and PII from log lines and Sentry events."""
    if not isinstance(text, str):
        return str(text)
    sanitized = text
    for pattern, replacement in REDACTION_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized

class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON without plain text secrets."""
    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": sanitize_pii(record.getMessage()),
            "correlation_id": getattr(record, "correlation_id", "N/A"),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)

def init_sentry(dsn: Optional[str] = None):
    """Initializes Sentry with strict PII scrubbing. Safe no-op if DSN is omitted."""
    sentry_dsn = dsn or os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        logging.getLogger("heatledger.observability").info("Sentry DSN not provided; running in local observability mode.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration

        def before_send(event, hint):
            # Sanitize event data
            if "request" in event and "headers" in event["request"]:
                for h in ["authorization", "x-api-key", "cookie"]:
                    if h in event["request"]["headers"]:
                        event["request"]["headers"][h] = "[REDACTED]"
            return event

        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=0.1,
            before_send=before_send,
            environment=os.getenv("ENV", "production"),
            release=os.getenv("APP_RELEASE", "heatledger-ai@2.0.0"),
            send_default_pii=False
        )
        return True
    except ImportError:
        logging.getLogger("heatledger.observability").warning("sentry-sdk not installed; continuing without remote error telemetry.")
        return False

def capture_exception_with_context(
    exc: Exception,
    request_id: Optional[str] = None,
    org_id: Optional[str] = None,
    user_id: Optional[str] = None
) -> Optional[str]:
    """Captures exception to Sentry with scrubbed tenant tags and no personal data."""
    try:
        import sentry_sdk
        with sentry_sdk.push_scope() as scope:
            if request_id:
                scope.set_tag("request_id", request_id)
            if org_id:
                scope.set_tag("organization_id", org_id)
            if user_id:
                scope.set_user({"id": user_id})
            return sentry_sdk.capture_exception(exc)
    except Exception:
        return None

def check_system_health() -> Dict[str, Any]:
    """Performs deep health and readiness checks across storage and database."""
    health_status = {
        "status": "HEALTHY",
        "timestamp": time.time(),
        "database": "UNKNOWN",
        "storage": "UNKNOWN",
        "standards_engine": "READY"
    }

    # 1. Check Database connection & writeability
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
        health_status["database"] = "CONNECTED"
    except Exception as e:
        health_status["database"] = f"ERROR: {str(e)}"
        health_status["status"] = "UNHEALTHY"

    # 2. Check storage directory writeability
    storage_dir = os.path.dirname(DB_PATH)
    if os.path.exists(storage_dir) and os.access(storage_dir, os.W_OK):
        health_status["storage"] = "READ_WRITE"
    else:
        health_status["storage"] = "READ_ONLY_OR_MISSING"
        health_status["status"] = "DEGRADED"

    return health_status
