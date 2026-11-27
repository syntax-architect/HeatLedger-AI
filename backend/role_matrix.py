"""
HEATLEDGER AI: Declarative Role Matrix & Authorization Gate (Prompt Pack v5 Task 4.3)
Defines canonical platform and plant roles:
  OWNER, QA_HEAD, QA_INSPECTOR, EXPORT_DOC, VIEWER, CONSULTANT, PLATFORM_ADMIN

Enforces:
1. Authoritative route-group RBAC across all private endpoints.
2. Zero 'any logged-in user' state-changing routes without role checks.
3. QA_INSPECTOR / QA_HEAD + fresh 10-minute TOTP step-up for cryptographic signing.
4. Strict OWNER-only gates for billing mutations and user/team management.
"""

from dataclasses import dataclass
from typing import Dict, FrozenSet, List, Optional, Tuple
from fastapi import HTTPException

CANONICAL_ROLES: Tuple[str, ...] = (
    "OWNER",
    "QA_HEAD",
    "QA_INSPECTOR",
    "EXPORT_DOC",
    "VIEWER",
    "CONSULTANT",
    "PLATFORM_ADMIN",
)

# Maps legacy database/display role aliases onto the 7 canonical roles
ROLE_ALIASES: Dict[str, str] = {
    "OWNER": "OWNER",
    "QA_HEAD": "QA_HEAD",
    "QA_INSPECTOR": "QA_INSPECTOR",
    "EXPORT_DOC": "EXPORT_DOC",
    "DISPATCH": "EXPORT_DOC",
    "VIEWER": "VIEWER",
    "CONSULTANT": "CONSULTANT",
    "PLATFORM_ADMIN": "PLATFORM_ADMIN",
    "ADMIN": "PLATFORM_ADMIN",
    "SUPER_ADMIN": "PLATFORM_ADMIN",
    "SANDBOX_DEMO": "VIEWER",
}

ALL_PLANT_ROLES: FrozenSet[str] = frozenset({
    "OWNER",
    "QA_HEAD",
    "QA_INSPECTOR",
    "EXPORT_DOC",
    "VIEWER",
    "CONSULTANT",
})

ALL_PLANT_WRITE_ROLES: FrozenSet[str] = frozenset({
    "OWNER",
    "QA_HEAD",
    "QA_INSPECTOR",
    "EXPORT_DOC",
    "CONSULTANT",
})

ALL_AUTHENTICATED_ROLES: FrozenSet[str] = frozenset(CANONICAL_ROLES)


def normalize_role(raw_role: Optional[str]) -> str:
    """Normalizes role names (including legacy aliases DISPATCH/ADMIN) into canonical roles."""
    cleaned = (raw_role or "").strip().upper()
    return ROLE_ALIASES.get(cleaned, cleaned or "VIEWER")


@dataclass(frozen=True)
class RoutePolicy:
    group: str
    allowed_roles: FrozenSet[str]
    requires_step_up: bool = False
    description: str = ""


