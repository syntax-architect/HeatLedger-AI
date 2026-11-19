"""
Unit and Integration Test Suite for Prompts B5 & B6:
- Deterministic Validation Engine & Standards Library (B5)
- Traceability Ledger & Anti-Phantom Over-Allocation (B6)
"""

import os
import time
import uuid
import concurrent.futures
import pytest
from fastapi.testclient import TestClient

from main import app
from validation_engine import ValidationEngine, StandardsLibrary, RULE_SET_VERSION
from ledger_service import LedgerService, OverAllocationError

client = TestClient(app)
RUN_SUFFIX = str(uuid.uuid4())[:8]
ORG_ID = f"org_test_b5_b6_{RUN_SUFFIX}"


# ==============================================================================
# B5: VALIDATION ENGINE & STANDARDS LIBRARY TESTS
# ==============================================================================

def test_b5_standards_library_loading():
    """Verify standards library loads EN 10025, ASTM, IS 2062 from CSV."""
    StandardsLibrary.load_standards()
    assert "EN 10025-2" in StandardsLibrary._standards_meta
    assert "IS 2062" in StandardsLibrary._standards_meta

    limits_s355 = StandardsLibrary.get_limits_for_grade("EN 10025-2", "S355JR")
    assert limits_s355 is not None
    assert "C" in limits_s355
    assert limits_s355["C"]["max_value"] == 0.24
    assert limits_s355["CEV"]["max_value"] == 0.45


def test_b5_validation_pass_in_spec():
    """Test fully in-spec EN 10025-2 S355JR certificate passes."""
    cert = {
        "grade": "EN 10025-2 S355JR",
        "certificate_type": "EN 10204 3.1",
        "country_of_melt_and_pour": "India",
        "heat_number": "HEAT-TSJ-9021",
        "chemistry": {
            "C": 0.18,
            "Si": 0.22,
            "Mn": 1.45,
            "P": 0.021,
            "S": 0.012
        },
        "mechanics": {
            "Yield Strength ReH": "385 MPa",
            "Tensile Strength Rm": "520 MPa",
            "Elongation A5": "24.5%"
        }
    }
    report = ValidationEngine.validate_certificate(cert)
    assert report.status == "PASS"
    assert report.standard_code == "EN 10025-2"
    assert report.grade == "S355JR"
    assert report.fail_count == 0
    assert report.rule_set_version == RULE_SET_VERSION


def test_b5_validation_fail_out_of_spec_shows_limit_and_source():
    """Test that out-of-spec carbon (0.28% > 0.24%) fails with exact source clause."""
    cert = {
        "grade": "S355JR",
        "certificate_type": "EN 10204 3.1",
        "country_of_melt_and_pour": "India",
        "heat_number": "HEAT-FAIL-01",
        "chemistry": {
            "C": 0.28,  # Exceeds max 0.24%
            "Mn": 1.40
        }
    }
    report = ValidationEngine.validate_certificate(cert)
    assert report.status == "FAIL"
    failed_c = next((r for r in report.rules if r.property_name == "C"), None)
    assert failed_c is not None
    assert failed_c.status == "FAIL"
    assert failed_c.measured_value == 0.28
    assert failed_c.max_limit == 0.24
    assert "EN 10025-2" in failed_c.source_clause


def test_b5_unknown_grade_manual_check():
    """Unknown grade must return 'unknown grade, manual check'."""
    cert = {
        "grade": "UNOBTANIUM_SUPERALLOY_999",
        "certificate_type": "EN 10204 3.1",
        "country_of_melt_and_pour": "India",
        "heat_number": "HEAT-UNK-01"
    }
    report = ValidationEngine.validate_certificate(cert)
    assert report.status == "WARN"
    assert "manual" in report.rules[0].message.lower() and "check" in report.rules[0].message.lower()


# ==============================================================================
# B6: TRACEABILITY LEDGER & CONCURRENCY TESTS
# ==============================================================================

def test_b6_heat_registration_and_splitting():
    """Test registering a heat and splitting it across multiple shipments."""
    heat_num = f"HEAT-SPLIT-{RUN_SUFFIX}-01"
    LedgerService.register_heat(
        heat_number=heat_num,
        organization_id=ORG_ID,
        mill_name="JSW Steel Ltd",
        steel_grade="S355JR",
        initial_weight_kg=50000.0
    )

    balance1 = LedgerService.get_heat_balance(heat_num)
    assert balance1["initial_kg"] == 50000.0
    assert balance1["remaining_kg"] == 50000.0

    # Allocate 20,000 kg to Shipment A
    res_a = LedgerService.allocate_heat(heat_num, "SHIP-A", 20000.0, ORG_ID)
    assert res_a["remaining_kg"] == 30000.0

    # Allocate 15,000 kg to Shipment B
    res_b = LedgerService.allocate_heat(heat_num, "SHIP-B", 15000.0, ORG_ID)
    assert res_b["remaining_kg"] == 15000.0

    # Check lineage graph
    lineage = LedgerService.get_heat_lineage(heat_num)
    assert len(lineage["shipments"]) == 2
    assert len(lineage["lineage_graph"]["nodes"]) == 3  # 1 heat + 2 shipments


