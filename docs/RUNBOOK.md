# HeatLedger AI · Production Operations & Incident Response Runbook
**Document ID:** HL-OPS-RUNBOOK-2026-V1  
**Target Audience:** Site Reliability Engineers, DevOps, On-Call Engineers  
**Last Updated:** 20 November 2026  
**Status:** PRODUCTION READY  

---

## 1. Top 8 Incident Scenarios & Standard Operating Procedures (SOPs)

### Incident 1: Site Down / Frontend or API Unresponsive
* **Symptoms:** Synthetic monitors (BetterStack/UptimeRobot) alert on `/healthz` or `/readyz`; Cloudflare returns 502 Bad Gateway or 521 Web Server Is Down.
* **Impact:** High severity; exporters and plant dispatchers cannot access the web app or APIs.
* **Mitigation Procedure:**
  1. Check process liveness: `curl -I https://api.heatledger.com/healthz`
  2. Inspect container status on host/Render:
     ```bash
     docker compose ps
     docker compose logs --tail=100 api
     ```
  3. If container crashed from OOM or uncaught exception, restart:
     ```bash
     docker compose restart api
     ```
  4. Verify Cloudflare Pages frontend build status: Check Cloudflare Dashboard > Pages > HeatLedger > Deployments. If recent deploy failed, roll back to last known healthy build with one click.
  5. Post status update to status page (`/status` or external status dashboard).

---

### Incident 2: Database Full / Connection Pool Exhaustion
* **Symptoms:** API logs report `OperationalError: connection pool exhausted` or `disk I/O error / disk full`; `/readyz` returns 503 with `"database": "DISCONNECTED"`.
* **Impact:** All write mutations (MTC upload, heat allocations, user signups) fail with HTTP 500/503.
* **Mitigation Procedure:**
  1. Check disk utilization: `df -h` on the database host or Supabase storage dashboard.
  2. If disk is full, run emergency log and backup pruning:
     ```bash
     python scripts/backup_db.py --keep 3
     find /var/log/heatledger -name "*.log.*" -mtime +7 -delete
     ```
  3. If Postgres connection pool exhausted (`psycopg_pool` saturation):
     - Identify slow/leaked connections:
       ```sql
       SELECT pid, state, age(clock_timestamp(), query_start), query 
       FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC LIMIT 10;
       ```
     - Terminate blocking idle connections:
       ```sql
       SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
       WHERE state = 'idle in transaction' AND age(clock_timestamp(), state_change) > interval '5 minutes';
       ```
  4. Verify `/readyz` recovers to HTTP 200.

---

### Incident 3: AI Provider Down / Latency Spike (Gemini Vision OCR Outage)
* **Symptoms:** Document ingestion status stays `needs_manual_entry` or returns HTTP 503; error logs record `GoogleAPIError` or `DeadlineExceeded`.
* **Impact:** Automatic certificate parsing halts; plant dispatchers cannot auto-extract chemistry.
* **Mitigation Procedure:**
  1. Verify external Google Gemini status: `curl -s https://generativelanguage.googleapis.com/v1beta/models`
  2. The system automatically degrades to Tier 1 local PyMuPDF regex extraction.
  3. If Tier 1 cannot locate text, the UI displays a clear notification banner:
     > *"OCR extraction provider is temporarily unavailable. Document uploaded safely. Switched to manual entry mode with preserved original file."*
  4. Toggle the admin emergency kill-switch if needed:
     ```bash
     curl -X POST https://api.heatledger.com/api/admin/kill-switch \
       -H "Authorization: Bearer $ADMIN_JWT" \
       -H "Content-Type: application/json" \
       -d '{"flag": "ocr_processing_enabled", "enabled": false}'
     ```
  5. Once the provider recovers, re-queue unprocessed documents from the `/admin` job console.

---

### Incident 4: Payment Webhook Failing (Razorpay Signature Mismatch or Outage)
* **Symptoms:** Customers report plan not upgrading after successful Razorpay checkout; admin alert `razorpay.webhook_failure` triggers.
* **Impact:** Medium severity; delayed access to paid tier features.
* **Mitigation Procedure:**
  1. Inspect webhook logs in Razorpay Dashboard > Webhooks > View Details.
  2. If signature verification fails (HTTP 400 `Invalid signature`):
     - Verify `RAZORPAY_WEBHOOK_SECRET` matches the value configured in Razorpay Dashboard.
     - Ensure no trailing whitespace or CRLF differences in raw body payload hashing.
  3. If webhook deliveries timed out from network blips:
     - In Razorpay Dashboard, click **Resend** on the failed webhook event.
     - HeatLedger's idempotent deduplication (`webhook_events` table) guarantees no duplicate charges or corrupted subscription states.
  4. Manually reconcile customer subscription if immediate resolution needed:
     ```bash
     curl -X POST https://api.heatledger.com/api/billing/manual-upgrade \
       -H "Authorization: Bearer $ADMIN_JWT" \
       -d '{"organization_id": "org_xxx", "plan_id": "PLANT", "payment_id": "pay_xxx"}'
     ```

---

