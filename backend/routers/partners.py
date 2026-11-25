"""
HEATLEDGER AI: Partner Channel API Router (Prompt D3)
Endpoints:
- POST /api/public/partners/signup: Register CA, export consultant, or CHA partner
- GET /api/public/partners/verify-code/{code}: Validate referral code
- POST /api/public/partners/lead: Submit lead via referral link
- GET /api/partners/{partner_id}/dashboard: Partner commission ledger & client metrics
- GET /api/partners/{partner_id}/kit: Download/view Partner Kit (deck, 1-pager, WhatsApp copy)
- POST /api/plants/partner-access/grant: Plant grants read-only access to a partner
- POST /api/plants/partner-access/revoke: Plant revokes access
- GET /api/plants/partner-access: List active partner delegations
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

try:
    from backend.partner_service import PartnerService
    from backend.dependencies import get_current_user
except ImportError:
    from partner_service import PartnerService
    from dependencies import get_current_user

router = APIRouter(tags=["Partner Channel"])


class PartnerSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=128)
    partner_type: str = Field(..., description="CA, EXPORT_CONSULTANT, FREIGHT_FORWARDER, CHA, OTHER")
    email: str = Field(..., min_length=5, max_length=128)
    firm_name: str = Field(..., min_length=2, max_length=128)
    phone: Optional[str] = None
    city: Optional[str] = None
    gstin: Optional[str] = None
    payout_info: Optional[str] = None
    custom_code: Optional[str] = None


class PartnerLeadRequest(BaseModel):
    referral_code: str = Field(..., min_length=3, max_length=32)
    company_name: str = Field(..., min_length=2, max_length=128)
    contact_email: str = Field(..., min_length=5, max_length=128)
    contact_phone: Optional[str] = None


class PlantAccessRequest(BaseModel):
    partner_id: str = Field(..., min_length=5, max_length=64)


# =============================================================================
# Public Endpoints (No Authentication Required)
# =============================================================================

@router.post("/api/public/partners/signup")
def partner_signup(payload: PartnerSignupRequest):
    return PartnerService.register_partner(
        name=payload.name,
        partner_type=payload.partner_type,
        email=payload.email,
        firm_name=payload.firm_name,
        phone=payload.phone,
        city=payload.city,
        gstin=payload.gstin,
        payout_info=payload.payout_info,
        custom_code=payload.custom_code
    )


@router.get("/api/public/partners/verify-code/{code}")
def verify_referral_code(code: str):
    partner = PartnerService.get_partner_by_code(code)
    if not partner:
        raise HTTPException(status_code=404, detail="Invalid partner referral code.")
    return {
        "valid": True,
        "referral_code": partner["referral_code"],
        "firm_name": partner["firm_name"],
        "partner_name": partner["name"]
    }


@router.post("/api/public/partners/lead")
def submit_referral_lead(payload: PartnerLeadRequest):
    try:
        return PartnerService.create_referral_lead(
            referral_code=payload.referral_code,
            company_name=payload.company_name,
            contact_email=payload.contact_email,
            contact_phone=payload.contact_phone
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# Partner Portal Endpoints
# =============================================================================

@router.get("/api/partners/{partner_id}/dashboard")
def get_partner_dashboard(partner_id: str):
    try:
        return PartnerService.get_partner_dashboard(partner_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/partners/{partner_id}/kit")
def get_partner_kit(partner_id: str, request: Request):
    base_url = str(request.base_url).rstrip("/")
    try:
        return PartnerService.generate_partner_kit(partner_id, base_url=base_url)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# Plant Owner Delegation Endpoints (Authenticated)
# =============================================================================

@router.post("/api/plants/partner-access/grant")
def grant_partner_access(payload: PlantAccessRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return PartnerService.grant_plant_access(org_id, payload.partner_id)


@router.post("/api/plants/partner-access/revoke")
def revoke_partner_access(payload: PlantAccessRequest, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    return PartnerService.revoke_plant_access(org_id, payload.partner_id)


@router.get("/api/plants/partner-access")
def list_partner_access(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    # List active partners granted access to this plant
    return PartnerService.list_accessible_plants_for_partner(org_id)
