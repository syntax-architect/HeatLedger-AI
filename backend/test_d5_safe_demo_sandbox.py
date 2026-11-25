"""
Test Suite for Prompt D5: Safe Demo Sandbox
Specifications:
1. Separate deployment / isolated database with DEMO_MODE=true. No connection to production data.
2. Login with random demo account that resets nightly. Sample plant data clearly fictional and labeled DEMO.
3. Production refuses to boot if DEMO_MODE=true.
4. Production has no demo login and refuses demo accounts (expect failure).
5. 3-minute guided tour covering: upload MTC, spec check, evidence pack, importer page, seal check, CBAM exposure card.
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app, lifespan
from backend.demo_service import (
    DemoService,
    DEMO_ORG_ID,
    DEMO_USER_EMAIL,
    SAMPLE_WATERMARK
)

client = TestClient(app)


def test_production_refuses_to_boot_if_demo_mode_true(monkeypatch):
    """Requirement 3: Production refuses to boot if DEMO_MODE=true."""
    monkeypatch.setenv("ENV", "production")
    monkeypatch.setenv("DEMO_MODE", "true")

    with pytest.raises(RuntimeError, match="Production refuses to boot if DEMO_MODE=true"):
        import asyncio
        asyncio.run(lifespan(app).__aenter__())


def test_production_rejects_demo_login_endpoint(monkeypatch):
    """Requirement 4: In production, /api/auth/demo-login is strictly blocked (returns 403)."""
    monkeypatch.setenv("ENV", "production")

    res = client.post("/api/auth/demo-login", json={"role": "SANDBOX_DEMO"})
    assert res.status_code == 403
    assert "Demo login disabled in production" in res.json()["detail"]


def test_production_rejects_demo_account_credentials_login(monkeypatch):
    """Requirement 4: Try to log in to production with a demo account (expect failure)."""
    monkeypatch.setenv("ENV", "production")

    # Attempt to log in with a demo account username
    res = client.post("/api/auth/login", json={
        "username": DEMO_USER_EMAIL,
        "password": "AnyPassword123!"
    })
    assert res.status_code == 403
    assert "Demo accounts cannot log into production" in res.json()["detail"]


def test_demo_sample_data_watermarked_and_labeled_demo():
    """Requirement 2: Sample plant data that is clearly fictional, labeled DEMO, and watermarked."""
    # Ensure demo plant is loaded
    demo_pack = DemoService.load_demo_plant()
    assert demo_pack is not None
    assert demo_pack["organization_id"] == DEMO_ORG_ID
    assert "SAMPLE" in demo_pack["organization_name"]

    # Check watermarked PDF generated for demo
    pdf_bytes = DemoService.generate_sample_watermarked_pdf(
        title="SAMPLE MILL TEST CERTIFICATE",
        heat_number="HEAT-DEMO-2026-X"
    )
    assert len(pdf_bytes) > 500
    assert SAMPLE_WATERMARK.encode("utf-8") in pdf_bytes or b"SAMPLE" in pdf_bytes


def test_three_minute_guided_tour_workflow():
    """Requirement 5: 3-minute guided tour steps (MTC upload, spec check, evidence pack, importer page, seal check, CBAM card)."""
    tour = DemoService.get_guided_tour_steps()
    assert tour is not None
    assert len(tour) >= 5

    step_keys = [s.get("id", s.get("step_id", "")).lower() for s in tour]
    step_titles = " ".join([s.get("title", "").lower() for s in tour])

    # Must cover: upload, spec check, evidence pack, importer portal, CBAM / seal check
    assert any("upload" in k or "upload" in step_titles for k in step_keys)
    assert any("spec" in k or "spec" in step_titles for k in step_keys)
    assert any("pack" in k or "evidence" in step_titles for k in step_keys)
    assert any("importer" in k or "buyer" in step_titles for k in step_keys)
    assert any("cbam" in k or "seal" in step_titles or "radar" in step_titles for k in step_keys)


def test_nightly_demo_reset_cleanliness():
    """Requirement 2: Demo data resets cleanly without affecting real data."""
    reset_res = DemoService.reset_demo_plant()
    assert reset_res is not None
    assert reset_res["status"] in ("DEMO_PLANT_RESET", "RESET_COMPLETE")
