# Public Gateways Data Minimization Specification (Prompt S4)

## Overview
HeatLedger AI provides two unauthenticated public gateways required for customs clearance, buyer compliance verification, and physical QR code scanning:
1. **Public Compliance Share Portal**: `/api/portal/share/{token}` & `/share/{token}`
2. **Cryptographic Verification Gateway**: `/api/verify/lookup/{code_or_hash}` & `/verify/{code}`

In compliance with **EU CBAM Regulation (EU) 2023/1773**, **EU Implementing Regulation (EU) 2026/1963**, and **ISO/IEC 27001 Principle of Data Minimization**, these endpoints expose strictly the minimum fields necessary for statutory customs clearance and mathematical tamper-evidence. All internal commercial pricing, supplier margins, employee credentials, and private cryptographic keys are strictly excluded.

---

## 1. Public Share Portal (`/api/portal/share/{token}`)

### Allowed Public Fields & Statutory Justifications

| Field Name | Type | Statutory & Operational Justification |
| :--- | :--- | :--- |
| `token` | `string` | Public capability token identifying the authorized compliance packet. |
| `shipment_id` | `string` | Cross-referenced against the commercial Bill of Lading (B/L) and EU Customs Single Window (EU CSW-CERTEX). |
| `exporter_name` | `string` | Legal entity identifier of the Indian manufacturing plant claiming origin under EU 2026/1963. |
| `exporter_country` | `string` | Country of dispatch (mandatory customs box 15 on Single Administrative Document / SAD). |
| `destination_port` | `string` | Port of entry into the European Union (e.g. Rotterdam, Hamburg, Antwerp). |
| `containers` | `list[string]` | Intermodal container tracking numbers for physical port container yard reconciliation. |
| `gross_weight_mt` | `number` | Total gross metric tonnage declared on customs packing manifest. |
| `net_weight_mt` | `number` | Net metric tonnage required for CBAM precursor math calculations. |
| `cn_code` | `string` | 8-digit EU Combined Nomenclature tariff code (CN 7208–7306 in melt-and-pour scope; CN 7307/7318 in CBAM scope). |
| `compliance_status` | `string` | Statutory green-light summary for customs clearing agents. |
| `readiness_score` | `integer` | 0–100 compliance confidence score based on rule checks. |
| `custom_note` | `string` | Optional non-confidential routing or consignee instructions. |
| `regulations_attested` | `list[string]` | Legal citations under which the declaration is executed. |
| `heats[].heat_number` | `string` | Mandatory under Implementing Regulation (EU) 2026/1963 for all crude steel origin claims. |
| `heats[].mill_name` | `string` | Primary crude steel melt shop identity (Tata Steel, JSW, JSPL, SAIL). |
| `heats[].melt_country` | `string` | Country of Melt and Pour (CMP) ISO code. |
| `heats[].crude_steel_process`| `string` | Primary production route (BOF, EAF, DRI/EAF) for CBAM specific emissions benchmarks. |
| `heats[].steel_grade` | `string` | Material specification (ASTM, ASME, EN, DIN) proving structural compliance. |
| `heats[].cev` | `number` | Carbon Equivalent Value calculated from ladle analysis. |
| `heats[].tonnes` | `number` | Mass-balance allocation tonnage linked to this specific shipment. |
| `heats[].mtc_number` | `string` | Upstream Mill Test Certificate reference number. |
| `heats[].mtc_type` | `string` | Inspection document type (e.g., EN 10204 Type 3.1). |
| `heats[].chemistry` | `object` | Ladle chemical composition (C, Mn, Si, P, S, Cr, Ni, Mo) required for alloy classification. |
| `emissions_summary` | `object` | Specific embedded direct/indirect emissions (tCO2e/t) for importer CBAM quarterly registry filing. |
| `digital_signature` | `object` | Ed25519 signer name, timestamp, public key fingerprint, and Annex SHA-256 for tamper-evidence. |
| `expires_at` | `string` | ISO 8601 UTC timestamp denoting validity window of the capability token. |

### Strictly Redacted & Excluded Fields
- **Purchase Order Pricing & Unit Costs**: Supplier commercial rates, unit prices (INR/EUR), and margins are strictly stripped.
- **Supplier Financial Banking Details**: GSTIN bank accounts, IFSC, and payment terms are never present.
- **Internal Database Keys & Foreign Keys**: Underlying database UUIDs, user IDs, and password hashes are never returned.
- **Plant Proprietary Operational Metrics**: Mill yield ratios, confidential electricity tariff contracts, and labor rates.

---

## 2. Public Verification Gateway (`/api/verify/lookup/{code_or_hash}`)

### Allowed Public Fields & Statutory Justifications

| Field Name | Type | Statutory & Operational Justification |
| :--- | :--- | :--- |
| `verification_code` | `string` | Human-readable verification code (e.g. `HL-2026-X9K4`) printed on physical paper dossiers. |
| `signer_name` | `string` | Authorized QA Inspector identity mandated by EN 10204 3.1 independent inspection criteria. |
| `signer_role` | `string` | Role classification (QA_INSPECTOR or OWNER). |
| `organization_name` | `string` | Corporate name of certifying manufacturer. |
| `invoice_number` | `string` | Commercial invoice identifier linking physical goods to customs certificate. |
| `heat_numbers` | `list[string]` | Steel batch heat numbers covered by this cryptographic seal. |
| `pdf_sha256` | `string` | SHA-256 digest of final merged buyer dossier. |
| `upstream_sha256` | `string` | Byte-identical SHA-256 digest of original unaltered mill test certificate (Clause 6 compliance). |
| `key_id` | `string` | Ed25519 public key identifier used to look up verified public key. |
| `public_key_b64` | `string` | Base64-encoded Ed25519 public key enabling client-side mathematical verification. |
| `signature_b64` | `string` | Base64-encoded Ed25519 signature over canonical payload. |
| `canonical_message` | `string` | Deterministic pipe-delimited payload signed by the key. |
| `signed_at` | `string` | Cryptographic timestamp of signoff. |
| `status` | `string` | Signature validity state (`VALID`, `SUPERSEDED`, `REVOKED`). |
| `revoked_at` / `reason`| `string` | Audit explanation if signature was revoked or superseded. |

### Strictly Redacted & Excluded Fields
- **Private Signing Keys**: Stored in KMS/HSM or encrypted environment variables; never queryable or exposed.
- **Inspector Passkeys / TOTP Seeds**: Secret authentication seeds used during step-up signing.
- **Exporter Commercial Margins**: Confidential contract terms between exporter and buyer.
- **Internal Database Connection Strings or Credentials**: Never leaked in error responses or metadata.
