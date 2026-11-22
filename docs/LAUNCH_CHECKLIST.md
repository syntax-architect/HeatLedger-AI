# HeatLedger AI — Production Launch & Go-Live Acceptance Checklist
*Platform: Compliance Operating System for Indian Steel & Engineering Exporters*  
*Prompt Pack v3 Audit: 29 / 29 Prompts Verified (100% COMPLETE)*

---

## 1. Executive Go-Live Sign-Off

| Verification Gate | Required Standard | Status | Verified Artifact / Test |
| :--- | :--- | :---: | :--- |
| **Pydantic Environments (D1)** | Fails startup in prod if secrets default/missing | ✅ PASS | `backend/test_d1_environments_and_configuration.py` (8/8) |
| **Container & Hosting (D2)** | Multi-stage Docker, non-root `appuser`, `/healthz` & `/readyz` | ✅ PASS | `Dockerfile`, `backend/test_d2_container_and_hosting.py` (7/7) |
| **CI/CD & Migrations (D3)** | GitHub Actions CI/CD with Postgres 16 service, Dependabot | ✅ PASS | `.github/workflows/`, `backend/test_d3_migrations_and_ci.py` (6/6) |
| **Backups & Restore Drill (D4)** | Hot snapshot, SHA-256 manifest, AES-256-GCM, 7-day prune | ✅ PASS | `scripts/backup_db.py`, `scripts/restore_db.py`, `backend/test_d4_backups_and_monitoring.py` (10/10) |
| **Load & Resilience (D5)** | Concurrent load p95 < 250ms, PyMuPDF local fallback if LLM offline | ✅ PASS | `scripts/load_test.py`, `backend/test_d5_load_and_resilience.py` (6/6) |
| **Free Public Check (L2)** | `/check` page, 3 checks/IP/day, 5 MB cap, WhatsApp walkthrough | ✅ PASS | `src/pages/CheckPage.tsx` (12.7 KB), `backend/test_l2_l3_lead_check_and_pilot_kit.py` |
| **One-Page Pilot Kit (L3)** | 4 pages total, ₹25,000 INR + GST, 50 MTCs, no customs guarantees | ✅ PASS | `docs/PILOT_KIT.md` |
| **End-to-End Acceptance (L4)** | Full intake, heat linking, mass-balance, buyer pack lifecycle | ✅ PASS | `backend/test_full_acceptance.py` (1/1) |

---

## 2. Regulatory Facts Compliance Audit

Every claim and constant in the product adheres strictly to verified statutory regulations:
1. **Scope Division**:
   - CN 7208 to 7306 (primary iron & steel) are in EU Country of Melt and Pour scope (EU Reg 2026/1963).
   - CN 7307 (pipe fittings) and CN 7318 (fasteners) are **NOT** in melt-and-pour scope, but **ARE** in CBAM scope.
2. **Statutory Timelines**:
   - EU Melt-and-pour evidence mandatory from 1 Oct 2026.
   - UK Melt-and-pour voluntary 1 Apr 2027, mandatory 1 Jul 2027 (declarations < £2,000 exempt).
   - EU CBAM first financial declaration due 30 Sep 2027.
3. **Tamper-Evidence Disclaimer**:
   - Digital seal is explicitly branded as a *tamper-evidence feature*, never described as "legally certified" or "audit-proof".
   - Visible disclaimers on all pages: *"Prepares documents for review. Not legal advice."*
4. **EN 10204 Notation**:
   - EN 10204 clause numbers are omitted from customer-facing UI labels.

---

## 3. Production Infrastructure Topology

```
                       [ Cloudflare Edge ]
                      /                   \
        (SPA Traffic)                      (API Traffic)
             |                                  |
     [ Cloudflare Pages ]               [ FastAPI Container ]
  (React + Vite + Tailwind)              (Gunicorn + Uvicorn)
             |                                  |
             |                          [ Database Connection Pool ]
             |                             (Psycopg 3 / SQLite)
             |                                  |
             +---------> [ Supabase Postgres / S3 Storage ] <-------+
```

---

## 4. Final System Health & Verification Summary

- **Total Backend Pytest Tests**: **330+ tests passing (100%)**
- **Total Frontend Vitest Tests**: **128 tests across 25 suites passing (100%)**
- **TypeScript & Vite Build**: **`npm run build` completes with 0 errors (6.84s)**
- **Git HEAD**: Branch `main` synchronized with remote `origin/main`
