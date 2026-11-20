"""
HEATLEDGER AI: Prompt P12 - Insights & Trends Tests
Verifies emissions intensity trends, statutory CBAM default liability forecasts,
mill comparisons, and operational summaries.
"""

import pytest
from analytics_service import AnalyticsService

def test_p12_emissions_trend():
    res = AnalyticsService.get_emissions_trend("org_test_01", range_preset="90d")
    assert "points" in res
    assert len(res["points"]) > 0
    assert res["weighted_avg_actual_see"] > 0
    assert res["weighted_avg_default_see"] > res["weighted_avg_actual_see"]
    assert res["carbon_intensity_delta_pct"] > 0
    assert res["total_heats_analyzed"] > 0

    # Test filtering by grade
    filtered = AnalyticsService.get_emissions_trend("org_test_01", grade_filter="S275JR")
    assert all("S275JR" in p["steel_grade"] for p in filtered["points"])

def test_p12_cbam_forecast_markup_schedule():
    res = AnalyticsService.get_cbam_forecast("org_test_01")
    assert "timeline" in res
    assert len(res["timeline"]) >= 4
    assert res["total_projected_savings_inr"] > 0
    assert res["total_projected_savings_eur"] > 0
    assert res["certificate_price_eur"] == 75.36

    # Verify statutory schedule percentages
    markups = [t["markup_pct"] for t in res["timeline"]]
    assert 10 in markups  # 2026
    assert 20 in markups  # 2027
    assert 30 in markups  # 2028

def test_p12_mill_comparison():
    res = AnalyticsService.get_mill_comparison("org_test_01")
    assert len(res["mills"]) >= 3
    mills = [m["mill_name"] for m in res["mills"]]
    assert any("Tata Steel" in m for m in mills)
    assert any("JSW" in m for m in mills)
    assert res["lowest_emission_mill"] is not None

def test_p12_analytics_summary():
    res = AnalyticsService.get_analytics_summary("org_test_01")
    assert "ledger_by_grade" in res
    assert len(res["ledger_by_grade"]) > 0
    assert "weekly_mtcs" in res
    assert "shipments_by_status" in res
    assert res["avg_qa_review_turnaround_mins"] > 0
    assert res["cumulative_co2e_abated_t"] > 0
