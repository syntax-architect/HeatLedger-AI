"""
HEATLEDGER AI: Sales Tools (ROI & Proposals) and Lead Tracker Test Suite (Prompt D2 & D4)
Specification: Prompt Pack v4 - Phase D (Tasks D2 & D4)
Verifies:
  1. Hand calculation equivalence for ROI calculator (hours saved, risk, payback).
  2. Public 'Email me this' pipeline into LeadTracker.
  3. 1-page commercial proposal PDF generation with GSTIN, terms, and payment link.
  4. Lead Tracker CRM states, daily prioritized actions, and funnel progression metrics.
  5. Ingestion of 20 leads from CSV (EEPC / Udyog Aadhaar export simulation).
  6. Small-batch email outreach with merge fields and statutory opt-out suppression.
  7. Full FastAPI endpoints coverage.
"""

import io
import os
import pytest
from fastapi.testclient import TestClient

try:
    from sales_tools_service import SalesToolsService, COMPANY_GSTIN, COMPANY_SAC_CODE
    from lead_tracker_service import LeadTrackerService
    from main import app
except ImportError:
    from backend.sales_tools_service import SalesToolsService, COMPANY_GSTIN, COMPANY_SAC_CODE
    from backend.lead_tracker_service import LeadTrackerService
    from backend.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_lead_store(tmp_path):
    """Ensures each test operates on an isolated leads database."""
    test_db_path = str(tmp_path / "test_leads.json")
    LeadTrackerService.set_storage_path(test_db_path)
    yield
    # Restore standard path
    default_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "leads.json")
    LeadTrackerService.set_storage_path(default_path)


def test_d2_01_hand_calculation_roi_calculator_equivalence():
    """
    PROMPT D2 'PROVE IT':
    'Fill the calculator with sample numbers and check the math in a spreadsheet.'
    
    Hand Calculation Verification:
      Inputs:
        shipments_per_month = 20
        hours_per_shipment_today = 4.0
        hours_per_shipment_with_app = 0.5
        hours_saved_per_shipment = 4.0 - 0.5 = 3.5 hrs
        total_hours_saved_monthly = 20 * 3.5 = 70.0 hrs
        
        staff_monthly_cost = ₹32,000 / month
        hourly_rate = 32000 / 160 = ₹200.0 / hr
        labor_cost_saved_monthly = 70.0 * 200 = ₹14,000.00
        
        delayed_shipments = max(1, round(20 * 0.20)) = 4 shipments
        delay_days = 3.0 days, demurrage = ₹10,000 / day
        monthly_demurrage_risk = 4 * 3.0 * 10,000 = ₹120,000.00
        
        avg_shipment_val = ₹2,000,000
        out_of_quota_share = 10% (0.10)
        tariff_penalty = 25% (0.25)
        monthly_quota_exposure = 20 * 0.10 * 2,000,000 * 0.25 = ₹1,000,000.00
        
        total_monthly_money_at_risk = 120,000 + 1,000,000 = ₹1,120,000.00
        total_monthly_benefit = 14,000 + (120,000 * 0.5) = ₹74,000.00
        
        Plant plan price in plans.json = ₹9,999 / month
        payback_months = 9,999 / 74,000 ≈ 0.14 months (~4 days)
    """
    res = SalesToolsService.calculate_roi(
        shipments_per_month=20,
        avg_shipment_value_inr=2000000.0,
        document_staff_count=2,
        hours_per_shipment_today=4.0,
        hours_per_shipment_with_app=0.5,
        out_of_quota_share_pct=10.0,
        current_delay_days=3.0,
        staff_monthly_cost_inr=32000.0,
        daily_demurrage_inr=10000.0,
        out_of_quota_tariff_penalty_pct=25.0,
    )

    outputs = res["outputs"]
    assert outputs["hours_saved_per_month"] == 70.0
    assert outputs["labor_cost_saved_monthly_inr"] == 14000.0
    assert outputs["monthly_demurrage_risk_inr"] == 120000.0
    assert outputs["monthly_quota_penalty_exposure_inr"] == 1000000.0
    assert outputs["total_money_at_risk_inr"] == 1120000.0
    assert outputs["total_monthly_benefit_inr"] == 74000.0
    assert outputs["plan_monthly_price_inr"] == 9999.0
    assert outputs["payback_period_months"] == 0.14
    assert outputs["payback_period_days"] == 4
    assert outputs["label"] == "estimate"
    assert "estimate" in outputs["summary_statement"].lower()


