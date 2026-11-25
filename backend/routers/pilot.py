"""
HEATLEDGER AI: Pilot & Pricing Telemetry Router (Prompts L2 & L3)
Endpoints for 1-shipment compliance audits, pilot pipeline tracker,
in-app subscription tier upgrades, and anonymous pricing telemetry.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

try:
    from roi_service import RoiService
    from billing_service import BillingService, PLANS
    from dependencies import get_current_user
except ImportError:
    from backend.roi_service import RoiService
    from backend.billing_service import BillingService, PLANS
    from backend.dependencies import get_current_user

router = APIRouter(tags=["Pilot & Pricing"])

_PRICING_TELEMETRY_LOG: List[Dict[str, Any]] = []


class PricingTelemetryEvent(BaseModel):
    event: str
    plan_id: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class PlanUpgradeRequest(BaseModel):
    plan_id: str
    billing_cycle: str = "MONTHLY"
    coupon_code: Optional[str] = None


class OneShipmentAuditRequest(BaseModel):
    exporter_name: Optional[str] = "Howrah Precision Forgings Ltd."
    plant_name: Optional[str] = "Howrah Casting & Forging Facility"
    invoice_number: Optional[str] = "EXP-2026-PILOT-01"
    destination_country: Optional[str] = "Germany (DE)"
    cn_code: Optional[str] = "730799"
    weight_mt: Optional[float] = 24.5
    certificates: Optional[List[Dict[str, Any]]] = None


class PilotTrackerUpdateRequest(BaseModel):
    plant_id: str
    updates: Dict[str, Any]


@router.post("/api/telemetry/pricing-event")
def log_pricing_telemetry(payload: PricingTelemetryEvent):
    """Logs privacy-friendly non-PII pricing events."""
    entry = {
        "event": payload.event,
        "plan_id": payload.plan_id,
        "timestamp": payload.timestamp or datetime.now(timezone.utc).isoformat(),
        "metadata": payload.metadata or {}
    }
    _PRICING_TELEMETRY_LOG.append(entry)
    if len(_PRICING_TELEMETRY_LOG) > 500:
        _PRICING_TELEMETRY_LOG.pop(0)
    return {"status": "recorded", "event": payload.event}


@router.get("/api/telemetry/pricing-events")
def get_pricing_telemetry_events():
    """Returns recorded privacy-friendly telemetry events."""
    return {"events": _PRICING_TELEMETRY_LOG, "count": len(_PRICING_TELEMETRY_LOG)}


@router.post("/api/billing/upgrade")
def upgrade_plan(
    payload: PlanUpgradeRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    In-app upgrade flow: updates subscription tier, applies discount, and resets quota limits.
    """
    org_id = user.get("organization_id") or user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=401, detail="Missing organization in session")
    plan = PLANS.get(payload.plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Target plan {payload.plan_id} not found")

    new_limit = plan.get("certificate_limit_monthly", plan.get("certificate_limit", 150))
    BillingService.get_or_create_subscription(org_id)
    BillingService.update_subscription_tier(org_id, payload.plan_id, new_limit)

    return {
        "status": "upgraded",
        "organization_id": org_id,
        "new_plan_id": payload.plan_id,
        "plan_name": plan.get("name"),
        "certificate_limit": new_limit,
        "billing_cycle": payload.billing_cycle.upper()
    }


@router.post("/api/pilot/audit/run")
def run_pilot_shipment_audit(payload: OneShipmentAuditRequest):
    """
    Executes free 1-shipment compliance audit, assessing melt-and-pour evidence,
    chemistry tolerances, traceability gaps, and estimated CBAM default carbon risk.
    """
    audit = RoiService.run_one_shipment_audit(payload.model_dump())
    return audit


@router.get("/api/pilot/audit/{audit_id}")
def get_pilot_audit_details(audit_id: str):
    """Retrieves full audit report data by audit ID."""
    audit = RoiService.get_audit_by_id(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail=f"Audit {audit_id} not found")
    return audit


@router.get("/api/pilot/audit/{audit_id}/report.pdf")
def get_pilot_audit_pdf(audit_id: str):
    """Generates and returns 1-page vector PDF findings report."""
    audit = RoiService.get_audit_by_id(audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail=f"Audit {audit_id} not found")
    pdf_bytes = RoiService.generate_findings_pdf(audit)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=findings_report_{audit_id}.pdf"}
    )


@router.get("/api/share/audit/{token}")
def get_shared_audit(token: str):
    """Public read-only capability share endpoint for 1-shipment audit findings."""
    audit = RoiService.get_audit_by_token(token)
    if not audit:
        raise HTTPException(status_code=404, detail="Shared audit findings link expired or invalid")
    return audit


@router.get("/api/share/audit/{token}/report.pdf")
def get_shared_audit_pdf(token: str):
    """Public read-only capability share endpoint for 1-shipment PDF findings report."""
    audit = RoiService.get_audit_by_token(token)
    if not audit:
        raise HTTPException(status_code=404, detail="Shared audit findings link expired or invalid")
    pdf_bytes = RoiService.generate_findings_pdf(audit)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=findings_report_{audit['audit_id']}.pdf"}
    )


@router.get("/api/pilot/tracker")
def get_pilot_tracker_pipeline():
    """Returns active pilot pipeline tracker across all plants."""
    return {"plants": RoiService.get_pilot_tracker(), "count": len(RoiService.get_pilot_tracker())}


@router.post("/api/pilot/tracker/update")
def update_pilot_tracker_status(payload: PilotTrackerUpdateRequest):
    """Updates stage, hours saved, and conversion status in pilot pipeline."""
    res = RoiService.update_pilot_tracker(payload.plant_id, payload.updates)
    return res


@router.get("/api/pilot/email-sequence")
def get_pilot_email_sequence():
    """Returns 4-stage onboarding email sequence templates (Day 0, 2, 7, 14)."""
    return {"templates": RoiService.get_email_sequence_templates()}
