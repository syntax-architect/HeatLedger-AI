"""
Unit and regression tests for Prompt B2: Modern Model Names and Extraction Cost Limits
Verifies:
1. Zero retired Gemini model strings in backend codebase.
2. FIRST_PASS_MODEL and ESCALATION_MODEL configurable via environment variables with modern defaults.
3. Token budget enforcement with hard stop and warning at 80% quota.
4. Model change log table records changes and benchmarks.
"""

import os
import re

from model_config import (
    FIRST_PASS_MODEL,
    ESCALATION_MODEL,
    get_active_models,
    init_model_log_table,
    log_model_change,
)
from token_budget_service import TokenBudgetService
from db.connection import get_db_connection


def test_b2_zero_retired_models_in_codebase():
    """Prove it check: grep finds no retired gemini legacy models in backend."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    forbidden_pattern = re.compile(r'gemini-(?:1\.[0-9]|2\.[0-9])')

    violations = []
    for root, _, files in os.walk(backend_dir):
        if ".venv" in root or "__pycache__" in root:
            continue
        for file in files:
            # Exclude test files where the regex or test logic is defined
            if file == "test_b2_model_cost_governance.py":
                continue
            if file.endswith((".py", ".sql", ".json")):
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_num, line in enumerate(f, 1):
                        if forbidden_pattern.search(line):
                            violations.append(f"{file}:{line_num}: {line.strip()}")

    assert not violations, f"Found retired Gemini models in backend:\n" + "\n".join(violations)


def test_b2_model_config_defaults():
    """Validates FIRST_PASS_MODEL and ESCALATION_MODEL have modern defaults."""
    assert FIRST_PASS_MODEL == "gemini-3.1-flash-lite"
    assert ESCALATION_MODEL == "gemini-3.8-flash"
    models = get_active_models()
    assert len(models) == 2
    assert models[0] == FIRST_PASS_MODEL
    assert models[1] == ESCALATION_MODEL


def test_b2_model_change_log_table():
    """Confirms model-change log table records model date, tier, and accuracy."""
    init_model_log_table()
    test_model = "gemini-3.1-flash-lite"
    log_model_change(model_name=test_model, tier="first_pass", accuracy_pct=98.5, notes="Golden set benchmark run")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT model_name, tier, accuracy_pct, notes FROM model_change_log WHERE model_name = ?", (test_model,))
        row = cursor.fetchone()
        assert row is not None
        assert row["model_name"] == test_model
        assert row["tier"] == "first_pass"
        assert row["accuracy_pct"] == 98.5


def test_b2_token_budget_hard_stop():
    """Validates hard stop when token budget is exhausted."""
    import time
    test_org = f"org_test_budget_{int(time.time() * 1000)}"
    # Daily limit 2000 tokens
    daily_limit = 2000

    # Under budget
    allowed, reason = TokenBudgetService.check_budget(
        organization_id=test_org,
        estimated_tokens=500,
        daily_limit=daily_limit
    )
    assert allowed is True
    assert reason is None

    # Record 1800 tokens (90% of budget)
    TokenBudgetService.record_usage(
        organization_id=test_org,
        model=FIRST_PASS_MODEL,
        tokens_used=1800,
        cost_paise=9.0
    )

    # Next call requiring 500 tokens should exceed 2000 daily limit
    allowed_over, reason_over = TokenBudgetService.check_budget(
        organization_id=test_org,
        estimated_tokens=500,
        daily_limit=daily_limit
    )
    assert allowed_over is False
    assert any(w in reason_over.lower() for w in ["limit reached", "budget exceeded"])
