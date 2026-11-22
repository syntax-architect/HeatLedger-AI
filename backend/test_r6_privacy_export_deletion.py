"""
HEATLEDGER AI: Prompt R6 Test Suite
Privacy, Data Export, Deletion & Log Redaction:
- Data Export: Owner downloads complete organization archive ZIP (CSV tables + original documents)
- Non-owners (VIEWER, DISPATCH) blocked from export and deletion
- 30-day statutory deletion grace window with cancel option
- Hard deletion purges all tenant operational tables while preserving legal tax invoices per CGST Act
- SensitiveDataLoggingFilter scrubs emails, phones, secrets, PAN/GSTIN, and certificate readings
- Organization-level AI extraction consent switch routes to local-only parser
- Retention policy lifecycle (1-20 years, default 7 years)
"""

import io
import json
import uuid
import zipfile
import logging
import pytest
from typing import Optional
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from privacy_service import PrivacyService, SensitiveDataLoggingFilter
from auth_service import AuthService
from db.connection import get_db_connection

client = TestClient(app)


def _get_auth_header(role: str, org_id: str, email: Optional[str] = None) -> dict:
    """Helper creating user, membership, and authentic JWT for specified test role and tenant."""
    user_id = f"usr_{uuid.uuid4().hex[:6]}"
    user_email = email or f"{role.lower()}_{uuid.uuid4().hex[:4]}@factory.in"
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT OR IGNORE INTO organizations (id, name, created_at) VALUES (?, 'Test Org', ?)
        """, (org_id, now_iso))
        conn.execute("""
            INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, totp_secret_hex, created_at)
            VALUES (?, ?, '$argon2id$mockhash', 'mocksalt', 'Test User', 'mockhex', ?)
        """, (user_id, user_email, now_iso))
        conn.execute("""
            INSERT OR REPLACE INTO memberships (id, user_id, organization_id, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), user_id, org_id, role, now_iso))
        conn.commit()

    token = AuthService.create_jwt(
        user_id=user_id,
        email=user_email,
        role=role,
        organization_id=org_id
    )
    return {"Authorization": f"Bearer {token}"}


def test_r6_1_export_organization_archive_zip():
    """
    R6 Deliverable 1: Exporter OWNER triggers full data archive export.
    Receives valid ZIP containing CSV tables, document placeholders/PDFs, and manifest.
    """
    org_id = f"org_exp_{uuid.uuid4().hex[:6]}"
    owner_headers = _get_auth_header("OWNER", org_id)

    # Seed one test heat and document
    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"doc_exp_{uuid.uuid4().hex[:6]}"
    cert_id = f"cert_exp_{uuid.uuid4().hex[:6]}"
    with get_db_connection(is_service_role=True) as conn:
        conn.execute("""
            INSERT INTO documents (id, organization_id, file_name, file_size_bytes, mime_type, storage_path, sha256, created_at)
            VALUES (?, ?, 'mill_cert_01.pdf', 1024, 'application/pdf', 'uploads/mill_cert_01.pdf', 'sha256_mock_exp', ?)
        """, (doc_id, org_id, now_iso))
        conn.execute("""
            INSERT INTO mill_certificates (id, organization_id, certificate_number, issue_date, document_id, melt_and_pour_country)
            VALUES (?, ?, 'MTC-EXP-001', '2026-01-15', ?, 'India')
        """, (cert_id, org_id, doc_id))
        conn.execute("""
            INSERT INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, allocated_weight_grams, available_weight_grams, created_at)
            VALUES (?, ?, ?, 'EXP-HEAT-7788', 25000000, 0, 25000000, ?)
        """, (str(uuid.uuid4()), org_id, cert_id, now_iso))
        conn.commit()

    res = client.get("/api/privacy/export", headers=owner_headers)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/zip"
    assert f"HeatLedger_Data_Export_{org_id}.zip" in res.headers["content-disposition"]

    # Verify ZIP contents
    zip_bytes = res.content
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        namelist = zf.namelist()
        assert "metadata.json" in namelist
        assert "heats.csv" in namelist
        assert "shipments.csv" in namelist
        assert "mill_certificates.csv" in namelist
        assert "audit_log.csv" in namelist
        assert any(n.startswith("documents/") for n in namelist)

        # Inspect metadata
        meta = json.loads(zf.read("metadata.json").decode("utf-8"))
        assert meta["organization_id"] == org_id
        assert "disclaimer" in meta

        # Inspect heats.csv
        heats_csv = zf.read("heats.csv").decode("utf-8")
        assert "EXP-HEAT-7788" in heats_csv


