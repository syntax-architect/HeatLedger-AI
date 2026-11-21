"""
HEATLEDGER AI: Prompt H3 Test Suite
Specification: Honest certificates, real Ed25519 signatures, untouched byte-identical originals,
separate divider convenience copies, public verification without commercial data, and tamper detection.
"""

import hashlib
import io
import json
import os
import time
import zipfile

import pymupdf as fitz
from fastapi.testclient import TestClient

os.environ["TRUST_PROXY"] = "true"
from auth_service import AuthService
from crypto_signing import CryptoSigningService
from dossier_generator import DossierGenerator, resolve_country_and_iso
from main import app

client = TestClient(app)


def test_h3_1_cover_certificate_draft_watermark_when_unsigned():
    """Unsigned certificate must render DRAFT diagonal watermark."""
    pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
        company_name="Test Steel Works Ltd.",
        eu_installation_id="DE-ST-1234",
        invoice_number="EXP-2026-DRAFT",
        cn_code="73072100",
        heat_number="HEAT-881",
        upstream_mill="Salzgitter Flachstahl GmbH",
        country_of_melt="GERMANY",
        chemistry={"C": 0.18, "Mn": 1.20, "Si": 0.30},
        mechanics={"Yield Strength": "355 MPa"},
        is_signed=False
    )
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    assert "DRAFT - PENDING QA INSPECTOR SIGNATURE" in text
    assert "STATUS: DRAFT" in text
    assert "STATUS: UNVERIFIED DRAFT" in text


def test_h3_2_cover_certificate_no_fake_stamps_or_hardcoded_text():
    """Removes QA PASSED stamp, WORKS: LILUAH, ISO 3166-1: IN, and NABL ACCREDITED."""
    pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
        company_name="Nordic Forgings AB",
        eu_installation_id="SE-NF-9901",
        invoice_number="EXP-2026-SE01",
        cn_code="73079100",
        heat_number="HEAT-SE-101",
        upstream_mill="SSAB Oxelosund",
        country_of_melt="SWEDEN",
        chemistry={"C": 0.15, "Mn": 1.40, "Si": 0.25},
        mechanics={"Tensile Strength": "490 MPa"},
        is_signed=True,
        qa_inspector_name="Lars Andersson",
        qa_emp_id="QA-SE-09"
    )
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = doc[0].get_text()

    # Must NOT contain forbidden legacy strings
    assert "WORKS: LILUAH / HOWRAH" not in text
    assert "ISO 3166-1: IN" not in text
    assert "QA PASSED" not in text  # Circle stamp removed
    assert "NABL ACCREDITED" not in text  # Removed unless explicitly declared
    assert "SWEDEN (ISO 3166-1: SE)" in text


def test_h3_3_mechanical_rows_honest_status():
    """Mechanical rows must show PASS, FAIL, or NOT PROVIDED from the engine, not hardcoded PASS."""
    # Test with FAIL status and NOT PROVIDED
    pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
        company_name="Precision Engineering Ltd.",
        eu_installation_id="EU-PE-4411",
        invoice_number="EXP-2026-FAIL-TEST",
        cn_code="7307",
        heat_number="HEAT-992",
        upstream_mill="Nippon Steel Corp",
        country_of_melt="JAPAN",
        chemistry={"C": 0.20},
        mechanics={
            "Tensile Strength": "390 MPa",  # Below 485 MPa min -> FAIL
            "Elongation": ""                # Missing -> NOT PROVIDED
        },
        mech_status={
            "Tensile Strength": "FAIL",
            "Elongation": "NOT PROVIDED"
        },
        is_signed=True
    )
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = doc[0].get_text()
    assert "FAIL" in text
    assert "NOT PROVIDED" in text


def test_h3_4_country_iso_lookup_never_defaults_to_india():
    """Country ISO lookup maps correctly and returns unconfirmed if missing; never defaults to India."""
    c_name, c_iso = resolve_country_and_iso("Germany")
    assert c_name == "GERMANY" and c_iso == "DE"

    c_name, c_iso = resolve_country_and_iso("Japan")
    assert c_name == "JAPAN" and c_iso == "JP"

    c_name, c_iso = resolve_country_and_iso("Spain")
    assert c_name == "SPAIN" and c_iso == "ES"

    c_name, c_iso = resolve_country_and_iso("")
    assert c_iso == "--" and c_name == "UNCONFIRMED"
    assert c_iso != "IN"


