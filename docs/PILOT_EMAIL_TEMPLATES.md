# HeatLedger AI — Exporter Pilot Onboarding Email Sequence (Prompt L3)
*Version: 2026.11 · Brand: HeatLedger AI · Target: Indian Steel Exporters & Casting Foundries*

> **Purpose**: A proven 4-stage email sequence guiding an exporter from initial cold contact/lead capture to running a Free 1-Shipment Audit, reviewing findings, and converting to a paid monthly plant subscription with the ₹25,000 fee credited.

---

## Stage 1: Day 0 — Welcome & Free 1-Shipment Audit Intake

- **Trigger**: Immediately upon lead capture, WhatsApp contact, or `/check` upload.
- **Goal**: Collect past shipment documents without friction.
- **Subject**: Welcome to HeatLedger AI — Instructions for your Free 1-Shipment Audit
- **Channel**: Email or WhatsApp

```text
Dear {{contact_person}},

Thank you for connecting with HeatLedger AI. Under EU Regulation 2026/1963 (enacted 1 Oct 2026), all Indian steel and casting exports to Europe require verified Country of Melt and Pour documentation backed by mill test certificates.

To perform your plant's Free 1-Shipment Compliance Audit, please email us or send via WhatsApp (+91 98300 00000):
1. Mill Test Certificates (MTCs) for one recent export container (PDFs or clear phone photos).
2. Corresponding commercial invoice or packing list showing heat numbers and weights.

Our automated engine will inspect chemistry bounds, origin evidence, and calculate your CBAM default cost difference. You will receive your 1-page findings report within 24 hours.

Warm regards,
Compliance Operations Team, HeatLedger AI
Howrah & Kolkata, India · https://heatledger.ai
```

---

## Stage 2: Day 2 — Documents Received & MTC Extraction Pre-Check

- **Trigger**: Past shipment documents received and processed via Vector OCR.
- **Goal**: Share immediate proof of value and schedule a 15-minute review walkthrough.
- **Subject**: Documents Received — Initial MTC Extraction & Chemistry Pre-Check for {{plant_name}}
- **Channel**: Email with PDF attachment + WhatsApp link

```text
Dear {{contact_person}},

We have successfully processed the documents for Invoice {{invoice_number}}.

Initial Extraction Summary:
- Certificates Processed: {{mtc_count}} MTCs
- Total Declared Tonnage: {{total_weight_mt}} MT
- Country of Melt & Pour Status: {{melt_pour_status}}

Your complete 1-page findings report and interactive verification link are ready:
{{audit_share_link}}

Let's schedule a 15-minute call this week to review the findings and show you how to lock certificates with Ed25519 digital seals before your next consignment leaves Kolkata / Haldia port.

Best regards,
HeatLedger AI Support Team
```

---

## Stage 3: Day 7 — Findings Review & Release Gate Protection Summary

- **Trigger**: Following the 1-on-1 findings review call or milestone completion.
- **Goal**: Quantify financial savings, hours saved, and customs detention risks averted.
- **Subject**: Shipment Protection Summary — How {{plant_name}} saved {{hours_saved}} hours
- **Channel**: Email

```text
Dear {{contact_person}},

Following our review call, here is the executive summary for {{plant_name}}:

Key Risks Prevented:
- {{findings_summary}}
- Avoided potential EU default carbon levy markup estimated at {{penalty_exposure_inr}} INR.
- Engineering inspection time saved: {{hours_saved}} hours of manual Excel matching.

Your 30-day pilot allocation includes up to 50 certificates and full access to the Ed25519 digital signature release queue. Let us know when your next container is scheduled for stuffing.

Best regards,
HeatLedger AI Operations
```

---

## Stage 4: Day 14 — Pilot Conversion & ₹25,000 Credit Offer

- **Trigger**: 14 days after pilot activation or after the 3rd dossier is released.
- **Goal**: Convert to paid regular monthly plan (Plant Standard ₹9,999/mo or Plant Pro ₹19,999/mo).
- **Subject**: Pilot Completion & Conversion Offer — ₹25,000 Credit for {{plant_name}}
- **Channel**: Email + Founder Call

```text
Dear {{contact_person}},

Over the past 14 days, {{plant_name}} processed {{shipments_processed}} export consignments through HeatLedger AI with zero documentation rejections.

As agreed in your pilot terms, your entire ₹25,000 pilot fee is 100% credited against your first 3 months of Plant Standard (₹9,999/mo) or Plant Pro (₹19,999/mo).

Would you like to activate your annual plant subscription starting next Monday?

Click here to confirm: {{upgrade_link}}

Best regards,
Leadership & Founder Team, HeatLedger AI
```
