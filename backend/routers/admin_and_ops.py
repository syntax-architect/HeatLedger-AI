"""
HEATLEDGER AI: Super-Admin, Privacy, Email Webhooks, Support, Vitals, Status & Cron Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import hmac
import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from admin_service import AdminService
    from auth_service import AuthService
    from db.connection import get_db_connection
    from dependencies import get_current_user, require_roles
    from email_service import EmailService
    from error_handling import safe_http_error
    from privacy_service import PrivacyService
    from settings import get_webhook_secret
    from support_service import SupportService
except ImportError:
    from backend.admin_service import AdminService
    from backend.auth_service import AuthService
    from backend.db.connection import get_db_connection
    from backend.dependencies import get_current_user, require_roles
    from backend.email_service import EmailService
    from backend.error_handling import safe_http_error
    from backend.privacy_service import PrivacyService
    from backend.settings import get_webhook_secret
    from backend.support_service import SupportService

router = APIRouter(tags=["Admin, Privacy & Operations"])

_WEB_VITALS_BUFFER: List[Dict[str, Any]] = []


class WebVitalReport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(..., pattern="^(LCP|FID|CLS|FCP|TTFB|INP)$")
    value: float
    rating: str = Field(default="good", pattern="^(good|needs-improvement|poor)$")
    delta: Optional[float] = None
    id: Optional[str] = None
    navigationType: Optional[str] = None
    url: Optional[str] = None


class ImpersonationPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str = Field(..., min_length=5, max_length=500)


class KillSwitchPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    flag: str
    enabled: bool


class UpdatePrivacySettingsRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    retention_years: Optional[int] = Field(None, ge=1, le=20)
    ai_extraction_consent: Optional[bool] = None


class SupportTicketPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    screen_name: str = Field(..., max_length=100)
    message: str = Field(..., min_length=2, max_length=2000)
    request_id: Optional[str] = None
    contact_email: Optional[str] = None


@router.post("/api/vitals")
def record_web_vital(vital: WebVitalReport):
    entry = vital.model_dump()
    entry["received_at"] = datetime.now(timezone.utc).isoformat()
    _WEB_VITALS_BUFFER.append(entry)
    if len(_WEB_VITALS_BUFFER) > 1000:
        _WEB_VITALS_BUFFER.pop(0)
    return {"status": "recorded", "metric": vital.name}


@router.get("/api/vitals/summary")
def get_web_vitals_summary():
    metrics_by_name: Dict[str, List[float]] = {}
    for item in _WEB_VITALS_BUFFER:
        metrics_by_name.setdefault(item["name"], []).append(item["value"])
    budgets = {"LCP": 2500.0, "CLS": 0.1, "FID": 100.0, "FCP": 1800.0, "TTFB": 800.0, "INP": 200.0}
    summary = {}
    for name, vals in metrics_by_name.items():
        vals.sort()
        count = len(vals)
        summary[name] = {
            "count": count,
            "avg": round(sum(vals) / count, 2) if count else 0,
            "p75": round(vals[min(int(count * 0.75), count - 1)], 2) if count else 0,
            "budget": budgets.get(name, 1000.0),
        }
    return {"status": "ok", "total_records": len(_WEB_VITALS_BUFFER), "summary": summary}


@router.get("/api/admin/metrics")
def get_admin_metrics(user_payload: dict = Depends(require_roles(["ADMIN"]))):
    return AdminService.get_system_metrics()


@router.get("/api/admin/jobs")
def get_admin_jobs(status: Optional[str] = Query(None), user_payload: dict = Depends(require_roles(["ADMIN"]))):
    return {"jobs": AdminService.list_jobs(status_filter=status)}


@router.post("/api/admin/jobs/{job_id}/retry")
def retry_admin_job(job_id: str, user_payload: dict = Depends(require_roles(["ADMIN"]))):
    if not AdminService.retry_job(job_id=job_id):
        raise HTTPException(status_code=400, detail="Job not in retriable state or does not exist")
    return {"status": "RETRY_QUEUED", "job_id": job_id}


@router.post("/api/admin/impersonate/{org_id}")
def impersonate_tenant(org_id: str, payload: ImpersonationPayload, user_payload: dict = Depends(require_roles(["ADMIN"]))):
    return AdminService.generate_impersonation_token(
        admin_user_id=user_payload.get("sub") or "admin", target_org_id=org_id, reason=payload.reason,
    )


@router.post("/api/admin/kill-switch")
def toggle_kill_switch(payload: KillSwitchPayload, user_payload: dict = Depends(require_roles(["ADMIN"]))):
    return AdminService.update_kill_switch(flag_name=payload.flag, enabled=payload.enabled)


@router.post("/api/email/webhooks/resend")
async def handle_resend_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = body.get("type", "")
    recipients = (body.get("data") or {}).get("to") or []
    if isinstance(recipients, str):
        recipients = [recipients]
    elif not isinstance(recipients, list):
        recipients = []

    if event_type == "email.bounced":
        for recipient in recipients:
            EmailService.suppress_email(recipient, reason="BOUNCE", source="RESEND_WEBHOOK")
        return {"status": "ok", "event": "email.bounced", "suppressed": recipients}
    elif event_type == "email.complained":
        for recipient in recipients:
            EmailService.suppress_email(recipient, reason="COMPLAINT", source="RESEND_WEBHOOK")
        return {"status": "ok", "event": "email.complained", "suppressed": recipients}
    return {"status": "ignored", "event": event_type}


@router.get("/api/email/unsubscribe")
def unsubscribe_email(token: str = Query(..., description="One-click unsubscribe token")):
    email = EmailService.process_unsubscribe(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired unsubscribe token")
    brand = os.getenv("BRAND_NAME", "HeatLedger")
    return {"status": "unsubscribed", "email": email, "message": f"You have been successfully unsubscribed from {brand} notifications."}


@router.get("/api/privacy/settings")
def get_privacy_settings(current_user=Depends(get_current_user)):
    return PrivacyService.get_settings(current_user.get("organization_id"))


@router.post("/api/privacy/settings")
def update_privacy_settings(payload: UpdatePrivacySettingsRequest, current_user=Depends(require_roles(["OWNER"]))):
    user_id = current_user.get("user_id") or current_user.get("id") or "usr_owner"
    try:
        return PrivacyService.update_settings(
            organization_id=current_user.get("organization_id"),
            retention_years=payload.retention_years,
            ai_extraction_consent=payload.ai_extraction_consent,
            updated_by=user_id,
        )
    except ValueError as ve:
        raise safe_http_error(ve, status_code=400, fallback_message="Invalid privacy settings.", context="privacy.update")


@router.get("/api/privacy/export")
def export_customer_data_archive(current_user=Depends(require_roles(["OWNER"]))):
    org_id = current_user.get("organization_id")
    user_id = current_user.get("user_id") or current_user.get("id") or "usr_owner"
    return Response(
        content=PrivacyService.export_organization_archive(org_id, performed_by=user_id),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="HeatLedger_Data_Export_{org_id}.zip"'},
    )


@router.post("/api/privacy/delete-request")
def request_customer_data_deletion(current_user=Depends(require_roles(["OWNER"]))):
    user_id = current_user.get("user_id") or current_user.get("id") or "usr_owner"
    return PrivacyService.request_organization_deletion(current_user.get("organization_id"), performed_by=user_id)


@router.post("/api/privacy/cancel-deletion")
def cancel_customer_data_deletion(current_user=Depends(require_roles(["OWNER"]))):
    user_id = current_user.get("user_id") or current_user.get("id") or "usr_owner"
    return PrivacyService.cancel_deletion_request(current_user.get("organization_id"), performed_by=user_id)


@router.get("/status")
@router.get("/api/status")
def get_system_status():
    db_status = "connected"
    try:
        with get_db_connection(is_service_role=True) as conn:
            conn.cursor().execute("SELECT 1")
    except Exception as e:
        db_status = f"degraded: {e}"

    extraction_status = "ready"
    try:
        import pymupdf  # noqa: F401
    except ImportError:
        try:
            import fitz  # noqa: F401
        except ImportError:
            extraction_status = "degraded: local engine missing"

    is_healthy = db_status == "connected" and extraction_status == "ready"
    return {
        "status": "healthy" if is_healthy else "degraded",
        "api": "ok",
        "database": db_status,
        "extraction_service": extraction_status,
        "version": "2.0.0",
        "regulatory_version": "2026.1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _optional_org_and_user(request: Optional[Request]) -> tuple[str, Optional[str]]:
    org_id, user_id = "org_guest", None
    auth_header = request.headers.get("authorization") if request else None
    if auth_header and auth_header.startswith("Bearer "):
        try:
            is_valid, claims, _ = AuthService.verify_jwt(auth_header.split(" ", 1)[1])
            if is_valid and claims:
                org_id = claims.get("organization_id") or claims.get("org_id") or "org_guest"
                user_id = claims.get("sub") or claims.get("user_id")
        except Exception:
            pass
    return org_id, user_id


@router.post("/api/support/ticket")
def create_support_ticket(payload: SupportTicketPayload, request: Request):
    org_id, user_id = _optional_org_and_user(request)
    req_id = payload.request_id or getattr(request.state, "request_id", None)
    try:
        return SupportService.create_ticket(
            organization_id=org_id, screen_name=payload.screen_name, message=payload.message,
            user_id=user_id, request_id=req_id, contact_email=payload.contact_email,
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=422, fallback_message="Invalid support ticket payload.", context="support.create_ticket")


@router.get("/api/support/help-links")
def get_support_help_links(screen_name: str = Query("dashboard"), request: Request = None):
    org_id, _ = _optional_org_and_user(request)
    req_id = getattr(request.state, "request_id", None) if request else None
    return {
        "whatsapp_url": SupportService.build_whatsapp_help_url(organization_id=org_id, screen_name=screen_name),
        "email_url": SupportService.build_email_help_url(organization_id=org_id, screen_name=screen_name, request_id=req_id),
        "organization_id": org_id,
        "screen_name": screen_name,
        "request_id": req_id,
    }


@router.post("/api/cron/tick")
def trigger_scheduled_tasks(request: Request):
    expected_secret = get_webhook_secret("CRON_SECRET")
    authorization = request.headers.get("authorization")
    provided_secret = (
        request.headers.get("x-cron-secret")
        or request.query_params.get("secret")
        or (authorization.replace("Bearer ", "") if authorization else None)
    )
    if not expected_secret or not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=401, detail="Unauthorized: invalid cron secret")
    return {"status": "SUCCESS", "timestamp": datetime.now(timezone.utc).isoformat(), "jobs_processed": 0}
