"""
HEATLEDGER AI: Melt-and-Pour Evidence Pack Router (Prompt Pack v4 - Task C2)
Specification: Regulation (EU) 2026/1384 Annex I & Implementing Regulation (EU) 2026/1963

Endpoints:
- GET  /api/melt-and-pour/rules: Retrieve dated regulatory rules table
- POST /api/melt-and-pour/scope-check: Scope check per CN code (7208-7306 in scope, 7307/7318 out of scope)
- POST /api/melt-and-pour/evaluate-shipment: Complete evidence, chain, gaps, checklist, and sealing gate
- POST /api/melt-and-pour/seal-pack: Execute authorized inspector sealing; blocked if gaps exist without override
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

try:
    from melt_and_pour_service import MeltAndPourService
except ImportError:
    from backend.melt_and_pour_service import MeltAndPourService

router = APIRouter(prefix="/api/melt-and-pour", tags=["Melt and Pour Evidence Pack"])


class ScopeCheckRequest(BaseModel):
    cn_codes: List[str] = Field(..., description="List of CN codes to evaluate for EU melt-and-pour scope")


class ShipmentEvaluationRequest(BaseModel):
    shipment_data: Dict[str, Any] = Field(..., description="Shipment details, lines, and heat evidence payload")
    override_reason: Optional[str] = Field(None, description="Authorized inspector reason to override gaps")


class SealPackRequest(BaseModel):
    shipment_data: Dict[str, Any] = Field(..., description="Shipment payload to seal")
    signer_name: str = Field(..., description="Name of the QA Inspector or Authorised Signatory")
    signer_role: str = Field(default="QA_INSPECTOR", description="Role of the signer")
    override_reason: Optional[str] = Field(None, description="Override justification if unresolved gaps exist")


@router.get("/rules")
async def get_dated_rules():
    """Returns dated regulatory rules with legal citations and source URLs."""
    return {"status": "ok", "rules": MeltAndPourService.get_rules_table()}


@router.post("/scope-check")
async def check_scope(payload: ScopeCheckRequest):
    """Evaluates whether CN codes are in or out of EU melt-and-pour scope."""
    results = [MeltAndPourService.check_cn_scope(c) for c in payload.cn_codes]
    return {"status": "ok", "results": [r.model_dump() for r in results]}


@router.post("/evaluate-shipment")
async def evaluate_shipment(payload: ShipmentEvaluationRequest):
    """
    Evaluates a shipment's melt-and-pour evidence, traceability chain, gaps, and auto-ticks checklist.
    Returns can_seal status.
    """
    pack = MeltAndPourService.evaluate_shipment_pack(
        shipment_data=payload.shipment_data,
        override_reason=payload.override_reason,
    )
    return {"status": "ok", "pack": pack.model_dump()}


@router.post("/seal-pack")
async def seal_pack(payload: SealPackRequest):
    """
    Seals the evidence pack.
    Blocks with HTTP 400 if gaps are present and no override is provided.
    """
    try:
        sealed_pack = MeltAndPourService.seal_evidence_pack(
            shipment_data=payload.shipment_data,
            signer_name=payload.signer_name,
            signer_role=payload.signer_role,
            override_reason=payload.override_reason,
        )
        return {"status": "ok", "pack": sealed_pack.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
