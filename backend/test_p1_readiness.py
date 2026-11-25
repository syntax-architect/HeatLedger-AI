"""
HEATLEDGER AI: Prompt P1 Test Suite
Shipment Readiness Score & Release Gate Engine
- Table-driven rules check (melt-and-pour country, 3.1 cert, mass balance, signatures, chemistry)
- Traffic-light status (READY, FIX_NEEDED, BLOCKED)
- Release gate workflow: DISPATCH requests, QA/OWNER approves
- Owner override requiring typed audit justification reason
"""

from fastapi.testclient import TestClient

from main import app
from readiness_service import ReadinessService

client = TestClient(app)


def get_token_for_role(email: str, password: str) -> str:
    """Helper to authenticate as seeded user."""
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
    return res.json()["token"]


def test_p1_rules_catalog():
    """Verifies that the readiness rules catalog is active and data-driven."""
    res = client.get("/api/readiness/rules")
    assert res.status_code == 200
    data = res.json()
    assert "rules" in data
    assert data["total_rules"] >= 9
    rule_ids = [r["id"] for r in data["rules"]]
    assert "RULE_MELT_POUR" in rule_ids
    assert "RULE_CERT_TYPE" in rule_ids
    assert "RULE_MASS_BALANCE" in rule_ids
    assert "RULE_EXPORTER_SIGNED" in rule_ids