def test_b6_combine_heats_in_one_shipment():
    """Test combining two different heats in one shipment."""
    h1 = f"HEAT-COMBINE-{RUN_SUFFIX}-01"
    h2 = f"HEAT-COMBINE-{RUN_SUFFIX}-02"

    LedgerService.register_heat(h1, ORG_ID, "Tata Steel", "S355JR", 30000.0)
    LedgerService.register_heat(h2, ORG_ID, "SAIL Bokaro", "S275JR", 40000.0)

    # Allocate both to Shipment C
    ship_c = f"SHIP-C-{RUN_SUFFIX}"
    LedgerService.allocate_heat(h1, ship_c, 10000.0, ORG_ID)
    LedgerService.allocate_heat(h2, ship_c, 20000.0, ORG_ID)

    shipment_heats = LedgerService.get_shipment_heats(ship_c)
    assert len(shipment_heats) == 2
    h1_entry = next(h for h in shipment_heats if h["heat_number"] == h1)
    h2_entry = next(h for h in shipment_heats if h["heat_number"] == h2)
    assert h1_entry["allocated_kg"] == 10000.0
    assert h1_entry["percentage_contribution"] == 33.33
    assert h2_entry["allocated_kg"] == 20000.0
    assert h2_entry["percentage_contribution"] == 66.67


def test_b6_over_allocation_rejected_with_deficit():
    """Verify anti-phantom over-allocation guard blocks excess quantity."""
    h = f"HEAT-OVERALLOC-{RUN_SUFFIX}-01"
    LedgerService.register_heat(h, ORG_ID, "Tata Steel", "S355JR", 10000.0)

    # Attempt to allocate 12,000 kg when only 10,000 kg available
    with pytest.raises(OverAllocationError) as exc_info:
        LedgerService.allocate_heat(h, "SHIP-FAIL", 12000.0, ORG_ID)

    err = exc_info.value
    assert err.requested_kg == 12000.0
    assert err.remaining_kg == 10000.0
    assert err.deficit == 2000.0

    # Test via API returns HTTP 422
    resp = client.post("/api/ledger/allocate", json={
        "heat_number": h,
        "shipment_id": "SHIP-API-FAIL",
        "quantity_kg": 15000.0,
        "organization_id": ORG_ID
    })
    assert resp.status_code == 422
    err_body = resp.json()["detail"]
    assert err_body["error"] == "OVER_ALLOCATION_REJECTED"
    assert err_body["deficit_kg"] == 5000.0


def test_b6_owner_approved_override_logs_to_audit():
    """Owner override allows over-allocation and logs mandatory audit record."""
    h = f"HEAT-OVERRIDE-{RUN_SUFFIX}-01"
    LedgerService.register_heat(h, ORG_ID, "Tata Steel", "S355JR", 5000.0)

    res = LedgerService.allocate_heat(
        heat_number=h,
        shipment_id="SHIP-URGENT",
        quantity_kg=6000.0,
        organization_id=ORG_ID,
        allow_override=True,
        override_reason="Expedited export container delivery, mill top-up expected tomorrow",
        created_by="owner_admin_01"
    )
    assert res["remaining_kg"] == -1000.0

    # Verify audit log recorded
    conn = LedgerService.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_log WHERE organization_id = ? AND action = 'OVER_ALLOCATION_OVERRIDE'", (ORG_ID,))
    rows = cursor.fetchall()
    assert len(rows) >= 1
    last_log = rows[-1]
    assert "Expedited export" in last_log["details"]
    conn.close()


def test_b6_concurrent_allocations_prevent_over_allocation():
    """Simulate 10 simultaneous threads attempting to allocate from a single heat."""
    h_concurrent = f"HEAT-CONCURRENT-{RUN_SUFFIX}-RACE"
    total_qty = 10000.0
    LedgerService.register_heat(h_concurrent, ORG_ID, "Tata Steel", "S355JR", total_qty)

    # 10 workers each trying to allocate 2,000 kg (Total 20,000 kg -> only 5 should succeed)
    alloc_slice = 2000.0

    success_count = 0
    failure_count = 0

    def attempt_alloc(worker_id: int):
        try:
            LedgerService.allocate_heat(
                heat_number=h_concurrent,
                shipment_id=f"SHIP-THREAD-{worker_id}",
                quantity_kg=alloc_slice,
                organization_id=ORG_ID,
                allow_override=False
            )
            return True
        except OverAllocationError:
            return False

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(attempt_alloc, i) for i in range(10)]
        for f in concurrent.futures.as_completed(futures):
            if f.result():
                success_count += 1
            else:
                failure_count += 1

    # Exactly 5 should succeed (5 * 2000 = 10000), exactly 5 should fail
    assert success_count == 5
    assert failure_count == 5

    final_balance = LedgerService.get_heat_balance(h_concurrent)
    assert final_balance["remaining_kg"] == 0.0
    assert final_balance["is_over_allocated"] is False
