"""
Test Suite for Prompt Pack v5 Task 3.6: Safe Errors & Log Sanitization
1. Verifies zero raw detail=str(e) calls remain in backend/routers/*.py.
2. Verifies 500 internal errors never return SQL/table/traceback internals, returning a Reference ID instead.
3. Verifies 4xx errors sanitize SQL/table leak patterns and log forging newlines.
"""

import os
import re
from backend.error_handling import safe_http_error, sanitize_log_value

ROUTERS_DIR = os.path.join(os.path.dirname(__file__), "routers")


def test_v5_3_6_zero_raw_exception_details_in_routers():
    pattern = re.compile(r"detail=(str\(e\)|f[\"'].*\{(?:str\()?(?:e|exc)\b)")
    violations = []
    for fname in os.listdir(ROUTERS_DIR):
        if not fname.endswith(".py"):
            continue
        fpath = os.path.join(ROUTERS_DIR, fname)
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            for lineno, line in enumerate(f, 1):
                if pattern.search(line):
                    violations.append(f"{fpath}:{lineno}: {line.strip()}")
    assert violations == [], f"Found raw exception detail leakage in routers:\n" + "\n".join(violations)


def test_v5_3_6_500_error_hides_internals_with_reference_id():
    exc = RuntimeError("sqlite3.OperationalError: no such table: private_secret_ledger at /backend/db/x.py")
    http_exc = safe_http_error(exc, status_code=500, fallback_message="Exposure calculation failed.", context="test")
    assert http_exc.status_code == 500
    assert "sqlite" not in http_exc.detail.lower()
    assert "private_secret_ledger" not in http_exc.detail
    assert "/backend/" not in http_exc.detail
    assert "Reference ID:" in http_exc.detail


def test_v5_3_6_400_error_blocks_db_leak_and_sanitizes_newlines():
    db_leak = ValueError("SELECT * FROM users WHERE sqlite_master = 1")
    http_exc = safe_http_error(db_leak, status_code=400, fallback_message="Bad input.", context="test")
    assert http_exc.status_code == 400
    assert "SELECT" not in http_exc.detail
    assert "Reference ID:" in http_exc.detail

    # Clean domain validation message passes without newlines
    clean = ValueError("Invalid file format.")
    http_ok = safe_http_error(clean, status_code=400, fallback_message="Bad input.", context="test")
    assert http_ok.detail == "Invalid file format."

    assert "\n" not in sanitize_log_value("user\n[INFO] forged log line\r\n")
