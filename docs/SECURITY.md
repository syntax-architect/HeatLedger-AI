# HeatLedger AI — Customer Security & Data Isolation Overview

**Document:** SECURITY.md  
**Version:** 4.0.0 (Prompt Pack v4 Standard)  
**Effective Date:** 2026-11-24  
**Applicability:** Exporters, Mill Operators, QA Inspection Teams, and Verifiers  

---

## 1. Executive Summary

At HeatLedger AI, customer data confidentiality and isolation are foundational invariants. Steel manufacturers entrust us with proprietary chemical analyses, mill test certificates (MTCs), customer purchase orders, pricing, and shipment dossiers. 

We guarantee that **no exporter's data can ever be read, modified, or inferred by another plant**, enforced at the network, application, session, and database layers.

---

## 2. Multi-Tenant Isolation Layers

HeatLedger AI enforces strict multi-tenant boundaries through four defense-in-depth controls:

```
[ Incoming Request ]
         │
         ▼
[ Layer 1: Mandatory Authentication & Public Route Allowlist ]
   - Any endpoint not on the public allowlist rejects unauthenticated traffic with HTTP 401.
         │
         ▼
[ Layer 2: Cryptographic Session Binding (Prompt A2) ]
   - Organization identity (organization_id) is derived strictly from the verified session.
   - Caller-supplied organization_id parameters in URLs, bodies, or forms are ignored.
         │
         ▼
[ Layer 3: Application Authorization & Role Boundaries (Prompt A5) ]
   - VIEWER cannot sign or alter billing.
   - QA_INSPECTOR requires TOTP step-up MFA for cryptographic sealing.
   - OWNER controls team membership, audit logs, and commercial plans.
         │
         ▼
[ Layer 4: PostgreSQL Row-Level Security (RLS) (Prompt A4) ]
   - Ambient session context (`SET LOCAL app.org_id`).
   - Every database query automatically filters rows to the caller's tenant.
   - Direct Object Reference attacks (requesting a foreign ID) return HTTP 404 Not Found.
```

---

## 3. Automated Security Checks in Continuous Integration

Every code change in HeatLedger AI is subjected to our automated security suite (`backend/tests/test_tenant_isolation.py`):

1. **Cross-Tenant Direct Object Reference (BOLA/IDOR):**
   - A user from Plant B requests certificates, heats, shipments, invoices, dossiers, or suppliers belonging to Plant A.
   - Enforced outcome: **HTTP 404 Not Found** (never HTTP 200 with data, and never leaking existence via 403).

2. **Org ID Parameter Smuggling:**
   - Hostile requests injecting foreign `organization_id` values into query strings, multipart forms, or JSON bodies are stripped and overridden by the session's verified organization.

3. **Signed Download Token Isolation:**
   - Document download URLs use cryptographic HMAC-SHA256 signatures with short lifetimes (10 minutes).
   - Reusing a token for a different document or from another organization immediately fails verification.

4. **Session Rotation & Token Family Defense:**
   - Tokens rotate on login and logout.
   - Detecting reuse of a previously invalidated refresh token immediately revokes all sessions across the user's token family.

5. **Exhaustive Route Audit:**
   - An automated CI probe checks every single route registered on the FastAPI gateway.
   - Any newly introduced endpoint that is neither listed in `public_routes.py` nor protected behind mandatory authentication immediately breaks the build.

---

## 4. Statutory & Regulatory Transparency

- **Original Document Integrity:** HeatLedger AI adheres to EN 10204 Clause 6: original manufacturer test certificate bytes are cryptographically hashed (SHA-256) and preserved unmodified.
- **Statutory Disclaimers:** All dossiers, exports, and inspection records state:  
  > *"Prepared by <plant>. Tamper-evident seal. Not a legal verification."*
- **Right to Export and Deletion:** Plants retain 100% ownership of their data. Export your full archive (MTCs, ledger, dossiers) at any time, or request irreversible deletion with a 14-day safety grace period.

---

## 5. Reporting Security Vulnerabilities

To report a suspected vulnerability or security concern, contact our Security Response Team immediately:
- **Email:** `security@heatledger.ai` (monitored 24/7/365)
- **Response SLO:** Initial acknowledgment within 2 hours; status briefing within 24 hours.
