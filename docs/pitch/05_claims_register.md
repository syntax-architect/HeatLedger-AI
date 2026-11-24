# HeatLedger AI — Truth & Claims Register
**Specification:** Prompt Pack v4 — Task E4 (Pitch Preparation & Truth Invariant)  
**Last Verified:** 24 November 2026  
**Audience:** Investors, Auditors, Prospective Clients  

> **Statutory Policy:** Every public number, legal claim, performance benchmark, and pricing tier published by HeatLedger AI is recorded in this register with its verified technical or regulatory evidence. No marketing claim is permitted without an underlying test or legal statute.

---

| # | Public Statement / Number | Source / Regulatory Reference | Date Verified | Verified Codebase / Empirical Evidence |
|---|---|---|---|---|
| 1 | **1 October 2026 Melt-and-Pour Enforcement** | Commission Implementing Regulation (EU) 2026/1963, Official Journal of the European Union | 23 Nov 2026 | Enforced in `data/melt_pour_rules.json` and verified in `backend/test_c2_melt_and_pour.py`. |
| 2 | **CN Codes 7208 to 7306 in Scope** | Regulation (EU) 2026/1384 Annex I (Fasteners 7318 and fittings 7307 exempt from melt-and-pour rules) | 23 Nov 2026 | Verified in `backend/test_c2_melt_and_pour.py::test_c2_01_cn_scope_evaluation`. |
| 3 | **CBAM Default Value Markups (10% 2026, 20% 2027, 30% 2028)** | Commission Implementing Regulation (EU) 2023/1773 Article 4(3) & definitive guidance | 24 Nov 2026 | Seeded in `data/cbam_pricing_rules.json` and verified in `backend/test_c4_cbam_exposure.py::test_c4_02_rules_table_exists_and_contains_sources`. |
| 4 | **Quarterly CBAM Certificate Prices (€75.36 Q1, €75.28 Q2, €82.32 Q3 2026)** | European Commission Directorate-General for Taxation and Customs Union (EU ETS quarterly average auction price) | 24 Nov 2026 | Seeded in `data/cbam_pricing_rules.json`; verified dynamic loading in `backend/test_c4_cbam_exposure.py::test_c4_03_hand_calculation_spreadsheet_equivalence`. |
| 5 | **30 September 2027 First Declaration Deadline** | Regulation (EU) 2023/956 Article 6(1) transitional-to-definitive reporting timeline | 24 Nov 2026 | Included in `data/cbam_pricing_rules.json` and client exposure reports. |
| 6 | **UK CBAM Voluntary 1 Apr 2027, Mandatory 1 Jul 2027 (£2,000 threshold)** | UK Department for Energy Security and Net Zero & HM Treasury consultation policy paper (2025/2026) | 24 Nov 2026 | Encoded in `data/melt_pour_rules.json` and `backend/melt_and_pour_service.py`. |
| 7 | **Plant Standard Plan Price: ₹9,999/month + 18% GST** | Canonical pricing configuration in `data/plans.json` (Tier: `PLANT`, SAC: `998313`) | 23 Nov 2026 | Tested in `backend/test_b9_billing.py` and `backend/test_d2_d4_sales_and_leads.py`. |
| 8 | **Pilot Audit Price: ₹25,000 one-time** | Canonical pricing configuration in `data/plans.json` (Tier: `PILOT`, validity: 30 days, 50 cert limit) | 23 Nov 2026 | Tested in `backend/test_b9_billing.py` and proposal generator in `backend/test_d2_d4_sales_and_leads.py`. |
| 9 | **20% Channel Partner Commission for 12 Months** | Canonical partner terms in `data/plans.json` and `backend/partner_service.py` | 24 Nov 2026 | Verified in `backend/test_d3_partners.py::test_commission_accrual_from_paid_invoices_only`. |
| 10 | **ASTM E29 Rounding-Off Tolerance Method** | ASTM E29 Standard Practice for Using Significant Digits in Test Data to Determine Conformance | 24 Nov 2026 | Implemented in `backend/spec_service.py` and `backend/spec_check_service.py`; tested in `backend/test_c1_buyer_spec_check.py`. |
| 11 | **IIW Carbon Equivalent Formula: CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15** | International Institute of Welding (IIW) standard carbon equivalent formula for weldability | 24 Nov 2026 | Verified in `backend/test_c1_buyer_spec_check.py::test_c1_06_carbon_equivalent_calculation`. |
| 12 | **Wrought Steel Carbon Implausibility Ceiling (2.14% C)** | Iron-Carbon Phase Equilibrium Diagram (Carbon > 2.14 wt% constitutes cast iron, physically implausible for wrought steel) | 24 Nov 2026 | Verified in `backend/test_c5_anomaly_checks.py::test_c5_07_carbon_cast_iron_threshold_flagged`. |
| 13 | **Tensile Strength < Yield Strength Physical Implausibility Blocker** | Fundamental continuum mechanics and ASTM A370 tensile testing standards | 24 Nov 2026 | Verified in `backend/test_c5_anomaly_checks.py::test_c5_06_tensile_less_than_yield_flagged`. |
| 14 | **EU 25% Safeguard Duty on Over-Quota Imports** | Commission Implementing Regulation (EU) 2019/159 and subsequent annual tariff rate quota (TRQ) reviews | 24 Nov 2026 | Tested in `backend/test_d2_d4_sales_and_leads.py::test_d2_01_hand_calculation_roi_calculator_equivalence`. |
| 15 | **Demurrage Estimate: ₹12,000 to ₹15,000 / day** | Port of Nhava Sheva (JNPA) and Kolkata Port Trust (Syama Prasad Mookerjee Port) demurrage tariff schedules | 24 Nov 2026 | Labeled strictly as user-editable `estimate` in `data/plant_risk_parameters.json` and `/roi`. |
| 16 | **Primary AI Models Used: Gemini 3.1 Flash-Lite** | Google DeepMind Gemini API current model catalog (Prompt B2 retired model sweep) | 24 Nov 2026 | Enforced in `backend/model_config.py` and verified in `backend/test_b2_model_cost_governance.py`. |
| 17 | **Zero External AI Data Retention** | Google Cloud / Gemini API Enterprise Zero Data Retention terms of service | 24 Nov 2026 | Verified in `backend/test_r6_privacy_export_deletion.py` and `backend/extraction_service.py`. |
| 18 | **Statutory Disclaimer Invariant: Prepared, Not Verified** | Prompt Pack v4 Rule 6 & EU 2023/956 accreditation boundaries | 24 Nov 2026 | Checked across all routes: strictly zero instances of "certified compliant" or "audit-proof" without plant disclaimer. |