# Declarative Role Matrix Table (Source of truth for runtime RBAC & generated tests)
ROLE_MATRIX: Dict[str, RoutePolicy] = {
    "admin_platform": RoutePolicy(
        group="admin_platform",
        allowed_roles=frozenset({"PLATFORM_ADMIN"}),
        description="Super-admin console, job retries, kill switches, tenant impersonation",
    ),
    "billing_owner_mutations": RoutePolicy(
        group="billing_owner_mutations",
        allowed_roles=frozenset({"OWNER"}),
        description="Subscription checkout, plan upgrades, order creation (OWNER only)",
    ),
    "billing_coupon_preview": RoutePolicy(
        group="billing_coupon_preview",
        allowed_roles=frozenset({"OWNER", "QA_HEAD", "QA_INSPECTOR", "EXPORT_DOC"}),
        description="Stateless promotional discount & GST breakdown preview",
    ),
    "billing_read": RoutePolicy(
        group="billing_read",
        allowed_roles=ALL_PLANT_ROLES,
        description="Read subscription status, invoices, and invoice PDFs",
    ),
    "team_management_mutations": RoutePolicy(
        group="team_management_mutations",
        allowed_roles=frozenset({"OWNER"}),
        description="Invite/remove members, setup inspector, rotate org keys, onboarding wizard (OWNER only)",
    ),
    "org_impersonation_audit": RoutePolicy(
        group="org_impersonation_audit",
        allowed_roles=frozenset({"OWNER"}),
        description="View admin impersonation audit logs for plant (OWNER only)",
    ),
    "privacy_gdpr": RoutePolicy(
        group="privacy_gdpr",
        allowed_roles=frozenset({"OWNER"}),
        description="GDPR retention settings, full org export, deletion requests (OWNER only)",
    ),
    "integrations_owner": RoutePolicy(
        group="integrations_owner",
        allowed_roles=frozenset({"OWNER"}),
        description="Manage scoped API keys and webhook subscriptions (OWNER only)",
    ),
    "dossier_signing": RoutePolicy(
        group="dossier_signing",
        allowed_roles=frozenset({"QA_HEAD", "QA_INSPECTOR"}),
        requires_step_up=True,
        description="Cryptographic EN 10204 certificate signing (QA_INSPECTOR/QA_HEAD + fresh TOTP step-up)",
    ),
    "melt_and_pour_seal": RoutePolicy(
        group="melt_and_pour_seal",
        allowed_roles=frozenset({"OWNER", "QA_HEAD", "QA_INSPECTOR"}),
        description="Seal verified EU melt-and-pour evidence pack",
    ),
    "readiness_approve": RoutePolicy(
        group="readiness_approve",
        allowed_roles=frozenset({"OWNER", "QA_HEAD", "QA_INSPECTOR"}),
        description="Approve shipment readiness release gate",
    ),
    "auth_mfa_enrol": RoutePolicy(
        group="auth_mfa_enrol",
        allowed_roles=frozenset({"OWNER", "QA_HEAD", "QA_INSPECTOR"}),
        description="Enrol/confirm TOTP authenticator & passkey step-up",
    ),
    "auth_self_service": RoutePolicy(
        group="auth_self_service",
        allowed_roles=ALL_AUTHENTICATED_ROLES,
        description="Current user session info (/api/auth/me) and sign-out-everywhere",
    ),
    "consultant_portal": RoutePolicy(
        group="consultant_portal",
        allowed_roles=frozenset({"OWNER", "CONSULTANT"}),
        description="Multi-plant consultant portfolio, client invites, white-label, consolidated billing",
    ),
    "operational_mutations": RoutePolicy(
        group="operational_mutations",
        allowed_roles=ALL_PLANT_WRITE_ROLES,
        description="Upload MTCs, edit extraction, heats/ledger allocation, CBAM calcs, specs, portal share links, radar/intake config",
    ),
    "operational_reads": RoutePolicy(
        group="operational_reads",
        allowed_roles=ALL_PLANT_ROLES,
        description="Read plant certificates, heats, CBAM workspaces, audit logs, readiness & team list",
    ),
    "analytics_and_support_reads": RoutePolicy(
        group="analytics_and_support_reads",
        allowed_roles=ALL_AUTHENTICATED_ROLES,
        description="Authenticated read-only views for notifications, metrics summary, and support links",
    ),
}


