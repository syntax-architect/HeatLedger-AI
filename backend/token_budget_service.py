"""
HEATLEDGER AI: Cost Control & Token Budget Service (Prompt R5)
Enforces hard daily and monthly LLM token budgets to prevent runaway costs:
- Cheap model (local text layer / Flash-Lite) executed first
- Escalation to paid/larger models ONLY on low confidence (< 0.85)
- Token budget limits checked prior to any paid API invocation
- Returns deterministic 'limit reached' message when budget is exhausted
- Zero database locks: uses SQLite with WAL mode
"""

import os
import logging
from datetime import datetime, timezone
from typing import Tuple, Optional, Dict, Any

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

logger = logging.getLogger("heatledger.budget")

# Default token limits (configurable via environment)
DEFAULT_DAILY_TOKEN_LIMIT = int(os.getenv("EXTRACTION_DAILY_TOKEN_LIMIT", "50000"))
DEFAULT_MONTHLY_TOKEN_LIMIT = int(os.getenv("EXTRACTION_MONTHLY_TOKEN_LIMIT", "1000000"))


class TokenBudgetExceededError(Exception):
    """Raised when an organization's token budget has been exhausted."""
    pass


class TokenBudgetService:
    @staticmethod
    def _init_tables():
        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS token_budget_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    organization_id TEXT NOT NULL,
                    period_date TEXT NOT NULL,
                    period_month TEXT NOT NULL,
                    model TEXT NOT NULL,
                    tokens_used INTEGER NOT NULL DEFAULT 0,
                    cost_paise REAL NOT NULL DEFAULT 0.0,
                    calls_count INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_token_budget_org_period 
                ON token_budget_tracking(organization_id, period_date, period_month);
            """)
            conn.commit()

    @classmethod
    def check_budget(
        cls,
        organization_id: str,
        estimated_tokens: int = 1000,
        daily_limit: Optional[int] = None,
        monthly_limit: Optional[int] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Verifies whether organization has sufficient remaining token budget.
        Returns (is_allowed, denial_reason).
        """
        cls._init_tables()
        d_limit = daily_limit if daily_limit is not None else DEFAULT_DAILY_TOKEN_LIMIT
        m_limit = monthly_limit if monthly_limit is not None else DEFAULT_MONTHLY_TOKEN_LIMIT

        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        month_str = now.strftime("%Y-%m")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Check daily usage
            cursor.execute("""
                SELECT COALESCE(SUM(tokens_used), 0) FROM token_budget_tracking
                WHERE organization_id = ? AND period_date = ?
            """, (organization_id, today_str))
            daily_used = cursor.fetchone()[0]

            if (daily_used + estimated_tokens) > d_limit:
                msg = f"Daily token budget limit reached ({daily_used}/{d_limit} tokens). Manual entry or plan upgrade required."
                logger.warning(f"[Token Budget] Org {organization_id}: {msg}")
                return False, msg

            # Check monthly usage
            cursor.execute("""
                SELECT COALESCE(SUM(tokens_used), 0) FROM token_budget_tracking
                WHERE organization_id = ? AND period_month = ?
            """, (organization_id, month_str))
            monthly_used = cursor.fetchone()[0]

            if (monthly_used + estimated_tokens) > m_limit:
                msg = f"Monthly token budget limit reached ({monthly_used}/{m_limit} tokens). Manual entry or plan upgrade required."
                logger.warning(f"[Token Budget] Org {organization_id}: {msg}")
                return False, msg

        return True, None

    @classmethod
    def record_usage(
        cls,
        organization_id: str,
        model: str,
        tokens_used: int,
        cost_paise: float = 0.0
    ):
        """Records token and cost consumption."""
        cls._init_tables()
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        month_str = now.strftime("%Y-%m")
        created_at = now.isoformat()

        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO token_budget_tracking
                (organization_id, period_date, period_month, model, tokens_used, cost_paise, calls_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (organization_id, today_str, month_str, model, tokens_used, cost_paise, created_at))
            conn.commit()

    @classmethod
    def get_budget_status(
        cls,
        organization_id: str,
        daily_limit: Optional[int] = None,
        monthly_limit: Optional[int] = None
    ) -> Dict[str, Any]:
        """Returns active budget consumption status."""
        cls._init_tables()
        d_limit = daily_limit if daily_limit is not None else DEFAULT_DAILY_TOKEN_LIMIT
        m_limit = monthly_limit if monthly_limit is not None else DEFAULT_MONTHLY_TOKEN_LIMIT

        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        month_str = now.strftime("%Y-%m")

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COALESCE(SUM(tokens_used), 0), COALESCE(SUM(cost_paise), 0.0), COUNT(*)
                FROM token_budget_tracking
                WHERE organization_id = ? AND period_date = ?
            """, (organization_id, today_str))
            d_row = cursor.fetchone()
            daily_tokens, daily_cost, daily_calls = d_row[0], d_row[1], d_row[2]

            cursor.execute("""
                SELECT COALESCE(SUM(tokens_used), 0), COALESCE(SUM(cost_paise), 0.0), COUNT(*)
                FROM token_budget_tracking
                WHERE organization_id = ? AND period_month = ?
            """, (organization_id, month_str))
            m_row = cursor.fetchone()
            monthly_tokens, monthly_cost, monthly_calls = m_row[0], m_row[1], m_row[2]

        return {
            "organization_id": organization_id,
            "daily_tokens_used": daily_tokens,
            "daily_token_limit": d_limit,
            "daily_remaining": max(0, d_limit - daily_tokens),
            "daily_cost_paise": round(daily_cost, 2),
            "daily_calls": daily_calls,
            "monthly_tokens_used": monthly_tokens,
            "monthly_token_limit": m_limit,
            "monthly_remaining": max(0, m_limit - monthly_tokens),
            "monthly_cost_paise": round(monthly_cost, 2),
            "monthly_calls": monthly_calls,
            "limit_reached": (daily_tokens >= d_limit) or (monthly_tokens >= m_limit)
        }

    @classmethod
    def reset_usage_for_testing(cls, organization_id: str):
        """Helper for test suites."""
        cls._init_tables()
        with get_db_connection() as conn:
            conn.execute("DELETE FROM token_budget_tracking WHERE organization_id = ?", (organization_id,))
            conn.commit()
