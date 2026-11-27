"""
HEATLEDGER AI: Sub-Routers Module Index (Prompt M4, C1-C8, D2-D4, E3, Pack v5 Task 6.1)
Exports all modular FastAPI routers for clean app assembly.
"""

from .admin_and_ops import router as admin_and_ops_router
from .anomalies import router as anomalies_router
from .audit import router as audit_router
from .auth import router as auth_router
from .billing import router as billing_router
from .cbam import router as cbam_router
from .cbam_exposure import router as cbam_exposure_router
from .consultant import router as consultant_router
from .documents import router as documents_router
from .dossiers import router as dossiers_router
from .health import router as health_router
from .importer_portal import router as importer_portal_router
from .intake import router as intake_router
from .intake_c8 import router as intake_c8_router
from .ledger import router as ledger_router
from .melt_and_pour import router as melt_and_pour_router
from .mill_chaser import router as mill_chaser_router
from .orgs_and_team import router as orgs_and_team_router
from .partners import router as partners_router
from .pilot import router as pilot_router
from .portal import router as portal_router
from .public_check import router as public_check_router
from .radar_and_roi import router as radar_and_roi_router
from .sales_and_leads import router as sales_and_leads_router
from .spec_check import router as spec_check_router
from .specs import router as specs_router
from .traction import router as traction_router
from .value_screen import router as value_screen_router

__all__ = [
    "health_router",
    "pilot_router",
    "auth_router",
    "billing_router",
    "specs_router",
    "spec_check_router",
    "anomalies_router",
    "melt_and_pour_router",
    "mill_chaser_router",
    "value_screen_router",
    "importer_portal_router",
    "cbam_exposure_router",
    "sales_and_leads_router",
    "partners_router",
    "intake_c8_router",
    "traction_router",
    "cbam_router",
    "public_check_router",
    "dossiers_router",
    "documents_router",
    "ledger_router",
    "intake_router",
    "portal_router",
    "radar_and_roi_router",
    "audit_router",
    "consultant_router",
    "orgs_and_team_router",
    "admin_and_ops_router",
]
