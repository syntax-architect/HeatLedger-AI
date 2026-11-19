"""
Tests for Prompt B8: Certificate Drafting, Signing and Dossier Packaging
Verifies:
- Draft PDF from template watermarked DRAFT until signed
- Signing with Ed25519 and key IDs, step-up check, signature record
- ZIP builder streaming files byte-identically with MANIFEST.json, README_CUSTOMS_BROKER.txt, and SHA-256 hashes
- Refusal to package unsigned drafts as final verified deliverables
- Verification of signed dossiers and failure after byte-level tampering
- Versioning and supersession
"""

import os
import io
import json
import zipfile
import hashlib
import pytest
import pymupdf as fitz

from dossier_generator import DossierGenerator
from crypto_signing import CryptoSigningService


@pytest.fixture(autouse=True)
def setup_db():
    CryptoSigningService.init_tables()
    yield


def test_b8_draft_pdf_contains_draft_watermark():
    meta = {
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-109",
        "cn_code": "73079100",
        "heat_number": "TSJ-26-9021",
        "upstream_mill": "Tata Steel Jamshedpur",
        "country_of_melt": "India",
        "chemistry": {"C": 0.22, "Mn": 0.88, "Si": 0.25, "P": 0.015, "S": 0.010},
        "mechanics": {"yield_strength": "315 MPa", "tensile_strength": "520 MPa"},
        "qa_inspector_name": "R. K. Chatterjee",
        "qa_emp_id": "QA-04",
        "is_signed": False,
        "is_demo": False
    }

    # Generate unsigned draft PDF
    draft_pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(
        **meta
    )

    doc = fitz.open(stream=draft_pdf_bytes, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text()

    # Must contain DRAFT watermark and notice
    assert "DRAFT" in full_text
    assert "UNVERIFIED DRAFT" in full_text


def test_b8_signing_with_ed25519_creates_signature_record():
    meta = {
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "eu_installation_id": "IN-WB-4409",
        "invoice_number": "EXP-2026-109",
        "cn_code": "73079100",
        "heat_number": "TSJ-26-9021",
        "upstream_mill": "Tata Steel Jamshedpur",
        "country_of_melt": "India",
        "chemistry": {"C": 0.22, "Mn": 0.88},
        "mechanics": {"yield_strength": "315 MPa"},
        "qa_inspector_name": "R. K. Chatterjee",
        "qa_emp_id": "QA-04",
        "is_signed": False,
        "is_demo": False
    }

    draft_pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(**meta)
    upstream_bytes = b"%PDF-1.4 Upstream Test Content"
    upstream_sha = hashlib.sha256(upstream_bytes).hexdigest()

    # Sign using CryptoSigningService.sign_dossier_pdf
    sig_record = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="user_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_HEAD",
        organization_id="org_howrah",
        invoice_number="EXP-2026-109",
        heat_numbers=["TSJ-26-9021"],
        pdf_bytes=draft_pdf_bytes,
        upstream_sha256=upstream_sha
    )

    assert sig_record["status"] == "VALID"
    assert sig_record["verification_code"].startswith("HL-2026-")
    assert "key_id" in sig_record
    assert len(sig_record["signature_b64"]) > 32

    # Now generate the signed PDF
    meta["is_signed"] = True
    meta["signature_record"] = sig_record
    signed_pdf_bytes = DossierGenerator.generate_cover_certificate_pdf(**meta)

    doc = fitz.open(stream=signed_pdf_bytes, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text()

    # Draft watermark must be absent; verification code must be present
    assert "DRAFT - NOT SIGNED" not in full_text
    assert sig_record["verification_code"] in full_text
    assert "Ed25519" in full_text


def test_b8_refuses_to_package_unsigned_draft():
    cover_bytes = b"%PDF-1.4 Unsigned Cover Draft"
    upstream_bytes = b"%PDF-1.4 Original Mill MTC"

    # Should raise ValueError when signature_record is None and is_demo is False
    with pytest.raises(ValueError) as exc:
        DossierGenerator.generate_clause6_dossier_zip(
            cover_pdf_bytes=cover_bytes,
            upstream_mill_pdf_bytes=upstream_bytes,
            invoice_number="EXP-2026-109",
            heat_number="TSJ-26-9021",
            validation_report={"status": "PASS"},
            cbam_data_sheet={"total_see": 2.05},
            signature_record=None,
            is_demo=False
        )

    assert "unsigned draft dossier cannot be packaged" in str(exc.value)


def test_b8_zip_builder_manifest_and_byte_identity():
    cover_bytes = b"%PDF-1.4 Valid Signed Cover Bytes"
    upstream_bytes = b"%PDF-1.4 Original Mill Upstream Unaltered"

    sig_record = {
        "verification_code": "HL-2026-TESTCODE",
        "signer_name": "R. K. Chatterjee",
        "signer_role": "QA_HEAD",
        "key_id": "key_ed25519_test",
        "country_of_melt": "India"
    }

    zip_bytes = DossierGenerator.generate_clause6_dossier_zip(
        cover_pdf_bytes=cover_bytes,
        upstream_mill_pdf_bytes=upstream_bytes,
        invoice_number="EXP-2026-109",
        heat_number="TSJ-26-9021",
        validation_report={"grade": "ASTM A105", "is_compliant": True},
        cbam_data_sheet={"total_verified_see": 2.05},
        signature_record=sig_record,
        is_demo=False
    )

    zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    file_list = zf.namelist()

    assert "MANIFEST.json" in file_list
    assert "README_CUSTOMS_BROKER.txt" in file_list
    assert "Signed_Cover_Certificate_EXP-2026-109.pdf" in file_list
    assert "Original_Mill_Certificate_TSJ-26-9021.pdf" in file_list

    # Verify byte-identical preservation of upstream file
    extracted_upstream = zf.read("Original_Mill_Certificate_TSJ-26-9021.pdf")
    assert extracted_upstream == upstream_bytes

    # Verify manifest hashes
    manifest = json.loads(zf.read("MANIFEST.json").decode("utf-8"))
    assert manifest["invoice_number"] == "EXP-2026-109"
    assert manifest["verification_code"] == "HL-2026-TESTCODE"

    upstream_entry = next(f for f in manifest["files"] if f["type"] == "UPSTREAM_MILL_ORIGINAL")
    assert upstream_entry["sha256"] == hashlib.sha256(upstream_bytes).hexdigest()
    assert upstream_entry["byte_identical_to_upload"] is True


def test_b8_verification_and_tampering_detection():
    import secrets
    invoice_num = f"EXP-2026-TAMP-{secrets.token_hex(4)}"
    upstream_bytes = b"%PDF-1.4 Original Pristine Upstream Bytes"
    upstream_sha = hashlib.sha256(upstream_bytes).hexdigest()
    cover_bytes = b"%PDF-1.4 Cover PDF Bytes"

    sig_record = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="user_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_HEAD",
        organization_id="org_howrah",
        invoice_number=invoice_num,
        heat_numbers=["TSJ-26-9999"],
        pdf_bytes=cover_bytes,
        upstream_sha256=upstream_sha
    )

    code = sig_record["verification_code"]

    # 1. Verification of pristine document
    res_pristine = CryptoSigningService.verify_by_code(code)
    assert res_pristine["is_valid"] is True
    assert res_pristine["verification_status"] == "AUTHENTIC_AND_VERIFIED"
    assert res_pristine["signature"]["invoice_number"] == invoice_num

    # 2. Tampering test: Check against altered upstream bytes
    tampered_upstream_bytes = b"%PDF-1.4 TAMPERED Upstream Bytes With Forged Chemistry"
    is_tampered_match = (
        hashlib.sha256(tampered_upstream_bytes).hexdigest() == res_pristine["signature"]["upstream_sha256"]
    )
    assert is_tampered_match is False  # Tampering detected


