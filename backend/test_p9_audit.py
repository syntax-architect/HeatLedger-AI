"""
HEATLEDGER AI: Unit Tests for Approvals, Roles & Tamper-Evident Audit Trail Engine (Prompt P9)

Covers:
1. Workflow state transitions: UPLOADED -> EXTRACTED -> REVIEWED -> APPROVED -> SIGNED -> RELEASED.
2. Maker-checker segregation enforcement (reviewer cannot approve their own review).
3. Small plant mode: collapsing steps or single-reviewer allowance.
4. Append-only cryptographic hash chain: SHA-256 state hashing and unbroken sequence linkage.
5. Tamper detection: manual modification of database record flags broken chain and identifies exact sequence number.
6. Legal-hold enforcement: prevents soft or hard deletion while under statutory hold.
7. Comments and @mentions: parses mentions, queues in-app notifications.
8. CSV and PyMuPDF A4 Audit Certificate PDF exports.
9. FastAPI endpoints integration tests via TestClient with RBAC.
"""

import pytest
import uuid
from fastapi.testclient import TestClient

from backend.db.connection import get_db_connection
from audit_service import AuditService
from auth_service import AuthService
from main import app

client = TestClient(app)


def _get_auth_header(role="OWNER"):
    user_map = {
        "OWNER": ("usr_owner_01", "P. K. Banerjee", "OWNER"),
        "ADMIN": ("usr_owner_01", "P. K. Banerjee", "OWNER"),
        "QA_HEAD": ("usr_qa_04", "R. K. Chatterjee", "QA_INSPECTOR"),
        "QA_INSPECTOR": ("usr_qa_04", "R. K. Chatterjee", "QA_INSPECTOR"),
        "QA": ("usr_qa_04", "R. K. Chatterjee", "QA_INSPECTOR"),
        "DISPATCH": ("usr_dispatch_01", "A. K. Sen", "DISPATCH"),
        "VIEWER": ("usr_viewer_01", "TÜV / SGS Customs Auditor", "VIEWER"),
    }
    uid, uname, urole = user_map.get(role, ("usr_owner_01", "P. K. Banerjee", "OWNER"))
    token = AuthService.create_jwt({
        "sub": uid,
        "user_id": uid,
        "name": uname,
        "role": urole,
        "org_id": "org_howrah_steel_01",
        "organization_id": "org_howrah_steel_01"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_audit():
    AuditService.init_tables()
    # Reset plant workflow config to standard enterprise mode
    AuditService.update_plant_config("org_howrah_steel_01", small_plant_mode=False, require_separate_reviewer=True, retention_years=10)


def test_p9_hash_chain_clean_integrity():
    """Verifies that the initial seed and append-only chain verifies mathematically."""
    res = AuditService.verify_hash_chain("org_howrah_steel_01")
    assert res["valid"] is True
    assert res["chain_broken"] is False
    assert res["tampered_sequence"] is None
    assert res["total_records"] > 0
    assert "Cryptographic integrity verified" in res["message"]


def test_p9_workflow_maker_checker_enforcement():
    """
    Tests standard workflow transitions and ensures that:
    1. Maker-checker segregation is strictly enforced (same user cannot review and approve).
    2. A different QA reviewer CAN approve.
    3. Proper progression follows: UPLOADED -> REVIEWED -> APPROVED -> SIGNED -> RELEASED.
    """
    entity_id = f"EXP-TEST-{uuid.uuid4().hex[:8]}"

    # Step 1: Review by Dispatch Officer Verma
    rev_res = AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="REVIEWED",
        user_id="usr_dispatch_01",
        user_name="A. K. Verma",
        user_role="DISPATCH"
    )
    assert rev_res["new_status"] == "REVIEWED"
    assert rev_res["action_by"] == "A. K. Verma"

    # Step 2: Same user attempts to approve -> Must raise PermissionError (Maker-Checker violation)
    with pytest.raises(PermissionError) as exc_info:
        AuditService.transition_state(
            organization_id="org_howrah_steel_01",
            entity_type="SHIPMENT",
            entity_id=entity_id,
            target_status="APPROVED",
            user_id="usr_dispatch_01",
            user_name="A. K. Verma",
            user_role="QA"
        )
    assert "Maker-Checker Segregation Policy" in str(exc_info.value)

    # Step 3: Independent QA Head Sharma approves -> Must succeed
    app_res = AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="APPROVED",
        user_id="usr_qa_head_01",
        user_name="S. N. Sharma",
        user_role="QA_HEAD"
    )
    assert app_res["new_status"] == "APPROVED"

    # Step 4: Signing requires QA_INSPECTOR role
    with pytest.raises(PermissionError):
        AuditService.transition_state(
            organization_id="org_howrah_steel_01",
            entity_type="SHIPMENT",
            entity_id=entity_id,
            target_status="SIGNED",
            user_id="usr_dispatch_01",
            user_name="A. K. Verma",
            user_role="DISPATCH"
        )

    sign_res = AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="SIGNED",
        user_id="usr_qa_insp_01",
        user_name="R. K. Chatterjee",
        user_role="QA_INSPECTOR"
    )
    assert sign_res["new_status"] == "SIGNED"

    # Step 5: Release requires OWNER/QA
    rel_res = AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="RELEASED",
        user_id="usr_owner_01",
        user_name="B. K. Howrah",
        user_role="OWNER"
    )
    assert rel_res["new_status"] == "RELEASED"


