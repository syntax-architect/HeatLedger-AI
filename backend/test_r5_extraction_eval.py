"""
HEATLEDGER AI: Prompt R5 Test Suite
Verifies honest extraction accuracy measurement, golden dataset,
two-tier cost guardrails, blank PDF safety, out-of-spec flagging, and marketing claim guardrail.
"""

import sys
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from main import app
from extraction_service import MTCOCRService
from token_budget_service import TokenBudgetService
from ledger_service import LedgerService
from eval_extraction import run_evaluation

client = TestClient(app)
GOLDEN_DIR = REPO_ROOT / "tools" / "golden" / "data"


def test_golden_dataset_size_and_structure():
    """Requirement 1: tools/golden/data/ dataset contains at least 30 certificates with valid GT JSONs."""
    assert GOLDEN_DIR.exists(), f"Golden directory {GOLDEN_DIR} does not exist"
    pdfs = list(GOLDEN_DIR.glob("*.pdf"))
    jsons = list(GOLDEN_DIR.glob("*.json"))

    assert len(pdfs) >= 30, f"Expected >= 30 golden PDFs, found {len(pdfs)}"
    assert len(jsons) >= 30, f"Expected >= 30 golden JSONs, found {len(jsons)}"

    required_keys = {
        "filename", "heat_number", "mill_name", "grade",
        "quantity_mt", "country_of_melt_and_pour", "chemistry",
        "is_valid_certificate", "should_flag"
    }

    for jf in jsons:
        with open(jf, "r", encoding="utf-8") as f:
            data = json.load(f)
        missing = required_keys - set(data.keys())
        assert not missing, f"{jf.name} missing required ground-truth keys: {missing}"


