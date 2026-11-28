"""
HEATLEDGER AI: Partner Channel Sales Kit Generator
Extracted from partner_service.py for Prompt Pack v5 Task 6.1.
"""

from typing import Any, Dict

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection


def generate_partner_kit(
    partner_cls: Any,
    partner_id: str,
    legal_disclaimer: str,
    base_url: str = "https://app.heatledger.ai",
) -> Dict[str, Any]:
    """Generates Partner Kit (WhatsApp copy, 5-slide outline, 1-page summary, referral link)."""
    partner_cls.init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM partners WHERE id = ?", (partner_id,))
        p = cursor.fetchone()
        if not p:
            raise ValueError("Partner not found")

    ref_code = p["referral_code"]
    check_link = f"{base_url}/check?ref={ref_code}"

    whatsapp_copy = (
        f"Dear Exporter,\n"
        f"As EU customs regulations tighten for EN 10204 3.1 & Melt-and-Pour compliance, "
        f"ensure your steel shipments never face port detention.\n"
        f"Run a free, instant compliance check on your MTC here: {check_link}\n"
        f"Recommended by {p['firm_name']} ({p['name']}).\n"
        f"{legal_disclaimer}"
    )

    slide_deck_outline = [
        {
            "slide": 1,
            "title": "EU Steel Compliance Crisis: 2026 Mandates",
            "bullets": [
                "EN 10204 Clause 6 byte-identical preservation is mandatory.",
                "Country of Melt and Pour explicit evidence required by EU Customs.",
                "Penalties: ₹15L+ port demurrage and container rejection.",
            ],
        },
        {
            "slide": 2,
            "title": "Why Exporters Need HeatLedger AI",
            "bullets": [
                "Zero-manual data entry: automated OCR with Gemini compliance engines.",
                "Pre-shipment verification gate prevents uncertified dispatch.",
                "Instant EU Melt-and-Pour pack with QR verification.",
            ],
        },
        {
            "slide": 3,
            "title": "Seamless Plant Operations in 3 Minutes",
            "bullets": [
                "Drag-and-drop or email forwarded MTC directly into inbox.",
                "Instant buyer-spec checking (ASTM, EN, DIN tolerances).",
                "Supplier 'Chase the Mill' automated reminders.",
            ],
        },
        {
            "slide": 4,
            "title": "Partner Program: 20% Revenue Share",
            "bullets": [
                "20% recurring monthly commission on first 12 months' subscription fees.",
                "Tracked strictly from paid invoices, transparent ledger.",
                "Dedicated client oversight portal with read-only permission.",
            ],
        },
        {
            "slide": 5,
            "title": "Get Started: Instant Free MTC Check",
            "bullets": [
                f"Share your custom link: {check_link}",
                "Plant tests 1 MTC free, results visible immediately.",
                "Assisted onboarding and audit pilot support.",
            ],
        },
    ]

    one_page_summary = f"""================================================================================
HEATLEDGER AI - PARTNER PROGRAM KIT
Authorized Partner: {p['firm_name']} | Contact: {p['name']} ({p['email']})
Partner Referral Code: {ref_code} | Link: {check_link}
================================================================================

1. PROGRAM VALUE PROPOSITION
HeatLedger AI provides statutory steel export compliance, automated EN 10204 3.1
verification, and EU Melt-and-Pour dossier generation for Indian steel exporters.

2. COMMERCIAL TERMS FOR PARTNERS (CAs, CONSULTANTS, CHAs)
- 20% Commission on first 12 months of client software fees.
- Commission is tracked strictly against verified, paid invoices (never forecasts).
- Single dashboard to monitor all referred plant onboarding and conversion status.
- Optional read-only plant access explicitly granted by your clients.

3. HOW TO INVITE PLANTS
Send your client the Free MTC Check tool link:
{check_link}
The plant uploads one test certificate and receives an instant compliance grade.
When they upgrade to a subscription, your 20% commission accrues automatically.

================================================================================
{legal_disclaimer}
================================================================================
"""

    return {
        "partner_id": partner_id,
        "referral_code": ref_code,
        "free_check_link": check_link,
        "whatsapp_message": whatsapp_copy,
        "slide_deck": slide_deck_outline,
        "one_page_summary_text": one_page_summary,
        "commission_terms": "20% of first 12 months fees from paid invoices",
        "disclaimer": legal_disclaimer,
    }