def test_h3_5_ed25519_digital_signature_and_versioning():
    """Ed25519 asymmetric signature creation and version increment on re-signing."""
    # Step-up inspector via authentic RFC 6238 TOTP
    totp = AuthService.get_current_totp_for_user("usr_qa_04")
    AuthService.verify_step_up_mfa("usr_qa_04", totp)

    sample_doc = fitz.open()
    sample_doc.new_page()
    raw_pdf_bytes = sample_doc.write()

    invoice = f"EXP-2026-TEST-{int(time.time())}"

    # Sign Version 1
    sig_v1 = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="usr_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_INSPECTOR",
        organization_id="org_howrah_steel_01",
        invoice_number=invoice,
        heat_numbers=["HEAT-A01"],
        pdf_bytes=raw_pdf_bytes
    )
    assert sig_v1["version"] == 1
    assert sig_v1["status"] == "VALID"
    assert sig_v1["verification_code"].startswith("HL-")
    assert "signature_b64" in sig_v1
    assert "public_key_b64" in sig_v1

    # Re-signing the same invoice creates Version 2 and marks Version 1 as SUPERSEDED
    sig_v2 = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="usr_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_INSPECTOR",
        organization_id="org_howrah_steel_01",
        invoice_number=invoice,
        heat_numbers=["HEAT-A01", "HEAT-A02"],
        pdf_bytes=raw_pdf_bytes
    )
    assert sig_v2["version"] == 2
    assert sig_v2["status"] == "VALID"

    # Verify v1 is now SUPERSEDED in database
    v1_record = CryptoSigningService.lookup_signature(sig_v1["verification_code"])
    assert v1_record["status"] == "SUPERSEDED"
    assert v1_record["superseded_by"] == sig_v2["signature_id"]


def test_h3_6_primary_zip_package_byte_identical_original():
    """ZIP package deliverable must preserve upstream original byte-for-byte identical."""
    # Create distinct original mock bytes
    original_upstream_bytes = b"%PDF-1.4\n%AUTHENTIC_UPSTREAM_MILL_TEST_CERTIFICATE_FORENSIC_ORIGINAL\n%%EOF"
    orig_sha256 = hashlib.sha256(original_upstream_bytes).hexdigest()

    cover_pdf = fitz.open()
    cover_pdf.new_page()
    cover_bytes = cover_pdf.write()

    sig_record = {
        "verification_code": "HL-2026-TESTZIP",
        "signer_name": "R. K. Chatterjee",
        "signer_role": "QA_INSPECTOR",
        "key_id": "ed25519_2026_test"
    }

    zip_bytes = DossierGenerator.generate_clause6_dossier_zip(
        cover_pdf_bytes=cover_bytes,
        upstream_mill_pdf_bytes=original_upstream_bytes,
        invoice_number="EXP-2026-ZIP1",
        heat_number="HEAT-BYTE-MATCH",
        validation_report={"status": "PASS"},
        cbam_data_sheet={"see": 1.93},
        signature_record=sig_record
    )

    # Inspect ZIP contents
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        namelist = zf.namelist()
        assert "Signed_Cover_Certificate_EXP-2026-ZIP1.pdf" in namelist
        assert "Original_Mill_Certificate_HEAT-BYTE-MATCH.pdf" in namelist
        assert "MANIFEST.json" in namelist
        assert "validation_report.json" in namelist
        assert "cbam_data_sheet.json" in namelist
        assert "VERIFICATION_INFO.txt" in namelist

        # Verify byte identity
        extracted_upstream = zf.read("Original_Mill_Certificate_HEAT-BYTE-MATCH.pdf")
        assert extracted_upstream == original_upstream_bytes
        extracted_sha256 = hashlib.sha256(extracted_upstream).hexdigest()
        assert extracted_sha256 == orig_sha256

        # Check MANIFEST.json matches
        manifest = json.loads(zf.read("MANIFEST.json").decode("utf-8"))
        upstream_entry = next(f for f in manifest["files"] if f["type"] == "UPSTREAM_MILL_ORIGINAL")
        assert upstream_entry["sha256"] == orig_sha256
        assert upstream_entry["byte_identical_to_upload"] is True


def test_h3_7_unsigned_draft_cannot_be_packaged():
    """Packaging endpoint rejects unsigned draft with HTTP 400."""
    cover_meta = {
        "company_name": "Howrah Precision Forgings",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-UNSIGNED",
        "cn_code": "73079100",
        "heat_number": "HEAT-UNSIGNED",
        "upstream_mill": "Tata Steel",
        "country_of_melt": "India",
        "chemistry": {"C": 0.22},
        "mechanics": {"Tensile Strength": "512 MPa"},
        "qa_inspector_name": "Pending",
        "qa_emp_id": "QA-00",
        "compliance_mode": "TRANSFORMED_3_1",
        "is_signed": False,
        "is_demo": False
    }

    dummy_doc = fitz.open()
    dummy_doc.new_page()
    dummy_bytes = dummy_doc.write()

    res = client.post(
        "/api/dossier/generate-package",
        data={"cover_meta": json.dumps(cover_meta)},
        files={"upstream_pdf": ("upstream.pdf", dummy_bytes, "application/pdf")},
        headers={"X-Forwarded-For": "10.0.3.1"}
    )
    assert res.status_code == 400
    assert "unsigned draft" in res.text.lower()


