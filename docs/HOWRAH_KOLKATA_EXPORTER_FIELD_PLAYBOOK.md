# HeatLedger AI — Howrah & Kolkata Exporter Field Playbook
## 48-Hour Execution Guide & ₹4,999 Pilot Acquisition Strategy

---

### Target Audience
1. **Steel Pipes & Tubes Manufacturers** (`CN 7304` / `CN 7306`): Howrah, Dankuni, Hooghly
2. **Forged Flanges & Fittings Manufacturers** (`CN 7307`): Liluah, Belur Industrial Estate
3. **High-Tensile Fasteners & Stud Bolts** (`CN 7318`): Dankuni, Kolkata Port Area
4. **Alloy Bar Processors & Machinists** (`CN 7228` / `CN 7326`): Jamshedpur & Howrah clusters

---

### The 5 Field Validation Questions to Ask Export Directors

#### Question 1: Melt-and-Pour Legal Origin
> *"Do your current upstream primary mill 3.1 certificates explicitly state 'Country of Melt and Pour: INDIA', or are you vulnerable to customs detention under EU CBAM rules (Regulation (EU) 2023/956, Annex IV)?"*
- **Problem**: European customs at Rotterdam, Hamburg, and Antwerp flag generic certificates lacking explicit upstream melt origin proof.
- **HeatLedger Defense**: Highlights the ISO 3166 Melt & Pour coordinate box or flags an immediate pre-shipment alert.

#### Question 2: The EN 10204 Clause 6 Byte-Identical Standard
> *"When you export transformed flanges or heat-treated fasteners, do you re-type the spectrometer chemistry into an Excel sheet, or do you legally append the unaltered, byte-identical mill certificate as Annex A?"*
- **Problem**: Re-typing chemistry on stockist letterhead is classified as documentation non-conformance under EN 10204 Clause 6.
- **HeatLedger Defense**: Auto-populates the factory's own 3.1 certificate and preserves the untouched original upstream PDF as a byte-identical Annex A with SHA-256 verification.

#### Question 3: Mass-Balance Ledger & Phantom Heat Allocation
> *"If an EU CBAM or authorized auditor arrives, could they discover that your plant shipped 80 tonnes against a 50-tonne upstream melt heat batch?"*
- **Problem**: Spreadsheets easily suffer from "phantom heat reuse", triggering retroactive allocation rejections.
- **HeatLedger Defense**: Database constraints and ledger service prevent over-allocation in real time.

#### Question 4: Deductions for CBAM Default Markups
> *"Are your European buyers asking for commercial deductions based on statutory CBAM default markups?"*
- **Problem**: Statutory default values carry progressive markups (10% in 2026, 20% in 2027, 30% from 2028 under Implementing Regulation (EU) 2025/2621).
- **HeatLedger Defense**: Prepares actual emissions documentation from certified mill inputs and electricity bills to establish planning estimates of cost differences against default values.

#### Question 5: The ₹4,999 First Container Express Pass
> *"If we run your next shipment invoice and upstream MTC through HeatLedger AI and deliver a container-ready CBAM data sheet (draft) + Clause 6 Merged PDF dossier in 24 hours for ₹4,999 First Container Express Pass (100% credited back on Plant OS upgrade), would you test it?"*
- **Closing**: Deliver the deliverables (Signed Merged 3.1 PDF, Melt-and-Pour Declaration, CBAM data sheet draft) within 24 hours.

---

> **Disclaimer**: HeatLedger supports compliance preparation. It is not legal advice and not an accredited verification body. All monetary calculations are estimates for planning purposes.

---

### Running the Live Stack
- **Public Marketing Website & Live Simulator**: `http://localhost:3000/`
- **Factory QA & CBAM Web App Terminal**: `http://localhost:3000/` (click "Factory QA App" in top bar)
- **FastAPI Backend & Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **Test Sample Mill Certificates**: Located in `backend/samples/`
