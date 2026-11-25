# HeatLedger AI: Production Release Checklist
**Specification:** Prompt Pack v5 — Task 7.3  
**Last Updated:** 2026-11-25  

Execute and verify every item prior to tagging or promoting a production release:

- [ ] **1. Database Migrations Applied**
  - Forward-only SQL migrations in `backend/migrations/` applied cleanly (`001`–`005` and `000_supabase_full_setup.sql`).
  - Zero pending runtime DDL; `test_d3_migrations_and_ci.py` passes cleanly.
- [ ] **2. Mandatory Secrets & Environment Guard**
  - `ENV=production`, `DEMO_MODE=false` verified (app refuses to boot if `DEMO_MODE=true`).
  - `JWT_SECRET`, `URL_SIGNING_SECRET`, `DOCUMENT_URL_SECRET`, `ENCRYPTION_KEY`, `RAZORPAY_WEBHOOK_SECRET`, and `INTAKE_EMAIL_WEBHOOK_SECRET` are >= 32 characters with no `dev_` or `example` defaults (`test_v5_secrets.py` green).
  - Legal entity env vars (`SUPPLIER_LEGAL_NAME`, `SUPPLIER_ADDRESS`, `SUPPLIER_GSTIN`, `SUPPLIER_PAN`, `SUPPORT_EMAIL`) verified before enabling billing/invoicing (`test_v5_honest_data_and_identity.py` green).
- [ ] **3. Test Suites Green**
  - Backend pytest suite green (`0` failed, `0` errors).
  - Frontend strict TypeScript (`tsc --noEmit`), Vitest suite, and `npm run build` green (`0` errors).
- [ ] **4. Security & Supply-Chain Scanners Green**
  - `ruff check backend/`, `gitleaks detect`, `pip-audit`, and `npm audit --audit-level=high` clean.
  - CSP in `vercel.json` contains no `'unsafe-inline'` in `script-src` and no `localhost` in production `connect-src`.
- [ ] **5. Backup & Rollback Readiness**
  - Fresh pre-release database snapshot verified; previous container image tag retained for immediate rollback (`docs/restore-drill.md`).
- [ ] **6. Stakeholder Notification**
  - Release version, migration summary, and rollback tag communicated via configured `SUPPORT_EMAIL` operations channel.