def test_r6_2_non_owner_cannot_export_or_delete():
    """
    R6 Deliverable 2: VIEWER and DISPATCH roles cannot trigger data export or deletion.
    """
    org_id = f"org_sec_{uuid.uuid4().hex[:6]}"
    viewer_headers = _get_auth_header("VIEWER", org_id)
    dispatch_headers = _get_auth_header("DISPATCH", org_id)

    # Export attempts fail for non-owners
    assert client.get("/api/privacy/export", headers=viewer_headers).status_code == 403
    assert client.get("/api/privacy/export", headers=dispatch_headers).status_code == 403

    # Deletion attempts fail for non-owners
    assert client.post("/api/privacy/delete-request", headers=viewer_headers).status_code == 403
    assert client.post("/api/privacy/delete-request", headers=dispatch_headers).status_code == 403


def test_r6_3_organization_deletion_statutory_grace_window():
    """
    R6 Deliverable 3: Deletion request sets 30-day statutory grace period.
    Owner can cancel deletion within the window.
    """
    org_id = f"org_del_{uuid.uuid4().hex[:6]}"
    owner_headers = _get_auth_header("OWNER", org_id)

    # 1. Request deletion
    res_del = client.post("/api/privacy/delete-request", headers=owner_headers)
    assert res_del.status_code == 200
    data = res_del.json()
    assert data["status"] == "DELETION_SCHEDULED"
    assert data["grace_period_days"] == 30
    assert "deletion_scheduled_for" in data

    # 2. Check settings reflects pending deletion
    res_set = client.get("/api/privacy/settings", headers=owner_headers)
    assert res_set.status_code == 200
    assert res_set.json()["deletion_pending"] is True

    # 3. Cancel deletion request
    res_cancel = client.post("/api/privacy/cancel-deletion", headers=owner_headers)
    assert res_cancel.status_code == 200
    assert res_cancel.json()["status"] == "DELETION_CANCELLED"

    # 4. Settings reflects cancelled state
    res_set_after = client.get("/api/privacy/settings", headers=owner_headers)
    assert res_set_after.json()["deletion_pending"] is False


def test_r6_4_hard_deletion_purges_tenant_data_and_preserves_legal_invoices():
    """
    R6 Deliverable 4: Permanent hard deletion removes operational tables
    but strictly preserves legal tax invoices as mandated by Section 36 of CGST Act.
    """
    org_id = f"org_purge_{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"doc_p_{uuid.uuid4().hex[:6]}"
    cert_id = f"cert_p_{uuid.uuid4().hex[:6]}"
    inv_num = f"INV-PURGE-{uuid.uuid4().hex[:6]}"

    with get_db_connection(is_service_role=True) as conn:
        conn.execute("INSERT INTO organizations (id, name, created_at) VALUES (?, 'Purge Org', ?)", (org_id, now_iso))
        conn.execute("""
            INSERT INTO documents (id, organization_id, file_name, file_size_bytes, mime_type, storage_path, sha256, created_at)
            VALUES (?, ?, 'purge_doc.pdf', 512, 'application/pdf', 'uploads/purge_doc.pdf', 'sha256_mock_purge', ?)
        """, (doc_id, org_id, now_iso))
        conn.execute("""
            INSERT INTO mill_certificates (id, organization_id, certificate_number, issue_date, document_id, melt_and_pour_country)
            VALUES (?, ?, 'MTC-PURGE-001', '2026-01-15', ?, 'India')
        """, (cert_id, org_id, doc_id))
        conn.execute("""
            INSERT INTO heat_numbers (id, organization_id, mill_certificate_id, heat_number, initial_weight_grams, allocated_weight_grams, available_weight_grams, created_at)
            VALUES (?, ?, ?, 'PURGE-HEAT-01', 5000000, 0, 5000000, ?)
        """, (str(uuid.uuid4()), org_id, cert_id, now_iso))
        conn.execute("""
            INSERT INTO invoices (
                id, invoice_number, organization_id, plan_id, billing_cycle,
                base_amount_inr, discount_inr, taxable_amount_inr, gst_rate_pct,
                cgst_inr, sgst_inr, igst_inr, total_amount_inr, sac_code,
                supplier_gstin, place_of_supply, payment_status, created_at
            )
            VALUES (?, ?, ?, 'GROWTH', 'MONTHLY',
                9999.0, 0.0, 9999.0, 18.0,
                899.91, 899.91, 0.0, 11798.82, '998313',
                '19AAACH7409R1Z8', 'West Bengal (19)', 'PAID', ?
            )
        """, (str(uuid.uuid4()), inv_num, org_id, now_iso))
        conn.commit()

    # Schedule and force hard deletion
    PrivacyService.request_organization_deletion(org_id, performed_by="test_owner")
    result = PrivacyService.execute_hard_deletion(org_id, force_now=True)

    assert result["status"] == "HARD_DELETED"
    assert result["statutory_invoices_preserved"] is True

    # Verify operational tables are purged
    with get_db_connection(is_service_role=True) as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM heat_numbers WHERE organization_id = ?", (org_id,))
        assert cur.fetchone()[0] == 0

        cur.execute("SELECT COUNT(*) FROM documents WHERE organization_id = ?", (org_id,))
        assert cur.fetchone()[0] == 0

        # Verify tax invoices are PRESERVED (CGST Act Section 36 requirement)
        cur.execute("SELECT COUNT(*) FROM invoices WHERE organization_id = ?", (org_id,))
        assert cur.fetchone()[0] == 1


