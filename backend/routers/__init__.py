"""
HEATLEDGER AI: Sub-Routers Module Index (Prompt M4)
Exports all modular FastAPI routers for clean app assembly.
"""

from .health import router as health_router
from .pilot import router as pilot_router
from .auth import router as auth_router
from .billing import router as billing_router

__all__ = [
    "health_router",
    "pilot_router",
    "auth_router",
    "billing_router",
]