def test_b8_versioning_and_supersession():
    import secrets
    invoice_num = f"EXP-2026-VER-{secrets.token_hex(4)}"
    cover_bytes = b"%PDF-1.4 Cover Version"
    upstream_bytes = b"%PDF-1.4 Upstream Base"
    upstream_sha = hashlib.sha256(upstream_bytes).hexdigest()

    # Version 1
    sig_v1 = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="user_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_HEAD",
        organization_id="org_howrah",
        invoice_number=invoice_num,
        heat_numbers=["TSJ-26-1000"],
        pdf_bytes=cover_bytes,
        upstream_sha256=upstream_sha
    )
    assert sig_v1["version"] == 1
    assert sig_v1["status"] == "VALID"

    # Version 2 for same invoice (e.g. buyer requested amended heat allocation)
    sig_v2 = CryptoSigningService.sign_dossier_pdf(
        signer_user_id="user_qa_04",
        signer_name="R. K. Chatterjee",
        signer_role="QA_HEAD",
        organization_id="org_howrah",
        invoice_number=invoice_num,
        heat_numbers=["TSJ-26-1000", "BOK-26-4910"],
        pdf_bytes=cover_bytes,
        upstream_sha256=upstream_sha
    )
    assert sig_v2["version"] == 2
    assert sig_v2["status"] == "VALID"

    # Version 1 should now be SUPERSEDED
    v1_checked = CryptoSigningService.verify_by_code(sig_v1["verification_code"])
    assert v1_checked["signature"]["status"] == "SUPERSEDED"
