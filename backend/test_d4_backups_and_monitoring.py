"""
HEATLEDGER AI: Prompt D4 Test Suite
Monitoring, Backups & Disaster Recovery Restore Drill:
- Live database snapshots with SHA-256 manifests and metadata JSON
- 7-day retention rotation policy (prunes older backups)
- Disaster recovery restore drill verifying tables and data fidelity
- Integrity failure detection on corrupted or tampered backups
- Authenticated AES-256-GCM encrypted backups and decrypted restore
- Synthetic monitoring endpoints (/healthz, /readyz, /status)
- Comprehensive monitoring documentation in docs/MONITORING.md
"""

import os
import json
import pytest
from starlette.testclient import TestClient

from db.backup import (
    create_backup,
    restore_backup,
    verify_backup_integrity,
    rotate_backups,
    compute_sha256,
)
from db.connection import get_db_connection
from main import app


def test_d4_1_backup_creation_and_checksum_manifest(tmp_path):
    """
    D4 Deliverable 1: Live snapshot creates backup file, .sha256 manifest, and .meta.json.
    """
    source_db = str(tmp_path / "source.sqlite3")
    backup_dir = str(tmp_path / "backups")

    # Create dummy source database using get_db_connection
    with get_db_connection(target_path=source_db, is_service_role=True) as db:
        db.execute("CREATE TABLE test_items (id TEXT PRIMARY KEY, value INTEGER)")
        db.execute("INSERT INTO test_items VALUES ('item_1', 100), ('item_2', 200)")

    # Execute backup
    backup_file = create_backup(source_path=source_db, dest_dir=backup_dir, encrypt=False)

    assert os.path.exists(backup_file)
    assert backup_file.endswith(".sqlite3")

    # Verify sha256 manifest
    sha_file = f"{backup_file}.sha256"
    assert os.path.exists(sha_file)
    with open(sha_file, "r", encoding="utf-8") as f:
        sha_content = f.read().strip()
    assert compute_sha256(backup_file) in sha_content

    # Verify meta.json
    meta_file = f"{backup_file}.meta.json"
    assert os.path.exists(meta_file)
    with open(meta_file, "r", encoding="utf-8") as f:
        meta = json.load(f)
    assert meta["is_encrypted"] is False
    assert meta["table_count"] >= 1
    assert meta["size_bytes"] > 0


def test_d4_2_backup_rotation_7_day_retention(tmp_path):
    """
    D4 Deliverable 2: Rotation policy retains strictly 7 newest backups and cleans older files.
    """
    backup_dir = str(tmp_path / "rotation_backups")
    os.makedirs(backup_dir, exist_ok=True)

    # Create 10 mock backups with synthetic timestamps
    for i in range(10):
        fname = f"heatledger_backup_202611{i+10:02d}_020000.sqlite3"
        fpath = os.path.join(backup_dir, fname)
        with open(fpath, "wb") as f:
            f.write(b"mock_db_bytes")
        with open(f"{fpath}.sha256", "w", encoding="utf-8") as f:
            f.write("mock_sha")
        with open(f"{fpath}.meta.json", "w", encoding="utf-8") as f:
            f.write("{}")

    # Pre-rotation count
    sqlite_files = [f for f in os.listdir(backup_dir) if f.endswith(".sqlite3")]
    assert len(sqlite_files) == 10

    # Execute rotation (keep=7)
    deleted = rotate_backups(backup_dir, keep=7)

    # 3 backups should have been pruned (9 files total: .sqlite3, .sha256, .meta.json)
    remaining_sqlite = [f for f in os.listdir(backup_dir) if f.endswith(".sqlite3")]
    assert len(remaining_sqlite) == 7
    assert len(deleted) == 9  # 3 * 3 files


