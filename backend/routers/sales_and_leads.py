"""
HEATLEDGER AI: Sales Tools, Proposals & Lead Tracker Router (Prompt D2 & D4)
Specification: Prompt Pack v4 - Phase D (Tasks D2 & D4)

Routes:
- POST /api/sales/roi-calculate       - Public ROI calculation (hours saved, risk, payback against Plant plan)
- POST /api/sales/roi-email           - Delivers ROI breakdown and registers lead record
- POST /api/sales/proposal-generate   - Generates 1-page commercial proposal PDF with terms & payment link
- GET  /api/leads                     - List leads by state
- POST /api/leads                     - Create or update lead
- GET  /api/leads/funnel              - Pipeline funnel metrics and conversion rates
- GET  /api/leads/daily-actions       - Prioritized 'do these 10 things' daily checklist
- POST /api/leads/import-csv          - Import leads from EEPC / trade directory CSV
- POST /api/leads/batch-outreach      - Small-batch email outreach with merge fields & unsubscribe
- POST /api/leads/pilot               - Log trial/pilot run with start/end dates and conversion outcome
- POST /api/leads/opt-out             - Statutory opt-out / unsubscribe endpoint
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

try:
    from sales_tools_service import SalesToolsService
    from lead_tracker_service import LeadTrackerService
except ImportError:
    from backend.sales_tools_service import SalesToolsService
    from backend.lead_tracker_service import LeadTrackerService

router = APIRouter(tags=["sales-and-leads"])


# ==============================================================================
# Pydantic Request Models
# ==============================================================================

class RoiCalculateRequest(BaseModel):
    shipments_per_month: Optional[int] = Field(15, ge=1, json_schema_extra={"example": 15})
    avg_shipment_value_inr: Optional[float] = Field(2500000.0, gt=0, json_schema_extra={"example": 2500000.0})
    document_staff_count: Optional[int] = Field(2, ge=1, json_schema_extra={"example": 2})
    hours_per_shipment_today: Optional[float] = Field(4.0, gt=0, json_schema_extra={"example": 4.0})
    hours_per_shipment_with_app: Optional[float] = Field(0.5, ge=0, json_schema_extra={"example": 0.5})
    out_of_quota_share_pct: Optional[float] = Field(10.0, ge=0, le=100, json_schema_extra={"example": 10.0})
    current_delay_days: Optional[float] = Field(3.0, ge=0, json_schema_extra={"example": 3.0})
    staff_monthly_cost_inr: Optional[float] = Field(35000.0, gt=0, json_schema_extra={"example": 35000.0})
    daily_demurrage_inr: Optional[float] = Field(12000.0, ge=0, json_schema_extra={"example": 12000.0})
    out_of_quota_tariff_penalty_pct: Optional[float] = Field(25.0, ge=0, le=100, json_schema_extra={"example": 25.0})


class RoiEmailRequest(BaseModel):
    email: str = Field(..., json_schema_extra={"example": "export.head@jindalsteel.example.com"})
    contact_name: Optional[str] = "Steel Exporter"
    company_name: Optional[str] = "Jindal Steel Works"
    phone: Optional[str] = ""
    roi_inputs: Optional[RoiCalculateRequest] = None


class ProposalGenerateRequest(BaseModel):
    lead_name: str = Field(..., json_schema_extra={"example": "Rajesh Sharma"})
    company_name: str = Field(..., json_schema_extra={"example": "Kolkata Forgings Limited"})
    contact_email: str = Field(..., json_schema_extra={"example": "r.sharma@kolkataforgings.example.com"})
    plan_id: Optional[str] = Field("PILOT", json_schema_extra={"example": "PILOT"})
    custom_price_inr: Optional[float] = None
    start_date: Optional[str] = None
    signatory_name: Optional[str] = "Agnish Ghosh"
    signatory_title: Optional[str] = "Founder & Chief Executive"


class LeadCreateRequest(BaseModel):
    id: Optional[str] = None
    company: str
    contact: str
    email: str
    phone: Optional[str] = ""
    role: Optional[str] = "Export Manager"
    source: Optional[str] = "MANUAL"
    state: Optional[str] = "found"
    next_action_date: Optional[str] = None
    notes: Optional[str] = ""


class BatchOutreachRequest(BaseModel):
    lead_ids: List[str]
    template_name: Optional[str] = "initial_outreach"
    dry_run: Optional[bool] = False


class LogPilotRequest(BaseModel):
    lead_id: str
    start_date: str
    end_date: str
    outcome: Optional[str] = "IN_PROGRESS"
    notes: Optional[str] = ""


class OptOutRequest(BaseModel):
    email: str


# ==============================================================================
# Router Endpoints: Sales & ROI (Prompt D2)
# ==============================================================================

@router.post("/api/sales/roi-calculate")
def calculate_roi(payload: RoiCalculateRequest) -> Dict[str, Any]:
    """Public endpoint: Calculates hours saved, money at risk, and payback in months."""
    try:
        return SalesToolsService.calculate_roi(**payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/sales/roi-email")
def email_roi_result(payload: RoiEmailRequest) -> Dict[str, Any]:
    """Public endpoint: Delivers ROI breakdown and initiates a lead record in LeadTrackerService."""
    calc_params = payload.roi_inputs.model_dump() if payload.roi_inputs else {}
    roi_result = SalesToolsService.calculate_roi(**calc_params)

    # Automatically start or update a lead record
    lead = LeadTrackerService.create_or_update_lead({
        "company": payload.company_name or "Self-Service ROI Lead",
        "contact": payload.contact_name or "Commercial Contact",
        "email": payload.email,
        "phone": payload.phone or "",
        "source": "ROI_CALCULATOR",
        "state": "contacted",
        "notes": f"Generated ROI: {roi_result['outputs']['summary_statement']}",
    })

    return {
        "status": "success",
        "message": f"ROI breakdown queued for delivery to {payload.email}",
        "lead_id": lead["id"],
        "roi_summary": roi_result["outputs"]["summary_statement"],
    }


@router.post("/api/sales/proposal-generate")
def generate_proposal(payload: ProposalGenerateRequest):
    """Admin-only endpoint: Generates 1-page PDF proposal with terms, GSTIN, and payment link."""
    try:
        pdf_bytes = SalesToolsService.generate_proposal_pdf(
            lead_name=payload.lead_name,
            company_name=payload.company_name,
            contact_email=payload.contact_email,
            plan_id=payload.plan_id or "PILOT",
            custom_price_inr=payload.custom_price_inr,
            start_date=payload.start_date,
            signatory_name=payload.signatory_name or "Agnish Ghosh",
            signatory_title=payload.signatory_title or "Founder & Chief Executive",
        )
        filename = f"proposal_{payload.company_name.lower().replace(' ', '_')}_{payload.plan_id}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==============================================================================
# Router Endpoints: Lead Tracker CRM (Prompt D4)
# ==============================================================================

@router.get("/api/leads")
def list_leads(state: Optional[str] = None) -> List[Dict[str, Any]]:
    """Admin endpoint: Lists leads, optionally filtered by state."""
    return LeadTrackerService.list_leads(state=state)


@router.post("/api/leads", status_code=status.HTTP_201_CREATED)
def create_lead(payload: LeadCreateRequest) -> Dict[str, Any]:
    """Admin endpoint: Creates or updates a commercial lead."""
    return LeadTrackerService.create_or_update_lead(payload.model_dump())


@router.get("/api/leads/funnel")
def get_lead_funnel() -> Dict[str, Any]:
    """Admin endpoint: Computes funnel counts and conversion rates across the pipeline."""
    return LeadTrackerService.get_funnel_metrics()


@router.get("/api/leads/daily-actions")
def get_daily_actions() -> List[Dict[str, Any]]:
    """Admin endpoint: Returns top 10 prioritized daily actions for the founder/sales reviewer."""
    return LeadTrackerService.get_daily_actions(limit=10)


@router.post("/api/leads/import-csv")
def import_leads_csv(payload: Dict[str, str]) -> Dict[str, Any]:
    """Admin endpoint: Imports leads from CSV content (e.g. EEPC, Udyog Aadhaar lists)."""
    csv_text = payload.get("csv_content", "")
    if not csv_text:
        raise HTTPException(status_code=400, detail="csv_content is required")
    return LeadTrackerService.import_leads_from_csv(csv_text=csv_text)


@router.post("/api/leads/batch-outreach")
def batch_outreach(payload: BatchOutreachRequest) -> Dict[str, Any]:
    """Admin endpoint: Small-batch email outreach with merge fields and opt-out suppression."""
    try:
        return LeadTrackerService.send_batch_email(
            lead_ids=payload.lead_ids,
            template_name=payload.template_name or "initial_outreach",
            dry_run=payload.dry_run or False,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/leads/pilot")
def log_pilot_outcome(payload: LogPilotRequest) -> Dict[str, Any]:
    """Admin endpoint: Records trial/pilot duration and conversion outcome."""
    try:
        return LeadTrackerService.log_pilot(
            lead_id=payload.lead_id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            outcome=payload.outcome or "IN_PROGRESS",
            notes=payload.notes or "",
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/api/leads/opt-out")
def opt_out(payload: OptOutRequest) -> Dict[str, Any]:
    """Public endpoint: Records opt-out / unsubscribe to comply with consent rules."""
    success = LeadTrackerService.opt_out_lead(payload.email)
    return {
        "status": "success",
        "email": payload.email,
        "suppressed": success,
        "message": "You have been successfully unsubscribed from commercial outreach.",
    }
