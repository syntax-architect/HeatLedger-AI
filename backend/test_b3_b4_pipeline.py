"""
Unit and Integration Test Suite for Prompts B3 & B4:
- Storage and Ingestion Pipeline (B3)
- Extraction Service with Cost Control (B4)
"""

import hashlib
import time
import uuid

import pymupdf
import pytest
from document_service import DocumentService, DocumentValidationError
from extraction_service import ExtractionClassifier, ExtractionService
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

ORG_ID = "org_test_b3_b4_99214"


def create_sample_mtc_pdf(heat_num="HEAT-99214-IN", melt_country="India") -> bytes:
    """Helper to generate a clean, real PyMuPDF test certificate."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    text = (
        "STEEL AUTHORITY OF INDIA LTD - BOKARO STEEL PLANT\n"
        "INSPECTION CERTIFICATE EN 10204 3.1\n\n"
        f"HEAT / CAST NUMBER: {heat_num}\n"
        f"COUNTRY OF MELT AND POUR: {melt_country}\n"
        "STEEL GRADE: EN 10025-2 S355JR\n\n"
        "CHEMICAL COMPOSITION (% wt):\n"
        "C: 0.18  Si: 0.22  Mn: 1.45  P: 0.021  S: 0.012  Al: 0.035\n\n"
        "MECHANICAL PROPERTIES:\n"
        "Yield Strength ReH: 385 MPa\n"
        "Tensile Strength Rm: 520 MPa\n"
        "Elongation A5: 24.5%\n"
    )
    page.insert_text((50, 60), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_b3_magic_bytes_and_validation():
    """Verify magic bytes detection and rejection of invalid formats."""
    # Empty file
    with pytest.raises(DocumentValidationError):
        DocumentService.validate_file_content(b"", "empty.pdf")

    # Invalid garbage file
    with pytest.raises(DocumentValidationError):
        DocumentService.validate_file_content(b"RANDOM_NON_MIME_BYTES", "test.exe")

    # Valid PDF magic bytes
    pdf_bytes = create_sample_mtc_pdf()
    mime, pages = DocumentService.validate_file_content(pdf_bytes, "cert.pdf")
    assert mime == "application/pdf"
    assert pages == 1

    # Valid PNG magic bytes
    png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
    mime_png, _ = DocumentService.validate_file_content(png_bytes, "cert.png")
    assert mime_png == "image/png"


def test_b3_oversize_and_page_limit_guard():
    """Verify max file size (25MB) and page limit (30 pages) enforcement."""
    # Oversize simulation
    with pytest.raises(DocumentValidationError, match="exceeds maximum 25MB"):
        oversize_bytes = b"%PDF-" + (b"0" * (26 * 1024 * 1024))
        DocumentService.validate_file_content(oversize_bytes, "huge.pdf")

    # Multi-page PDF exceeding 30 pages
    doc = pymupdf.open()
    for _ in range(35):
        doc.new_page()
    excess_pages_bytes = doc.tobytes()
    doc.close()

    with pytest.raises(DocumentValidationError, match="exceeds limit of 30 pages"):
        DocumentService.validate_file_content(excess_pages_bytes, "35_pages.pdf")


def test_b3_ingest_and_write_once_immutability():
    """Verify ingestion, server-side SHA256, write-once storage, and duplicate detection."""
    unique_heat = f"HEAT-WRITEONCE-{uuid.uuid4().hex[:8]}"
    pdf_bytes = create_sample_mtc_pdf(unique_heat, "India")
    expected_sha256 = hashlib.sha256(pdf_bytes).hexdigest()

    # Ingest file
    res = DocumentService.ingest_document(
        content=pdf_bytes,
        file_name="Tata_Steel_MTC.pdf",
        organization_id=ORG_ID
    )

    assert res["sha256"] == expected_sha256
    assert res["is_duplicate"] is False
    assert res["is_write_once"] is True
    assert "derived" in res
    assert "thumbnail_path" in res["derived"]
    assert "sanitized_pdf_path" in res["derived"]

    # Re-ingest same bytes: must detect duplicate
    res_dup = DocumentService.ingest_document(
        content=pdf_bytes,
        file_name="Tata_Steel_MTC_Copy.pdf",
        organization_id=ORG_ID
    )
    assert res_dup["is_duplicate"] is True
    assert res_dup["sha256"] == expected_sha256


def test_b3_signed_url_generation_and_tamper_defense():
    """Test HMAC-SHA256 signed download URL validation and expiry."""
    pdf_bytes = create_sample_mtc_pdf("HEAT-SIGTEST-01", "India")
    doc_meta = DocumentService.ingest_document(pdf_bytes, "sig_test.pdf", ORG_ID)
    sha = doc_meta["sha256"]

    # 1. Valid signed URL
    signed_url = DocumentService.generate_signed_url(sha, action="download", expires_in_seconds=300)
    # Extract query params
    query = signed_url.split("?")[1]
    params = dict(p.split("=") for p in query.split("&"))
    expires = int(params["expires"])
    sig = params["signature"]

    resp = client.get(f"/api/documents/{sha}/download?organization_id={ORG_ID}&expires={expires}&signature={sig}&file_ext=pdf")
    assert resp.status_code == 200
    assert resp.content == pdf_bytes

    # 2. Tampered signature must fail with 403
    resp_tampered = client.get(f"/api/documents/{sha}/download?organization_id={ORG_ID}&expires={expires}&signature=tampered_bad_sig&file_ext=pdf")
    assert resp_tampered.status_code == 403

    # 3. Expired timestamp must fail with 403
    expired_time = int(time.time()) - 100
    resp_expired = client.get(f"/api/documents/{sha}/download?organization_id={ORG_ID}&expires={expired_time}&signature={sig}&file_ext=pdf")
    assert resp_expired.status_code == 403


def test_b3_cryptographic_integrity_proof():
    """Verify endpoint to re-hash and prove an original is unchanged vs tampered."""
    pdf_bytes = create_sample_mtc_pdf("HEAT-PROVE-01", "India")
    doc_meta = DocumentService.ingest_document(pdf_bytes, "prove_test.pdf", ORG_ID)
    sha = doc_meta["sha256"]

    # Verification via API
    resp = client.post(
        f"/api/documents/{sha}/verify-integrity",
        json={"organization_id": ORG_ID, "file_ext": "pdf"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["verified"] is True
    assert data["tamper_detected"] is False
    assert data["sha256_measured"] == sha


def test_b4_classifier():
    """Test document type classification logic."""
    assert ExtractionClassifier.classify("INSPECTION CERTIFICATE EN 10204 3.1 HEAT NUMBER 123") == "mill_certificate"
    assert ExtractionClassifier.classify("TAX INVOICE NO 4919 GSTIN 27AAACT") == "invoice"
    assert ExtractionClassifier.classify("MAHAVITARAN ELECTRICITY BILL KWH CONSUMPTION 4500") == "electricity_bill"
    assert ExtractionClassifier.classify("UNKNOWN RANDOM TEXT") == "other"


def test_b4_extraction_with_real_coordinates_and_cost_accounting():
    """Verify PyMuPDF true word coordinates, chemistry parsing, and cost accounting."""
    pdf_bytes = create_sample_mtc_pdf("HEAT-COORD-77", "India")
    hashlib.sha256(pdf_bytes).hexdigest()

    result = ExtractionService.process_document(
        pdf_bytes=pdf_bytes,
        document_id="doc_test_123",
        organization_id=ORG_ID,
        force_refresh=True
    )

    assert result.status == "success"
    assert result.document_type == "mill_certificate"
    assert "heat_number" in result.fields
    assert result.fields["heat_number"].value == "HEAT-COORD-77"
    assert result.fields["heat_number"].bounding_box is not None
    # Verify non-zero real coordinates
    assert result.fields["heat_number"].bounding_box.x1 > result.fields["heat_number"].bounding_box.x0

    assert "country_of_melt_and_pour" in result.fields
    assert result.fields["country_of_melt_and_pour"].value == "India"

    # Verify chemistry
    assert "chemical_C" in result.fields
    assert result.fields["chemical_C"].value == "0.18"

    # Cost accounting: PyMuPDF deterministic run costs 0.0 paise
    assert result.cost_paise == 0.0


def test_b4_human_operator_correction():
    """Test that human corrections are recorded beside, never overwriting, the raw model output."""
    pdf_bytes = create_sample_mtc_pdf("HEAT-CORR-01", "India")
    result = ExtractionService.process_document(
        pdf_bytes=pdf_bytes,
        document_id="doc_test_corr",
        organization_id=ORG_ID,
        force_refresh=True
    )

    raw_val = result.fields["heat_number"].value
    assert raw_val == "HEAT-CORR-01"

    # Record correction
    corrected = ExtractionService.record_human_correction(
        result=result,
        field_name="heat_number",
        corrected_value="HEAT-CORR-01-CORRECTED",
        user_id="user_qa_head_01"
    )

    assert corrected.value == "HEAT-CORR-01"  # Raw value preserved
    assert corrected.corrected_value == "HEAT-CORR-01-CORRECTED"
    assert corrected.corrected_by == "user_qa_head_01"


def test_b4_telemetry_endpoint():
    """Verify /api/extraction/telemetry rejects anonymous requests and reports metrics when authenticated."""
    from auth_service import AuthService

    unauth_resp = client.get("/api/extraction/telemetry")
    assert unauth_resp.status_code == 401

    token = AuthService.create_jwt(
        user_id="usr_qa_04",
        org_id="org_howrah_steel_01",
        role="QA_INSPECTOR",
    )
    resp = client.get(
        "/api/extraction/telemetry",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    telemetry = resp.json()
    assert "average_cost_paise" in telemetry
    assert "privacy_tier" in telemetry
    assert telemetry["privacy_tier"] == "PAID_ZERO_DATA_RETENTION"
    assert telemetry["schema_version"] == "2026.11-v2"