def test_h3_8_merged_pdf_convenience_copy_separate_divider():
    """Convenience merged PDF must insert a separate divider page and not overprint upstream pages."""
    cover_doc = fitz.open()
    cover_doc.new_page()
    cover_bytes = cover_doc.write()

    upstream_doc = fitz.open()
    page = upstream_doc.new_page()
    page.insert_text(fitz.Point(100, 100), "RAW_UPSTREAM_PAGE_CONTENT_DO_NOT_ALTER", fontsize=10)
    upstream_bytes = upstream_doc.write()

    merged_bytes = DossierGenerator.compile_merged_clause6_dossier(
        cover_pdf_bytes=cover_bytes,
        upstream_mill_pdf_bytes=upstream_bytes,
        invoice_number="EXP-2026-DIVIDER-TEST",
        heat_number="HEAT-DIV-01"
    )

    merged_doc = fitz.open(stream=merged_bytes, filetype="pdf")
    # Total pages must be: 1 (cover) + 1 (divider) + 1 (upstream) = 3 pages
    assert len(merged_doc) == 3

    # Page 1: Cover
    merged_doc[0].get_text()

    # Page 2: Dedicated Divider Page
    p2_text = merged_doc[1].get_text()
    assert "CONVENIENCE MERGED COPY - SEPARATE DIVIDER PAGE" in p2_text
    assert "ANNEX A: ORIGINAL UPSTREAM MILL TEST CERTIFICATE" in p2_text

    # Page 3: Upstream Page — untouched!
    p3_text = merged_doc[2].get_text()
    assert "RAW_UPSTREAM_PAGE_CONTENT_DO_NOT_ALTER" in p3_text
    # No header text drawn directly on page 3
    assert "CONVENIENCE MERGED COPY" not in p3_text


def test_h3_9_tamper_detection_on_verify_page():
    """Altering even one byte in a signed PDF causes cryptographic tamper verification to fail."""
    # 1. Sign a PDF
    doc = fitz.open()
    doc.new_page()
    original_pdf_bytes = doc.write()

    sig = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="usr_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_INSPECTOR",
        organization_id="org_howrah_steel_01",
        invoice_number="EXP-2026-TAMPER-TEST",
        heat_numbers=["HEAT-T1"],
        pdf_bytes=original_pdf_bytes
    )
    v_code = sig["verification_code"]

    # Verify original passes
    res_orig = CryptoSigningService.verify_pdf_tamper_and_signature(original_pdf_bytes, v_code)
    assert res_orig["verified"] is True
    assert res_orig["tampered"] is False

    # 2. Tamper with one single byte in the PDF
    tampered_bytes = bytearray(original_pdf_bytes)
    tampered_bytes[-1] ^= 0x01  # Flip one bit in last byte
    tampered_bytes = bytes(tampered_bytes)

    # Verification must catch the tamper
    res_tampered = CryptoSigningService.verify_pdf_tamper_and_signature(tampered_bytes, v_code)
    assert res_tampered["verified"] is False
    assert res_tampered["tampered"] is True
    assert res_tampered["status"] == "TAMPERED"
    assert "tamper detected" in res_tampered["error"].lower()

    # 3. Test through public API endpoint /api/verify/check-file
    res_api = client.post(
        "/api/verify/check-file",
        files={"file": ("tampered.pdf", tampered_bytes, "application/pdf")},
        headers={"X-Forwarded-For": "10.0.3.9"}
    )
    assert res_api.status_code == 200
    check_data = res_api.json()
    assert check_data["tampered"] is True


def test_h3_10_dispatch_user_cannot_sign_certificates():
    """A DISPATCH user calling the signing endpoint receives HTTP 403 Forbidden."""
    res_login = client.post("/api/auth/login", json={
        "email": "dispatch@howrahsteel.in",
        "password": "DispatchPassword2026!"
    }, headers={"X-Forwarded-For": "10.0.3.10"})
    token = res_login.json()["token"]

    res_sign = client.post("/api/dossier/sign-certificate", json={
        "invoice_number": "EXP-2026-DISP-TRY",
        "heat_number": "HEAT-DISP",
        "total_see": 1.93
    }, headers={
        "Authorization": f"Bearer {token}",
        "X-Forwarded-For": "10.0.3.10"
    })
    assert res_sign.status_code == 403
    assert "QA_INSPECTOR" in res_sign.text or "Forbidden" in res_sign.text
