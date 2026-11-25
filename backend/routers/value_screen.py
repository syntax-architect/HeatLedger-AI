"""
HEATLEDGER AI: Value Screen & Money-at-Risk Router (Prompt C6)
Endpoints for 4-KPI value screen, transparent mathematical inputs,
weekly executive email, and 1-page director/banker PDF.
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field

try:
    from backend.roi_service import RoiService
    from backend.dependencies import get_current_user
except ImportError:
    from roi_service import RoiService
    from dependencies import get_current_user

router = APIRouter(prefix="/api/value-screen", tags=["Value Screen & Money-at-Risk"])


class UpdateRiskParamsRequest(BaseModel):
    demurrage_per_day_inr: Optional[float] = Field(None, description="Demurrage storage cost per day in INR")
    default_hold_days: Optional[int] = Field(None, description="Estimated hold days")
    quota_safeguard_rate: Optional[float] = Field(None, description="Out-of-quota safeguard tariff rate")
    cbam_default_markup_rate: Optional[float] = Field(None, description="CBAM default markup penalty rate")
    cbam_price_eur_per_tonne: Optional[float] = Field(None, description="CBAM benchmark EUR certificate price")
    eur_to_inr_exchange_rate: Optional[float] = Field(None, description="EUR to INR conversion rate")
    reshipping_rejection_pct: Optional[float] = Field(None, description="Contingency re-shipping rate")
    minutes_per_shipment: Optional[int] = Field(None, description="Estimated engineering minutes saved per shipment")


class SendWeeklyEmailRequest(BaseModel):
    owner_email: str
    owner_name: Optional[str] = "Plant Owner"
    test_mode: Optional[bool] = False


@router.get("/summary")
def get_summary(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Returns the four canonical numbers, transparent itemized money-at-risk,
    time-saved counter, and top 3 owner action items for the caller's organization.
    """
    org_id = user["organization_id"]
    return RoiService.get_value_screen_summary(organization_id=org_id)


@router.get("/parameters")
def get_parameters(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Returns the editable risk parameters used in the money-at-risk calculations."""
    org_id = user["organization_id"]
    return RoiService.get_plant_parameters(organization_id=org_id)


@router.put("/parameters")
def update_parameters(
    payload: UpdateRiskParamsRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Updates editable risk parameters so the owner sees exactly their own figures."""
    org_id = user["organization_id"]
    updated = RoiService.update_plant_parameters(
        organization_id=org_id,
        new_params=payload.dict(exclude_unset=True)
    )
    return {"status": "updated", "parameters": updated}


@router.post("/trigger-weekly-email")
def trigger_weekly_email(
    payload: SendWeeklyEmailRequest,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Triggers the weekly executive briefing email via Resend."""
    org_id = user["organization_id"]
    result = RoiService.send_weekly_owner_email(
        organization_id=org_id,
        owner_email=payload.owner_email,
        owner_name=payload.owner_name or "Plant Owner",
        test_mode=payload.test_mode or False
    )
    return result


@router.get("/director-pdf")
def download_director_pdf(
    plant_name: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
) -> Response:
    """Generates the 1-page vector PDF 'What HeatLedger did for you' for a director or banker."""
    org_id = user["organization_id"]
    resolved_plant_name = plant_name or user.get("plant_name") or user.get("organization_name") or "Works Division"
    pdf_bytes = RoiService.generate_monthly_director_pdf(
        organization_id=org_id,
        plant_name=resolved_plant_name
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=HeatLedger_Executive_Report.pdf"}
    )


@router.get("/unsubscribe")
def unsubscribe(token: str, email: str) -> Dict[str, Any]:
    """Unsubscribes from weekly briefing emails."""
    return {
        "status": "unsubscribed",
        "email": email,
        "message": "You have been successfully unsubscribed from the weekly HeatLedger AI executive briefing."
    }