def test_d2_02_email_me_this_initiates_lead():
    """Verifies that submitting ROI results initiates a lead record in LeadTrackerService."""
    email = "qa.director@tatasteel.example.com"
    roi_calc = SalesToolsService.calculate_roi(shipments_per_month=12)

    lead = LeadTrackerService.create_or_update_lead({
        "company": "Tata Steel Long Products",
        "contact": "Karan Singhal",
        "email": email,
        "source": "ROI_CALCULATOR",
        "state": "contacted",
        "notes": roi_calc["outputs"]["summary_statement"],
    })

    assert lead["email"] == email
    assert lead["source"] == "ROI_CALCULATOR"
    assert lead["state"] == "contacted"

    # Confirm retrieval
    fetched = LeadTrackerService.get_lead(lead["id"])
    assert fetched is not None
    assert fetched["company"] == "Tata Steel Long Products"


def test_d2_03_proposal_pdf_generation():
    """Verifies generation of 1-page commercial proposal PDF with statutory terms and GSTIN."""
    import fitz

    pdf_bytes = SalesToolsService.generate_proposal_pdf(
        lead_name="Sunil Mehta",
        company_name="Mehta Forgings & Valves Ltd",
        contact_email="s.mehta@mehtaforgings.example.com",
        plan_id="PILOT",
        signatory_name="Agnish Ghosh",
    )
    assert len(pdf_bytes) > 2000

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count == 1
    page_text = doc[0].get_text()

    # Statutory and commercial checks
    assert COMPANY_GSTIN in page_text
    assert COMPANY_SAC_CODE in page_text
    assert "Mehta Forgings & Valves Ltd" in page_text
    assert "PILOT" in page_text.upper()
    assert "₹25,000" in page_text or "25,000.00" in page_text
    assert "1. Pilot Scope" in page_text
    assert "3. Enterprise Data Safety" in page_text
    assert "4. Statutory Disclaimers" in page_text
    doc.close()


def test_d4_01_lead_tracker_crud_and_daily_actions():
    """Tests lead creation, state transitions, and daily prioritized 10 actions."""
    lead_1 = LeadTrackerService.create_or_update_lead({
        "company": "Kalyani Steels Pune",
        "contact": "Amitabh Joshi",
        "email": "a.joshi@kalyani.example.com",
        "role": "General Manager Exports",
        "state": "found",
    })
    lead_2 = LeadTrackerService.create_or_update_lead({
        "company": "Electrosteel Castings",
        "contact": "Ramesh Agarwal",
        "email": "r.agarwal@electrosteel.example.com",
        "role": "Quality Assurance Head",
        "state": "call_booked",
    })

    # List
    all_leads = LeadTrackerService.list_leads()
    assert len(all_leads) == 2

    # Filter
    booked = LeadTrackerService.list_leads(state="call_booked")
    assert len(booked) == 1
    assert booked[0]["company"] == "Electrosteel Castings"

    # Daily Actions Checklist
    daily = LeadTrackerService.get_daily_actions(limit=10)
    assert len(daily) == 2
    # Call booked should have higher priority than found
    assert daily[0]["state"] == "call_booked"


def test_d4_02_csv_import_20_leads():
    """
    PROMPT D4 'PROVE IT':
    'Import 20 fake leads, send to yourself, view the funnel.'
    Simulates importing a 20-row CSV of Indian exporters.
    """
    csv_rows = ["Company,Contact Person,Email,Phone,Designation"]
    for i in range(1, 21):
        csv_rows.append(f"Exporter Plant {i:02d},Contact {i},lead_{i:02d}@plant{i}.example.com,+9198300{i:05d},Export Head")

    csv_text = "\n".join(csv_rows)
    import_res = LeadTrackerService.import_leads_from_csv(csv_text, default_source="EEPC_DIRECTORY_2026")

    assert import_res["status"] == "success"
    assert import_res["imported"] == 20
    assert len(import_res["errors"]) == 0

    leads = LeadTrackerService.list_leads()
    assert len(leads) == 20
    assert leads[0]["source"] == "EEPC_DIRECTORY_2026"


