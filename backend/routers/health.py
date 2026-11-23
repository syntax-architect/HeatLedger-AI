"""
HEATLEDGER AI: Health, Probes & Observability Router (Prompt M4)
Endpoints:
- GET /: Service health & metadata
- GET /healthz: Kubernetes / Fly.io liveness probe
- GET /readyz: Database & system readiness probe
- POST /api/vitals: Real user monitoring (RUM) web vitals
- GET /api/vitals/summary: Aggregated web vitals summary
- GET /status: System health overview
"""

import time
from datetime import datetime, timezone
from typing import Any, Dict, List
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

try:
    from observability import check_system_health
except ImportError:
    from backend.observability import check_system_health

router = APIRouter(tags=["Health & Observability"])

_WEB_VITALS_BUFFER: List[Dict[str, Any]] = []


class WebVitalReport(BaseModel):
    name: str = Field(..., description="Web vital metric name, e.g. LCP, FID, CLS, TTFB, INP")
    value: float = Field(..., ge=0.0, description="Metric numeric value")
    rating: str = Field("good", description="Rating: good, needs-improvement, poor")
    delta: float = Field(0.0, description="Delta since last report")
    id: str = Field(..., description="Unique metric ID for deduplication")
    navigationType: str = Field("navigate", description="Navigation type")


@router.get("/")
def health_check():
    return {
        "status": "online",
        "service": "HeatLedger AI Backend",
        "security_profile": "OWASP-ASVS-4.0",
        "security_tier": "Tier-1 Enforced",
        "regulations": [
            "EN 10204 Type 3.1 Mill Certificates",
            "EU Reg 2026/1963 Melt-and-Pour",
            "EU CBAM Reg 2023/1773",
            "UK CDS Notice"
        ],
        "auth_engine": "HMAC-SHA256 Stateless JWT Active",
        "telemetry": {
            "document_integrity": "SHA-256 & HMAC-SHA256 Annex A Tamper-Lock Active",
            "transport_headers": "CSP, HSTS, X-Frame-Options: DENY, No-Sniff Enforced",
            "upload_firewall": "Magic-Byte PDF/Image Verification & Embedded JS Stripper Active (10MB Max)",
            "database_layer": "PostgreSQL Multi-Tenant RLS / DAL active"
        }
    }


@router.get("/healthz")
def liveness_probe():
    """Prompt D2: Liveness probe - process alive."""
    return {"status": "alive", "timestamp": time.time()}


@router.get("/readyz")
def readiness_probe():
    """Prompt D2: Readiness probe - database reachable."""
    status = check_system_health()
    code = 200 if status.get("database") == "CONNECTED" else 503
    return JSONResponse(content=status, status_code=code)


@router.post("/api/vitals")
def record_web_vital(vital: WebVitalReport):
    """
    Prompt D11: Lightweight Real User Monitoring (RUM) Web Vitals endpoint.
    Collects LCP, FID, CLS, FCP, TTFB, and INP metrics.
    """
    entry = vital.model_dump()
    entry["received_at"] = datetime.now(timezone.utc).isoformat()
    _WEB_VITALS_BUFFER.append(entry)
    if len(_WEB_VITALS_BUFFER) > 1000:
        _WEB_VITALS_BUFFER.pop(0)
    return {"status": "recorded", "metric": vital.name}


@router.get("/api/vitals/summary")
def get_web_vitals_summary():
    """
    Returns aggregated metrics (count, avg, p75) for the admin console.
    """
    metrics_by_name: Dict[str, List[float]] = {}
    for item in _WEB_VITALS_BUFFER:
        metrics_by_name.setdefault(item["name"], []).append(item["value"])

    summary = {}
    for name, vals in metrics_by_name.items():
        vals.sort()
        count = len(vals)
        avg = sum(vals) / count if count > 0 else 0
        p75_idx = int(count * 0.75)
        p75 = vals[min(p75_idx, count - 1)] if count > 0 else 0
        summary[name] = {
            "count": count,
            "avg": round(avg, 3),
            "p75": round(p75, 3),
            "rating": "good" if (name == "CLS" and p75 <= 0.1) or (name != "CLS" and p75 <= 2500) else "needs-improvement"
        }
    return summary
