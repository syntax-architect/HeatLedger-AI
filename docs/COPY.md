# HeatLedger AI — UI Copy & Text Diet Guide (Prompt M3)

> **Specification**: Prompt Pack v3 — Phase 2 (M3 Text Diet)  
> **Mandatory Rule**: Fewer words, more action. Maximum clarity for Indian steel exporters and European customs brokers.

---

## 1. Golden Rules of Copy

1. **Labels**: Maximum **3 words**. Plain language. No industrial jargon when common words work.
2. **Buttons**: Always start with an active **verb**. Maximum **3 words** (e.g., `Upload MTC`, `Build Pack`, `Seal Dossier`, `Export CSV`).
3. **Help Text**: Maximum **15 words** per helper note. No multi-sentence marketing paragraphs inside the application.
4. **Error Messages**: Exactly one sentence stating **what happened** and **how to fix it** (e.g., *"Invalid certificate PDF: upload an unencrypted file under 10 MB."*).
5. **Numbers & Quantities**: Always include explicit units with non-breaking spaces (e.g., `24.50 t`, `2.05 tCO₂e/t`, `₹25,000`).
6. **Dates & Timestamps**: Strictly use ISO-style or unambiguous single format across all screens: `DD MMM YYYY` (e.g., `01 Oct 2026`).
7. **Legal Disclaimer**: Exactly one immutable sentence in every public footer:  
   > *"Prepares documents for review. Not legal advice."*

---

## 2. Forbidden Wording vs. Approved Replacements

To prevent legal exposure and competitor disputes under EU 2026/1384 & CBAM rules:

| Forbidden Word / Phrase | Why Forbidden | Approved Replacement |
| :--- | :--- | :--- |
| `Verified` / `Certified` | Only EU-accredited verifiers can legally certify emissions | `Checked against rules`, `Sealed`, `Cryptographically sealed` |
| `Compliant` / `Statutory Compliance` | Customs officers determine legal compliance | `Prepared for review`, `Ready for dispatch` |
| `Audit-proof` / `Zero penalty` | False promise; unprovable in law | `Tamper-evident`, `Traceable` |
| `Zero-Data-Retention` | Inaccurate unless backed by enterprise zero-log SLA | `Encrypted at rest`, `Configurable retention (default 7 yrs)` |
| `EN 10204 Clause 6` | Regulatory references must be simplified in user UI | `Release Gate`, `Sign-Off` |

---

## 3. Mandatory 1-Line Glossary Tooltips

Glossary tooltips are restricted strictly to these 5 essential trade definitions (1 line each):

- **MTC (Mill Test Certificate)**: Certified factory document recording the chemical analysis, mechanical tests, and melt origin of a steel batch.
- **Heat Number**: The unique furnace melt identifier assigned by the primary steelmaker when the steel was liquid.
- **Melt and Pour**: The country where raw steel was originally melted in an electric arc furnace or basic oxygen furnace.
- **CBAM**: EU Carbon Border Adjustment Mechanism levying carbon import charges on imported steel from 1 Jan 2026.
- **CN Code**: Combined Nomenclature 8-digit European customs tariff code classifying imported goods.

---

## 4. Mobile Screen Density Rules

- **Mobile Viewport (360 px – 390 px)**: Long data tables are prohibited. Use stacked cards showing only the **3 essential fields** (e.g., Heat #, Grade, Country of Melt).
- **Secondary Details**: Secondary data (chemical bounds, raw XML, full audit hashes) must live inside a bottom sheet opened via a single `Learn more` or `View details` link.
- **Primary CTA**: Exactly **one primary action button** per mobile screen pinned within the thumb zone (minimum 44 px touch target).
