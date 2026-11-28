"""
HEATLEDGER AI: Organizations, Team, Integrations & Notifications Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field

try:
    from admin_service import AdminService
    from audit_service import AuditService
    from auth_service import AuthService
    from crypto_signing import CryptoSigningService
    from dependencies import extract_org_id, get_current_user, get_org_context, require_roles
    from error_handling import safe_http_error
    from integration_service import IntegrationService
    from notification_service import NotificationService
except ImportError:
    from backend.admin_service import AdminService
    from backend.audit_service import AuditService
    from backend.auth_service import AuthService
    from backend.crypto_signing import CryptoSigningService
    from backend.dependencies import extract_org_id, get_current_user, get_org_context, require_roles
    from backend.error_handling import safe_http_error
    from backend.integration_service import IntegrationService
    from backend.notification_service import NotificationService

router = APIRouter(tags=["Organizations, Team & Integrations"])


class ApiKeyCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(..., min_length=2, max_length=100)
    scopes: List[str] = Field(..., min_length=1)


class WebhookCreatePayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    target_url: str = Field(..., min_length=10, max_length=500)
    events: List[str] = Field(..., min_length=1)
    secret: Optional[str] = None


class NotificationPreferencesPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    preferences: Dict[str, Any]


class TeamInviteRequest(BaseModel):
    email: str = Field(..., max_length=200)
    role: str = Field(..., max_length=50)
    plant_id: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    token: str = Field(..., min_length=16, max_length=128)
    name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=12, max_length=128)


class InspectorSetupRequest(BaseModel):
    user_id: str
    name: str = Field(..., max_length=120)
    designation: str = Field(..., max_length=120)
    emp_id: str = Field(..., max_length=64)


class OnboardingWizardRequest(BaseModel):
    company_name: str = Field(..., max_length=200)
    gstin: str = Field(..., max_length=15)
    plant_name: str = Field(..., max_length=120)
    plant_location: str = Field(..., max_length=120)
    unlocode: Optional[str] = Field(None, max_length=32)
    city: Optional[str] = Field(None, max_length=120)
    state: Optional[str] = Field(None, max_length=120)
    eu_installation_id: Optional[str] = Field(None, max_length=64)
    team_invites: List[Dict[str, str]] = Field(default_factory=list)
    inspector: Dict[str, str] = Field(default_factory=dict)


@router.post("/api/integrations/api-keys")
def create_api_key(payload: ApiKeyCreatePayload, user_payload: dict = Depends(require_roles(["OWNER"]))):
    return IntegrationService.create_api_key(
        organization_id=extract_org_id(user_payload), name=payload.name,
        scopes=payload.scopes, created_by=user_payload.get("sub") or "user",
    )


@router.get("/api/integrations/api-keys")
def list_api_keys(user_payload: dict = Depends(require_roles(["OWNER"]))):
    return IntegrationService.list_api_keys(organization_id=extract_org_id(user_payload))


@router.delete("/api/integrations/api-keys/{key_id}")
def revoke_api_key(key_id: str, user_payload: dict = Depends(require_roles(["OWNER"]))):
    if not IntegrationService.revoke_api_key(organization_id=extract_org_id(user_payload), key_id=key_id):
        raise HTTPException(status_code=404, detail="API key not found or already revoked")
    return {"status": "REVOKED", "key_id": key_id}


@router.post("/api/integrations/webhooks")
def register_webhook(payload: WebhookCreatePayload, user_payload: dict = Depends(require_roles(["OWNER"]))):
    return IntegrationService.register_webhook(
        organization_id=extract_org_id(user_payload), target_url=payload.target_url,
        events=payload.events, secret=payload.secret,
    )


@router.get("/api/integrations/webhooks")
def list_webhooks(user_payload: dict = Depends(require_roles(["OWNER"]))):
    return IntegrationService.list_webhooks(organization_id=extract_org_id(user_payload))


@router.get("/api/exports/tally-csv")
def export_tally_csv(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return Response(
        content=IntegrationService.generate_tally_csv(organization_id=extract_org_id(user_payload)),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="Tally_HeatLedger_Export.csv"'},
    )


@router.get("/api/notifications")
def list_notifications(
    unread_only: bool = Query(False),
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    org_id = extract_org_id(user_payload)
    notifs = NotificationService.list_notifications(organization_id=org_id, unread_only=unread_only)
    return {
        "organization_id": org_id,
        "unread_count": sum(1 for n in notifs if not n.get("is_read")),
        "notifications": notifs,
    }


@router.post("/api/notifications/{notification_id}/mark-read")
def mark_notification_read(
    notification_id: str,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    success = NotificationService.mark_as_read(organization_id=extract_org_id(user_payload), notification_id=notification_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Notification '{notification_id}' not found")
    return {"success": success, "notification_id": notification_id}


@router.post("/api/notifications/mark-all-read")
def mark_all_notifications_read(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return {"marked_read_count": NotificationService.mark_all_as_read(organization_id=extract_org_id(user_payload))}


@router.get("/api/notifications/preferences")
def get_notification_preferences(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return NotificationService.get_preferences(
        user_id=user_payload.get("sub") or "user", organization_id=extract_org_id(user_payload),
    )


@router.post("/api/notifications/preferences")
def update_notification_preferences(
    payload: NotificationPreferencesPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return NotificationService.update_preferences(
        user_id=user_payload.get("sub") or "user",
        organization_id=extract_org_id(user_payload),
        prefs=payload.preferences,
    )


@router.post("/api/team/invite")
def invite_team_member_endpoint(payload: TeamInviteRequest, current_user=Depends(require_roles(["OWNER"]))):
    inviter_id = current_user.get("user_id") or current_user.get("id") or "usr_owner_01"
    try:
        return AuthService.invite_team_member(
            organization_id=extract_org_id(current_user), email=payload.email, role=payload.role,
            inviter_user_id=inviter_id, plant_id=payload.plant_id,
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to invite team member.", context="team.invite")


@router.post("/api/team/accept-invite")
def accept_invite_endpoint(payload: AcceptInviteRequest):
    try:
        return AuthService.accept_invitation(token=payload.token, name=payload.name, password=payload.password)
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to accept invitation.", context="team.accept_invite")


@router.get("/api/account/first-run-checklist")
@router.get("/api/team/first-run-checklist")
def get_first_run_checklist_endpoint(current_user=Depends(get_current_user)):
    return AuthService.get_first_run_checklist(extract_org_id(current_user))


@router.get("/api/account/audit-log")
def get_account_audit_log_endpoint(
    limit: int = Query(50, ge=1, le=100),
    current_user=Depends(require_roles(["OWNER"])),
):
    return {"audit_events": AuditService.get_audit_trail(extract_org_id(current_user), limit=limit)}


@router.get("/api/team/members")
def list_team_members_endpoint(current_user=Depends(get_current_user)):
    return {"members": AuthService.list_team_members(extract_org_id(current_user))}


@router.delete("/api/team/members/{user_id}")
def remove_team_member_endpoint(user_id: str, current_user=Depends(require_roles(["OWNER"]))):
    remover_id = current_user.get("user_id") or current_user.get("id") or "usr_owner_01"
    try:
        AuthService.remove_team_member(
            organization_id=extract_org_id(current_user), user_id=user_id, removed_by_user_id=remover_id,
        )
        return {"status": "ok", "removed_user_id": user_id}
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to remove team member.", context="team.remove_member")


@router.post("/api/team/inspector/setup")
def setup_inspector_endpoint(payload: InspectorSetupRequest, current_user=Depends(require_roles(["OWNER"]))):
    return AuthService.setup_inspector_profile(
        organization_id=extract_org_id(current_user), user_id=payload.user_id,
        name=payload.name, designation=payload.designation, emp_id=payload.emp_id,
    )


@router.post("/api/team/signing-keys/rotate")
def rotate_signing_key_endpoint(current_user=Depends(require_roles(["OWNER"]))):
    return CryptoSigningService.rotate_key()


@router.get("/api/team/signing-keys")
def list_signing_keys_endpoint(current_user=Depends(get_current_user)):
    return {"keys": CryptoSigningService.list_public_keys()}


@router.get("/api/org/impersonation-logs")
def get_org_impersonation_logs(
    org_ctx: Dict[str, Any] = Depends(get_org_context),
    _role_user: Dict[str, Any] = Depends(require_roles(["OWNER"])),
):
    return {
        "organization_id": org_ctx["organization_id"],
        "logs": AdminService.list_org_impersonation_logs(org_ctx["organization_id"]),
    }


@router.post("/api/onboarding/wizard")
def onboarding_wizard_endpoint(payload: OnboardingWizardRequest, current_user=Depends(get_current_user)):
    owner_id = current_user.get("user_id") or current_user.get("id") or "usr_owner_01"
    try:
        return AuthService.setup_onboarding_wizard(
            company_name=payload.company_name, gstin=payload.gstin, plant_name=payload.plant_name,
            plant_location=payload.plant_location, team_invites=payload.team_invites,
            inspector_data=payload.inspector, owner_user_id=owner_id, unlocode=payload.unlocode,
            city=payload.city, state=payload.state, eu_installation_id=payload.eu_installation_id,
        )
    except ValueError as e:
        raise safe_http_error(e, status_code=400, fallback_message="Unable to remove team member.", context="team.remove_member")
