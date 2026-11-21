"""
HEATLEDGER AI: Prompt S3 Verification Test Suite
Verifies:
1. Unified DB Connection Pool Layer (psycopg3 + SQLite fallback)
2. Automated Migrations Runner on empty database (001, 002, 003)
3. 10 Domain Repositories (users, orgs, certificates, heats, shipments, dossiers, audit, billing, notifications, jobs)
4. Zero sqlite3 imports outside backend/db/
5. notification_preferences typed schema fix
"""

import os
import glob
import re
import uuid
import time
import pytest

from backend.db.connection import get_db_connection, DBCursorWrapper, DBConnectionWrapper
from backend.db.migrate import run_migrations, MIGRATIONS_DIR
from backend.db.users_repo import UsersRepo
from backend.db.orgs_repo import OrgsRepo
from backend.db.certificates_repo import CertificatesRepo
from backend.db.heats_repo import HeatsRepo
from backend.db.shipments_repo import ShipmentsRepo
from backend.db.dossiers_repo import DossiersRepo
from backend.db.audit_repo import AuditRepo
from backend.db.billing_repo import BillingRepo
from backend.db.notifications_repo import NotificationsRepo
from backend.db.jobs_repo import JobsRepo


def test_zero_sqlite3_imports_outside_backend_db():
    """Enforces architecture constraint: Zero files outside backend/db/ may import sqlite3."""
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    py_files = glob.glob(os.path.join(backend_dir, "**", "*.py"), recursive=True)
    
    violating_files = []
    for filepath in py_files:
        norm_path = os.path.normpath(filepath)
        rel_path = os.path.relpath(norm_path, backend_dir)
        # Skip files inside backend/db/
        if rel_path.startswith("db") or rel_path.startswith(os.path.join("backend", "db")):
            continue
        # Skip virtualenvs
        if ".venv" in rel_path or "venv" in rel_path:
            continue
            
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            if re.search(r"^\s*import\s+sqlite3\b", content, re.MULTILINE) or re.search(r"^\s*from\s+sqlite3\b", content, re.MULTILINE):
                violating_files.append(rel_path)
                
    assert violating_files == [], f"Found forbidden sqlite3 imports in: {violating_files}"


