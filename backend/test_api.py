"""
HEATLEDGER AI: End-to-End API Integration Test Suite
Converted to FastAPI TestClient for in-process hermetic testing without a live server.
"""

import os
import sys
import xml.etree.ElementTree as ET

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)


def test_health():
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "online"
    assert data.get("service") == "HeatLedger AI Backend"
    print("✓ Health Check Passed:", data)


def test_compliance():
    payload = {
        "extracted_chemistry": {
            "C": 0.22, "Mn": 0.88, "Si": 0.25, "P": 0.015,
            "S": 0.010, "Cr": 0.12, "Ni": 0.08, "Mo": 0.02
        },
        "extracted_mechanical": {
            "tensile_mpa": 512,
            "yield_mpa": 310,
            "elongation_pct": 28.5,
            "hardness_hbw": 156
        },
        "standard_chem_limits": {
            "C": {"min": 0.0, "max": 0.35},
            "Mn": {"min": 0.60, "max": 1.05},
            "Si": {"min": 0.10, "max": 0.35},
            "P": {"min": 0.0, "max": 0.035},
            "S": {"min": 0.0, "max": 0.040},
            "Cr": {"min": 0.0, "max": 0.30},
            "Ni": {"min": 0.0, "max": 0.40},
            "Mo": {"min": 0.0, "max": 0.12},
            "CEV": {"min": 0.0, "max": 0.47}
        },
        "standard_mech_limits": {
            "tensile_mpa": {"min": 485, "max": 650},
            "yield_mpa": {"min": 250, "max": 450},
            "elongation_pct": {"min": 22.0, "max": 100.0},
            "hardness_hbw": {"min": 137, "max": 187}
        },
        "standard_code": "ASTM A105",
        "country_of_melt_explicit": True
    }

    resp = client.post("/api/compliance/validate-metallurgy", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_fully_compliant"] is True
    assert 0.35 <= data["cev_calculated"] <= 0.45
    print("✓ Metallurgy Validation Passed: CEV =", data["cev_calculated"], "Compliant =", data["is_fully_compliant"])


def test_cbam_math():
    payload = {
        "invoice_number": "EXP-2026-109",
        "cn_code": "7307",
        "net_shipment_tonnes": 24.5,
        "upstream_precursor_see": 1.65,
        "scrap_loss_ratio": 1.08,
        "monthly_grid_kwh": 145000,
        "monthly_solar_offset_kwh": 35000,
        "monthly_fuel_liters": 12000,
        "monthly_total_production_tonnes": 450,
        "year": 2026,
        "eu_ets_price": 75.36
    }

    resp = client.post("/api/compliance/calculate-cbam", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["total_verified_see"] > 0
    assert data["estimated_cost_difference_eur"] > 0
    assert "calculation_trace" in data
    print("✓ CBAM Precursor Math Passed: Total SEE =", data["total_verified_see"], "EUR Diff = €", data["estimated_cost_difference_eur"])


def test_xml_export():
    payload = {
        "installation_id": "IN-WB-4409",
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "unlocode": "IN CCU",
        "latitude": 22.6105,
        "longitude": 88.3421,
        "cn_code": "73079100",
        "net_tonnes": 24.5,
        "total_see": 1.93,
        "direct_see": 0.12,
        "indirect_see": 0.16,
        "precursor_see": 1.65,
        "heat_number": "TSJ-26-9021",
        "melt_country": "IN"
    }

    resp = client.post("/api/dossier/generate-xml", json=payload)
    assert resp.status_code == 200
    xml_text = resp.text
    root = ET.fromstring(xml_text)
    assert root.tag == "CbamDataSheetDraft"
    assert root.find("Installation/InstallationID").text == "IN-WB-4409"
    print("✓ CBAM XML Generation Passed. Root tag:", root.tag, "Length:", len(xml_text), "bytes")


def test_web_vitals_telemetry():
    """Prompt D11: Web Vitals RUM recording and summary endpoint."""
    res_lcp = client.post("/api/vitals", json={
        "name": "LCP",
        "value": 1420.5,
        "rating": "good",
        "url": "/app"
    })
    assert res_lcp.status_code == 200
    assert res_lcp.json()["status"] == "recorded"

    res_cls = client.post("/api/vitals", json={
        "name": "CLS",
        "value": 0.02,
        "rating": "good",
        "url": "/app"
    })
    assert res_cls.status_code == 200

    res_summary = client.get("/api/vitals/summary")
    assert res_summary.status_code == 200
    data = res_summary.json()
    assert "summary" in data
    assert "LCP" in data["summary"]
    assert data["summary"]["LCP"]["budget"] == 2500.0


if __name__ == "__main__":
    test_health()
    test_compliance()
    test_cbam_math()
    test_xml_export()
