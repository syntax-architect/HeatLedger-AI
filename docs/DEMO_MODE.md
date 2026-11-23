# Prompt L1: Safe Demo Mode & Synthetic Sample Pack

> **Playbook Reference**: Phase 5 Launch — Prompt L1 (`HeatLedger_Prompt_Pack_v2.pdf`, Page 28)  
> **Status**: Verified & Operational

---

## 1. Overview & Objective

The **Demo Mode & Sample Pack Engine** provides a one-click, friction-free demonstration environment for prospects, auditors, and sales engineering without ever pretending synthetic data is real or touching genuine customer information.

---

## 2. Core Guardrails & Watermark Enforcement

1. **Mandatory Watermark Guarantee**:
   - Every synthetic document is permanently watermarked with:
     ```
     SAMPLE - NOT A REAL CERTIFICATE
     ```
   - Stamped diagonally across every page in high-visibility vector text.
   - Burnt into embedded PDF metadata (`title`, `subject`, `keywords`).
   - Hardened export rule: Documents from `org_sample_howrah_works` cannot be exported without this watermark.

2. **Complete Tenancy & Metric Isolation**:
   - Resides in isolated organization `org_sample_howrah_works`.
   - `DemoService.is_demo_org()` returns `True`, preventing any demo activity, test runs, or sample downloads from polluting production telemetry, billing meters, or lead pipeline analytics.

3. **Atomic One-Click Reset**:
   - `POST /api/demo/reset` wipes any user edits or test shipments within the demo tenant and restores the pristine baseline in `< 50ms`.

---

## 3. Synthetic Sample Dataset Details

| Entity | Identifier / Value | Specification |
| :--- | :--- | :--- |
| **Organization** | `SAMPLE - Howrah Castings Demo Plant` | `org_sample_howrah_works` (slug: `sample-howrah-castings`) |
| **Plant Facility** | `SAMPLE - Howrah Mill No. 4` | UN/LOCODE: `IN CCU` · Lat/Long: `22.5958, 88.2636` |
| **Demo User** | `demo.inspector@howrahsteel.in` | Role: `QA_INSPECTOR` (One-click instant authentication) |
| **Supplier** | `SAMPLE - Tata Steel Long Products` | Jamshedpur, IN · Tier-1 Rated |
| **Synthetic MTC** | `MTC-SAMPLE-2026-9021` | Standard: `EN 10204 Type 3.1` · Melt & Pour: `India (IN)` |
| **Heat Ledger** | `SAMPLE-TSL-2026-9021` | Initial: 120 MT · Allocated: 34.5 MT · Remaining: 85.5 MT |
| **Export Shipment**| `SAMPLE-EXP-2026-4091` | Buyer: `ThyssenKrupp Materials Europe GmbH (DE)` · CN: `7304.19.10` |
| **CBAM Dossier** | `dos_sample_4091` | SEE: `1.85 tCO2e/t` · Signed with Ed25519 digital signature |
| **Public Share** | `/share/tok_demo_sample_pack_2026` | Read-only public portal for buyer verification |

---

## 4. 3-Minute Guided Tour with Tooltips

The app provides a structured 5-step guided tour matching the complete exporter workflow:

1. **Command Center & Vitals** (`/app/home`): Real-time compliance radar tracking upcoming shipments and EU 2026/1963 readiness scores.
2. **MTC Workbench** (`/app/certificates`): Sub-penny vector extraction validating melt & pour origin against EN 10088 standards.
3. **Anti-Phantom Heat Ledger** (`/app/heats`): Mass-balance ledger guaranteeing precursor tonnage cannot be over-allocated.
4. **Clause 6 Cryptographic Sign-Off** (`/app/sign-off`): Authorized QA inspector digital signature using Ed25519 tamper-evident sealing.
5. **CBAM XML & Buyer Pack** (`/app/dossiers`): EU Customs ready XML and shareable verification link with QR code.

---

## 5. API Reference

- `POST /api/demo/load`: Initializes or verifies demo plant state.
- `POST /api/demo/reset`: Atomically restores demo plant to clean baseline.
- `GET /api/demo/overview`: Returns guided tour steps and sample pack status.
- `GET /api/demo/sample-pack`: Downloads sample watermarked MTC PDF.