def test_migrations_runner_on_clean_empty_database(tmp_path):
    """Verifies that all migrations run cleanly on a brand new empty database file in one command."""
    test_db_path = str(tmp_path / "empty_test.sqlite3")
    
    # Run migrations on clean empty database
    applied = run_migrations(target_path=test_db_path)
    assert len(applied) >= 3, f"Expected at least 3 migrations applied, got: {applied}"
    assert "001_complete_b2_schema.sql" in applied
    assert "002_notification_preferences_schema_fix.sql" in applied
    assert "003_auth_sessions_and_tokens.sql" in applied
    
    # Verify idempotent second run
    applied_again = run_migrations(target_path=test_db_path)
    assert applied_again == [], "Second run should apply 0 migrations (idempotent)"
    
    # Verify schema_migrations table
    with get_db_connection(target_path=test_db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        versions = [r[0] for r in cursor.fetchall()]
        assert "001_complete_b2_schema.sql" in versions
        assert "002_notification_preferences_schema_fix.sql" in versions
        assert "003_auth_sessions_and_tokens.sql" in versions


def test_notification_preferences_typed_schema():
    """Verifies that notification_preferences table has typed columns per Prompt S3."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(notification_preferences);")
        columns = {row[1]: row[2] for row in cursor.fetchall()}
        
    assert "pref_id" in columns or "id" in columns
    assert "user_id" in columns
    assert "organization_id" in columns
    assert "email" in columns
    assert "whatsapp" in columns
    assert "in_app" in columns
    assert "regulatory_deadlines" in columns
    assert "signoff_alerts" in columns


def test_repositories_lifecycle():
    """Tests all 10 domain repositories under backend/db/ on the active database."""
    suffix = uuid.uuid4().hex[:6]
    test_org_id = "org_howrah_steel_01"
    test_user_id = "usr_owner_01"
    
    # 1. OrgsRepo
    org = OrgsRepo.get_org_by_id(test_org_id)
    assert org is not None
    assert org["id"] == test_org_id
    
    orgs = OrgsRepo.list_orgs()
    assert len(orgs) > 0
    
    sup_id = f"sup_test_{suffix}"
    OrgsRepo.create_supplier(sup_id, f"Test Mill {suffix}", plant_location="Howrah, India")
    sup = OrgsRepo.get_supplier_by_id(sup_id)
    assert sup is not None
    assert sup["name"] == f"Test Mill {suffix}"
    
    plant_id = f"plant_{suffix}"
    OrgsRepo.create_plant(plant_id, test_org_id, f"Howrah Mill {suffix}")
    plant = OrgsRepo.get_plant_by_id(plant_id)
    assert plant is not None
    assert plant["name"] == f"Howrah Mill {suffix}"
    
    # 2. UsersRepo
    user = UsersRepo.get_by_id(test_user_id)
    assert user is not None
    assert user["email"] == "owner@howrahsteel.in"
    
    by_email = UsersRepo.get_by_email("owner@howrahsteel.in")
    assert by_email is not None
    assert by_email["id"] == test_user_id
    
    token_id = f"rt_{suffix}"
    token_hash = f"hash_{suffix}"
    created_rt = UsersRepo.create_refresh_token(
        token_id=token_id,
        user_id=test_user_id,
        token_hash=token_hash,
        expires_at="2026-12-31T23:59:59Z",
        ip="127.0.0.1",
        user_agent="pytest"
    )
    assert created_rt == 1
    rt = UsersRepo.get_refresh_token(token_hash)
    assert rt is not None
    assert rt["user_id"] == test_user_id
    
    # 3. CertificatesRepo
    doc_id = f"doc_{suffix}"
    created_doc = CertificatesRepo.create_document(
        doc_id=doc_id,
        organization_id=test_org_id,
        file_name="mtc_test.pdf",
        file_size_bytes=1024,
        mime_type="application/pdf",
        sha256=f"hash_doc_{suffix}",
        storage_path=f"storage/certs/{doc_id}.pdf"
    )
    assert created_doc == 1
    doc = CertificatesRepo.get_document_by_id(doc_id)
    assert doc is not None
    assert doc["sha256"] == f"hash_doc_{suffix}"
    
    mill_cert_id = f"mc_{suffix}"
    CertificatesRepo.create_mill_certificate(
        cert_id=mill_cert_id,
        organization_id=test_org_id,
        document_id=doc_id,
        supplier_id=sup_id,
        certificate_number=f"MTC-{suffix.upper()}"
    )
    
    # 4. HeatsRepo
    heat_id = f"heat_id_{suffix}"
    heat_num = f"HEAT-{suffix.upper()}"
    created_heat = HeatsRepo.create_heat(
        heat_id=heat_id,
        organization_id=test_org_id,
        mill_certificate_id=mill_cert_id,
        heat_number=heat_num,
        initial_weight_grams=25000000
    )
    assert created_heat == 1
    heat = HeatsRepo.get_heat_by_id(heat_id)
    assert heat is not None
    assert heat["heat_number"] == heat_num
    
    heat_by_no = HeatsRepo.get_heat_by_number(test_org_id, heat_num)
    assert heat_by_no is not None
    assert heat_by_no["id"] == heat_id
    
    # 5. ShipmentsRepo
    shipment_id = f"shp_{suffix}"
    created_shp = ShipmentsRepo.create_shipment(
        shipment_id=shipment_id,
        organization_id=test_org_id,
        plant_id=plant_id,
        buyer_name="Rotterdam Steel Imports BV",
        destination_country="NL",
        invoice_number=f"INV-{suffix.upper()}",
        status="DRAFT"
    )
    assert created_shp == 1
    shp = ShipmentsRepo.get_shipment_by_id(shipment_id)
    assert shp is not None
    assert shp["buyer_name"] == "Rotterdam Steel Imports BV"
    
    ShipmentsRepo.update_shipment_status(shipment_id, "VALIDATED")
    updated_shp = ShipmentsRepo.get_shipment_by_id(shipment_id)
    assert updated_shp["status"] == "VALIDATED"
    
    # 6. DossiersRepo
    sig_id = f"sig_{suffix}"
    inv_num = f"EXP-2026-{suffix.upper()}"
    saved_sig = DossiersRepo.save_digital_signature(
        sig_id=sig_id,
        invoice_number=inv_num,
        signer_id=test_user_id,
        signer_name="P. K. Banerjee",
        signer_role="OWNER",
        organization_id=test_org_id,
        signature_b64="c2lnbmF0dXJlX2J5dGVz",
        manifest_sha256=f"manifest_sha_{suffix}"
    )
    assert saved_sig == 1
    sig = DossiersRepo.get_signature_by_invoice(inv_num)
    assert sig is not None
    assert sig["signer_name"] == "P. K. Banerjee"
    
    # 7. AuditRepo
    try:
        appended = AuditRepo.append_record(
            organization_id=test_org_id,
            entity_type="heat",
            entity_id=heat_id,
            action="REGISTER",
            user_id=test_user_id,
            user_name="P. K. Banerjee",
            user_role="OWNER",
            ip_address="127.0.0.1",
            timestamp="2026-11-21T12:00:00Z",
            before_state="{}",
            after_state='{"heat": "' + heat_num + '"}'
        )
        last_rec = AuditRepo.get_last_record()
        assert last_rec is not None
        assert last_rec["sequence_number"] == appended["sequence_number"]
    finally:
        with get_db_connection() as db:
            db.execute("DELETE FROM audit_log_chain WHERE sequence_number = ?", (appended["sequence_number"],))
            db.commit()
    
    # 8. BillingRepo
    sub = BillingRepo.get_subscription(test_org_id)
    assert sub is not None
    assert "plan_id" in sub
    
    invoices = BillingRepo.list_invoices(test_org_id)
    assert isinstance(invoices, list)
    
    # 9. NotificationsRepo
    notif_id = f"notif_{suffix}"
    created_notif = NotificationsRepo.create_notification(
        notif_id=notif_id,
        organization_id=test_org_id,
        title="CBAM Report Ready",
        message="Your report is ready",
        recipient_id=test_user_id
    )
    assert created_notif == 1
    notifs = NotificationsRepo.list_notifications(test_org_id, user_id=test_user_id)
    assert any(n["id"] == notif_id for n in notifs)
    
    # Preferences with typed schema
    prefs = NotificationsRepo.update_preferences(
        organization_id=test_org_id,
        user_id=test_user_id,
        prefs={"in_app": True, "email": False, "whatsapp": True}
    )
    assert prefs["email"] is False
    assert prefs["whatsapp"] is True
    
    # 10. JobsRepo
    job_id = f"job_{suffix}"
    enq = JobsRepo.enqueue_job(
        job_id=job_id,
        organization_id=test_org_id,
        job_name="MTC_EXTRACTION",
        payload_json='{"doc_id": "' + doc_id + '"}'
    )
    assert enq == 1
    job = JobsRepo.get_job(job_id)
    assert job is not None
    assert job["status"] == "QUEUED"
    JobsRepo.update_job_status(job_id, "COMPLETED")
    job_done = JobsRepo.get_job(job_id)
    assert job_done["status"] == "COMPLETED"
