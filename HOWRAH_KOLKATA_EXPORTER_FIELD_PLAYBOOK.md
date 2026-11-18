# HeatLedger AI — Howrah & Kolkata Exporter Field Playbook
## 48-Hour Execution Guide & ₹25,000 Pilot Acquisition Strategy

---

### Target Audience
1. **Steel Pipes & Tubes Manufacturers** (`CN 7304` / `CN 7306`): Howrah, Dankuni, Hooghly
2. **Forged Flanges & Fittings Manufacturers** (`CN 7307`): Liluah, Belur Industrial Estate
3. **High-Tensile Fasteners & Stud Bolts** (`CN 7318`): Dankuni, Kolkata Port Area
4. **Alloy Bar Processors & Machinists** (`CN 7228` / `CN 7326`): Jamshedpur & Howrah clusters

---

### The 5 Field Validation Questions to Ask Export Directors

#### Question 1: Melt-and-Pour Legal Origin
> *"Do your current upstream SAIL, Tata Steel, or JSW 3.1 certificates explicitly state 'Country of Melt and Pour: INDIA', or are you vulnerable to port detention under EU Regulation 2026/1963?"*
- **Problem**: European customs at Rotterdam, Hamburg, and Antwerp are rejecting generic certificates without explicit upstream melt origin proof.
- **HeatLedger Defense**: Highlights the ISO 3166 Melt & Pour coordinate box or flags an immediate pre-shipment alert.

#### Question 2: The Zero-Forgery EN 10204 Clause 6 Standard
> *"When you export transformed flanges or heat-treated fasteners, do you re-type the spectrometer chemistry into an Excel sheet, or do you legally append the unaltered mill certificate as Annex A?"*
- **Problem**: Re-typing chemistry on stockist letterhead is classified as documentation non-conformance by TÜV and European customs.
- **HeatLedger Defense**: Auto-populates the factory's own 3.1 certificate and locks the untouched original upstream PDF as a cryptographic Annex A.

#### Question 3: Mass-Balance Ledger & Phantom Heat Allocation
> *"If an EU CBAM or TÜV auditor arrives, could they discover that your plant shipped 80 tonnes against a 50-tonne upstream SAIL heat batch?"*
- **Problem**: Excel spreadsheets easily suffer from "phantom heat reuse", triggering retroactive carbon tax penalties.
- **HeatLedger Defense**: PostgreSQL check constraint prevents over-allocation in real time.

#### Question 4: Deductions for CBAM Default Penalties
> *"Are your German or Dutch buyers asking for €3,000 to €5,000 per container in CBAM default penalty deductions?"*
- **Problem**: Default EU baseline steel emissions are ~2.98 tCO2e/t + 10% penalty markup.
- **HeatLedger Defense**: Proves verified actual emissions at ~1.79 tCO2e/t, saving the buyer €4,500+ per container.

#### Question 5: The ₹25,000 Pilot Audit
> *"If we run your next shipment invoice and upstream MTC through HeatLedger AI and deliver a container-ready EU CBAM XML + Clause 6 Merged PDF dossier in 24 hours for ₹25,000, would you test it?"*
- **Closing**: Deliver the 3 deliverables (Signed Merged 3.1 PDF, Melt-and-Pour Declaration, EU CBAM XML) within 24 hours.

---

### Running the Live Stack
- **Public Marketing Website & Live Simulator**: `http://localhost:3000/`
- **Factory QA & CBAM Web App Terminal**: `http://localhost:3000/` (click "Factory QA App" in top bar)
- **FastAPI Backend & Interactive API Docs**: `http://127.0.0.1:8000/docs`
- **Test Sample Mill Certificates**: Located in `public/samples/` and `backend/samples/`
