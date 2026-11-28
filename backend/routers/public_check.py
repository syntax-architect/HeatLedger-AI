"""
HEATLEDGER AI: Public Check, Marketing Leads & Demo Sandbox Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import base64
import hmac
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, ConfigDict, Field

try:
    from billing_service import PLANS, VALID_COUPONS
    from demo_service import DemoService
    from error_handling import safe_http_error
    from public_check_service import AnalyticsEventPayload, PublicCheckService, PublicLeadPayload
    from settings import get_webhook_secret
except ImportError:
    from backend.billing_service import PLANS, VALID_COUPONS
    from backend.demo_service import DemoService
    from backend.error_handling import safe_http_error
    from backend.public_check_service import AnalyticsEventPayload, PublicCheckService, PublicLeadPayload
    from backend.settings import get_webhook_secret

logger = logging.getLogger("heatledger.security")
router = APIRouter(tags=["Public Check & Demo"])


class LeadCaptureRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(..., max_length=200)
    email: str = Field(..., max_length=200)
    company: str = Field(..., max_length=200)
    phone: Optional[str] = Field(default="", max_length=50)
    monthly_containers: Optional[int] = Field(default=1, ge=0, le=10000)
    notes: Optional[str] = Field(default="", max_length=2000)
    website: Optional[str] = Field(default="", description="Honeypot field - must be empty")


@router.get("/api/public/plans")
def get_public_plans():
    return {
        "plans": PLANS,
        "sac_code": "998313",
        "gst_rate_pct": 18.0,
        "available_coupons": [
            {"code": code, "discount_pct": data["discount_pct"], "description": data["description"]}
            for code, data in VALID_COUPONS.items()
        ],
    }


@router.post("/api/leads")
def capture_marketing_lead(payload: LeadCaptureRequest):
    if payload.website and payload.website.strip():
        logger.warning("Honeypot triggered from bot. Payload dropped.")
        return {"status": "received", "lead_id": "bot_filtered"}

    leads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(leads_dir, exist_ok=True)
    leads_file = os.path.join(leads_dir, "leads.json")

    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    lead_record = {
        "id": lead_id,
        "name": payload.name,
        "email": payload.email,
        "company": payload.company,
        "phone": payload.phone,
        "monthly_containers": payload.monthly_containers,
        "notes": payload.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        leads = []
        if os.path.exists(leads_file):
            with open(leads_file, "r", encoding="utf-8") as f:
                leads = json.load(f)
        leads.append(lead_record)
        with open(leads_file, "w", encoding="utf-8") as f:
            json.dump(leads, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to persist lead record: {e}")

    logger.info(f"New verified audit lead captured: {payload.name} ({payload.company})")
    return {"status": "received", "lead_id": lead_id}


@router.post("/api/check/analyze")
async def analyze_public_mtc(request: Request, file: Optional[UploadFile] = File(None)):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    client_ip = raw_ip.split(",")[0].strip()
    turnstile_token = request.headers.get("x-turnstile-token") or request.query_params.get("turnstile_token")

    if file:
        content = await file.read()
        filename = file.filename or "uploaded_mtc.pdf"
    else:
        try:
            body = await request.json()
            b64 = body.get("file_base64", "")
            content = base64.b64decode(b64) if b64 else b""
            filename = body.get("filename", "uploaded_mtc.pdf")
            if not turnstile_token:
                turnstile_token = body.get("turnstile_token")
        except Exception:
            raise HTTPException(status_code=400, detail="Missing file or valid file_base64")

    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return PublicCheckService.analyze_mtc(
            file_bytes=content, filename=filename, client_ip=client_ip, turnstile_token=turnstile_token,
        )
    except ValueError as ve:
        raise safe_http_error(ve, status_code=400, fallback_message="Invalid file or request.", context="public_check.analyze")
    except PermissionError as pe:
        raise safe_http_error(pe, status_code=429, fallback_message="Rate limit exceeded.", context="public_check.analyze")
    except Exception as e:
        logger.error(f"Public check analysis failure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Document analysis failed. Please try again.")


@router.post("/api/check/lead")
def capture_public_check_lead(payload: PublicLeadPayload, request: Request):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    client_ip = raw_ip.split(",")[0].strip()
    try:
        return PublicCheckService.capture_lead(payload, client_ip=client_ip)
    except ValueError as ve:
        raise safe_http_error(ve, status_code=422, fallback_message="Invalid lead payload.", context="public_check.lead")
    except Exception as e:
        logger.error(f"Lead capture failure: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed capturing lead.")


@router.post("/api/check/cleanup")
def cleanup_public_check_files(request: Request):
    expected_secret = get_webhook_secret("CRON_SECRET")
    authorization = request.headers.get("authorization")
    provided_secret = (
        request.headers.get("x-cron-secret")
        or (authorization.replace("Bearer ", "") if authorization else None)
    )
    if not expected_secret or not provided_secret or not hmac.compare_digest(provided_secret, expected_secret):
        raise HTTPException(status_code=401, detail="Unauthorized: invalid cron secret")
    deleted = PublicCheckService.cleanup_expired_files(max_age_seconds=86400)
    return {"status": "ok", "deleted_directories": deleted}


@router.get("/api/check/seo")
def list_check_seo_articles():
    return {"articles": PublicCheckService.list_seo_articles()}


@router.get("/api/check/seo/{slug}")
def get_check_seo_article(slug: str):
    article = PublicCheckService.get_seo_article(slug)
    if not article:
        raise HTTPException(status_code=404, detail=f"SEO guide article '{slug}' not found.")
    return article


@router.post("/api/analytics/event")
def record_public_analytics_event(payload: AnalyticsEventPayload, request: Request):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    client_ip = raw_ip.split(",")[0].strip()
    return PublicCheckService.record_analytics_event(
        event_name=payload.event_name, check_id=payload.check_id,
        source_page=payload.source_page, client_ip=client_ip,
    )


@router.get("/api/check/analytics/summary")
@router.get("/api/analytics/public-summary")
def get_public_analytics_summary():
    return PublicCheckService.get_analytics_summary()


@router.post("/api/demo/load")
def load_demo_plant():
    try:
        return DemoService.load_demo_plant()
    except Exception as e:
        logger.error(f"Failed loading demo plant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initialize demo plant.")


@router.post("/api/demo/reset")
def reset_demo_plant():
    try:
        return DemoService.reset_demo_plant()
    except Exception as e:
        logger.error(f"Failed resetting demo plant: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to reset demo plant.")


@router.get("/api/demo/overview")
def get_demo_overview():
    return {
        "demo_org_id": "org_demo_sandbox",
        "guided_tour_steps": DemoService.get_guided_tour_steps(),
        "public_demo_url": "/share/tok_demo_sample_pack_2026",
    }


@router.get("/api/demo/sample-pack")
def download_sample_pack_pdf():
    try:
        pdf_bytes = DemoService.generate_sample_watermarked_pdf()
        return Response(
            content=pdf_bytes, media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="SAMPLE_MTC_TS-88190.pdf"'},
        )
    except Exception as e:
        logger.error(f"Failed generating sample PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed generating sample pack PDF.")
