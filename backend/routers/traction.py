"""
HEATLEDGER AI: Traction & Social Proof API Router (Prompt E3)
Endpoints:
- GET /api/public/customers: Customer quotes & logos with verified written permission
- GET /api/admin/traction: Real-time database metrics (pilots, MRR, certificates, hours saved)
- GET /api/admin/traction/csv: Data room CSV export
- GET /api/admin/traction/case-studies: Verified case studies
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Response

try:
    from backend.traction_service import TractionService
    from backend.dependencies import get_current_user
except ImportError:
    from traction_service import TractionService
    from dependencies import get_current_user

router = APIRouter(tags=["Traction & Social Proof"])


# =============================================================================
# Public Endpoints
# =============================================================================

@router.get("/api/public/customers")
def get_public_customers():
    """Returns only customers who gave written permission for public marketing display."""
    return TractionService.get_public_approved_customers()


# =============================================================================
# Admin-Only Traction & Data Room Endpoints
# =============================================================================

@router.get("/api/admin/traction")
def get_admin_traction(user: Dict[str, Any] = Depends(get_current_user)):
    """Real-time traction vitals computed directly from database tables."""
    return TractionService.get_realtime_traction_metrics()


@router.get("/api/admin/traction/csv")
def export_traction_csv(user: Dict[str, Any] = Depends(get_current_user)):
    """Exports raw database metrics in CSV format for investor data room."""
    csv_text = TractionService.export_traction_csv()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=heatledger_traction_metrics.csv"}
    )


@router.get("/api/admin/traction/case-studies")
def get_case_studies(user: Dict[str, Any] = Depends(get_current_user)):
    """Lists verified case studies with quantitative impact figures."""
    return TractionService.get_case_studies(public_only=False)
