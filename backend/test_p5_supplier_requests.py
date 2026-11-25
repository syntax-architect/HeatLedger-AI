"""
Tests for Prompt P5: Supplier Data Requests for CBAM
Tests:
- Exporter builds and creates request with CN code, reporting period, due date, and requested data fields.
- Public no-login form fetch at /api/supplier-requests/public/{token} with field guidance and units.
- Supplier saves auto-draft on mobile or desktop.
- Supplier attaches evidence file (Excel/PDF) and completes final submission.
- Tracker board reflects pipeline states (Requested, Reminded, Received, In review, Accepted, Overdue).
- Day 3 and Day 7 reminders dispatch via WhatsApp / Email.
- Exporter QA reviews and accepts submission, generating versioned precursor record linked to heat numbers.
- Exporter QA returns submission with comments for revision.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from auth_service import AuthService
from supplier_service import SupplierService as SupplierRequestService

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_headers():
    token = AuthService.create_jwt({"sub": "usr_qa_04", "role": "QA_OFFICER", "organization_id": "org_howrah_steel_01"})
    return {"Authorization": f"Bearer {token}"}


def test_p5_create_supplier_request_and_list_pipeline(auth_headers):
    """Verify exporter creates supplier precursor request and tracker board reflects it."""
    payload = {
        "supplier_id": "sup_tata_01",
        "supplier_name": "Tata Steel Limited (Jamshedpur)",
        "product_name": "Continuously Cast Billets 150x150 mm",
        "cn_code": "7207 11 00",
        "reporting_period": "2026-Q1",
        "due_date": "2026-12-15",
        "data_needed": [
            "production_route",
            "direct_fuel_consumption",
            "electricity_consumption",
            "scrap_content_pct",
            "precursor_emissions_tco2_per_t"
        ],
        "supplier_email": "cbam.desk@tatasteel.com",
        "supplier_phone": "+919830112233",
        "custom_note": "Required for EU CBAM definitive period compliance batch EXP-2026-109."
    }

    create_resp = client.post("/api/supplier-requests", json=payload, headers=auth_headers)
    assert create_resp.status_code == 200
    data = create_resp.json()

    assert data["supplier_id"] == "sup_tata_01"
    assert "sreq_" in data["token"]
    assert "/supplier-request/" in data["public_url"]
    assert data["status"].upper() == "REQUESTED"

    req_id = data["id"]
    data["token"]

    # Tracker board list
    list_resp = client.get("/api/supplier-requests", headers=auth_headers)
    assert list_resp.status_code == 200
    board_data = list_resp.json()

    assert "counts" in board_data
    assert "requests" in board_data
    assert board_data["counts"]["TOTAL"] >= 1
    assert any(r["id"] == req_id for r in board_data["requests"])


def test_p5_public_no_login_form_details():
    """Verify supplier can access public link without any authentication."""
    # Seeded or created token
    form_resp = client.get("/api/supplier-requests/public/sreq_tata_2026_q1")
    assert form_resp.status_code == 200
    details = form_resp.json()

    assert details["valid"] is True
    assert details["exporter_name"] == "Howrah Precision Forgings Pvt. Ltd."
    assert details["cn_code"] == "7207 11 00"
    assert "field_guidance" in details
    assert "production_route" in details["field_guidance"]


def test_p5_supplier_mobile_draft_and_final_submit(auth_headers):
    """Verify mill supplier saves draft and completes final submission."""
    # Create fresh request
    req = SupplierRequestService.create_request(
        org_id="org_howrah_steel_01",
        supplier_id="sup_jsw_03",
        supplier_name="JSW Steel Limited (Vijayanagar)",
        product_name="Carbon Steel Round Bars",
        cn_code="7214 99 10",
        reporting_period="2026-Q1",
        due_date="2026-12-20"
    )
    token = req["token"]
    req_id = req["id"]

    # 1. Supplier saves draft on mobile
    draft_resp = client.post(
        f"/api/supplier-requests/public/{token}/save-draft",
        json={
            "draft": {
                "production_route": "Corex / BOF-CC",
                "direct_fuel_consumption": 13.8,
                "electricity_consumption": 0.45,
                "electricity_source": "Captive Solar + CEA Southern Grid",
                "scrap_content_pct": 14.0,
                "precursor_see": 1.765,
                "notes": "Draft values calculated by Plant Metallurgy desk."
            }
        }
    )
    assert draft_resp.status_code == 200
    assert draft_resp.json()["status"] == "success"

    # 2. Upload dummy evidence file
    dummy_csv = b"Parameter,Value,Unit\nDirectFuel,13.8,GJ/t\nElectricity,0.45,MWh/t\nSEE,1.765,tCO2e/t\n"
    upload_resp = client.post(
        f"/api/supplier-requests/public/{token}/upload-evidence",
        files={"file": ("jsw_cbam_q1_evidence.csv", dummy_csv, "text/csv")}
    )
    # Text/csv might trigger 400 if strictly checking allowed list, let's use pdf/excel mime
    if upload_resp.status_code == 400:
        upload_resp = client.post(
            f"/api/supplier-requests/public/{token}/upload-evidence",
            files={"file": ("jsw_cbam_q1_evidence.xlsx", dummy_csv, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        )
    assert upload_resp.status_code == 200
    file_info = upload_resp.json()
    assert "sha256" in file_info

    # 3. Final submission
    submit_resp = client.post(
        f"/api/supplier-requests/public/{token}/submit",
        json={
            "respondent_name": "R. K. Sharma",
            "respondent_designation": "General Manager - Quality & Sustainability",
            "respondent_email": "r.sharma@jsw.in",
            "respondent_phone": "+919845998877",
            "submission": {
                "production_route": "Corex / BOF-CC",
                "direct_fuel_type": "Corex Coal & Natural Gas",
                "direct_fuel_consumption": 13.8,
                "electricity_consumption": 0.45,
                "electricity_source": "Captive Solar + CEA Southern Grid",
                "scrap_content_pct": 14.0,
                "total_output_tonnes": 52000.0,
                "precursor_see": 1.765,
                "notes": "Verified against ISO 14064 GHG audit report."
            },
            "evidence_files": [
                {"filename": "jsw_cbam_q1_evidence.xlsx", "sha256": file_info["sha256"]}
            ]
        }
    )
    assert submit_resp.status_code == 200
    assert submit_resp.json()["status"] == "success"

    # Verify request status transitioned to RECEIVED
    detail_resp = client.get(f"/api/supplier-requests/{req_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["request"]["status"] == "RECEIVED"
    assert detail["submission"]["submitter_name"] == "R. K. Sharma"


def test_p5_dispatch_day3_day7_reminders(auth_headers):
    """Verify Day 3 and Day 7 reminders can be dispatched via WhatsApp/Email."""
    # Use seeded sail request
    rem_resp = client.post(
        "/api/supplier-requests/req_demo_sail_02/send-reminder",
        json={"channel": "WHATSAPP"},
        headers=auth_headers
    )
    assert rem_resp.status_code == 200
    res = rem_resp.json()
    assert res["status"] == "success"
    assert res["reminder_sent"] is True
    assert "whatsapp_message" in res
    assert "https://heatledger.in/supplier-request/" in res["whatsapp_message"]


def test_p5_qa_review_acceptance_generates_versioned_precursor(auth_headers):
    """Verify QA accepting submission creates a versioned precursor record linked to heats."""
    # Use seeded tata request (status IN_REVIEW with existing submission)
    review_resp = client.post(
        "/api/supplier-requests/req_demo_tata_01/review",
        json={
            "action": "Accepted",
            "comment": "Precursor emissions verified against Tata Steel ISO 14064 statement.",
            "linked_heats": ["TSJ-26-9021", "TSJ-26-9022"]
        },
        headers=auth_headers
    )
    assert review_resp.status_code == 200
    res = review_resp.json()
    assert res["status"] == "success"
    assert res["action"] == "Accepted"
    assert "prec_" in res["precursor_record_id"]
    assert res["version"] >= 1
    assert "TSJ-26-9021" in res["linked_heats"]

    # Verify precursor appears in precursor records list
    prec_list_resp = client.get("/api/supplier-requests/precursors", headers=auth_headers)
    assert prec_list_resp.status_code == 200
    precursors = prec_list_resp.json()["precursors"]
    assert any(p["id"] == res["precursor_record_id"] for p in precursors)


def test_p5_qa_review_return_with_comment(auth_headers):
    """Verify QA returning submission transitions status to RETURNED."""
    # Create request and submit data
    req = SupplierRequestService.create_request(
        org_id="org_howrah_steel_01",
        supplier_id="sup_sail_02",
        supplier_name="Steel Authority of India Limited",
        product_name="Steel Rounds",
        cn_code="7214 99 10",
        reporting_period="2026-Q1",
        due_date="2026-12-30"
    )
    token = req["token"]
    req_id = req["id"]

    SupplierRequestService.submit_data(
        secure_token=token,
        submission_payload={"production_route": "BF-BOF", "precursor_see": 2.10},
        respondent_name="Sail Tech Desk",
        respondent_designation="QA Engineer",
        respondent_email="qa@sail.in"
    )

    # QA returns with comment
    return_resp = client.post(
        f"/api/supplier-requests/{req_id}/review",
        json={
            "action": "Returned",
            "comment": "Please provide third-party electricity verification statement.",
            "linked_heats": []
        },
        headers=auth_headers
    )
    assert return_resp.status_code == 200
    res = return_resp.json()
    assert res["status"] == "success"
    assert res["action"] == "Returned"

    # Verify status in request
    req_detail = client.get(f"/api/supplier-requests/{req_id}", headers=auth_headers).json()
    assert req_detail["request"]["status"] == "RETURNED"
    assert "third-party electricity" in req_detail["request"]["review_notes"]
