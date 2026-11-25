"""
HEATLEDGER AI: Buyer Spec Check & Grade Library Router (Prompt C1)
Specification: Prompt Pack v4 - Phase C (Task C1)

Routes:
- GET  /api/spec-check/library               - Returns all seeded and custom grade rules
- GET  /api/spec-check/library/{grade_id}   - Returns single grade specification
- POST /api/spec-check/library               - Saves/updates plant-confirmed grade spec
- POST /api/spec-check/evaluate-heat         - Evaluates heat properties against entered limits
- POST /api/spec-check/evaluate-shipment     - Evaluates shipment heats and produces single summary line
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from spec_check_service import SpecCheckService, SPEC_DISCLAIMER_TEXT
    from dependencies import get_current_user
except ImportError:
    from backend.spec_check_service import SpecCheckService, SPEC_DISCLAIMER_TEXT
    from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/spec-check", tags=["buyer-spec-check"])


class SaveSpecRequest(BaseModel):
    id: Optional[str] = None
    standard_name: str = "Plant Custom Spec"
    grade: str
    category: str = "custom"
    elements: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    mechanical: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    cev_max: Optional[float] = None
    source_note: Optional[str] = "Plant Entered Limits"


class EvaluateHeatRequest(BaseModel):
    heat_number: str
    grade: Optional[str] = None
    target_grade_or_id: Optional[str] = None
    chemistry: Dict[str, Optional[float]] = Field(default_factory=dict)
    mechanical: Dict[str, Optional[float]] = Field(default_factory=dict)
    test_date: Optional[str] = None
    certificate_date: Optional[str] = None
    dispatch_date: Optional[str] = None
    custom_spec: Optional[Dict[str, Any]] = None


class EvaluateShipmentRequest(BaseModel):
    shipment_id: Optional[str] = "SHP-DEFAULT"
    invoice_number: Optional[str] = "INV-DEFAULT"
    target_grade: Optional[str] = "S355JR"
    heats: List[Dict[str, Any]] = Field(default_factory=list)
    custom_spec: Optional[Dict[str, Any]] = None


@router.get("/library")
def get_spec_library():
    """Returns the full specification library of plant-confirmed grade rules."""
    grades = SpecCheckService.load_spec_library()
    return {
        "count": len(grades),
        "disclaimer": SPEC_DISCLAIMER_TEXT,
        "grades": grades
    }


@router.get("/library/{spec_id_or_grade}")
def get_single_spec(spec_id_or_grade: str):
    """Retrieves a specific grade rule by ID or grade name."""
    spec = SpecCheckService.get_spec_by_grade_or_id(spec_id_or_grade)
    if not spec:
        raise HTTPException(
            status_code=404,
            detail=f"Grade or specification rule '{spec_id_or_grade}' not found"
        )
    return {"spec": spec, "disclaimer": SPEC_DISCLAIMER_TEXT}


@router.post("/library")
def save_custom_spec(
    payload: SaveSpecRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Saves or updates a plant-confirmed grade rule."""
    entered_by = user.get("email") or user.get("sub") or "Plant QA Engineering"
    saved = SpecCheckService.save_spec(payload.model_dump(), entered_by=entered_by)
    return {
        "status": "saved",
        "spec": saved,
        "disclaimer": SPEC_DISCLAIMER_TEXT
    }


@router.post("/evaluate-heat")
def evaluate_heat_spec(payload: EvaluateHeatRequest):
    """
    Evaluates an individual heat certificate against target grade or custom limits.
    Returns field checks with rounding rules, certificate self-consistency, and summary.
    """
    spec = payload.custom_spec
    if not spec:
        target = payload.target_grade_or_id or payload.grade or "S355JR"
        spec = SpecCheckService.get_spec_by_grade_or_id(target)
        if not spec:
            raise HTTPException(
                status_code=404,
                detail=f"Target specification '{target}' not found in library"
            )

    heat_data = payload.model_dump()
    result = SpecCheckService.evaluate_heat_against_spec(heat_data, spec)
    return result


@router.post("/evaluate-shipment")
def evaluate_shipment_spec(payload: EvaluateShipmentRequest):
    """
    Evaluates all heats in an export shipment against buyer order limits.
    Produces single summary line: 'All X heats meet the entered limits' or 'Y heats need attention'.
    """
    shipment_data = payload.model_dump()
    result = SpecCheckService.evaluate_shipment_against_spec(
        shipment_data, spec_rule=payload.custom_spec
    )
    return result
