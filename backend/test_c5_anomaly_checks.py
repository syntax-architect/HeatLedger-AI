"""
PROMPT C5: Certificate Anomaly & Duplicate Verification Test Suite
Specification: Prompt Pack v4 - Phase C (C5)

Test Cases:
1. Planted Problem 1: Same heat number on certificates from different mills is flagged as BLOCKER.
2. Planted Problem 2: Same heat number with conflicting chemistry is flagged as WARNING.
3. Planted Problem 3: Ledger over-allocation (requested > certified capacity) is flagged as BLOCKER.
4. Planted Problem 4: Duplicate file hash under different filename is flagged as WARNING.
5. Planted Problem 5: Test date after dispatch date is flagged as BLOCKER.
6. Planted Problem 6: Physical implausibility (Tensile < Yield) is flagged as BLOCKER.
7. Planted Problem 7: Physical implausibility (Carbon > 2.14% in wrought steel) is flagged as BLOCKER.
8. Planted Problem 8: PDF metadata indicates external design tool (Canva/Photoshop) -> 'looks edited'.
9. Planted Problem 9: Spectrometer repeated digit pattern (0.222, 0.333) -> flagged as REVIEW.
10. Clean certificate produces ZERO flags and returns status 'CLEAN'.
11. Inspector resolution: QA Inspector resolves flag as 'REVIEWED_FINE' with logged justification.
12. FastAPI routes (/api/anomalies/check-certificate, /api/anomalies/resolve-flag) respond HTTP 200.
"""

import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.anomaly_service import AnomalyService


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
# TEST 1: Planted Problem 1 - Same Heat from Different Mills
# ==============================================================================
def test_c5_01_same_heat_different_mills_flagged():
    """Identical heat number claimed by two different mills is flagged as BLOCKER."""
    existing = [{"heat_number": "HT-9988", "mill_name": "Tata Steel Kalinganagar"}]
    flags = AnomalyService.check_duplicate_heats(
        heat_number="HT-9988",
        mill_name="Jindal Steel & Power Ltd.",
        chemistry={"C": 0.22},
        existing_certs=existing
    )
    assert len(flags) == 1
    assert flags[0]["check_code"] == "SAME_HEAT_DIFFERENT_MILL"
    assert flags[0]["severity"] == "BLOCKER"


# ==============================================================================
# TEST 2: Planted Problem 2 - Same Heat Conflicting Chemistry
# ==============================================================================
def test_c5_02_same_heat_conflicting_chemistry_flagged():
    """Identical heat from same mill with significantly differing carbon is flagged."""
    existing = [{"heat_number": "HT-7766", "mill_name": "JSW Steel", "chemistry": {"C": 0.18}}]
    flags = AnomalyService.check_duplicate_heats(
        heat_number="HT-7766",
        mill_name="JSW Steel",
        chemistry={"C": 0.28},  # 0.10% carbon difference on same heat!
        existing_certs=existing
    )
    assert len(flags) == 1
    assert flags[0]["check_code"] == "SAME_HEAT_CONFLICTING_CHEMISTRY"
    assert flags[0]["severity"] == "WARNING"


# ==============================================================================
# TEST 3: Planted Problem 3 - Ledger Over-Allocation
# ==============================================================================
def test_c5_03_ledger_over_allocation_flagged():
    """Allocating 35 tonnes when certified capacity is only 25 tonnes is flagged as BLOCKER."""
    flag = AnomalyService.check_tonnage_over_allocation(
        heat_number="HT-OVER-01",
        certified_tonnes=25.0,
        previously_allocated_tonnes=20.0,
        current_allocation_tonnes=15.0  # Total 35 MT > 25 MT
    )
    assert flag is not None
    assert flag["check_code"] == "LEDGER_OVER_ALLOCATION"
    assert flag["severity"] == "BLOCKER"
    assert "over-allocated by 10.0 MT" in flag["why"]


# ==============================================================================
# TEST 4: Planted Problem 4 - Duplicate File Hash
# ==============================================================================
def test_c5_04_duplicate_file_content_flagged():
    """Uploading an identical certificate PDF under a different filename is flagged."""
    file_hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    existing_files = [{"file_hash": file_hash, "filename": "original_mtc_01.pdf"}]
    flag = AnomalyService.check_duplicate_content(
        file_hash=file_hash,
        filename="renamed_copy_mtc.pdf",
        existing_records=existing_files
    )
    assert flag is not None
    assert flag["check_code"] == "DUPLICATE_CERTIFICATE_FILE"
    assert "byte-identical" in flag["why"]


# ==============================================================================
# TEST 5: Planted Problem 5 - Date Sequence Contradiction
# ==============================================================================
def test_c5_05_date_sequence_test_after_dispatch_flagged():
    """Certificate test date occurring after shipment dispatch is flagged as BLOCKER."""
    flags = AnomalyService.check_date_sequences(
        test_date_str="2026-11-20",
        cert_date_str="2026-11-20",
        dispatch_date_str="2026-11-15"  # Departed 5 days before testing!
    )
    assert len(flags) == 1
    assert flags[0]["check_code"] == "TEST_DATE_AFTER_DISPATCH"
    assert flags[0]["severity"] == "BLOCKER"


