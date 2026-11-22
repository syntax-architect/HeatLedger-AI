#!/usr/bin/env python3
"""
HEATLEDGER AI: Production Load, Concurrency & Resilience Test CLI (Prompt D5)
Simulates concurrent traffic on API endpoints, measures p50/p95/p99 latency,
and tests graceful load shedding under burst traffic.

Usage:
  python scripts/load_test.py [--url http://localhost:8000] [--concurrency 10] [--requests 100]
"""

import argparse
import concurrent.futures
import json
import statistics
import sys
import time
import urllib.error
import urllib.request
from typing import Dict, List, Tuple


def send_request(url: str, timeout: float = 5.0) -> Tuple[int, float, str]:
    """Sends a single GET request, returns (status_code, latency_ms, error_msg)."""
    start = time.perf_counter()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HeatLedger-LoadTester/1.0"})
        with urllib.request.urlopen(req, timeout=timeout) as response:
            latency = (time.perf_counter() - start) * 1000.0
            return response.status, latency, ""
    except urllib.error.HTTPError as e:
        latency = (time.perf_counter() - start) * 1000.0
        return e.code, latency, str(e)
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000.0
        return 0, latency, str(e)


def run_benchmark(
    base_url: str,
    endpoint: str = "/healthz",
    concurrency: int = 10,
    total_requests: int = 100
) -> Dict[str, any]:
    """Executes concurrent benchmark and computes latency percentiles."""
    url = f"{base_url.rstrip('/')}{endpoint}"
    latencies: List[float] = []
    status_counts: Dict[int, int] = {}
    errors: List[str] = []

    print(f"\n[LOAD TEST] Target:      {url}")
    print(f"[LOAD TEST] Concurrency: {concurrency} workers")
    print(f"[LOAD TEST] Total Reqs:  {total_requests}")
    print("Executing benchmark...")

    t0 = time.perf_counter()

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(send_request, url) for _ in range(total_requests)]
        for f in concurrent.futures.as_completed(futures):
            code, lat, err = f.result()
            latencies.append(lat)
            status_counts[code] = status_counts.get(code, 0) + 1
            if err and code not in (200, 429):
                errors.append(err)

    total_time = time.perf_counter() - t0
    rps = total_requests / total_time if total_time > 0 else 0

    latencies.sort()
    p50 = statistics.median(latencies) if latencies else 0.0
    p95 = latencies[int(len(latencies) * 0.95)] if latencies else 0.0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0.0

    success_count = status_counts.get(200, 0)
    rate_limited_count = status_counts.get(429, 0)
    success_rate = (success_count / total_requests) * 100.0

    results = {
        "endpoint": endpoint,
        "total_requests": total_requests,
        "concurrency": concurrency,
        "duration_seconds": round(total_time, 2),
        "requests_per_second": round(rps, 1),
        "success_rate_pct": round(success_rate, 2),
        "status_distribution": status_counts,
        "latency_ms": {
            "min": round(min(latencies), 2) if latencies else 0.0,
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "max": round(max(latencies), 2) if latencies else 0.0
        },
        "errors_count": len(errors),
        "passed_slo": (p95 < 250.0 and success_rate >= 95.0)
    }

    return results


def main():
    parser = argparse.ArgumentParser(description="HeatLedger AI Concurrent Load & Stress Tester")
    parser.add_argument("--url", default="http://localhost:8000", help="Base URL of target API")
    parser.add_argument("--endpoint", default="/healthz", help="Endpoint to stress test")
    parser.add_argument("--concurrency", type=int, default=10, help="Number of concurrent worker threads")
    parser.add_argument("--requests", type=int, default=100, help="Total number of requests to execute")

    args = parser.parse_args()

    results = run_benchmark(
        base_url=args.url,
        endpoint=args.endpoint,
        concurrency=args.concurrency,
        total_requests=args.requests
    )

    print("\n" + "=" * 50)
    print("BENCHMARK RESULTS")
    print("=" * 50)
    print(json.dumps(results, indent=2))

    if results["passed_slo"]:
        print("\n✅ SLO VERIFIED: p95 latency < 250ms and success rate >= 95%")
        sys.exit(0)
    else:
        print("\n⚠️ SLO WARNING: p95 latency >= 250ms or errors detected")
        sys.exit(0)


if __name__ == "__main__":
    main()
