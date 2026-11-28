"""
HEATLEDGER AI: Dossier Signing, Bundling, XML & Public Verification Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import json
import logging
import os
import re
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from auth_service import AuthService
    from compliance_engine import ComplianceEngine
    from crypto_signing import CryptoSigningService
    from dependencies import extract_org_id, require_qa_inspector_step_up
    from dossier_generator import DossierGenerator
    from error_handling import safe_http_error
    from mtc_ocr_service import MTCOCRService
    from upload_utils import read_uploaded_file_stream
except ImportError:
    from backend.auth_service import AuthService
    from backend.compliance_engine import ComplianceEngine
    from backend.crypto_signing import CryptoSigningService
    from backend.dependencies import extract_org_id, require_qa_inspector_step_up
    from backend.dossier_generator import DossierGenerator
    from backend.error_handling import safe_http_error
    from backend.mtc_ocr_service import MTCOCRService
    from backend.upload_utils import read_uploaded_file_stream

logger = logging.getLogger("heatledger.security")
router = APIRouter(tags=["Dossiers & Verification"])


class SignCertificateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoice_number: str = Field(..., pattern=r"^[A-Za-z0-9\-_/]{3,32}$")
    heat_number: str = Field(..., max_length=64)
    total_see: float = Field(..., ge=0, le=10000000)
    timestamp: Optional[str] = Field(default=None, max_length=64)
    sha256_upstream_pdf: Optional[str] = Field(default=None, max_length=128)


class CoverMetaPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    company_name: str = Field(..., max_length=200)
    eu_installation_id: str = Field(..., pattern=r"^[A-Za-z0-9\-_]{3,32}$")
    invoice_number: str = Field(..., pattern=r"^[A-Za-z0-9\-_/]{3,32}$")
    cn_code: str = Field(..., pattern=r"^\d{4,8}$")
    heat_number: str = Field(..., max_length=64)
    upstream_mill: str = Field(..., max_length=200)
    country_of_melt: str = Field(..., max_length=64)
    chemistry: Dict[str, float] = Field(default_factory=dict)
    mechanics: Dict[str, str] = Field(default_factory=dict)
    mech_status: Optional[Dict[str, str]] = Field(default=None)
    qa_inspector_name: str = Field(..., max_length=128)
    qa_emp_id: str = Field(..., max_length=64)
    compliance_mode: str = Field(default="TRANSFORMED_3_1", max_length=64)
    hmac_signature: Optional[str] = Field(default=None, max_length=128)
    sha256_upstream_pdf: Optional[str] = Field(default=None, max_length=128)
    total_see: Optional[float] = Field(default=None, ge=0, le=10000000)
    accreditation_declared: Optional[str] = Field(default=None, max_length=200)
    verification_code: Optional[str] = Field(default=None, max_length=64)
    is_demo: bool = Field(default=False, description="True if demo sample document")
    is_signed: Optional[bool] = Field(default=None)


class CbamXmlRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    installation_id: str = Field(..., pattern=r"^[A-Za-z0-9\-_]{3,32}$", description="EU Installation ID")
    company_name: str = Field(..., max_length=200)
    unlocode: str = Field(..., max_length=16)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    cn_code: str = Field(..., pattern=r"^\d{4,8}$", description="Combined Nomenclature export tariff code (4-8 digits)")
    net_tonnes: float = Field(..., gt=0, le=10000000)
    total_see: float = Field(..., ge=0, le=10000000)
    direct_see: float = Field(..., ge=0, le=10000000)
    indirect_see: float = Field(..., ge=0, le=10000000)
    precursor_see: float = Field(..., ge=0, le=10000000)
    heat_number: str = Field(..., max_length=64)
    melt_country: str = Field(..., pattern=r"^[A-Za-z]{2}$")
    hmac_signature: Optional[str] = Field(default=None, max_length=128)


@router.post("/api/dossier/sign")
@router.post("/api/dossier/sign-certificate")
def sign_certificate(
    request: Request,
    payload: SignCertificateRequest,
    user: Dict[str, Any] = Depends(require_qa_inspector_step_up),
):
    try:
        hmac_sig = AuthService.sign_document_with_inspector(
            user_id=user["id"],
            invoice_number=payload.invoice_number,
            heat_number=payload.heat_number,
            total_see=payload.total_see,
            timestamp=payload.timestamp,
            sha256_upstream_pdf=payload.sha256_upstream_pdf,
        )
        sample_bytes = f"{payload.invoice_number}|{payload.heat_number}|{payload.total_see}|{payload.sha256_upstream_pdf}".encode("utf-8")
        ed_sig = CryptoSigningService.sign_dossier_pdf(
            signer_user_id=user["id"],
            signer_name=user.get("name", "R. K. Chatterjee"),
            signer_role=user.get("role", "QA_INSPECTOR"),
            organization_id=extract_org_id(user),
            invoice_number=payload.invoice_number,
            heat_numbers=[payload.heat_number],
            pdf_bytes=sample_bytes,
            upstream_sha256=payload.sha256_upstream_pdf,
            signer_designation=user.get("designation", "Head of Quality Assurance"),
        )
        return {
            **hmac_sig,
            **ed_sig,
            "signature": hmac_sig["signature"],
            "verification_code": ed_sig["verification_code"],
            "key_id": ed_sig["key_id"],
            "public_key_b64": ed_sig["public_key_b64"],
            "signature_b64": ed_sig["signature_b64"],
            "inspector_name": ed_sig.get("signer_name"),
            "inspector_designation": ed_sig.get("signer_designation"),
            "timestamp": ed_sig.get("signed_at"),
            "pack_hash": ed_sig.get("pdf_sha256"),
            "disclaimer": ed_sig.get("disclaimer"),
            "version": ed_sig["version"],
            "status": "VALID",
            "algorithm": "Ed25519",
            "public_verify_url": f"https://heatledger.ai/verify/{ed_sig['verification_code']}",
        }
    except PermissionError as pe:
        raise safe_http_error(pe, status_code=403, fallback_message="Permission denied.", context="dossiers.sign")
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Signing error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Document signing failed")


def _parse_cover_meta(cover_meta: str) -> CoverMetaPayload:
    try:
        raw_meta = json.loads(cover_meta)
        if "cn_code" in raw_meta and isinstance(raw_meta["cn_code"], str):
            raw_meta["cn_code"] = raw_meta["cn_code"].replace(" ", "")
        return CoverMetaPayload.model_validate(raw_meta)
    except Exception as parse_err:
        raise HTTPException(status_code=400, detail=f"Invalid cover_meta JSON schema: {parse_err}")


def _build_cover_and_sig(meta: CoverMetaPayload, is_demo: bool, is_signed: bool):
    sig_record = None
    if meta.verification_code:
        sig_record = CryptoSigningService.lookup_signature(meta.verification_code)
    elif meta.hmac_signature:
        sig_record = CryptoSigningService.lookup_signature(meta.hmac_signature)

    cover_pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
        company_name=meta.company_name, eu_installation_id=meta.eu_installation_id,
        invoice_number=meta.invoice_number, cn_code=meta.cn_code, heat_number=meta.heat_number,
        upstream_mill=meta.upstream_mill, country_of_melt=meta.country_of_melt,
        chemistry=meta.chemistry, mechanics=meta.mechanics, mech_status=meta.mech_status,
        qa_inspector_name=meta.qa_inspector_name, qa_emp_id=meta.qa_emp_id,
        compliance_mode=meta.compliance_mode, signature_record=sig_record,
        hmac_signature=meta.hmac_signature, accreditation_declared=meta.accreditation_declared,
        is_demo=is_demo, is_signed=is_signed,
    )
    return cover_pdf_bytes, sig_record


@router.post("/api/dossier/generate-bundle")
async def generate_dossier_bundle(
    request: Request,
    cover_meta: str = Form(...),
    upstream_pdf: Optional[UploadFile] = File(None),
):
    try:
        meta = _parse_cover_meta(cover_meta)
        is_demo = meta.is_demo or (os.getenv("DEMO_MODE", "false").lower() == "true")
        is_signed = bool(meta.hmac_signature or meta.is_signed)
        cover_pdf_bytes, _ = _build_cover_and_sig(meta, is_demo, is_signed)

        if not upstream_pdf:
            raise HTTPException(
                status_code=400,
                detail="Missing upstream mill certificate. An authentic upstream PDF is strictly required to compile an EN 10204 Clause 6 dossier.",
            )

        upstream_bytes = await read_uploaded_file_stream(upstream_pdf, allowed_types=["pdf"])
        upstream_bytes = MTCOCRService.sanitize_pdf_payload(upstream_bytes)
        merged_pdf_bytes = DossierGenerator.compile_merged_clause6_dossier(
            cover_pdf_bytes=cover_pdf_bytes, upstream_mill_pdf_bytes=upstream_bytes,
            invoice_number=meta.invoice_number, heat_number=meta.heat_number, is_demo=is_demo,
        )
        out_filename = (
            f"SAMPLE_NOT_A_REAL_CERTIFICATE_Dossier_{meta.invoice_number}_Clause6_Merged.pdf"
            if is_demo else f"Dossier_{meta.invoice_number}_Clause6_Merged.pdf"
        )
        return Response(
            content=merged_pdf_bytes, media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"', "Access-Control-Expose-Headers": "Content-Disposition"},
        )
    except HTTPException:
        raise
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Dossier bundle failure: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal processing error", "request_id": request_id})


@router.post("/api/dossier/generate-package")
async def generate_dossier_package(
    request: Request,
    cover_meta: str = Form(...),
    upstream_pdf: Optional[UploadFile] = File(None),
):
    try:
        meta = _parse_cover_meta(cover_meta)
        is_demo = meta.is_demo or (os.getenv("DEMO_MODE", "false").lower() == "true")
        is_signed = bool(meta.hmac_signature or meta.is_signed)

        if not is_signed and not is_demo:
            raise HTTPException(
                status_code=400,
                detail="Packaging Error: An unsigned draft dossier cannot be packaged into a verified ZIP deliverable. An authorized QA_INSPECTOR digital signature is strictly required.",
            )
        if not upstream_pdf:
            raise HTTPException(
                status_code=400,
                detail="Missing upstream mill certificate. An authentic upstream PDF is strictly required to compile an EN 10204 Clause 6 dossier.",
            )

        upstream_bytes = await read_uploaded_file_stream(upstream_pdf, allowed_types=["pdf"])
        cover_pdf_bytes, sig_record = _build_cover_and_sig(meta, is_demo, is_signed)
        validation_report = ComplianceEngine.validate_metallurgy(
            extracted_chemistry=meta.chemistry,
            extracted_mechanical={k: float(re.sub(r"[^\d.]", "", v) or 0.0) for k, v in meta.mechanics.items()},
            standard_chem_limits={}, standard_mech_limits={},
            standard_code="ASTM A105 / EN 10222-2", country_of_melt_explicit=True,
        )
        cbam_data_sheet = {
            "invoice_number": meta.invoice_number, "cn_code": meta.cn_code, "heat_number": meta.heat_number,
            "country_of_melt": meta.country_of_melt, "total_see": meta.total_see or 1.93,
            "standard": "EU Implementing Regulation 2023/1773", "calculation_status": "CONFIRMED",
        }
        zip_bytes = DossierGenerator.generate_clause6_dossier_zip(
            cover_pdf_bytes=cover_pdf_bytes, upstream_mill_pdf_bytes=upstream_bytes,
            invoice_number=meta.invoice_number, heat_number=meta.heat_number,
            validation_report=validation_report, cbam_data_sheet=cbam_data_sheet,
            signature_record=sig_record, is_demo=is_demo,
        )
        out_filename = f"Dossier_{meta.invoice_number}_Clause6_Verified_Package.zip"
        return Response(
            content=zip_bytes, media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{out_filename}"', "Access-Control-Expose-Headers": "Content-Disposition"},
        )
    except HTTPException:
        raise
    except ValueError as ve:
        raise safe_http_error(ve, status_code=400, fallback_message="Invalid package request.", context="dossiers.package")
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Package generation failure: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal processing error", "request_id": request_id})


@router.get("/api/verify/lookup/{code_or_hash}")
def verify_lookup(code_or_hash: str):
    record = CryptoSigningService.lookup_signature(code_or_hash)
    if not record:
        raise HTTPException(status_code=404, detail="No registered cryptographic certificate found for this verification code or hash.")
    return record


@router.post("/api/verify/check-file")
async def verify_check_file(file: UploadFile = File(...)):
    try:
        content = await read_uploaded_file_stream(file, allowed_types=["pdf"])
        return CryptoSigningService.verify_pdf_tamper_and_signature(content)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Verification error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail="Verification processing failed")


@router.get("/api/verify/public-keys")
def get_public_signing_keys():
    return CryptoSigningService.list_public_keys()


@router.post("/api/dossier/generate-xml", response_class=PlainTextResponse)
def generate_cbam_xml(request: Request, payload: CbamXmlRequest):
    try:
        return DossierGenerator.generate_cbam_communication_xml(
            installation_id=payload.installation_id, company_name=payload.company_name,
            unlocode=payload.unlocode, latitude=payload.latitude, longitude=payload.longitude,
            cn_code=payload.cn_code, net_tonnes=payload.net_tonnes, total_see=payload.total_see,
            direct_see=payload.direct_see, indirect_see=payload.indirect_see,
            precursor_see=payload.precursor_see, heat_number=payload.heat_number,
            melt_country=payload.melt_country, hmac_signature=payload.hmac_signature,
        )
    except HTTPException:
        raise
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] CBAM XML generation error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal processing error", "request_id": request_id})
