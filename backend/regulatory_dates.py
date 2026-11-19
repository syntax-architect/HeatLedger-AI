"""
HEATLEDGER AI: Canonical Regulatory Dates & Legal Milestones
Module: regulatory_dates.py
Specification: Sourced dates from EU & UK official texts with citation metadata.
"""

from typing import Any, Dict, List

STANDARD_DISCLAIMER = (
    "HeatLedger supports compliance preparation. It is not legal advice and not an accredited verification body."
)

REGULATORY_MILESTONES: List[Dict[str, Any]] = [
    {
        "id": "EU_CBAM_DEFINITIVE_START",
        "jurisdiction": "EU",
        "title": "EU CBAM Definitive Regime In Force",
        "effective_date": "2026-01-01",
        "summary": "Transitional period ends; actual verified emissions and default markup rules enter force.",
        "legal_source": "Regulation (EU) 2023/956, Article 36",
        "source_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956",
        "last_verified": "2026-11-19",
        "status": "IN_FORCE"
    },
    {
        "id": "EU_MELT_POUR_EVIDENCE_APPLIES",
        "jurisdiction": "EU",
        "title": "EU Melt-and-Pour Mandatory Origin Attestation Rules Apply",
        "effective_date": "2026-10-01",
        "summary": "Importers must provide evidence of country of melt and pour on customs declarations for steel goods.",
        "legal_source": "Commission Implementing Regulation (EU) 2026/1963",
        "source_url": "https://taxation-customs.ec.europa.eu/customs-4/rules-origin_en",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    },
    {
        "id": "EU_NON_MTC_CUTOFF",
        "jurisdiction": "EU",
        "title": "Cutoff for Non-MTC Documents Under Melt-and-Pour Rules",
        "effective_date": "2027-10-01",
        "summary": "Other trade documents stop being accepted on their own as sole proof of melt and pour without mill test certificates.",
        "legal_source": "Commission Guidance on Origin Documentation for Steel Imports",
        "source_url": "https://taxation-customs.ec.europa.eu/customs-4/rules-origin_en",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    },
    {
        "id": "EU_CBAM_CERT_SALES",
        "jurisdiction": "EU",
        "title": "Sale of EU CBAM Certificates Begins",
        "effective_date": "2027-02-01",
        "summary": "European Commission commences sale of CBAM certificates to authorized declarants via common central platform.",
        "legal_source": "Regulation (EU) 2023/956, Article 20",
        "source_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    },
    {
        "id": "EU_CBAM_FIRST_ANNUAL_DECLARATION",
        "jurisdiction": "EU",
        "title": "First Annual CBAM Declaration Due",
        "effective_date": "2027-09-30",
        "summary": "First annual declaration and surrender of certificates for goods imported during calendar year 2026.",
        "legal_source": "Regulation (EU) 2023/956, Article 6",
        "source_url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    },
    {
        "id": "UK_CBAM_START",
        "jurisdiction": "UK",
        "title": "UK CBAM Enactment",
        "effective_date": "2027-01-01",
        "summary": "United Kingdom Carbon Border Adjustment Mechanism enters into force for imported iron, steel, and aluminum.",
        "legal_source": "UK HM Treasury Consultation Outcome (March 2024)",
        "source_url": "https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism-cbam",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    },
    {
        "id": "UK_MELT_POUR_MANDATORY",
        "jurisdiction": "UK",
        "title": "UK Mandatory Melt and Pour Country Reporting",
        "effective_date": "2027-07-01",
        "summary": "Voluntary reporting from 1 April 2027; becomes mandatory under UK Customs Declaration Service (CDS) from 1 July 2027.",
        "legal_source": "UK Department for Business & Trade Notice",
        "source_url": "https://www.gov.uk/guidance/importing-steel-sanctions-and-origin",
        "last_verified": "2026-11-19",
        "status": "UPCOMING"
    }
]
