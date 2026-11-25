"""
HEATLEDGER AI: Prompt Pack v5 Task 3.2 & Task 5.1 Verification
1. Zero ruff S608 SQL injection warnings across the entire backend/.
2. New plants calling CBAMService.get_workspace_data() when DEMO_MODE=false start empty (no IN-WB-4409 / Howrah fallback).
3. CBAMService.generate_verifier_summary_pdf() uses real installation records rather than hardcoded Liluah/Howrah details.
4. CbamWorkspaceService.get_workspace_profile() & export_cbam_xml() do not leak hardcoded Howrah installation names.
5. SupplierRequestService enforces strict single-tenant queries without org_demo_howrah aliases.
"""

import uuid
import pymupdf as fitz

from backend.cbam_service import CBAMService
from backend.cbam_workspace_service import CbamWorkspaceService
from backend.supplier_request_service import SupplierRequestService
from backend.db.connection import get_db_connection


def test_v5_5_1_new_plant_cbam_workspace_starts_empty(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    CBAMService.init_db()
    fresh_org = f"org_fresh_cbam_{uuid.uuid4().hex[:8]}"

    ws = CBAMService.get_workspace_data(organization_id=fresh_org)
    assert ws["organization_id"] == fresh_org
    assert ws["is_installation_configured"] is False
    assert ws["installation"] is None
    assert ws["periods"] == []
    assert ws["energy_bills"] == []
    assert ws["precursors"] == []

    profile = CbamWorkspaceService.get_workspace_profile(organization_id=fresh_org)
    assert profile["installation"] == {}
    assert profile["bills"] == []


def test_v5_5_1_verifier_summary_pdf_and_xml_use_real_installation():
    org_id = f"org_real_cbam_{uuid.uuid4().hex[:6]}"
    inst = CBAMService.create_installation(
        name="Kalinga Forge & Alloy Works",
        country="India",
        unlocode="INBBI",
        lat=20.2961,
        lon=85.8245,
        organization_id=org_id,
    )

    ws = CBAMService.get_workspace_data(organization_id=org_id)
    assert ws["is_installation_configured"] is True
    assert ws["installation"]["name"] == "Kalinga Forge & Alloy Works"
    assert ws["installation"]["unlocode"] == "INBBI"

    pdf_bytes = CBAMService.generate_verifier_summary_pdf(
        invoice_number="EXP-KFA-2026-01",
        installation_id=inst["id"],
        operator_name="Kalinga Forge & Alloy Works",
    )
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    txt = doc[0].get_text()
    doc.close()
    assert "Kalinga Forge & Alloy Works" in txt
    assert "INBBI" in txt
    assert "Howrah Precision Forgings" not in txt
    assert "Liluah Works" not in txt

    xml = CbamWorkspaceService.export_cbam_xml(
        {"results": {}, "slider_inputs": {}, "cn_code": "7307 91 00", "jurisdiction": "EU"},
        installation={"plant_name": "Kalinga Forge & Alloy Works", "unlocode": "INBBI", "country": "IN"},
    )
    assert "<Name>Kalinga Forge & Alloy Works</Name>" in xml
    assert "Howrah Precision Forgings" not in xml


def test_v5_5_1_supplier_requests_strict_tenant_scoping_and_org_name():
    org_a = f"org_sup_a_{uuid.uuid4().hex[:6]}"
    org_b = f"org_sup_b_{uuid.uuid4().hex[:6]}"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO organizations (id, name, created_at) VALUES (?, ?, ?)",
            (org_a, "Deccan Special Steels Ltd", "2026-11-25T10:00:00Z"),
        )
        conn.commit()

    req = SupplierRequestService.create_request(
        org_id=org_a,
        supplier_id="sup_test_01",
        supplier_name="Billet Mill Pvt Ltd",
        product_name="Alloy Steel Bars",
        cn_code="7228 30 20",
        reporting_period="2026-Q1",
    )
    assert "Deccan Special Steels Ltd" in req["email_invitation"]["body"]
    assert "Howrah Precision Forgings" not in req["email_invitation"]["body"]

    details = SupplierRequestService.get_public_form_details(req["token"])
    assert details is not None
    assert details["exporter_name"] == "Deccan Special Steels Ltd"

    assert len(SupplierRequestService.list_requests(org_a)["requests"]) == 1
    assert SupplierRequestService.list_requests(org_b)["requests"] == []
    assert SupplierRequestService.get_request_by_id(req["id"], org_b) is None


def test_v5_5_1_portal_roi_and_value_screen_resolve_real_org_names():
    from backend.portal_service import PortalService
    from backend.roi_service import RoiService
    from backend.value_screen_service import ValueScreenService

    org_id = f"org_honest_p5_{uuid.uuid4().hex[:6]}"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO organizations (id, name, created_at) VALUES (?, ?, ?)",
            (org_id, "Vizag Coastal Alloys Pvt Ltd", "2026-11-25T10:00:00Z"),
        )
        conn.commit()

    link = PortalService.create_share_link("EXP-VIZAG-01", organization_id=org_id, passcode="1234")
    locked = PortalService.get_public_dossier(link["token"])
    assert locked["requires_passcode"] is True
    assert locked["exporter_name"] == "Vizag Coastal Alloys Pvt Ltd"
    assert "Howrah Precision Forgings" not in locked["exporter_name"]

    roi_m = RoiService.get_monthly_report(organization_id=org_id, month_period="2026-11")
    assert roi_m["plant_name"] == "Vizag Coastal Alloys Pvt Ltd"

    roi_y = RoiService.get_annual_view(organization_id=org_id, year=2026)
    assert roi_y["msme_subsidy_application_data"]["enterprise_name"] == "Vizag Coastal Alloys Pvt Ltd"

    pdf_bytes = ValueScreenService.generate_monthly_director_pdf(organization_id=org_id)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    txt = doc[0].get_text()
    doc.close()
    assert "Vizag Coastal Alloys Pvt Ltd" in txt
    assert "Howrah Precision" not in txt
