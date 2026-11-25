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

---

## 6. Cryptographic Key Architecture & Key Rotation Procedures (Prompt Pack v5 Task 4.1)

### 6.1 Purpose-Separated Cryptographic Keys

In accordance with Prompt Pack v5 Task 4.1, HeatLedger AI enforces strict purpose separation across all cryptographic operations. No single key is shared across different functional security domains:

| Key Name | Purpose | Algorithm / Format | Storage & Lifetime |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | User session JWT authentication & inspector document signing | HMAC-SHA256 (>= 32 chars) | Centralized settings, short-lived 15m session tokens |
| `URL_SIGNING_SECRET` | Public buyer verification and share portals | HMAC-SHA256 (>= 32 chars) | Centralized settings, bounded share window |
| `DOCUMENT_URL_SECRET` | Short-lived signed document download URLs | HMAC-SHA256 (>= 32 chars) | Centralized settings, 10-minute expiry |
| `ENCRYPTION_KEY` | At-rest database field encryption (`users.totp_secret_hex`) | AES-256-GCM with version tag | Key ring with versioning (`v1`, `v2`, ...) |
| `RAZORPAY_WEBHOOK_SECRET` | Inbound payment event signature verification | HMAC-SHA256 | Configured in payment gateway dashboard |
| `INTAKE_EMAIL_WEBHOOK_SECRET` | Inbound MTC email webhook signature validation | HMAC-SHA256 | Configured in inbound email router |
| `CRON_SECRET` | Scheduled background task execution trigger | Dedicated constant | Configured in scheduler / Cloud Scheduler |

### 6.2 Fail-Closed Startup Invariant

In **every environment** outside explicit automated test runs (`ENV=test` or `pytest`), the application startup performs strict cryptographic validation:
1. If any required secret (`JWT_SECRET`, `URL_SIGNING_SECRET`, `DOCUMENT_URL_SECRET`, `ENCRYPTION_KEY`) is missing, startup is **aborted immediately**.
2. If any secret is shorter than 32 characters, startup is **aborted immediately**.
3. If any secret contains known insecure substrings (`dev_`, `example`, `changeme`, `placeholder`), startup is **aborted immediately**.
4. In production (`ENV=production`), `DATABASE_URL` must point to PostgreSQL, `DEMO_MODE` must be `false`, and CORS origins must be strict HTTPS domains with no wildcards.

### 6.3 Zero-Downtime Key Rotation Procedures

#### A. Rotating Session Signing Key (`JWT_SECRET`)
1. Generate new 64-character hex secret: `openssl rand -hex 32`.
2. Update `JWT_SECRET` in the secret management store (e.g., AWS Secrets Manager, GCP Secret Manager, or Supabase Vault).
3. Redeploy the application.
4. *Impact:* Users will be prompted to re-authenticate as old 15-minute access tokens expire naturally.

#### B. Rotating Document & Share URL Secrets (`DOCUMENT_URL_SECRET`, `URL_SIGNING_SECRET`)
1. Generate new 64-character hex secret: `openssl rand -hex 32`.
2. Update the environment variable and redeploy.
3. *Impact:* Active 10-minute download URLs will require re-generation from the verified document screen.

#### C. Rotating Field Encryption Key (`ENCRYPTION_KEY` - Zero Downtime)
Field encryption uses an envelope format: `enc:<version>:<nonce_b64>:<ciphertext_tag_b64>`.
1. Generate new 32-byte secret: `openssl rand -hex 32`.
2. Keep the previous key in `ENCRYPTION_PREVIOUS_KEYS` formatted as `<prev_ver>:<prev_key>`:
   ```bash
   ENCRYPTION_KEY_VERSION=v2
   ENCRYPTION_KEY="<new_key_32_bytes>"
   ENCRYPTION_PREVIOUS_KEYS="v1:<old_key_32_bytes>"
   ```
3. Deploy the update. Existing records tagged `enc:v1:...` continue to decrypt transparently via the key ring.
4. Any newly written or updated secrets are automatically encrypted with `v2`.
5. Run the background migration script to re-encrypt all `v1` records with `v2`.
6. Once migration is complete, remove `ENCRYPTION_PREVIOUS_KEYS`.

---

## 6. Cryptographic Key Separation & Rotation Runbook

HeatLedger AI enforces strict key separation so compromise or rotation of one capability never weakens another. Every secret is read exclusively from `backend/settings.py` with fail-closed startup enforcement (missing, short `<32` char, `dev_`, `example`, or `CHANGE_ME` values abort startup in all non-test environments).

| Key / Secret | Purpose | Storage / Encryption |
| :--- | :--- | :--- |
| `JWT_SECRET` | Sole signing key for HS256 user session JWTs and inspector cryptographic seals | Environment / Secrets Manager |
| `URL_SIGNING_SECRET` | HMAC-SHA256 key for public share link integrity | Environment / Secrets Manager |
| `DOCUMENT_URL_SECRET` | HMAC-SHA256 key for short-lived 10-minute document download tokens | Environment / Secrets Manager |
| `ENCRYPTION_KEY` (+ `ENCRYPTION_KEY_VERSION`) | AES-256-GCM symmetric key encrypting `users.totp_secret_hex` (`enc:<ver>:<nonce>:<ct>`) and database backups | Environment / Secrets Manager |
| `RAZORPAY_WEBHOOK_SECRET`, `INTAKE_EMAIL_WEBHOOK_SECRET`, `WHATSAPP_APP_SECRET`, `CRON_SECRET` | Constant-time HMAC / bearer verification of external webhooks and cron jobs | Environment / Secrets Manager |

### Zero-Downtime Field Encryption Rotation (`ENCRYPTION_KEY`)
1. Generate a new 256-bit key (`openssl rand -hex 32`).
2. Move the previous key into `ENCRYPTION_PREVIOUS_KEYS="v1:<previous_key>"`, set `ENCRYPTION_KEY="<new_key>"`, and bump `ENCRYPTION_KEY_VERSION="v2"`.
3. Deploy the application; existing `enc:v1:...` TOTP secrets continue decrypting transparently.
4. Run `AuthService.migrate_totp_secrets_to_encrypted()` to re-encrypt all active rows to `enc:v2:...`.
5. Once zero `enc:v1:...` rows remain, remove `v1` from `ENCRYPTION_PREVIOUS_KEYS`.

### Session & Signing Secret Rotation (`JWT_SECRET`, `URL_SIGNING_SECRET`, `DOCUMENT_URL_SECRET`)
1. Generate a new secret (`openssl rand -hex 32`).
2. Update the secret in the production secret manager and roll API containers.
3. For `JWT_SECRET` emergency rotation, all active short-lived 15-minute access tokens expire immediately and users re-authenticate cleanly; run `AuthService.revoke_all_sessions()` or purge `refresh_tokens` if an immediate global sign-out is required.
