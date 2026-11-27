"""
HEATLEDGER AI: Buyer Portal & Supplier Data Requests Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from buyer_pack_service import BuyerPackService
    from dependencies import extract_org_id, get_current_user
    from portal_service import PortalService
    from supplier_request_service import SupplierRequestService
except ImportError:
    from backend.buyer_pack_service import BuyerPackService
    from backend.dependencies import extract_org_id, get_current_user
    from backend.portal_service import PortalService
    from backend.supplier_request_service import SupplierRequestService

router = APIRouter(tags=["Buyer Portal & Supplier Requests"])


class CreateShareLinkRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    shipment_id: str = Field(min_length=3, max_length=100)
    expires_in_days: int = Field(default=30, ge=1, le=180)
    passcode: Optional[str] = Field(default=None, max_length=50)
    custom_note: Optional[str] = Field(default=None, max_length=500)


class VerifyPasscodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    passcode: str = Field(min_length=1, max_length=50)


class BuyerActionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action_type: str = Field(pattern="^(ACCEPT|QUESTION|REQUEST_DOC)$")
    buyer_name: str = Field(min_length=2, max_length=100)
    buyer_email: Optional[str] = Field(default=None, max_length=120)
    message: Optional[str] = Field(default=None, max_length=1000)


class CreateSupplierRequestPayload(BaseModel):
    supplier_id: str
    supplier_name: str
    product_name: str
    cn_code: str
    reporting_period: str
    data_needed: List[str]
    due_date: str
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    custom_note: Optional[str] = None


class SaveSupplierDraftPayload(BaseModel):
    draft: Dict[str, Any]


class SubmitSupplierDataPayload(BaseModel):
    submission: Dict[str, Any]
    respondent_name: str
    respondent_designation: str
    respondent_email: str
    respondent_phone: Optional[str] = None
    evidence_files: Optional[List[Dict[str, Any]]] = None


class ReviewSupplierRequestPayload(BaseModel):
    action: str
    comment: str
    linked_heats: Optional[List[str]] = None


class SendReminderPayload(BaseModel):
    channel: Optional[str] = "WHATSAPP"


@router.post("/api/portal/share-links")
def create_share_link(payload: CreateShareLinkRequest, current_user=Depends(get_current_user)):
    return PortalService.create_share_link(
        shipment_id=payload.shipment_id, organization_id=extract_org_id(current_user),
        plant_id=current_user.get("plant_id", "plant-howrah-01"),
        expires_in_days=payload.expires_in_days, passcode=payload.passcode, custom_note=payload.custom_note,
    )


@router.get("/api/portal/share-links")
def list_share_links(shipment_id: Optional[str] = None, current_user=Depends(get_current_user)):
    return {"share_links": PortalService.list_share_links(organization_id=extract_org_id(current_user), shipment_id=shipment_id)}


@router.post("/api/portal/share-links/{token}/revoke")
def revoke_share_link(token: str, current_user=Depends(get_current_user)):
    if not PortalService.revoke_share_link(token=token, organization_id=extract_org_id(current_user)):
        raise HTTPException(status_code=404, detail="Share link not found or unauthorized")
    return {"status": "success", "message": "Share link has been revoked"}


@router.get("/api/portal/share/{token}")
def get_public_dossier(token: str, request: Request, passcode: Optional[str] = None):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    result = PortalService.get_public_dossier(
        token=token, provided_passcode=passcode, ip_address=raw_ip.split(",")[0].strip(),
        user_agent=request.headers.get("user-agent", "Browser"),
    )
    if not result.get("valid") and not result.get("requires_passcode"):
        raise HTTPException(status_code=404, detail=result.get("error", "Invalid or expired share link"))
    return result


@router.post("/api/portal/share/{token}/verify-passcode")
def verify_portal_passcode(token: str, payload: VerifyPasscodeRequest, request: Request):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    result = PortalService.get_public_dossier(
        token=token, provided_passcode=payload.passcode, ip_address=raw_ip.split(",")[0].strip(),
        user_agent=request.headers.get("user-agent", "Browser"),
    )
    if not result.get("valid") or result.get("requires_passcode"):
        raise HTTPException(status_code=401, detail=result.get("error", "Incorrect passcode"))
    return result


@router.post("/api/portal/share/{token}/action")
def submit_buyer_action(token: str, payload: BuyerActionRequest):
    try:
        return PortalService.submit_buyer_action(
            token=token, action_type=payload.action_type, buyer_name=payload.buyer_name,
            buyer_email=payload.buyer_email, message=payload.message,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.get("/api/portal/share/{token}/download/{file_type}")
def download_portal_file(token: str, file_type: str, request: Request):
    raw_ip = request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    client_ip = raw_ip.split(",")[0].strip()
    dossier_res = PortalService.get_public_dossier(token=token, ip_address=client_ip)
    if not dossier_res.get("valid") or dossier_res.get("requires_passcode"):
        raise HTTPException(status_code=403, detail="Unauthorized download or expired token")

    PortalService.record_download(token=token, file_type=file_type, ip_address=client_ip)
    dossier = dossier_res["dossier"]

    shipment_data = {
        "shipment_id": dossier.get("shipment_id", "SHP-001"),
        "buyer_name": dossier.get("buyer_name", "Authorised Consignee / Importer"),
        "destination_port": dossier.get("destination_port", "EU Port of Entry"),
        "invoice_number": dossier.get("invoice_number", dossier.get("shipment_id", "INV-001")),
        "cn_code": dossier.get("cn_code", "7214.20.00"),
        "total_tonnes": dossier.get("net_weight_mt") or dossier.get("net_weight_tonnes") or 48.6,
    }
    heats_data = [
        {
            "heat_number": h["heat_number"], "mill": h["mill_name"], "grade": h["steel_grade"],
            "allocated_tonnes": h["tonnes"], "melt_and_pour_country": h["melt_country"],
            "certificate_sha256": dossier["digital_signature"].get("annex_a_sha256", "0" * 64),
        }
        for h in dossier.get("heats", [])
    ]
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples", "Tata_Steel_3.1_MTC_TSJ-26-9021.pdf")
    cert_files = []
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as sf:
            cert_files.append(("Tata_Steel_3.1_MTC_TSJ-26-9021.pdf", sf.read()))

    sig_record = {
        "signer_name": dossier["digital_signature"]["signer_name"],
        "signer_role": "QA_INSPECTOR",
        "key_id": dossier["digital_signature"]["public_key_fingerprint"],
        "signed_at": dossier["digital_signature"]["signed_at"],
        "signature_b64": "SAMPLE_SIGNATURE_BYTES_B64",
        "verification_code": "HL-" + dossier["shipment_id"],
    }

    ft = file_type.lower()
    if ft == "zip":
        zip_bytes, zip_filename, size_warning, _ = BuyerPackService.compile_buyer_pack_zip(
            shipment_data, heats_data, cert_files, sig_record, "HL-" + dossier["shipment_id"],
        )
        return Response(
            content=zip_bytes, media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{zip_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition, X-Pack-Size-Warning",
                "X-Pack-Size-Warning": "true" if size_warning else "false",
            },
        )
    elif ft == "pdf":
        pdf_bytes, pdf_filename, size_warning = BuyerPackService.compile_buyer_pack_pdf(
            shipment_data, heats_data, cert_files, sig_record, "HL-" + dossier["shipment_id"],
        )
        return Response(
            content=pdf_bytes, media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{pdf_filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition, X-Pack-Size-Warning",
                "X-Pack-Size-Warning": "true" if size_warning else "false",
            },
        )
    elif ft == "cbam":
        cbam_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<CBAMCommunication xmlns="urn:eu:cbam:draft:2026">
  <ShipmentId>{dossier['shipment_id']}</ShipmentId>
  <CNCode>{dossier['cn_code']}</CNCode>
  <SpecificEmissions>{dossier['emissions_summary']['specific_embedded_emissions_tco2_per_t']}</SpecificEmissions>
  <Timestamp>{datetime.now(timezone.utc).isoformat()}</Timestamp>
</CBAMCommunication>"""
        return Response(
            content=cbam_xml, media_type="application/xml",
            headers={"Content-Disposition": f'attachment; filename="{dossier["shipment_id"]}_cbam.xml"', "Access-Control-Expose-Headers": "Content-Disposition"},
        )
    return PlainTextResponse(f"Dossier {file_type} download for {dossier['shipment_id']}")


