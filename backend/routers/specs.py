"""
HEATLEDGER AI: Buyer-Spec Check & Grade Tolerances Router (Prompt C1)
Specification: Prompt Pack v4 - Phase C (C1)

Endpoints:
- GET /api/specs/grades: List seeded & plant-confirmed steel grades
- GET /api/specs/grades/{grade_id}: Get specific grade numeric limits
- POST /api/specs/check-heat: Evaluate heat chemistry & mechanical against limits
- POST /api/specs/check-shipment: Batch evaluate all heats in a shipment
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from spec_service import SpecService
except ImportError:
    from backend.spec_service import SpecService

try:
    from dependencies import get_current_user
except ImportError:
    from backend.dependencies import get_current_user

router = APIRouter(prefix="/api/specs", tags=["Buyer Spec Check & Tolerances"])


class HeatSpecCheckRequest(BaseModel):
    heat_id: str = Field(..., description="Unique mill heat number or internal ID")
    grade_id: str = Field(..., description="Target grade ID, e.g. astm_a105, astm_a350_lf2_cl1")
    chemistry: Dict[str, Any] = Field(default_factory=dict, description="Chemical element percentages")
    mechanical: Dict[str, Any] = Field(default_factory=dict, description="Mechanical test values")
    test_date: Optional[str] = Field(None, description="MTC laboratory test date (YYYY-MM-DD)")
    dispatch_date: Optional[str] = Field(None, description="Shipment planned dispatch date (YYYY-MM-DD)")
    custom_spec: Optional[Dict[str, Any]] = Field(None, description="Optional buyer-overridden tolerances")


class ShipmentSpecCheckRequest(BaseModel):
    shipment_id: str = Field(..., description="Shipment tracking identifier")
    heats: List[Dict[str, Any]] = Field(..., description="List of heat dicts allocated to shipment")


@router.get("/grades")
def list_grades(
    category: Optional[str] = None,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Returns list of seeded & plant-confirmed steel grade specifications.
    Each includes numeric limits, source note, and confirmation status.
    """
    grades = SpecService.list_grades(category=category)
    return {
        "status": "success",
        "count": len(grades),
        "disclaimer": "Plant-confirmed limits, check against current standard. Prepares documents for review. Not legal advice.",
        "grades": grades
    }


@router.get("/grades/{grade_id}")
def get_grade_spec(
    grade_id: str,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves full numeric limits and test requirements for a specific grade."""
    grade = SpecService.get_grade(grade_id)
    if not grade:
        raise HTTPException(status_code=404, detail=f"Grade specification '{grade_id}' not found in confirmed library")
    return {
        "status": "success",
        "grade": grade
    }


@router.post("/check-heat")
def check_heat_spec(
    payload: HeatSpecCheckRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Checks heat chemistry and mechanical properties against the assigned grade spec.
    Applies ASTM E29 Rounding-Off Method and self-consistency cross-checks.
    """
    res = SpecService.check_heat_against_spec(
        heat_id=payload.heat_id,
        heat_elements=payload.chemistry,
        heat_mechanical=payload.mechanical,
        grade_id=payload.grade_id,
        test_date=payload.test_date,
        dispatch_date=payload.dispatch_date,
        custom_spec=payload.custom_spec
    )
    return res


@router.post("/check-shipment")
def check_shipment_specs(
    payload: ShipmentSpecCheckRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Evaluates all heats allocated to a shipment against their order specs.
    Returns executive summary line (e.g. 'All 12 heats meet the entered limits').
    """
    res = SpecService.check_shipment_heats(
        shipment_id=payload.shipment_id,
        heats=payload.heats
    )
    return res
