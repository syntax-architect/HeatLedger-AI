# HeatLedger AI — Production Monitoring, Health Probes & Disaster Recovery

## 1. Overview & Service Level Objectives (SLOs)

HeatLedger AI is built as a mission-critical compliance operating system for Indian steel and engineering exporters. Customs clearance and buyer compliance require high availability during European and Indian business hours (03:30 to 18:30 UTC).

| Metric | Target SLO | Measurement Method |
| :--- | :--- | :--- |
| **Availability / Uptime** | **99.9%** (max 43m downtime/mo) | Synthetic probes every 60s |
| **Liveness Probe (`/healthz`)** | **p95 < 50 ms** | HTTP 200 Fast check (no DB overhead) |
| **Readiness Probe (`/readyz`)** | **p95 < 250 ms** | Deep check: DB pool, migrations, extraction |
| **MTC Extraction Latency** | **p95 < 1200 ms** (Flash-Lite tier) | End-to-end extraction pipeline |
| **Recovery Point Objective (RPO)** | **< 24 hours** (Daily automated snapshots) | Cryptographic SHA-256 backup verification |
| **Recovery Time Objective (RTO)** | **< 15 minutes** | Automated restore script `scripts/restore_db.py` |

---

## 2. Health & Readiness Probes Architecture

The backend container exposes three decoupled health probe endpoints:

### A. Liveness Probe: `GET /healthz`
- **Purpose**: Fast process heartbeat for container orchestrators (Docker, Kubernetes, Fly.io, Cloudflare).
- **Behavior**: Returns `{"status": "HEALTHY", "service": "heatledger-api", "timestamp": "..."}`.
- **Fail Condition**: If the Python runtime is locked, deadlocked, or out of memory.
- **Action on Failure**: Container restart.

### B. Readiness Probe: `GET /readyz`
- **Purpose**: Dependency deep check before routing incoming traffic.
- **Checks Executed**:
  1. Database connection pool acquisition (`SELECT 1`).
  2. Applied migrations check (`schema_migrations` table existence).
  3. Regulatory data integrity (`data/regulatory.json` loaded and parsed).
  4. Local parser / Gemini API readiness status.
- **Returns**: HTTP 200 `{"status": "READY", "checks": {"database": "connected", "migrations": "applied", "regulatory": "loaded"}}`.
- **Fail Condition**: HTTP 503 if database pool is exhausted or database unreachable.
- **Action on Failure**: Do not route web traffic to this container; trigger P1 alert.

### C. Public Status Page: `GET /api/status` & `/status`
- **Purpose**: Customer-facing transparent status page.
- **Behavior**: Displays operational state of API, Document Processing, and Regulatory Engine.
- **Guaranteed Sanitization**: Never leaks internal hostnames, database connection strings, or system paths.

### D. Background Cron Heartbeat: `POST /api/cron/tick`
- **Purpose**: Scheduled background queue execution (deadline alerts, token spend rotation, backup checks).
- **Auth**: Requires `Authorization: Bearer <CRON_SECRET>` header.

---

## 3. Synthetic Monitoring Configuration (Zero-Cost Setup)

HeatLedger AI is configured for free-tier synthetic monitoring using **BetterStack** (or **UptimeRobot**).

### Monitor 1: Primary API Liveness
- **URL**: `https://api.heatledger.ai/healthz`
- **Method**: `GET`
- **Interval**: 60 seconds
- **Expected Status**: `200`
- **Keyword Assertion**: `"status":"HEALTHY"`
- **Timeout**: 5 seconds

### Monitor 2: Deep Readiness Check
- **URL**: `https://api.heatledger.ai/readyz`
- **Method**: `GET`
- **Interval**: 180 seconds
- **Expected Status**: `200`
- **Keyword Assertion**: `"status":"READY"`
- **Timeout**: 10 seconds

### Monitor 3: Cloudflare Pages Frontend
- **URL**: `https://app.heatledger.ai/login`
- **Method**: `GET`
- **Interval**: 60 seconds
- **Expected Status**: `200`
- **SSL Verification**: Enabled (alert 14 days before expiry)

---

## 4. Error Tracking & Scrubbing (Sentry)

- **Release Tagging**: Every build injects `APP_RELEASE` (Git commit hash) to correlate deployments with regressions.
- **Data Scrubbing Rule**: Sentry hooks use `SensitiveDataLoggingFilter` to automatically scrub:
  - Document filenames, raw OCR text, heat numbers, mill certificate chemistry values.
  - User emails, phone numbers, passwords, auth tokens, and session cookies.
- **Alert Rule**:
  - Spike of > 5 exceptions in 5 minutes triggers an email and WhatsApp alert to the on-call engineer.

---

## 5. Automated Backups & Disaster Recovery Drill

### Backup Policy
1. **Schedule**: Daily at 02:00 UTC (Shop floor downtime in India).
2. **Method**: Hot live snapshot using SQLite online backup API (`sqlite3.Connection.backup`), guaranteeing zero database lock.
3. **Integrity Manifest**: Every backup generates a SHA-256 manifest (`.sha256`) and metadata JSON (`.meta.json`).
4. **Retention**: Strictly 7 days (`RETENTION_COUNT = 7`). Older snapshots are purged automatically.
5. **Encryption**: AES-256-GCM authenticated encryption using `ENCRYPTION_KEY`.

### Running Manual Backup
```bash
python scripts/backup_db.py --dest ./backups --encrypt
```

### Performing Disaster Recovery Restore Drill
Every Monday, an automated or manual restore drill must be executed into an isolated test path:

```bash
# 1. Verify backup integrity without restoring
python scripts/restore_db.py backups/heatledger_backup_20261122_020000.enc --verify-only

# 2. Restore into target database with integrity verification
python scripts/restore_db.py backups/heatledger_backup_20261122_020000.enc test_restored.sqlite3
```

The restore script executes:
1. Pre-flight SHA-256 checksum comparison against the recorded `.sha256` manifest.
2. AES-256-GCM authenticated decryption (verifying message integrity tag).
3. `PRAGMA integrity_check` execution on the restored database.
4. Table count and row count validation.
5. Atomic replacement to prevent corruption if a power cut occurs during restore.

---

## 6. Incident Triage Playbook

| Severity | Definition | Action | Escalation |
| :--- | :--- | :--- | :--- |
| **P1 — Outage** | `/healthz` or `/readyz` fails 2 consecutive checks (>2 min) | Check container logs, restart container, inspect DB disk space. If database corrupted, execute `scripts/restore_db.py` with latest valid snapshot. | 15 min |
| **P2 — Degraded** | MTC extraction fails or Gemini quota exceeded | System falls back to regex-based local parser (`LOCAL_PARSER_ONLY=true`). Buyer packs still generated with manual review flag. | 1 hour |
| **P3 — Warning** | Backup job failed or disk space < 15% | Free old log files, check backup directory permissions, execute manual backup. | 4 hours |