def test_p1_evaluate_fully_compliant_shipment():
    """A compliant shipment with all 7 blocking rules passing must return READY and can_release=True."""
    payload = {
        "shipment_id": "EXP-2026-COMPLIANT-01",
        "country_of_melt": "India [IN]",
        "melt_and_pour_status": "VERIFIED_INDIA",
        "compliance_mode": "EN 10204 3.1",
        "linked_heat_numbers": ["TSJ-26-9021", "TSJ-26-9022"],
        "metallurgy_status": "100% WITHIN SPEC",
        "is_over_allocated": False,
        "has_original_pdf": True,
        "sha256_upstream_pdf": "878a3b7525344442f7da79c...",
        "qa_signed": True,
        "specific_emissions": 2.05,
        "net_tonnage": 25.4,
        "country": "DE",
        "cn_code": "7306"
    }
    res = client.post("/api/readiness/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 100
    assert data["status"] == "READY"
    assert data["can_release"] is True
    assert data["blocking_failures"] == 0


def test_p1_missing_melt_and_pour_country_blocks_shipment():
    """A shipment missing verified Melt-and-Pour country must be BLOCKED per EU Reg 2026/1963."""
    payload = {
        "shipment_id": "EXP-2026-BLOCKED-MP",
        "country_of_melt": "",
        "melt_and_pour_status": "UNVERIFIED_DEFECT",
        "compliance_mode": "EN 10204 3.1",
        "linked_heat_numbers": ["SAIL-BO-8812"],
        "metallurgy_status": "100% WITHIN SPEC",
        "is_over_allocated": False,
        "has_original_pdf": True,
        "qa_signed": True,
        "specific_emissions": 2.12
    }
    res = client.post("/api/readiness/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    assert data["can_release"] is False
    assert data["blocking_failures"] >= 1

    mp_check = next(c for c in data["checks"] if c["rule_id"] == "RULE_MELT_POUR")
    assert mp_check["passed"] is False
    assert "country_of_melt" in mp_check["field_link"]


def test_p1_mass_balance_deficit_blocks_shipment():
    """A shipment with over-allocated heats must be BLOCKED by mass balance check."""
    payload = {
        "shipment_id": "EXP-2026-DEFICIT-01",
        "country_of_melt": "India [IN]",
        "melt_and_pour_status": "VERIFIED_INDIA",
        "compliance_mode": "EN 10204 3.1",
        "linked_heat_numbers": ["JSW-VY-4409"],
        "metallurgy_status": "100% WITHIN SPEC",
        "is_over_allocated": True,  # Over-allocation deficit
        "has_original_pdf": True,
        "qa_signed": True,
        "specific_emissions": 1.98
    }
    res = client.post("/api/readiness/evaluate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "BLOCKED"
    mb_check = next(c for c in data["checks"] if c["rule_id"] == "RULE_MASS_BALANCE")
    assert mb_check["passed"] is False
    assert "Heat balance deficit" in mb_check["message"]


def test_p1_request_release_workflow():
    """DISPATCH requests dispatch release for an evaluated shipment."""
    dispatch_token = get_token_for_role("dispatch@howrahsteel.in", "DispatchPassword2026!")

    eval_res = client.post("/api/readiness/evaluate", json={
        "shipment_id": "EXP-2026-REL-01",
        "country_of_melt": "India [IN]",
        "compliance_mode": "3.1",
        "linked_heat_numbers": ["TSJ-26-9021"],
        "qa_signed": True,
        "is_over_allocated": False,
        "has_original_pdf": True
    })
    evaluation = eval_res.json()

    req_res = client.post(
        "/api/readiness/request-release",
        headers={"Authorization": f"Bearer {dispatch_token}"},
        json={
            "shipment_id": "EXP-2026-REL-01",
            "evaluation": evaluation
        }
    )
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "RELEASE_REQUESTED"

    status_res = client.get("/api/readiness/status/EXP-2026-REL-01")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "RELEASE_REQUESTED"


def test_p1_approve_release_rejected_on_blocking_failure():
    """QA Inspector cannot approve release when blocking checks fail."""
    inspector_token = get_token_for_role("inspector@howrahsteel.in", "InspectorPassword2026!")

    # Evaluation with failing melt country
    blocked_eval = {
        "shipment_id": "EXP-2026-FAIL-01",
        "score": 75,
        "status": "BLOCKED",
        "blocking_failures": 1
    }

    res = client.post(
        "/api/readiness/approve-release",
        headers={"Authorization": f"Bearer {inspector_token}"},
        json={
            "shipment_id": "EXP-2026-FAIL-01",
            "evaluation": blocked_eval
        }
    )
    assert res.status_code == 403
    assert "Only an OWNER can override" in res.json()["detail"]


def test_p1_owner_override_with_typed_justification():
    """
    Plant OWNER can override blocking failures provided a typed justification reason is entered.
    Audit log must reflect the override.
    """
    owner_token = get_token_for_role("owner@howrahsteel.in", "OwnerSecretPassword2026!")

    blocked_eval = {
        "shipment_id": "EXP-2026-OVERRIDE-01",
        "score": 65,
        "status": "BLOCKED",
        "blocking_failures": 2
    }

    # 1. Owner attempts override without reason -> 400 Rejected
    res_no_reason = client.post(
        "/api/readiness/approve-release",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "shipment_id": "EXP-2026-OVERRIDE-01",
            "evaluation": blocked_eval,
            "override_reason": ""
        }
    )
    assert res_no_reason.status_code == 400
    assert "Owner override strictly requires a typed justification reason" in res_no_reason.json()["detail"]

    # 2. Owner supplies valid justification reason -> 200 Approved
    res_ok = client.post(
        "/api/readiness/approve-release",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "shipment_id": "EXP-2026-OVERRIDE-01",
            "evaluation": blocked_eval,
            "override_reason": "Commercial concession order C-409: European declarant accepted secondary mill lab cert."
        }
    )
    assert res_ok.status_code == 200
    data = res_ok.json()
    assert data["status"] == "RELEASE_APPROVED"
    assert data["override_applied"] is True

    # Check status persistence
    status = ReadinessService.get_release_status("EXP-2026-OVERRIDE-01")
    assert status["status"] == "RELEASE_APPROVED"
    assert status["override_applied"] == 1
    assert "Commercial concession" in status["override_reason"]


def test_p1_at_risk_shipments_endpoint():
    """Verifies that the /api/readiness/at-risk endpoint returns at-risk shipments."""
    owner_token = get_token_for_role("owner@howrahsteel.in", "OwnerSecretPassword2026!")
    res = client.get("/api/readiness/at-risk", headers={"Authorization": f"Bearer {owner_token}"})
    assert res.status_code == 200
    data = res.json()
    assert "at_risk_count" in data
    assert "shipments" in data
    assert data["at_risk_count"] >= 1
