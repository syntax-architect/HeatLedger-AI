# HeatLedger AI — Security Incident Response Plan & Runbook

**Document:** INCIDENT.md  
**Version:** 4.0.0 (Prompt Pack v4 Standard)  
**Effective Date:** 2026-11-24  
**Classification:** Restricted — Internal Operations & Compliance  
**Regulatory Compliance:** Digital Personal Data Protection Act (DPDP India 2023), EU GDPR Articles 33/34, ISO/IEC 27001:2022  

---

## 1. Incident Severity Classification & On-Call Matrix

| Severity | Definition | Response SLO | Primary Lead | Notification Gate |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Active data breach, cross-tenant leak, leaked root secret, unauthorized signing key use | **15 minutes** | Lead Security Engineer & CTO | CEO, DPO, Legal Counsel |
| **SEV-2 (High)** | Denial of service, authentication bypass attempt, mass scraping detected, database corruption | **30 minutes** | Senior Platform Engineer | Head of Engineering |
| **SEV-3 (Medium)** | Isolated rate-limit anomaly, single account credential stuffing, failed signature step-up | **2 hours** | On-Call Security Specialist | Security Operations |
| **SEV-4 (Low)** | Dependency vulnerability alert (low/medium), automated bot probe blocked | **24 hours** | AppSec / Maintenance Engineer | Regular Sprint Review |

### Emergency Escalation Contacts
- **Primary Incident Commander & Solo Founder:** Contact configured via `SUPPORT_EMAIL` and `INCIDENT_CONTACT_PHONE` environment variables (never hardcoded in repository).
- **External Forensic & CERT Partner:** CERT-In Incident Reporting Desk — `incident@cert-in.org.in` (statutory reporting within 6 hours for critical cyber incidents under CERT-In Directions).

---

## 2. Emergency Session Revocation Procedures

When a compromised credential or active session hijacking is detected:

### A. Revoke All Active Sessions for a Compromised Tenant
```bash
# Execute via secure administrative bastion CLI
python -m backend.scripts.security_cli revoke-tenant-sessions --organization-id "org_target_plant"
```
Or via SQL:
```sql
UPDATE memberships 
SET token_version = token_version + 1, updated_at = NOW() 
WHERE organization_id = 'org_target_plant';

DELETE FROM refresh_tokens WHERE organization_id = 'org_target_plant';
```

### B. Global Session Purge (SEV-1 Universal Blackout)
```bash
python -m backend.scripts.security_cli revoke-all-sessions --confirm-emergency-purge
```
*Effect:* Instantly forces all users (including mobile PWAs and active browsers) to re-authenticate with credentials and TOTP step-up.

---

## 3. Secret & Key Rotation Protocol

### A. JWT Server Signing Secret
1. Generate high-entropy 256-bit secret:
   ```bash
   openssl rand -hex 32
   ```
2. Update secret in Secret Manager (`SECRET_KEY` / `SERVER_SIGNING_SECRET`).
3. Deploy zero-downtime rolling update (dual-key grace period: 10 minutes).
4. Invalidate legacy tokens.

### B. Document Signing HMAC Secret
1. Generate new signing key in `signing_keys` table with status `ACTIVE`.
2. Deprecate prior key to `RETIRED` (preserves historical verification validity).
3. Previous certificates remain verifiable via public key ledger.

### C. Database & Redis Credentials
1. Rotate database master password in AWS Secrets Manager / Cloud Vault.
2. Restart backend connection pool containers via Blue/Green deployment.

---

## 4. Disaster Recovery & Backup Restoration

### Recovery Time Objective (RTO): **< 2 hours**  
### Recovery Point Objective (RPO): **< 15 minutes** (Continuous WAL Archiving)

### Restoration Steps:
1. **Isolate Affected Environment:** Sever inbound traffic at Cloudflare gateway (activate `Under Attack Mode`).
2. **Retrieve Verified Snapshot:** Fetch point-in-time Postgres snapshot from immutable AWS S3 Glacier archive.
3. **Restore to Staging Sandbox:**
   ```bash
   pg_restore --clean --if-exists -d heatledger_db_restore /backups/latest_verified_snapshot.dump
   ```
4. **Cryptographic Seal Consistency Check:**
   Run integrity validator to ensure all SHA-256 hashes of sealed dossiers match ledger receipts:
   ```bash
   python -m backend.scripts.verify_archive_integrity --db-url "$RESTORE_DB_URL"
   ```
5. **Promote Restored Database to Production:** Swap connection strings, release maintenance mode.

---

## 5. Mandatory 72-Hour Customer & Regulatory Notification (GDPR / DPDP)

Under EU GDPR Article 33 and DPDP Section 8(6), impacted data fiduciaries and customers must be notified **without undue delay and no later than 72 hours** after becoming aware of a personal data breach.

### Statutory 72-Hour Notification Template

```markdown
Subject: [IMPORTANT SECURITY NOTICE] HeatLedger AI Incident Notification — Action Required

Dear Quality & Plant Leadership at <Plant Name>,

We are writing to inform you of a confirmed security incident identified on [Date/Time IST] affecting [Scope of Systems].

1. What Happened:
On [Date/Time], our automated security monitoring detected [brief, non-technical explanation, e.g., unauthorized access attempts targeting temporary file staging / credential anomaly]. Our incident response team contained the event within [Duration] minutes.

2. What Information Was Involved:
Our forensic investigation confirmed that [specific datasets, e.g., MTC metadata, shipment draft numbers, or user email addresses] associated with your plant may have been exposed. Original encrypted certificate archives and private cryptographic seals remained protected.

3. Immediate Actions Taken:
- All active user sessions and API tokens across your organization were revoked immediately.
- The targeted access vector has been permanently closed and validated against our automated security suite.
- Point-in-time cryptographic audit trail verified that no certificate data was modified or tampered with.

4. What You Should Do:
- When you next log in to HeatLedger AI, you will be prompted to reset your password and re-verify your TOTP authenticator.
- Review your team member list under Account Settings -> Team to ensure all authorized seats are current.

5. Inquiries & Dedicated Support:
Our founder and security contact desk is available via the configured `SUPPORT_EMAIL` and `INCIDENT_CONTACT_PHONE` channels for technical and regulatory questions.

Sincerely,
The HeatLedger AI Information Security Team
```
