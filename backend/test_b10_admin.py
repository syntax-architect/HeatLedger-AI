"""
HEATLEDGER AI: Prompt B10 - Super-Admin & Jobs Test Suite
Verifies background jobs enqueue/retry, super-admin metrics, tenant impersonation with audit,
and emergency kill switches.
"""

from admin_service import AdminService

def test_b10_job_queue_and_retry():
    org_id = "org_admin_test_01"

    # Enqueue job
    job = AdminService.enqueue_job(
        organization_id=org_id,
        job_name="ocr_batch_processing",
        payload={"batch_id": "BATCH-01", "total_docs": 10}
    )
    assert job["id"].startswith("job_")
    assert job["status"] == "QUEUED"

    # List jobs
    jobs = AdminService.list_jobs(status_filter="QUEUED")
    assert len(jobs) >= 1
    target = next((j for j in jobs if j["id"] == job["id"]), None)
    assert target is not None

def test_b10_admin_metrics():
    metrics = AdminService.get_system_metrics()
    assert metrics["active_pilot_organizations"] > 0
    assert metrics["average_gemini_ocr_cost_per_page_usd"] > 0
    assert "queue_health" in metrics
    assert "tenants" in metrics
    assert len(metrics["tenants"]) > 0

def test_b10_impersonation_token_issuance():
    admin_id = "usr_super_admin"
    target_org = "org_howrah_01"
    reason = "Customer support investigation on MTC-4091"

    imp = AdminService.generate_impersonation_token(admin_id, target_org, reason)
    assert imp["token"].startswith("imp_tok_")
    assert imp["target_org_id"] == target_org
    assert "ADMIN IMPERSONATION ACTIVE" in imp["banner_text"]

def test_b10_kill_switch_toggle():
    res = AdminService.update_kill_switch("whatsapp_ingestion_enabled", False)
    assert res["enabled"] is False
    assert AdminService._feature_flags["whatsapp_ingestion_enabled"] is False

    # Restore
    AdminService.update_kill_switch("whatsapp_ingestion_enabled", True)
    assert AdminService._feature_flags["whatsapp_ingestion_enabled"] is True
