"""
Test Suite for Prompt Pack v5 Task 3.2: Zero String-Built SQL & Injection Safety
1. Scans every .py file under backend/ using AST + regex to verify ZERO f-strings in .execute(...) calls.
2. Tests SQL injection payloads against canonical services to ensure parameterized binding prevents tampering.
"""

import ast
import os
import re
import time
import pytest

from backend.portal_service import PortalService
from backend.mill_chaser_service import MillChaserService
from backend.supplier_request_service import SupplierRequestService
from backend.demo_service import DemoService

BACKEND_DIR = os.path.dirname(__file__)


def test_v5_3_2_zero_fstring_sql_in_backend():
    """Verify grep/AST detects zero execute(f"...") or execute(f'...') calls anywhere in backend/."""
    violations = []
    regex_pattern = re.compile(r"\.execute\(\s*f[\"']")

    for root, dirs, files in os.walk(BACKEND_DIR):
        dirs[:] = [d for d in dirs if d not in (".venv", "__pycache__", ".pytest_cache")]
        for fname in files:
            if not fname.endswith(".py"):
                continue
            # Exclude this test file itself from docstring scan
            if fname == os.path.basename(__file__):
                continue
            fpath = os.path.join(root, fname)
            with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                src = f.read()

            # 1. Direct regex match matching Prompt v5 Appendix check
            for lineno, line in enumerate(src.splitlines(), 1):
                if regex_pattern.search(line):
                    violations.append(f"{fpath}:{lineno}: {line.strip()}")

            # 2. AST check: cursor.execute(JoinedStr(...)) anywhere
            try:
                tree = ast.parse(src, filename=fpath)
            except SyntaxError:
                continue
            for node in ast.walk(tree):
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
                    if node.func.attr in ("execute", "executemany") and node.args:
                        arg0 = node.args[0]
                        if isinstance(arg0, ast.JoinedStr):
                            violations.append(f"{fpath}:{node.lineno}: AST JoinedStr in .{node.func.attr}()")

    assert violations == [], f"Found string-built SQL execute() calls:\n" + "\n".join(violations)


@pytest.mark.parametrize("payload", [
    "' OR 1=1 --",
    "'; DROP TABLE mill_chase_requests; --",
    "HEAT-1\u2019 OR \u20181\u2019=\u20181",
    "A" * 5000,
])
def test_v5_3_2_sql_injection_payloads_harmless(payload):
    """Verify injection strings never alter queries or raise unhandled SQL syntax errors."""
    org_id = f"org_sqli_test_{int(time.time() * 1000)}"
    # Should return empty list cleanly or safely handle parameterized lookup
    res = MillChaserService.get_mill_scorecard(organization_id=org_id, mill_name=payload)
    assert res == []

    # Token lookup with injection payload returns None cleanly (never 500 or table leak)
    tok = MillChaserService.get_public_request_by_token(payload)
    assert tok is None

    # Portal listing with injection shipment_id returns empty list safely
    links = PortalService.list_share_links(organization_id=org_id, shipment_id=payload)
    assert links == []