### Incident 5: Transactional Email Bounces & Deliverability Drop (Resend Webhook)
* **Symptoms:** Email delivery rate drops below 95%; Resend webhook fires `email.bounced` or `email.complained`.
* **Impact:** Exporters do not receive buyer pack delivery links or password reset emails.
* **Mitigation Procedure:**
  1. Check Resend Dashboard > Analytics for bounce reason (hard bounce / invalid address vs spam complaint).
  2. HeatLedger's webhook automatically records bounced addresses into `suppressed_emails` table to protect domain reputation.
  3. Verify DNS records (DKIM `resend._domainkey.mail.heatledger.ai`, SPF `v=spf1`, DMARC `v=DMARC1; p=reject`).
  4. If an address was falsely flagged:
     ```sql
     DELETE FROM suppressed_emails WHERE email = 'client@example.com';
     ```
  5. Trigger test password reset or notification to verify deliverability recovery.

---

### Incident 6: Leaked Secret / Compromised Credential Rotation
* **Symptoms:** Security scanner detects committed secret, or suspicious API activity from unknown IP.
* **Impact:** Critical severity; risk of unauthorized tenant access or billing abuse.
* **Mitigation Procedure:**
  1. Immediately revoke the compromised credential:
     - If JWT Secret: Set `JWT_SECRET_PREVIOUS=<old_secret>` and rotate `JWT_SECRET=<new_secret>` (invalidates compromised tokens after 24h grace or restart to invalidate immediately).
     - If Razorpay Key: Generate new key in Razorpay Dashboard, update `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, restart container.
     - If Gemini API Key: Revoke in Google AI Studio / GCP Console, issue new key, update `.env`.
     - If Ed25519 Signing Key: In Admin Console or via `POST /api/signing/rotate-keys`, generate new Ed25519 key pair; old signatures remain verifiable via historical public keys.
  2. Search logs for compromised token / IP usage:
     ```bash
     grep -E "(compromised_id|suspicious_ip)" /var/log/heatledger/api.log
     ```
  3. File security incident log and report to affected organizations if data was accessed.

---

### Incident 7: Bad Deploy Rollback
* **Symptoms:** New deployment introduces critical regression, schema mismatch, or crash loop.
* **Impact:** High severity; users affected by recent commit.
* **Mitigation Procedure:**
  1. Immediately roll back backend container to previous Docker image digest:
     ```bash
     docker pull registry.heatledger.com/backend:previous
     docker compose up -d --force-recreate backend
     ```
  2. For Cloudflare Pages frontend, navigate to Cloudflare Dashboard > Pages > Deployments, click **Rollback** on previous deployment.
  3. If a database migration was involved:
     - Review the documented rollback note in `backend/migrations/<num>_<name>.sql`.
     - Execute the reverse DDL statements or restore the pre-migration snapshot:
       ```bash
       python scripts/restore_db.py backend/backups/latest_pre_deploy.enc backend/auth_database.sqlite3
       ```
  4. Run acceptance suite: `pytest -q` to confirm clean recovery.

---

### Incident 8: Customer Data Request (GDPR / DPDP Export & 30-Day Deletion)
* **Symptoms:** Customer submits statutory data subject access request (DSAR) or organization deletion request under DPDP / GDPR.
* **Impact:** Compliance requirement; statutory timeline must be met.
* **Mitigation Procedure:**
  1. Data Export Request:
     - Trigger export endpoint:
       ```bash
       curl -X POST https://api.heatledger.com/api/privacy/export \
         -H "Authorization: Bearer $USER_TOKEN"
       ```
     - Generates encrypted ZIP containing: `organization.json`, `certificates.json`, `shipments.json`, `audit_trail.json`, and statutory tax invoices.
  2. Organization Deletion Request:
     - Invoke deletion endpoint: `POST /api/privacy/delete-account`
     - Organization enters statutory **30-day grace period** (`scheduled_deletion_at = NOW() + 30 days`).
     - System preserves statutory tax invoices for 8 years as required by Indian GST Act Section 36.
     - At conclusion of 30 days, cron worker (`POST /api/cron/tick`) purges customer certificates, chemistry results, and user credentials permanently.

---

## 2. Production Secret Rotation SOP

### Rotating JWT_SECRET
1. Generate new 256-bit cryptographically secure secret: `openssl rand -hex 32`
2. Update `.env` with `JWT_SECRET_PREVIOUS=<old_secret>` and `JWT_SECRET=<new_secret>`
3. The auth middleware accepts tokens signed with either key for a 24-hour grace window.
4. After 24 hours, decommission `JWT_SECRET_PREVIOUS`.

### Rotating URL_SIGNING_SECRET & Webhook Secrets
1. In the Admin Console at `/admin` or via API, invoke key rotation.
2. Active share links remain valid under dual-signature verification until expiration.

---

## 3. Rollback Procedure
If a production deployment introduces regressions:
1. Revert container image to previous digest:
   ```bash
   docker compose pull backend:previous && docker compose up -d
   ```
2. For frontend web build, revert Cloudflare Pages / Vercel to previous deployment ID:
   ```bash
   vercel rollback <deployment-url> --token $VERCEL_TOKEN
   ```
3. Run verification acceptance suite:
   ```bash
   python backend/test_full_acceptance.py
   ```

---

## 4. Razorpay Commercial Billing: Test-to-Live Go-Live SOP (Prompt R1)

### Configuration Architecture
All plans are configured in `data/plans.json` with statutory SAC `998313` and 18.0% GST:
- `PILOT`: ₹25,000 one-time (30 days, up to 50 certificates, manual onboarding)
- `PLANT`: ₹9,999 / month (100 certificates, 3 seats, 25 share links)
- `PLANT_PRO`: ₹19,999 / month (300 certificates, 10 seats, 100 share links, 3 plants)
- `CONSULTANT`: from ₹6,999 / plant / month (minimum 5 plants, multi-plant RLS hub)
- `CONTAINER_PACK_ADDON`: ₹2,499 prepaid addon per container check

### Go-Live Switch Procedure
1. **Obtain Live API Keys:**
   - Log in to [Razorpay Dashboard](https://dashboard.razorpay.com).
   - Navigate to **Settings > API Keys > Generate Key**.
2. **Configure Production Environment Variables:**
   ```bash
   RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
   RAZORPAY_WEBHOOK_SECRET=zzzzzzzzzzzzzzzzzzzzzzzz
   ```
3. **Register Live Webhook Endpoint:**
   - In Razorpay Dashboard, go to **Settings > Webhooks > Add New Webhook**.
   - URL: `https://api.heatledger.com/api/billing/webhook`
   - Secret: Matches `RAZORPAY_WEBHOOK_SECRET`.
   - Subscribed Events:
     - `order.paid`
     - `payment.captured`
     - `payment.failed`
     - `subscription.charged`
     - `subscription.cancelled`
     - `refund.processed`
