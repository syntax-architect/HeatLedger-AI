"""
HEATLEDGER AI: Phase 1 Prompt H1 Acceptance Test Suite
Specification: Anti-Hallucination & Fake Data Removal
- Uploading a PDF with no steel data returns needs_manual_entry with no chemistry.
- Uploading each of the 3 sample PDFs extracts true text from the page (heat numbers match text, not constant).
- Missing upstream PDF in generate_dossier_bundle returns HTTP 400.
- Grep verification proves no hardcoded fallback constants (e.g. TSJ-26-9021) in non-demo extraction code.
- DEMO_MODE stamps diagonal 'SAMPLE - NOT A REAL CERTIFICATE' watermark.
"""

import json
import os
import sys

import pymupdf as fitz
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from main import app

client = TestClient(app)


def test_h1_1_random_non_steel_pdf_returns_needs_manual_entry():
    """
    Assert that uploading a PDF containing no metallurgical steel data
    returns status 'needs_manual_entry' with empty chemistry and empty heats.
    Zero hallucination or fallback defaults.
    """
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 80), "QUARTERLY FINANCIAL REPORT — FY 2026-27")
    page.insert_text((50, 110), "Revenue increased by 14% year over year across software subscriptions.")
    page.insert_text((50, 140), "Office expenses: INR 45,000. Rent: INR 1,20,000. Travel: INR 18,500.")
    page.insert_text((50, 170), "Prepared by: Accounting Division.")
    pdf_bytes = doc.write()
    doc.close()

    res = client.post(
        "/api/ocr/extract-mtc",
        files={"file": ("financial_report.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "needs_manual_entry"
    assert "No recognizable steel mill certificate data" in data["reason"]
    assert data["heat_numbers"] == []
    assert data["chemical_composition"] == {}
    assert data["confidence_score"] == 0.0
    print("✓ Test H1.1 Passed: Non-steel PDF returns 'needs_manual_entry' with 0.0 confidence and empty chemistry.")


def test_h1_2_sample_pdfs_extract_matching_text_not_constants():
    """
    Assert that uploading each of the 3 distinct sample PDFs extracts
    the exact heat number, mill name, and chemistry present on that page.
    """
    samples = [
        {
            "path": os.path.join(os.path.dirname(__file__), "samples", "Tata_Steel_3.1_MTC_TSJ-26-9021.pdf"),
            "expected_heat": "TSJ-26-9021",
            "expected_c": 0.22,
            "mill_fragment": "Tata Steel"
        },
        {
            "path": os.path.join(os.path.dirname(__file__), "samples", "SAIL_Bokaro_3.1_MTC_BOK-26-4910.pdf"),
            "expected_heat": "BOK-26-4910",
            "expected_c": 0.14,
            "mill_fragment": "Steel Authority of India"
        },
        {
            "path": os.path.join(os.path.dirname(__file__), "samples", "JSW_Steel_3.1_MTC_JSW-26-7734.pdf"),
            "expected_heat": "JSW-26-7734",
            "expected_c": 0.41,
            "mill_fragment": "JSW Steel"
        }
    ]

    for s in samples:
        assert os.path.exists(s["path"]), f"Sample file missing: {s['path']}"
        with open(s["path"], "rb") as f:
            pdf_bytes = f.read()

        res = client.post(
            "/api/ocr/extract-mtc",
            files={"file": (os.path.basename(s["path"]), pdf_bytes, "application/pdf")}
        )
        assert res.status_code == 200, res.text
        data = res.json()

        assert data["status"] == "success"
        assert s["expected_heat"] in data["heat_numbers"], f"Expected heat {s['expected_heat']} not in {data['heat_numbers']}"
        assert s["mill_fragment"].lower() in data["mill_name"].lower()
        assert "C" in data["chemical_composition"]
        assert round(data["chemical_composition"]["C"]["measured"], 2) == round(s["expected_c"], 2)
        assert data["chemical_composition"]["C"]["bounding_box"] is not None

        # Verify real PyMuPDF normalized bounding box coordinates
        bbox = data["chemical_composition"]["C"]["bounding_box"]
        assert 0 <= bbox["x0"] < bbox["x1"] <= 1000
        assert 0 <= bbox["y0"] < bbox["y1"] <= 1000
        print(f"✓ Test H1.2 Passed for {s['expected_heat']}: Extracted matching page text (C={s['expected_c']}%, bbox validated).")


def test_h1_3_generate_bundle_rejects_missing_upstream_pdf():
    """
    Assert that generate-dossier-bundle returns HTTP 400 when no upstream PDF is supplied.
    The sample_data fallback has been completely removed.
    """
    cover_meta = {
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-999",
        "cn_code": "7307",
        "heat_number": "HEAT-CUSTOM-001",
        "upstream_mill": "JSW Steel Vijayanagar",
        "country_of_melt": "INDIA",
        "qa_inspector_name": "R. K. Chatterjee",
        "qa_emp_id": "QA-04"
    }

    # Post with cover_meta but NO upstream_pdf
    res = client.post(
        "/api/dossier/generate-bundle",
        data={"cover_meta": json.dumps(cover_meta)}
    )
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "Missing upstream mill certificate" in res.json().get("detail", "")
    print("✓ Test H1.3 Passed: generate-dossier-bundle strictly returns 400 if upstream PDF is omitted.")


def test_h1_4_demo_mode_diagonal_watermark():
    """
    Assert that in demo mode (is_demo=True), generated PDF contains
    the diagonal 'SAMPLE — NOT A REAL CERTIFICATE' watermark and metadata warning.
    """
    cover_meta = {
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-DEMO-01",
        "cn_code": "7307",
        "heat_number": "HEAT-DEMO-001",
        "upstream_mill": "Tata Steel Limited",
        "country_of_melt": "INDIA",
        "qa_inspector_name": "R. K. Chatterjee",
        "qa_emp_id": "QA-04",
        "is_demo": True
    }

    sample_pdf_path = os.path.join(os.path.dirname(__file__), "samples", "Tata_Steel_3.1_MTC_TSJ-26-9021.pdf")
    with open(sample_pdf_path, "rb") as f:
        upstream_bytes = f.read()

    res = client.post(
        "/api/dossier/generate-bundle",
        data={"cover_meta": json.dumps(cover_meta)},
        files={"upstream_pdf": ("upstream.pdf", upstream_bytes, "application/pdf")}
    )
    assert res.status_code == 200, res.text
    assert "SAMPLE_NOT_A_REAL_CERTIFICATE" in res.headers.get("content-disposition", "")

    doc = fitz.open(stream=res.content, filetype="pdf")
    first_page_text = doc[0].get_text("text")
    assert "SAMPLE - NOT A REAL CERTIFICATE" in first_page_text
    assert "SAMPLE - NOT A REAL CERTIFICATE" in doc.metadata.get("title", "")
    doc.close()
    print("✓ Test H1.4 Passed: Demo mode stamps diagonal watermark and embeds metadata tags.")


def test_h1_5_no_hardcoded_constants_in_non_demo_code():
    """
    Assert via grep that no constant like TSJ-26-9021 appears as a hardcoded fallback
    in backend/extraction_service.py or request models in backend/main.py.
    """
    mtc_service_path = os.path.join(os.path.dirname(__file__), "extraction_service.py")
    with open(mtc_service_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "TSJ-26-9021" not in content, "Found TSJ-26-9021 hardcoded in extraction_service.py!"
    assert 'heat_num = heat_match.group(1) if heat_match else "TSJ-26-9021"' not in content

    main_path = os.path.join(os.path.dirname(__file__), "main.py")
    with open(main_path, "r", encoding="utf-8") as f:
        main_content = f.read()

    # Verify defaults were removed from main models
    assert 'invoice_number: str = Field(default="EXP-2026-109"' not in main_content
    assert 'heat_number: str = Field(default="TSJ-26-9021"' not in main_content
    assert 'company_name: str = Field(default="Howrah Precision Forgings Pvt. Ltd."' not in main_content
    print("✓ Test H1.5 Passed: Zero hardcoded fallback constants present in non-demo service code.")


if __name__ == "__main__":
    test_h1_1_random_non_steel_pdf_returns_needs_manual_entry()
    test_h1_2_sample_pdfs_extract_matching_text_not_constants()
    test_h1_3_generate_bundle_rejects_missing_upstream_pdf()
    test_h1_4_demo_mode_diagonal_watermark()
    test_h1_5_no_hardcoded_constants_in_non_demo_code()
    print("\n=======================================================")
    print("ALL PHASE 1 PROMPT H1 ACCEPTANCE TESTS PASSED!")
    print("=======================================================\n")
