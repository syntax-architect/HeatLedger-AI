"""
Tests for Prompt R4 (Prompt Pack v3): Correct Buyer Pack and Certificate Handling
Verifies:
1. Originals preserved byte-identical in ZIP with ZERO modifications or overprinting.
2. Byte-compare test proves exact byte-for-byte identity.
3. Summary shows 'Not on certificate' and 'SHIPMENT AT RISK' when melt-and-pour country is missing.
4. Product scope correctly uses data/regulatory.json (CN 7208-7306 in melt-and-pour scope; CN 7307 and 7318 CBAM-only).
5. Digital seal statement contains mandatory tamper-evidence disclaimer.
6. Heat to shipment ledger reconciliation supports split shipments and flags over-allocation.
7. 25 MB max pack size warning.
"""

import hashlib
import io
import json
import zipfile
import pytest
import pymupdf as fitz

from buyer_pack_service import (
    BuyerPackService,
    classify_cn_scope,
    reconcile_heat_ledger,
    MAX_PACK_BYTES_LIMIT,
)


@pytest.fixture
def sample_original_pdf() -> bytes:
    """Generates a clean test PDF to simulate an upstream mill test certificate."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text(fitz.Point(50, 100), "SAMPLE UPSTREAM MILL TEST CERTIFICATE 3.1", fontsize=14)
    page.insert_text(fitz.Point(50, 130), "Mill: Tata Steel Jamshedpur", fontsize=10)
    page.insert_text(fitz.Point(50, 150), "Heat Number: TSJ-26-9021", fontsize=10)
    page.insert_text(fitz.Point(50, 170), "Grade: S355JR", fontsize=10)
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes


def test_byte_compare_originals_unchanged(sample_original_pdf: bytes):
    """
    Prompt R4 Rule: Any change to an original is a bug.
    Proves that the original certificate extracted from the ZIP deliverable
    is 100% byte-for-byte identical to the original input file.
    """
    original_sha256 = hashlib.sha256(sample_original_pdf).hexdigest()
    original_len = len(sample_original_pdf)

    shipment_data = {
        "shipment_id": "EXP-2026-EU-001",
        "buyer_name": "Voestalpine Steel Trading AG",
        "destination_port": "Antwerp, BE",
        "invoice_number": "INV-2026-9481",
        "cn_code": "7214.20.00",
        "total_tonnes": 48.5,
    }
    heats_data = [
        {
            "heat_number": "TSJ-26-9021",
            "mill": "Tata Steel Jamshedpur",
            "grade": "S355JR",
            "allocated_tonnes": 48.5,
            "melt_and_pour_country": "INDIA",
            "certificate_sha256": original_sha256,
        }
    ]
    cert_files = [("TSJ-26-9021_MTC.pdf", sample_original_pdf)]

    sig_record = {
        "signer_name": "A. Mukherjee",
        "signer_role": "QA_INSPECTOR",
        "key_id": "ed25519_2026_test",
        "signed_at": "2026-11-21T10:00:00Z",
        "signature_b64": "TEST_SIGNATURE_BASE64_DATA",
        "verification_code": "HL-TEST-9021",
    }

    zip_bytes, zip_filename, size_warning, manifest = BuyerPackService.compile_buyer_pack_zip(
        shipment_data, heats_data, cert_files, sig_record, "HL-TEST-9021"
    )

    assert not size_warning
    assert zip_filename.startswith("EXP-2026-EU-001_")
    assert zip_filename.endswith(".zip")

    # Read the ZIP archive and extract the original file
    zip_buf = io.BytesIO(zip_bytes)
    with zipfile.ZipFile(zip_buf, "r") as zf:
        extracted_bytes = zf.read("originals/TSJ-26-9021_MTC.pdf")
        manifest_raw = zf.read("MANIFEST.json")
        manifest_data = json.loads(manifest_raw.decode("utf-8"))

    # STRICT BYTE COMPARISON ASSERTION
    assert extracted_bytes == sample_original_pdf, "Extracted original certificate is NOT byte-identical!"
    assert len(extracted_bytes) == original_len
    assert hashlib.sha256(extracted_bytes).hexdigest() == original_sha256

    # Verify manifest accurately asserts byte-identity
    cert_manifest = next(f for f in manifest_data["files"] if f["filename"] == "TSJ-26-9021_MTC.pdf")
    assert cert_manifest["byte_identical_to_upload"] is True
    assert cert_manifest["sha256"] == original_sha256


def test_summary_shows_not_on_certificate_for_missing_country(sample_original_pdf: bytes):
    """
    Prompt R4 Rule: If melt-and-pour country is not on the MTC, show 'Not on certificate'
    and mark the shipment at risk; do not fill it from guesses.
    """
    shipment_data = {
        "shipment_id": "EXP-2026-RISK-002",
        "buyer_name": "Salzgitter Mannesmann Handel",
        "destination_port": "Hamburg, DE",
        "invoice_number": "INV-2026-4412",
        "cn_code": "7216.32.00",
        "total_tonnes": 32.0,
    }
    # Heat with MISSING / UNKNOWN melt-and-pour country
    heats_data = [
        {
            "heat_number": "SAIL-BOK-4910",
            "mill": "SAIL Bokaro Steel Plant",
            "grade": "IS 2062 E250",
            "allocated_tonnes": 32.0,
            "melt_and_pour_country": None,  # MISSING
            "certificate_sha256": hashlib.sha256(sample_original_pdf).hexdigest(),
        }
    ]

    summary_bytes = BuyerPackService.generate_summary_page_pdf(
        shipment_data, heats_data, "HL-RISK-4910"
    )

    doc = fitz.open(stream=summary_bytes, filetype="pdf")
    text = doc[0].get_text()
    doc.close()

    # Assert 'Not on certificate' is printed verbatim
    assert "Not on certificate" in text, "Expected 'Not on certificate' when melt-and-pour country is missing"
    # Assert shipment is flagged AT RISK
    assert "SHIPMENT AT RISK" in text, "Expected 'SHIPMENT AT RISK' status banner"
    # Assert it did NOT default to India or another country
    assert "COUNTRY: INDIA" not in text.upper()


def test_cn_scope_classification_from_regulatory_data():
    """
    Prompt R4 Rule: Product scope uses data/regulatory.json:
    - CN 7208 to 7306 in melt-and-pour scope & CBAM scope
    - CN 7307 (fittings) and 7318 (fasteners) CBAM-only scope
    """
    # 7214: Rebars/bars -> In melt-and-pour scope & CBAM scope
    scope_7214 = classify_cn_scope("7214.20.00")
    assert scope_7214["in_melt_and_pour_scope"] is True
    assert scope_7214["in_cbam_scope"] is True

    # 7306: Welded pipes -> In melt-and-pour scope & CBAM scope
    scope_7306 = classify_cn_scope("7306.30.12")
    assert scope_7306["in_melt_and_pour_scope"] is True
    assert scope_7306["in_cbam_scope"] is True

    # 7307: Pipe fittings -> CBAM only, EXEMPT from melt-and-pour
    scope_7307 = classify_cn_scope("7307.91.00")
    assert scope_7307["in_melt_and_pour_scope"] is False
    assert scope_7307["in_cbam_scope"] is True
    assert "CBAM-Only" in scope_7307["scope_label"]

    # 7318: Screws, bolts, nuts -> CBAM only, EXEMPT from melt-and-pour
    scope_7318 = classify_cn_scope("7318.15.90")
    assert scope_7318["in_melt_and_pour_scope"] is False
    assert scope_7318["in_cbam_scope"] is True
    assert "CBAM-Only" in scope_7318["scope_label"]


def test_digital_seal_contains_mandatory_disclaimer():
    """
    Prompt R4 & Master Prompt Rule:
    'Our digital seal is a tamper-evidence feature, not a legal verification.
    Never write verified or certified next to it.'
    """
    shipment_data = {"shipment_id": "EXP-2026-SEAL-003"}
    sig_record = {
        "signer_name": "P. Ghosh",
        "signer_role": "QA_INSPECTOR",
        "key_id": "ed25519_2026_primary",
        "signed_at": "2026-11-21T11:00:00Z",
        "signature_b64": "SAMPLE_SIGNATURE_BYTES_B64",
    }
    seal_pdf = BuyerPackService.generate_seal_page_pdf(
        shipment_data, sig_record, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "HL-SEAL-003"
    )

    doc = fitz.open(stream=seal_pdf, filetype="pdf")
    seal_text = doc[0].get_text()
    doc.close()

    assert "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification." in seal_text
    assert "Prepares documents for review. Not legal advice." in seal_text


def test_heat_ledger_reconciliation_split_shipments():
    """
    Prompt R4 Rule: Heat to shipment ledger: quantities reconcile,
    split shipments supported, one heat can feed several shipments.
    """
    received_tonnes = 100.0

    allocations = [
        {"shipment_id": "EXP-001", "allocated_tonnes": 40.0},
        {"shipment_id": "EXP-002", "allocated_tonnes": 35.5},
    ]

    rec = reconcile_heat_ledger(received_tonnes, allocations)
    assert rec["total_received_tonnes"] == 100.0
    assert rec["total_allocated_tonnes"] == 75.5
    assert rec["remaining_tonnes"] == 24.5
    assert rec["is_overallocated"] is False

    # Allocate another 30 tonnes -> triggers over-allocation
    allocations.append({"shipment_id": "EXP-003", "allocated_tonnes": 30.0})
    rec_over = reconcile_heat_ledger(received_tonnes, allocations)
    assert rec_over["total_allocated_tonnes"] == 105.5
    assert rec_over["is_overallocated"] is True
    assert rec_over["overallocated_tonnes"] == 5.5


def test_combined_pdf_preserves_untouched_original_pages(sample_original_pdf: bytes):
    """
    Prompt R4 Rule: Single combined PDF option compiles:
    - Page 1: One-page summary with QR link
    - Page 2: Seal page with mandatory tamper-evidence disclaimer
    - Pages 3+: Untouched original certificates (zero overprinting, zero stamped text).
    """
    shipment_data = {
        "shipment_id": "EXP-2026-COMBINED-01",
        "buyer_name": "Salzgitter AG",
        "destination_port": "Rotterdam, NL",
        "invoice_number": "INV-2026-9901",
        "cn_code": "7214.20.00",
        "total_tonnes": 50.0,
    }
    heats_data = [
        {
            "heat_number": "HEAT-TSJ-9021",
            "mill": "Tata Steel",
            "grade": "S355JR",
            "allocated_tonnes": 50.0,
            "melt_and_pour_country": "INDIA",
            "certificate_sha256": hashlib.sha256(sample_original_pdf).hexdigest(),
        }
    ]
    cert_files = [("Tata_Steel_3.1_MTC.pdf", sample_original_pdf)]

    sig_record = {
        "signer_name": "P. Banerjee",
        "signer_role": "QA_INSPECTOR",
        "key_id": "ed25519_2026_test",
        "signed_at": "2026-11-22T10:00:00Z",
        "signature_b64": "SAMPLE_SIG",
        "verification_code": "HL-COMB-01",
    }

    combined_bytes, filename, size_warning = BuyerPackService.compile_buyer_pack_pdf(
        shipment_data, heats_data, cert_files, sig_record, "HL-COMB-01"
    )

    assert not size_warning
    assert filename.startswith("EXP-2026-COMBINED-01_")
    assert filename.endswith(".pdf")

    # Inspect combined PDF pages
    doc = fitz.open(stream=combined_bytes, filetype="pdf")
    assert doc.page_count >= 3, "Expected at least 3 pages (summary, seal, original MTC)"

    # Page 1: Summary page
    p1_text = doc[0].get_text()
    assert "HEATLEDGER AI · BUYER COMPLIANCE PACK" in p1_text
    assert "EXPORT SHIPMENT DOCUMENTARY SUMMARY" in p1_text
    assert "EXP-2026-COMBINED-01" in p1_text

    # Page 2: Seal page
    p2_text = doc[1].get_text()
    assert "AUTHORISED INSPECTOR DIGITAL SEAL" in p2_text
    assert "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification." in p2_text

    # Page 3: Original certificate (untouched)
    p3_text = doc[2].get_text()
    assert "SAMPLE UPSTREAM MILL TEST CERTIFICATE 3.1" in p3_text
    assert "Tata Steel Jamshedpur" in p3_text
    doc.close()


def test_max_pack_size_25mb_warning(monkeypatch, sample_original_pdf: bytes):
    """
    Prompt R4 Rule: Max pack size 25 MB with a warning flag.
    """
    import buyer_pack_service
    # Set limit low to verify warning threshold without allocating 25 MB in test
    monkeypatch.setattr(buyer_pack_service, "MAX_PACK_BYTES_LIMIT", 500)

    shipment_data = {
        "shipment_id": "EXP-2026-OVERSIZE-01",
        "buyer_name": "Big Steel Buyer",
        "destination_port": "Hamburg, DE",
        "invoice_number": "INV-2026-8888",
        "cn_code": "7208.10.00",
        "total_tonnes": 250.0,
    }
    heats_data = [
        {
            "heat_number": "H-OVERSIZE-01",
            "mill": "Mill Large",
            "grade": "Grade A",
            "allocated_tonnes": 250.0,
            "melt_and_pour_country": "INDIA",
            "certificate_sha256": "0" * 64,
        }
    ]
    cert_files = [("MTC.pdf", sample_original_pdf)]

    zip_bytes, zip_filename, size_warning, _ = BuyerPackService.compile_buyer_pack_zip(
        shipment_data, heats_data, cert_files, None, "HL-OVER-01"
    )

    assert size_warning is True, "Expected size_warning=True for payload exceeding threshold"


def test_portal_share_download_zip_and_pdf(sample_original_pdf: bytes):
    """
    Prompt R4 Rule: Portal downloads return authentic ZIP and combined PDF deliverables
    with correct headers and naming convention: <shipment_id>_<date>_<hash_prefix>.
    """
    from fastapi.testclient import TestClient
    from backend.main import app
    from backend.portal_service import PortalService

    client = TestClient(app)

    # Create share link
    link = PortalService.create_share_link(
        shipment_id="EXP-2026-DOWNLOAD-01",
        organization_id="org_howrah_steel_01",
        plant_id="plant-howrah-01"
    )
    token = link["token"]

    # 1. Download ZIP
    r_zip = client.get(f"/api/portal/share/{token}/download/zip")
    assert r_zip.status_code == 200
    assert r_zip.headers["content-type"] == "application/zip"
    cd_zip = r_zip.headers["content-disposition"]
    assert "EXP-2026-DOWNLOAD-01_" in cd_zip
    assert cd_zip.endswith('.zip"')

    # Verify extracted content is valid ZIP
    with zipfile.ZipFile(io.BytesIO(r_zip.content), "r") as zf:
        namelist = zf.namelist()
        assert "MANIFEST.json" in namelist
        assert any(n.endswith(".pdf") for n in namelist)

    # 2. Download combined PDF
    r_pdf = client.get(f"/api/portal/share/{token}/download/pdf")
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    cd_pdf = r_pdf.headers["content-disposition"]
    assert "EXP-2026-DOWNLOAD-01_" in cd_pdf
    assert cd_pdf.endswith('.pdf"')