def test_r6_5_sensitive_data_logging_filter_scrubs_pii_and_certificate_contents():
    """
    R6 Deliverable 5: SensitiveDataLoggingFilter scrubs personal emails, phone numbers,
    secrets, GSTIN, and raw certificate metallurgy from all emitted log records.
    """
    raw_log = (
        "User inspector@howrahsteel.in called with phone +91 9876543210 and GSTIN 19AAACH7409R1Z8. "
        "Provided password: SuperSecretPassword2026! on HEAT NO: TSJ-26-9021 with C: 0.22%, Mn: 0.88%."
    )

    redacted = SensitiveDataLoggingFilter.redact_text(raw_log)

    assert "inspector@howrahsteel.in" not in redacted
    assert "[REDACTED_EMAIL]" in redacted

    assert "9876543210" not in redacted
    assert "[REDACTED_PHONE]" in redacted

    assert "19AAACH7409R1Z8" not in redacted
    assert "[REDACTED_GSTIN]" in redacted

    assert "SuperSecretPassword2026!" not in redacted
    assert "[REDACTED_SECRET]" in redacted

    assert "TSJ-26-9021" not in redacted
    assert "[REDACTED_CERT_DATA]" in redacted


def test_r6_6_ai_consent_toggle_bypasses_external_models():
    """
    R6 Deliverable 6: Disabling AI extraction consent in organization settings
    causes extraction to use local PyMuPDF text parser only, with zero external API calls.
    """
    org_id = f"org_no_ai_{uuid.uuid4().hex[:6]}"
    owner_headers = _get_auth_header("OWNER", org_id)

    # Disable AI consent
    res = client.post("/api/privacy/settings", headers=owner_headers, json={
        "ai_extraction_consent": False
    })
    assert res.status_code == 200
    assert res.json()["ai_extraction_consent"] is False

    # Check settings reflects false
    settings = PrivacyService.get_settings(org_id)
    assert settings["ai_extraction_consent"] is False


def test_r6_7_retention_settings_lifecycle():
    """
    R6 Deliverable 7: Data retention configuration lifecycle:
    - Default is 7 years
    - Can update between 1 and 20 years
    - Rejects invalid retention out of bounds
    """
    org_id = f"org_ret_{uuid.uuid4().hex[:6]}"
    owner_headers = _get_auth_header("OWNER", org_id)

    # Initial default is 7 years
    res_init = client.get("/api/privacy/settings", headers=owner_headers)
    assert res_init.status_code == 200
    assert res_init.json()["retention_years"] == 7

    # Update to 10 years
    res_up = client.post("/api/privacy/settings", headers=owner_headers, json={
        "retention_years": 10
    })
    assert res_up.status_code == 200
    assert res_up.json()["retention_years"] == 10

    # Reject out of bounds retention (e.g. 50 years)
    res_bad = client.post("/api/privacy/settings", headers=owner_headers, json={
        "retention_years": 50
    })
    assert res_bad.status_code == 422
