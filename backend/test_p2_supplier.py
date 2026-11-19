"""
HEATLEDGER AI: Prompt P2 Test Suite
Supplier and Mill Intelligence Engine:
- Supplier directory & scorecards (missing melt/pour, OCR confidence < 85%, out of spec)
- Mill layout fingerprints
- Purchase order tonnage matching & rolling tolerance checks
- 'Ask supplier to fix' WhatsApp and email correction notices
"""

import os
import uuid
import pytest
from fastapi.testclient import TestClient

from main import app
from supplier_service import SupplierService, DEFAULT_SUPPLIERS

client = TestClient(app)


def test_p2_list_suppliers_and_scorecards():
    """
    Prompt P2: Verifies that suppliers are listed with complete scorecard metrics
    including missing melt/pour percentage, low OCR confidence, and repeat defects.
    """
    res = client.get("/api/suppliers")
    assert res.status_code == 200
    data = res.json()
    assert "suppliers" in data
    suppliers = data["suppliers"]
    assert len(suppliers) >= 4

    tata = next((s for s in suppliers if "Tata" in s["name"]), None)
    assert tata is not None
    assert tata["rating_grade"] == "A"
    assert "typical_grades" in tata
    assert len(tata["trend_monthly_defect_pct"]) > 0

    sail = next((s for s in suppliers if "SAIL" in s["name"]), None)
    assert sail is not None
    assert sail["missing_melt_pour_pct"] > 20.0  # SAIL has higher missing origin rate
    assert sail["rating_grade"] in ("C", "D")
    assert any("Melt-and-Pour" in defect for defect in sail["repeat_defects"])


def test_p2_supplier_details_and_layout_fingerprint():
    """
    Prompt P2: Verifies template learning fingerprints for deterministic field mapping.
    """
    res = client.get("/api/suppliers/sup_tata_steel")
    assert res.status_code == 200
    supplier = res.json()
    assert supplier["id"] == "sup_tata_steel"
    assert supplier["layout_fingerprint"] == "tata_tsj_rev4_bof_cc"
    assert "ASTM A106 Gr. B" in supplier["typical_grades"]


def test_p2_po_matching_within_tolerance():
    """
    Prompt P2: Purchase order matching within ±2.0% rolling margin passes.
    """
    po_num = f"PO-2026-{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/suppliers/match-po", json={
        "po_number": po_num,
        "supplier_id": "sup_tata_steel",
        "heat_number": "TSJ-26-9021",
        "ordered_grade": "ASTM A106 Gr. B",
        "expected_weight_kg": 25000.0,
        "received_weight_kg": 25250.0,  # +1.0% diff -> within 2% tolerance
        "tolerance_pct": 2.0
    })
    assert res.status_code == 200
    result = res.json()
    assert result["is_matched"] is True
    assert result["status"] == "MATCHED"
    assert result["discrepancy_kg"] == 250.0
    assert result["discrepancy_pct"] == 1.0


def test_p2_po_matching_discrepancy_flagged():
    """
    Prompt P2: Purchase order matching with > 2.0% weight mismatch is flagged.
    """
    po_num = f"PO-2026-{uuid.uuid4().hex[:6].upper()}"
    res = client.post("/api/suppliers/match-po", json={
        "po_number": po_num,
        "supplier_id": "sup_apex_traders",
        "heat_number": "APEX-26-110",
        "ordered_grade": "IS 2062 E250",
        "expected_weight_kg": 20000.0,
        "received_weight_kg": 18500.0,  # -7.5% diff -> exceeds 2% tolerance
        "tolerance_pct": 2.0
    })
    assert res.status_code == 200
    result = res.json()
    assert result["is_matched"] is False
    assert result["status"] == "DISCREPANCY_FLAGGED"
    assert result["discrepancy_pct"] == 7.5
    assert "exceeds" in result["message"]


def test_p2_ask_supplier_to_fix_whatsapp_and_email():
    """
    Prompt P2: 'Ask supplier to fix' generates actionable WhatsApp and formal email messages
    referencing exact EU regulations and deep link to vendor portal.
    """
    res = client.post("/api/suppliers/request-correction", json={
        "supplier_id": "sup_sail_bokaro",
        "cert_number": "MTC-IN-SAIL-4028",
        "heat_number": "SAIL-BO-8812",
        "defect_type": "MISSING_MELT_COUNTRY",
        "exporter_name": "Howrah Precision Forgings Pvt. Ltd."
    })
    assert res.status_code == 200
    notice = res.json()
    assert "whatsapp_message" in notice
    assert "email_body" in notice
    assert "MTC-IN-SAIL-4028" in notice["whatsapp_message"]
    assert "SAIL-BO-8812" in notice["whatsapp_message"]
    assert "Melt-and-Pour" in notice["whatsapp_message"]
    assert "https://heatledger.ai/upload" in notice["whatsapp_message"]
    assert "URGENT: Amendment Required for MTC" in notice["email_subject"]
    assert "Rotterdam/Hamburg" in notice["email_body"]