def test_d4_03_batch_email_outreach_and_opt_out_suppression():
    """
    Tests small-batch email outreach with merge fields and statutory opt-out suppression.
    """
    # Create 3 test leads
    l1 = LeadTrackerService.create_or_update_lead({
        "company": "Eastern Tubes Ltd",
        "contact": "Debashis Roy",
        "email": "d.roy@easterntubes.example.com",
        "role": "VP Commercial",
        "state": "found",
    })
    l2 = LeadTrackerService.create_or_update_lead({
        "company": "Bengal Forgings Corp",
        "contact": "Sanjay Banerjee",
        "email": "s.banerjee@bengalforgings.example.com",
        "role": "Export Director",
        "state": "found",
    })

    # Dry-run batch send
    res = LeadTrackerService.send_batch_email(
        lead_ids=[l1["id"], l2["id"]],
        template_name="initial_outreach",
        dry_run=True,
    )
    assert res["status"] == "success"
    assert res["sent_count"] == 2
    assert "Eastern Tubes Ltd" in res["sent"][0]["subject"]

    # Opt-out Lead 1
    LeadTrackerService.opt_out_lead("d.roy@easterntubes.example.com")

    # Second batch send - Lead 1 must be skipped
    res2 = LeadTrackerService.send_batch_email(
        lead_ids=[l1["id"], l2["id"]],
        template_name="initial_outreach",
        dry_run=False,
    )
    assert res2["sent_count"] == 1
    assert res2["skipped_count"] == 1
    assert res2["skipped"][0]["reason"] == "Opted out"


def test_d4_04_funnel_progression_metrics():
    """Verifies funnel counts and conversion rates across pipeline states."""
    # Seed leads in different states
    states_to_seed = ["found", "contacted", "contacted", "replied", "call_booked", "pilot", "paid"]
    for idx, st in enumerate(states_to_seed):
        LeadTrackerService.create_or_update_lead({
            "company": f"Steel Mill {idx}",
            "contact": f"Contact {idx}",
            "email": f"steel_{idx}@mills.example.com",
            "state": st,
        })

    funnel = LeadTrackerService.get_funnel_metrics()
    assert funnel["total_leads"] == 7
    assert funnel["state_counts"]["paid"] == 1
    assert funnel["state_counts"]["pilot"] == 1
    assert funnel["state_counts"]["call_booked"] == 1
    assert funnel["state_counts"]["contacted"] == 2
    assert funnel["active_pipeline"] == 5


def test_d2_d4_05_api_endpoints():
    """Verifies all FastAPI routes for Sales Tools and Lead Tracker."""
    # 1. POST /api/sales/roi-calculate
    res_roi = client.post("/api/sales/roi-calculate", json={"shipments_per_month": 10})
    assert res_roi.status_code == 200
    assert "hours_saved_per_month" in res_roi.json()["outputs"]

    # 2. POST /api/sales/roi-email
    res_email = client.post("/api/sales/roi-email", json={
        "email": "inquiry@apexsteels.example.com",
        "company_name": "Apex Steels",
        "contact_name": "Rajiv Nambiar"
    })
    assert res_email.status_code == 200
    assert "lead_id" in res_email.json()

    # 3. POST /api/sales/proposal-generate
    res_prop = client.post("/api/sales/proposal-generate", json={
        "lead_name": "Rajiv Nambiar",
        "company_name": "Apex Steels",
        "contact_email": "inquiry@apexsteels.example.com",
        "plan_id": "PILOT"
    })
    assert res_prop.status_code == 200
    assert "application/pdf" in res_prop.headers["content-type"]

    # 4. GET /api/leads/funnel
    res_fn = client.get("/api/leads/funnel")
    assert res_fn.status_code == 200
    assert "state_counts" in res_fn.json()

    # 5. GET /api/leads/daily-actions
    res_da = client.get("/api/leads/daily-actions")
    assert res_da.status_code == 200
    assert isinstance(res_da.json(), list)

    # 6. POST /api/leads/opt-out
    res_opt = client.post("/api/leads/opt-out", json={"email": "inquiry@apexsteels.example.com"})
    assert res_opt.status_code == 200
    assert res_opt.json()["suppressed"] is True
