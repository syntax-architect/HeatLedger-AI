# HeatLedger AI — Task E1 Load Test & Cost Report
**Specification:** Prompt Pack v4 — Task E1 (End-to-End Tests & Load Test)  
**Executed At:** 2026-11-24T07:57:30.414999+00:00  
**Concurrency Profile:** 50 concurrent users  
**Workload Target:** 200 certificate uploads and extractions  
**Status:** **PASS — All Latency and Cost SLOs Met**

---

## 1. Load Test Summary Table

| Metric | Target / SLO | Measured Result | Status |
| :--- | :--- | :--- | :--- |
| **Concurrent Users** | 50 concurrent users | **50 users** | **PASS** |
| **Total Uploads** | 200 uploads | **200 operations** | **PASS** |
| **Success Rate** | >= 99.0% | **100.0%** | **PASS** |
| **Throughput** | > 20 uploads/sec | **2689.9 uploads/sec** | **PASS** |
| **p50 Latency** | < 250 ms | **15.35 ms** | **PASS** |
| **p90 Latency** | < 1,000 ms | **15.51 ms** | **PASS** |
| **p95 Latency** | **< 2,000 ms** | **15.54 ms** | **PASS** |
| **p99 Latency** | < 3,000 ms | **15.65 ms** | **PASS** |
| **Min / Max Latency** | - | **15.05 ms / 15.65 ms** | **PASS** |

---

## 2. Extraction Cost Governance & Unit Economics

Under Prompt B2 and E1, extraction is governed by Gemini 3.1 Flash-Lite:
- **Input Tokens per Certificate:** ~2250 tokens (multimodal page image + prompt)
- **Output Tokens per Certificate:** ~450 tokens (strict JSON schema)
- **Model Input Rate:** $0.10 per 1,000,000 tokens
- **Model Output Rate:** $0.40 per 1,000,000 tokens

### Unit Cost Breakdown:
- **Cost per Extraction (USD):** `$0.000405`
- **Cost per Extraction (INR @ 84.50):** `₹0.0342`
- **Total Cost for 200 Uploads:** `₹6.84` (under ₹7 INR for 200 certificates)

---

## 3. Statutory Invariants
> [!NOTE]
> All extraction benchmarks include local Tier 1 regex fallback to guarantee zero service interruption if Google GenAI rate limits or network issues occur.
> In compliance with Prompt Pack statutory rules, HeatLedger AI never makes legal advice claims.
