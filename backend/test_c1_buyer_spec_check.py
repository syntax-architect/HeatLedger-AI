"""
PROMPT C1: Buyer-Spec Check & Grade Tolerances Test Suite
Specification: Prompt Pack v4 - Phase C (C1)

Test Cases:
1. data/grade_specs.json exists, contains >= 15 common grades, and has mandatory disclaimer.
2. Seeded passing heat (ASTM A105 within limits) evaluates to 'pass' with summary 'Meets the limits you entered'.
3. Seeded failing heat (ASTM A105 with Carbon 0.38% > 0.35%) evaluates to 'fail' and identifies C above limit.
4. Missing required property (A350 LF2 missing impact test) evaluates to 'unclear'.
5. Internal self-consistency: Tensile < Yield strength is physically impossible and flagged as BLOCKER.
6. Carbon Equivalent (CE) calculation accurately implements IIW formula.
7. Chronological consistency: Test date after dispatch date is flagged.
8. Batch shipment spec check returns executive 1-line status.
9. FastAPI routes (/api/specs/grades, /api/specs/check-heat, /api/specs/check-shipment) respond HTTP 200.
10. Regulatory wording rule: Output strictly excludes forbidden words ('compliant', 'certified', 'guaranteed').
"""

import json
import os
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.spec_service import SpecService

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GRADE_SPECS_PATH = os.path.join(REPO_ROOT, "data", "grade_specs.json")


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def auth_headers(test_client):
    res = test_client.post("/api/auth/login", json={
        "email": "owner@howrahsteel.in",
        "password": "OwnerSecretPassword2026!"
    })
    token = res.json()["token"]
    return {"Authorization": f"Bearer {token}"}


