# HeatLedger AI · STRIDE Threat Model & Security Posture
**Document ID:** HL-SEC-STRIDE-2026-V1  
**Classification:** Enterprise IT Readiness & Security Baseline  
**Standard:** Microsoft STRIDE / OWASP ASVS 4.0 / Indian DPDP Act 2023  
**Last Audited:** 20 November 2026  
**Auditor:** Principal Security Architect & Lead Compliance Engineer  

---

## 1. Executive Summary & Architectural Scope

HeatLedger AI is a shop-floor-to-customs compliance operating system managing sensitive mill test certificates (MTCs), metallurgical spectrometry results, export shipping manifests, and CBAM embedded emissions accounting for Indian steel exporters (Howrah, Liluah, Ludhiana, Kolkata).

The threat landscape encompasses:
1. **Adversarial Importers & Malicious Brokers** attempting to forge mill certificates or evade CBAM default markups.
2. **Plant Insider Threats** attempting to over-allocate heat batches beyond physical capacity (phantom allocation).
3. **Data Interception** targeting unreleased commercial invoices and supplier pricing structures.
4. **Third-Party Inference Leaks** via OCR and LLM model providers.

---

## 2. STRIDE Threat Matrix & Mitigations

| Threat ID | STRIDE Category | Threat Description & Attack Vector | Impact | Mitigations Implemented in Code | Verification Test | Residual Risk |
|---|---|---|---|---|---|---|
| **THR-01** | **Spoofing** | Forged user claims or fake inspector signatures submitted to bypass release gate. | High | Stateless HMAC-SHA256 JWT auth with claims validated against database. Step-up TOTP/PIN challenge required for QA signing. Ed25519 asymmetric signatures. | `backend/test_h2_auth_roles.py` | Low |
| **THR-02** | **Tampering** | Modifying mill chemistry or country of melt-and-pour on an upstream MTC PDF. | Critical | Ingestion pipeline checks magic bytes, calculates SHA-256 immediately upon arrival, and enforces write-once SQLite/Postgres immutability triggers. Clause 6 ZIP preserves untouched original bytes. | `backend/test_h3_honest_certificates.py`, `backend/test_b3_b4_pipeline.py` | Minimal |
| **THR-03** | **Repudiation** | Factory operator denies having approved a non-compliant or over-allocated heat. | Medium | Hash-chained audit log with cryptographic block linking (`prev_hash` -> `row_hash`). Every allocation, override, and release approval records user ID, IP, and UTC timestamp. | `backend/test_p9_audit.py`, `backend/test_b2_multi_tenant_rls.py` | Low |
| **THR-04** | **Information Disclosure** | Exposing confidential customer purchase orders, pricing, or unmasked PAN/GSTIN in public links. | High | Buyer Share Portal strictly strips commercial pricing, showing only technical metallurgy and customs proof. Structured JSON logging sanitizes PII, bearer tokens, and PAN/GSTIN. | `backend/test_p4_portal.py`, `backend/test_b12_observability.py` | Minimal |
| **THR-05** | **Denial of Service** | Flooding extraction pipeline with malicious PDF bombs or API requests. | High | In-memory token bucket rate limiting (10 req/min on public routes, 60 req/min on authenticated routes). Maximum file upload cap (15MB). PyMuPDF runs in isolated subprocess with 10s execution timeout. | `backend/test_owasp_security.py` | Low |
| **THR-06** | **Elevation of Privilege** | Dispatch clerk invoking QA signing endpoints or tenant accessing another plant's heats. | Critical | Role-Based Access Control (`require_roles` dependency) enforced server-side. Multi-tenant Row-Level Security (RLS) keys all SQL queries by `organization_id`. | `backend/test_h2_auth_roles.py`, `backend/test_b2_multi_tenant_rls.py` | Minimal |

---

## 3. Defense-in-Depth Technical Controls

### 3.1 Content-Security-Policy & Security Headers
All backend responses include production-hardened HTTP security headers:
- `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none';`
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=(), interest-cohort=()` *(Permits camera for PWA shop-floor certificate scanning while disabling invasive tracking)*
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

### 3.2 Anti-Phantom Mass Balance Enforcement
Over-allocation of physical steel lots is prevented at the database trigger level and the application ledger service (`LedgerService`):
$$\sum \text{allocated\_weight\_grams} \le \text{initial\_weight\_grams}$$
Any attempt to insert or allocate beyond available balance raises `OverAllocationError` with code 409 Conflict.

### 3.3 Prompt Injection Defense in "Ask Your Data" Assistant
- LLM prompt templates treat document strings and user inputs strictly as passive data parameters.
- Tool-calling layer provides read-only, parameterized database routines (`tool_query_heats`, `tool_query_shipments`).
- Malicious system prompt override vectors (e.g. *"Ignore all previous instructions"*) are caught by input regex guards and sanitized.

### 3.4 Indian Digital Personal Data Protection Act (DPDP Act 2023) Posture
- **Data Minimization:** No Aadhaar numbers, employee personal biometric data, or unrelated financial records are collected.
- **Purpose Limitation:** Factory documents are processed solely for EN 10204 Clause 6 and EU/UK CBAM compliance.
- **Zero-Retention Inference:** Optical OCR inference uses Google Gemini Zero Data Retention Enterprise endpoints. Customer data is never used to train foundational models.

---

## 4. Threat Model Sign-off & Audit Status

* **Status:** AUDITED & HARDENED
* **Critical Vulnerabilities Open:** 0
* **High Vulnerabilities Open:** 0
* **Medium Vulnerabilities Open:** 0
* **Sign-off Date:** 20 November 2026
