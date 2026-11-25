"""
HEATLEDGER AI: Insights & Trends Tests (Prompt P12 + Prompt Pack v5 Task 5.1)
Verifies that AnalyticsService queries real DB tables and returns clean empty states
when an organization has no data (never returns hardcoded/synthetic arrays).
"""

import time
from analytics_service import AnalyticsService
from backend.db.connection import get_db_connection


def test_p12_empty_org_returns_clean_empty_state():
    fresh_org = f"org_analytics_empty_{int(time.time() * 1000)}"

    trend = AnalyticsService.get_emissions_trend(fresh_org, range_preset="90d")
    assert trend["organization_id"] == fresh_org
    assert trend["points"] == []
    assert trend["total_heats_analyzed"] == 0

    forecast = AnalyticsService.get_cbam_forecast(fresh_org)
    assert forecast["timeline"] == []
    assert forecast["total_projected_savings_eur"] == 0.0

    mills = AnalyticsService.get_mill_comparison(fresh_org)
    assert mills["mills"] == []
    assert mills["lowest_emission_mill"] is None

    summary = AnalyticsService.get_analytics_summary(fresh_org)
    assert summary["ledger_by_grade"] == []
    assert summary["shipments_by_status"] == {}
    assert summary["total_customs_dossiers_sealed"] == 0


def test_p12_reads_real_seeded_records_scoped_to_org():
    ts = int(time.time() * 1000)
    org_id = f"org_analytics_real_{ts}"
    doc_id = f"doc_{ts}"
    cert_id = f"mc_{ts}"
    heat_id = f"ht_{ts}"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO standards (id, standard_code, title, description, cn_codes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            ("S275JR", "EN 10025-2 S275JR", "Structural Steel S275JR", "Hot rolled structural steel", "7208", "2026-11-25T10:00:00Z"),
        )
        conn.execute(
            "INSERT INTO organizations (id, name, is_sandbox, created_at) VALUES (?, ?, 0, ?)",
            (org_id, f"Test Mill {ts}", "2026-11-25T10:00:00Z"),
        )
        conn.execute(
            """
            INSERT INTO documents (
                id, organization_id, file_name, file_size_bytes, mime_type, sha256, storage_path, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, org_id, "test.pdf", 1024, "application/pdf", f"sha_{ts}", f"{org_id}/test.pdf", "2026-11-25T10:00:00Z"),
        )
        conn.execute(
            """
            INSERT INTO mill_certificates (
                id, organization_id, document_id, supplier_id, certificate_number,
                issue_date, standard_id, melt_and_pour_country, melting_route,
                has_explicit_melt_attestation, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (cert_id, org_id, doc_id, None, f"CERT-{ts}", "2026-11-25", "S275JR", "IN", "BF-BOF", 1, "2026-11-25T10:00:00Z"),
        )
        conn.execute(
            """
            INSERT INTO heat_numbers (
                id, organization_id, mill_certificate_id, heat_number,
                initial_weight_grams, available_weight_grams, allocated_weight_grams,
                cev_value, cev_pass, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (heat_id, org_id, cert_id, f"HEAT-{ts}", 20_000_000, 12_000_000, 8_000_000, 0.38, 1, "2026-11-25T10:00:00Z"),
        )
        conn.commit()

    trend = AnalyticsService.get_emissions_trend(org_id, grade_filter="S275JR")
    assert len(trend["points"]) == 1
    assert trend["points"][0]["steel_grade"] == "S275JR"
    assert trend["points"][0]["total_tonnes"] == 20.0
    assert trend["total_heats_analyzed"] == 1

    summary = AnalyticsService.get_analytics_summary(org_id)
    assert len(summary["ledger_by_grade"]) == 1
    assert summary["ledger_by_grade"][0]["grade"] == "S275JR"
    assert summary["ledger_by_grade"][0]["available_tonnes"] == 12.0
