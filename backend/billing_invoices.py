"""
HEATLEDGER AI: GST Tax Calculation & A4 Tax Invoice PDF Generator
Extracted from billing_service.py for Prompt Pack v5 Task 6.1.
"""

import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import pymupdf as fitz

try:
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from db.connection import get_db_connection as _get_db


def get_supplier_entity() -> Dict[str, str]:
    """Reads supplier legal entity details strictly from env vars; blocks invoicing if missing."""
    entity = {
        "legal_name": os.getenv("SUPPLIER_LEGAL_NAME", "").strip(),
        "address": os.getenv("SUPPLIER_ADDRESS", "").strip(),
        "gstin": os.getenv("SUPPLIER_GSTIN", os.getenv("HEATLEDGER_GSTIN", "")).strip(),
        "pan": os.getenv("SUPPLIER_PAN", "").strip(),
        "support_email": os.getenv("SUPPORT_EMAIL", "").strip(),
        "state_code": os.getenv("SUPPLIER_STATE_CODE", "19").strip() or "19",
    }
    missing = [
        env_name
        for key, env_name in (
            ("legal_name", "SUPPLIER_LEGAL_NAME"),
            ("address", "SUPPLIER_ADDRESS"),
            ("gstin", "SUPPLIER_GSTIN"),
            ("pan", "SUPPLIER_PAN"),
            ("support_email", "SUPPORT_EMAIL"),
        )
        if not entity[key]
    ]
    if missing:
        raise ValueError(
            f"Invoice generation blocked: missing legal entity configuration ({', '.join(missing)})."
        )
    if len(entity["gstin"]) >= 2 and entity["gstin"][:2].isdigit():
        entity["state_code"] = entity["gstin"][:2]
    return entity


