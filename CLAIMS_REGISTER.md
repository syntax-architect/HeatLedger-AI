# HeatLedger AI: Claims & Factual Register
**Document ID:** HL-CLAIM-REG-2026-V1  
**Last Audited:** 19 November 2026  
**Auditor:** Senior UX Designer & Lead Compliance Architect  
**Review Policy:** Every marketing, UI, backend response, and documentation statement must trace directly to a verified statute, benchmark publication, or physical test result. Zero unprovable superlatives or false guarantees.

---

## 1. Statutory Claims & Legal Foundations

| Claim ID | Statement in Product / Marketing | Grounded Legal / Empirical Basis | Source Citation & URL | Last Verified | Owner |
|---|---|---|---|---|---|
| **CLM-001** | *"Prepares data for your authorised inspection representative and CBAM verifier"* | Software formats optical spectrometry and mechanical test data pursuant to EN 10204:2004 Clause 6 and CBAM reporting obligations. | EN 10204:2004 Standard; Regulation (EU) 2023/956 Art. 7 | 2026-11-19 | Compliance Team |
| **CLM-002** | *"Original files kept byte-identical with SHA-256 hashes"* | Ingestion pipeline computes cryptographic SHA-256 digest on receipt and stores original PDF bytes byte-for-byte unaltered in verified ZIP package. | Federal Information Processing Standards (FIPS 180-4); EN 10204 Clause 6 | 2026-11-19 | Engineering Team |
| **CLM-003** | *"10% markup in 2026, 20% in 2027, 30% from 2028 on default values"* | Statutory markup progression applied to EU default emission baselines for unverified imported goods during definitive CBAM regime. | Commission Implementing Regulation (EU) 2025/2621, Art. 4 | 2026-11-19 | Legal / Regulatory |
| **CLM-004** | *"CBAM certificate benchmark price: €75.36 / tCO2e (Q1 2026)"* | Average quarterly auction closing price of EU ETS allowances published by European Commission for Q1 2026. | European Commission DG TAXUD Market Bulletin (7 April 2026) | 2026-11-19 | Finance Team |
| **CLM-005** | *"Melt-and-pour mandatory origin evidence rules apply from 1 October 2026"* | Importers must declare verified country of melt and pour on customs entry documentation; non-MTC documents cease sole acceptance from 1 October 2027. | Commission Implementing Regulation (EU) 2026/1963; DG TAXUD Notice | 2026-11-19 | Trade Compliance |
| **CLM-006** | *"Indian Power Grid Weighted Average Factor: 0.727 tCO2e/MWh"* | National combined weighted average baseline emission factor for Indian electricity grid (Operating Margin + Build Margin). | Central Electricity Authority (CEA) User Guide v20.0 (Oct 2024 / 2025) | 2026-11-19 | Engineering Team |
| **CLM-007** | *"Furnace Oil Emission Factor: 2.68 kg CO2e/L"* | Stationary combustion emission factor for light fuel oil / furnace oil (3.15 tCO2/t fuel at 0.85 kg/L density). | IPCC 2006 Guidelines for National GHG Inventories, Vol. 2, Ch. 2 | 2026-11-19 | Compliance Team |
| **CLM-008** | *"Zero-Data-Retention (ZDR) OCR Inference"* | Uploaded mill test certificates are processed strictly in ephemeral memory / local PyMuPDF parser and never stored or retained by third-party model providers. | Google Cloud / Gemini API Zero Data Retention Enterprise Agreement | 2026-11-19 | Security Team |
| **CLM-009** | *"Ed25519 Asymmetric Cryptographic Signatures"* | High-speed digital signature algorithm based on Edwards-curve Digital Signature Algorithm (EdDSA) offering 128-bit security level without shared-key disclosure. | RFC 8032 (IETF); cryptography.hazmat.primitives.asymmetric.ed25519 | 2026-11-19 | Security Team |
| **CLM-010** | *"Estimated €4,000+ difference per container versus EU default markups"* | Mathematical result for 24.5 MT container of steel fittings (CN 7307) comparing verified installation SEE (~2.03 t) against 2026 default baseline (4.20 t) at €75.36/t. | Sourced calculation trace in `compliance_engine.py` | 2026-11-19 | Commercial Team |

---

## 2. Forbidden Words & Mandatory Replacement Lexicon

The following terms are strictly prohibited from all production code, UI copy, and marketing assets:

| Prohibited Word / Phrase | Why Prohibited | Mandatory Compliant Replacement |
|---|---|---|
| `"Guaranteed"` / `"100% Audit Guaranteed"` | Implies software guarantees third-party customs clearance or regulatory certification. | `"Verifiable SHA-256 audit trail"` or `"Supports verifier audit readiness"` |
| `"Zero-Forgery"` | Absolutist claim unprovable against adversarial bad actors. | `"Byte-identical original preservation"` or `"EN 10204 Clause 6 deliverable"` |
| `"Certified & Locked"` | Software cannot certify engineering properties on its own authority. | `"Digitally Signed (Ed25519)"` |
| `"Tamper-Proof"` | Cryptography provides tamper-evidence and detection, not physical prevention. | `"Tamper-evident"` or `"cryptographically verifiable with SHA-256"` |
| `"NABL Accredited"` (hardcoded) | HeatLedger is not a NABL testing laboratory; plants may or may not possess accreditation. | `"Declared by plant in settings"` or `"Independent QA Representative"` |
| `"penalty"` / `"punitive fine"` | CBAM default markups are environmental border adjustments, not criminal fines or customs penalties. | `"statutory markup under Implementing Regulation (EU) 2025/2621"` or `"cost difference versus default values"` |
| `"tax savings"` | Creates legal and tax liability risks. | `"estimated cost difference versus default values"` or `"estimated certificate liability difference"` |
| `"Eliminate"` | Overpromises operational outcomes. | `"Defend against"` or `"Reduce exposure to"` |
| `"ZDR guarantee"` | Absolute commercial warranty. | `"Zero-Data-Retention processing"` |

---

## 3. Mandatory Footer & View Disclaimer
All public web pages, dashboard shells, and export dossiers must render the canonical disclaimer:

> **Standard Legal Notice:**  
> *"HeatLedger supports compliance preparation. It is not legal advice and not an accredited verification body."*
