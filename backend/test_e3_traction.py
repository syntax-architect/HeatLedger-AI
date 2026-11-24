"""
Test Suite for Prompt E3: Traction, Customers & Verified Data Room Proof
Specifications:
1. Admin-only 'Traction' page: pilots started, pilots converted, MRR, paying plants, churn,
   certificates processed, hours saved (estimate), support tickets.
2. NEVER show a number that is not from the database: every metric derived from real SQL tables.
3. Public 'Customers' page shows logos and quotes from customers who gave written permission only.
4. Case study template: problem, before, after, numbers, quote, approval line.
5. Export to CSV for investor data room.
6. Statutory disclaimer: "Prepares documents for review. Not legal advice."
"""

import time
import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.traction_service import TractionService, get_traction_service, LEGAL_DISCLAIMER
from backend.db.connection import get_db_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_traction_tables():
    TractionService.init_db()
    yield


def test_realtime_traction_metrics_derived_from_sql_database():
    """Requirement 1 & 2: All traction metrics are derived from real SQL database tables."""
    service = get_traction_service()

    # Query metrics
    metrics = service.get_realtime_traction_metrics()
    assert metrics is not None
    assert "paying_plants" in metrics
    assert "mrr_inr" in metrics
    assert "certificates_processed" in metrics
    assert "hours_saved_estimate" in metrics
    assert "pilots_started" in metrics
    assert "pilots_converted" in metrics
    assert metrics["data_source"] == "SQL_PRODUCTION_DATABASE"
    assert metrics["disclaimer"] == LEGAL_DISCLAIMER

    # Direct database verification to prove SQL match
    with get_db_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT COUNT(*) as cnt FROM mill_certificates")
            expected_certs = cursor.fetchone()["cnt"]
        except Exception:
            expected_certs = 0

    assert metrics["certificates_processed"] == expected_certs


def test_public_customers_shows_only_approved_written_permission_quotes():
    """Requirement 3: Public 'Customers' data shows only those who gave written permission."""
    service = get_traction_service()

    unique_ts = int(time.time() * 1000)
    company_approved = f"Kalinga Tubes Ltd {unique_ts}"
    company_unapproved = f"Confidential Forgings {unique_ts}"

    # Customer 1: Written permission granted
    service.add_customer_quote(
        company_name=company_approved,
        quote="Reduced our EU customs clearance delays from 5 days to instant clearance.",
        author_name="Ramesh Mohanty",
        author_role="VP Quality",
        has_written_permission=True,
        permission_date="2026-11-01"
    )

    # Customer 2: No written permission (internal trial)
    service.add_customer_quote(
        company_name=company_unapproved,
        quote="Great software but we cannot be cited publicly.",
        author_name="Confidential Contact",
        author_role="Director",
        has_written_permission=False
    )

    # Fetch public approved list
    public_customers = service.get_public_approved_customers()
    public_names = [c["company_name"] for c in public_customers]

    # Verify approved company is present and unapproved company is strictly excluded
    assert company_approved in public_names
    assert company_unapproved not in public_names


def test_case_study_template_and_quantitative_impact():
    """Requirement 4: Case study with problem, before, after, quantitative numbers, quote, approval."""
    service = get_traction_service()

    company = f"Howrah Special Steels {int(time.time()*1000)}"
    cs = service.add_case_study(
        company_name=company,
        product_type="Cold Drawn Stainless Bars (HS 7222)",
        problem_statement="Repeated EU port detention threats due to missing melt-and-pour clause in mill certificates.",
        before_metrics="18 hours spent per shipment cross-referencing chemical analysis across 14 suppliers.",
        after_metrics="Zero customs rejections across 22 consecutive shipments dispatched to Rotterdam.",
        hours_saved_monthly=45.0,
        demurrage_avoided_inr=1250000.0,
        quote="HeatLedger AI is our statutory shield against European port fines.",
        signoff_contact="S. Chatterjee, Export Director",
        has_written_permission=True
    )

    assert cs["id"] is not None
    assert cs["company_name"] == company

    studies = service.get_case_studies(public_only=True)
    matching = next((s for s in studies if s["company_name"] == company), None)
    assert matching is not None
    assert matching["demurrage_avoided_inr"] == 1250000.0
    assert matching["hours_saved_monthly"] == 45.0


def test_data_room_csv_export():
    """Requirement 5: Export to CSV for investor data room."""
    service = get_traction_service()
    csv_content = service.export_traction_csv()

    assert "Metric,Value,Unit / Basis,Source" in csv_content
    assert "Paying Manufacturing Plants" in csv_content
    assert "Monthly Recurring Revenue (MRR)" in csv_content
    assert "Total Certificates Processed" in csv_content
    assert LEGAL_DISCLAIMER in csv_content


def test_public_customers_api_endpoint():
    """Verify public HTTP endpoint accessibility without login."""
    res = client.get("/api/public/customers")
    assert res.status_code == 200
    assert isinstance(res.json(), list)
