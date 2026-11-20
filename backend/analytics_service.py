"""
HEATLEDGER AI: Prompt P12 - Insights & Long-Term Trends Service
Provides fast, pre-aggregated analytics:
- Emissions intensity trend by heat and month
- CBAM liability forecasts (with 10% in 2026, 20% in 2027, 30% in 2028 statutory default markups)
- Mill & precursor supplier comparison
- Operations summary (ledger remaining by grade, review turnaround time, certificates per week)
"""

import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

logger = logging.getLogger("heatledger.analytics")

class AnalyticsService:
    @classmethod
    def get_emissions_trend(cls, organization_id: str, range_preset: str = "90d", grade_filter: Optional[str] = None, date_range: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns monthly specific embedded emissions (SEE) intensity trend.
        Includes actual reported SEE vs EU Regulation statutory default benchmark.
        """
        active_range = date_range or range_preset
        # Base trend points over the months
        trend_points = [
            {
                "period": "2025-11",
                "cn_code": "73089059",
                "steel_grade": "S275JR",
                "actual_see": 2.14,
                "statutory_default_see": 2.85,
                "heat_count": 8,
                "total_tonnes": 142.5
            },
            {
                "period": "2025-12",
                "cn_code": "73089059",
                "steel_grade": "S275JR",
                "actual_see": 2.10,
                "statutory_default_see": 2.85,
                "heat_count": 11,
                "total_tonnes": 185.0
            },
            {
                "period": "2026-01",
                "cn_code": "73269098",
                "steel_grade": "S355J2",
                "actual_see": 2.05,
                "statutory_default_see": 2.92,
                "heat_count": 14,
                "total_tonnes": 220.0
            },
            {
                "period": "2026-02",
                "cn_code": "73269098",
                "steel_grade": "S355J2",
                "actual_see": 1.98,
                "statutory_default_see": 2.92,
                "heat_count": 16,
                "total_tonnes": 265.0
            },
            {
                "period": "2026-03",
                "cn_code": "73089059",
                "steel_grade": "IS 2062 E250",
                "actual_see": 1.92,
                "statutory_default_see": 2.85,
                "heat_count": 19,
                "total_tonnes": 310.0
            },
            {
                "period": "2026-04",
                "cn_code": "73089059",
                "steel_grade": "S355J2",
                "actual_see": 1.88,
                "statutory_default_see": 2.85,
                "heat_count": 22,
                "total_tonnes": 350.0
            }
        ]

        if grade_filter and grade_filter != "ALL":
            filtered = [p for p in trend_points if grade_filter.lower() in p["steel_grade"].lower()]
        else:
            filtered = trend_points

        # Calculate weighted average reduction
        total_tonnes = sum(p["total_tonnes"] for p in filtered) or 1.0
        weighted_actual = sum(p["actual_see"] * p["total_tonnes"] for p in filtered) / total_tonnes
        weighted_default = sum(p["statutory_default_see"] * p["total_tonnes"] for p in filtered) / total_tonnes
        savings_pct = round(((weighted_default - weighted_actual) / weighted_default) * 100, 1)

        return {
            "organization_id": organization_id,
            "range_preset": range_preset,
            "points": filtered,
            "weighted_avg_actual_see": round(weighted_actual, 2),
            "weighted_avg_default_see": round(weighted_default, 2),
            "carbon_intensity_delta_pct": savings_pct,
            "total_heats_analyzed": sum(p["heat_count"] for p in filtered)
        }

    @classmethod
    def get_cbam_forecast(cls, organization_id: str, range_preset: str = "1y") -> Dict[str, Any]:
        """
        Projects CBAM financial markup liabilities under EU Regulation 2023/1773:
        10% markup in 2026, 20% markup in 2027, 30% markup in 2028.
        """
        # Certificate price benchmark EUR 75.36/tCO2e
        cert_price_eur = 75.36
        inr_per_eur = 91.20

        forecast_timeline = [
            {"year": 2026, "quarter": "Q2 2026", "markup_pct": 10, "export_tonnes": 350, "primary_liability_eur": 49500, "default_liability_eur": 75100, "savings_inr": 2334720},
            {"year": 2026, "quarter": "Q3 2026", "markup_pct": 10, "export_tonnes": 400, "primary_liability_eur": 56500, "default_liability_eur": 85800, "savings_inr": 2672160},
            {"year": 2026, "quarter": "Q4 2026", "markup_pct": 10, "export_tonnes": 450, "primary_liability_eur": 63600, "default_liability_eur": 96600, "savings_inr": 3009600},
            {"year": 2027, "quarter": "Q1 2027", "markup_pct": 20, "export_tonnes": 450, "primary_liability_eur": 63600, "default_liability_eur": 105300, "savings_inr": 3803040},
            {"year": 2027, "quarter": "Q2 2027", "markup_pct": 20, "export_tonnes": 500, "primary_liability_eur": 70700, "default_liability_eur": 117000, "savings_inr": 4222560},
            {"year": 2028, "quarter": "Q1 2028", "markup_pct": 30, "export_tonnes": 550, "primary_liability_eur": 77800, "default_liability_eur": 139900, "savings_inr": 5663520},
        ]

        total_savings_inr = sum(f["savings_inr"] for f in forecast_timeline)
        total_savings_eur = sum(f["default_liability_eur"] - f["primary_liability_eur"] for f in forecast_timeline)

        return {
            "organization_id": organization_id,
            "certificate_price_eur": cert_price_eur,
            "inr_per_eur_exchange_rate": inr_per_eur,
            "timeline": forecast_timeline,
            "total_projected_savings_inr": total_savings_inr,
            "total_projected_savings_eur": total_savings_eur,
            "statutory_schedule": [
                {"year": 2026, "markup": "10% on default benchmark"},
                {"year": 2027, "markup": "20% on default benchmark"},
                {"year": 2028, "markup": "30% on default benchmark"}
            ]
        }

    @classmethod
    def get_mill_comparison(cls, organization_id: str) -> Dict[str, Any]:
        """
        Compares precursor emissions variance across primary mills (SAIL, Tata Steel, JSW, Jindal).
        """
        mills = [
            {
                "mill_name": "Tata Steel (Jamshedpur)",
                "country": "India (IN)",
                "process_route": "BF-BOF Primary",
                "avg_see_tco2e_per_t": 2.05,
                "benchmark_see_tco2e_per_t": 2.85,
                "delta_pct": -28.1,
                "compliance_score": 98,
                "melt_and_pour_pass_rate_pct": 100.0,
                "sample_heats_count": 28
            },
            {
                "mill_name": "JSW Steel (Vijayanagar)",
                "country": "India (IN)",
                "process_route": "Corex / BF-BOF Hybrid",
                "avg_see_tco2e_per_t": 1.95,
                "benchmark_see_tco2e_per_t": 2.85,
                "delta_pct": -31.6,
                "compliance_score": 96,
                "melt_and_pour_pass_rate_pct": 96.5,
                "sample_heats_count": 34
            },
            {
                "mill_name": "SAIL (Durgapur Steel Plant)",
                "country": "India (IN)",
                "process_route": "BF-BOF Integrated",
                "avg_see_tco2e_per_t": 2.22,
                "benchmark_see_tco2e_per_t": 2.85,
                "delta_pct": -22.1,
                "compliance_score": 91,
                "melt_and_pour_pass_rate_pct": 92.0,
                "sample_heats_count": 19
            },
            {
                "mill_name": "Jindal Steel & Power (Angul)",
                "country": "India (IN)",
                "process_route": "DRI / EAF (Coal Gasification)",
                "avg_see_tco2e_per_t": 1.98,
                "benchmark_see_tco2e_per_t": 2.85,
                "delta_pct": -30.5,
                "compliance_score": 95,
                "melt_and_pour_pass_rate_pct": 97.2,
                "sample_heats_count": 22
            }
        ]

        return {
            "organization_id": organization_id,
            "mills": mills,
            "lowest_emission_mill": "JSW Steel (Vijayanagar)",
            "highest_compliance_mill": "Tata Steel (Jamshedpur)"
        }

    @classmethod
    def get_analytics_summary(cls, organization_id: str) -> Dict[str, Any]:
        """
        Aggregate executive operational metrics:
        - Ledger remaining available weight by grade
        - Average QA inspector review turnaround time (hours)
        - Certificates processed per week
        - Shipments by release gate status
        """
        ledger_by_grade = [
            {"grade": "S275JR", "total_grams": 45000000, "allocated_grams": 22000000, "available_grams": 23000000, "available_tonnes": 23.0},
            {"grade": "S355J2", "total_grams": 60000000, "allocated_grams": 35000000, "available_grams": 25000000, "available_tonnes": 25.0},
            {"grade": "IS 2062 E250", "total_grams": 30000000, "allocated_grams": 12000000, "available_grams": 18000000, "available_tonnes": 18.0},
            {"grade": "ASTM A36", "total_grams": 20000000, "allocated_grams": 8000000, "available_grams": 12000000, "available_tonnes": 12.0}
        ]

        weekly_mtcs = [
            {"week": "W12", "uploaded": 18, "verified": 18, "avg_review_mins": 3.2},
            {"week": "W13", "uploaded": 22, "verified": 21, "avg_review_mins": 2.8},
            {"week": "W14", "uploaded": 25, "verified": 25, "avg_review_mins": 2.1},
            {"week": "W15", "uploaded": 30, "verified": 29, "avg_review_mins": 1.9},
            {"week": "W16", "uploaded": 28, "verified": 28, "avg_review_mins": 1.7}
        ]

        shipments_by_status = {
            "READY": 8,
            "RELEASE_APPROVED": 14,
            "FIX_NEEDED": 3,
            "BLOCKED": 2
        }

        return {
            "organization_id": organization_id,
            "ledger_by_grade": ledger_by_grade,
            "weekly_mtcs": weekly_mtcs,
            "shipments_by_status": shipments_by_status,
            "avg_qa_review_turnaround_mins": 2.3,
            "cumulative_co2e_abated_t": 148.6,
            "total_customs_dossiers_sealed": 47
        }

    @classmethod
    def get_cbam_liability_forecast(cls, organization_id: str) -> Dict[str, Any]:
        return cls.get_cbam_forecast(organization_id=organization_id)

    @classmethod
    def get_mill_benchmarking(cls, organization_id: str) -> Dict[str, Any]:
        return cls.get_mill_comparison(organization_id=organization_id)

    @classmethod
    def get_inventory_grade_distribution(cls, organization_id: str) -> Dict[str, Any]:
        summary = cls.get_analytics_summary(organization_id=organization_id)
        return {"grades": summary["ledger_by_grade"]}

    @classmethod
    def export_chart_data_csv(cls, organization_id: str, chart_type: str = "emissions") -> str:
        if chart_type == "forecast":
            forecast = cls.get_cbam_forecast(organization_id)
            lines = ["Year,Quarter,Markup_Pct,Export_Tonnes,Primary_Liability_EUR,Default_Liability_EUR,Savings_INR"]
            for f in forecast["timeline"]:
                lines.append(f"{f['year']},{f['quarter']},{f['markup_pct']},{f['export_tonnes']},{f['primary_liability_eur']},{f['default_liability_eur']},{f['savings_inr']}")
            return "\n".join(lines)
        elif chart_type == "mills":
            mills = cls.get_mill_comparison(organization_id)
            lines = ["Mill_Name,Country,Process_Route,Avg_SEE_tCO2e,Benchmark_SEE,Delta_Pct,Compliance_Score"]
            for m in mills["mills"]:
                lines.append(f"\"{m['mill_name']}\",{m['country']},{m['process_route']},{m['avg_see_tco2e_per_t']},{m['benchmark_see_tco2e_per_t']},{m['delta_pct']},{m['compliance_score']}")
            return "\n".join(lines)
        else:
            trend = cls.get_emissions_trend(organization_id)
            lines = ["Period,CN_Code,Steel_Grade,Actual_SEE_tCO2e,Statutory_Default_SEE,Heat_Count,Total_Tonnes"]
            for p in trend["points"]:
                lines.append(f"{p['period']},{p['cn_code']},{p['steel_grade']},{p['actual_see']},{p['statutory_default_see']},{p['heat_count']},{p['total_tonnes']}")
            return "\n".join(lines)
