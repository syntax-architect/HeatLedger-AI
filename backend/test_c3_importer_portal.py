"""
TEST SUITE: Prompt C3 - Free Importer Portal and Verify Page
Validates:
1. Public unauthenticated share link generation and viewing
2. Cryptographic seal check recomputing match and disclaimer
3. Tamper detection: modifying stored PDF bytes fails seal check
4. Revoked links return 404
5. Importer actions: comments, missing document request, mark received
6. Free importer account multi-pack listing
7. Supplier invite banner with explicit consent
"""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.importer_portal_service import ImporterPortalService
from backend.melt_and_pour_service import MeltAndPourService


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_store():
    ImporterPortalService.reset_store()


def sample_sealed_pack():
    shipment_data = {
        "shipment_id": "SHP-2026-EU-TEST",
        "plant_name": "Tata Special Steels Ltd",
        "importer_name": "Salzgitter AG",
        "destination_country": "DE",
        "invoice_number": "INV-2026-901",
        "lines": [
            {
                "line_id": "L1",
                "heat_number": "HT-101",
                "lot_number": "LOT-A",
                "cn_code": "7208 10 00",
                "tonnes": 25.0,
                "container_number": "CONT-1"
            }
        ],
        "heats": [
            {
                "heat_number": "HT-101",
                "certificate": {
                    "certificate_id": "MTC-9001",
                    "country_of_melt": "India",
                    "country_of_pour": "India",
                    "has_pour_country": True
                }
            }
        ]
    }
    sealed = MeltAndPourService.seal_evidence_pack(
        shipment_data=shipment_data,
        signer_name="Dr. K. Sengupta",
        signer_role="Senior Metallurgical Inspector"
    )
    return sealed.model_dump()


def test_c3_01_create_share_link_and_open_unauthenticated():
    """Confirms an importer can open the pack link without creating an account or logging in."""
    pack = sample_sealed_pack()
    pdf_bytes = MeltAndPourService.generate_pack_pdf(pack)

    link_info = ImporterPortalService.create_share_link(
        pack_data=pack,
        pdf_bytes=pdf_bytes,
        expiry_days=30,
        importer_email="procurement@salzgitter.de"
    )
    token = link_info["token"]

    # Open unauthenticated
    opened = ImporterPortalService.get_pack_by_token(token, client_country="DE")
    assert opened["pack"]["shipment_id"] == pack["shipment_id"]
    assert opened["open_count"] == 1
    assert "not a legal verification" in opened["statutory_line"].lower()


def test_c3_02_cryptographic_seal_verification_match():
    """Confirms seal verification succeeds and presents statutory non-verification disclaimer."""
    pack = sample_sealed_pack()
    pdf_bytes = MeltAndPourService.generate_pack_pdf(pack)

    link_info = ImporterPortalService.create_share_link(pack_data=pack, pdf_bytes=pdf_bytes)
    token = link_info["token"]

    result = ImporterPortalService.verify_portal_seal(token)
    assert result["verified"] is True
    assert result["match"] is True
    assert "This seal shows the file has not changed since sealing." in result["disclaimer"]


def test_c3_03_tamper_detection_fails_seal():
    """Editing stored PDF bytes in test causes seal verification to fail immediately."""
    pack = sample_sealed_pack()
    pdf_bytes = MeltAndPourService.generate_pack_pdf(pack)

    link_info = ImporterPortalService.create_share_link(pack_data=pack, pdf_bytes=pdf_bytes)
    token = link_info["token"]

    # Tamper with stored document bytes
    bogus_bytes = pdf_bytes + b"\n%MALICIOUS_ALTERATION_BY_ATTACKER"
    ImporterPortalService.tamper_pdf_bytes_for_testing(token, bogus_bytes)

    result = ImporterPortalService.verify_portal_seal(token)
    assert result["verified"] is False
    assert result["match"] is False
    assert "tamper detected" in result["reason"].lower()


def test_c3_04_revoked_link_returns_404():
    """Revoking a share link causes immediate 404 on access."""
    pack = sample_sealed_pack()
    link_info = ImporterPortalService.create_share_link(pack_data=pack)
    token = link_info["token"]

    # Revoke
    success = ImporterPortalService.revoke_share_link(token)
    assert success is True

    # Try accessing
    with pytest.raises(KeyError):
        ImporterPortalService.get_pack_by_token(token)


