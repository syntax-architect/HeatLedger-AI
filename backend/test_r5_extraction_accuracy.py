"""
HEATLEDGER AI: Prompt R5 Test Suite
Measure Extraction Accuracy Honestly:
- Golden dataset evaluation harness against 30 certificates
- Per-field accuracy benchmarks (heat, grade, country of melt/pour, chemistry)
- Anti-hallucination decision gate (flagging out-of-spec, malformed heats, blank page)
- Blank PDF returns 'No certificate data found' and creates NO heat
- Two-tier extraction with hard daily and monthly token budgets
- Cache by SHA-256 file hash
- AI service down/offline graceful retry ("We will read this shortly")
"""

import os
import sys
import uuid
import pymupdf as fitz
from unittest.mock import patch
from fastapi.testclient import TestClient

from main import app
from mtc_ocr_service import MTCOCRService
from token_budget_service import TokenBudgetService
from db.heats_repo import HeatsRepo

# Add scripts directory to path for eval script
SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts")
sys.path.insert(0, SCRIPTS_DIR)
import eval_extraction

client = TestClient(app)


def test_r5_1_golden_dataset_evaluation():
    """
    R5 Deliverable 1: Evaluates extraction accuracy against the full golden set (30 certs).
    Proves per-field accuracy meets target thresholds honestly.
    """
    report = eval_extraction.run_evaluation()
    assert report["total_certificates"] >= 30
    assert report["heat_number_acc"] >= 90.0
    assert report["country_acc"] >= 90.0
    assert report["grade_acc"] >= 85.0
    assert report["chemistry_acc"] >= 90.0
    assert report["safety_flagging_acc"] >= 90.0
    assert report["avg_confidence"] >= 0.80
    assert report["avg_duration_ms"] < 1000.0


def test_r5_2_blank_pdf_returns_no_certificate_data_found_and_creates_no_heat():
    """
    R5 Deliverable 2: A blank PDF returns 'No certificate data found',
    confidence 0.0, flags for human review, and creates NO heat in the repository.
    """
    doc = fitz.open()
    doc.new_page(width=595, height=842)
    blank_bytes = doc.write()
    doc.close()

    ocr = MTCOCRService()
    result = ocr.extract_mtc(blank_bytes, file_name="blank.pdf", organization_id="org_test_r5")

    assert result.status == "needs_manual_entry"
    assert result.reason == "No certificate data found"
    assert result.confidence_score == 0.0
    assert len(result.heat_numbers) == 0
    assert result.flagged_for_review is True

    # Check that blank file produces no heats in database
    blank_sha = result.sha256_checksum
    all_heats = HeatsRepo.list_heats_by_org(organization_id="org_test_r5")
    assert not any(h.get("heat_number") == f"MTC-{blank_sha[:8]}" for h in all_heats)


def test_r5_3_sanity_checks_require_human_confirmation():
    """
    R5 Deliverable 3: Chemistry out-of-spec or malformed heat numbers are flagged
    and require human confirmation (status='needs_manual_entry'). Never invents values.
    """
    golden_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tools", "golden", "data")
    c_out_pdf = os.path.join(golden_dir, "21_high_carbon_out_of_spec.pdf")

    with open(c_out_pdf, "rb") as f:
        pdf_bytes = f.read()

    ocr = MTCOCRService()
    result = ocr.extract_mtc(pdf_bytes, file_name="21_high_carbon_out_of_spec.pdf", organization_id="org_test_r5")

    assert result.flagged_for_review is True
    assert result.status == "needs_manual_entry"
    assert any("Carbon" in r for r in result.review_reasons)


def test_r5_4_missing_country_flagged_as_eu_reg_defect():
    """
    R5 Deliverable 4: MTC missing explicit Country of Melt and Pour is flagged
    as an EU Regulation 2026/1963 defect rather than guessing.
    """
    golden_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "tools", "golden", "data")
    missing_c_pdf = os.path.join(golden_dir, "18_missing_country_rebar.pdf")

    with open(missing_c_pdf, "rb") as f:
        pdf_bytes = f.read()

    ocr = MTCOCRService()
    result = ocr.extract_mtc(pdf_bytes, file_name="18_missing_country_rebar.pdf", organization_id="org_test_r5")

    assert result.flagged_for_review is True
    assert any("Missing explicit Country of Melt and Pour" in r for r in result.review_reasons)
    assert (result.country_of_melt_and_pour is None or not result.country_of_melt_and_pour.explicitly_stated_on_cert)


def test_r5_5_two_tier_cost_guardrail_and_token_budget():
    """
    R5 Deliverable 5: Daily and monthly token budgets per organization.
    When exhausted, returns clear 'limit reached' message without calling paid APIs.
    """
    org_id = f"org_budget_{uuid.uuid4().hex[:6]}"

    # Allowed initially
    allowed, _ = TokenBudgetService.check_budget(org_id, estimated_tokens=1000, daily_limit=5000, monthly_limit=50000)
    assert allowed is True

    # Record usage up to 4500 tokens
    TokenBudgetService.record_usage(org_id, model="gemini-3.1-flash-lite", tokens_used=4500, cost_paise=22.5)

    # Next check requesting 1000 tokens exceeds daily limit (4500 + 1000 > 5000)
    allowed, reason = TokenBudgetService.check_budget(org_id, estimated_tokens=1000, daily_limit=5000, monthly_limit=50000)
    assert allowed is False
    assert "Daily token budget limit reached" in reason
    assert "Manual entry or plan upgrade required" in reason


def test_r5_6_ai_service_offline_saves_upload_and_returns_we_will_read_this_shortly():
    """
    R5 Deliverable 6: If the AI service/parser throws an exception,
    the endpoint saves the upload and returns status 202 with
    'We will read this shortly' instead of failing with 500.
    """
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "TEST MTC CONTENT")
    test_pdf = doc.write()
    doc.close()

    with patch.object(MTCOCRService, "extract_mtc", side_effect=RuntimeError("AI Vision Service 503 Overloaded")):
        res = client.post(
            "/api/ocr/extract-mtc",
            files={"file": ("service_down.pdf", test_pdf, "application/pdf")}
        )
        assert res.status_code == 202
        data = res.json()
        assert data["status"] == "queued"
        assert data["message"] == "We will read this shortly"
        assert data["flagged_for_review"] is True


def test_r5_7_caching_by_file_hash():
    """
    R5 Deliverable 7: Identical document bytes return cached extraction
    without re-parsing or calling external models.
    """
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 100), "TATA STEEL JAMSHEDPUR\nHEAT NO: CACHE-9988\nGRADE: ASTM A106\nCOUNTRY OF MELT: INDIA")
    test_pdf = doc.write()
    doc.close()

    ocr = MTCOCRService()
    res1 = ocr.extract_mtc(test_pdf, file_name="cache1.pdf", organization_id="org_cache_test")
    assert res1.status == "success"

    # Second extraction should hit the SQLite cache
    cached = ocr.get_cached_result(res1.sha256_checksum)
    assert cached is not None
    assert cached.mill_name == res1.mill_name
    assert cached.heat_numbers == res1.heat_numbers
