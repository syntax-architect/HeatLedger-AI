"""
HEATLEDGER AI: Importer Portal Router (Prompt C3)
Public portal for importers to inspect, verify seals, download, and request documents.
"""

from __future__ import annotations

from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response, Header
from pydantic import BaseModel, Field

try:
    from backend.portal_service import ImporterPortalService
    from backend.melt_and_pour_service import MeltAndPourService
except ImportError:
    from portal_service import ImporterPortalService
    from melt_and_pour_service import MeltAndPourService

router = APIRouter(prefix="/api/importer-portal", tags=["Importer Portal"])


class CommentRequest(BaseModel):
    author: str = Field(..., description="Name of importer or customs representative")
    message: str = Field(..., description="Comment or inquiry text")


class MissingDocRequest(BaseModel):
    heat_number: str
    missing_item: str
    note: Optional[str] = None


class MarkReceivedRequest(BaseModel):
    received_by: str
    notes: Optional[str] = None


class InviteSupplierRequest(BaseModel):
    supplier_email: str
    supplier_name: str
    importer_consent: bool
    importer_name: Optional[str] = None


@router.get("/{token}")
def get_shared_pack(
    token: str,
    pin: Optional[str] = Query(None, description="One-time email PIN if link is locked"),
    cf_ipcountry: Optional[str] = Header(None, alias="CF-IPCountry")
) -> Dict[str, Any]:
    """
    Public unauthenticated access to an evidence pack.
    Tracks privacy-safe open events (timestamp and country only).
    """
    try:
        return ImporterPortalService.get_pack_by_token(token, pin=pin, client_country=cf_ipcountry)
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found, revoked, or invalid.")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=410, detail=str(e))


@router.post("/{token}/verify-seal")
def verify_seal(token: str) -> Dict[str, Any]:
    """
    Recomputes cryptographic digest and signature to verify dossier integrity.
    Detects any tampering with the stored document.
    """
    try:
        return ImporterPortalService.verify_portal_seal(token)
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")


@router.post("/{token}/comment")
def add_comment(token: str, payload: CommentRequest) -> Dict[str, Any]:
    """Adds a comment from the importer regarding this evidence pack."""
    try:
        return ImporterPortalService.add_importer_comment(token, payload.author, payload.message)
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")


@router.post("/{token}/request-missing-doc")
def request_missing_document(token: str, payload: MissingDocRequest) -> Dict[str, Any]:
    """Submits a missing document request back to the exporting plant."""
    try:
        return ImporterPortalService.request_missing_document(
            token,
            heat_number=payload.heat_number,
            missing_item=payload.missing_item,
            note=payload.note
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")


@router.post("/{token}/mark-received")
def mark_received(token: str, payload: MarkReceivedRequest) -> Dict[str, Any]:
    """Marks the evidence pack as accepted by the importer."""
    try:
        return ImporterPortalService.mark_received(token, payload.received_by, payload.notes)
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")


@router.post("/{token}/invite-supplier")
def invite_supplier(token: str, payload: InviteSupplierRequest) -> Dict[str, Any]:
    """Invites another steel supplier to use HeatLedger AI with importer consent."""
    try:
        return ImporterPortalService.invite_other_supplier(
            token,
            supplier_email=payload.supplier_email,
            supplier_name=payload.supplier_name,
            importer_consent=payload.importer_consent,
            importer_name=payload.importer_name
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{token}/download-pdf")
def download_pdf(token: str) -> Response:
    """Downloads the vector PDF evidence pack."""
    try:
        pack_info = ImporterPortalService.get_pack_by_token(token)
        pack = pack_info["pack"]
        pdf_bytes = MeltAndPourService.generate_pack_pdf(pack)
        pack_id = pack.get("shipment_id", "evidence_pack")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={pack_id}.pdf"}
        )
    except KeyError:
        raise HTTPException(status_code=404, detail="Evidence pack share link not found or revoked.")


@router.delete("/{token}")
def revoke_share_link(token: str) -> Dict[str, Any]:
    """Revokes a public share link."""
    success = ImporterPortalService.revoke_share_link(token)
    if not success:
        raise HTTPException(status_code=404, detail="Share link not found.")
    return {"status": "revoked", "token": token}


@router.get("/accounts/{importer_email}/packs")
def list_account_packs(importer_email: str) -> Dict[str, Any]:
    """Lists all evidence packs across all exporting plants for an importer account."""
    packs = ImporterPortalService.list_importer_packs(importer_email)
    return {"importer_email": importer_email, "count": len(packs), "packs": packs}
