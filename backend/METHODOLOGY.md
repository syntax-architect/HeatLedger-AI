# HeatLedger AI: Regulatory Methodology & Calculation Specifications
**Document ID:** HL-METH-2026-V1  
**Last Verified:** 19 November 2026  
**Applicable Jurisdictions:** European Union (EU CBAM), United Kingdom (UK CBAM)  
**Target Sectors:** Iron and Steel (EU CN Chapters 72 & 73)

---

## 1. Executive Summary & Legal Disclaimer
HeatLedger AI provides software tools to assist industrial steel processors, forgers, and exporters in preparing data for authorized inspection representatives (EN 10204:2004 Clause 6) and accredited CBAM verification bodies under Regulation (EU) 2023/956.

> **Legal Disclaimer:** HeatLedger AI is not an accredited verification body or legal counsel. All calculations, cost comparisons, and financial figures produced by this engine are **Estimates for planning** purposes only. Final compliance filings must be reviewed and certified by an accredited verifier.

---

## 2. Regulatory Legal Framework & Sources

The deterministic formulas implemented in `compliance_engine.py` are sourced directly from official European Commission legislative acts:

1. **Regulation (EU) 2023/956** of the European Parliament and of the Council of 10 May 2023 establishing a carbon border adjustment mechanism.
   - *Article 7:* Calculation of embedded emissions.
   - *Article 21:* Sale and pricing of CBAM certificates based on quarterly EU ETS allowance averages.
   - *Annex III:* Rules for calculating embedded emissions for simple and complex goods.
2. **Commission Implementing Regulation (EU) 2023/1773** of 17 August 2023 laying down the rules for the application of Regulation (EU) 2023/956 as regards reporting obligations during the transitional period.
   - *Annex III, Section 3:* Specific embedded emissions determination for iron and steel installations.
   - *Annex IV:* Technical parameters for system boundary definitions and precursor allocation.
3. **Commission Implementing Regulation (EU) 2025/2621** (Definitive Period Default Values and Markup Schedules):
   - Establishes country-specific and CN-code-specific default values.
   - Enacts the markup schedule for default emission values:
     - **Year 2026:** +10% markup
     - **Year 2027:** +20% markup
     - **Year 2028 onwards:** +30% markup
4. **Central Electricity Authority (CEA), Government of India**:
   - *CO2 Baseline Database for the Indian Power Sector, User Guide Version 20.0 (October 2024 / 2025)*:
     - National Weighted Average Grid Emission Factor (Operating + Build Margin): **0.727 tCO2e/MWh** (0.727 kg CO2e/kWh).
5. **IPCC 2006 Guidelines for National Greenhouse Gas Inventories**:
   - Volume 2 (Energy), Chapter 2 (Stationary Combustion):
     - Light Fuel Oil / Furnace Oil Emission Factor: **3.15 tCO2/t fuel** (~2.68 kg CO2/Litre at nominal density of 0.85 kg/L).
6. **European Commission Official ETS Market Bulletin (7 April 2026)**:
   - Official published CBAM certificate benchmark price for Q1 2026: **EUR 75.36 / tCO2e**.
7. **Reserve Bank of India (RBI) Reference Rate (2 January 2026)**:
   - Official EUR/INR exchange rate: **INR 90.50 / EUR**.

---

## 3. Mathematical Formulas

### 3.1 Direct Specific Embedded Emissions ($\text{DirSEE}$)
Direct emissions originate from fossil fuels consumed on-site at the processing installation (e.g. reheating furnaces, heat treatment ovens, forging hammers):

$$\text{AttrDirEm} = \frac{\text{FuelConsumed}_{\text{liters}} \times \text{EF}_{\text{fuel}}}{1000}$$

$$\text{DirSEE} = \frac{\text{AttrDirEm}}{\text{AL}_{\text{monthly}}}$$

Where:
- $\text{FuelConsumed}_{\text{liters}}$: Total monthly furnace fuel consumed in liters.
- $\text{EF}_{\text{fuel}}$: Fuel emission factor ($2.68 \text{ kg CO}_2\text{e/liter}$ for standard furnace oil).
- $\text{AL}_{\text{monthly}}$: Monthly total activity level / production output in metric tonnes.
- $\text{DirSEE}$: Direct specific embedded emissions in $\text{tCO}_2\text{e / metric tonne}$.

### 3.2 Indirect Specific Embedded Emissions ($\text{IndirSEE}$)
Indirect emissions originate from grid electricity consumed by the installation, adjusted for verified on-site renewable generation:

$$\text{NetElectricity}_{\text{kWh}} = \max(0.0, \text{GridElectricity}_{\text{kWh}} - \text{SolarSelfConsumed}_{\text{kWh}})$$

$$\text{AttrIndirEm} = \frac{\text{NetElectricity}_{\text{kWh}} \times \text{EF}_{\text{grid}}}{1000}$$

$$\text{IndirSEE} = \frac{\text{AttrIndirEm}}{\text{AL}_{\text{monthly}}}$$

Where:
- $\text{GridElectricity}_{\text{kWh}}$: Total electricity imported from the regional power grid.
- $\text{SolarSelfConsumed}_{\text{kWh}}$: Verified behind-the-meter captive solar or renewable generation.
- $\text{EF}_{\text{grid}}$: Regional grid emission factor ($0.727 \text{ tCO}_2\text{e/MWh}$ or $0.727 \text{ kg CO}_2\text{e/kWh}$ per CEA India v20.0).
- $\text{IndirSEE}$: Indirect specific embedded emissions in $\text{tCO}_2\text{e / metric tonne}$.

