"""
HEATLEDGER AI: Easy Intake API Router (Prompt C8)
Endpoints:
- GET  /api/intake/config: Organization private intake email configuration
- POST /api/intake/allowed-senders: Add allowed sender email or wildcard domain
- GET  /api/intake/allowed-senders: List whitelist senders
- POST /api/intake/email-webhook: Inbound email webhook with HMAC signature verification
- POST /api/intake/batch-upload: Drag-and-drop batch upload of up to 50 PDFs/photos
- GET  /api/intake/template/{template_type}: Download standard CSV import templates
- POST /api/intake/excel-dry-run: Dry run validation reporting row-level errors
- POST /api/intake/excel-import: Commits valid rows into 'To Check' staging inbox
- GET  /api/intake/inbox: Summary counts and recent pending items for review
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Request
from pydantic import BaseModel, Field

try:
    from backend.easy_intake_service import EasyIntakeService
    from backend.dependencies import get_current_user
    from backend.error_handling import safe_http_error
except ImportError:
    from easy_intake_service import EasyIntakeService
    from dependencies import get_current_user
    from error_handling import safe_http_error

router = APIRouter(tags=["Easy Intake Engine"])


class AddSenderRequest(BaseModel):
    sender_pattern: str = Field(..., min_length=3, max_length=128, description="Email or @domain.com")
    description: Optional[str] = None


class ExcelImportRequest(BaseModel):
    template_type: str = Field(..., description="SHIPMENTS, HEAT_ALLOCATIONS, or TALLY_SALES")
    csv_content: str = Field(..., min_length=5)
    dry_run: bool = True
    custom_column_mapping: Optional[Dict[str, str]] = None


# =============================================================================
# Organization Intake Config & Allowed Senders (Authenticated)
# =============================================================================

@router.get("/api/intake/config")
def get_intake_config(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return EasyIntakeService.get_or_create_org_intake_config(org_id)


@router.post("/api/intake/allowed-senders")
def add_allowed_sender(payload: AddSenderRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return EasyIntakeService.add_allowed_sender(org_id, payload.sender_pattern, payload.description)


@router.get("/api/intake/allowed-senders")
def list_allowed_senders(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return EasyIntakeService.list_allowed_senders(org_id)


# =============================================================================
# Inbound Email Webhook (Signature Verified, Public Webhook)
# =============================================================================

@router.post("/api/intake/email-webhook")
async def email_webhook(request: Request, x_webhook_signature: Optional[str] = Header(None)):
    raw_body = await request.body()
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    try:
        return EasyIntakeService.process_inbound_email_webhook(
            payload=payload,
            signature_header=x_webhook_signature,
            raw_body=raw_body
        )
    except PermissionError as e:
        raise safe_http_error(e, status_code=403, fallback_message="Sender not permitted.", context="intake.webhook")
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Invalid webhook payload.", context="intake.webhook")


# =============================================================================
# Batch Upload (Authenticated)
# =============================================================================

@router.post("/api/intake/batch-upload")
async def batch_upload(files: List[UploadFile] = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    file_tuples = []
    for f in files:
        contents = await f.read()
        file_tuples.append((f.filename or "unknown.pdf", contents))

    try:
        return EasyIntakeService.ingest_batch_files(org_id, file_tuples)
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Invalid batch or import request.", context="intake.import")


# =============================================================================
# Excel / CSV Import & Templates (Authenticated)
# =============================================================================

@router.get("/api/intake/template/{template_type}")
def get_template(template_type: str):
    try:
        return EasyIntakeService.get_template_definition(template_type)
    except ValueError as e:
        raise safe_http_error(e, status_code=404, fallback_message="Intake template not found.", context="intake.template")


@router.post("/api/intake/excel-dry-run")
def excel_dry_run(payload: ExcelImportRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    try:
        return EasyIntakeService.execute_import(
            organization_id=org_id,
            csv_content=payload.csv_content,
            template_type=payload.template_type,
            dry_run=True,
            custom_column_mapping=payload.custom_column_mapping
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Invalid batch or import request.", context="intake.import")


@router.post("/api/intake/excel-import")
def excel_import(payload: ExcelImportRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    try:
        return EasyIntakeService.execute_import(
            organization_id=org_id,
            csv_content=payload.csv_content,
            template_type=payload.template_type,
            dry_run=False,
            custom_column_mapping=payload.custom_column_mapping
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Invalid batch or import request.", context="intake.import")


# =============================================================================
# 'To Check' Staging Inbox (Authenticated)
# =============================================================================

@router.get("/api/intake/inbox")
def get_inbox(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return EasyIntakeService.get_inbox_summary(org_id)
