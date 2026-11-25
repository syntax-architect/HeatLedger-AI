# Kept Symbols & Files Register (Task 1.2)

This file documents every symbol or file reported by static dead-code checks (`vulture`) that is intentionally retained.

## Backend (`vulture --min-confidence 80`)

- `backend/analytics_service.py:17` (`date_range`): Public method parameter retained for API caller compatibility alongside `range_preset`.
- `backend/db/connection.py:411` (`exc_val`, `exc_tb`): Required positional parameters for Python's context manager `__exit__` protocol.
- `backend/email_service.py:349` (`is_essential`): Public `send_email` API parameter retained for callers classifying transactional vs non-essential mail.
- `backend/supplier_service.py:1578` (`uploaded_by_email`): Public `fulfill_request` API parameter retained for external upload attribution callers (merged from `mill_chaser_service.py`).
- `backend/observability.py:65` (`hint`): Required second parameter for Sentry SDK's `before_send(event, hint)` hook signature.
- `backend/main.py` (`check_system_health` re-export): Imported for backward-compatible monkeypatching (`patch("main.check_system_health")`) used by `/readyz` tests.
- `backend/test_s4_rls_isolation.py` (`seed_test_tenants`): Pytest fixture parameter injected automatically by `@pytest.fixture` to seed multi-tenant test rows before each test runs.

## Frontend (`tsconfig.json` path aliases)

- `src/lib/gsapShim.ts`: Mapped via `"gsap"` and `"gsap/*"` path aliases in `tsconfig.json` and Vite configuration.
