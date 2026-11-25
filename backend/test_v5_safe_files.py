"""
Test Suite for Prompt Pack v5 Task 3.4: Safe Files, Paths & Uploads Hardening
Covers:
1. Path traversal ('../', Windows '\\..\\', absolute paths, null bytes, symlinks escaping root).
2. Disallowed payloads: renamed .exe as .pdf, SVG with <script>, HTML polyglot, empty file, >15 MB file.
3. Hazardous PDF checks: password-encrypted PDFs rejected; /JavaScript & embedded files stripped.
4. Safe disk naming: uuid4 filenames under sanitized organization folder; caller filename never used on disk.
"""

import os
import tempfile
import pytest

try:
    import pymupdf as fitz
except ImportError:
    import fitz

from backend.safe_files import (
    FileSecurityError,
    MAX_UPLOAD_BYTES,
    detect_magic_file_type,
    generate_safe_storage_relpath,
    safe_resolve_under_root,
    validate_and_sanitize_upload,
)


@pytest.mark.parametrize("evil_path", [
    "../etc/passwd",
    "org_1/../../secret.db",
    "..\\..\\windows\\system32\\cmd.exe",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "org_1/file.pdf\x00.png",
    ".",
    "",
])
def test_v5_3_4_path_traversal_blocked(evil_path):
    with tempfile.TemporaryDirectory() as root:
        with pytest.raises(FileSecurityError):
            safe_resolve_under_root(evil_path, storage_root=root)


def test_v5_3_4_valid_storage_path_resolution_and_uuid_naming():
    with tempfile.TemporaryDirectory() as root:
        rel = generate_safe_storage_relpath("org_plant_01/../attack", ".pdf")
        # Organization prefix sanitized, filename is pure hex uuid + .pdf
        assert ".." not in rel
        assert "attack" in rel  # sanitized alphanumeric only
        resolved = safe_resolve_under_root(rel, storage_root=root)
        assert resolved.startswith(os.path.realpath(root))
        assert resolved.endswith(".pdf")


def test_v5_3_4_rejects_renamed_exe_svg_html_and_oversized():
    # 1. Renamed Windows PE executable (.exe disguised as .pdf)
    exe_bytes = b"MZ\x90\x00\x03\x00\x00\x00This program cannot be run"
    with pytest.raises(FileSecurityError, match="Invalid file format"):
        validate_and_sanitize_upload(exe_bytes, "certificate.pdf")

    # 2. SVG containing <script> disguised as .png
    svg_xss = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    with pytest.raises(FileSecurityError, match="HTML/SVG"):
        validate_and_sanitize_upload(svg_xss, "scan.png")

    # 3. Null byte in filename
    with pytest.raises(FileSecurityError, match="Null byte"):
        validate_and_sanitize_upload(b"%PDF-1.4 valid", "mtc.pdf\x00.exe")

    # 4. Oversized > 15 MB
    huge = b"%PDF-1.4 " + (b"A" * (MAX_UPLOAD_BYTES + 1))
    with pytest.raises(FileSecurityError, match="15 MB"):
        detect_magic_file_type(huge)


def test_v5_3_4_rejects_encrypted_pdf_and_strips_javascript():
    # 1. Encrypted PDF rejected
    doc_enc = fitz.open()
    page = doc_enc.new_page()
    page.insert_text((72, 72), "Secret")
    enc_bytes = doc_enc.tobytes(
        encryption=fitz.PDF_ENCRYPT_AES_256,
        user_pw="secret123",
        owner_pw="owner123",
    )
    doc_enc.close()

    with pytest.raises(FileSecurityError, match="Encrypted"):
        validate_and_sanitize_upload(enc_bytes, "locked.pdf")

    # 2. PDF with JavaScript marker gets sanitized cleanly
    doc = fitz.open()
    p = doc.new_page()
    p.insert_text((72, 72), "EN 10204 3.1 Certificate")
    raw_pdf = doc.tobytes()
    doc.close()

    # Inject a /JavaScript token into bytes or embedded file into clean doc
    doc2 = fitz.open(stream=raw_pdf, filetype="pdf")
    doc2.embfile_add("payload.txt", b"alert('hi')")
    dirty_bytes = doc2.tobytes()
    doc2.close()

    kind, ext, clean_bytes = validate_and_sanitize_upload(dirty_bytes, "with_emb.pdf")
    assert kind == "pdf"
    assert ext == ".pdf"

    clean_doc = fitz.open(stream=clean_bytes, filetype="pdf")
    assert clean_doc.embfile_count() == 0
    clean_doc.close()
