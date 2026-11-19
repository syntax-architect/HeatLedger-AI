"""
Tests for Prompt B7: CBAM Engine Service
Verifies:
- Calculations with inputs, outputs, trace, constants_version, method_version
- Recalculation when constants version changes (old calculation unchanged, new one created)
- Export of data sheet as CSV
- Handling insufficient data with missing fields list
- Installations and reporting periods management
"""

import os
import pytest
from cbam_service import CBAMService


@pytest.fixture(autouse=True)
def clean_db():
    if os.path.exists(CBAMService.DB_PATH):
        try:
            os.remove(CBAMService.DB_PATH)
        except Exception:
            pass
    CBAMService.init_db()
    yield
    if os.path.exists(CBAMService.DB_PATH):
        try:
            os.remove(CBAMService.DB_PATH)
        except Exception:
            pass


def test_b7_installations_and_periods():
    inst = CBAMService.create_installation(
        name="Howrah Precision Forgings Plant 1",
        country="India",
        unlocode="INCCU",
        lat=22.5958,
        lon=88.2636
    )
    assert inst["id"].startswith("inst_")
    assert inst["unlocode"] == "INCCU"

    period = CBAMService.create_period(
        installation_id=inst["id"],
        year=2026,
        quarter=1,
        grid_kwh=145000,
        solar_offset_kwh=35000,
        fuel_liters=12000,
        production_tonnes=450
    )
    assert period["id"].startswith("period_2026_Q1")
    assert period["production_tonnes"] == 450


def test_b7_calculation_stores_trace_and_versions():
    calc = CBAMService.run_calculation(
        invoice_number="EXP-2026-109",
        cn_code="73079100",
        net_shipment_tonnes=24.5,
        upstream_precursor_see=1.65,
        scrap_loss_ratio=1.08,
        monthly_grid_kwh=145000,
        monthly_solar_offset_kwh=35000,
        monthly_fuel_liters=12000,
        monthly_total_production_tonnes=450,
        constants_version="REG-2026-Q1-V1"
    )

    assert calc["status"] == "SUCCESS"
    assert calc["constants_version"] == "REG-2026-Q1-V1"
    assert calc["method_version"] == "EU-2023/956-ANNEX-III-V2"
    assert "calculation_id" in calc
    assert calc["outputs"]["total_verified_see"] > 0
    assert "calculation_trace" in calc["outputs"] or calc["trace"]

    # Verify retrieval from database
    retrieved = CBAMService.get_calculation(calc["calculation_id"])
    assert retrieved is not None
    assert retrieved["invoice_number"] == "EXP-2026-109"
    assert retrieved["outputs"]["total_verified_see"] == calc["outputs"]["total_verified_see"]


def test_b7_recalculation_creates_new_calc_and_preserves_old():
    # Calculation 1 with REG-2026-Q1-V1
    calc1 = CBAMService.run_calculation(
        invoice_number="EXP-2026-109",
        cn_code="73079100",
        net_shipment_tonnes=25.0,
        upstream_precursor_see=1.65,
        scrap_loss_ratio=1.08,
        monthly_grid_kwh=150000,
        monthly_solar_offset_kwh=30000,
        monthly_fuel_liters=10000,
        monthly_total_production_tonnes=500,
        constants_version="REG-2026-Q1-V1"
    )

    id1 = calc1["calculation_id"]
    val1 = calc1["outputs"]["total_verified_see"]

    # Recalculate under a new hypothetical constants version REG-2026-Q2-V2
    calc2 = CBAMService.recalculate(id1, new_constants_version="REG-2026-Q2-V2")
    id2 = calc2["calculation_id"]

    assert id1 != id2
    assert calc2["parent_calc_id"] == id1
    assert calc2["constants_version"] == "REG-2026-Q2-V2"

    # Verify original calculation 1 is unchanged
    original = CBAMService.get_calculation(id1)
    assert original["constants_version"] == "REG-2026-Q1-V1"
    assert original["outputs"]["total_verified_see"] == val1


def test_b7_insufficient_data_returns_missing_list():
    # Pass 0 for net_shipment_tonnes and empty cn_code
    calc = CBAMService.run_calculation(
        invoice_number="",
        cn_code="",
        net_shipment_tonnes=0,
        upstream_precursor_see=1.65,
        scrap_loss_ratio=1.08,
        monthly_grid_kwh=150000,
        monthly_solar_offset_kwh=30000,
        monthly_fuel_liters=10000,
        monthly_total_production_tonnes=0
    )

    assert calc["status"] == "INSUFFICIENT_DATA"
    assert calc["outputs"]["status"] == "insufficient_data"
    assert "invoice_number" in calc["outputs"]["missing_fields"]
    assert "cn_code" in calc["outputs"]["missing_fields"]
    assert "net_shipment_tonnes" in calc["outputs"]["missing_fields"]
    assert "monthly_total_production_tonnes" in calc["outputs"]["missing_fields"]


def test_b7_export_csv_contains_key_fields():
    calc = CBAMService.run_calculation(
        invoice_number="EXP-2026-109",
        cn_code="73079100",
        net_shipment_tonnes=24.5,
        upstream_precursor_see=1.65,
        scrap_loss_ratio=1.08,
        monthly_grid_kwh=145000,
        monthly_solar_offset_kwh=35000,
        monthly_fuel_liters=12000,
        monthly_total_production_tonnes=450,
        constants_version="REG-2026-Q1-V1"
    )

    csv_data = CBAMService.export_calculation_csv(calc["calculation_id"])
    assert "HEATLEDGER AI - CBAM CALCULATION DATA SHEET" in csv_data
    assert "EXP-2026-109" in csv_data
    assert "73079100" in csv_data
    assert "Total Verified Embedded SEE" in csv_data
    assert "REG-2026-Q1-V1" in csv_data