# ==============================================================================
# TEST 6: Planted Problem 6 - Tensile < Yield Implausibility
# ==============================================================================
def test_c5_06_tensile_less_than_yield_flagged():
    """Tensile strength less than yield is physically impossible and flagged as BLOCKER."""
    flags = AnomalyService.check_physical_plausibility(
        chemistry={"C": 0.20},
        mechanical={"yield_strength_mpa": 450, "tensile_strength_mpa": 390}
    )
    blockers = [f for f in flags if f["check_code"] == "TENSILE_LESS_THAN_YIELD"]
    assert len(blockers) == 1
    assert blockers[0]["severity"] == "BLOCKER"


# ==============================================================================
# TEST 7: Planted Problem 7 - Carbon > 2.14% in Wrought Steel
# ==============================================================================
def test_c5_07_carbon_cast_iron_threshold_flagged():
    """Carbon content > 2.14% in wrought steel falls in cast iron domain and is flagged."""
    flags = AnomalyService.check_physical_plausibility(
        chemistry={"C": 3.45},  # Cast iron level!
        mechanical={"yield_strength_mpa": 250, "tensile_strength_mpa": 450}
    )
    carbon_flags = [f for f in flags if f["check_code"] == "CARBON_EXCEEDS_STEEL_THRESHOLD"]
    assert len(carbon_flags) == 1
    assert carbon_flags[0]["severity"] == "BLOCKER"


# ==============================================================================
# TEST 8: Planted Problem 8 - PDF Metadata Editing Signs
# ==============================================================================
def test_c5_08_pdf_metadata_canva_editor_flagged():
    """PDF metadata showing Canva or design editor tools flags 'looks edited'."""
    flags = AnomalyService.check_pdf_metadata({
        "producer": "Canva Document Engine",
        "creator": "Canva",
        "creation_date": "2026-10-01",
        "mod_date": "2026-11-15"
    })
    assert len(flags) >= 1
    assert flags[0]["check_code"] == "PDF_EDITOR_TOOL_DETECTED"
    assert "looks edited, ask the mill for the original" in flags[0]["what_to_do"].lower()


# ==============================================================================
# TEST 9: Planted Problem 9 - Spectrometer Repeated Digit Patterns
# ==============================================================================
def test_c5_09_spectrometer_typing_patterns_flagged():
    """Repeated digits (0.222, 0.3333) indicating manual typing are flagged for review."""
    flags = AnomalyService.check_digit_repetition_patterns({
        "C": "0.222",
        "Mn": "0.888",
        "Si": "0.333"
    })
    assert len(flags) == 1
    assert flags[0]["check_code"] == "REPEATED_DIGIT_TYPING_DETECTED"
    assert flags[0]["severity"] == "REVIEW"


# ==============================================================================
# TEST 10: Clean Certificate Produces ZERO Flags
# ==============================================================================
def test_c5_10_clean_certificate_produces_zero_flags():
    """A clean, genuine certificate produces zero flags and returns status CLEAN."""
    clean_cert = {
        "id": "cert_clean_001",
        "heat_number": "HT-CLEAN-2026",
        "mill_name": "Tata Steel",
        "chemistry": {"C": 0.22, "Mn": 0.85, "Si": 0.24, "P": 0.015, "S": 0.012},
        "mechanical": {"yield_strength_mpa": 290, "tensile_strength_mpa": 530, "elongation_pct": 28},
        "file_hash": "a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e",
        "filename": "mtc_genuine_tata.pdf",
        "test_date": "2026-10-15",
        "certificate_date": "2026-10-16",
        "pdf_metadata": {"producer": "iText / SAP NetWeaver ERP"}
    }
    report = AnomalyService.run_all_anomaly_checks(
        certificate=clean_cert,
        context={"dispatch_date": "2026-10-25"}
    )
    assert report["status"] == "CLEAN"
    assert report["total_flags"] == 0
    assert report["blockers_count"] == 0


# ==============================================================================
# TEST 11: Inspector Resolution Workflow
# ==============================================================================
def test_c5_11_inspector_resolution_workflow(test_client, auth_headers):
    """Authorized QA Inspector resolves flag with logged reason."""
    payload = {
        "flag_id": "ANOM_DIFF_MILL_HT-9988",
        "resolution_status": "REVIEWED_FINE",
        "reason": "Verified against mill dispatch challan DC-8812; heat re-rolled under subcontract."
    }
    res = test_client.post("/api/anomalies/resolve-flag", json=payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["log_entry"]["flag_id"] == "ANOM_DIFF_MILL_HT-9988"
    assert data["log_entry"]["resolution_status"] == "REVIEWED_FINE"

    # Check resolution log
    res_log = test_client.get("/api/anomalies/resolution-log", headers=auth_headers)
    assert res_log.status_code == 200
    log_data = res_log.json()
    assert log_data["total_resolutions"] >= 1


# ==============================================================================
# TEST 12: API Check-Certificate Endpoint
# ==============================================================================
def test_c5_12_api_check_certificate_endpoint(test_client, auth_headers):
    """FastAPI route /api/anomalies/check-certificate responds correctly."""
    cert_payload = {
        "certificate": {
            "heat_number": "HT-FLAGGED-01",
            "mill_name": "Test Mill",
            "chemistry": {"C": 0.20},
            "mechanical": {"yield_strength_mpa": 420, "tensile_strength_mpa": 350}  # Tensile < Yield
        },
        "context": {}
    }
    res = test_client.post("/api/anomalies/check-certificate", json=cert_payload, headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "FLAGGED"
    assert data["blockers_count"] >= 1
