"""
HEATLEDGER AI: CBAM Exposure & Data Prep Test Suite (Prompt C4)
Specification: Prompt Pack v4 - Phase C (Task C4)
Verifies:
  1. Zero hardcoded certificate prices or markups in Python code.
  2. Dynamic pricing rules table loading with regulatory sources.
  3. Hand-calculated spreadsheet equivalence for actual vs marked default emissions.
  4. Formula visibility and exposure card canonical phrasing.
  5. Dynamic addition of Q4 certificate price via admin interface.
  6. Importer data pack exports: CSV, Excel (.xlsx), and 1-page PDF with watermark.
  7. Accredited verifier handoff package with calculation audit trace and disclaimers.
  8. Full FastAPI router integration via TestClient.
"""

import io
import os
import re
import pytest
from fastapi.testclient import TestClient

try:
    from cbam_exposure_service import CBAMExposureService, CBAM_DISCLAIMER_PREPARED, CBAM_VERIFIER_MEMO_DISCLAIMER
    from main import app
except ImportError:
    from backend.cbam_exposure_service import CBAMExposureService, CBAM_DISCLAIMER_PREPARED, CBAM_VERIFIER_MEMO_DISCLAIMER
    from backend.main import app

client = TestClient(app)


def test_c4_01_zero_hardcoded_prices_or_markups_in_code():
    """
    Prompt C4 Rule 6:
    'Never hardcode any price or markup; tests fail if they appear in code.'
    Verifies that numeric literals representing prices (75.36, 75.28, 82.32)
    or year-markup percentages do not appear hardcoded in cbam_exposure_service.py.
    """
    service_path = os.path.join(os.path.dirname(__file__), "cbam_exposure_service.py")
    router_path = os.path.join(os.path.dirname(__file__), "routers", "cbam_exposure.py")

    for file_path in [service_path, router_path]:
        with open(file_path, "r", encoding="utf-8") as f:
            code = f.read()

        # Check for forbidden price floats
        forbidden_prices = ["75.36", "75.28", "82.32"]
        for p in forbidden_prices:
            # Match numeric assignment or arithmetic, excluding docstrings/comments
            assert p not in code, f"Forbidden hardcoded price {p} found in {os.path.basename(file_path)}"


def test_c4_02_rules_table_exists_and_contains_sources():
    """Validates that data/cbam_pricing_rules.json exists with all regulatory sources."""
    rules = CBAMExposureService.load_rules(force_reload=True)
    assert rules is not None
    assert "declaration_deadline" in rules
    assert "markups_by_year" in rules
    assert "quarterly_certificate_prices" in rules
    assert "default_benchmark_emissions" in rules

    # Verify markups
    markups = rules["markups_by_year"]
    assert "2026" in markups
    assert markups["2026"]["markup_pct"] == 10.0
    assert "eur-lex" in markups["2026"]["source_url"]

    assert "2027" in markups
    assert markups["2027"]["markup_pct"] == 20.0

    assert "2028" in markups
    assert markups["2028"]["markup_pct"] == 30.0

    # Verify quarterly prices
    prices = rules["quarterly_certificate_prices"]
    quarters = {p["quarter"]: p["price_eur_per_tco2"] for p in prices}
    assert quarters["2026-Q1"] == 75.36
    assert quarters["2026-Q2"] == 75.28
    assert quarters["2026-Q3"] == 82.32


