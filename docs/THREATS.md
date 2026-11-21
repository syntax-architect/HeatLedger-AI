# HeatLedger AI · Threat Model & Top 10 Security Hardening Risks (Prompt S7)

> **Document ID:** HL-SEC-THREATS-2026-V3  
> **Classification:** Production IT Security Baseline (1-Page Executive Reference)  
> **Standard:** OWASP Top 10 / ASVS 4.0 / Indian DPDP Act 2023  
> **Last Audited:** 21 November 2026

---

## Top 10 Security Risks, Mitigations & Verifying Automated Tests

| # | Risk & Attack Vector | Impact | Mitigations Implemented in Code | Verifying Automated Test | Status |
| :-: | :--- | :-: | :--- | :--- | :-: |
| **1** | **Hostile PDF with Embedded JS / Actions**<br>Attacker uploads MTC with `/JavaScript` or `/Launch` to execute exploit on inspector or buyer. | High | Ingestion firewall inspects xref objects and neutralizes active actions (`/DisabledAction`) in derived copy while keeping original byte-identical in storage. | `backend/test_s7_hardening.py::<br>test_s7_malicious_pdf_stripped_working_copy` | **VERIFIED** |
| **2** | **Oversized Uploads & Decompression Bombs**<br>Flooding API with >10MB files or recursive PDF streams to exhaust RAM. | High | Hard 10 MB payload firewall enforced at byte-stream level (`MAX_FILE_SIZE = 10MB`). Subprocess parsing with timeout limit (15s) and 50-page max cap. | `backend/test_s7_hardening.py::<br>test_s7_oversized_file_rejected_413` | **VERIFIED** |
| **3** | **MIME-Type & Magic Byte Spoofing**<br>Attacker renames executable (`.exe`) or shell script to `.pdf` or `.png`. | High | Binary header magic byte inspection (`%PDF-`, `\x89PNG`, `\xff\xd8\xff`). Any extension/signature mismatch rejected with HTTP 400. | `backend/test_s7_hardening.py::<br>test_s7_magic_bytes_spoofing_rejected` | **VERIFIED** |
| **4** | **CSV Formula Injection (Spreadsheet Execution)**<br>Attacker puts `=cmd\|' /C calc'!A0` or `@SUM` into mill name, heat number, or invoice. | Medium | All CSV exports use `SafeCSVWriter` / `sanitize_csv_cell`, prepending a single-quote (`'`) to any cell starting with `=`, `+`, `-`, `@`, `\t`, or `\r`. | `backend/test_s7_hardening.py::<br>test_s7_csv_formula_injection_defense` | **VERIFIED** |
| **5** | **Server-Side Request Forgery (SSRF)**<br>Attacker registers webhooks pointing to internal network (`127.0.0.1`, `10.0.0.0/8`, `169.254.169.254`). | Critical | `validate_outbound_url` resolves DNS and strictly blocks loopback, private RFC-1918 ranges, and cloud metadata IP (169.254.169.254). | `backend/test_s7_hardening.py::<br>test_s7_ssrf_prevention` | **VERIFIED** |
| **6** | **Share Link Guessing & Expiration Bypass**<br>Brute-forcing short IDs or accessing expired/revoked share links. | High | 128-bit cryptographic entropy (`secrets.token_hex(16)`), strict ISO expiration date, one-click revocation flag, and optional 6-digit passcode. | `backend/test_s7_hardening.py::<br>test_s7_share_link_entropy_and_passcode` | **VERIFIED** |
| **7** | **Webhook Replay & Signature Forgery**<br>Replaying old payment or integration webhooks to forge invoice status. | High | HMAC-SHA256 signature verification with `X-Signature-Timestamp` enforcement; timestamps drifting >300 seconds are rejected immediately. | `backend/test_s7_hardening.py::<br>test_s7_webhook_replay_protection` | **VERIFIED** |
| **8** | **Cross-Site Scripting & Insecure CSP**<br>Injecting unescaped certificate HTML into dashboard or leaking connect endpoints. | High | Zero `dangerouslySetInnerHTML` in frontend; production CSP removes `'unsafe-inline'` and `localhost`; `Permissions-Policy` disables camera outside capture page. | `backend/test_s7_hardening.py::<br>test_s7_production_csp_and_permissions` | **VERIFIED** |
| **9** | **Phantom Steel Allocation & Tampering**<br>Re-allocating the same steel batch across multiple buyers or altering country of melt. | Critical | Immediate SHA-256 calculation upon arrival; write-once storage; mass balance invariant ($\sum \text{allocated} \le \text{initial}$) enforced by ledger. | `backend/test_r4_buyer_pack.py::<br>test_heat_ledger_reconciliation` | **VERIFIED** |
| **10** | **Rate Limit Abuse & Quota Bypass**<br>Flooding OCR extraction endpoints or bypassing monthly plan limits. | High | Sliding-window limiter per user, per org, and per IP; automated monthly extraction cap checking via `BillingService.check_and_increment_quota`. | `backend/test_s7_hardening.py::<br>test_s7_rate_limits_and_extraction_quota` | **VERIFIED** |

---

*Verified in CI on every push and merge. Zero open Critical or High vulnerabilities.*
