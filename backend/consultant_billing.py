"""
HEATLEDGER AI: Consultant White-Label Branding, Consolidated Billing & Referrals
Extracted from consultant_service.py for Prompt Pack v5 Task 6.1.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection


def get_white_label_config(consultant_org_id: str) -> Dict[str, Any]:
    """Retrieves white-label branding settings with mandatory Clause 6 footer intact."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM consultant_white_label WHERE consultant_org_id = ?",
        (consultant_org_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "consultant_org_id": consultant_org_id,
            "firm_name": "Consultant Advisory",
            "logo_url": None,
            "primary_color": "#0f172a",
            "secondary_color": "#10b981",
            "custom_domain": None,
            "tagline": "Authorised CBAM Advisory",
            "show_consultant_brand_on_pdf": True,
            "show_consultant_brand_on_portal": True,
            "mandatory_verification_footer": "Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact",
        }

    return {
        "consultant_org_id": row["consultant_org_id"],
        "firm_name": row["firm_name"],
        "logo_url": row["logo_url"],
        "primary_color": row["primary_color"],
        "secondary_color": row["secondary_color"],
        "custom_domain": row["custom_domain"],
        "tagline": row["tagline"],
        "show_consultant_brand_on_pdf": bool(row["show_consultant_brand_on_pdf"]),
        "show_consultant_brand_on_portal": bool(row["show_consultant_brand_on_portal"]),
        "mandatory_verification_footer": "Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact",
    }


def update_white_label_config(consultant_org_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Updates white-label branding parameters."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()

    firm_name = payload.get("firm_name", "Consultant Advisory")
    logo_url = payload.get("logo_url")
    primary_color = payload.get("primary_color", "#0f172a")
    secondary_color = payload.get("secondary_color", "#10b981")
    custom_domain = payload.get("custom_domain")
    tagline = payload.get("tagline")
    show_pdf = 1 if payload.get("show_consultant_brand_on_pdf", True) else 0
    show_portal = 1 if payload.get("show_consultant_brand_on_portal", True) else 0

    cursor.execute(
        """
        INSERT INTO consultant_white_label (
            consultant_org_id, firm_name, logo_url, primary_color, secondary_color,
            custom_domain, tagline, show_consultant_brand_on_pdf, show_consultant_brand_on_portal, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(consultant_org_id) DO UPDATE SET
            firm_name = excluded.firm_name,
            logo_url = excluded.logo_url,
            primary_color = excluded.primary_color,
            secondary_color = excluded.secondary_color,
            custom_domain = excluded.custom_domain,
            tagline = excluded.tagline,
            show_consultant_brand_on_pdf = excluded.show_consultant_brand_on_pdf,
            show_consultant_brand_on_portal = excluded.show_consultant_brand_on_portal,
            updated_at = excluded.updated_at
        """,
        (
            consultant_org_id, firm_name, logo_url, primary_color, secondary_color,
            custom_domain, tagline, show_pdf, show_portal, now_iso,
        ),
    )
    conn.commit()
    conn.close()
    return get_white_label_config(consultant_org_id)


def get_consolidated_invoice(service: Any, consultant_org_id: str, billing_month: str = "2026-04") -> Dict[str, Any]:
    """Generates one consolidated monthly invoice with per-plant line items and commission/discount lines."""
    portfolio = service.get_consultant_portfolio(consultant_org_id)
    active_plants = [p for p in portfolio["client_plants"] if p["status"] == "ACTIVE"]

    fee_per_plant = 6999.0
    line_items = []
    subtotal = 0.0

    for p in active_plants:
        subtotal += fee_per_plant
        line_items.append(
            {
                "plant_id": p["plant_id"],
                "plant_name": p["plant_name"],
                "plant_code": p["plant_code"],
                "service_description": "HeatLedger AI Multi-Plant Enterprise Compliance Tier",
                "monthly_rate_inr": fee_per_plant,
                "gst_18_pct": round(fee_per_plant * 0.18, 2),
                "total_inr": round(fee_per_plant * 1.18, 2),
            }
        )

    comm_pct = portfolio.get("commission_pct", 20.0)
    commission_credit_inr = round(subtotal * (comm_pct / 100.0), 2)
    net_payable_inr = round(subtotal * 1.18 - commission_credit_inr, 2)

    return {
        "invoice_number": f"INV-HL-{billing_month}-{uuid.uuid4().hex[:6].upper()}",
        "consultant_org_id": consultant_org_id,
        "firm_name": portfolio["firm_name"],
        "billing_month": billing_month,
        "generated_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "total_active_plants": len(active_plants),
        "subtotal_inr": round(subtotal, 2),
        "gst_18_pct_total_inr": round(subtotal * 0.18, 2),
        "gross_amount_inr": round(subtotal * 1.18, 2),
        "consultant_commission_pct": comm_pct,
        "commission_credit_inr": commission_credit_inr,
        "net_payable_inr": max(0.0, net_payable_inr),
        "line_items": line_items,
    }


def get_referral_tracking(service: Any, consultant_org_id: str) -> Dict[str, Any]:
    """Returns consultant referral link, promo code, attributed plants, and accrued commission ledger."""
    portfolio = service.get_consultant_portfolio(consultant_org_id)
    ref_code = portfolio.get("referral_code", "CA-PARTNER-2026")
    clients = portfolio["client_plants"]

    attributed_list = []
    for c in clients:
        attributed_list.append(
            {
                "plant_id": c["plant_id"],
                "plant_name": c["plant_name"],
                "status": c["status"],
                "referred_date": c["created_at"][:10],
                "client_discount_applied_pct": portfolio.get("discount_pct", 15.0),
                "consultant_monthly_credit_inr": round(float(portfolio.get("per_plant_monthly_fee_inr", 6999.0)) * 0.20, 2),
            }
        )

    credit_per_plant = round(float(portfolio.get("per_plant_monthly_fee_inr", 6999.0)) * 0.20, 2)
    total_accrued = len([c for c in clients if c["status"] == "ACTIVE"]) * credit_per_plant

    return {
        "referral_code": ref_code,
        "share_url": f"https://heatledger.ai/signup?ref={ref_code}",
        "client_discount_pct": portfolio.get("discount_pct", 15.0),
        "consultant_commission_pct": portfolio.get("commission_pct", 20.0),
        "active_referred_plants_count": len([c for c in clients if c["status"] == "ACTIVE"]),
        "monthly_recurring_commission_inr": round(total_accrued, 2),
        "attributed_clients": attributed_list,
    }