def load_plans_config(plans_json_path: str) -> Dict[str, Dict[str, Any]]:
    """Loads plans dynamically from plans.json with backward-compatible aliases."""
    plans: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(plans_json_path):
        try:
            with open(plans_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for pid, pdata in data.get("plans", {}).items():
                    plans[pid] = pdata
        except Exception:
            pass

    if "EXPORTER_STARTER" not in plans and "PLANT" in plans:
        plans["EXPORTER_STARTER"] = dict(plans["PLANT"], id="EXPORTER_STARTER", name="Exporter Starter")
    if "GROWTH_MULTI_PLANT" not in plans and "PLANT_PRO" in plans:
        plans["GROWTH_MULTI_PLANT"] = dict(plans["PLANT_PRO"], id="GROWTH_MULTI_PLANT", name="Growth Multi-Plant")
    if "ENTERPRISE_CUSTOM" not in plans and "CONSULTANT" in plans:
        plans["ENTERPRISE_CUSTOM"] = dict(plans["CONSULTANT"], id="ENTERPRISE_CUSTOM", name="Enterprise Unlimited")
    if "PILOT_TRIAL" not in plans and "PILOT" in plans:
        plans["PILOT_TRIAL"] = dict(plans["PILOT"], id="PILOT_TRIAL", name="Factory Pilot Trial", price_monthly_inr=0, price_annual_inr=0, is_trial=True)

    return plans


def calculate_gst_breakdown(
    base_amount_inr: float,
    place_of_supply_state_code: str,
    discount_inr: float = 0.0,
    sac_code: str = "998313",
    gst_rate_pct: float = 18.0,
) -> Dict[str, Any]:
    """Computes Indian GST: CGST 9% + SGST 9% intra-state or IGST 18% inter-state."""
    taxable = max(0.0, base_amount_inr - discount_inr)
    supplier_gstin = os.getenv("SUPPLIER_GSTIN", os.getenv("HEATLEDGER_GSTIN", "")).strip()
    supplier_state_code = supplier_gstin[:2] if len(supplier_gstin) >= 2 and supplier_gstin[:2].isdigit() else os.getenv("SUPPLIER_STATE_CODE", "19")
    is_intra_state = place_of_supply_state_code.strip() == supplier_state_code

    if is_intra_state:
        cgst = round(taxable * 0.09, 2)
        sgst = round(taxable * 0.09, 2)
        igst = 0.0
    else:
        cgst = 0.0
        sgst = 0.0
        igst = round(taxable * 0.18, 2)

    total = round(taxable + cgst + sgst + igst, 2)

    return {
        "sac_code": sac_code,
        "base_amount_inr": round(base_amount_inr, 2),
        "discount_inr": round(discount_inr, 2),
        "taxable_amount_inr": round(taxable, 2),
        "gst_rate_pct": gst_rate_pct,
        "cgst_amount_inr": cgst,
        "sgst_amount_inr": sgst,
        "igst_amount_inr": igst,
        "cgst_inr": cgst,
        "sgst_inr": sgst,
        "igst_inr": igst,
        "total_amount_inr": total,
        "is_intra_state": is_intra_state,
        "is_interstate": not is_intra_state,
    }


def render_invoice_pdf(
    supplier: Dict[str, str],
    sac_code: str,
    invoice_number: str,
    date_str: str,
    plan_name: str,
    billing_cycle: str,
    tax: Dict[str, Any],
    customer_gstin: Optional[str],
    place_of_supply: str,
    razorpay_payment_id: Optional[str],
) -> bytes:
    """Renders A4 GST Tax Invoice using PyMuPDF vector drawing."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    emerald = (16 / 255, 185 / 255, 129 / 255)
    slate_dark = (15 / 255, 23 / 255, 42 / 255)
    slate_muted = (100 / 255, 116 / 255, 139 / 255)

    page.draw_rect(fitz.Rect(40, 40, 555, 130), color=emerald, width=1.5)
    page.insert_text(fitz.Point(55, 65), "HEATLEDGER AI · TAX INVOICE", fontsize=14, color=emerald, fontname="helv")
    page.insert_text(fitz.Point(55, 85), f"Supplier: {supplier['legal_name']} (GSTIN: {supplier['gstin']})", fontsize=8.5, color=slate_dark)
    page.insert_text(fitz.Point(55, 100), f"Registered Office: {supplier['address']}", fontsize=8, color=slate_muted)
    page.insert_text(fitz.Point(55, 115), f"SAC Code: {sac_code} (Accounting Code for Services: IT & Software)", fontsize=8, color=emerald)

    y = 150
    page.draw_line(fitz.Point(40, y), fitz.Point(555, y), color=(0.8, 0.8, 0.8), width=1)
    y += 20
    page.insert_text(fitz.Point(40, y), f"Invoice Number: {invoice_number}", fontsize=9, color=slate_dark)
    page.insert_text(fitz.Point(340, y), f"Date of Issue: {date_str}", fontsize=9, color=slate_dark)
    y += 18
    page.insert_text(fitz.Point(40, y), f"Place of Supply: {place_of_supply}", fontsize=9, color=slate_dark)
    page.insert_text(fitz.Point(340, y), f"Payment ID: {razorpay_payment_id or 'PENDING'}", fontsize=9, color=emerald)
    y += 18
    page.insert_text(fitz.Point(40, y), f"Customer GSTIN: {customer_gstin or 'UNREGISTERED'}", fontsize=9, color=slate_dark)
    page.insert_text(fitz.Point(340, y), "Reverse Charge Applicable: NO", fontsize=9, color=slate_muted)

    y += 35
    page.draw_rect(fitz.Rect(40, y, 555, y + 25), fill=(0.95, 0.95, 0.95), color=(0.8, 0.8, 0.8), width=1)
    page.insert_text(fitz.Point(50, y + 16), "Description of SaaS Services", fontsize=8.5, color=slate_dark, fontname="helv")
    page.insert_text(fitz.Point(260, y + 16), "SAC", fontsize=8.5, color=slate_dark, fontname="helv")
    page.insert_text(fitz.Point(330, y + 16), "Billing", fontsize=8.5, color=slate_dark, fontname="helv")
    page.insert_text(fitz.Point(460, y + 16), "Taxable Value (INR)", fontsize=8.5, color=slate_dark, fontname="helv")

    y += 25
    page.draw_rect(fitz.Rect(40, y, 555, y + 45), color=(0.8, 0.8, 0.8), width=1)
    page.insert_text(fitz.Point(50, y + 20), f"HeatLedger AI Subscription — {plan_name}", fontsize=9, color=slate_dark)
    page.insert_text(fitz.Point(50, y + 35), "Melt-and-Pour Origin & CBAM Compliance SaaS", fontsize=7.5, color=slate_muted)
    page.insert_text(fitz.Point(260, y + 24), sac_code, fontsize=8.5, color=slate_dark)
    page.insert_text(fitz.Point(330, y + 24), billing_cycle, fontsize=8.5, color=slate_dark)
    page.insert_text(fitz.Point(460, y + 24), f"Rs. {tax['taxable_amount_inr']:,.2f}", fontsize=9, color=slate_dark, fontname="helv")

    y += 65
    page.draw_line(fitz.Point(300, y), fitz.Point(555, y), color=(0.8, 0.8, 0.8), width=1)
    y += 18
    page.insert_text(fitz.Point(320, y), "Subtotal (Taxable):", fontsize=8.5, color=slate_muted)
    page.insert_text(fitz.Point(460, y), f"Rs. {tax['taxable_amount_inr']:,.2f}", fontsize=8.5, color=slate_dark)

    if tax["is_intra_state"]:
        y += 16
        page.insert_text(fitz.Point(320, y), "CGST @ 9.0%:", fontsize=8.5, color=slate_muted)
        page.insert_text(fitz.Point(460, y), f"Rs. {tax['cgst_inr']:,.2f}", fontsize=8.5, color=slate_dark)
        y += 16
        page.insert_text(fitz.Point(320, y), "SGST @ 9.0%:", fontsize=8.5, color=slate_muted)
        page.insert_text(fitz.Point(460, y), f"Rs. {tax['sgst_inr']:,.2f}", fontsize=8.5, color=slate_dark)
    else:
        y += 16
        page.insert_text(fitz.Point(320, y), "IGST @ 18.0%:", fontsize=8.5, color=slate_muted)
        page.insert_text(fitz.Point(460, y), f"Rs. {tax['igst_inr']:,.2f}", fontsize=8.5, color=slate_dark)

    y += 22
    page.draw_rect(fitz.Rect(300, y - 5, 555, y + 20), fill=(16 / 255, 185 / 255, 129 / 255, 0.1), color=emerald, width=1)
    page.insert_text(fitz.Point(320, y + 12), "Total Amount Payable:", fontsize=9.5, color=emerald, fontname="helv")
    page.insert_text(fitz.Point(450, y + 12), f"Rs. {tax['total_amount_inr']:,.2f}", fontsize=10, color=emerald, fontname="helv")

    y += 80
    page.draw_rect(fitz.Rect(40, y, 555, y + 70), color=(0.85, 0.85, 0.85), width=1)
    page.insert_text(fitz.Point(50, y + 18), "DECLARATION UNDER CGST ACT 2017 & IT RULES:", fontsize=7.5, color=slate_dark, fontname="helv")
    page.insert_text(fitz.Point(50, y + 32), "We declare that this invoice shows the actual price of the software services described and that all particulars", fontsize=7, color=slate_muted)
    page.insert_text(fitz.Point(50, y + 44), "are true and correct. Computer-generated digitally signed invoice; physical signature not required.", fontsize=7, color=slate_muted)
    page.insert_text(fitz.Point(50, y + 58), "Certificate limit usage eligible for Export Promotion / Technology Upgradation capital subsidy claim.", fontsize=7, color=emerald)

    return doc.write()


def generate_gst_tax_invoice(
    billing_cls: Any,
    supplier: Dict[str, str],
    plans: Dict[str, Dict[str, Any]],
    valid_coupons: Dict[str, Dict[str, Any]],
    sac_code: str,
    base_dir: str,
    organization_id: str,
    plan_id: str,
    billing_cycle: str = "MONTHLY",
    customer_gstin: Optional[str] = None,
    place_of_supply: str = "West Bengal (19)",
    coupon_code: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Generates an official sequential GST Tax Invoice, persists PDF, and updates subscription."""
    billing_cls.init_tables()
    plan = plans.get(plan_id)
    if not plan:
        raise ValueError(f"Unknown plan: {plan_id}")

    base_price = plan["price_annual_inr"] if billing_cycle == "ANNUAL" else plan["price_monthly_inr"]

    discount_inr = 0.0
    if coupon_code and coupon_code.upper() in valid_coupons:
        disc_rate = valid_coupons[coupon_code.upper()]["discount_pct"] / 100.0
        discount_inr = base_price * disc_rate

    state_code = "19"
    if "(" in place_of_supply and ")" in place_of_supply:
        state_code = place_of_supply.split("(")[1].split(")")[0].strip()
    elif customer_gstin and len(customer_gstin) >= 2 and customer_gstin[:2].isdigit():
        state_code = customer_gstin[:2]

    tax = billing_cls.calculate_gst_breakdown(base_price, state_code, discount_inr)

    now_dt = datetime.now(timezone.utc)
    inv_id = f"inv_{uuid.uuid4().hex[:12]}"

    with billing_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT invoice_number FROM invoices WHERE invoice_number LIKE 'HL-TAX-2026-%' ORDER BY rowid DESC LIMIT 1")
            row = cur.fetchone()
            next_seq = 1
            if row:
                m = re.search(r"HL-TAX-2026-(\d+)", row[0])
                if m:
                    next_seq = int(m.group(1)) + 1
            while True:
                inv_num = f"HL-TAX-2026-{next_seq:04d}"
                cur.execute("SELECT 1 FROM invoices WHERE invoice_number = ?", (inv_num,))
                if not cur.fetchone():
                    break
                next_seq += 1

    pdf_bytes = billing_cls.render_invoice_pdf(
        invoice_number=inv_num,
        date_str=now_dt.strftime("%d-%b-%Y"),
        plan_name=plan["name"],
        billing_cycle=billing_cycle,
        tax=tax,
        customer_gstin=customer_gstin,
        place_of_supply=place_of_supply,
        razorpay_payment_id=razorpay_payment_id,
    )

    invoices_dir = os.path.join(base_dir, "invoices")
    os.makedirs(invoices_dir, exist_ok=True)
    pdf_path = os.path.join(invoices_dir, f"{inv_num}.pdf")
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    payment_status = "PAID" if razorpay_payment_id else "PENDING"
    with billing_cls._lock:
        with _get_db() as conn:
            conn.execute(
                """
                INSERT INTO invoices (
                    id, invoice_number, organization_id, plan_id, billing_cycle,
                    base_amount_inr, discount_inr, taxable_amount_inr, gst_rate_pct,
                    cgst_inr, sgst_inr, igst_inr, total_amount_inr, sac_code,
                    supplier_gstin, customer_gstin, place_of_supply, payment_status,
                    razorpay_payment_id, pdf_path, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    inv_id, inv_num, organization_id, plan_id, billing_cycle,
                    tax["base_amount_inr"], tax["discount_inr"], tax["taxable_amount_inr"],
                    tax["gst_rate_pct"], tax["cgst_inr"], tax["sgst_inr"], tax["igst_inr"],
                    tax["total_amount_inr"], sac_code, supplier["gstin"], customer_gstin or "UNREGISTERED",
                    place_of_supply, payment_status, razorpay_payment_id, pdf_path, now_dt.isoformat(),
                ),
            )

            start_iso = now_dt.isoformat()
            days_added = 365 if billing_cycle == "ANNUAL" else 30
            end_iso = (now_dt + timedelta(days=days_added)).isoformat()

            conn.execute(
                """
                INSERT INTO subscriptions (
                    id, organization_id, plan_id, billing_cycle, status,
                    certificates_used, certificates_limit, current_period_start,
                    current_period_end, created_at
                ) VALUES (?, ?, ?, ?, 'ACTIVE', 0, ?, ?, ?, ?)
                ON CONFLICT(organization_id) DO UPDATE SET
                    plan_id = excluded.plan_id,
                    billing_cycle = excluded.billing_cycle,
                    status = 'ACTIVE',
                    certificates_limit = excluded.certificates_limit,
                    current_period_start = excluded.current_period_start,
                    current_period_end = excluded.current_period_end,
                    grace_period_until = NULL
                """,
                (
                    f"sub_{uuid.uuid4().hex[:12]}", organization_id, plan_id, billing_cycle,
                    plan["certificate_limit"], start_iso, end_iso, start_iso,
                ),
            )
            conn.commit()

    return {
        "invoice_id": inv_id,
        "invoice_number": inv_num,
        "tax_breakdown": tax,
        "sac_code": sac_code,
        "pdf_path": pdf_path,
        "download_url": f"/api/billing/invoices/{inv_id}/pdf",
    }
