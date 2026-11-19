# HeatLedger AI

**The Shop-Floor-to-Customs Compliance Operating System for Indian Steel & Engineering Exporters**

Compliant with:
* **EN 10204:2004 Clause 6 & Clause 3.1** (Unaltered Mill Certificate Annexation & Inspection Sign-off)
* **EU Regulation 2026/1963 & UK CDS** (Mandatory Country of Melt & Pour Customs Proof)
* **EU CBAM Regulation 2023/1773 & UK CBAM** (Recursive Precursor Heat Traceability & Embedded Emissions Math)

---

## 1. High-Contrast Dual Design Architecture

HeatLedger AI pairs two purpose-built visual themes:
* **"Obsidian Forge & Electric Emerald"** (Dark Theme for Executive Analytics & Public Marketing)
  * Obsidian Forge `#090D16` | Gunmetal Billets `#111827` | Tempered Slate `#1E293B`
  * Electric Emerald `#10B981` (CBAM Pass & Spec Verified) | Molten Amber `#F59E0B` (Heat Trace Lineage)
* **"Precision Daylight"** (Light Theme for Factory QA & Shop-Floor Dispatch Monitors / iPads)
  * Alabaster Steel `#F8FAFC` (Anti-glare background) | Pure Mill Sheet `#FFFFFF` (Card surfaces)

---

## 2. Platform Architecture

```
├── src/                               # Frontend: React 18 + TypeScript + Vite + Tailwind
│   ├── components/
│   │   ├── navigation/TopNavbar.tsx   # Glassmorphic header with seamless Mode Toggle
│   │   ├── marketing/                 # Phase 1: High-converting landing & simulator
│   │   │   ├── HeroSection.tsx        # Hero badge, value prop, trust bar
│   │   │   ├── MtcSimulator.tsx       # 3-preset split-screen interactive simulator
│   │   │   ├── CnScopeChecker.tsx     # HS/CN code scope & regulatory deadline grid
│   │   │   ├── Clause6Diagram.tsx     # 3-step zero-forgery workflow visualizer
│   │   │   └── RoiCalculator.tsx      # CBAM markup savings calculator & 3 pricing tiers
│   │   ├── dashboard/                 # Phase 2: Factory QA & Dispatch Workbench
│   │   │   ├── DashboardShell.tsx     # 5-view persistent sidebar navigation
│   │   │   ├── modals/                # Exporter Discovery & Field Pitch Modal
│   │   │   └── views/
│   │   │       ├── CommandCenterView.tsx   # Active plant KPIs & shipment container table
│   │   │       ├── MtcWorkbenchView.tsx    # Split-screen 3.1 MTC viewer with bounding boxes
│   │   │       ├── HeatInventoryView.tsx   # Mass-balance ledger (anti-phantom allocation)
│   │   │       ├── SignOffQueueView.tsx    # Clause 6 QA digital signature & stamp queue
│   │   │       └── CbamDossierView.tsx     # Precursor energy math & dossier exports
│   │   └── brand/Logo.tsx             # Hexagonal molten-amber-to-emerald ingot logo
│   └── services/api.ts                # Direct typed frontend-to-FastAPI integration layer
├── backend/                           # Phase 3: Python FastAPI + PyMuPDF + Gemini Vision
│   ├── main.py                        # FastAPI endpoints for OCR, validation, and exports
│   ├── compliance_engine.py           # Zero-hallucination deterministic CEV & CBAM math
│   ├── mtc_ocr_service.py             # PyMuPDF coordinate extraction & Gemini Vision OCR
│   ├── dossier_generator.py           # Tamper-evident PDF annex compiler & EU CBAM XML generator
│   ├── generate_sample_mtcs.py        # Generates realistic SAIL, Tata, and JSW sample MTC PDFs
│   ├── test_e2e_pipeline.py           # Automated end-to-end integration test runner
│   ├── schema.sql                     # Supabase PostgreSQL schema with RLS & mass balance checks
│   └── requirements.txt               # Backend Python dependencies
├── sample_data/                       # Generated authentic 3.1 Mill Test Certificates
│   ├── SAIL_Bokaro_Heat_BOK-26-4910.pdf
│   ├── Tata_Steel_Heat_TSJ-26-9021.pdf
│   └── JSW_Alloy_Heat_JSW-26-7734.pdf
├── vercel.json                        # Vercel single-click deployment configuration
├── Dockerfile                         # Production containerization for backend
└── docker-compose.yml                 # Full-stack local orchestration
```

---

## 3. Quickstart Guide

### A. Frontend Web Application

```powershell
# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Open `http://localhost:5173`. Use the top navbar button to toggle between the **Marketing Presentation** and the **Factory QA Dashboard**.

### B. Backend Services & Deterministic Engines

```powershell
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\activate   # Windows PowerShell

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```
Interactive Swagger API documentation is available at `http://localhost:8000/docs`.

---

## 4. End-to-End Pipeline Verification

To run the automated 4-stage pipeline test across Sample MTC $\rightarrow$ Metallurgy $\rightarrow$ CBAM Calculation $\rightarrow$ Stamped Dossier & XML:

```powershell
cd backend
python test_e2e_pipeline.py
```

### Verified Engine Formulas
1. **IIW Carbon Equivalent Value (CEV)**:
   $$\text{CEV} = \text{C} + \frac{\text{Mn}}{6} + \frac{\text{Cr} + \text{Mo} + \text{V}}{5} + \frac{\text{Ni} + \text{Cu}}{15}$$
2. **Recursive Specific Embedded Emissions (SEE)**:
   $$\text{Total SEE} = (\text{Precursor SEE} \times \text{Mass Consumption Ratio}) + \text{Direct Fuel SEE} + \text{Indirect Electricity SEE}$$
3. **Punitive Penalty Savings**:
   Calculated against EU default values + progressive markup (10% in 2026, 20% in 2027, 30% in 2028) at the current EU ETS carbon price (€85/tCO2e).

---

## 5. Exporter Validation Checklist (Howrah / Liluah / Kolkata)

1. **Explicit Melt & Pour Attestation**: Does the upstream certificate explicitly print `"Country of Melt & Pour: INDIA"` required before October 1, 2027 under EU Reg 2026/1963?
2. **Zero-Forgery Clause 6 Rule**: Are you re-typing spectrometer numbers into Excel? European customs declarants reject unlinked stockist sheets without original mill annexes.
3. **Anti-Phantom Heat Ledger**: Does your mass-balance ensure 80 tonnes of exports cannot be allocated to a 50-tonne SAIL heat batch during an audit?
4. **CBAM Penalty Defense**: Are European buyers deducting €3,000–€5,000 per container in default markup? HeatLedger AI proves actual emissions at ~1.79 tCO2e/t.
5. **₹4,999 First Container Express Pass (100% credited back on Plant OS upgrade)**: Deliver a complete container-ready dossier (signed cover sheet, locked original mill PDF annex, customs statement, and EU CBAM XML) within 24 hours.

---

## 6. Deployment

* **Frontend**: Push repository to GitHub and import into [Vercel](https://vercel.com) (pre-configured with [vercel.json](file:///c:/Users/Pc/OneDrive/Desktop/CBAM/vercel.json)).
* **Backend**: Build and run via Docker:
  ```powershell
  docker compose up --build
  ```