### 3.3 Precursor Specific Embedded Emissions ($\text{PrecursorSEE}$)
Under Annex III, Section 3.1 of Regulation (EU) 2023/956, iron and steel forged and downstream products (CN 7307, 7318, 7326) are complex goods that incorporate upstream precursor materials (e.g., billets, blooms, hot-rolled bars from primary steel mills):

$$\text{PrecursorSEE} = \sum_{i=1}^{n} \left( \text{PrecursorSEE}_i \times m_i \right)$$

Where:
- $\text{PrecursorSEE}_i$: Verified specific embedded emissions of upstream precursor $i$ ($\text{tCO}_2\text{e / tonne}$).
- $m_i$: Mass consumption ratio of precursor $i$ per tonne of finished good produced:
  $$m_i = \frac{\text{Mass of Precursor } i \text{ Consumed (tonnes)}}{\text{Activity Level Finished Product Produced (tonnes)}} = 1 + \text{ScrapLossRate}$$
  *(For instance, a 15% forging scrap loss yields $m_i = 1.15$)*.

> **Data Completeness Requirement:** If either the upstream precursor SEE or the precursor mass consumption ratio is unavailable, the calculation engine **must not guess or estimate**. It returns `status: "insufficient_data"` with the exact missing fields required.

### 3.4 Total Verified Specific Embedded Emissions ($\text{TotalSEE}$)
$$\text{TotalSEE} = \text{DirSEE} + \text{IndirSEE} + \text{PrecursorSEE}$$

---

## 4. Official Default Value Benchmark & Markup Schedule

Under Implementing Regulation (EU) 2025/2621, importers who fail to obtain verified supplier installation data are subjected to EU default baseline values with progressive markups:

$$\text{DefaultSEE}_{\text{effective}} = \text{DefaultSEE}_{\text{base}}(CN, \text{Country}) \times (1.0 + \text{MarkupPct}_{\text{year}})$$

### 4.1 Markup Schedule
| Reporting Year | Mandatory Default Markup | Regulatory Citation |
|---|---|---|
| **2026** | **+10%** ($0.10$) | Implementing Regulation (EU) 2025/2621, Art. 4 |
| **2027** | **+20%** ($0.20$) | Implementing Regulation (EU) 2025/2621, Art. 4 |
| **2028+** | **+30%** ($0.30$) | Implementing Regulation (EU) 2025/2621, Art. 4 |

### 4.2 Sourced Default Baseline Values Table (Extract for India & Global Fallback)
| CN Code | Product Description | India Base ($\text{tCO}_2\text{e/t}$) | 2026 (+10%) | 2027 (+20%) | 2028 (+30%) | Global Fallback | Source |
|---|---|---|---|---|---|---|---|
| **7208** | Hot-rolled flat steel | **4.28** | 4.708 | 5.136 | 5.564 | 2.15 | Implementing Reg (EU) 2025/2621 |
| **7207** | Semi-finished steel (billets/blooms) | **2.30** | 2.530 | 2.760 | 2.990 | 1.95 | Implementing Reg (EU) 2025/2621 |
| **7214** | Other bars and rods (non-alloy) | **2.65** | 2.915 | 3.180 | 3.445 | 2.05 | Implementing Reg (EU) 2025/2621 |
| **7228** | Other bars and rods (alloy steel) | **3.12** | 3.432 | 3.744 | 4.056 | 2.25 | Implementing Reg (EU) 2025/2621 |
| **7307** | Tube/pipe fittings (flanges, elbows) | **3.82** | 4.202 | 4.584 | 4.966 | 2.45 | Implementing Reg (EU) 2025/2621 |
| **7318** | Screws, bolts, nuts, fasteners | **3.45** | 3.795 | 4.140 | 4.485 | 2.35 | Implementing Reg (EU) 2025/2621 |
| **7326** | Other forged articles of steel | **3.60** | 3.960 | 4.320 | 4.680 | 2.40 | Implementing Reg (EU) 2025/2621 |

---

## 5. Commercial Liability Comparison (Estimates for Planning)

The estimated certificate liability difference represents the difference in CBAM financial certificate purchase obligation between the verified installation emissions and the EU default value:

$$\text{SEE}_{\text{difference}} = \max(0.0, \text{DefaultSEE}_{\text{effective}} - \text{TotalSEE})$$

$$\text{TotalCarbonAvoided}_{\text{tonnes}} = \text{NetShipmentTonnes} \times \text{SEE}_{\text{difference}}$$

$$\text{EstimatedDifference}_{\text{EUR}} = \text{TotalCarbonAvoided}_{\text{tonnes}} \times \text{ETSPrice}_{\text{EUR}}$$

$$\text{EstimatedDifference}_{\text{INR}} = \text{EstimatedDifference}_{\text{EUR}} \times \text{ExchangeRate}_{\text{EUR/INR}}$$

> **Terminology Policy:**
> - Strictly **FORBIDDEN:** "tax savings", "penalty fine", "punitive savings", "guaranteed refund".
> - Strictly **REQUIRED:** "Estimate for planning", "Estimated cost difference versus default values", "Estimated certificate liability difference".

---

## 6. Calculation Trace & Versioning Architecture

To guarantee total regulatory auditability:
1. Every calculation result contains a complete `calculation_trace` dictionary.
2. The trace stores:
   - `constants_version`: String identifier of the regulatory constants snapshot (e.g., `REG-2026-Q1-V1`).
   - `timestamp`: UTC ISO timestamp of execution.
   - `inputs_used`: Explicit map of all raw physical input parameters.
   - `steps`: Array of ordered calculation steps, detailing formula string, operands, and intermediate results.
   - `constants_applied`: Sourced constant values with verification URLs and effective dates.
3. If constants are updated in the database, recalculations generate a new calculation record linked to the new constants version; prior calculations remain immutable and reproducible.
