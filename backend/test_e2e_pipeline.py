"""
HEATLEDGER AI: End-to-End Pipeline Automated Test Runner
Converted to FastAPI TestClient for in-process hermetic testing without a live server.
Tests full lifecycle: Sample MTC PDF -> OCR -> Metallurgy Validation -> CBAM Engine -> Stamped Dossier & XML
"""

import json
import os
import sys
import xml.etree.ElementTree as ET

import pymupdf as fitz
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)


def test_e2e_pipeline():
    # 1. Define Test Shipment Specifications
    shipment = {
        "invoice_number": "EXP-2026-109",
        "buyer": "Wilhelm Flanschen GmbH, Hamburg, Germany",
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "plant_id": "IN-WB-4409",
        "unlocode": "IN CCU",
        "lat": 22.6105,
        "lon": 88.3421,
        "cn_code": "73079100",
        "product": "Forged Carbon Steel Flanges ASTM A105",
        "net_tonnes": 24.5,
        "gross_tonnes": 26.2,
        "upstream_mill": "Tata Steel Limited, Jamshedpur Works",
        "heat_no": "TSJ-26-9021",
        "country_of_melt": "INDIA",
        "precursor_see": 1.65,
        "scrap_ratio": 1.08,
        "monthly_grid_kwh": 145000,
        "monthly_solar_kwh": 35000,
        "monthly_fuel_liters": 12000,
        "monthly_production_tonnes": 450,
        "qa_inspector": "R. K. Chatterjee",
        "qa_emp_id": "QA-04"
    }

    # Chemistry extracted from the sample MTC
    sample_chem = {
        "C": 0.22,
        "Mn": 0.88,
        "Si": 0.25,
        "P": 0.015,
        "S": 0.010,
        "Cr": 0.12,
        "Ni": 0.08,
        "Mo": 0.03,
        "Cu": 0.06,
        "V": 0.01
    }

    sample_mech = {
        "Yield Strength": 310,
        "Tensile Strength": 512,
        "Elongation": 30.0,
        "Hardness": 149
    }

    # ASTM A105 limits
    a105_chem_limits = {
        "C": {"min": 0.00, "max": 0.35},
        "Mn": {"min": 0.60, "max": 1.05},
        "P": {"min": 0.00, "max": 0.035},
        "S": {"min": 0.00, "max": 0.040},
        "Si": {"min": 0.10, "max": 0.35},
        "Cr": {"min": 0.00, "max": 0.30},
        "Ni": {"min": 0.00, "max": 0.40},
        "Mo": {"min": 0.00, "max": 0.12},
        "Cu": {"min": 0.00, "max": 0.40},
        "V": {"min": 0.00, "max": 0.08},
        "CEV": {"min": 0.00, "max": 0.47}
    }

    a105_mech_limits = {
        "Yield Strength": {"min": 250, "max": 450},
        "Tensile Strength": {"min": 485, "max": 650},
        "Elongation": {"min": 22.0, "max": 100.0},
        "Hardness": {"min": 137, "max": 187}
    }

    # -------------------------------------------------------------------------
    # [STEP 1] Metallurgy & Chemical Specification Compliance Check
    # -------------------------------------------------------------------------
    val_payload = {
        "extracted_chemistry": sample_chem,
        "extracted_mechanical": sample_mech,
        "standard_chem_limits": a105_chem_limits,
        "standard_mech_limits": a105_mech_limits,
        "standard_code": "ASTM A105",
        "country_of_melt_explicit": True
    }
    res_val = client.post("/api/compliance/validate-metallurgy", json=val_payload)
    assert res_val.status_code == 200, res_val.text
    val_data = res_val.json()
    assert val_data["is_fully_compliant"] is True
    assert 0.35 <= val_data["cev_calculated"] <= 0.45

    # -------------------------------------------------------------------------
    # [STEP 2] Precursor Recursive Specific Embedded Emissions (SEE) Math
    # -------------------------------------------------------------------------
    cbam_payload = {
        "invoice_number": shipment["invoice_number"],
        "cn_code": shipment["cn_code"],
        "net_shipment_tonnes": shipment["net_tonnes"],
        "upstream_precursor_see": shipment["precursor_see"],
        "scrap_loss_ratio": shipment["scrap_ratio"],
        "monthly_grid_kwh": shipment["monthly_grid_kwh"],
        "monthly_solar_offset_kwh": shipment["monthly_solar_kwh"],
        "monthly_fuel_liters": shipment["monthly_fuel_liters"],
        "monthly_total_production_tonnes": shipment["monthly_production_tonnes"],
        "year": 2026,
        "eu_ets_price": 75.36
    }
    res_cbam = client.post("/api/compliance/calculate-cbam", json=cbam_payload)
    assert res_cbam.status_code == 200, res_cbam.text
    cbam_data = res_cbam.json()
    assert cbam_data["status"] == "success"
    assert cbam_data["total_verified_see"] > 0
    assert cbam_data["estimated_cost_difference_eur"] > 0
    assert "calculation_trace" in cbam_data

    # -------------------------------------------------------------------------
    # [STEP 3] Compiling Tamper-Evident EN 10204 Clause 6 PDF Dossier via TestClient
    # -------------------------------------------------------------------------
    sample_mtc_path = os.path.join(os.path.dirname(__file__), "samples", "Tata_Steel_3.1_MTC_TSJ-26-9021.pdf")
    assert os.path.exists(sample_mtc_path), f"Sample MTC missing at {sample_mtc_path}"
    with open(sample_mtc_path, "rb") as f:
        upstream_bytes = f.read()

    cover_meta = {
        "company_name": shipment["company_name"],
        "eu_installation_id": shipment["plant_id"],
        "invoice_number": shipment["invoice_number"],
        "cn_code": shipment["cn_code"],
        "heat_number": shipment["heat_no"],
        "upstream_mill": shipment["upstream_mill"],
        "country_of_melt": shipment["country_of_melt"],
        "chemistry": sample_chem,
        "mechanics": {
            "Yield Strength": "310 MPa",
            "Tensile Strength": "512 MPa",
            "Elongation": "30.0%",
            "Hardness": "149 HBW"
        },
        "qa_inspector_name": shipment["qa_inspector"],
        "qa_emp_id": shipment["qa_emp_id"],
        "compliance_mode": "TRANSFORMED_3_1",
        "is_demo": True
    }

    res_bundle = client.post(
        "/api/dossier/generate-bundle",
        data={"cover_meta": json.dumps(cover_meta)},
        files={"upstream_pdf": ("upstream_mill_cert.pdf", upstream_bytes, "application/pdf")}
    )
    assert res_bundle.status_code == 200, res_bundle.text
    assert res_bundle.headers["content-type"] == "application/pdf"
    bundle_pdf_bytes = res_bundle.content
    assert len(bundle_pdf_bytes) > 1000

    doc = fitz.open(stream=bundle_pdf_bytes, filetype="pdf")
    assert len(doc) >= 2
    # Verify cover text
    cover_text = doc[0].get_text()
    assert shipment["invoice_number"] in cover_text
    assert shipment["heat_no"] in cover_text
    # Verify Annex A divider
    annex_text = doc[1].get_text()
    assert "ANNEX A" in annex_text

    # -------------------------------------------------------------------------
    # [STEP 4] Generating Official EU CBAM Communication XML via TestClient
    # -------------------------------------------------------------------------
    xml_payload = {
        "installation_id": shipment["plant_id"],
        "company_name": shipment["company_name"],
        "unlocode": shipment["unlocode"],
        "latitude": shipment["lat"],
        "longitude": shipment["lon"],
        "cn_code": shipment["cn_code"],
        "net_tonnes": shipment["net_tonnes"],
        "total_see": cbam_data["total_verified_see"],
        "direct_see": cbam_data["plant_direct_fuel_see"],
        "indirect_see": cbam_data["plant_indirect_power_see"],
        "precursor_see": cbam_data["precursor_embedded_see"],
        "heat_number": shipment["heat_no"],
        "melt_country": "IN"
    }
    res_xml = client.post("/api/dossier/generate-xml", json=xml_payload)
    assert res_xml.status_code == 200, res_xml.text
    root = ET.fromstring(res_xml.text)
    assert root.tag == "CbamDataSheetDraft"
    assert root.find("Installation/InstallationID").text == shipment["plant_id"]


if __name__ == "__main__":
    test_e2e_pipeline()
    print("ALL E2E PIPELINE TESTS PASSED VIA TESTCLIENT!")
