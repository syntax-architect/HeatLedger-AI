"""
HEATLEDGER AI: Safe Error Handling & Log Sanitization (Prompt Pack v5 - Task 3.6)

Prevents internal stack traces, table names, SQL queries, or file paths from leaking
to API callers while preserving correlation request IDs for server-side troubleshooting.
"""

import logging
import re
import uuid
from fastapi import HTTPException

logger = logging.getLogger("heatledger.errors")

_INTERNAL_LEAK_PATTERNS = re.compile(
    r"(sqlite|postgres|psycopg|traceback|syntax error|no such table|constraint failed|"
    r"select\s+|insert\s+into|update\s+|delete\s+from|/backend/|\\backend\\|c:\\)",
    re.IGNORECASE,
)


def sanitize_log_value(value: str) -> str:
    """Strips CR/LF and control characters to prevent log line forging."""
    return re.sub(r"[\r\n\x00-\x1f\x7f]", " ", str(value or ""))


def safe_http_error(
    exc: Exception,
    status_code: int = 400,
    fallback_message: str = "Unable to complete request.",
    context: str = "api",
) -> HTTPException:
    """
    Logs full exception server-side under a unique request_id and returns a safe HTTPException:
    - 5xx errors ALWAYS return a generic message + Reference ID.
    - 4xx business errors strip internal DB/path leaks if detected, otherwise pass sanitized message.
    """
    req_id = uuid.uuid4().hex[:12]
    safe_ctx = sanitize_log_value(context)
    safe_exc = sanitize_log_value(repr(exc))
    logger.warning(f"[req:{req_id}] {safe_ctx} failed ({status_code}): {safe_exc}")

    if status_code >= 500:
        return HTTPException(
            status_code=status_code,
            detail=f"{fallback_message} Reference ID: {req_id}",
        )

    msg = sanitize_log_value(str(exc)).strip()
    if not msg or len(msg) > 240 or _INTERNAL_LEAK_PATTERNS.search(msg):
        return HTTPException(
            status_code=status_code,
            detail=f"{fallback_message} Reference ID: {req_id}",
        )

    return HTTPException(status_code=status_code, detail=msg)
