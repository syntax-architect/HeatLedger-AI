"""
HEATLEDGER AI: CBAM & Compliance Calculation Router
Extracted from main.py for Prompt Pack v5 Task 6.1.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, ConfigDict, Field

try:
    from cbam_service import CBAMService
    from cbam_workspace_service import CbamWorkspaceService
    from compliance_engine import ComplianceEngine
    from regulatory_store import RegulatoryStore
    from dependencies import extract_org_id, get_current_user, require_roles
except ImportError:
    from backend.cbam_service import CBAMService
    from backend.cbam_workspace_service import CbamWorkspaceService
    from backend.compliance_engine import ComplianceEngine
    from backend.regulatory_store import RegulatoryStore
    from backend.dependencies import extract_org_id, get_current_user, require_roles

logger = logging.getLogger("heatledger.security")
router = APIRouter(tags=["CBAM & Compliance"])


class MetallurgyValidationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    extracted_chemistry: Dict[str, float] = Field(..., description="Spectrometer ladle chemistry map (e.g. {'C': 0.22, 'Mn': 0.88})")
    extracted_mechanical: Dict[str, float] = Field(default_factory=dict, description="Extracted tensile/yield/elongation values")
    standard_chem_limits: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Standard min/max bounds per element")
    standard_mech_limits: Dict[str, Dict[str, float]] = Field(default_factory=dict, description="Standard min/max bounds per mechanical property")
    standard_code: str = Field(..., max_length=128, description="Metallurgical standard identifier (e.g. ASTM A105, EN 10216-2)")
    country_of_melt_explicit: bool = Field(..., description="True if Country of Melt and Pour is explicitly attested on certificate")


class CbamCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoice_number: str = Field(..., pattern=r"^[A-Za-z0-9\-_/]{3,32}$", description="Export invoice identifier")
    cn_code: str = Field(..., pattern=r"^\d{4,8}$", description="Export tariff Combined Nomenclature code (4-8 digits)")
    net_shipment_tonnes: float = Field(..., gt=0, le=10000000)
    upstream_precursor_see: Optional[float] = Field(default=None, ge=0, le=10000000)
    scrap_loss_ratio: float = Field(default=0.08, ge=0, le=10.0)
    monthly_grid_kwh: float = Field(default=0.0, ge=0, le=10000000)
    monthly_solar_offset_kwh: float = Field(default=0.0, ge=0, le=10000000)
    monthly_fuel_liters: float = Field(default=0.0, ge=0, le=10000000)
    monthly_total_production_tonnes: float = Field(default=1.0, gt=0, le=10000000)
    year: int = Field(default=2026, ge=2020, le=2050)
    country_of_origin: str = Field(default="IN", max_length=16)
    constants_version: str = Field(default="REG-2026-Q1-V1", max_length=32)
    eu_ets_price: Optional[float] = Field(default=None, ge=0, le=10000)
    inr_per_eur: Optional[float] = Field(default=None, gt=0, le=10000)


class InstallationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(..., max_length=200)
    country: str = Field(default="India", max_length=100)
    unlocode: str = Field(..., max_length=16)
    latitude: float = Field(default=0.0, ge=-90.0, le=90.0)
    longitude: float = Field(default=0.0, ge=-180.0, le=180.0)


class PeriodCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    installation_id: str = Field(..., max_length=64)
    year: int = Field(default=2026, ge=2020, le=2050)
    quarter: int = Field(default=1, ge=1, le=4)
    grid_kwh: float = Field(..., ge=0)
    solar_offset_kwh: float = Field(default=0, ge=0)
    fuel_liters: float = Field(..., ge=0)
    production_tonnes: float = Field(..., gt=0)


class RecalculateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    new_constants_version: str = Field(..., max_length=64)


class ConfirmBillRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    bill_id: str = Field(..., max_length=64)


class WhatIfCalculationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cn_code: str = Field(default="7307 91 00", max_length=32)
    net_shipment_tonnes: float = Field(default=24.5, gt=0)
    upstream_precursor_see: float = Field(default=1.65, ge=0)
    scrap_loss_ratio: float = Field(default=0.08, ge=0)
    monthly_grid_kwh: float = Field(default=145000.0, ge=0)
    monthly_solar_offset_kwh: float = Field(default=35000.0, ge=0)
    monthly_fuel_liters: float = Field(default=12000.0, ge=0)
    monthly_total_production_tonnes: float = Field(default=450.0, gt=0)
    renewable_grid_share_pct: float = Field(default=24.1, ge=0, le=100.0)
    scrap_recovery_improvement_pct: float = Field(default=0.0, ge=0, le=50.0)
    fuel_switch_option: str = Field(default="FURNACE_OIL", max_length=32)
    jurisdiction: str = Field(default="EU", max_length=16)
    year: int = Field(default=2026, ge=2020, le=2050)
    country_of_origin: str = Field(default="IN", max_length=16)


class VerifierPdfRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_number: str = Field(..., max_length=64)
    cn_code: str = Field(default="7307 91 00", max_length=32)
    net_tonnes: float = Field(default=24.5, gt=0)
    installation_id: str = Field(default="IN-WB-4409", max_length=64)
    period_str: str = Field(default="2026-Q1", max_length=32)
    jurisdiction: str = Field(default="EU", max_length=16)
    total_see: float = Field(default=2.03, ge=0)
    direct_see: float = Field(default=0.07, ge=0)
    indirect_see: float = Field(default=0.18, ge=0)
    precursor_see: float = Field(default=1.78, ge=0)
    default_baseline: float = Field(default=4.20, ge=0)
    upstream_mill: str = Field(default="Tata Steel Limited", max_length=200)
    heat_number: str = Field(..., max_length=64)
    melt_country: str = Field(default="INDIA (IN)", max_length=64)
    cost_diff_eur: float = Field(default=0.0)
    cost_diff_inr: float = Field(default=0.0)


class SimulateWhatIfPayload(BaseModel):
    cn_code: str = "7307 91 00"
    jurisdiction: str = "EU"
    year: int = 2026
    net_shipment_tonnes: float = Field(default=24.5, gt=0.0)
    upstream_precursor_see: float = Field(default=1.65, ge=0.0)
    scrap_content_pct: float = Field(default=12.5, ge=0.0, le=100.0)
    monthly_grid_kwh: float = Field(default=145000.0, ge=0.0)
    grid_renewable_share_pct: float = Field(default=24.1, ge=0.0, le=100.0)
    monthly_fuel_liters: float = Field(default=12000.0, ge=0.0)
    fuel_type: str = "LIGHT_FUEL_OIL"
    monthly_production_tonnes: float = Field(default=450.0, gt=0.0)
    ets_price_eur: float = Field(default=75.36, gt=0.0)
    inr_per_eur: float = Field(default=90.5, gt=0.0)


class ConfirmBillPayload(BaseModel):
    confirmed_by: str = "usr_qa_04"


@router.post("/api/compliance/validate-metallurgy")
def validate_metallurgy(request: Request, payload: MetallurgyValidationRequest):
    try:
        return ComplianceEngine.validate_metallurgy(
            extracted_chemistry=payload.extracted_chemistry,
            extracted_mechanical=payload.extracted_mechanical,
            standard_chem_limits=payload.standard_chem_limits,
            standard_mech_limits=payload.standard_mech_limits,
            standard_code=payload.standard_code,
            country_of_melt_explicit=payload.country_of_melt_explicit,
        )
    except HTTPException:
        raise
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] Metallurgy validation error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal processing error", "request_id": request_id})


@router.get("/api/compliance/regulatory-constants")
def get_regulatory_constants():
    return RegulatoryStore.list_constants()


@router.get("/api/compliance/default-values")
def get_cbam_default_values(version: Optional[str] = None):
    return RegulatoryStore.list_cbam_defaults(version=version)


@router.post("/api/compliance/calculate-cbam")
def calculate_cbam(request: Request, payload: CbamCalculationRequest):
    try:
        return ComplianceEngine.calculate_cbam_emissions(
            invoice_number=payload.invoice_number,
            cn_code=payload.cn_code,
            net_shipment_tonnes=payload.net_shipment_tonnes,
            upstream_precursor_see=payload.upstream_precursor_see,
            scrap_loss_ratio=payload.scrap_loss_ratio,
            monthly_grid_kwh=payload.monthly_grid_kwh,
            monthly_solar_offset_kwh=payload.monthly_solar_offset_kwh,
            monthly_fuel_liters=payload.monthly_fuel_liters,
            monthly_total_production_tonnes=payload.monthly_total_production_tonnes,
            year=payload.year,
            country_of_origin=payload.country_of_origin,
            constants_version=payload.constants_version,
            eu_ets_price=payload.eu_ets_price,
            inr_per_eur=payload.inr_per_eur,
        )
    except HTTPException:
        raise
    except Exception as e:
        request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
        logger.error(f"[{request_id}] CBAM calculation error: {e}", exc_info=True)
        return JSONResponse(status_code=500, content={"error": "Internal processing error", "request_id": request_id})


@router.post("/api/cbam/installations")
def create_cbam_installation(payload: InstallationCreateRequest):
    return CBAMService.create_installation(
        name=payload.name, country=payload.country, unlocode=payload.unlocode,
        lat=payload.latitude, lon=payload.longitude,
    )


@router.get("/api/cbam/installations")
def list_cbam_installations():
    return CBAMService.list_installations()


@router.post("/api/cbam/periods")
def create_cbam_reporting_period(payload: PeriodCreateRequest):
    return CBAMService.create_period(
        installation_id=payload.installation_id, year=payload.year, quarter=payload.quarter,
        grid_kwh=payload.grid_kwh, solar_offset_kwh=payload.solar_offset_kwh,
        fuel_liters=payload.fuel_liters, production_tonnes=payload.production_tonnes,
    )


@router.post("/api/cbam/calculate")
def run_cbam_calculation(payload: CbamCalculationRequest):
    return CBAMService.run_calculation(
        invoice_number=payload.invoice_number, cn_code=payload.cn_code,
        net_shipment_tonnes=payload.net_shipment_tonnes, upstream_precursor_see=payload.upstream_precursor_see,
        scrap_loss_ratio=payload.scrap_loss_ratio, monthly_grid_kwh=payload.monthly_grid_kwh,
        monthly_solar_offset_kwh=payload.monthly_solar_offset_kwh, monthly_fuel_liters=payload.monthly_fuel_liters,
        monthly_total_production_tonnes=payload.monthly_total_production_tonnes, year=payload.year,
        country_of_origin=payload.country_of_origin, constants_version=payload.constants_version,
        eu_ets_price=payload.eu_ets_price, inr_per_eur=payload.inr_per_eur,
    )


@router.get("/api/cbam/calculations/{calc_id}")
def get_cbam_calculation(calc_id: str):
    calc = CBAMService.get_calculation(calc_id)
    if not calc:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return calc


@router.post("/api/cbam/calculations/{calc_id}/recalculate")
def recalculate_cbam_calculation(calc_id: str, payload: RecalculateRequest):
    try:
        return CBAMService.recalculate(calc_id, payload.new_constants_version)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/cbam/calculations/{calc_id}/export-csv", response_class=PlainTextResponse)
def export_cbam_calculation_csv(calc_id: str):
    try:
        csv_content = CBAMService.export_calculation_csv(calc_id)
        return PlainTextResponse(
            content=csv_content, media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=cbam_datasheet_{calc_id}.csv"},
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/cbam/workspace-data")
def get_cbam_workspace_data(user: Dict[str, Any] = Depends(get_current_user)):
    org_id = user.get("organization_id") or user.get("org_id")
    return CBAMService.get_workspace_data(organization_id=org_id)


@router.post("/api/cbam/bills/confirm")
def confirm_energy_bill(payload: ConfirmBillRequest):
    try:
        return CBAMService.confirm_bill(payload.bill_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/api/cbam/bills")
def list_cbam_energy_bills(installation_id: str = "IN-WB-4409", period_id: Optional[str] = None):
    return CBAMService.list_energy_bills(installation_id=installation_id, period_id=period_id)


@router.post("/api/cbam/calculate-what-if")
def calculate_cbam_what_if(payload: WhatIfCalculationRequest):
    return CBAMService.calculate_what_if(
        cn_code=payload.cn_code, net_shipment_tonnes=payload.net_shipment_tonnes,
        upstream_precursor_see=payload.upstream_precursor_see, scrap_loss_ratio=payload.scrap_loss_ratio,
        monthly_grid_kwh=payload.monthly_grid_kwh, monthly_solar_offset_kwh=payload.monthly_solar_offset_kwh,
        monthly_fuel_liters=payload.monthly_fuel_liters, monthly_total_production_tonnes=payload.monthly_total_production_tonnes,
        renewable_grid_share_pct=payload.renewable_grid_share_pct,
        scrap_recovery_improvement_pct=payload.scrap_recovery_improvement_pct,
        fuel_switch_option=payload.fuel_switch_option, jurisdiction=payload.jurisdiction,
        year=payload.year, country_of_origin=payload.country_of_origin,
    )


@router.post("/api/cbam/verifier-summary-pdf")
def generate_cbam_verifier_summary_pdf(payload: VerifierPdfRequest):
    pdf_bytes = CBAMService.generate_verifier_summary_pdf(
        invoice_number=payload.invoice_number, cn_code=payload.cn_code, net_tonnes=payload.net_tonnes,
        installation_id=payload.installation_id, period_str=payload.period_str, jurisdiction=payload.jurisdiction,
        total_see=payload.total_see, direct_see=payload.direct_see, indirect_see=payload.indirect_see,
        precursor_see=payload.precursor_see, default_baseline=payload.default_baseline,
        upstream_mill=payload.upstream_mill, heat_number=payload.heat_number, melt_country=payload.melt_country,
        cost_diff_eur=payload.cost_diff_eur, cost_diff_inr=payload.cost_diff_inr,
    )
    return Response(
        content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Verifier_Summary_{payload.invoice_number}.pdf"},
    )


@router.get("/api/cbam/workspace/profile")
def get_cbam_workspace_profile(
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return CbamWorkspaceService.get_workspace_profile(organization_id=extract_org_id(user_payload))


@router.get("/api/cbam/scope/cn-codes")
def get_cbam_scope_cn_codes(
    jurisdiction: str = "EU",
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return {"jurisdiction": jurisdiction, "cn_codes": CbamWorkspaceService.get_all_cn_scope(jurisdiction=jurisdiction)}


@router.post("/api/cbam/workspace/simulate-what-if")
def simulate_cbam_what_if(
    payload: SimulateWhatIfPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    return CbamWorkspaceService.simulate_what_if(
        cn_code=payload.cn_code, jurisdiction=payload.jurisdiction, year=payload.year,
        net_shipment_tonnes=payload.net_shipment_tonnes, upstream_precursor_see=payload.upstream_precursor_see,
        scrap_content_pct=payload.scrap_content_pct, monthly_grid_kwh=payload.monthly_grid_kwh,
        grid_renewable_share_pct=payload.grid_renewable_share_pct, monthly_fuel_liters=payload.monthly_fuel_liters,
        fuel_type=payload.fuel_type, monthly_production_tonnes=payload.monthly_production_tonnes,
        ets_price_eur=payload.ets_price_eur, inr_per_eur=payload.inr_per_eur,
    )


@router.post("/api/cbam/bills/{bill_id}/confirm")
def confirm_energy_bill_workspace(
    bill_id: str,
    payload: ConfirmBillPayload,
    user_payload: dict = Depends(require_roles(["OPERATOR", "QA", "QA_INSPECTOR", "ADMIN", "OWNER"])),
):
    return CbamWorkspaceService.confirm_bill(bill_id=bill_id, confirmed_by=payload.confirmed_by)


@router.post("/api/cbam/workspace/export/xml")
def export_cbam_xml_data_sheet(
    payload: SimulateWhatIfPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    sim_data = CbamWorkspaceService.simulate_what_if(
        cn_code=payload.cn_code, jurisdiction=payload.jurisdiction, year=payload.year,
        net_shipment_tonnes=payload.net_shipment_tonnes, upstream_precursor_see=payload.upstream_precursor_see,
        scrap_content_pct=payload.scrap_content_pct, monthly_grid_kwh=payload.monthly_grid_kwh,
        grid_renewable_share_pct=payload.grid_renewable_share_pct, monthly_fuel_liters=payload.monthly_fuel_liters,
        fuel_type=payload.fuel_type, monthly_production_tonnes=payload.monthly_production_tonnes,
        ets_price_eur=payload.ets_price_eur, inr_per_eur=payload.inr_per_eur,
    )
    safe_code = payload.cn_code.replace(" ", "_")
    return Response(
        content=CbamWorkspaceService.export_cbam_xml(sim_data), media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="CBAM_DataSheet_{safe_code}_{payload.year}.xml"'},
    )


@router.post("/api/cbam/workspace/export/verifier-csv")
def export_cbam_verifier_csv(
    payload: SimulateWhatIfPayload,
    user_payload: dict = Depends(require_roles(["VIEWER", "OPERATOR", "QA", "QA_INSPECTOR", "DISPATCH", "ADMIN", "OWNER"])),
):
    sim_data = CbamWorkspaceService.simulate_what_if(
        cn_code=payload.cn_code, jurisdiction=payload.jurisdiction, year=payload.year,
        net_shipment_tonnes=payload.net_shipment_tonnes, upstream_precursor_see=payload.upstream_precursor_see,
        scrap_content_pct=payload.scrap_content_pct, monthly_grid_kwh=payload.monthly_grid_kwh,
        grid_renewable_share_pct=payload.grid_renewable_share_pct, monthly_fuel_liters=payload.monthly_fuel_liters,
        fuel_type=payload.fuel_type, monthly_production_tonnes=payload.monthly_production_tonnes,
        ets_price_eur=payload.ets_price_eur, inr_per_eur=payload.inr_per_eur,
    )
    safe_code = payload.cn_code.replace(" ", "_")
    return Response(
        content=CbamWorkspaceService.export_verifier_csv(sim_data), media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="CBAM_AuditTrace_{safe_code}_{payload.year}.csv"'},
    )
