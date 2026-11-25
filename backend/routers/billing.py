"""
HEATLEDGER AI: Indian GST Billing & Razorpay Webhooks APIRouter (Prompt M4)
Endpoints:
- GET /api/billing/plans: SaaS tiers, SAC 998313, 18% GST & coupons
- GET /api/billing/subscription: Active org plan & quota tracking
- POST /api/billing/create-order: GST order creation
- POST /api/billing/webhook: Razorpay webhook idempotency handler
- GET /api/billing/invoices: List past GST tax invoices
- GET /api/billing/invoices/{invoice_id}/pdf: Download A4 GST invoice PDF
- POST /api/billing/apply-coupon: Preview discount & GST tax breakdown
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from billing_service import BillingService, PLANS, VALID_COUPONS
    from dependencies import get_current_user
except ImportError:
    from backend.billing_service import BillingService, PLANS, VALID_COUPONS
    from backend.dependencies import get_current_user

logger = logging.getLogger("heatledger.billing")

router = APIRouter(prefix="/api/billing", tags=["Billing & GST Subscriptions"])


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    plan_id: str
    billing_cycle: str = Field(default="MONTHLY", pattern="^(MONTHLY|ANNUAL)$")
    customer_gstin: Optional[str] = None
    place_of_supply: str = "West Bengal (19)"
    coupon_code: Optional[str] = None


class ApplyCouponRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coupon_code: str
    plan_id: str
    billing_cycle: str = Field(default="MONTHLY", pattern="^(MONTHLY|ANNUAL)$")
    place_of_supply: str = "West Bengal (19)"


@router.get("/plans")
def get_billing_plans():
    """Returns commercial SaaS subscription plans, SAC codes, and available coupon codes."""
    return {
        "plans": PLANS,
        "sac_code": "998313",
        "gst_rate_pct": 18.0,
        "available_coupons": [
            {"code": code, "discount_pct": data["discount_pct"], "description": data["description"]}
            for code, data in VALID_COUPONS.items()
        ]
    }


@router.get("/subscription")
def get_subscription(user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches active subscription, plan tier, and certificate quota usage for organization."""
    org_id = user.get("organization_id") or user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=401, detail="No organization membership in session.")
    sub = BillingService.get_or_create_subscription(org_id)
    plan = PLANS.get(sub["plan_id"], PLANS["PILOT_TRIAL"])
    return {
        "subscription": sub,
        "plan": plan,
        "quota": {
            "used": sub["certificates_used"],
            "limit": sub["certificates_limit"],
            "remaining": max(0, sub["certificates_limit"] - sub["certificates_used"]),
            "usage_pct": round((sub["certificates_used"] / sub["certificates_limit"]) * 100, 1) if sub["certificates_limit"] > 0 else 100
        }
    }


