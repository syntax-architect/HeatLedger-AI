"""
Test Suite for Prompt Pack v5 Phase 5 (Tasks 5.1 & 5.2) + Task 3.7 CSP Hardening:
1. Founding offer returns honest DB count (0 claimed -> 5 of 5 left on clean DB, never claimed = 3).
2. Unsetting SUPPLIER_GSTIN / legal identity env vars blocks invoice generation.
3. Unpaid invoices start as PENDING with no fabricated pay_test_ ID.
4. AdminService.list_jobs never seeds fake jobs (org_howrah_01 / org_ludhiana_02).
5. AuditService.export_pdf_certificate resolves organization name from DB (not hardcoded Howrah).
6. vercel.json CSP contains no 'unsafe-inline' in script-src and no localhost in connect-src;
   index.html contains zero executable inline <script> blocks.
7. docs/INCIDENT.md contains zero fabricated executive names or fake +91-98300 phone numbers.
"""

import json
import os
import re
import uuid
import pytest
import pymupdf as fitz

from backend.admin_service import AdminService
from backend.audit_service import AuditService
from backend.billing_service import BillingService
from backend.db.connection import get_db_connection

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))


def test_v5_5_1_founding_offer_no_fake_claimed_3():
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("DELETE FROM subscriptions WHERE plan_id = 'FOUNDING_OFFER'")
        conn.commit()
    status = BillingService.get_founding_offer_status()
    assert status["claimed_slots"] == 0
    assert status["remaining_slots"] == 5
    assert status["display_text"] == "5 of 5 left"


def test_v5_5_2_missing_supplier_gstin_blocks_invoice_generation(monkeypatch):
    monkeypatch.delenv("SUPPLIER_GSTIN", raising=False)
    monkeypatch.delenv("HEATLEDGER_GSTIN", raising=False)
    monkeypatch.setenv("SUPPLIER_LEGAL_NAME", "Real Entity LLP")
    monkeypatch.setenv("SUPPLIER_ADDRESS", "Kolkata")
    monkeypatch.setenv("SUPPLIER_PAN", "ABCDE1234F")
    monkeypatch.setenv("SUPPORT_EMAIL", "ops@realentity.example")

    with pytest.raises(ValueError, match="SUPPLIER_GSTIN"):
        BillingService.generate_gst_tax_invoice(
            organization_id=f"org_block_{uuid.uuid4().hex[:6]}",
            plan_id="PLANT",
        )


def test_v5_5_1_invoice_without_razorpay_id_is_pending_not_pay_test(monkeypatch):
    monkeypatch.setenv("SUPPLIER_LEGAL_NAME", "Real Entity LLP")
    monkeypatch.setenv("SUPPLIER_ADDRESS", "Kolkata")
    monkeypatch.setenv("SUPPLIER_GSTIN", "19ABCDE1234F1Z5")
    monkeypatch.setenv("SUPPLIER_PAN", "ABCDE1234F")
    monkeypatch.setenv("SUPPORT_EMAIL", "ops@realentity.example")

    res = BillingService.generate_gst_tax_invoice(
        organization_id=f"org_pend_{uuid.uuid4().hex[:6]}",
        plan_id="PLANT",
    )
    inv = BillingService.get_invoice(res["invoice_id"])
    assert inv["payment_status"] == "PENDING"
    assert inv["razorpay_payment_id"] is None


def test_v5_5_1_admin_list_jobs_no_fake_seeding():
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("DELETE FROM background_jobs WHERE organization_id IN ('org_howrah_01', 'org_ludhiana_02')")
        conn.commit()
    jobs = AdminService.list_jobs()
    assert not any(j["organization_id"] in ("org_howrah_01", "org_ludhiana_02") for j in jobs)


def test_v5_5_1_audit_pdf_uses_db_organization_name():
    org_id = f"org_real_audit_{uuid.uuid4().hex[:6]}"
    org_name = "Kalinga Alloy Forgings Limited"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute(
            "INSERT OR REPLACE INTO organizations (id, name, created_at) VALUES (?, ?, ?)",
            (org_id, org_name, "2026-11-25T10:00:00Z"),
        )
        conn.commit()

    pdf_bytes = AuditService.export_pdf_certificate(org_id)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    doc.close()
    assert org_name in text
    assert "Howrah Precision Forgings" not in text


def test_v5_3_7_csp_and_index_no_unsafe_inline_scripts():
    with open(os.path.join(REPO_ROOT, "vercel.json"), "r", encoding="utf-8") as f:
        cfg = json.load(f)
    headers = cfg["headers"][0]["headers"]
    csp = next(h["value"] for h in headers if h["key"] == "Content-Security-Policy")
    assert "script-src 'self';" in csp
    assert "localhost:8000" not in csp
    assert "127.0.0.1:8000" not in csp
    assert "object-src 'none'" in csp

    with open(os.path.join(REPO_ROOT, "index.html"), "r", encoding="utf-8") as f:
        html = f.read()
    # Allow only ld+json metadata; zero inline executable <script> tags
    inline_js = re.findall(r"<script(?![^>]*(?:src=|application/ld\+json))[^>]*>", html, flags=re.IGNORECASE)
    assert inline_js == []


def test_v5_5_2_incident_md_no_fake_executives():
    with open(os.path.join(REPO_ROOT, "docs", "INCIDENT.md"), "r", encoding="utf-8") as f:
        text = f.read()
    for fake in ("Anirban Roy", "R. K. Bhattacharya", "Sunita Sharma", "+91-98300-"):
        assert fake not in text


def test_v5_5_1_no_org_howrah_default_in_ledger_and_notifications():
    from ledger_service import LedgerService
    from notification_service import NotificationService

    with pytest.raises(ValueError, match="Missing organization_id"):
        LedgerService.get_all_heats(None)

    with pytest.raises(ValueError, match="Missing organization_id"):
        NotificationService.get_preferences(None)

    with pytest.raises(ValueError, match="Missing organization_id"):
        NotificationService.update_preferences(None, prefs={"email": True})


def test_v5_5_1_ledger_new_org_starts_empty_and_tally_no_howrah(monkeypatch):
    from ledger_service import LedgerService
    from integration_service import IntegrationService
    import uuid

    monkeypatch.setenv("DEMO_MODE", "false")
    fresh_org = f"org_clean_{uuid.uuid4().hex[:8]}"
    assert LedgerService.get_all_heats(fresh_org) == []

    LedgerService.register_heat(
        heat_number=f"CLEAN-{uuid.uuid4().hex[:6].upper()}",
        organization_id=fresh_org,
        mill_name="Clean Works Mill",
        steel_grade="IS 2062 E250",
        initial_weight_kg=5000.0,
    )
    xml_out = IntegrationService.export_tally_xml(fresh_org)
    csv_out = IntegrationService.export_tally_csv(fresh_org)
    assert "Liluah Works Godown" not in xml_out
    assert "Howrah Forgings Yard 1" not in csv_out