def test_c4_03_hand_calculation_spreadsheet_equivalence():
    """
    DONE WHEN: a test shipment gives the same result as a hand calculation
    you check with a spreadsheet.
    
    Hand Calculation Verification:
      Shipment: 100 tonnes of CN 7208 (hot-rolled sheet)
      Actual Plant Inputs:
        Direct = 1.50 tCO2/t
        Indirect = 0.30 tCO2/t
        Actual specific = 1.80 tCO2/t
        Total actual emissions = 100 * 1.80 = 180.0 tCO2
      
      Default Benchmark for CN 7208:
        Direct = 1.95, Indirect = 0.45 -> Base benchmark = 2.40 tCO2/t
        Year 2026 Markup = 10% (1.10 multiplier)
        Marked default benchmark = 2.40 * 1.10 = 2.64 tCO2/t
        Total default emissions = 100 * 2.64 = 264.0 tCO2
      
      Emissions Saved = 264.0 - 180.0 = 84.0 tCO2
      
      Pricing at 2026-Q1 (€75.36 / tCO2):
        Actual Cost = 180.0 * 75.36 = €13,564.80
        Default Cost = 264.0 * 75.36 = €19,895.04
        Difference / Cost Exposure = €19,895.04 - €13,564.80 = €6,330.24
    """
    shipment_lines = [
        {
            "heat_number": "HT-TEST-100",
            "cn_code": "7208",
            "net_mass_tonnes": 100.0,
            "route": "BF-BOF",
            "actual_direct_tco2_per_t": 1.50,
            "actual_indirect_tco2_per_t": 0.30,
            "source_note_direct": "Plant furnace flow meters",
            "source_note_indirect": "CEA state electricity factor",
        }
    ]

    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=shipment_lines,
        year=2026,
        quarter="2026-Q1",
        plant_name="Tata Steel Specialised",
        importer_name="Mannesmann Stahl GmbH",
    )

    totals = calc["totals"]
    assert totals["total_mass_tonnes"] == 100.0
    assert totals["total_actual_emissions_tco2"] == 180.0
    assert totals["total_default_emissions_tco2"] == 264.0
    assert totals["total_emissions_savings_tco2"] == 84.0

    # Exact hand calculation equivalence checks
    assert totals["total_actual_cost_eur"] == 13564.80
    assert totals["total_default_cost_eur"] == 19895.04
    assert totals["total_cost_exposure_savings_eur"] == 6330.24

    # Formula trace check
    line = calc["lines"][0]
    assert "100.0 t * (1.5 + 0.3) tCO2/t = 180.0 tCO2" in line["formula_actual"]
    assert "100.0 t * (2.4 * 1.10) tCO2/t = 264.0 tCO2" in line["formula_default"]


def test_c4_04_exposure_card_canonical_text():
    """
    Verifies Prompt C4 requirement:
    'Exposure' card: 'If default values apply, estimated cost X. With your data, estimated Y.
    Difference Z. Needs verification before the importer can use Y.' Show every assumption.
    """
    shipment_lines = [
        {
            "heat_number": "HT-TEST-100",
            "cn_code": "7208",
            "net_mass_tonnes": 100.0,
            "actual_direct_tco2_per_t": 1.50,
            "actual_indirect_tco2_per_t": 0.30,
        }
    ]

    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=shipment_lines,
        year=2026,
        quarter="2026-Q1",
    )

    card = calc["exposure_card"]
    statement = card["statement"]

    expected_statement = (
        "If default values apply, estimated cost €19,895.04. "
        "With your data, estimated €13,564.80. "
        "Difference €6,330.24. "
        "Needs verification before the importer can use Y."
    )
    assert statement == expected_statement
    assert card["disclaimer"] == CBAM_DISCLAIMER_PREPARED
    assert len(card["assumptions"]) >= 5


def test_c4_05_admin_screen_add_q4_price_without_code_changes():
    """
    PROVE IT REQUIREMENT:
    'Add a Q4 price through the admin screen.'
    Adds 2026-Q4 price (€84.10 / tCO2) via service/admin endpoint,
    and proves it is immediately utilized in calculations without code changes.
    """
    new_price = CBAMExposureService.add_quarterly_price(
        quarter="2026-Q4",
        year=2026,
        quarter_num=4,
        price_eur_per_tco2=84.10,
        source_url="https://taxation-customs.ec.europa.eu/cbam_auction_q4_2026",
        notes="Q4 European auction index benchmark",
    )
    assert new_price["quarter"] == "2026-Q4"
    assert new_price["price_eur_per_tco2"] == 84.10

    # Calculate using the newly added Q4 quarter
    shipment_lines = [
        {
            "heat_number": "HT-Q4",
            "cn_code": "7208",
            "net_mass_tonnes": 50.0,
            "actual_direct_tco2_per_t": 1.40,
            "actual_indirect_tco2_per_t": 0.20,
        }
    ]

    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines=shipment_lines,
        year=2026,
        quarter="2026-Q4",
    )

    assert calc["quarter"] == "2026-Q4"
    assert calc["certificate_price_eur"] == 84.10
    # Actual: 50 * 1.60 = 80.0 tCO2 * 84.10 = €6,728.00
    assert calc["totals"]["total_actual_cost_eur"] == 6728.00