def test_d4_3_restore_drill_clean_database_integrity(tmp_path):
    """
    D4 Deliverable 3: Restore drill takes a backup snapshot, verifies checksum,
    and restores to an isolated target DB with 100% data fidelity.
    """
    source_db = str(tmp_path / "prod_source.sqlite3")
    backup_dir = str(tmp_path / "backups")
    restored_db = str(tmp_path / "restored.sqlite3")

    with get_db_connection(target_path=source_db, is_service_role=True) as db:
        db.execute("CREATE TABLE mill_orders (id TEXT PRIMARY KEY, heat_no TEXT, weight_kg REAL)")
        db.execute("INSERT INTO mill_orders VALUES ('ord_1', 'HEAT-9921', 45000.5)")
        db.execute("INSERT INTO mill_orders VALUES ('ord_2', 'HEAT-9922', 32000.0)")

    # Create backup
    backup_file = create_backup(source_path=source_db, dest_dir=backup_dir, encrypt=False)

    # Verify integrity pre-flight
    valid, msg = verify_backup_integrity(backup_file)
    assert valid is True

    # Execute disaster recovery restore drill
    report = restore_backup(backup_path=backup_file, target_path=restored_db, verify_first=True)

    assert report["status"] == "RESTORE_VERIFIED_SUCCESSFUL"
    assert report["integrity_check"].lower() == "ok"
    assert "mill_orders" in report["tables"]

    # Verify data in restored database
    with get_db_connection(target_path=restored_db, is_service_role=True) as db:
        res = db.execute("SELECT heat_no, weight_kg FROM mill_orders ORDER BY id")
        rows = res.fetchall()
        assert len(rows) == 2
        first = rows[0]
        heat = first["heat_no"] if isinstance(first, dict) else first[0]
        assert heat == "HEAT-9921"


def test_d4_4_restore_rejection_on_checksum_mismatch_or_tampering(tmp_path):
    """
    D4 Deliverable 4: Corrupted or tampered backup files are detected and rejected.
    """
    source_db = str(tmp_path / "tamper_source.sqlite3")
    backup_dir = str(tmp_path / "backups")
    target_db = str(tmp_path / "tamper_target.sqlite3")

    with get_db_connection(target_path=source_db, is_service_role=True) as db:
        db.execute("CREATE TABLE t1 (id TEXT PRIMARY KEY)")
        db.execute("INSERT INTO t1 VALUES ('secure_row')")

    backup_file = create_backup(source_path=source_db, dest_dir=backup_dir, encrypt=False)

    # Tamper with the backup file by modifying bytes
    with open(backup_file, "r+b") as f:
        f.seek(50)
        f.write(b"TAMPERED_CORRUPTION_DATA")

    # verify_backup_integrity must detect the tampering
    valid, msg = verify_backup_integrity(backup_file)
    assert valid is False
    assert "mismatch" in msg.lower() or "failed" in msg.lower()

    # restore_backup must raise ValueError and abort restore
    with pytest.raises(ValueError) as excinfo:
        restore_backup(backup_path=backup_file, target_path=target_db, verify_first=True)
    assert "integrity check failed" in str(excinfo.value).lower()
    assert not os.path.exists(target_db)


def test_d4_5_encrypted_backup_and_decrypted_restore(tmp_path):
    """
    D4 Deliverable 5: Authenticated AES-256-GCM encryption creates secure snapshot
    and successfully restores when provided the valid encryption key.
    """
    source_db = str(tmp_path / "enc_source.sqlite3")
    backup_dir = str(tmp_path / "backups")
    restored_db = str(tmp_path / "enc_restored.sqlite3")
    custom_key = "secure_production_backup_key_2026_xyz!"

    with get_db_connection(target_path=source_db, is_service_role=True) as db:
        db.execute("CREATE TABLE secret_specs (spec_id TEXT PRIMARY KEY, alloy_code TEXT)")
        db.execute("INSERT INTO secret_specs VALUES ('spec_01', 'CRGO-M4-027')")

    # Create encrypted backup
    backup_file = create_backup(
        source_path=source_db,
        dest_dir=backup_dir,
        encrypt=True,
        encryption_key=custom_key
    )

    assert backup_file.endswith(".enc")
    # File content should not have standard SQLite header
    with open(backup_file, "rb") as f:
        header = f.read(16)
    assert b"SQLite format 3" not in header
    assert b"HLBACKUP01" in header

    # Attempt restore with wrong key -> must fail
    with pytest.raises(ValueError) as excinfo:
        restore_backup(
            backup_path=backup_file,
            target_path=restored_db,
            encryption_key="wrong_password_key_fail_12345678",
            verify_first=True
        )
    assert "decryption failed" in str(excinfo.value).lower()

    # Restore with correct key -> succeeds
    report = restore_backup(
        backup_path=backup_file,
        target_path=restored_db,
        encryption_key=custom_key,
        verify_first=True
    )

    assert report["status"] == "RESTORE_VERIFIED_SUCCESSFUL"
    assert report["is_encrypted"] is True

    # Verify data in restored database
    with get_db_connection(target_path=restored_db, is_service_role=True) as db:
        res = db.execute("SELECT alloy_code FROM secret_specs WHERE spec_id = 'spec_01'")
        row = res.fetchone()
        code = row["alloy_code"] if isinstance(row, dict) else row[0]
        assert code == "CRGO-M4-027"


