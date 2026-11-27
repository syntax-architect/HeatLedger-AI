"""
HEATLEDGER AI: Regulation Radar & ROI Proof-of-Value Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from dependencies import extract_org_id, require_roles
    from radar_service import RadarService
    from roi_service import RoiService
except ImportError:
    from backend.dependencies import extract_org_id, require_roles
    from backend.radar_service import RadarService
    from backend.roi_service import RoiService

router = APIRouter(tags=["Radar & ROI"])


class PublishBulletinPayload(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    summary: str = Field(..., min_length=10)
    source_url: str = Field(..., min_length=5)
    jurisdiction: str = "EU"
    tags: Optional[List[str]] = None


class ReportRadarErrorPayload(BaseModel):
    regulation_id: str
    reporter_name: str
    reporter_email: str
    reported_issue: str
    suggested_correction: Optional[str] = None
    source_reference: Optional[str] = None


class UpdateRoiConfigPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    manual_baseline_minutes: float = Field(..., ge=1.0, le=300.0)
    qa_hourly_rate_inr: float = Field(..., ge=100.0, le=10000.0)


class CreateRoiShareLinkPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    month_period: str = Field(..., max_length=10)


class GenerateRoiPdfPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    month_period: str = Field(..., max_length=10)
    custom_baseline_minutes: Optional[float] = Field(None, ge=1.0, le=300.0)
    custom_hourly_rate: Optional[float] = Field(None, ge=100.0, le=10000.0)


@router.get("/api/radar/regulations")
def list_radar_regulations(
    plant_cn_code: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    status: Optional[str] = None,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    codes = [plant_cn_code] if plant_cn_code else None
    return RadarService.list_regulations(plant_cn_codes=codes, jurisdiction=jurisdiction, status=status)


@router.get("/api/radar/regulations/{reg_id}")
def get_radar_regulation(
    reg_id: str,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    reg = RadarService.get_regulation_by_id(reg_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Regulation milestone not found")
    return reg


@router.get("/api/radar/regulations/{reg_id}/export.ics")
def export_radar_ics(reg_id: str):
    reg = RadarService.get_regulation_by_id(reg_id)
    if not reg:
        raise HTTPException(status_code=404, detail="Regulation milestone not found")
    return Response(
        content=RadarService.generate_ics(reg), media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="{reg_id}.ics"'},
    )


@router.get("/api/radar/bulletins")
def list_radar_bulletins(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return {"bulletins": RadarService.list_bulletins()}


@router.post("/api/radar/bulletins")
def publish_radar_bulletin(
    payload: PublishBulletinPayload,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER"])),
):
    return RadarService.publish_bulletin(
        title=payload.title, summary=payload.summary, source_url=payload.source_url,
        jurisdiction=payload.jurisdiction, published_by=user_payload.get("sub", "Admin Compliance Desk"),
        tags=payload.tags,
    )


@router.post("/api/radar/report-error")
def report_radar_error(
    payload: ReportRadarErrorPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return RadarService.report_error(
        regulation_id=payload.regulation_id, reporter_name=payload.reporter_name,
        reporter_email=payload.reporter_email, reported_issue=payload.reported_issue,
        suggested_correction=payload.suggested_correction, source_reference=payload.source_reference,
    )


@router.get("/api/roi/monthly-report")
def get_monthly_roi_report(
    month_period: str = Query("2026-01", max_length=10),
    custom_baseline_minutes: Optional[float] = Query(None, ge=1.0, le=300.0),
    custom_hourly_rate: Optional[float] = Query(None, ge=100.0, le=10000.0),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return RoiService.get_monthly_report(
        organization_id=extract_org_id(user_payload), month_period=month_period,
        custom_baseline_minutes=custom_baseline_minutes, custom_hourly_rate=custom_hourly_rate,
    )


@router.post("/api/roi/config")
def update_roi_config(
    payload: UpdateRoiConfigPayload,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER", "QA_HEAD", "QA_INSPECTOR"])),
):
    return RoiService.update_plant_config(
        organization_id=extract_org_id(user_payload),
        manual_baseline_minutes=payload.manual_baseline_minutes,
        qa_hourly_rate_inr=payload.qa_hourly_rate_inr,
    )


@router.post("/api/roi/share-link")
def create_roi_share_link(
    payload: CreateRoiShareLinkPayload,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER", "QA_HEAD", "QA_INSPECTOR"])),
):
    user_name = user_payload.get("name") or user_payload.get("email") or "Plant Owner"
    return RoiService.create_share_link(
        organization_id=extract_org_id(user_payload), month_period=payload.month_period, created_by=user_name,
    )


@router.get("/api/roi/public/{token}")
def get_public_roi_report(token: str):
    report = RoiService.get_public_report_by_token(token)
    if not report:
        raise HTTPException(status_code=404, detail="Shared ROI report not found or link has expired.")
    return report


@router.get("/api/roi/annual-view")
def get_annual_roi_view(
    year: int = Query(2026, ge=2024, le=2035),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return RoiService.get_annual_view(organization_id=extract_org_id(user_payload), year=year)


@router.post("/api/roi/pdf-report")
def export_roi_pdf_report(
    payload: GenerateRoiPdfPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    report = RoiService.get_monthly_report(
        organization_id=extract_org_id(user_payload), month_period=payload.month_period,
        custom_baseline_minutes=payload.custom_baseline_minutes, custom_hourly_rate=payload.custom_hourly_rate,
    )
    return Response(
        content=RoiService.generate_pdf_report(report), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="ROI_Report_{payload.month_period}.pdf"'},
    )


@router.get("/api/roi/email-digest")
def get_roi_email_digest(
    month_period: str = Query("2026-01", max_length=10),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    report = RoiService.get_monthly_report(organization_id=extract_org_id(user_payload), month_period=month_period)
    return RoiService.generate_email_digest(report)