# ==============================================================================
# TEST 1: Spec Library Schema & Seeding
# ==============================================================================
def test_c1_01_grade_specs_library_exists_and_seeded():
    """Confirms data/grade_specs.json exists, has >= 15 grades and plant-confirmed label."""
    assert os.path.exists(GRADE_SPECS_PATH), f"Missing {GRADE_SPECS_PATH}"
    with open(GRADE_SPECS_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "grades" in data
    grades = data["grades"]
    assert len(grades) >= 15, f"Expected >= 15 seeded grades, got {len(grades)}"

    # Check required fields
    for g in grades:
        assert "id" in g
        assert "standard" in g
        assert "grade" in g
        assert "elements" in g
        assert "mechanical" in g
        assert "plant-confirmed limits" in g.get("status_label", "")

    # Check disclaimer and rounding rule
    assert "Plant-confirmed limits" in data.get("disclaimer", "")
    assert "ASTM E29" in data.get("rounding_method", "")


# ==============================================================================
# TEST 2: Seeded Passing Heat
# ==============================================================================
def test_c1_02_seeded_passing_heat_astm_a105():
    """ASTM A105 forging with valid chemistry and mechanical properties passes."""
    passing_heat = {
        "heat_id": "HT-2026-A105-PASS",
        "grade_id": "astm_a105",
        "chemistry": {
            "C": 0.22,
            "Mn": 0.85,
            "P": 0.015,
            "S": 0.010,
            "Si": 0.25,
            "Cu": 0.15,
            "Ni": 0.10,
            "Cr": 0.08,
            "Mo": 0.02,
            "V": 0.01
        },
        "mechanical": {
            "yield_strength_mpa": 290.0,
            "tensile_strength_mpa": 530.0,
            "elongation_pct": 28.0,
            "reduction_of_area_pct": 45.0,
            "hardness_hb": 156
        },
        "test_date": "2026-10-15",
        "dispatch_date": "2026-10-20"
    }

    result = SpecService.check_heat_against_spec(
        heat_id=passing_heat["heat_id"],
        heat_elements=passing_heat["chemistry"],
        heat_mechanical=passing_heat["mechanical"],
        grade_id=passing_heat["grade_id"],
        test_date=passing_heat["test_date"],
        dispatch_date=passing_heat["dispatch_date"]
    )

    assert result["status"] == "pass"
    assert result["summary_statement"] == "Meets the limits you entered"
    assert result["failing_count"] == 0
    assert result["unclear_count"] == 0
    assert "compliant" not in str(result).lower()


# ==============================================================================
# TEST 3: Seeded Failing Heat (Carbon Exceeds Max Limit)
# ==============================================================================
def test_c1_03_seeded_failing_heat_carbon_exceeded():
    """ASTM A105 forging with Carbon 0.38% (max 0.35%) is strictly flagged as fail."""
    failing_heat = {
        "heat_id": "HT-2026-A105-HIGH-CARBON",
        "grade_id": "astm_a105",
        "chemistry": {
            "C": 0.38,  # Limit is 0.35% max
            "Mn": 0.85,
            "P": 0.015,
            "S": 0.010,
            "Si": 0.25
        },
        "mechanical": {
            "yield_strength_mpa": 310.0,
            "tensile_strength_mpa": 550.0,
            "elongation_pct": 24.0
        }
    }

    result = SpecService.check_heat_against_spec(
        heat_id=failing_heat["heat_id"],
        heat_elements=failing_heat["chemistry"],
        heat_mechanical=failing_heat["mechanical"],
        grade_id=failing_heat["grade_id"]
    )

    assert result["status"] == "fail"
    assert result["failing_count"] >= 1
    assert any("C:" in detail and "Above maximum limit" in detail for detail in result["failing_details"])
    assert result["property_results"]["C"]["status"] == "fail"


# ==============================================================================
# TEST 4: Missing Required Property (Unclear Status)
# ==============================================================================
def test_c1_04_missing_required_impact_property_unclear():
    """ASTM A350 LF2 Class 1 requires Charpy impact testing at -46°C; missing is flagged unclear."""
    heat_missing_impact = {
        "heat_id": "HT-2026-LF2-NO-IMPACT",
        "grade_id": "astm_a350_lf2_cl1",
        "chemistry": {
            "C": 0.22,
            "Mn": 1.15,
            "Si": 0.25,
            "P": 0.012,
            "S": 0.008
        },
        "mechanical": {
            "yield_strength_mpa": 280.0,
            "tensile_strength_mpa": 520.0,
            "elongation_pct": 25.0
            # impact_energy_joules intentionally omitted
        }
    }

    result = SpecService.check_heat_against_spec(
        heat_id=heat_missing_impact["heat_id"],
        heat_elements=heat_missing_impact["chemistry"],
        heat_mechanical=heat_missing_impact["mechanical"],
        grade_id=heat_missing_impact["grade_id"]
    )

    assert result["status"] == "unclear"
    assert result["unclear_count"] >= 1
    assert "impact_energy" in result["property_results"]
    assert result["property_results"]["impact_energy"]["status"] == "unclear"


# ==============================================================================
# TEST 5: Internal Self-Consistency (Tensile < Yield Strength)
# ==============================================================================
def test_c1_05_internal_self_consistency_tensile_less_than_yield():
    """Tensile strength less than yield strength is physically impossible and flagged as BLOCKER."""
    impossible_heat = {
        "heat_id": "HT-2026-IMPOSSIBLE-STRENGTH",
        "grade_id": "astm_a105",
        "chemistry": {"C": 0.22, "Mn": 0.85},
        "mechanical": {
            "yield_strength_mpa": 450.0,
            "tensile_strength_mpa": 380.0  # Physically impossible (Tensile < Yield)
        }
    }

    findings = SpecService.verify_self_consistency(
        elements=impossible_heat["chemistry"],
        mechanical=impossible_heat["mechanical"]
    )

    blockers = [f for f in findings if f["severity"] == "BLOCKER"]
    assert len(blockers) >= 1
    assert blockers[0]["check"] == "TENSILE_YIELD_RATIO"


# ==============================================================================
# TEST 6: Carbon Equivalent (CE) Calculation
# ==============================================================================
def test_c1_06_carbon_equivalent_calculation():
    """Verifies IIW formula: CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15."""
    # Chemistry: C=0.20, Mn=0.90, Cr=0.10, Mo=0.05, V=0.02, Ni=0.15, Cu=0.15
    # CE = 0.20 + (0.90 / 6) + (0.17 / 5) + (0.30 / 15)
    # CE = 0.20 + 0.15 + 0.034 + 0.02 = 0.404
    elements = {
        "C": 0.20,
        "Mn": 0.90,
        "Cr": 0.10,
        "Mo": 0.05,
        "V": 0.02,
        "Ni": 0.15,
        "Cu": 0.15
    }
    ce = SpecService.calculate_carbon_equivalent(elements)
    assert ce == 0.404


# ==============================================================================
# TEST 7: Chronological Verification
# ==============================================================================
def test_c1_07_chronology_test_date_after_dispatch():
    """Test date after dispatch date generates a chronological validity warning."""
    findings = SpecService.verify_self_consistency(
        elements={"C": 0.20},
        mechanical={"yield_strength_mpa": 300, "tensile_strength_mpa": 500},
        test_date_str="2026-11-20",
        dispatch_date_str="2026-11-10"  # Test happened 10 days AFTER departure!
    )
    chrono_findings = [f for f in findings if f["check"] == "CHRONOLOGY"]
    assert len(chrono_findings) == 1
    assert chrono_findings[0]["status"] == "fail"


# ==============================================================================
# TEST 8: Batch Shipment Spec Check
# ==============================================================================
def test_c1_08_batch_shipment_spec_check():
    """Batch shipment evaluation reports 'All N heats meet the entered limits' or 'N heats need attention'."""
    heats = [
        {
            "heat_number": "HT-001",
            "grade_id": "astm_a105",
            "chemistry": {"C": 0.22, "Mn": 0.80, "Si": 0.20, "P": 0.015, "S": 0.012},
            "mechanical": {"yield_strength_mpa": 280, "tensile_strength_mpa": 510, "elongation_pct": 26}
        },
        {
            "heat_number": "HT-002",
            "grade_id": "astm_a105",
            "chemistry": {"C": 0.39, "Mn": 0.80},  # Fails carbon limit!
            "mechanical": {"yield_strength_mpa": 280, "tensile_strength_mpa": 510, "elongation_pct": 26}
        }
    ]

    report = SpecService.check_shipment_heats("SHP-2026-EU-01", heats)
    assert report["total_heats"] == 2
    assert report["heats_needing_attention"] == 1
    assert report["heats_meeting_limits"] == 1
    assert "1 of 2 heats need attention" in report["summary_statement"]


# ==============================================================================
# TEST 9: API Router Endpoints Integration
# ==============================================================================
def test_c1_09_api_specs_endpoints(test_client, auth_headers):
    """Validates FastAPI routes /api/specs/grades and /api/specs/check-heat."""
    # List grades
    res_list = test_client.get("/api/specs/grades", headers=auth_headers)
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["count"] >= 15
    assert "grades" in data

    # Check heat endpoint
    payload = {
        "heat_id": "HT-API-001",
        "grade_id": "astm_a105",
        "chemistry": {"C": 0.21, "Mn": 0.75, "Si": 0.22, "P": 0.018, "S": 0.010},
        "mechanical": {"yield_strength_mpa": 295, "tensile_strength_mpa": 525, "elongation_pct": 27}
    }
    res_check = test_client.post("/api/specs/check-heat", json=payload, headers=auth_headers)
    assert res_check.status_code == 200
    check_data = res_check.json()
    assert check_data["status"] == "pass"
    assert "Meets the limits you entered" in check_data["summary_statement"]


# ==============================================================================
# TEST 10: Regulatory Wording Rule
# ==============================================================================
def test_c1_10_regulatory_wording_rule():
    """Confirms no forbidden words ('compliant', 'certified', 'guaranteed') in spec responses."""
    result = SpecService.check_heat_against_spec(
        heat_id="HT-WORDING-TEST",
        heat_elements={"C": 0.20, "Mn": 0.80},
        heat_mechanical={"yield_strength_mpa": 300, "tensile_strength_mpa": 500},
        grade_id="astm_a105"
    )
    result_str = json.dumps(result).lower()
    assert "audit-proof" not in result_str
    assert "zero penalty" not in result_str
    assert "100% compliant" not in result_str
    assert "certified compliant" not in result_str
