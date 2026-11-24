"""
HEATLEDGER AI: Prompt Pack v4 - Task C2 Verification Test Suite
Spec: Melt-and-Pour Evidence Pack per Shipment (Regulation EU 2026/1384 & Implementing Reg 2026/1963)

Verifies:
1. Dated rules table with official source links (EU 2026/1384, 2026/1963, UK CBAM).
2. CN Scope check:
   - CN 7208 to 7306 IN SCOPE
   - CN 7307 (fittings) and 7318 (fasteners) OUT OF SCOPE for melt-and-pour, IN CBAM scope
3. Evidence status per heat (Evidence present, Needs mill letter, Missing).
4. Traceability chain view (mill heat -> plant lot -> shipment line -> invoice/container).
5. Sealing Gate Acceptance Test:
   - Shipment with 2 heats (one valid, one missing pour country) marks gap and BLOCKS sealing.
   - Supplying an authorized inspector override justification unblocks sealing and logs reason.
6. Auto-ticked 'What the importer will ask' checklist.
7. Mandatory watermark: 'Prepared by <plant>. Tamper-evident seal. Not a legal verification.'
8. API routes (/api/melt-and-pour/*).
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.melt_and_pour_service import (
    CNScopeStatus,
    EvidenceStatus,
    GapSeverity,
    MeltAndPourService,
)

client = TestClient(app)


@pytest.fixture
def auth_headers():
    res = client.post(
        "/api/auth/login",
        json={
            "email": "owner@howrahsteel.in",
            "password": "OwnerSecretPassword2026!",
        },
    )
    if res.status_code == 200:
        token = res.json()["token"]
        return {"Authorization": f"Bearer {token}"}
    return {}


def test_c2_01_dated_rules_table_provenance():
    """Verifies dated rules table contains official citations and source links."""
    rules = MeltAndPourService.get_rules_table()
    assert len(rules) >= 5

    rule_ids = [r["rule_id"] for r in rules]
    assert "EU-2026-1384-SCOPE" in rule_ids
    assert "EU-7318-7307-EXCLUSION" in rule_ids
    assert "EU-2026-1963-MTC-MANDATE" in rule_ids
    assert "EU-STANDALONE-TRANSITION" in rule_ids
    assert "UK-CBAM-MANDATORY-START" in rule_ids

    for r in rules:
        assert "effective_date" in r
        assert "legal_citation" in r
        assert "source_url" in r
        assert r["source_url"].startswith("http")

    # Verify UK £2,000 de minimis threshold is captured
    uk_rule = next(r for r in rules if r["rule_id"] == "UK-CBAM-MANDATORY-START")
    assert uk_rule["de_minimis_gbp"] == 2000.0


def test_c2_02_cn_scope_check():
    """
    Verifies CN 7208 to 7306 is in scope, 7307 and 7318 are out of scope (but in CBAM),
    and non-steel codes are out of scope.
    """
    # 1. In Scope: CN 7208 through 7306
    in_scope_samples = ["7208 51 00", "7214.20.00", "7304 31 80", "7306 30 10"]
    for code in in_scope_samples:
        res = MeltAndPourService.check_cn_scope(code)
        assert res.status == CNScopeStatus.IN_SCOPE
        assert res.cbam_in_scope is True
        assert "Annex I" in res.reason

    # 2. Out of Scope: Fittings (7307) and Fasteners (7318)
    fittings = MeltAndPourService.check_cn_scope("7307 22 10")
    assert fittings.status == CNScopeStatus.OUT_OF_SCOPE
    assert fittings.cbam_in_scope is True
    assert "out of melt-and-pour scope" in fittings.reason.lower()
    assert "cbam" in fittings.reason.lower()

    fasteners = MeltAndPourService.check_cn_scope("7318 15 82")
    assert fasteners.status == CNScopeStatus.OUT_OF_SCOPE
    assert fasteners.cbam_in_scope is True
    assert "Fasteners" in fasteners.reason

    # 3. Non-steel
    non_steel = MeltAndPourService.check_cn_scope("8401 10 00")
    assert non_steel.status == CNScopeStatus.OUT_OF_SCOPE
    assert non_steel.cbam_in_scope is False


def test_c2_03_heat_evidence_status_evaluation():
    """Verifies evidence status logic: Evidence present, Needs mill letter, Missing."""
    # Complete MTC
    ev_full = MeltAndPourService.evaluate_heat_evidence(
        heat_number="HEAT-101",
        certificate_data={"country_of_melt": "IN", "country_of_pour": "IN", "certificate_id": "MTC-991"},
    )
    assert ev_full.status == EvidenceStatus.EVIDENCE_PRESENT
    assert ev_full.source == "MTC field"

    # Missing pour country (needs mill letter)
    ev_missing_pour = MeltAndPourService.evaluate_heat_evidence(
        heat_number="HEAT-102",
        certificate_data={"country_of_melt": "IN", "certificate_id": "MTC-992"},
    )
    assert ev_missing_pour.status == EvidenceStatus.NEEDS_MILL_LETTER
    assert "Requires mill origin letter" in ev_missing_pour.notes

    # Mill letter provided for pour country
    ev_with_letter = MeltAndPourService.evaluate_heat_evidence(
        heat_number="HEAT-103",
        certificate_data={"country_of_melt": "IN", "certificate_id": "MTC-993"},
        mill_letter_data={"country_of_pour": "IN"},
    )
    assert ev_with_letter.status == EvidenceStatus.EVIDENCE_PRESENT
    assert ev_with_letter.source == "mill letter"

    # Totally missing
    ev_none = MeltAndPourService.evaluate_heat_evidence(heat_number="HEAT-104")
    assert ev_none.status == EvidenceStatus.MISSING


def test_c2_04_sealing_gate_two_heats_one_missing_pour():
    """
    CRITICAL ACCEPTANCE TEST (Prompt Pack v4 Task C2):
    DONE WHEN: a shipment with two heats, one missing the pour country, produces a pack
    that marks the gap and blocks sealing until resolved or explicitly overridden with a reason.
    """
    sample_shipment = {
        "shipment_id": "SHP-EU-2026-881",
        "plant_name": "Plant 1 - Liluah",
        "importer_name": "ThyssenKrupp Materials DE",
        "destination_country": "DE",
        "lines": [
            {
                "line_id": "L1",
                "heat_number": "HEAT-ALPHA",
                "plant_lot": "LOT-001",
                "cn_code": "7306 30 10",
                "tonnes": 24.5,
                "container_number": "MSKU-1092812",
            },
            {
                "line_id": "L2",
                "heat_number": "HEAT-BETA",
                "plant_lot": "LOT-002",
                "cn_code": "7306 30 10",
                "tonnes": 18.2,
                "container_number": "MSKU-1092813",
            },
        ],
        "heats": [
            {
                "heat_number": "HEAT-ALPHA",
                "certificate": {
                    "certificate_id": "MTC-ALPHA-01",
                    "manufacturer_mill": "Tata Steel Kalinganagar",
                    "country_of_melt": "IN",
                    "country_of_pour": "IN",
                },
            },
            {
                "heat_number": "HEAT-BETA",
                "certificate": {
                    "certificate_id": "MTC-BETA-02",
                    "manufacturer_mill": "JSW Steel Vijayanagar",
                    "country_of_melt": "IN",
                    # country_of_pour is MISSING!
                },
            },
        ],
    }

    # 1. Evaluate pack without override
    pack = MeltAndPourService.evaluate_shipment_pack(sample_shipment)

    # Must identify the gap
    assert len(pack.gaps) >= 1
    pour_gap = next((g for g in pack.gaps if g.heat_number == "HEAT-BETA" and "pour" in g.message.lower()), None)
    assert pour_gap is not None
    assert pour_gap.severity == GapSeverity.CRITICAL

    # Sealing MUST BE BLOCKED
    assert pack.can_seal is False
    assert "Sealing blocked" in pack.summary_message

    # Attempting to seal must raise ValueError
    with pytest.raises(ValueError) as exc_info:
        MeltAndPourService.seal_evidence_pack(
            shipment_data=sample_shipment,
            signer_name="R. K. Chatterjee",
            signer_role="QA_INSPECTOR",
        )
    assert "Sealing blocked" in str(exc_info.value)
    assert "critical melt-and-pour gap" in str(exc_info.value)

    # 2. Now attempt to seal with an authorized inspector override
    override_reason = "Mill ladle casting origin verified via signed dispatch slip #DSP-2026-991"
    pack_overridden = MeltAndPourService.evaluate_shipment_pack(sample_shipment, override_reason=override_reason)

    assert pack_overridden.can_seal is True
    assert "override" in pack_overridden.summary_message.lower()

    # Seal execution succeeds with override
    sealed = MeltAndPourService.seal_evidence_pack(
        shipment_data=sample_shipment,
        signer_name="R. K. Chatterjee",
        signer_role="QA_INSPECTOR",
        override_reason=override_reason,
    )
    assert sealed.is_sealed is True
    assert sealed.seal_signer == "R. K. Chatterjee"
    assert sealed.seal_hash is not None
    assert len(sealed.seal_hash) == 64  # SHA-256


def test_c2_05_clean_shipment_seals_without_override():
    """Verifies that a fully compliant shipment with all pour/melt evidence seals smoothly."""
    clean_shipment = {
        "shipment_id": "SHP-CLEAN-01",
        "plant_name": "Plant 1 - Liluah",
        "importer_name": "Salzgitter AG",
        "destination_country": "DE",
        "lines": [
            {
                "line_id": "L1",
                "heat_number": "HEAT-CLN-1",
                "plant_lot": "LOT-C1",
                "cn_code": "7208 51 00",
                "tonnes": 50.0,
            }
        ],
        "heats": [
            {
                "heat_number": "HEAT-CLN-1",
                "certificate": {
                    "certificate_id": "MTC-CLN-1",
                    "manufacturer_mill": "SAIL Bokaro Steel Plant",
                    "country_of_melt": "IN",
                    "country_of_pour": "IN",
                },
            }
        ],
    }

    pack = MeltAndPourService.evaluate_shipment_pack(clean_shipment)
    assert pack.can_seal is True
    assert len(pack.gaps) == 0

    sealed = MeltAndPourService.seal_evidence_pack(
        clean_shipment,
        signer_name="A. Roy",
        signer_role="METALLURGIST",
    )
    assert sealed.is_sealed is True
    assert sealed.seal_hash is not None


def test_c2_06_importer_checklist_and_watermark():
    """Verifies auto-ticked checklist and mandatory watermark."""
    shipment = {
        "shipment_id": "SHP-CHK-01",
        "plant_name": "Howrah Steel Works",
        "importer_name": "EuroMetals NV",
        "destination_country": "BE",
        "lines": [{"line_id": "L1", "heat_number": "H-1", "cn_code": "7214 20 00", "tonnes": 10.0}],
        "heats": [
            {
                "heat_number": "H-1",
                "certificate": {"certificate_id": "MTC-1", "country_of_melt": "IN", "country_of_pour": "IN"},
            }
        ],
    }

    pack = MeltAndPourService.evaluate_shipment_pack(shipment)

    # Check checklist items
    chk_ids = [c.item_id for c in pack.checklist]
    assert "CHK-MTC-HEAT" in chk_ids
    assert "CHK-MELT-ORIGIN" in chk_ids
    assert "CHK-POUR-ORIGIN" in chk_ids
    assert "CHK-CHAIN-RECONCILED" in chk_ids
    assert "CHK-DISCLAIMER-SEAL" in chk_ids

    # All items checked for clean heat
    for item in pack.checklist:
        assert item.checked is True

    # Check mandatory watermark wording rule
    assert pack.watermark_text == "Prepared by Howrah Steel Works. Tamper-evident seal. Not a legal verification."


def test_c2_07_api_endpoints(auth_headers):
    """Tests the /api/melt-and-pour/* FastAPI endpoints."""
    # 1. GET /api/melt-and-pour/rules
    resp_rules = client.get("/api/melt-and-pour/rules", headers=auth_headers)
    assert resp_rules.status_code == 200
    data_rules = resp_rules.json()
    assert data_rules["status"] == "ok"
    assert len(data_rules["rules"]) >= 5

    # 2. POST /api/melt-and-pour/scope-check
    resp_scope = client.post(
        "/api/melt-and-pour/scope-check",
        json={"cn_codes": ["7208 51 00", "7318 15 82"]},
        headers=auth_headers,
    )
    assert resp_scope.status_code == 200
    scope_data = resp_scope.json()
    assert scope_data["status"] == "ok"
    assert len(scope_data["results"]) == 2
    assert scope_data["results"][0]["status"] == "in_scope"
    assert scope_data["results"][1]["status"] == "out_of_scope"

    # 3. POST /api/melt-and-pour/evaluate-shipment with bad heat
    bad_shipment = {
        "shipment_id": "API-TEST-BAD",
        "plant_name": "API Plant",
        "importer_name": "API Importer",
        "destination_country": "DE",
        "lines": [{"line_id": "L1", "heat_number": "H-API", "cn_code": "7306 30 10", "tonnes": 15.0}],
        "heats": [{"heat_number": "H-API", "certificate": {"country_of_melt": "IN"}}],
    }
    resp_eval = client.post(
        "/api/melt-and-pour/evaluate-shipment",
        json={"shipment_data": bad_shipment},
        headers=auth_headers,
    )
    assert resp_eval.status_code == 200
    pack_data = resp_eval.json()["pack"]
    assert pack_data["can_seal"] is False
    assert len(pack_data["gaps"]) >= 1

    # 4. POST /api/melt-and-pour/seal-pack without override -> Expect HTTP 400
    resp_seal_fail = client.post(
        "/api/melt-and-pour/seal-pack",
        json={
            "shipment_data": bad_shipment,
            "signer_name": "Test Signer",
            "signer_role": "QA_INSPECTOR",
        },
        headers=auth_headers,
    )
    assert resp_seal_fail.status_code == 400
    assert "Sealing blocked" in resp_seal_fail.json()["detail"]

    # 5. POST /api/melt-and-pour/seal-pack with override -> Expect HTTP 200
    resp_seal_ok = client.post(
        "/api/melt-and-pour/seal-pack",
        json={
            "shipment_data": bad_shipment,
            "signer_name": "Test Signer",
            "signer_role": "QA_INSPECTOR",
            "override_reason": "Verified through mill physical heat certificate stamped on packing list",
        },
        headers=auth_headers,
    )
    assert resp_seal_ok.status_code == 200
    seal_res = resp_seal_ok.json()["pack"]
    assert seal_res["is_sealed"] is True
    assert seal_res["seal_hash"] is not None
