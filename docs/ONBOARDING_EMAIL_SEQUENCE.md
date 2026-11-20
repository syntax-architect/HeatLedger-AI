# HeatLedger AI · Pilot Onboarding Email Sequence (4-Part)
**Target:** Factory Owners, Managing Directors, and QA Leads of Indian Steel & Engineering Exporters  
**Tone:** Respectful, grounded, operationally specific, zero hype, strictly compliant with CLAIMS_REGISTER.md.  

---

## Email 1: Day 0 — Welcome & Upload Your First Past Shipment MTC
* **Subject:** Welcome to HeatLedger · Let's run your free 1-shipment compliance audit
* **Preview Text:** Upload one past European shipment to test EN 10204 Clause 6 and melt-and-pour proof.

Dear {{first_name}},

Thank you for partnering with HeatLedger AI for your 30-day compliance pilot.

As an exporter of steel and engineering components from {{plant_region}} to European and UK buyers, you already know the customs scrutiny ahead:
1. **Mandatory Country of Melt and Pour proof** taking full effect under EU Regulation 2026/1963.
2. **Byte-identical original mill certificate annexing** under EN 10204:2004 Clause 6.
3. **Statutory default markups** (+10% in 2026, escalating to +30% in 2028) on unverified EU CBAM imports.

**Your First Action Today (takes ~3 minutes):**
Upload one past shipment document packet (Mill Test Certificate + Commercial Invoice) into your secure tenant portal:
👉 **[Access Your Plant Command Center]({{dashboard_url}})**

Our two-tier extraction engine will parse your chemistry, verify Carbon Equivalent Value (CEV), check mass-balance allocation, and flag any missing melt-and-pour proofs before customs brokers see them.

If you have physical papers on the shop floor, you can also snap a photo directly using our mobile PWA on your phone.

Warm regards,  
**{{founder_name}}**  
Founder, HeatLedger AI  
Kolkata, West Bengal  

---

## Email 2: Day 2 — Reviewing Your First Clause 6 Tamper Seal & Release Gate
* **Subject:** Your shipment readiness score is ready for review
* **Preview Text:** See how the release gate caught missing proofs before dispatch.

Dear {{first_name}},

Your first shipment documents have been processed in the HeatLedger workbench.

Here is what our rules engine verified on Heat **{{heat_number}}**:
* **EN 10204 3.1 Authenticity:** Verified against upstream mill records.
* **Country of Melt and Pour:** Declared as **{{melt_country}}** (ISO 3166-1).
* **Mass Balance Invariant:** {{allocated_mt}} MT allocated; {{remaining_mt}} MT remaining in your active heat pool (zero phantom allocation).

When your QA Inspector is ready to sign off, they will be prompted for their step-up inspector PIN. The platform then generates an immutable, byte-identical ZIP archive containing your signed cover certificate and untouched upstream original PDFs, sealed with a SHA-256 cryptographic digest.

👉 **[Review Your Shipment Release Gate]({{shipment_url}})**

Feel free to reply directly to this email with any questions.

Best regards,  
**{{founder_name}}**  

---

## Email 3: Day 7 — CBAM Precursor Math vs Default Markup Executive Memorandum
* **Subject:** Executive Report: Estimated ₹{{savings_inr}} difference versus EU default markups
* **Preview Text:** Your 7-day CBAM embedded emissions calculation trace.

Dear {{first_name}},

Under European Implementing Regulation (EU) 2025/2621, importers face standard statutory default values with an escalating markup schedule (+10% in 2026, +20% in 2027, +30% in 2028) if their supplier cannot provide verified primary data.

Based on the actual energy consumption and precursor route of your plant this past week:
* **Your Primary Specific Embedded Emissions (SEE):** {{primary_see}} tCO2e / tonne
* **EU Statutory Default Benchmark:** {{default_see}} tCO2e / tonne
* **Estimated Certificate Liability Difference:** **€{{savings_eur}} (~₹{{savings_inr}})** per export container.

We have compiled this into a one-page A4 Executive Memorandum for your European buyer and verifier:
👉 **[Download Your Verified CBAM Memorandum]({{memorandum_url}})**

Notice: *HeatLedger provides estimates for compliance preparation and planning. It is not legal advice and not an accredited verification body.*

Warm regards,  
**{{founder_name}}**  

---

## Email 4: Day 14 — Transitioning from Pilot to Annual Plant License
* **Subject:** Continuing your customs compliance readiness with HeatLedger
* **Preview Text:** Lock in your annual plant tier and dedicated onboarding support.

Dear {{first_name}},

Over the past two weeks, {{company_name}} has:
* Processed and sealed **{{dossiers_sealed_count}}** export dossiers.
* Established an anti-phantom mass balance ledger across **{{heats_tracked_count}}** heat batches.
* Generated verifiable buyer share links accessed by your European clients in Rotterdam and Hamburg.

As your 30-day pilot reaches its midpoint, we would love to discuss transitioning your plant to our **Annual Exporter License** or connecting your factory with your authorized customs advisory consultant.

Our annual plant subscription includes:
* Unlimited EN 10204 Clause 6 tamper-evident dossiers.
* Real-time EU CBAM & UK CBAM calculation traces.
* Mobile shop-floor camera capture and offline queue.
* Dedicated WhatsApp and phone support for your QA team.

👉 **[Schedule a 15-Minute Founder Review Call]({{booking_url}})**

Thank you for trusting HeatLedger with your export compliance operations.

Sincerely,  
**{{founder_name}}**  
Founder & CEO, HeatLedger AI  
+91 98300 XXXXX · Kolkata  
