"""
HEATLEDGER AI: Mill Chaser & Scorecard APIRouter (Prompt C7)
Endpoints:
- POST /api/mills: Register mill contact in plant directory
- GET /api/mills: List mills for organization
- POST /api/chase: Trigger "Ask mill" missing MTC request
- GET /api/chase/scorecard: Mill performance scorecard
- GET /api/public/mill-chase/{token}: Mill upload verification
- POST /api/public/mill-chase/{token}/upload: Mill MTC upload submission
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from pydantic import BaseModel, Field

try:
    from backend.mill_chaser_service import MillChaserService
    from backend.dependencies import get_current_user
except ImportError:
    from mill_chaser_service import MillChaserService
    from dependencies import get_current_user

router = APIRouter(tags=["Mill Chaser & Supplier Scorecard"])


class AddMillRequest(BaseModel):
    mill_name: str = Field(..., min_length=2, max_length=128)
    contact_email: str = Field(..., min_length=5, max_length=128)
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    plant_location: Optional[str] = None
    country: str = "India"


class CreateChaseRequest(BaseModel):
    heat_number: str = Field(..., min_length=1, max_length=64)
    mill_name: str = Field(..., min_length=2, max_length=128)
    mill_contact_email: str = Field(..., min_length=5, max_length=128)
    missing_items: List[str] = Field(default_factory=lambda: ["Country of Melt and Pour explicit clause"])
    mill_contact_phone: Optional[str] = None
    mill_id: Optional[str] = None
    notes: Optional[str] = None


@router.post("/api/mills")
def add_mill(payload: AddMillRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return MillChaserService.add_mill(
        organization_id=org_id,
        mill_name=payload.mill_name,
        contact_email=payload.contact_email,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        plant_location=payload.plant_location,
        country=payload.country
    )


@router.get("/api/mills")
def list_mills(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return MillChaserService.list_mills(org_id)


@router.post("/api/chase")
def create_chase(payload: CreateChaseRequest, request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    base_url = str(request.base_url).rstrip("/")
    return MillChaserService.create_chase_request(
        organization_id=org_id,
        heat_number=payload.heat_number,
        mill_name=payload.mill_name,
        mill_contact_email=payload.mill_contact_email,
        missing_items=payload.missing_items,
        mill_contact_phone=payload.mill_contact_phone,
        mill_id=payload.mill_id,
        notes=payload.notes,
        base_url=base_url
    )


@router.get("/api/chase/scorecard")
def get_scorecard(mill_name: Optional[str] = None, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return MillChaserService.get_mill_scorecard(org_id, mill_name=mill_name)


# =============================================================================
# Public Endpoints (No Login Required for Mill)
# =============================================================================

@router.get("/api/public/mill-chase/{token}")
def get_public_chase(token: str):
    data = MillChaserService.get_public_request_by_token(token)
    if not data:
        raise HTTPException(status_code=404, detail="Upload link not found, expired, or tampered.")
    return data


@router.post("/api/public/mill-chase/{token}/upload")
async def upload_chase_file(token: str, file: UploadFile = File(...)):
    contents = await file.read()
    try:
        result = MillChaserService.fulfill_request(
            raw_token=token,
            file_bytes=contents,
            filename=file.filename or "uploaded_certificate.pdf"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
