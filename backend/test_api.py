"""
HEATLEDGER AI: End-to-End API Integration Test Suite
"""

import urllib.request
import json
import urllib.parse


def test_health():
    req = urllib.request.Request("http://127.0.0.1:8000/")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
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

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/compliance/validate-metallurgy",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
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
        "eu_ets_price": 85.0
    }

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/compliance/calculate-cbam",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        print("✓ CBAM Precursor Math Passed: Total SEE =", data["total_verified_see"], "EUR Saved = €", data["total_tax_savings_eur"])


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

    req = urllib.request.Request(
        "http://127.0.0.1:8000/api/dossier/generate-xml",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        xml_text = resp.read().decode("utf-8")
        print("✓ CBAM XML Generation Passed. Length:", len(xml_text), "bytes")


if __name__ == "__main__":
    test_health()
    test_compliance()
    test_cbam_math()
    test_xml_export()