def test_blank_pdf_returns_no_certificate_data_found_and_creates_no_heat():
    """Requirement 5: Blank PDF returns 'No certificate data found' and creates zero heats."""
    blank_pdf_path = GOLDEN_DIR / "30_blank_page_empty.pdf"
    assert blank_pdf_path.exists(), "30_blank_page_empty.pdf must exist"

    with open(blank_pdf_path, "rb") as f:
        pdf_bytes = f.read()

    ocr = MTCOCRService()
    res = ocr.parse_text_layer_mtc(pdf_bytes, sha256="sha256_blank_test")

    assert res.status == "needs_manual_entry"
    assert res.reason == "No certificate data found"
    assert res.confidence_score == 0.0
    assert len(res.heat_numbers) == 0
    assert res.flagged_for_review is True

    # Check extraction endpoint via API
    resp = client.post(
        "/api/mtc/extract",
        files={"file": ("blank.pdf", pdf_bytes, "application/pdf")}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "needs_manual_entry"
    assert data["reason"] == "No certificate data found"
    assert len(data["heat_numbers"]) == 0

    # Ensure ledger rejects blank / unspecified heats
    with pytest.raises(ValueError, match="Cannot register heat: Missing or invalid heat number"):
        LedgerService.register_heat(
            heat_number="",
            organization_id="test_org",
            mill_name="None",
            steel_grade="None",
            initial_weight_kg=1000
        )

    with pytest.raises(ValueError, match="Cannot register heat: Missing or invalid heat number"):
        LedgerService.register_heat(
            heat_number="BLANK",
            organization_id="test_org",
            mill_name="None",
            steel_grade="None",
            initial_weight_kg=1000
        )


def test_safety_policy_flags_malformed_heat_number():
    """Requirement 3: Malformed heat number must be flagged for manual review with low confidence."""
    malformed_pdf = GOLDEN_DIR / "29_malformed_heat_number.pdf"
    with open(malformed_pdf, "rb") as f:
        pdf_bytes = f.read()

    ocr = MTCOCRService()
    res = ocr.parse_text_layer_mtc(pdf_bytes, sha256="sha256_malformed_test")

    assert res.flagged_for_review is True
    assert res.status == "needs_manual_entry"
    assert res.confidence_score < 0.85
    assert any("malformed" in r.lower() for r in res.review_reasons)


def test_safety_policy_flags_missing_country_eu_reg():
    """Requirement 3: Missing country of melt and pour must be flagged under EU Reg 2026/1963."""
    missing_country_files = [
        "18_missing_country_rebar.pdf",
        "19_missing_country_forging.pdf",
        "20_missing_country_pipe.pdf"
    ]
    ocr = MTCOCRService()

    for fname in missing_country_files:
        fpath = GOLDEN_DIR / fname
        with open(fpath, "rb") as f:
            pdf_bytes = f.read()
        res = ocr.parse_text_layer_mtc(pdf_bytes, sha256=f"sha_{fname}")
        assert res.flagged_for_review is True
        assert res.status == "needs_manual_entry"
        assert res.country_of_melt_and_pour is None or res.country_of_melt_and_pour.country_name is None
        assert any("2026/1963" in r or "Country of Melt and Pour" in r for r in res.review_reasons)


def test_safety_policy_flags_out_of_spec_chemistry():
    """Requirement 3: Out-of-spec chemistry (C, S, P) must be flagged for manual review."""
    ocr = MTCOCRService()

    # 1. High Carbon
    with open(GOLDEN_DIR / "21_high_carbon_out_of_spec.pdf", "rb") as f:
        res_c = ocr.parse_text_layer_mtc(f.read(), sha256="sha_high_c")
    assert res_c.flagged_for_review is True
    assert any("Carbon" in r for r in res_c.review_reasons)

    # 2. High Sulfur
    with open(GOLDEN_DIR / "22_high_sulfur_out_of_spec.pdf", "rb") as f:
        res_s = ocr.parse_text_layer_mtc(f.read(), sha256="sha_high_s")
    assert res_s.flagged_for_review is True
    assert any("Sulfur" in r for r in res_s.review_reasons)

    # 3. High Phosphorus
    with open(GOLDEN_DIR / "23_high_phosphorus_out_of_spec.pdf", "rb") as f:
        res_p = ocr.parse_text_layer_mtc(f.read(), sha256="sha_high_p")
    assert res_p.flagged_for_review is True
    assert any("Phosphorus" in r for r in res_p.review_reasons)


def test_two_tier_token_budget_guardrail():
    """Requirement 4: Enforce daily/monthly token budgets with deterministic limit-reached response."""
    org_id = "test_budget_org_01"
    TokenBudgetService.reset_usage_for_testing(org_id)

    # Under budget
    is_ok, reason = TokenBudgetService.check_budget(org_id, estimated_tokens=1000, daily_limit=5000)
    assert is_ok is True
    assert reason is None

    # Record usage up to limit
    TokenBudgetService.record_usage(org_id, model="gemini-3.1-flash-lite", tokens_used=4500, cost_paise=22.5)

    # Exceed limit
    is_ok, reason = TokenBudgetService.check_budget(org_id, estimated_tokens=1000, daily_limit=5000)
    assert is_ok is False
    assert "Daily token budget limit reached" in reason

    status = TokenBudgetService.get_budget_status(org_id, daily_limit=5000)
    assert status["daily_tokens_used"] == 4500
    assert status["limit_reached"] is False  # 4500 < 5000, but next 1000 would exceed

    # Exceeding monthly limit
    is_ok_m, reason_m = TokenBudgetService.check_budget(org_id, estimated_tokens=1000, monthly_limit=4000)
    assert is_ok_m is False
    assert "Monthly token budget limit reached" in reason_m


def test_hash_based_caching():
    """Requirement 4: Results cached by SHA-256 checksum."""
    ocr = MTCOCRService()
    test_pdf = GOLDEN_DIR / "01_tata_steel_tsj_9021.pdf"
    with open(test_pdf, "rb") as f:
        pdf_bytes = f.read()

    # Extract once
    res1 = ocr.extract_mtc(pdf_bytes, file_name="01.pdf", organization_id="test_org")
    assert res1.status == "success"

    # Query cache
    cached = ocr.get_cached_result(res1.sha256_checksum)
    assert cached is not None
    assert cached.sha256_checksum == res1.sha256_checksum
    assert cached.heat_numbers == res1.heat_numbers


def test_eval_extraction_harness():
    """Requirement 2: eval_extraction computes honest metrics across all 30 golden files."""
    summary = run_evaluation()
    assert summary["total_certificates"] >= 30
    assert summary["country_acc"] >= 90.0
    assert summary["grade_acc"] >= 90.0
    assert summary["chemistry_acc"] >= 90.0
    assert summary["heat_number_acc"] >= 90.0
    assert summary["safety_flagging_acc"] == 100.0
    assert summary["blank_pdf_verified"] is True
    assert summary["avg_duration_ms"] < 100.0  # Vector text layer is fast


def test_marketing_guardrail_withholds_public_accuracy_under_100_certs():
    """Requirement 6: Guardrail prevents public marketing accuracy claims until 100 real certs measured."""
    resp = client.get("/api/extraction/telemetry")
    assert resp.status_code == 200
    data = resp.json()

    assert "accuracy_claim_permitted" in data
    assert "accuracy_guardrail_notice" in data
    if data["production_certificates_evaluated"] < 100:
        assert data["accuracy_claim_permitted"] is False
        assert "withheld until at least 100 real production mill certificates" in data["accuracy_guardrail_notice"]
