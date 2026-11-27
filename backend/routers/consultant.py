"""
HEATLEDGER AI: Consultant Portal, Data Assistant & Analytics Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from analytics_service import AnalyticsService
    from assistant_service import AssistantService
    from auth_service import AuthService
    from consultant_service import consultant_service
    from dependencies import extract_org_id, require_roles
    from product_analytics_service import ProductAnalyticsService
    from public_check_service import PublicCheckService
except ImportError:
    from backend.analytics_service import AnalyticsService
    from backend.assistant_service import AssistantService
    from backend.auth_service import AuthService
    from backend.consultant_service import consultant_service
    from backend.dependencies import extract_org_id, require_roles
    from backend.product_analytics_service import ProductAnalyticsService
    from backend.public_check_service import PublicCheckService

router = APIRouter(tags=["Consultant, Assistant & Analytics"])


class ConsultantClientInviteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    plant_id: str
    plant_name: str
    plant_code: str
    gst_or_pan: Optional[str] = None
    location: Optional[str] = "India"
    role: str = "QA_CONSULTANT"
    duration_days: int = 365
    consultant_org_id: Optional[str] = None


class ConsultantClientRevokeRequest(BaseModel):
    plant_id: str
    consultant_org_id: Optional[str] = None


class ConsultantBulkOnboardRequest(BaseModel):
    csv_content: str
    consultant_org_id: Optional[str] = None


class ConsultantWhiteLabelRequest(BaseModel):
    firm_name: str
    logo_url: Optional[str] = None
    primary_color: str = "#0f172a"
    secondary_color: str = "#10b981"
    custom_domain: Optional[str] = None
    tagline: Optional[str] = None
    show_consultant_brand_on_pdf: bool = True
    show_consultant_brand_on_portal: bool = True


class AssistantChatPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message: str = Field(..., min_length=1, max_length=1000)
    conversation_history: Optional[List[Dict[str, str]]] = None


class AnalyticsEventPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_name: str
    properties: Optional[Dict[str, Any]] = None


@router.get("/api/consultant/portfolio")
def get_consultant_portfolio(
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.get_consultant_portfolio(c_org)


@router.get("/api/consultant/at-risk-shipments")
def get_consultant_at_risk_shipments(
    plant_id: Optional[str] = Query(None, description="Optional plant filter with strict RLS validation"),
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    try:
        return consultant_service.get_cross_client_at_risk_shipments(c_org, plant_id_filter=plant_id)
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))


@router.get("/api/consultant/review-queue")
def get_consultant_review_queue(
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.get_cross_client_review_queue(c_org)


@router.post("/api/consultant/clients/invite")
def invite_client_plant(
    req: ConsultantClientInviteRequest,
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = req.consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    acting_user = user_payload.get("sub") or user_payload.get("email") or "usr_owner"
    return consultant_service.invite_or_grant_client_access(
        consultant_org_id=c_org, plant_id=req.plant_id, plant_name=req.plant_name,
        plant_code=req.plant_code, gst_or_pan=req.gst_or_pan or "", location=req.location or "India",
        role=req.role, duration_days=req.duration_days, acting_user_id=acting_user,
    )


@router.post("/api/consultant/clients/revoke")
def revoke_client_access(
    req: ConsultantClientRevokeRequest,
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = req.consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    acting_user = user_payload.get("sub") or user_payload.get("email") or "usr_owner"
    try:
        return consultant_service.revoke_client_access(
            plant_id=req.plant_id, consultant_org_id=c_org, acting_user_id=acting_user,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/api/consultant/clients/bulk-onboard")
def bulk_onboard_clients(
    req: ConsultantBulkOnboardRequest,
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = req.consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    acting_user = user_payload.get("sub") or user_payload.get("email") or "usr_admin"
    return consultant_service.bulk_onboard_clients_from_csv(
        consultant_org_id=c_org, csv_content=req.csv_content, acting_user_id=acting_user,
    )


@router.get("/api/consultant/white-label")
def get_white_label_settings(
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.get_white_label_config(c_org)


@router.post("/api/consultant/white-label")
def update_white_label_settings(
    req: ConsultantWhiteLabelRequest,
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.update_white_label_config(c_org, req.model_dump())


@router.get("/api/consultant/invoices/consolidated")
@router.get("/api/consultant/consolidated-invoice")
def get_consolidated_invoice(
    billing_month: str = Query("2026-04", pattern=r"^\d{4}-\d{2}$"),
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.get_consolidated_invoice(c_org, billing_month=billing_month)


@router.get("/api/consultant/referrals")
def get_consultant_referrals(
    consultant_org_id: Optional[str] = Query(None),
    user_payload: dict = Depends(require_roles(["OWNER", "CONSULTANT"])),
):
    c_org = consultant_org_id or user_payload.get("consultant_org_id") or "org_consultant_singhania"
    return consultant_service.get_referral_tracking(c_org)


@router.post("/api/assistant/chat")
def assistant_chat(
    payload: AssistantChatPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AssistantService.process_chat(
        organization_id=extract_org_id(user_payload),
        user_message=payload.message,
        conversation_history=payload.conversation_history,
    )


@router.get("/api/assistant/suggested-prompts")
def get_assistant_suggested_prompts(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return {"prompts": AssistantService.get_suggested_prompts()}


@router.get("/api/assistant/usage")
def get_assistant_token_usage(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AssistantService.get_token_usage(organization_id=extract_org_id(user_payload))


@router.get("/api/analytics/emissions-trend")
def get_emissions_trend(
    range: str = Query("90d", pattern=r"^(30d|90d|1y|all)$"),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AnalyticsService.get_emissions_trend(organization_id=extract_org_id(user_payload), date_range=range)


@router.get("/api/analytics/cbam-forecast")
def get_cbam_liability_forecast(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AnalyticsService.get_cbam_liability_forecast(organization_id=extract_org_id(user_payload))


@router.get("/api/analytics/mill-benchmarking")
def get_mill_benchmarking(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AnalyticsService.get_mill_benchmarking(organization_id=extract_org_id(user_payload))


@router.get("/api/analytics/inventory-grades")
def get_inventory_grades(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AnalyticsService.get_inventory_grade_distribution(organization_id=extract_org_id(user_payload))


@router.get("/api/analytics/export.csv")
def export_analytics_csv(
    chart_type: str = Query("emissions", pattern=r"^(emissions|forecast|mills)$"),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return Response(
        content=AnalyticsService.export_chart_data_csv(organization_id=extract_org_id(user_payload), chart_type=chart_type),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="Analytics_{chart_type}.csv"'},
    )


@router.post("/api/analytics/track")
def track_product_analytics_event(payload: AnalyticsEventPayload, request: Request):
    org_id = "org_guest"
    user_id = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            is_valid, claims, _ = AuthService.verify_jwt(auth_header.split(" ", 1)[1])
            if is_valid and claims:
                org_id = claims.get("organization_id") or claims.get("org_id") or "org_guest"
                user_id = claims.get("sub") or claims.get("user_id")
        except Exception:
            pass
    try:
        return ProductAnalyticsService.record_event(
            organization_id=org_id, event_name=payload.event_name, user_id=user_id, properties=payload.properties,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/api/analytics/summary")
def get_product_analytics_summary(request: Request):
    res = dict(PublicCheckService.get_analytics_summary())
    org_id = None
    role = ""
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            is_valid, claims, _ = AuthService.verify_jwt(auth_header.split(" ", 1)[1])
            if is_valid and claims:
                org_id = claims.get("organization_id") or claims.get("org_id")
                role = claims.get("role", "")
        except Exception:
            pass
    prod_summary = (
        ProductAnalyticsService.get_event_summary()
        if ("ADMIN" in role or not org_id)
        else ProductAnalyticsService.get_event_summary(organization_id=org_id)
    )
    res["summary"] = prod_summary
    return res
