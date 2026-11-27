"""
HEATLEDGER AI: Approvals, Roles & Tamper-Evident Audit Trail Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from audit_service import AuditService
    from dependencies import extract_org_id, require_roles
except ImportError:
    from backend.audit_service import AuditService
    from backend.dependencies import extract_org_id, require_roles

router = APIRouter(tags=["Audit Trail & Workflow"])


class TransitionWorkflowPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str = Field(..., max_length=50)
    entity_id: str = Field(..., max_length=100)
    target_status: str = Field(..., max_length=50)


class UpdateWorkflowConfigPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    small_plant_mode: bool
    require_separate_reviewer: bool
    retention_years: int = Field(10, ge=1, le=50)


class UpdateWorkflowConfigV2Payload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    small_plant_mode: bool = False
    require_separate_reviewer: bool = True
    retention_years: int = Field(10, ge=1, le=50)


class AddAuditCommentPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str = Field(..., max_length=50)
    entity_id: str = Field(..., max_length=100)
    comment_text: str = Field(..., min_length=2, max_length=1000)


class SetLegalHoldPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_id: str = Field(..., max_length=100)
    legal_hold: bool
    reason: str = Field(..., min_length=3, max_length=500)


class WorkflowTransitionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str = Field(..., max_length=50)
    entity_id: str = Field(..., max_length=100)
    target_status: str = Field(..., max_length=50)


class LegalHoldPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_id: str = Field(..., max_length=100)
    legal_hold: bool
    reason: str = Field(..., min_length=3, max_length=500)


class AddCommentPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    entity_type: str = Field(..., max_length=50)
    entity_id: str = Field(..., max_length=100)
    comment_text: str = Field(..., min_length=1, max_length=2000)


def _actor_context(user_payload: dict, request: Request) -> tuple[str, str, str, str]:
    user_id = user_payload.get("sub") or user_payload.get("user_id") or "usr_unknown"
    user_name = user_payload.get("name") or user_payload.get("email") or "Authorized User"
    user_role = user_payload.get("role") or "QA"
    ip = request.client.host if request.client else "127.0.0.1"
    return user_id, user_name, user_role, ip


@router.post("/api/audit/transition")
def transition_workflow_status(
    payload: TransitionWorkflowPayload,
    request: Request,
    user_payload: dict = Depends(require_roles(["DISPATCH", "QA", "QA_INSPECTOR", "QA_HEAD", "OWNER", "ADMIN"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    try:
        return AuditService.transition_state(
            organization_id=org_id, entity_type=payload.entity_type, entity_id=payload.entity_id,
            target_status=payload.target_status, user_id=user_id, user_name=user_name,
            user_role=user_role, ip_address=ip,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/api/audit/workflow-config")
def get_plant_workflow_configuration(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AuditService.get_plant_config(organization_id=extract_org_id(user_payload))


@router.post("/api/audit/workflow-config")
def update_plant_workflow_configuration(
    payload: UpdateWorkflowConfigPayload,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER", "QA_HEAD"])),
):
    return AuditService.update_plant_config(
        organization_id=extract_org_id(user_payload),
        small_plant_mode=payload.small_plant_mode,
        require_separate_reviewer=payload.require_separate_reviewer,
        retention_years=payload.retention_years,
    )


@router.get("/api/audit/comments")
def list_entity_audit_comments(
    entity_id: str = Query(..., max_length=100),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return {"comments": AuditService.list_comments(organization_id=extract_org_id(user_payload), entity_id=entity_id)}


@router.delete("/api/audit/entities/{entity_id}")
def delete_entity_with_legal_hold_check(
    entity_id: str,
    request: Request,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    try:
        return AuditService.delete_entity(
            organization_id=org_id, entity_id=entity_id,
            user_id=user_id, user_name=user_name, user_role=user_role, ip_address=ip,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/api/audit/export/csv")
def export_audit_log_csv(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    return Response(
        content=AuditService.export_csv(organization_id=org_id), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="HeatLedger_AuditLog_{org_id}.csv"'},
    )


@router.get("/api/audit/export/pdf")
def export_audit_log_pdf(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    return Response(
        content=AuditService.export_pdf_certificate(organization_id=org_id), media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="HeatLedger_AuditCertificate_{org_id}.pdf"'},
    )


@router.get("/api/audit/trail")
def get_audit_trail(
    entity_type: Optional[str] = Query(None, max_length=50),
    entity_id: Optional[str] = Query(None, max_length=100),
    action: Optional[str] = Query(None, max_length=50),
    limit: int = Query(100, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AuditService.list_audit_trail(
        organization_id=extract_org_id(user_payload),
        entity_type=entity_type, entity_id=entity_id, action=action, limit=limit, offset=offset,
    )


@router.post("/api/audit/workflow/transition")
def transition_workflow_state(
    payload: WorkflowTransitionPayload,
    request: Request,
    user_payload: dict = Depends(require_roles(["DISPATCH", "QA", "QA_INSPECTOR", "QA_HEAD", "ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    try:
        return AuditService.transition_state(
            organization_id=org_id, entity_type=payload.entity_type, entity_id=payload.entity_id,
            target_status=payload.target_status, user_id=user_id, user_name=user_name,
            user_role=user_role, ip_address=ip,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/api/audit/workflow/config")
def get_workflow_config(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AuditService.get_plant_config(organization_id=extract_org_id(user_payload))


@router.post("/api/audit/workflow/config")
def update_workflow_config(
    payload: UpdateWorkflowConfigV2Payload,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER", "QA_HEAD"])),
):
    return AuditService.update_plant_config(
        organization_id=extract_org_id(user_payload),
        small_plant_mode=payload.small_plant_mode,
        require_separate_reviewer=payload.require_separate_reviewer,
        retention_years=payload.retention_years,
    )


@router.post("/api/audit/legal-hold")
def set_legal_hold(
    payload: LegalHoldPayload,
    request: Request,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER", "QA_HEAD"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    try:
        return AuditService.set_legal_hold(
            organization_id=org_id, entity_id=payload.entity_id, legal_hold=payload.legal_hold,
            user_id=user_id, user_name=user_name, user_role=user_role, reason=payload.reason, ip_address=ip,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.delete("/api/audit/entity/{entity_id}")
def delete_audit_entity(
    entity_id: str,
    request: Request,
    user_payload: dict = Depends(require_roles(["ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    try:
        return AuditService.delete_entity(
            organization_id=org_id, entity_id=entity_id,
            user_id=user_id, user_name=user_name, user_role=user_role, ip_address=ip,
        )
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.post("/api/audit/comments")
def add_entity_comment(
    payload: AddCommentPayload,
    request: Request,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    user_id, user_name, user_role, ip = _actor_context(user_payload, request)
    return AuditService.add_comment(
        organization_id=org_id, entity_type=payload.entity_type, entity_id=payload.entity_id,
        author_id=user_id, author_name=user_name, author_role=user_role,
        comment_text=payload.comment_text, ip_address=ip,
    )


@router.get("/api/audit/comments/{entity_id}")
def list_entity_comments(
    entity_id: str,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AuditService.list_comments(organization_id=extract_org_id(user_payload), entity_id=entity_id)


@router.get("/api/audit/notifications")
def list_in_app_notifications(
    recipient: Optional[str] = Query(None, max_length=100),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    target_recipient = recipient or user_payload.get("name") or user_payload.get("email") or "all"
    return AuditService.list_notifications(organization_id=extract_org_id(user_payload), recipient=target_recipient)


@router.get("/api/audit/verify-chain")
def verify_hash_chain(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return AuditService.verify_hash_chain(organization_id=extract_org_id(user_payload))


@router.get("/api/audit/export.csv")
def export_audit_csv(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return Response(
        content=AuditService.export_csv(organization_id=extract_org_id(user_payload)),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="Audit_Trail_Export.csv"'},
    )


@router.get("/api/audit/certificate.pdf")
def export_audit_certificate_pdf(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return Response(
        content=AuditService.export_pdf_certificate(organization_id=extract_org_id(user_payload)),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Audit_Trail_Certificate.pdf"'},
    )
