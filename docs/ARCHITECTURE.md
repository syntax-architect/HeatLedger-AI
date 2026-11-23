# HeatLedger AI — System Architecture & Modular Design

> **Specification Reference:** Prompt Pack v3 — Phase 2 (Prompt M4: Make the Codebase Smaller and the Backend Modular)  
> **Target Production Profile:** Lean, Low-Running-Cost Industrial Compliance SaaS for Indian Steel & Engineering Exporters  
> **Status:** Production Ready · Single-Container Architecture · 100% Sourced & Regulated  

---

## 1. High-Level Text Architecture Diagram

```text
+-----------------------------------------------------------------------------------+
|                        CLIENT & EDGE LAYER (Cloudflare Pages)                      |
|  - React 18 + Vite + TypeScript + Tailwind CSS                                    |
|  - Mobile-First PWA (Service Worker, Offline Cache, 360px & 390px Viewports)      |
|  - Production Bundle Budget: Initial Entrypoint <= 30.3 KB gzip (Budget: 180 KB)   |
|  - Peak Route / Vendor Chunks <= 59.1 KB gzip (Budget: 60 KB)                     |
+-----------------------------------------------------------------------------------+
                                          |
                                          | HTTPS (TLS 1.3 · Strict CSP · HSTS)
                                          v
+-----------------------------------------------------------------------------------+
|                     SECURITY & RATE LIMITING ENCLAVE (FastAPI)                    |
|  - Sliding-Window IP Rate Limiter (10 OCR/min · 60 General/min)                   |
|  - Security Headers: X-Frame-Options DENY, X-Content-Type-Options nosniff         |
|  - Argon2id Password Hashing, httpOnly Rotating Cookies & Double-Submit CSRF      |
|  - TOTP 6-Digit Step-Up Signing Gate for Authorized QA Inspectors                 |
+-----------------------------------------------------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+---------------------------------------+   +---------------------------------------+
|       MODULAR FASTAPI ROUTERS         |   |      PERSISTENCE & STORAGE PLANE      |
|  backend/routers/                     |   |  backend/db/ DAL & Supabase Postgres  |
|  - auth.py (Login, TOTP, Sessions)    |   |  - PostgreSQL RLS (tenant isolation)  |
|  - certificates.py (MTC Ingestion)    |   |  - psycopg 3 Connection Pool          |
|  - heats.py (Heat Ledger & Chemistry) |   |  - Private S3-Compatible Object Store |
|  - shipments.py (Customs Readiness)   |   |    * originals/ (write-once immutable)|
|  - dossiers.py (Buyer Pack Assembly)  |   |    * derived/ (vector text & renders) |
|  - billing.py (Razorpay Webhooks/GST) |   |    * exports/ (tamper-evident packs)  |
|  - pilot.py (1-Shipment Audit Engine) |   |  - Zero raw sqlite3 in service code   |
|  - health.py (Probes & RUM Vitals)    |   +---------------------------------------+
|  - telemetry.py (Non-PII Telemetry)   |
+---------------------------------------+
        |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+---------------------------------------+   +---------------------------------------+
|      AI EXTRACTION COST GUARDRAILS    |   |      MANAGED EXTERNAL GATEWAYS        |
|  - Layer 1: SHA-256 Hash Cache ($0)   |   |  - Razorpay (SAC 998313, 18% GST)     |
|  - Layer 2: PyMuPDF Vector Text ($0)  |   |  - Resend (Transactional Alert Email) |
|  - Layer 3: Gemini Flash-Lite ($0.0004|   |  - Sentry (Error & Web Vital Tracing) |
|  - Layer 4: Gemini Flash Escalation   |   |  - Plausible / Umami (Cookieless RUM) |
+---------------------------------------+   +---------------------------------------+
```

---

## 2. Core Architectural Pillars

1. **Modular Backend Decomposition (Prompt M4):**
   `backend/main.py` serves strictly as the application orchestrator (instantiation, CORS, security middleware, exception handlers, and sub-router inclusions). Domain operations are cleanly isolated into dedicated routers under `backend/routers/`.

2. **Strict Multi-Tenant Row-Level Security (RLS) Isolation:**
   Every database query is tenant-scoped via `set_tenant_context(org_id)`. Cross-tenant queries reject access with HTTP 404/401, preventing cross-exporter data leaks.

3. **Untouched Original Certificates & Tamper-Evident Seals:**
   Customer MTCs remain strictly byte-identical upon upload and storage. Buyer packs combine the untouched original PDFs with an Ed25519 cryptographic seal and a public verification QR code (`/verify?cert=...`). Single-byte file alterations immediately fail verification.

4. **Production Build Budgets & Dependency Diet:**
   - **Initial Entrypoint:** 30.27 KB gzipped (Enforced Budget: $\le 180$ KB).
   - **Route Chunks:** $\le 57.68$ KB gzipped (Enforced Budget: $\le 60$ KB).
   - **Zero bloat:** Confetti, particle emitters, and heavy dev shims are stripped from production builds.