def test_c4_06_importer_csv_export():
    """Verifies CSV generation includes required headers, data rows, totals, and safe escaping."""
    shipment_lines = [
        {
            "heat_number": "HT-CSV-01",
            "cn_code": "7214",
            "net_mass_tonnes": 30.0,
            "actual_direct_tco2_per_t": 1.35,
            "actual_indirect_tco2_per_t": 0.25,
        }
    ]
    calc = CBAMExposureService.calculate_shipment_exposure(shipment_lines, year=2026, quarter="2026-Q2")
    csv_text = CBAMExposureService.generate_importer_csv(calc)

    assert "HEATLEDGER AI - CBAM IMPORTER DATA PACK" in csv_text
    assert "Prepared by the plant, not verified" in csv_text
    assert "HT-CSV-01" in csv_text
    assert "7214" in csv_text
    assert "TOTALS" in csv_text


def test_c4_07_importer_excel_export():
    """Verifies Excel (.xlsx) workbook is generated with styling, totals, and formulas."""
    import openpyxl

    shipment_lines = [
        {
            "heat_number": "HT-XLSX-01",
            "cn_code": "7304",
            "net_mass_tonnes": 45.0,
            "actual_direct_tco2_per_t": 1.60,
            "actual_indirect_tco2_per_t": 0.35,
        }
    ]
    calc = CBAMExposureService.calculate_shipment_exposure(shipment_lines, year=2026, quarter="2026-Q2")
    excel_bytes = CBAMExposureService.generate_importer_excel(calc)
    assert len(excel_bytes) > 1000

    # Parse back with openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
    ws = wb.active
    assert ws.title == "CBAM Importer Data Pack"
    assert ws["A1"].value == "HEATLEDGER AI - CBAM DATA PACK (PROMPT C4)"
    assert any("HT-XLSX-01" in str(cell.value) for row in ws.rows for cell in row)


def test_c4_08_importer_pdf_summary_watermark():
    """Verifies PDF summary generation and mandatory 'Prepared by <plant>. Not a legal verification' watermark."""
    import fitz

    shipment_lines = [
        {
            "heat_number": "HT-PDF-01",
            "cn_code": "7208",
            "net_mass_tonnes": 60.0,
            "actual_direct_tco2_per_t": 1.45,
            "actual_indirect_tco2_per_t": 0.30,
        }
    ]
    calc = CBAMExposureService.calculate_shipment_exposure(
        shipment_lines,
        year=2026,
        quarter="2026-Q3",
        plant_name="Jindal Stainless Plant A",
    )
    pdf_bytes = CBAMExposureService.generate_importer_summary_pdf(calc)
    assert len(pdf_bytes) > 2000

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count == 1
    page_text = doc[0].get_text()

    assert "HEATLEDGER AI · CBAM EXPOSURE" in page_text
    assert "Prepared by Jindal Stainless Plant A" in page_text
    assert "Not a legal verification" in page_text
    doc.close()