def resolve_route_policy(path: str, method: str) -> RoutePolicy:
    """
    Maps any private endpoint (path, method) deterministically to a RoutePolicy in ROLE_MATRIX.
    Fail-closed: unrecognized private mutations default to ALL_PLANT_WRITE_ROLES (never VIEWER).
    """
    m = (method or "GET").upper()
    is_mutation = m in ("POST", "PUT", "PATCH", "DELETE")
    clean = path.rstrip("/") or "/"

    # 1. Platform Super-Admin
    if clean.startswith("/api/admin"):
        return ROLE_MATRIX["admin_platform"]

    # 2. Auth self-service & MFA step-up
    if clean in ("/api/auth/totp/enrol", "/api/auth/totp/confirm", "/api/auth/step-up"):
        return ROLE_MATRIX["auth_mfa_enrol"]
    if clean.startswith("/api/auth"):
        return ROLE_MATRIX["auth_self_service"]

    # 3. Cryptographic signing & sealing
    if clean in ("/api/dossier/sign", "/api/dossier/sign-certificate"):
        return ROLE_MATRIX["dossier_signing"]
    if clean == "/api/melt-and-pour/seal-pack":
        return ROLE_MATRIX["melt_and_pour_seal"]

    # 4. Readiness release approval vs preparation
    if clean == "/api/readiness/approve-release":
        return ROLE_MATRIX["readiness_approve"]

    # 5. Billing (OWNER-only mutations)
    if clean.startswith("/api/billing"):
        if clean == "/api/billing/apply-coupon":
            return ROLE_MATRIX["billing_coupon_preview"]
        if is_mutation:
            return ROLE_MATRIX["billing_owner_mutations"]
        return ROLE_MATRIX["billing_read"]

    # 6. Team management, Onboarding & Owner Impersonation Audit
    if clean == "/api/org/impersonation-logs":
        return ROLE_MATRIX["org_impersonation_audit"]
    if clean == "/api/onboarding/wizard":
        return ROLE_MATRIX["team_management_mutations"]
    if clean.startswith("/api/team"):
        if is_mutation:
            return ROLE_MATRIX["team_management_mutations"]
        return ROLE_MATRIX["operational_reads"]

    # 7. GDPR / Privacy management (OWNER only)
    if clean.startswith("/api/privacy"):
        return ROLE_MATRIX["privacy_gdpr"]

    # 8. Integrations API keys & webhooks
    if clean.startswith("/api/integrations"):
        if is_mutation:
            return ROLE_MATRIX["integrations_owner"]
        return ROLE_MATRIX["operational_reads"]

    # 9. Consultant multi-plant portal
    if clean.startswith("/api/consultant"):
        return ROLE_MATRIX["consultant_portal"]

    # 10. All remaining operational plant routes (MTC, ledger, CBAM, specs, suppliers, portal share, intake, radar, value-screen, audit, demo)
    if is_mutation:
        return ROLE_MATRIX["operational_mutations"]

    # 11. Authenticated reads (plant or platform admin metrics/analytics/notifications/support)
    if clean.startswith(("/api/analytics", "/api/vitals", "/api/support", "/api/notifications")):
        return ROLE_MATRIX["analytics_and_support_reads"]

    return ROLE_MATRIX["operational_reads"]


def enforce_role_matrix(path: str, method: str, user: Dict) -> RoutePolicy:
    """
    Validates user's verified role against the RoutePolicy for (path, method).
    Raises HTTP 403 Forbidden if unauthorized or missing required TOTP step-up.
    """
    policy = resolve_route_policy(path, method)
    raw_role = user.get("role")
    role = normalize_role(raw_role)

    if role not in policy.allowed_roles:
        allowed_str = ", ".join(sorted(policy.allowed_roles))
        raise HTTPException(
            status_code=403,
            detail=(
                f"Forbidden: Insufficient privileges for role-matrix group '{policy.group}'. "
                f"Allowed roles: [{allowed_str}], your role is {raw_role}."
            ),
        )

    if policy.requires_step_up:
        try:
            from backend.auth_service import AuthService
        except ImportError:
            from auth_service import AuthService
        user_id = user.get("id") or user.get("user_id") or user.get("sub")
        if not user_id or not AuthService.check_step_up_valid(user_id):
            raise HTTPException(
                status_code=403,
                detail="Step-up verification expired or required. Fresh MFA check within 10 minutes is required to sign.",
            )

    return policy