def test_c3_05_importer_actions_comment_and_missing_doc():
    """Importer can comment, request missing documentation, and mark shipment received."""
    pack = sample_sealed_pack()
    link_info = ImporterPortalService.create_share_link(pack_data=pack)
    token = link_info["token"]

    # 1. Add comment
    c = ImporterPortalService.add_importer_comment(
        token=token,
        commenter_name="Hans Gruber (Customs Broker)",
        message="Please confirm whether HS 72081000 quota applies under UK or EU CBAM."
    )
    assert c["author"] == "Hans Gruber (Customs Broker)"

    # 2. Request missing document
    req = ImporterPortalService.request_missing_document(
        token=token,
        heat_number="HT-101",
        missing_item="Mill origin letter for pour coordinates",
        note="Customs at Antwerp requested signed mill letter."
    )
    assert req["heat_number"] == "HT-101"
    assert req["status"] == "OPEN"

    # 3. Mark received
    rec = ImporterPortalService.mark_received(token=token, received_by="Salzgitter Warehouse Team")
    assert rec["receipt_status"] == "ACCEPTED"


def test_c3_06_supplier_invite_requires_consent():
    """'Do your other suppliers send you packs like this? Invite them.' requires consent."""
    pack = sample_sealed_pack()
    link_info = ImporterPortalService.create_share_link(pack_data=pack)
    token = link_info["token"]

    # Without consent: must fail
    with pytest.raises(ValueError, match="consent"):
        ImporterPortalService.invite_other_supplier(
            token=token,
            supplier_email="sales@rivalsteel.com",
            supplier_name="Rival Steel Corp",
            importer_consent=False
        )

    # With consent: succeeds
    invite = ImporterPortalService.invite_other_supplier(
        token=token,
        supplier_email="sales@rivalsteel.com",
        supplier_name="Rival Steel Corp",
        importer_consent=True,
        importer_name="Salzgitter AG"
    )
    assert invite["status"] == "sent"
    assert invite["recipient_email"] == "sales@rivalsteel.com"


def test_c3_07_api_importer_portal_endpoints(test_client):
    """Hits FastAPI endpoints for importer portal."""
    pack = sample_sealed_pack()
    pdf_bytes = MeltAndPourService.generate_pack_pdf(pack)
    link_info = ImporterPortalService.create_share_link(
        pack_data=pack,
        pdf_bytes=pdf_bytes,
        importer_email="importer@germany.de"
    )
    token = link_info["token"]

    # 1. GET pack
    res = test_client.get(f"/api/importer-portal/{token}", headers={"CF-IPCountry": "DE"})
    assert res.status_code == 200
    assert res.json()["pack"]["shipment_id"] == pack["shipment_id"]

    # 2. Verify seal
    res_seal = test_client.post(f"/api/importer-portal/{token}/verify-seal")
    assert res_seal.status_code == 200
    assert res_seal.json()["verified"] is True

    # 3. Add comment
    res_com = test_client.post(f"/api/importer-portal/{token}/comment", json={
        "author": "Klaus Schmidt",
        "message": "Documents verified for Antwerp customs."
    })
    assert res_com.status_code == 200

    # 4. Request missing document
    res_doc = test_client.post(f"/api/importer-portal/{token}/request-missing-doc", json={
        "heat_number": "HT-101",
        "missing_item": "Supplemental mill letter",
        "note": "Required by customs"
    })
    assert res_doc.status_code == 200

    # 5. Mark received
    res_recv = test_client.post(f"/api/importer-portal/{token}/mark-received", json={
        "received_by": "Klaus Schmidt",
        "notes": "Cleared customs"
    })
    assert res_recv.status_code == 200
    assert res_recv.json()["receipt_status"] == "ACCEPTED"

    # 6. Download PDF
    res_pdf = test_client.get(f"/api/importer-portal/{token}/download-pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"

    # 7. List account packs
    res_acc = test_client.get("/api/importer-portal/accounts/importer@germany.de/packs")
    assert res_acc.status_code == 200
    assert res_acc.json()["count"] == 1

    # 8. Delete / Revoke
    res_del = test_client.delete(f"/api/importer-portal/{token}")
    assert res_del.status_code == 200

    # 9. Access after revoke -> 404
    res_404 = test_client.get(f"/api/importer-portal/{token}")
    assert res_404.status_code == 404