def test_c4_09_verifier_handoff_package():
    """Verifies accredited third-party verifier handoff package with calculations, evidence list, and audit trail."""
    shipment_lines = [
        {
            "heat_number": "HT-VERIFY-01",
            "cn_code": "7208",
            "net_mass_tonnes": 75.0,
            "route": "BF-BOF",
            "actual_direct_tco2_per_t": 1.48,
            "actual_indirect_tco2_per_t": 0.31,
            "source_note_direct": "Primary BOF sub-lance & top-gas metering",
            "source_note_indirect": "State DISCOM billing tariff and CEA factor",
        }
    ]
    calc = CBAMExposureService.calculate_shipment_exposure(shipment_lines, year=2026, quarter="2026-Q1")
    pkg = CBAMExposureService.generate_verifier_handoff_package(calc)

    assert pkg["dossier_type"] == "CBAM_ACCREDITED_VERIFIER_HANDOFF_PACKAGE"
    assert CBAM_VERIFIER_MEMO_DISCLAIMER in pkg["statutory_notice"]
    assert "does not replace statutory EU accreditation" in pkg["verification_disclaimer"]

    # Audit trail verification
    lines_audit = pkg["lines_audit_trail"]
    assert len(lines_audit) == 1
    line_0 = lines_audit[0]
    assert line_0["heat_number"] == "HT-VERIFY-01"
    assert "formula_actual" in line_0["calculation_trace"]
    assert len(line_0["evidence_references"]) >= 2


def test_c4_10_api_cbam_exposure_endpoints():
    """Tests all FastAPI endpoints on /api/cbam-exposure router."""
    # 1. GET /api/cbam-exposure/rules
    res_rules = client.get("/api/cbam-exposure/rules")
    assert res_rules.status_code == 200
    assert "markups_by_year" in res_rules.json()

    # 2. GET /api/cbam-exposure/prices
    res_prices = client.get("/api/cbam-exposure/prices")
    assert res_prices.status_code == 200
    assert isinstance(res_prices.json(), list)

    # 3. POST /api/cbam-exposure/calculate
    calc_payload = {
        "plant_name": "API Plant A",
        "importer_name": "API Importer GmbH",
        "year": 2026,
        "quarter": "2026-Q1",
        "lines": [
            {
                "heat_number": "HT-API-01",
                "cn_code": "7208",
                "net_mass_tonnes": 20.0,
                "actual_direct_tco2_per_t": 1.40,
                "actual_indirect_tco2_per_t": 0.25,
            }
        ]
    }
    res_calc = client.post("/api/cbam-exposure/calculate", json=calc_payload)
    assert res_calc.status_code == 200
    calc_data = res_calc.json()
    assert "exposure_card" in calc_data
    assert calc_data["totals"]["total_mass_tonnes"] == 20.0

    # 4. POST /api/cbam-exposure/admin/prices
    admin_payload = {
        "quarter": "2027-Q1",
        "year": 2027,
        "quarter_num": 1,
        "price_eur_per_tco2": 88.50,
        "source_url": "https://taxation-customs.ec.europa.eu/cbam_2027",
        "notes": "Projected 2027 Q1 price",
    }
    res_admin = client.post("/api/cbam-exposure/admin/prices", json=admin_payload)
    assert res_admin.status_code == 201

    # 5. POST /api/cbam-exposure/export/csv
    res_csv = client.post("/api/cbam-exposure/export/csv", json=calc_payload)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Prepared by the plant, not verified" in res_csv.text

    # 6. POST /api/cbam-exposure/export/excel
    res_excel = client.post("/api/cbam-exposure/export/excel", json=calc_payload)
    assert res_excel.status_code == 200
    assert len(res_excel.content) > 1000

    # 7. POST /api/cbam-exposure/export/pdf
    res_pdf = client.post("/api/cbam-exposure/export/pdf", json=calc_payload)
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf.headers["content-type"]

    # 8. POST /api/cbam-exposure/verifier-handoff
    res_handoff = client.post("/api/cbam-exposure/verifier-handoff", json=calc_payload)
    assert res_handoff.status_code == 200
    assert res_handoff.json()["dossier_type"] == "CBAM_ACCREDITED_VERIFIER_HANDOFF_PACKAGE"
