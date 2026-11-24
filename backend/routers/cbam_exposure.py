"""
HEATLEDGER AI: CBAM Exposure & Importer Data Prep Router (Prompt C4)
Specification: Prompt Pack v4 - Phase C (Task C4)

Endpoints:
- GET  /api/cbam-exposure/rules              - Current pricing rules, markups, and statutory disclaimers
- GET  /api/cbam-exposure/prices             - All registered quarterly certificate prices
- POST /api/cbam-exposure/admin/prices       - Add/update next quarterly certificate price without code change
- POST /api/cbam-exposure/calculate          - Full shipment exposure calculation and exposure card
- POST /api/cbam-exposure/export/csv         - Importer data pack CSV export
- POST /api/cbam-exposure/export/excel       - Importer data pack Excel (.xlsx) export
- POST /api/cbam-exposure/export/pdf         - 1-page PDF summary with watermark
- POST /api/cbam-exposure/verifier-handoff   - Structured accredited verifier handoff package
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Response, status
from pydantic import BaseModel, Field

try:
    from cbam_exposure_service import CBAMExposureService
except ImportError:
    from backend.cbam_exposure_service import CBAMExposureService

router = APIRouter(prefix="/api/cbam-exposure", tags=["cbam-exposure"])


# ==============================================================================
# Request & Response Schemas
# ==============================================================================

class AddQuarterlyPriceRequest(BaseModel):
    quarter: str = Field(..., json_schema_extra={"example": "2026-Q4"})
    year: int = Field(..., json_schema_extra={"example": 2026})
    quarter_num: int = Field(..., ge=1, le=4, json_schema_extra={"example": 4})
    price_eur_per_tco2: float = Field(..., gt=0.0, json_schema_extra={"example": 84.10})
    source_url: str = Field(..., json_schema_extra={"example": "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en"})
    notes: Optional[str] = "European Commission quarterly average EU ETS auction price"
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None


class ShipmentLineInput(BaseModel):
    heat_number: Optional[str] = "HT-001"
    description: Optional[str] = "Hot rolled carbon steel plate"
    cn_code: str = Field(..., json_schema_extra={"example": "7208"})
    net_mass_tonnes: float = Field(..., gt=0.0, json_schema_extra={"example": 25.0})
    route: Optional[str] = Field("BF-BOF", json_schema_extra={"example": "BF-BOF"})
    scrap_share_pct: Optional[float] = 15.0
    actual_direct_tco2_per_t: Optional[float] = 1.45
    actual_indirect_tco2_per_t: Optional[float] = 0.32
    source_note_direct: Optional[str] = "Plant blast furnace & process gas metering data"
    source_note_indirect: Optional[str] = "Grid power emission factor (CEA CO2 Database v20)"


class CalculateExposureRequest(BaseModel):
    plant_name: Optional[str] = "Tata Steel BSL / Plant A"
    importer_name: Optional[str] = "EuroMetals GmbH"
    year: Optional[int] = 2026
    quarter: Optional[str] = None
    apply_free_allocation: Optional[bool] = False
    lines: List[ShipmentLineInput]


# ==============================================================================
# Router Endpoints
# ==============================================================================

@router.get("/rules")
def get_cbam_rules() -> Dict[str, Any]:
    """Returns dated rule tables, default markups, benchmarks, and disclaimers."""
    try:
        return CBAMExposureService.load_rules()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load CBAM rules: {str(e)}")


@router.get("/prices")
def get_cbam_prices() -> List[Dict[str, Any]]:
    """Returns all registered quarterly certificate prices."""
    rules = CBAMExposureService.load_rules()
    return rules.get("quarterly_certificate_prices", [])


@router.post("/admin/prices", status_code=status.HTTP_201_CREATED)
def add_quarterly_price(payload: AddQuarterlyPriceRequest) -> Dict[str, Any]:
    """
    Administrative endpoint to register a new quarter's certificate price (e.g. Q4 2026 EUR 84.10)
    without modifying backend code.
    """
    try:
        record = CBAMExposureService.add_quarterly_price(
            quarter=payload.quarter,
            year=payload.year,
            quarter_num=payload.quarter_num,
            price_eur_per_tco2=payload.price_eur_per_tco2,
            source_url=payload.source_url,
            notes=payload.notes or "Admin registered quarterly price",
            effective_from=payload.effective_from,
            effective_to=payload.effective_to,
        )
        return {"status": "success", "message": "Quarterly certificate price added successfully", "record": record}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calculate")
def calculate_exposure(payload: CalculateExposureRequest) -> Dict[str, Any]:
    """
    Computes embedded emissions, default benchmark comparison with penalty markup,
    cost differences, and the formatted Prompt C4 Exposure Card.
    """
    if not payload.lines:
        raise HTTPException(status_code=400, detail="At least one shipment line is required")

    lines_dicts = [l.model_dump() for l in payload.lines]
    try:
        result = CBAMExposureService.calculate_shipment_exposure(
            shipment_lines=lines_dicts,
            year=payload.year or 2026,
            quarter=payload.quarter,
            plant_name=payload.plant_name or "Export Facility",
            importer_name=payload.importer_name or "EU Importer",
            apply_free_allocation=payload.apply_free_allocation or False,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Exposure calculation failed: {str(e)}")


@router.post("/export/csv")
def export_importer_csv(payload: CalculateExposureRequest):
    """Generates downloadable CSV importer data pack with formula injection defense."""
    lines_dicts = [l.model_dump() for l in payload.lines]
    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=lines_dicts,
        year=payload.year or 2026,
        quarter=payload.quarter,
        plant_name=payload.plant_name or "Export Facility",
        importer_name=payload.importer_name or "EU Importer",
        apply_free_allocation=payload.apply_free_allocation or False,
    )
    csv_text = CBAMExposureService.generate_importer_csv(calc)
    filename = f"cbam_importer_pack_{calc.get('year')}_{calc.get('quarter')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/export/excel")
def export_importer_excel(payload: CalculateExposureRequest):
    """Generates downloadable Excel (.xlsx) importer data pack with formatting."""
    lines_dicts = [l.model_dump() for l in payload.lines]
    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=lines_dicts,
        year=payload.year or 2026,
        quarter=payload.quarter,
        plant_name=payload.plant_name or "Export Facility",
        importer_name=payload.importer_name or "EU Importer",
        apply_free_allocation=payload.apply_free_allocation or False,
    )
    excel_bytes = CBAMExposureService.generate_importer_excel(calc)
    filename = f"cbam_importer_pack_{calc.get('year')}_{calc.get('quarter')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/export/pdf")
def export_importer_pdf(payload: CalculateExposureRequest):
    """Generates downloadable 1-page PDF summary with mandatory plant watermark."""
    lines_dicts = [l.model_dump() for l in payload.lines]
    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=lines_dicts,
        year=payload.year or 2026,
        quarter=payload.quarter,
        plant_name=payload.plant_name or "Export Facility",
        importer_name=payload.importer_name or "EU Importer",
        apply_free_allocation=payload.apply_free_allocation or False,
    )
    pdf_bytes = CBAMExposureService.generate_importer_summary_pdf(calc)
    filename = f"cbam_importer_summary_{calc.get('year')}_{calc.get('quarter')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/verifier-handoff")
def verifier_handoff(payload: CalculateExposureRequest) -> Dict[str, Any]:
    """Generates structured accredited verifier handoff package with calculations and audit trail."""
    lines_dicts = [l.model_dump() for l in payload.lines]
    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=lines_dicts,
        year=payload.year or 2026,
        quarter=payload.quarter,
        plant_name=payload.plant_name or "Export Facility",
        importer_name=payload.importer_name or "EU Importer",
        apply_free_allocation=payload.apply_free_allocation or False,
    )
    return CBAMExposureService.generate_verifier_handoff_package(calc)
