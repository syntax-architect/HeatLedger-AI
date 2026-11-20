# HeatLedger AI · Production Operations & Incident Response Runbook
**Document ID:** HL-OPS-RUNBOOK-2026-V1  
**Target Audience:** Site Reliability Engineers, DevOps, On-Call Engineers  
**Last Updated:** 20 November 2026  
**Status:** PRODUCTION READY  

---

## 1. Top 5 Incident Scenarios & Standard Operating Procedures (SOPs)

### Incident 1: Upstream OCR / Gemini Vision Provider Outage
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

### Incident 2: Background Jobs Queue Stall / Dead-Letter Backlog
* **Symptoms:** Background extraction or webhook delivery queue count climbs above 50 items; latency > 60s.
* **Impact:** Outbound webhooks and batch verification delayed.
* **Mitigation Procedure:**
  1. Check queue health metrics:
     ```bash
     curl -H "Authorization: Bearer $ADMIN_JWT" https://api.heatledger.com/api/admin/metrics
     ```
  2. Inspect failing tasks in the jobs table:
     ```bash
     curl -H "Authorization: Bearer $ADMIN_JWT" "https://api.heatledger.com/api/admin/jobs?status=FAILED"
     ```
  3. Identify root cause (e.g., target customer webhook endpoint returning 500).
  4. Trigger exponential backoff retry:
     ```bash
     curl -X POST -H "Authorization: Bearer $ADMIN_JWT" "https://api.heatledger.com/api/admin/jobs/{job_id}/retry"
     ```
  5. Restart the background worker process if hung: `docker compose restart backend_worker`

---

### Incident 3: Database Disaster Recovery & Point-in-Time Restore
* **Symptoms:** SQLite database corruption, unrecoverable I/O error, or host volume failure.
* **Impact:** High severity; reads/writes blocked.
* **Recovery Procedure:**
  1. Stop incoming write traffic by toggling maintenance mode:
     ```bash
     curl -X POST -H "Authorization: Bearer $ADMIN_JWT" \
       https://api.heatledger.com/api/admin/kill-switch \
       -d '{"flag": "maintenance_mode", "enabled": true}'
     ```
  2. Locate the latest daily encrypted snapshot in `backend/backups/`:
     ```bash
     ls -lt backend/backups/heatledger_backup_*.sqlite3 | head -n 1
     ```
  3. Verify SHA-256 integrity:
     ```bash
     sha256sum -c backend/backups/heatledger_backup_20261120_120000.sqlite3.sha256
     ```
  4. Replace corrupted database with verified snapshot:
     ```bash
     cp backend/backups/heatledger_backup_20261120_120000.sqlite3 backend/auth_database.sqlite3
     ```
  5. Run test suite to verify table schemas and constraints:
     ```bash
     python -m pytest backend/test_b2_multi_tenant_rls.py backend/test_full_acceptance.py
     ```
  6. Disable maintenance mode.

---

### Incident 4: Outbound Webhook Delivery Failure Storm
* **Symptoms:** Multiple customer ERP webhooks failing consecutively; webhook delivery logs show timeout.
* **Impact:** Third-party factory ERPs do not receive `shipment.ready` signals.
* **Mitigation Procedure:**
  1. Inspect failed delivery IDs and target host response codes.
  2. If the destination factory ERP is offline, HeatLedger automatically schedules 3 retries (1m, 5m, 15m) before marking the job as `DEAD_LETTER`.
  3. Notify customer IT contact via email notification channel.
  4. Disable failing webhook subscription temporarily if it causes upstream resource exhaustion.

---

### Incident 5: Monthly AI Token / API Spend Cap Breach
* **Symptoms:** Super-admin alert `spending_cap.warning` triggered (>80% spend); API calls rejected with 429.
* **Impact:** Flash-Lite Assistant and Vision OCR calls blocked until billing cycle resets.
* **Mitigation Procedure:**
  1. Inspect spend breakdown in `/admin` metrics.
  2. Determine whether spend is organic business volume or an abusive token loop.
  3. If organic, increase organization token budget in `auth_database.sqlite3` / plan tier.
  4. If an abusive client is detected, immediately revoke the corresponding API key:
     ```bash
     curl -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
       https://api.heatledger.com/api/integrations/api-keys/{key_id}
     ```

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
