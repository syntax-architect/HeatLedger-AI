"""
HEATLEDGER AI: OCR, Documents, Extraction & Standards Validation Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from auth_service import AuthService
    from billing_service import BillingService
    from dependencies import get_current_user
    from document_service import DocumentService, DocumentValidationError
    from error_handling import safe_http_error
    from extraction_service import ExtractionService
    from mtc_ocr_service import MTCOCRService
    from upload_utils import read_uploaded_file_stream
    from validation_engine import StandardsLibrary, ValidationEngine
except ImportError:
    from backend.auth_service import AuthService
    from backend.billing_service import BillingService
    from backend.dependencies import get_current_user
    from backend.document_service import DocumentService, DocumentValidationError
    from backend.error_handling import safe_http_error
    from backend.extraction_service import ExtractionService
    from backend.mtc_ocr_service import MTCOCRService
    from backend.upload_utils import read_uploaded_file_stream
    from backend.validation_engine import StandardsLibrary, ValidationEngine

logger = logging.getLogger("heatledger.security")
router = APIRouter(tags=["Documents, OCR & Validation"])
ocr_service = MTCOCRService()


class DocumentVerifyIntegrityRequest(BaseModel):
    file_ext: str = Field(default="pdf", min_length=1, max_length=16, pattern=r"^[a-zA-Z0-9]{1,16}$")
    organization_id: Optional[str] = Field(default=None, max_length=128)
    model_config = ConfigDict(extra="forbid")


class ExtractionCorrectionRequest(BaseModel):
    sha256: str = Field(..., min_length=64, max_length=64, pattern=r"^[a-fA-F0-9]{64}$")
    field_name: str = Field(..., min_length=1, max_length=128)
    corrected_value: str = Field(..., max_length=4000)
    model_config = ConfigDict(extra="forbid")


class CertificateValidationRequest(BaseModel):
    grade: str = Field(..., description="Steel grade, e.g. S355JR, IS 2062 E250")
    certificate_type: str = Field(default="EN 10204 3.1")
    country_of_melt_and_pour: str = Field(default="India")
    heat_number: str = Field(...)
    standard_code: Optional[str] = None
    chemistry: Dict[str, float] = Field(default_factory=dict)
    mechanics: Dict[str, Any] = Field(default_factory=dict)
    model_config = ConfigDict(extra="forbid")


@router.post("/api/ocr/extract-mtc")
@router.post("/api/mtc/extract")
async def extract_mtc(request: Request, file: UploadFile = File(...)):
    try:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            valid, claims, _ = AuthService.verify_jwt(token)
            if valid and claims and "org_id" in claims:
                try:
                    BillingService.check_and_increment_quota(claims["org_id"])
                except PermissionError as pe:
                    raise HTTPException(status_code=402, detail=f"Plan quota exhausted: {pe}")

        content = await read_uploaded_file_stream(file, allowed_types=["pdf", "png", "jpeg"])
        return ocr_service.extract_mtc(content, file_name=file.filename or "mtc.pdf")
    except HTTPException:
        raise
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] OCR extraction error: {e}", exc_info=True)
        return JSONResponse(
            status_code=202,
            content={"status": "queued", "message": "We will read this shortly", "flagged_for_review": True, "request_id": request_id},
        )


@router.post("/api/documents/upload")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    plant_id: Optional[str] = Form(None),
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        content = await file.read()
        org_id = user["organization_id"]
        return DocumentService.ingest_document(
            content=content, file_name=file.filename or "upload.bin",
            organization_id=org_id, plant_id=plant_id or user.get("plant_id"),
        )
    except DocumentValidationError as ve:
        raise safe_http_error(ve, status_code=400, fallback_message="Document validation failed.", context="documents.upload")
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Document upload error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Document ingestion failed", "request_id": request_id})


@router.get("/api/documents/{sha256}/download")
def download_document(
    sha256: str,
    request: Request,
    token: Optional[str] = Query(None),
    expires: Optional[int] = Query(None),
    signature: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    file_ext: str = "pdf",
):
    org_id = None
    try:
        user = get_current_user(request)
        if user:
            org_id = user.get("organization_id")
    except Exception:
        pass

    if token:
        effective_org = org_id or organization_id or ""
        if not DocumentService.verify_download_token(token, expected_doc_id=sha256, user_organization_id=effective_org):
            raise HTTPException(status_code=403, detail="Download token is invalid, expired, or belongs to another organization.")
        if not org_id:
            org_id = organization_id
    elif expires is not None and signature is not None:
        if not DocumentService.verify_signed_url(sha256, action="download", expires_at=expires, signature=signature):
            raise HTTPException(status_code=403, detail="Download URL has expired or has an invalid signature.")
        if not org_id:
            org_id = organization_id
    else:
        raise HTTPException(status_code=400, detail="Missing required download token or signature parameters.")

    if not org_id:
        raise HTTPException(status_code=401, detail="Authentication required or organization context missing.")

    integrity = DocumentService.verify_document_integrity(org_id, sha256, file_ext)
    if not integrity.get("verified"):
        raise HTTPException(status_code=404, detail="Requested document not found or integrity check failed.")

    with open(integrity["storage_path"], "rb") as f:
        file_bytes = f.read()

    return Response(
        content=file_bytes,
        media_type="application/pdf" if file_ext == "pdf" else "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{sha256}.{file_ext}"'},
    )


@router.post("/api/documents/{sha256}/verify-integrity")
def verify_document_integrity(sha256: str, payload: DocumentVerifyIntegrityRequest, request: Request):
    org_id = None
    try:
        user = get_current_user(request)
        if user:
            org_id = user.get("organization_id")
    except Exception:
        pass

    if not org_id:
        org_id = payload.organization_id
    if not org_id:
        raise HTTPException(status_code=401, detail="Authentication or organization context required.")

    return DocumentService.verify_document_integrity(
        organization_id=org_id, sha256_expected=sha256, file_ext=payload.file_ext,
    )


@router.post("/api/extraction/process")
async def process_extraction(
    request: Request,
    file: UploadFile = File(...),
    force_refresh: bool = Form(False),
    user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        content = await file.read()
        result = ExtractionService.process_document(
            pdf_bytes=content, document_id=str(uuid.uuid4()),
            organization_id=user["organization_id"], force_refresh=force_refresh,
        )
        return result.model_dump()
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Extraction processing error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Extraction failed", "request_id": request_id})


@router.post("/api/extraction/correct")
def correct_extraction_field(payload: ExtractionCorrectionRequest, user: Dict[str, Any] = Depends(get_current_user)):
    run_result = ExtractionService._cache.get(f"{payload.sha256}:2026.11-v2")
    if not run_result:
        raise HTTPException(status_code=404, detail="Extraction run not found for given SHA-256")
    updated = ExtractionService.record_human_correction(
        result=run_result, field_name=payload.field_name,
        corrected_value=payload.corrected_value, user_id=user.get("user_id") or user.get("sub"),
    )
    return updated.model_dump()


@router.get("/api/extraction/telemetry")
def get_extraction_telemetry():
    cached_runs = list(ExtractionService._cache.values())
    total_runs = len(cached_runs)
    avg_cost = sum(r.cost_paise for r in cached_runs) / total_runs if total_runs > 0 else 0.0
    avg_conf = sum(r.confidence_score for r in cached_runs) / total_runs if total_runs > 0 else 1.0
    escalations = sum(1 for r in cached_runs if r.escalation_triggered)

    return {
        "total_documents_processed": total_runs,
        "production_certificates_evaluated": total_runs,
        "accuracy_claim_permitted": total_runs >= 100,
        "accuracy_guardrail_notice": (
            "Prompt R5 Guardrail: Public marketing accuracy claims remain withheld until at least 100 real production mill certificates are independently evaluated."
            if total_runs < 100 else "Accuracy claims permitted based on >= 100 evaluated production certificates."
        ),
        "average_cost_paise": round(avg_cost, 2),
        "average_cost_usd": round((avg_cost / 100) / 85.0, 5),
        "average_confidence": round(avg_conf, 3),
        "escalation_count": escalations,
        "escalation_rate_pct": round((escalations / total_runs * 100), 1) if total_runs > 0 else 0.0,
        "privacy_tier": "PAID_ZERO_DATA_RETENTION",
        "model_primary": "gemini-3.1-flash-lite / text_layer_pymupdf",
        "schema_version": "2026.11-v2",
    }


@router.get("/api/extraction/budget-status")
def get_extraction_budget_status(user: Dict[str, Any] = Depends(get_current_user)):
    from token_budget_service import TokenBudgetService
    org_id = user.get("organization_id") or user.get("org_id")
    return TokenBudgetService.get_budget_status(org_id)


@router.post("/api/validation/validate-certificate")
def validate_certificate(payload: CertificateValidationRequest):
    report = ValidationEngine.validate_certificate(
        certificate_data=payload.model_dump(), standard_code=payload.standard_code, grade=payload.grade,
    )
    return report.model_dump()


@router.get("/api/validation/standards")
def list_supported_standards():
    StandardsLibrary.load_standards()
    standards_list = []
    for std_code, meta in StandardsLibrary._standards_meta.items():
        grades = [key.split(":")[1] for key in StandardsLibrary._limits_cache if key.split(":")[0] == std_code]
        standards_list.append({
            "standard_code": std_code,
            "standard_name": meta.get("standard_name", ""),
            "issuing_body": meta.get("issuing_body", ""),
            "grades": sorted(list(set(grades))),
        })
    return {"standards": standards_list, "rule_set_version": "STANDARDS-2026.1"}