4. **Idempotency & Security Verification:**
   - The webhook processor verifies HMAC-SHA256 signatures on every incoming event.
   - Replay protection logs processed `event_id`s in the `webhook_events` table; replayed events return 200 OK without double processing.
   - On `payment.failed`, a strict 7-day grace period is granted before transitioning to read-only mode (customer data is never deleted).

---

## 5. Transactional Email & Resend Go-Live SOP (Prompt R2)

### Configuration Architecture
Transactional email uses Resend in production and an internal console/test outbox in development and testing.

Production environment variables:
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL="HeatLedger <notifications@mail.heatledger.ai>"
SUPPORT_EMAIL="support@heatledger.ai"
APP_URL="https://app.heatledger.ai"
BRAND_NAME="HeatLedger"
```

### DNS Records Specification (Custom Subdomain `mail.heatledger.ai`)
To guarantee 99%+ deliverability directly to enterprise buyer and exporter inboxes, configure the following DNS records in Cloudflare DNS / Route53:

| Type | Name / Host | Value / Target | TTL | Purpose |
|------|-------------|----------------|-----|---------|
| **TXT** | `mail.heatledger.ai` | `v=spf1 include:amazonses.com include:resend.com ~all` | Auto (1 min) | SPF Sender Authentication |
| **CNAME** | `resend._domainkey.mail.heatledger.ai` | `dkim.resend.com` | Auto (1 min) | DKIM Cryptographic Signature |
| **TXT** | `_dmarc.mail.heatledger.ai` | `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc-reports@heatledger.ai; ruf=mailto:dmarc-reports@heatledger.ai; sp=reject; aspf=r; adkim=r` | Auto (1 min) | Strict DMARC 100% Rejection Policy |
| **MX** | `mail.heatledger.ai` | `10 feedback-smtp.us-east-1.amazonses.com` | Auto (1 min) | Upstream Mailbox Delivery & Bounce Routing |

### Resend Webhook Configuration
1. Log in to [Resend Dashboard](https://resend.com/webhooks).
2. Register the endpoint:
   - **Endpoint URL:** `https://api.heatledger.com/api/email/webhooks/resend`
   - **Events Subscribed:**
     - `email.bounced`
     - `email.complained`
3. **Automated Suppression:**
   - When a bounce or complaint event arrives, the endpoint immediately inserts the recipient address into `suppressed_emails`.
   - Subsequent dispatches to that email address are silently rejected (`status: suppressed`) before invoking external APIs, safeguarding sender IP reputation.

### Deliverability & Anti-Spam Guardrails
- **Word Limits:** Every template is strictly constrained to **< 80 words** (typically 30–40 words), preventing spam filter flagging.
- **Zero Tracking Pixels:** Emails contain zero 1x1 tracking GIFs, external trackers, or hidden beacons.
- **No Sensitive Data in Body:** Certificate contents, chemistry percentages, and personal data are **never** placed in the email body; emails provide secure authenticated links to the app.
- **Single Primary Action:** Every template renders exactly one touch-friendly (min 44 px) primary action button.
- **One-Click Unsubscribe:** Non-essential emails (digests, announcements) include an RFC 8058 compliant one-click unsubscribe token link (`GET /api/email/unsubscribe?token=...`).
- **Organization Quota:** Daily dispatch volume is capped per organization (default 100/day) to prevent runaway notification loops.