def test_d4_6_synthetic_monitoring_probes():
    """
    D4 Deliverable 6: Verifies liveness (/healthz), readiness (/readyz),
    and public status (/status) synthetic probes return expected structure.
    """
    client = TestClient(app)

    # Liveness probe
    res_live = client.get("/healthz")
    assert res_live.status_code == 200
    data_live = res_live.json()
    assert data_live["status"] in ("alive", "HEALTHY", "healthy")
    assert "timestamp" in data_live

    # Readiness probe
    res_ready = client.get("/readyz")
    assert res_ready.status_code == 200
    data_ready = res_ready.json()
    assert data_ready.get("database") == "CONNECTED"
    assert data_ready.get("status") in ("HEALTHY", "READY", "healthy")

    # Status route
    res_status = client.get("/status")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert data_status["status"] in ("healthy", "degraded")
    assert data_status.get("api") == "ok"
    assert "database" in data_status


def test_d4_7_monitoring_documentation_comprehensive():
    """
    D4 Deliverable 7: Verifies docs/MONITORING.md exists, documents SLO targets,
    synthetic probes, Sentry configuration, and disaster recovery drill.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    doc_path = os.path.join(root_dir, "docs", "MONITORING.md")

    assert os.path.exists(doc_path), "docs/MONITORING.md does not exist!"

    with open(doc_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "99.9%" in content
    assert "/healthz" in content
    assert "/readyz" in content
    assert "BetterStack" in content or "UptimeRobot" in content
    assert "restore_db.py" in content
    assert "RTO" in content
    assert "RPO" in content


def test_d4_8_runbook_covers_top_8_incidents():
    """
    D4 Deliverable 8: Verifies docs/RUNBOOK.md documents concrete mitigation steps
    for all 8 top production incidents.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    runbook_path = os.path.join(root_dir, "docs", "RUNBOOK.md")

    assert os.path.exists(runbook_path), "docs/RUNBOOK.md does not exist!"
    with open(runbook_path, "r", encoding="utf-8") as f:
        content = f.read().lower()

    # Verify all 8 incidents are explicitly covered
    required_incidents = [
        "site down",
        "database full",
        "ai provider down",
        "payment webhook",
        "email bounces",
        "leaked secret",
        "bad deploy",
        "customer data request"
    ]
    for inc in required_incidents:
        assert inc in content, f"docs/RUNBOOK.md missing required incident: '{inc}'"


def test_d4_9_restore_drill_report_exists_and_verified():
    """
    D4 Deliverable 9: Verifies docs/RESTORE_DRILL_REPORT.md documents real executed
    restore drill with elapsed timing and verified row/table counts.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    report_path = os.path.join(root_dir, "docs", "RESTORE_DRILL_REPORT.md")

    assert os.path.exists(report_path), "docs/RESTORE_DRILL_REPORT.md does not exist!"
    with open(report_path, "r", encoding="utf-8") as f:
        content = f.read()

    assert "RESTORE_VERIFIED_SUCCESSFUL" in content
    assert "integrity_check" in content or "integrity" in content.lower()
    assert "tables" in content.lower()
    assert "seconds" in content.lower()


def test_d4_10_daily_ai_budget_circuit_breaker():
    """
    D4 Deliverable 10: Circuit breaker halts extraction when daily budget is exhausted.
    """
    import uuid
    from token_budget_service import TokenBudgetService
    org_id = f"org_cb_{uuid.uuid4().hex[:10]}"

    # Pre-test: allowance available under normal usage
    allowed, _ = TokenBudgetService.check_budget(org_id, estimated_tokens=100, daily_limit=500)
    assert allowed is True

    # Record usage that exceeds the limit
    TokenBudgetService.record_usage(
        organization_id=org_id,
        model="gemini-1.5-flash-lite",
        tokens_used=600,
        cost_paise=15.0
    )

    # Circuit breaker triggers: extraction paused and returns deterministic message
    allowed_after, reason = TokenBudgetService.check_budget(org_id, estimated_tokens=100, daily_limit=500)
    assert allowed_after is False
    assert "Daily token budget limit reached" in reason
    assert "Manual entry or plan upgrade required" in reason