def test_p9_small_plant_mode_collapsible_workflow():
    """Verifies that small plant mode allows collapsing steps and bypassing separate reviewer rule."""
    # Enable small plant mode
    AuditService.update_plant_config("org_howrah_steel_01", small_plant_mode=True, require_separate_reviewer=False, retention_years=10)

    entity_id = f"EXP-SMALL-{uuid.uuid4().hex[:8]}"
    # Step 1: Review
    AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="REVIEWED",
        user_id="usr_sole_qa",
        user_name="Solo Auditor",
        user_role="QA"
    )

    # In small plant mode, same user CAN approve
    res = AuditService.transition_state(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id=entity_id,
        target_status="APPROVED",
        user_id="usr_sole_qa",
        user_name="Solo Auditor",
        user_role="QA"
    )
    assert res["new_status"] == "APPROVED"


def test_p9_tamper_detection_on_mutated_database():
    """
    Simulates a malicious direct database modification of an existing audit row.
    Asserts that verify_hash_chain flags tampering and pinpoints the sequence number.
    """
    # 1. Log a test action
    rec = AuditService.log_action(
        organization_id="org_howrah_steel_01",
        entity_type="CERTIFICATE",
        entity_id="TAMPER-TEST-01",
        action="EDIT",
        user_id="usr_attacker",
        user_name="Mallory",
        user_role="OPERATOR",
        ip_address="10.0.0.99",
        before_state={"CEV": 0.41},
        after_state={"CEV": 0.42}
    )
    seq = rec["sequence_number"]

    # 2. Tamper directly in PostgreSQL with raw SQL
    conn = get_db_connection()
    try:
        # Alter after_state without recomputing cryptographic hash
        conn.execute(
            "UPDATE audit_log_chain SET after_state = %s WHERE sequence_number = %s",
            ('{"CEV":0.39,"tampered":true}', seq)
        )
        conn.commit()

        # 3. Verification must fail and report the tampered sequence
        audit_check = AuditService.verify_hash_chain("org_howrah_steel_01")
        assert audit_check["valid"] is False
        assert audit_check["chain_broken"] is True
        assert audit_check["tampered_sequence"] == seq
        assert audit_check["error_type"] == "RECORD_CONTENT_MUTATION"
    finally:
        # Restore record to avoid poisoning subsequent tests
        conn.execute(
            "UPDATE audit_log_chain SET after_state = %s WHERE sequence_number = %s",
            (rec["after_state"], seq)
        )
        conn.commit()
        conn.close()

    # Re-verify clean
    clean_check = AuditService.verify_hash_chain("org_howrah_steel_01")
    assert clean_check["valid"] is True


def test_p9_legal_hold_and_soft_delete():
    """
    Verifies that legal-hold prevents soft or hard deletion of active audit entities.
    Once legal-hold is disabled, owner can soft-delete and the action is recorded in the chain.
    """
    entity_id = "TSJ-TEST-HOLD-901"

    # Set legal hold on entity
    AuditService.set_legal_hold(
        organization_id="org_howrah_steel_01",
        entity_id=entity_id,
        legal_hold=True,
        user_id="usr_owner_01",
        user_name="Plant Owner",
        user_role="OWNER",
        reason="Locking under statutory customs legal hold."
    )

    # Attempt delete while legal_hold = 1 -> must raise PermissionError
    with pytest.raises(PermissionError) as exc_info:
        AuditService.delete_entity(
            organization_id="org_howrah_steel_01",
            entity_id=entity_id,
            user_id="usr_owner_01",
            user_name="Plant Owner",
            user_role="OWNER"
        )
    assert "Legal-Hold" in str(exc_info.value)

    # Disable legal hold with reason
    hold_res = AuditService.set_legal_hold(
        organization_id="org_howrah_steel_01",
        entity_id=entity_id,
        legal_hold=False,
        user_id="usr_owner_01",
        user_name="Plant Owner",
        user_role="OWNER",
        reason="Statutory EU verification completed and closed by notified body."
    )
    assert hold_res["legal_hold"] is False

    # Now soft delete succeeds
    del_res = AuditService.delete_entity(
        organization_id="org_howrah_steel_01",
        entity_id=entity_id,
        user_id="usr_owner_01",
        user_name="Plant Owner",
        user_role="OWNER"
    )
    assert del_res["status"] == "soft_deleted"


