"""
HEATLEDGER AI: Enterprise Hardened FastAPI Backend Application
Assembles middleware, global security dependencies, and modular domain routers.
"""

import logging
import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

try:
    from dependencies import (  # noqa: F401
        extract_org_id,
        get_current_user,
        get_optional_user,
        get_org_context,
        require_qa_head,
        require_qa_inspector_step_up,
        require_roles,
    )
    from middleware import (
        RequestBodySizeLimitMiddleware,
        SecurityHeadersMiddleware,
        SlidingWindowRateLimiter,
        lifespan,
        register_exception_handlers,
    )
    from observability import check_system_health  # noqa: F401
    from privacy_service import SensitiveDataLoggingFilter
    from public_routes import MandatoryAuthMiddleware, enforce_mandatory_auth
    from routers import (
        admin_and_ops_router,
        anomalies_router,
        audit_router,
        auth_router,
        billing_router,
        cbam_exposure_router,
        cbam_router,
        consultant_router,
        documents_router,
        dossiers_router,
        health_router,
        importer_portal_router,
        intake_c8_router,
        intake_router,
        ledger_router,
        melt_and_pour_router,
        mill_chaser_router,
        orgs_and_team_router,
        partners_router,
        pilot_router,
        portal_router,
        public_check_router,
        radar_and_roi_router,
        sales_and_leads_router,
        specs_router,
        traction_router,
        value_screen_router,
    )
    from settings import get_settings
except ImportError:
    from backend.dependencies import (  # noqa: F401
        extract_org_id,
        get_current_user,
        get_optional_user,
        get_org_context,
        require_qa_head,
        require_qa_inspector_step_up,
        require_roles,
    )
    from backend.middleware import (
        RequestBodySizeLimitMiddleware,
        SecurityHeadersMiddleware,
        SlidingWindowRateLimiter,
        lifespan,
        register_exception_handlers,
    )
    from backend.observability import check_system_health  # noqa: F401
    from backend.privacy_service import SensitiveDataLoggingFilter
    from backend.public_routes import MandatoryAuthMiddleware, enforce_mandatory_auth
    from backend.routers import (
        admin_and_ops_router,
        anomalies_router,
        audit_router,
        auth_router,
        billing_router,
        cbam_exposure_router,
        cbam_router,
        consultant_router,
        documents_router,
        dossiers_router,
        health_router,
        importer_portal_router,
        intake_c8_router,
        intake_router,
        ledger_router,
        melt_and_pour_router,
        mill_chaser_router,
        orgs_and_team_router,
        partners_router,
        pilot_router,
        portal_router,
        public_check_router,
        radar_and_roi_router,
        sales_and_leads_router,
        specs_router,
        traction_router,
        value_screen_router,
    )
    from backend.settings import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Security] %(message)s",
)
logger = logging.getLogger("heatledger.security")
logger.addFilter(SensitiveDataLoggingFilter())
for _handler in logging.root.handlers:
    _handler.addFilter(SensitiveDataLoggingFilter())

is_production = os.getenv("ENV") == "production"

app = FastAPI(
    title="HeatLedger AI Backend Engine",
    description="Shop-floor-to-customs compliance operating system for Indian steel & engineering exporters.",
    version="2.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
    dependencies=[Depends(enforce_mandatory_auth)],
    lifespan=lifespan,
)

register_exception_handlers(app)

_app_settings = get_settings()
ALLOWED_ORIGINS = (
    _app_settings.ALLOWED_ORIGINS
    if isinstance(_app_settings.ALLOWED_ORIGINS, list)
    else [o.strip() for o in _app_settings.ALLOWED_ORIGINS.split(",") if o.strip()]
)

app.add_middleware(MandatoryAuthMiddleware)
app.add_middleware(SlidingWindowRateLimiter)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestBodySizeLimitMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-CSRF-Token",
        "x-csrf-token",
        "X-Request-ID",
        "X-Correlation-ID",
        "X-HeatLedger-Signature",
        "X-HeatLedger-Timestamp",
        "Accept",
        "Accept-Language",
    ],
)

for _router in (
    health_router, auth_router, billing_router, pilot_router, specs_router,
    anomalies_router, melt_and_pour_router, mill_chaser_router, value_screen_router,
    importer_portal_router, cbam_exposure_router, sales_and_leads_router, partners_router,
    intake_c8_router, traction_router, cbam_router, public_check_router, dossiers_router,
    documents_router, ledger_router, intake_router, portal_router, radar_and_roi_router,
    audit_router, consultant_router, orgs_and_team_router, admin_and_ops_router,
):
    app.include_router(_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, server_header=False)
