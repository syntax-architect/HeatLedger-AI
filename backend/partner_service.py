"""
HEATLEDGER AI: Partner Channel Engine (Prompt D3)
Enables Chartered Accountants, export consultants, freight forwarders, and CHAs to:
1. Sign up with a unique referral code and view a partner dashboard.
2. Track referred plant leads, conversion status, and accrued commissions.
3. Automatically accrue 20% commission on the first 12 months' paid fees (from plans.json).
   Strict enforcement: commissions are generated ONLY from paid invoices, never forecasts.
4. Manage client plants: plants explicitly grant/revoke read-only access per organization.
   Partners never see non-granted plants.
5. Generate a Partner Kit: 1-page PDF summary, 5-slide presentation outline, WhatsApp copy,
   and referral link to the free MTC check tool.
6. Statutory disclaimer: "Prepares documents for review. Not legal advice."
"""

import os
import json
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

logger = logging.getLogger("heatledger.partners")

# Default commission settings if plans.json is unavailable
DEFAULT_COMMISSION_PERCENT = 20.0
DEFAULT_ELIGIBILITY_MONTHS = 12
LEGAL_DISCLAIMER = "Prepares documents for review. Not legal advice."


def load_partner_config() -> Dict[str, Any]:
    """Reads partner program parameters from plans.json."""
    plans_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "plans.json")
    if os.path.exists(plans_path):
        try:
            with open(plans_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("partner_program", {
                    "commission_percent": DEFAULT_COMMISSION_PERCENT,
                    "eligibility_duration_months": DEFAULT_ELIGIBILITY_MONTHS
                })
        except Exception as e:
            logger.warning(f"Failed to load plans.json partner config: {e}")
    return {
        "commission_percent": DEFAULT_COMMISSION_PERCENT,
        "eligibility_duration_months": DEFAULT_ELIGIBILITY_MONTHS
    }


class PartnerService:
    """Core service for partner program, referral tracking, commissions, and kit generation."""

    @classmethod
    def init_db(cls):
        """Initializes tables for partners, referrals, commissions, and plant access."""
        with get_db_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS partners (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    partner_type TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    firm_name TEXT NOT NULL,
                    city TEXT,
                    referral_code TEXT UNIQUE NOT NULL,
                    gstin TEXT,
                    payout_info TEXT,
                    created_at TEXT NOT NULL
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS partner_referrals (
                    id TEXT PRIMARY KEY,
                    partner_id TEXT NOT NULL,
                    organization_id TEXT,
                    company_name TEXT NOT NULL,
                    contact_email TEXT NOT NULL,
                    contact_phone TEXT,
                    status TEXT NOT NULL DEFAULT 'LEAD',
                    referred_at TEXT NOT NULL,
                    first_paid_at TEXT,
                    commission_eligible_until TEXT,
                    FOREIGN KEY(partner_id) REFERENCES partners(id)
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS partner_commissions (
                    id TEXT PRIMARY KEY,
                    partner_id TEXT NOT NULL,
                    referral_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    invoice_id TEXT NOT NULL,
                    invoice_amount_inr REAL NOT NULL,
                    commission_percent REAL NOT NULL,
                    commission_amount_inr REAL NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACCRUED',
                    created_at TEXT NOT NULL,
                    paid_at TEXT,
                    FOREIGN KEY(partner_id) REFERENCES partners(id)
                );
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS partner_org_access (
                    id TEXT PRIMARY KEY,
                    partner_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    granted_at TEXT NOT NULL,
                    revoked_at TEXT,
                    UNIQUE(partner_id, organization_id)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_partner_refcode ON partners(referral_code);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pref_org ON partner_referrals(organization_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pcomm_partner ON partner_commissions(partner_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pacc_partner_org ON partner_org_access(partner_id, organization_id);")
            conn.commit()

    @classmethod
    def register_partner(
        cls,
        name: str,
        partner_type: str,
        email: str,
        firm_name: str,
        phone: Optional[str] = None,
        city: Optional[str] = None,
        gstin: Optional[str] = None,
        payout_info: Optional[str] = None,
        custom_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Registers a new CA/consultant/freight forwarder and allocates a unique referral code."""
        cls.init_db()
        email_clean = email.strip().lower()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Generate unique referral code
        type_prefix = partner_type[:3].upper() if partner_type else "REF"
        suffix = secrets.token_hex(2).upper()
        generated_code = custom_code.upper().strip() if custom_code else f"HL-{type_prefix}-{suffix}"

        partner_id = f"partner_{secrets.token_hex(8)}"

        with get_db_connection() as conn:
            # Check if email already registered
            cursor = conn.cursor()
            cursor.execute("SELECT id, referral_code FROM partners WHERE email = %s", (email_clean,))
            existing = cursor.fetchone()
            if existing:
                return {
                    "id": existing["id"],
                    "email": email_clean,
                    "referral_code": existing["referral_code"],
                    "message": "Partner already registered."
                }

            # Insert new partner
            conn.execute("""
                INSERT INTO partners (
                    id, name, partner_type, email, phone, firm_name, city,
                    referral_code, gstin, payout_info, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                partner_id, name.strip(), partner_type.strip(), email_clean,
                phone, firm_name.strip(), city, generated_code, gstin, payout_info, now_iso
            ))
            conn.commit()

        logger.info(f"Registered partner {partner_id} ({email_clean}) with code {generated_code}")
        return {
            "id": partner_id,
            "name": name,
            "partner_type": partner_type,
            "email": email_clean,
            "firm_name": firm_name,
            "referral_code": generated_code,
            "created_at": now_iso,
            "disclaimer": LEGAL_DISCLAIMER
        }

    @classmethod
    def get_partner_by_code(cls, referral_code: str) -> Optional[Dict[str, Any]]:
        """Resolves partner details from a referral code."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, name, partner_type, firm_name, referral_code, created_at
                FROM partners
                WHERE UPPER(referral_code) = %s
            """, (referral_code.strip().upper(),))
            row = cursor.fetchone()
            return dict(row) if row else None

    @classmethod
    def create_referral_lead(
        cls,
        referral_code: str,
        company_name: str,
        contact_email: str,
        contact_phone: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a lead linked to the partner's referral code."""
        cls.init_db()
        partner = cls.get_partner_by_code(referral_code)
        if not partner:
            raise ValueError(f"Invalid partner referral code: {referral_code}")

        referral_id = f"ref_{secrets.token_hex(8)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO partner_referrals (
                    id, partner_id, organization_id, company_name, contact_email,
                    contact_phone, status, referred_at
                ) VALUES (%s, %s, %s, %s, %s, %s, 'LEAD', %s)
            """, (
                referral_id, partner["id"], organization_id, company_name.strip(),
                contact_email.strip().lower(), contact_phone, now_iso
            ))
            conn.commit()

        return {
            "referral_id": referral_id,
            "partner_id": partner["id"],
            "company_name": company_name,
            "contact_email": contact_email,
            "status": "LEAD",
            "referred_at": now_iso
        }

    @classmethod
    def link_organization_to_referral(cls, referral_code: str, organization_id: str) -> Optional[str]:
        """Links an onboarded organization to an existing partner referral or creates one."""
        cls.init_db()
        partner = cls.get_partner_by_code(referral_code)
        if not partner:
            return None

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id FROM partner_referrals
                WHERE partner_id = %s AND organization_id = %s
            """, (partner["id"], organization_id))
            row = cursor.fetchone()

            if row:
                return row["id"]

            ref_id = f"ref_{secrets.token_hex(8)}"
            now_iso = datetime.now(timezone.utc).isoformat()
            conn.execute("""
                INSERT INTO partner_referrals (
                    id, partner_id, organization_id, company_name, contact_email,
                    status, referred_at
                ) VALUES (%s, %s, %s, %s, %s, 'TRIAL', %s)
            """, (
                ref_id, partner["id"], organization_id, f"Plant Org {organization_id}",
                f"owner@{organization_id}.example.com", now_iso
            ))
            conn.commit()
            return ref_id

    @classmethod
    def record_paid_invoice(
        cls,
        organization_id: str,
        invoice_id: str,
        amount_inr: float,
        payment_date: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates and accrues 20% commission on paid invoices.
        Strict compliance:
        - Accrued ONLY from paid invoices (never forecasts or estimates).
        - Limited to the first 12 months from first paid date.
        """
        cls.init_db()
        if amount_inr <= 0:
            return None

        now = payment_date or datetime.now(timezone.utc)
        now_iso = now.isoformat()

        config = load_partner_config()
        comm_pct = float(config.get("commission_percent", DEFAULT_COMMISSION_PERCENT))
        int(config.get("eligibility_duration_months", DEFAULT_ELIGIBILITY_MONTHS))

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, partner_id, status, first_paid_at, commission_eligible_until
                FROM partner_referrals
                WHERE organization_id = %s
            """, (organization_id,))
            referral = cursor.fetchone()

            if not referral:
                # No partner referral for this organization
                return None

            ref_id = referral["id"]
            partner_id = referral["partner_id"]
            first_paid = referral["first_paid_at"]
            eligible_until = referral["commission_eligible_until"]

            # Set first_paid_at and 12-month window if first payment
            if not first_paid:
                first_paid = now_iso
                # 12 months calculation: approximate 365 days
                eligible_dt = now + timedelta(days=365)
                eligible_until = eligible_dt.isoformat()

                conn.execute("""
                    UPDATE partner_referrals
                    SET status = 'PAID_ACTIVE',
                        first_paid_at = %s,
                        commission_eligible_until = %s
                    WHERE id = %s
                """, (first_paid, eligible_until, ref_id))

            # Verify if payment is within 12 months eligibility window
            eligible_dt = datetime.fromisoformat(eligible_until)
            if now > eligible_dt:
                logger.info(f"Invoice {invoice_id} for org {organization_id} is past 12 months partner eligibility.")
                return None

            # Calculate 20% commission
            commission_amount = round((amount_inr * comm_pct / 100.0), 2)
            commission_id = f"pcomm_{secrets.token_hex(8)}"

            conn.execute("""
                INSERT INTO partner_commissions (
                    id, partner_id, referral_id, organization_id, invoice_id,
                    invoice_amount_inr, commission_percent, commission_amount_inr,
                    status, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'ACCRUED', %s)
            """, (
                commission_id, partner_id, ref_id, organization_id, invoice_id,
                amount_inr, comm_pct, commission_amount, now_iso
            ))
            conn.commit()

        logger.info(f"Accrued ₹{commission_amount} commission for partner {partner_id} on invoice {invoice_id}")
        return {
            "commission_id": commission_id,
            "partner_id": partner_id,
            "organization_id": organization_id,
            "invoice_id": invoice_id,
            "invoice_amount_inr": amount_inr,
            "commission_percent": comm_pct,
            "commission_amount_inr": commission_amount,
            "status": "ACCRUED",
            "created_at": now_iso
        }

    # =========================================================================
    # Plant Read-Only Delegation
    # =========================================================================

    @classmethod
    def grant_plant_access(cls, organization_id: str, partner_id: str) -> Dict[str, Any]:
        """Plant explicitly grants read-only access to a partner."""
        cls.init_db()
        access_id = f"pacc_{secrets.token_hex(8)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            conn.execute("""
                INSERT INTO partner_org_access (id, partner_id, organization_id, status, granted_at)
                VALUES (%s, %s, %s, 'ACTIVE', %s)
                ON CONFLICT(partner_id, organization_id) DO UPDATE SET
                    status = 'ACTIVE',
                    revoked_at = NULL
            """, (access_id, partner_id, organization_id, now_iso))
            conn.commit()

        return {
            "status": "ACTIVE",
            "partner_id": partner_id,
            "organization_id": organization_id,
            "granted_at": now_iso
        }

    @classmethod
    def revoke_plant_access(cls, organization_id: str, partner_id: str) -> Dict[str, Any]:
        """Plant revokes read-only access from a partner immediately."""
        cls.init_db()
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            conn.execute("""
                UPDATE partner_org_access
                SET status = 'REVOKED',
                    revoked_at = %s
                WHERE organization_id = %s AND partner_id = %s
            """, (now_iso, organization_id, partner_id))
            conn.commit()

        return {
            "status": "REVOKED",
            "partner_id": partner_id,
            "organization_id": organization_id,
            "revoked_at": now_iso
        }

    @classmethod
    def list_accessible_plants_for_partner(cls, partner_id: str) -> List[Dict[str, Any]]:
        """Returns only organizations that have currently granted ACTIVE read-only access to this partner."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT organization_id, status, granted_at
                FROM partner_org_access
                WHERE partner_id = %s AND status = 'ACTIVE'
            """, (partner_id,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]

    # =========================================================================
    # Dashboard & Reporting
    # =========================================================================

    @classmethod
    def get_partner_dashboard(cls, partner_id: str) -> Dict[str, Any]:
        """Aggregates partner referral stats, active clients, and commission ledger."""
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM partners WHERE id = %s", (partner_id,))
            partner = cursor.fetchone()
            if not partner:
                raise ValueError("Partner not found.")

            # Referrals
            cursor.execute("""
                SELECT id, organization_id, company_name, contact_email, status, referred_at, first_paid_at
                FROM partner_referrals
                WHERE partner_id = %s
                ORDER BY referred_at DESC
            """, (partner_id,))
            referrals = [dict(r) for r in cursor.fetchall()]

            # Commissions
            cursor.execute("""
                SELECT id, organization_id, invoice_id, invoice_amount_inr,
                       commission_percent, commission_amount_inr, status, created_at, paid_at
                FROM partner_commissions
                WHERE partner_id = %s
                ORDER BY created_at DESC
            """, (partner_id,))
            commissions = [dict(c) for c in cursor.fetchall()]

            # Accessible plants
            cursor.execute("""
                SELECT organization_id, granted_at
                FROM partner_org_access
                WHERE partner_id = %s AND status = 'ACTIVE'
            """, (partner_id,))
            accessible_plants = [dict(a) for a in cursor.fetchall()]

        total_accrued = sum(c["commission_amount_inr"] for c in commissions)
        total_paid = sum(c["commission_amount_inr"] for c in commissions if c["status"] == "PAID")
        leads_count = len([r for r in referrals if r["status"] == "LEAD"])
        paid_active_count = len([r for r in referrals if r["status"] == "PAID_ACTIVE"])

        ref_code = partner["referral_code"]
        free_check_link = f"https://app.heatledger.ai/check?ref={ref_code}"

        return {
            "partner_id": partner_id,
            "name": partner["name"],
            "firm_name": partner["firm_name"],
            "partner_type": partner["partner_type"],
            "referral_code": ref_code,
            "free_check_link": free_check_link,
            "summary": {
                "total_referrals": len(referrals),
                "leads_count": leads_count,
                "paid_active_count": paid_active_count,
                "total_commission_accrued_inr": round(total_accrued, 2),
                "total_commission_paid_inr": round(total_paid, 2),
                "accessible_client_plants_count": len(accessible_plants)
            },
            "referrals": referrals,
            "commissions": commissions,
            "accessible_plants": accessible_plants,
            "disclaimer": LEGAL_DISCLAIMER
        }

    # =========================================================================
    # Partner Kit Generation
    # =========================================================================

    @classmethod
    def generate_partner_kit(cls, partner_id: str, base_url: str = "https://app.heatledger.ai") -> Dict[str, Any]:
        """
        Generates the Partner Kit:
        1. 1-Page PDF Summary
        2. 5-Slide Deck Outline
        3. Ready WhatsApp Copy with personal referral link
        4. Free MTC Check link
        """
        cls.init_db()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM partners WHERE id = %s", (partner_id,))
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
            f"{LEGAL_DISCLAIMER}"
        )

        slide_deck_outline = [
            {
                "slide": 1,
                "title": "EU Steel Compliance Crisis: 2026 Mandates",
                "bullets": [
                    "EN 10204 Clause 6 byte-identical preservation is mandatory.",
                    "Country of Melt and Pour explicit evidence required by EU Customs.",
                    "Penalties: ₹15L+ port demurrage and container rejection."
                ]
            },
            {
                "slide": 2,
                "title": "Why Exporters Need HeatLedger AI",
                "bullets": [
                    "Zero-manual data entry: automated OCR with Gemini compliance engines.",
                    "Pre-shipment verification gate prevents uncertified dispatch.",
                    "Instant EU Melt-and-Pour pack with QR verification."
                ]
            },
            {
                "slide": 3,
                "title": "Seamless Plant Operations in 3 Minutes",
                "bullets": [
                    "Drag-and-drop or email forwarded MTC directly into inbox.",
                    "Instant buyer-spec checking (ASTM, EN, DIN tolerances).",
                    "Supplier 'Chase the Mill' automated reminders."
                ]
            },
            {
                "slide": 4,
                "title": "Partner Program: 20% Revenue Share",
                "bullets": [
                    "20% recurring monthly commission on first 12 months' subscription fees.",
                    "Tracked strictly from paid invoices, transparent ledger.",
                    "Dedicated client oversight portal with read-only permission."
                ]
            },
            {
                "slide": 5,
                "title": "Get Started: Instant Free MTC Check",
                "bullets": [
                    f"Share your custom link: {check_link}",
                    "Plant tests 1 MTC free, results visible immediately.",
                    "Assisted onboarding and audit pilot support."
                ]
            }
        ]

        # 1-page PDF text summary
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
{LEGAL_DISCLAIMER}
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
            "disclaimer": LEGAL_DISCLAIMER
        }


# Module level exports
partner_service = PartnerService()


def get_partner_service():
    return partner_service