def test_p9_comments_and_mentions():
    """Verifies posting comments, extracting @mentions, and queuing in-app notifications."""
    cmt = AuditService.add_comment(
        organization_id="org_howrah_steel_01",
        entity_type="SHIPMENT",
        entity_id="EXP-2026-109",
        author_id="usr_qa_01",
        author_name="S. N. Sharma",
        author_role="QA",
        comment_text="Please verify the spectrometer tensile strength @Chatterjee and @Mukherjee before release."
    )
    assert cmt["mentions"] == ["Chatterjee", "Mukherjee"]

    # Verify notification queued for @Chatterjee
    notifs = AuditService.list_notifications("org_howrah_steel_01", "Chatterjee")
    assert len(notifs) > 0
    assert "S. N. Sharma mentioned you in EXP-2026-109" in notifs[0]["notification_text"]

    # Verify comments list
    comments = AuditService.list_comments("org_howrah_steel_01", "EXP-2026-109")
    assert len(comments) > 0
    assert any(c["id"] == cmt["id"] for c in comments)


def test_p9_export_csv_and_pdf_certificate():
    """Verifies CSV export formatting and PyMuPDF A4 PDF certificate generation."""
    csv_text = AuditService.export_csv("org_howrah_steel_01")
    assert "Sequence,Timestamp (UTC),Entity Type,Entity ID,Action" in csv_text
    assert "Record Hash (SHA-256)" in csv_text

    pdf_bytes = AuditService.export_pdf_certificate("org_howrah_steel_01")
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 2000


# ------------------------------------------------------------------------------
# API Endpoints Integration Tests via FastAPI TestClient
# ------------------------------------------------------------------------------

def test_p9_api_audit_trail_and_verify():
    headers = _get_auth_header("OWNER")

    # 1. GET /api/audit/trail
    resp = client.get("/api/audit/trail", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_count"] > 0
    assert data["integrity_verified"] is True
    assert len(data["records"]) > 0

    # 2. GET /api/audit/verify-chain
    v_resp = client.get("/api/audit/verify-chain", headers=headers)
    assert v_resp.status_code == 200
    assert v_resp.json()["valid"] is True


def test_p9_api_workflow_transition_and_config():
    headers_qa = _get_auth_header("QA_INSPECTOR")
    headers_owner = _get_auth_header("OWNER")

    # 1. Update config
    cfg_resp = client.post("/api/audit/workflow/config", json={
        "small_plant_mode": False,
        "require_separate_reviewer": True,
        "retention_years": 12
    }, headers=headers_owner)
    assert cfg_resp.status_code == 200
    assert cfg_resp.json()["retention_years"] == 12

    # 2. Get config
    get_cfg = client.get("/api/audit/workflow/config", headers=headers_qa)
    assert get_cfg.status_code == 200
    assert get_cfg.json()["retention_years"] == 12

    # 3. Transition workflow
    test_id = f"EXP-API-{uuid.uuid4().hex[:8]}"
    tr_resp = client.post("/api/audit/workflow/transition", json={
        "entity_type": "SHIPMENT",
        "entity_id": test_id,
        "target_status": "REVIEWED"
    }, headers=headers_qa)
    assert tr_resp.status_code == 200
    assert tr_resp.json()["new_status"] == "REVIEWED"


def test_p9_api_legal_hold_and_delete_protection():
    headers_owner = _get_auth_header("OWNER")

    # Put EXP-2026-110 on legal hold
    hold_resp = client.post("/api/audit/legal-hold", json={
        "entity_id": "EXP-2026-110",
        "legal_hold": True,
        "reason": "Active customs inquiry at Port of Rotterdam"
    }, headers=headers_owner)
    assert hold_resp.status_code == 200
    assert hold_resp.json()["legal_hold"] is True

    # Attempt deletion -> must return 403 Forbidden
    del_resp = client.delete("/api/audit/entity/EXP-2026-110", headers=headers_owner)
    assert del_resp.status_code == 403
    assert "Legal-Hold" in del_resp.json()["detail"]


def test_p9_api_exports():
    headers = _get_auth_header("QA_INSPECTOR")

    # CSV Export
    csv_resp = client.get("/api/audit/export.csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "Sequence" in csv_resp.text

    # PDF Certificate Export
    pdf_resp = client.get("/api/audit/certificate.pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers["content-type"]
    assert pdf_resp.content.startswith(b"%PDF")
