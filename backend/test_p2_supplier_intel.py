"""
HEATLEDGER AI · Test Suite for Prompt P2 (Supplier & Mill Intelligence)
Validates:
1. Supplier directory and quality scorecard retrieval.
2. Defect percentage metrics, turnaround times, and monthly trend sparklines.
3. Supplier detail lookup and 404 handling.
4. Purchase Order weight matching within tolerance (MATCHED) vs exceeding tolerance (DISCREPANCY_FLAGGED).
5. 'Ask Supplier to Fix' WhatsApp and Email notice generation.
6. Deterministic mill layout fingerprints and learned templates.
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from supplier_service import SupplierService

client = TestClient(app)


@pytest.fixture(autouse=True)
def init_db():
    SupplierService.init_tables()


def test_list_suppliers_returns_scorecards():
    """Verify supplier directory returns all Indian mills and traders with scorecards."""
    response = client.get("/api/suppliers")
    assert response.status_code == 200
    data = response.json()
    assert "suppliers" in data
    suppliers = data["suppliers"]
    assert len(suppliers) >= 5

    mill_names = [s["name"] for s in suppliers]
    assert any("Tata Steel" in name for name in mill_names)
    assert any("SAIL" in name or "Steel Authority" in name for name in mill_names)
    assert any("JSW Steel" in name for name in mill_names)
    assert any("Apex Steel" in name for name in mill_names)

    # Check metrics structure
    for s in suppliers:
        assert "rating_grade" in s
        assert s["rating_grade"] in ["A", "B", "C", "D"]
        assert "missing_melt_pour_pct" in s
        assert "low_confidence_ocr_pct" in s
        assert "avg_turnaround_days" in s
        assert "trend_monthly_defect_pct" in s
        assert isinstance(s["trend_monthly_defect_pct"], list)
        assert len(s["trend_monthly_defect_pct"]) >= 3
        assert "typical_grades" in s
        assert isinstance(s["typical_grades"], list)


def test_get_supplier_details():
    """Verify specific supplier details lookup."""
    response = client.get("/api/suppliers/sup_tata_steel")
    assert response.status_code == 200
    supplier = response.json()
    assert supplier["id"] == "sup_tata_steel"
    assert supplier["rating_grade"] == "A"
    assert supplier["missing_melt_pour_pct"] <= 5.0
    assert "tata_tsj" in supplier["layout_fingerprint"]


def test_get_supplier_details_not_found():
    """Verify 404 on nonexistent supplier."""
    response = client.get("/api/suppliers/sup_nonexistent_xyz")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_po_matching_within_tolerance():
    """Verify PO matching within 2% allowable margin results in MATCHED."""
    payload = {
        "po_number": "PO-2026-TS-001",
        "supplier_id": "sup_tata_steel",
        "heat_number": "TSJ-26-9021",
        "ordered_grade": "ASTM A106 Gr. B",
        "expected_weight_kg": 25000.0,
        "received_weight_kg": 25250.0,  # +1.0% (within 2.0%)
        "tolerance_pct": 2.0
    }
    response = client.post("/api/suppliers/match-po", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "MATCHED"
    assert res["is_matched"] is True
    assert res["discrepancy_kg"] == 250.0
    assert res["discrepancy_pct"] == 1.0


def test_po_matching_exceeding_tolerance_flags_discrepancy():
    """Verify PO matching exceeding 2% margin flags DISCREPANCY_FLAGGED."""
    payload = {
        "po_number": "PO-2026-SAIL-002",
        "supplier_id": "sup_sail_bokaro",
        "heat_number": "SAIL-BO-8812",
        "ordered_grade": "IS 2062 E250BR",
        "expected_weight_kg": 25000.0,
        "received_weight_kg": 26100.0,  # +1100 kg = +4.4% (exceeds 2.0%)
        "tolerance_pct": 2.0
    }
    response = client.post("/api/suppliers/match-po", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "DISCREPANCY_FLAGGED"
    assert res["is_matched"] is False
    assert res["discrepancy_kg"] == 1100.0
    assert res["discrepancy_pct"] == 4.4
    assert "exceeds" in res["message"].lower()


def test_generate_supplier_correction_request():
    """Verify 'Ask supplier to fix' generates precise WhatsApp and Email notices."""
    payload = {
        "supplier_id": "sup_sail_bokaro",
        "cert_number": "MTC-IN-SAIL-4028",
        "heat_number": "SAIL-BO-8812",
        "defect_type": "MISSING_MELT_COUNTRY",
        "exporter_name": "Howrah Precision Forgings Pvt. Ltd."
    }
    response = client.post("/api/suppliers/correction-request", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "whatsapp_message" in res
    assert "email_subject" in res
    assert "email_body" in res

    # WhatsApp assertions
    assert "MTC Number:* MTC-IN-SAIL-4028" in res["whatsapp_message"]
    assert "Heat Number:* SAIL-BO-8812" in res["whatsapp_message"]
    assert "EU Regulation 2026/1963" in res["whatsapp_message"] or "ISO 3166" in res["whatsapp_message"]
    assert "https://heatledger.ai/upload" in res["whatsapp_message"]

    # Email assertions
    assert "MTC-IN-SAIL-4028" in res["email_subject"]
    assert "Howrah Precision Forgings" in res["email_body"]
    assert "Rotterdam/Hamburg" in res["email_body"] or "customs" in res["email_body"].lower()


def test_learned_layout_templates():
    """Verify deterministic layout fingerprints per mill are returned."""
    response = client.get("/api/suppliers/templates")
    assert response.status_code == 200
    data = response.json()
    assert "templates" in data
    templates = data["templates"]
    assert len(templates) >= 3

    fingerprints = [t["fingerprint"] for t in templates]
    assert any("tata" in fp for fp in fingerprints)
    assert any("sail" in fp for fp in fingerprints)
    assert any("jsw" in fp for fp in fingerprints)

    for t in templates:
        assert "confidence_score" in t
        assert t["confidence_score"] > 80.0
        assert "review_time_reduction_pct" in t
        assert t["review_time_reduction_pct"] > 0
