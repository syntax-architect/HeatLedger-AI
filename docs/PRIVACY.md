# HeatLedger AI — Privacy, Data Governance & Legal Architecture (Prompt R6)

> [!CAUTION]
> **LEGAL NOTICE: Draft, review with a qualified Indian/EU corporate lawyer before commercial deployment.**  
> *(This advisory note is documented here for internal engineering and governance records, and is omitted from user-facing production UI screens).*

---

## 1. Privacy Policy Summary (Plain Language, Under 1 Page)

**Effective Date:** 1 January 2026 | **Last Reviewed:** 22 November 2026  
**Controller:** HeatLedger Technologies Pvt. Ltd., Kolkata, West Bengal, India.

### What We Collect
- **Account & Plant Data**: Business name, registered address, GSTIN, plant coordinates, user email addresses, designated roles (OWNER, QA_INSPECTOR, DISPATCH, VIEWER).
- **Compliance Artifacts**: Mill Test Certificates (MTCs), invoice numbers, heat numbers, chemical compositions, mechanical properties, and buyer dossier PDFs.
- **Billing Records**: Razorpay payment tokens, subscription tier, and GST tax invoices.

### How We Use It
- To read and parse mill certificates using deterministic text analysis and optional AI extraction.
- To reconcile heat numbers and dispatch tonnages against export shipments.
- To generate tamper-evident buyer compliance packs and cryptographic verification codes.
- We **never** sell customer data and **never** use customer mill certificates or proprietary metallurgical recipes to train public AI models.

### Who Can See Your Data
- **Your Team**: Members explicitly invited by your organisation OWNER according to their role matrix.
- **Your Buyers**: Only when your plant explicitly issues a secure, time-limited, 128-bit cryptographic share link.
- **Sub-Processors**: Vetted infrastructure providers strictly bound by Data Processing Agreements.

---

## 2. Authorized Sub-Processors

| Sub-Processor | Role / Function | Data Shared | Location / Sovereignty |
| :--- | :--- | :--- | :--- |
| **Supabase (AWS/PostgreSQL)** | Relational database, RLS storage, document vault | Encrypted database records & PDF files | Mumbai, India / Frankfurt, EU |
| **Cloudflare** | Edge caching, CDN, DDoS & Web Application Firewall | Transit traffic, IP headers, encrypted packets | Global Anycast Edge (India PoPs) |
| **Google Gemini (Vertex AI)** | High-complexity document OCR & visual table extraction | MTC image bytes (zero model training) | Global Secure Cloud Infrastructure |
| **Razorpay** | Payment gateway & subscription billing | Plan subscription, payment status, GSTIN | Bangalore, India |
| **Resend** | Transactional email delivery | Recipient email, system notification links | EU / US Cloud Regions |
| **Sentry** | Error tracking & diagnostic crash telemetry | Sanitized error traces (PII redacted) | EU Cloud Region |

---

## 3. Data Processing Note (DPA Reference)

1. **Storage Location**: Primary relational data and encrypted document blobs reside within secured enterprise instances.
2. **Access Control**: Database enforces Row-Level Security (`organization_id`). Unauthenticated or cross-tenant queries return strictly 404.
3. **Data Retention**:
   - **Default Policy**: 7 years for certificates, heats, shipments, and buyer packs, matching statutory retention under Indian Customs Regulations and European CBAM documentation requirements.
   - **Configurable**: Exporter organisation OWNER can adjust retention between 1 and 20 years.
4. **AI Extraction Consent**:
   - Enabled by default at registration with explicit shop-floor notification.
   - If disabled in Organization Privacy Settings, all certificate parsing strictly bypasses external AI providers, using the local deterministic PyMuPDF text layer only.

---

## 4. Data Export & Deletion Procedures

### Data Export (Owner Self-Service)
- Exporter OWNER can trigger a full archive export at `/api/privacy/export`.
- Returns an encrypted ZIP package containing structured RFC 4180 CSVs (`heats.csv`, `shipments.csv`, `mill_certificates.csv`, `audit_log.csv`) and original byte-identical certificate PDFs.
- Every export is permanently logged in the tamper-evident audit ledger.

### Data Deletion & 30-Day Grace Window
- Exporter OWNER can request complete account deletion at `/api/privacy/delete-request`.
- A mandatory **30-day statutory grace window** is initiated during which deletion may be cancelled.
- Upon grace window expiration, a background purger irreversibly hard-deletes all certificates, extraction runs, heats, shipments, dossiers, and share links.
- **Statutory Tax Exception**: In strict compliance with Section 36 of the Central Goods and Services Tax (CGST) Act, 2017, historical GST billing invoices and payment tax receipts are retained for the statutory 72-month period.

---

## 5. Cookieless Analytics
HeatLedger AI uses cookieless, privacy-preserving session telemetry (or self-hosted Plausible/Umami analytics). No cross-site tracking cookies, fingerprinting pixels, or third-party behavioral beacons are injected into customer workflows.
