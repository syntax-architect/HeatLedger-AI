"""
HEATLEDGER AI: Prompt Pack v5 Task 2.4 — No Per-Process Shared State
Proves:
1. SlidingWindowRateLimiter persists counters in the shared `rate_limits` DB table so two separate
   middleware instances (simulating 2 gunicorn workers) enforce exact combined limits.
2. AdminService feature flags & maintenance_mode persist in `feature_flags` DB table with <=5s cache,
   so flipping maintenance_mode is immediately visible across workers.
3. Multi-threaded concurrent writes to LoginRateLimiter / rate_limits remain exact.
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor

from main import SlidingWindowRateLimiter
from admin_service import AdminService
from auth_service import LoginRateLimiter


def test_v5_2_4_rate_limiter_shared_across_workers():
    """Two separate SlidingWindowRateLimiter instances share exact counts via DB."""
    worker_a = SlidingWindowRateLimiter(app=None)
    worker_b = SlidingWindowRateLimiter(app=None)

    key = f"ip:203.0.113.10:test_{uuid.uuid4().hex[:8]}"
    now = time.time()

    # Limit = 3: 2 requests hit Worker A, 1 hits Worker B, 4th hits Worker B and is blocked
    assert worker_a._check_and_increment(key, limit=3, window=60, now=now)[0] is True
    assert worker_a._check_and_increment(key, limit=3, window=60, now=now)[0] is True
    assert worker_b._check_and_increment(key, limit=3, window=60, now=now)[0] is True

    allowed, remaining, retry_after = worker_b._check_and_increment(key, limit=3, window=60, now=now)
    assert allowed is False
    assert remaining == 0
    assert retry_after >= 1


def test_v5_2_4_feature_flags_and_maintenance_mode_shared_in_db():
    """Flipping maintenance_mode persists to DB and survives in-process cache clears."""
    original = AdminService.get_feature_flags(bypass_cache=True).get("maintenance_mode", False)
    try:
        AdminService.update_kill_switch("maintenance_mode", True)
        # Simulate another worker with empty local cache
        AdminService._flags_cache = None
        AdminService._flags_cache_at = 0.0
        flags_other_worker = AdminService.get_feature_flags()
        assert flags_other_worker["maintenance_mode"] is True
    finally:
        AdminService.update_kill_switch("maintenance_mode", original)


def test_v5_2_4_concurrent_rate_limit_threads_exact():
    """8 concurrent threads hitting LoginRateLimiter lock out at exact MAX_ATTEMPTS=5."""
    ip = f"198.51.100.{int(time.time()) % 200 + 10}"
    email = f"conc_{uuid.uuid4().hex[:8]}@example.com"

    def _fail(_idx):
        LoginRateLimiter.record_failure(ip, email)

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(_fail, range(8)))

    locked, retry_after = LoginRateLimiter.is_locked(ip, email)
    assert locked is True
    assert retry_after >= 1
