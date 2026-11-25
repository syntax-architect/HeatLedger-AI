# HeatLedger AI: Factual Claims & Compliance Lexicon Register
**Specification:** Prompt Pack v5 — Task 5.2 #3  
**Last Checked:** 2026-11-25  
**Companion Detailed Register:** See [`docs/CLAIMS_REGISTER.md`](CLAIMS_REGISTER.md) for full EU/CEA/IPCC regulatory source links.

---

## 1. Verified Product & Technical Claims

| Claim | Verification Basis / Code Evidence | Last Checked |
| :--- | :--- | :--- |
| **Mandatory Login & Private Tenant Scoping** | All private endpoints require session authentication; `organization_id` derived from signed JWT session cookie (`backend/public_routes.py`, `backend/dependencies.py`, `test_e2_security_audit.py`). | 2026-11-25 |
| **Zero String-Built SQL Queries** | Enforced via static AST/regex suite `backend/test_v5_sql_safety.py` verifying zero `.execute(f"...")` calls in `backend/`. | 2026-11-25 |
| **Strict Upload & Path Traversal Defense** | Enforced via `backend/safe_files.py` & `backend/test_v5_safe_files.py` (magic bytes, 15 MB cap, encrypted PDF block, UUID disk naming, `realpath` storage root check). | 2026-11-25 |
| **Environment-Backed Legal Entity Invoicing** | GST tax invoices require configured `SUPPLIER_LEGAL_NAME`, `SUPPLIER_ADDRESS`, `SUPPLIER_GSTIN`, `SUPPLIER_PAN`, `SUPPORT_EMAIL` (`backend/billing_service.py`, `test_v5_honest_data_and_identity.py`). | 2026-11-25 |
| **Founding Offer Slot Transparency** | `BillingService.get_founding_offer_status()` queries live `subscriptions` rows with zero hardcoded offsets (`test_v5_honest_data_and_identity.py`). | 2026-11-25 |
| **Single Canonical Pricing Source** | All tiers, monthly/annual prices, and limits load from `data/plans.json` (`test_b1_pricing_truth.py`). | 2026-11-25 |
| **CBAM Regulatory Constants & Markups** | Quarterly ETS benchmark & 10%/20%/30% markup schedule stored in dated JSON (`data/cbam_pricing_rules.json`) with source citations. | 2026-11-25 |

---

## 2. Terminology Rules (Supports Preparation — Not Certification)

HeatLedger AI prepares, checks, seals, and packages compliance documentation for review by exporters, importers, and accredited verifiers. Output surfaces use **prepares**, **checks**, **seals**, and **tamper-evident**, avoiding unverified claims of official EU certification or legal advice.
