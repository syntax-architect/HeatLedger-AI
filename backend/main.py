"""
HEATLEDGER AI: FastAPI Backend Application
Main Application Entry Point connecting Vision OCR, Deterministic Compliance, and Dossier Generation.
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, PlainTextResponse
import json
from typing import Optional

from mtc_ocr_service import MTCOCRService
from compliance_engine import ComplianceEngine
from dossier_generator import DossierGenerator

app = FastAPI(
    title="HeatLedger AI Backend Engine",
    description="Shop-floor-to-customs compliance operating system for Indian steel & engineering exporters.",
    version="1.0.0"
)

# Enable CORS for Vite frontend running on localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ocr_service = MTCOCRService()


@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "HeatLedger AI Backend",
        "regulations": [
            "EN 10204:2004 Clause 6",
            "EU Reg 2026/1963 Melt-and-Pour",
            "EU CBAM Reg 2023/1773",
            "UK CDS Notice"
        ]
    }


@app.post("/api/ocr/extract-mtc")
async def extract_mtc(file: UploadFile = File(...)):
    """
    Ingests an uploaded PDF or smartphone image of an upstream mill 3.1 certificate
    and returns coordinate-linked JSON with Melt & Pour origin audit.
    """
    try:
        content = await file.read()
        result = ocr_service.extract_mtc(content, file_name=file.filename or "mtc.pdf")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/compliance/validate-metallurgy")
def validate_metallurgy(payload: dict):
    """
    Deterministically validates extracted chemistry against standard limits and calculates IIW CEV.
    """
    try:
        extracted_chemistry = payload.get("extracted_chemistry", {})
        extracted_mechanical = payload.get("extracted_mechanical", {})
        standard_chem_limits = payload.get("standard_chem_limits", {})
        standard_mech_limits = payload.get("standard_mech_limits", {})
        standard_code = payload.get("standard_code", "ASTM A105")
        country_of_melt_explicit = payload.get("country_of_melt_explicit", True)

        report = ComplianceEngine.validate_metallurgy(
            extracted_chemistry=extracted_chemistry,
            extracted_mechanical=extracted_mechanical,
            standard_chem_limits=standard_chem_limits,
            standard_mech_limits=standard_mech_limits,
            standard_code=standard_code,
            country_of_melt_explicit=country_of_melt_explicit
        )
        return report
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/compliance/calculate-cbam")
def calculate_cbam(payload: dict):
    """
    Computes Direct, Indirect, and Precursor SEE per tonne per EU Implementing Reg 2023/1773.
    """
    try:
        res = ComplianceEngine.calculate_cbam_emissions(
            invoice_number=payload.get("invoice_number", "EXP-2026-109"),
            cn_code=payload.get("cn_code", "7307"),
            net_shipment_tonnes=float(payload.get("net_shipment_tonnes", 24.5)),
            upstream_precursor_see=float(payload.get("upstream_precursor_see", 1.65)),
            scrap_loss_ratio=float(payload.get("scrap_loss_ratio", 1.08)),
            monthly_grid_kwh=float(payload.get("monthly_grid_kwh", 145000)),
            monthly_solar_offset_kwh=float(payload.get("monthly_solar_offset_kwh", 35000)),
            monthly_fuel_liters=float(payload.get("monthly_fuel_liters", 12000)),
            monthly_total_production_tonnes=float(payload.get("monthly_total_production_tonnes", 450)),
            year=int(payload.get("year", 2026)),
            eu_ets_price=float(payload.get("eu_ets_price", 85.0))
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/dossier/generate-bundle")
async def generate_dossier_bundle(
    cover_meta: str = Form(...),
    upstream_pdf: Optional[UploadFile] = File(None)
):
    """
    Generates the merged EN 10204 Clause 6 PDF dossier.
    """
    try:
        meta = json.loads(cover_meta)
        cover_pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
            company_name=meta.get("company_name", "Howrah Precision Forgings Pvt. Ltd."),
            eu_installation_id=meta.get("eu_installation_id", "IN-WB-4409"),
            invoice_number=meta.get("invoice_number", "EXP-2026-109"),
            cn_code=meta.get("cn_code", "7307"),
            heat_number=meta.get("heat_number", "TSJ-26-9021"),
            upstream_mill=meta.get("upstream_mill", "Tata Steel Jamshedpur"),
            country_of_melt=meta.get("country_of_melt", "INDIA"),
            chemistry=meta.get("chemistry", {"C": 0.22, "Mn": 0.88, "Si": 0.25, "P": 0.015, "S": 0.010}),
            mechanics=meta.get("mechanics", {"Tensile Strength": "512 MPa", "Yield Strength": "310 MPa"}),
            qa_inspector_name=meta.get("qa_inspector_name", "R. K. Chatterjee"),
            qa_emp_id=meta.get("qa_emp_id", "QA-04"),
            compliance_mode=meta.get("compliance_mode", "TRANSFORMED_3_1")
        )

        if upstream_pdf:
            upstream_bytes = await upstream_pdf.read()
            merged_pdf_bytes = DossierGenerator.compile_merged_clause6_dossier(
                cover_pdf_bytes=cover_pdf_bytes,
                upstream_mill_pdf_bytes=upstream_bytes,
                invoice_number=meta.get("invoice_number", "EXP-2026-109")
            )
            return Response(content=merged_pdf_bytes, media_type="application/pdf")

        return Response(content=cover_pdf_bytes, media_type="application/pdf")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/dossier/generate-xml", response_class=PlainTextResponse)
def generate_cbam_xml(payload: dict):
    """
    Generates official EU CBAM Communication XML ready for declarant registry upload.
    """
    try:
        xml_string = DossierGenerator.generate_cbam_communication_xml(
            installation_id=payload.get("installation_id", "IN-WB-4409"),
            company_name=payload.get("company_name", "Howrah Precision Forgings Pvt. Ltd."),
            unlocode=payload.get("unlocode", "IN CCU"),
            latitude=float(payload.get("latitude", 22.6105)),
            longitude=float(payload.get("longitude", 88.3421)),
            cn_code=payload.get("cn_code", "73079100"),
            net_tonnes=float(payload.get("net_tonnes", 24.5)),
            total_see=float(payload.get("total_see", 1.93)),
            direct_see=float(payload.get("direct_see", 0.12)),
            indirect_see=float(payload.get("indirect_see", 0.16)),
            precursor_see=float(payload.get("precursor_see", 1.65)),
            heat_number=payload.get("heat_number", "TSJ-26-9021"),
            melt_country=payload.get("melt_country", "IN")
        )
        return xml_string
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