@router.post("/api/supplier-requests")
def create_supplier_request(payload: CreateSupplierRequestPayload, current_user: Dict[str, Any] = Depends(get_current_user)):
    return SupplierRequestService.create_request(
        org_id=extract_org_id(current_user), supplier_id=payload.supplier_id, supplier_name=payload.supplier_name,
        product_name=payload.product_name, cn_code=payload.cn_code, reporting_period=payload.reporting_period,
        data_needed=payload.data_needed, due_date=payload.due_date, supplier_email=payload.supplier_email,
        supplier_phone=payload.supplier_phone, custom_note=payload.custom_note,
    )


@router.get("/api/supplier-requests")
def list_supplier_requests(status: Optional[str] = None, current_user: Dict[str, Any] = Depends(get_current_user)):
    return SupplierRequestService.list_requests(org_id=extract_org_id(current_user), status_filter=status)


@router.get("/api/supplier-requests/precursors")
def list_versioned_precursors(current_user: Dict[str, Any] = Depends(get_current_user)):
    return SupplierRequestService.list_precursor_records(org_id=extract_org_id(current_user))


@router.get("/api/supplier-requests/{request_id}")
def get_supplier_request_detail(request_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    req = SupplierRequestService.get_request_by_id(request_id=request_id, org_id=extract_org_id(current_user))
    if not req:
        raise HTTPException(status_code=404, detail=f"Request {request_id} not found")
    return req


@router.post("/api/supplier-requests/{request_id}/send-reminder")
def trigger_supplier_reminder(request_id: str, payload: SendReminderPayload, current_user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return SupplierRequestService.send_reminder(
            request_id=request_id, org_id=extract_org_id(current_user), channel=payload.channel or "WHATSAPP",
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.post("/api/supplier-requests/{request_id}/review")
def review_supplier_submission(
    request_id: str, payload: ReviewSupplierRequestPayload, current_user: Dict[str, Any] = Depends(get_current_user),
):
    reviewer_id = current_user.get("user_id", current_user.get("email", "qa_officer"))
    try:
        return SupplierRequestService.review_request(
            request_id=request_id, org_id=extract_org_id(current_user), reviewer_id=reviewer_id,
            action=payload.action, comment=payload.comment, linked_heats=payload.linked_heats,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@router.get("/api/supplier-requests/public/{token}")
def get_public_supplier_form(token: str):
    details = SupplierRequestService.get_public_form_details(secure_token=token)
    if not details:
        raise HTTPException(status_code=404, detail="Invalid or expired supplier data request link.")
    return details


@router.post("/api/supplier-requests/public/{token}/save-draft")
def save_public_supplier_draft(token: str, payload: SaveSupplierDraftPayload):
    try:
        return SupplierRequestService.save_draft(secure_token=token, draft_data=payload.draft)
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/api/supplier-requests/public/{token}/upload-evidence")
async def upload_supplier_evidence(token: str, file: UploadFile = File(...)):
    allowed_types = [
        "application/pdf", "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "image/png", "image/jpeg",
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, Excel (.xlsx, .xls) and images are accepted as evidence.")
    content = await file.read()
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 15MB limit.")
    try:
        return SupplierRequestService.attach_evidence_file(
            secure_token=token, filename=file.filename or "evidence.pdf", file_bytes=content, mime_type=file.content_type,
        )
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))


@router.post("/api/supplier-requests/public/{token}/submit")
def submit_public_supplier_data(token: str, payload: SubmitSupplierDataPayload):
    try:
        return SupplierRequestService.submit_data(
            secure_token=token, submission_payload=payload.submission,
            respondent_name=payload.respondent_name, respondent_designation=payload.respondent_designation,
            respondent_email=payload.respondent_email, respondent_phone=payload.respondent_phone,
            evidence_files=payload.evidence_files,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
