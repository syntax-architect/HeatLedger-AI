"""
HEATLEDGER AI: Traceability Ledger, Shipment Readiness & Suppliers Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field

try:
    from dependencies import extract_org_id, get_current_user, get_optional_user, require_roles
    from error_handling import safe_http_error
    from ledger_service import LedgerService, OverAllocationError
    from readiness_service import DEFAULT_RULES, ReadinessService
    from supplier_service import SupplierService
except ImportError:
    from backend.dependencies import extract_org_id, get_current_user, get_optional_user, require_roles
    from backend.error_handling import safe_http_error
    from backend.ledger_service import LedgerService, OverAllocationError
    from backend.readiness_service import DEFAULT_RULES, ReadinessService
    from backend.supplier_service import SupplierService

router = APIRouter(tags=["Ledger, Readiness & Suppliers"])


class HeatRegistrationRequest(BaseModel):
    heat_number: str = Field(..., min_length=3, max_length=32)
    mill_name: str = Field(...)
    steel_grade: str = Field(...)
    initial_weight_kg: float = Field(..., gt=0, le=100000000)
    created_by: str = Field(default="system")
    model_config = ConfigDict(extra="ignore")


class HeatAllocationRequest(BaseModel):
    heat_number: str = Field(...)
    shipment_id: str = Field(...)
    quantity_kg: float = Field(..., gt=0, le=100000000)
    allow_override: bool = Field(default=False)
    override_reason: Optional[str] = Field(default=None)
    created_by: str = Field(default="qa_inspector")
    model_config = ConfigDict(extra="ignore")


class HeatReleaseRequest(BaseModel):
    heat_number: str = Field(...)
    shipment_id: str = Field(...)
    quantity_kg: float = Field(..., gt=0, le=100000000)
    reason: str = Field(default="Allocation release")
    created_by: str = Field(default="qa_inspector")
    model_config = ConfigDict(extra="ignore")


class ShipmentEvaluationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    shipment_id: str = Field(..., max_length=100)
    country_of_melt: Optional[str] = None
    melt_and_pour_status: Optional[str] = None
    compliance_mode: Optional[str] = "3.1"
    linked_heat_numbers: List[str] = []
    metallurgy_status: Optional[str] = "PASS"
    is_over_allocated: Optional[bool] = False
    has_original_pdf: Optional[bool] = True
    sha256_upstream_pdf: Optional[str] = None
    qa_signed: Optional[bool] = False
    specific_emissions: Optional[float] = None
    net_tonnage: Optional[float] = 25.0
    country: Optional[str] = "DE"
    cn_code: Optional[str] = "7306"


class RequestReleaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    shipment_id: str = Field(..., max_length=100)
    evaluation: Dict[str, Any]


class ApproveReleaseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    shipment_id: str = Field(..., max_length=100)
    evaluation: Dict[str, Any]
    override_reason: Optional[str] = None


class MatchPurchaseOrderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    po_number: str
    supplier_id: str
    heat_number: str
    ordered_grade: str
    expected_weight_kg: float
    received_weight_kg: float
    tolerance_pct: float = 2.0


class SupplierCorrectionRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    supplier_id: str
    cert_number: str
    heat_number: str
    defect_type: str = "MISSING_MELT_COUNTRY"
    exporter_name: Optional[str] = None


@router.post("/api/ledger/heats")
def register_heat(payload: HeatRegistrationRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        org_id = user["organization_id"]
        LedgerService.register_heat(
            heat_number=payload.heat_number, organization_id=org_id,
            mill_name=payload.mill_name, steel_grade=payload.steel_grade,
            initial_weight_kg=payload.initial_weight_kg, created_by=payload.created_by,
        )
        balance = LedgerService.get_heat_balance(payload.heat_number, organization_id=org_id)
        return {"status": "registered", "heat_number": payload.heat_number, "balance": balance, "organization_id": org_id}
    except Exception as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to register heat.", context="ledger.register_heat")


@router.get("/api/ledger/heats/{heat_number}/balance")
def get_heat_balance(heat_number: str, user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user["organization_id"]
    try:
        balance = LedgerService.get_heat_balance(heat_number, organization_id=org_id)
        return {"heat_number": heat_number, "balance": balance}
    except ValueError as ve:
        raise safe_http_error(ve, status_code=404, fallback_message="Heat not found.", context="ledger.heat_balance")


@router.post("/api/ledger/allocate")
def allocate_heat_to_shipment(payload: HeatAllocationRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return LedgerService.allocate_heat(
            heat_number=payload.heat_number, shipment_id=payload.shipment_id,
            quantity_kg=payload.quantity_kg, organization_id=user["organization_id"],
            allow_override=payload.allow_override, override_reason=payload.override_reason,
            created_by=payload.created_by,
        )
    except OverAllocationError as oae:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "OVER_ALLOCATION_REJECTED", "message": str(oae),
                "heat_number": oae.heat_number, "requested_kg": oae.requested_kg,
                "remaining_kg": oae.remaining_kg, "deficit_kg": oae.deficit,
            },
        )
    except Exception as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to allocate heat.", context="ledger.allocate_heat")


@router.post("/api/ledger/release")
def release_heat_allocation(payload: HeatReleaseRequest, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return LedgerService.release_allocation(
            heat_number=payload.heat_number, shipment_id=payload.shipment_id,
            quantity_kg=payload.quantity_kg, organization_id=user["organization_id"],
            reason=payload.reason, created_by=payload.created_by,
        )
    except Exception as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to release allocation.", context="ledger.release_allocation")


@router.get("/api/ledger/lineage/{heat_number}")
def get_heat_lineage(heat_number: str, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        return LedgerService.get_heat_lineage(heat_number, organization_id=user["organization_id"])
    except ValueError as ve:
        raise safe_http_error(ve, status_code=404, fallback_message="Heat lineage not found.", context="ledger.heat_lineage")


@router.get("/api/ledger/shipment/{shipment_id}/heats")
def get_shipment_heats(shipment_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    try:
        from db.shipments_repo import ShipmentsRepo
    except ImportError:
        from backend.db.shipments_repo import ShipmentsRepo
    org_id = user.get("organization_id") or user.get("org_id")
    shipment = ShipmentsRepo.get_shipment(shipment_id, organization_id=org_id)
    if not shipment or (org_id and shipment.get("organization_id") and shipment.get("organization_id") != org_id):
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")
    return {"shipment_id": shipment_id, "heats": LedgerService.get_shipment_heats(shipment_id)}


@router.post("/api/ledger/seed-sample")
def seed_ledger_sample():
    if os.getenv("DEMO_MODE", "").lower() not in ("true", "1"):
        raise HTTPException(status_code=403, detail="Seeding is only permitted when DEMO_MODE=true")
    LedgerService.seed_sample_scenario()
    return {"status": "seeded", "message": "Sample mill heats and shipments initialized in ledger."}


@router.get("/api/readiness/rules")
def get_readiness_rules():
    return {"rules": DEFAULT_RULES, "total_rules": len(DEFAULT_RULES)}


@router.post("/api/readiness/evaluate")
def evaluate_shipment_readiness(payload: ShipmentEvaluationRequest):
    return ReadinessService.evaluate_shipment(payload.model_dump())


@router.get("/api/readiness/status/{shipment_id}")
def get_shipment_release_status(shipment_id: str, user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    org_id = (user.get("organization_id") or user.get("org_id")) if user else None
    try:
        from db.shipments_repo import ShipmentsRepo
    except ImportError:
        from backend.db.shipments_repo import ShipmentsRepo
    shipment = ShipmentsRepo.get_shipment(shipment_id, organization_id=org_id)
    if shipment and org_id and shipment.get("organization_id") and shipment.get("organization_id") != org_id:
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")
    status = ReadinessService.get_release_status(shipment_id)
    if status:
        if org_id and status.get("organization_id") and status.get("organization_id") != org_id:
            raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")
        return status
    if not shipment:
        raise HTTPException(status_code=404, detail=f"Shipment '{shipment_id}' not found")
    return {"shipment_id": shipment_id, "status": "DRAFT", "can_release": False}


@router.post("/api/readiness/request-release")
def request_dispatch_release(payload: RequestReleaseRequest, user: Dict[str, Any] = Depends(get_current_user)):
    return ReadinessService.request_release(
        shipment_id=payload.shipment_id, organization_id=extract_org_id(user),
        user_id=user["id"], user_role=user.get("role", "DISPATCH"), evaluation=payload.evaluation,
    )


@router.post("/api/readiness/approve-release")
def approve_dispatch_release(
    payload: ApproveReleaseRequest,
    user: Dict[str, Any] = Depends(require_roles(["QA_INSPECTOR", "OWNER"])),
):
    try:
        return ReadinessService.approve_release(
            shipment_id=payload.shipment_id, organization_id=extract_org_id(user),
            user_id=user["id"], user_role=user.get("role", "QA_INSPECTOR"),
            evaluation=payload.evaluation, override_reason=payload.override_reason,
        )
    except PermissionError as pe:
        raise safe_http_error(pe, status_code=403, fallback_message="Permission denied.", context="readiness.approve_release")
    except ValueError as ve:
        raise safe_http_error(ve, status_code=400, fallback_message="Invalid readiness release request.", context="readiness.approve_release")


@router.get("/api/readiness/at-risk")
def get_shipments_at_risk(user: Dict[str, Any] = Depends(get_current_user)):
    sample_evaluations = [
        {
            "shipment_id": "EXP-2026-114", "container": "CMAU-749102-5", "destination": "Rotterdam, Netherlands",
            "score": 65, "status": "BLOCKED",
            "issue": "Missing verified Melt-and-Pour country on SAIL MTC",
            "action_link": "/app?view=mtc-workbench&shipment=EXP-2026-114&field=country_of_melt",
        },
        {
            "shipment_id": "EXP-2026-120", "container": "MEDU-992104-1", "destination": "Antwerp, Belgium",
            "score": 85, "status": "FIX_NEEDED",
            "issue": "CBAM specific emissions calculation pending",
            "action_link": "/app?view=cbam-dossier&shipment=EXP-2026-120",
        },
    ]
    return {"at_risk_count": len(sample_evaluations), "shipments": sample_evaluations}


@router.get("/api/suppliers")
def list_suppliers(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {"suppliers": SupplierService.list_suppliers(organization_id=extract_org_id(current_user))}


@router.get("/api/suppliers/templates/learned")
@router.get("/api/suppliers/templates")
def list_learned_templates():
    return {"templates": SupplierService.get_learned_templates()}


@router.get("/api/suppliers/{supplier_id}")
def get_supplier_details(supplier_id: str, current_user=Depends(get_optional_user)):
    org_id = (current_user.get("organization_id") or current_user.get("org_id")) if current_user else None
    sup = SupplierService.get_supplier(supplier_id, organization_id=org_id)
    if not sup:
        raise HTTPException(status_code=404, detail=f"Supplier {supplier_id} not found")
    return sup


@router.post("/api/suppliers/match-po")
def match_purchase_order(payload: MatchPurchaseOrderRequest):
    return SupplierService.match_purchase_order(
        po_number=payload.po_number, supplier_id=payload.supplier_id, heat_number=payload.heat_number,
        ordered_grade=payload.ordered_grade, expected_weight_kg=payload.expected_weight_kg,
        received_weight_kg=payload.received_weight_kg, tolerance_pct=payload.tolerance_pct,
    )


@router.post("/api/suppliers/request-correction")
@router.post("/api/suppliers/correction-request")
def generate_supplier_correction(payload: SupplierCorrectionRequest):
    return SupplierService.generate_correction_request(
        supplier_id=payload.supplier_id, cert_number=payload.cert_number, heat_number=payload.heat_number,
        defect_type=payload.defect_type, exporter_name=payload.exporter_name or "Export Compliance Team",
    )