@router.post("/create-order")
def create_billing_order(
    payload: CreateOrderRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Creates a commercial subscription order with Indian GST calculation (SAC 998313)
    and generates an official GST Tax Invoice with PDF deliverable.
    Handles UPI AutoPay limits (capped near ₹15,000) and Razorpay configuration status.
    """
    org_id = user.get("organization_id") or user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=401, detail="No organization membership in session.")
    try:
        inv_result = BillingService.generate_gst_tax_invoice(
            organization_id=org_id,
            plan_id=payload.plan_id,
            billing_cycle=payload.billing_cycle,
            customer_gstin=payload.customer_gstin,
            place_of_supply=payload.place_of_supply,
            coupon_code=payload.coupon_code
        )
        total_inr = float(inv_result.get("total_amount_inr", 0.0))
        autopay_info = BillingService.check_upi_autopay_eligibility(total_inr)
        rzp_configured = bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))

        return {
            "status": "order_created",
            "order_id": f"order_rzp_{uuid.uuid4().hex[:12]}",
            "gateway_status": "active" if rzp_configured else "unconfigured",
            "gateway_message": None if rzp_configured else "Payment gateway unavailable: Razorpay API keys not configured. Contact billing support.",
            "is_upi_autopay_eligible": autopay_info["is_upi_autopay_eligible"],
            "supported_payment_methods": autopay_info["supported_methods"],
            "payment_method_notice": autopay_info["notice"],
            **inv_result
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Billing order creation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize billing order")


@router.post("/checkout")
def initiate_checkout(
    payload: CreateOrderRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Prompt B1: If Razorpay is not configured the checkout is disabled with a clear message.
    """
    rzp_configured = bool(os.getenv("RAZORPAY_KEY_ID") and os.getenv("RAZORPAY_KEY_SECRET"))
    if not rzp_configured:
        raise HTTPException(
            status_code=503,
            detail="Payment gateway unavailable: Razorpay API keys not configured. Contact billing support."
        )
    return create_billing_order(payload, user)


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Prompt B9: Idempotent Razorpay Webhook Endpoint.
    Verifies HMAC-SHA256 signature and applies replay protection.
    """
    raw_body = await request.body()
    sig_header = request.headers.get("x-razorpay-signature") or request.headers.get("X-Razorpay-Signature") or ""
    try:
        from backend.settings import get_webhook_secret
    except ImportError:
        from settings import get_webhook_secret
    secret = get_webhook_secret("RAZORPAY_WEBHOOK_SECRET")

    try:
        event = json.loads(raw_body.decode("utf-8")) if raw_body else {}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    try:
        result = BillingService.process_razorpay_webhook(
            event=event,
            raw_body=raw_body,
            signature=sig_header,
            secret=secret
        )
        return result
    except PermissionError as pe:
        raise HTTPException(status_code=400, detail=str(pe))
    except Exception as e:
        logger.error(f"Razorpay webhook error: {e}")
        raise HTTPException(status_code=500, detail="Internal webhook processing failure")


@router.get("/invoices")
def list_organization_invoices(user: Dict[str, Any] = Depends(get_current_user)):
    """Lists past GST tax invoices for the user's organization."""
    org_id = user.get("organization_id") or user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=401, detail="No organization membership in session.")
    invoices = BillingService.list_invoices(org_id)
    return {"organization_id": org_id, "invoices": invoices}


@router.get("/invoices/{invoice_id}/pdf")
def download_invoice_pdf(invoice_id: str):
    """Downloads the A4 GST Tax Invoice PDF."""
    invoice = BillingService.get_invoice(invoice_id)
    if not invoice or not invoice.get("pdf_path") or not os.path.exists(invoice["pdf_path"]):
        raise HTTPException(status_code=404, detail="Invoice PDF not found")

    return FileResponse(
        path=invoice["pdf_path"],
        media_type="application/pdf",
        filename=f"{invoice['invoice_number']}.pdf"
    )


@router.post("/apply-coupon")
def apply_coupon(payload: ApplyCouponRequest):
    """Calculates discounted pricing and GST breakdown for promotional coupon."""
    plan = PLANS.get(payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan {payload.plan_id} not found")

    coupon = VALID_COUPONS.get(payload.coupon_code.upper())
    if not coupon:
        raise HTTPException(status_code=400, detail=f"Invalid or expired coupon code: {payload.coupon_code}")

    base_price = plan["price_annual_inr"] if payload.billing_cycle == "ANNUAL" else plan["price_monthly_inr"]
    discount_inr = base_price * (coupon["discount_pct"] / 100.0)

    state_code = "19"
    if "(" in payload.place_of_supply and ")" in payload.place_of_supply:
        state_code = payload.place_of_supply.split("(")[1].split(")")[0].strip()

    tax = BillingService.calculate_gst_breakdown(base_price, state_code, discount_inr)
    return {
        "coupon_code": payload.coupon_code.upper(),
        "discount_pct": coupon["discount_pct"],
        "description": coupon["description"],
        "tax_breakdown": tax
    }
