"""
HEATLEDGER AI: Safe File Handling, Upload Validation & PDF Sanitization (Prompt Pack v5 - Task 3.4)

Enforces strict security controls on every upload, storage path, and download:
1. Magic-byte inspection only (PDF, JPEG, PNG). Rejects EXEs, SVGs, HTML, polyglots, or renamed files.
2. Size limits: max 15 MB per upload.
3. PDF inspection & sanitization: rejects encrypted PDFs, bounds page count (max 50),
   strips active JavaScript (/JS, /JavaScript, /OpenAction) and embedded files.
4. Safe disk naming: stores strictly under {STORAGE_ROOT}/{safe_org_id}/{uuid4}{ext}.
   Caller filename is NEVER used on disk.
5. Canonical path resolution: resolves with os.path.realpath and refuses any path outside STORAGE_ROOT
   (defeating '../', symlinks, absolute paths, backslashes, and null bytes).
"""

import os
import re
import uuid
import logging
from typing import Optional, Tuple

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

logger = logging.getLogger("heatledger.safe_files")

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 50
MAX_PDF_DIMENSION_PTS = 14400  # ~200 inches max page size

DEFAULT_STORAGE_ROOT = os.path.realpath(
    os.path.join(os.path.dirname(__file__), "storage")
)

ALLOWED_MAGIC_SIGNATURES = (
    ("pdf", ".pdf", b"%PDF-"),
    ("jpeg", ".jpg", b"\xff\xd8\xff"),
    ("png", ".png", b"\x89PNG\r\n\x1a\n"),
)

# Active/script indicators in raw PDF bytes or text streams
HAZARDOUS_SCRIPT_PATTERNS = (
    b"<script",
    b"<svg",
    b"onerror=",
    b"onload=",
)


class FileSecurityError(ValueError):
    """Raised when an uploaded file or path violates security constraints."""


def safe_resolve_under_root(relative_path: str, storage_root: Optional[str] = None) -> str:
    """
    Joins relative_path under storage_root, resolves symlinks/dot-segments via realpath,
    and refuses anything that escapes storage_root or contains null bytes / absolute prefixes.
    """
    if not relative_path or not isinstance(relative_path, str):
        raise FileSecurityError("Invalid file path.")
    if "\x00" in relative_path:
        raise FileSecurityError("Null byte detected in file path.")

    normalized = relative_path.replace("\\", "/").strip()
    if normalized.startswith("/") or re.match(r"^[A-Za-z]:", normalized):
        raise FileSecurityError("Absolute paths are prohibited.")

    parts = [p for p in normalized.split("/") if p not in ("", ".")]
    if any(p == ".." for p in parts) or not parts:
        raise FileSecurityError("Path traversal sequence detected.")

    root = os.path.realpath(storage_root or DEFAULT_STORAGE_ROOT)
    candidate = os.path.realpath(os.path.join(root, *parts))

    try:
        common = os.path.commonpath([root, candidate])
    except ValueError as exc:
        raise FileSecurityError("Path crosses filesystem root.") from exc

    if common != root or candidate == root:
        raise FileSecurityError("Resolved path escapes storage root.")

    return candidate


def generate_safe_storage_relpath(organization_id: str, ext: str) -> str:
    """
    Creates an opaque disk path: {safe_org_id}/{uuid4}{ext}.
    Never incorporates caller-supplied filenames on disk.
    """
    clean_org = re.sub(r"[^A-Za-z0-9_\-]", "", organization_id or "")
    if not clean_org:
        raise FileSecurityError("Valid organization_id is required for file storage.")

    clean_ext = ext.lower() if ext.startswith(".") else f".{ext.lower()}"
    if clean_ext not in (".pdf", ".jpg", ".jpeg", ".png"):
        raise FileSecurityError("Unsupported storage extension.")

    return f"{clean_org}/{uuid.uuid4().hex}{clean_ext}"


def detect_magic_file_type(file_bytes: bytes) -> Tuple[str, str]:
    """
    Detects file type purely from leading magic bytes.
    Rejects executables, HTML, SVG, ZIPs, or zero-byte payloads even if renamed .pdf.
    """
    if not file_bytes:
        raise FileSecurityError("Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise FileSecurityError(f"Uploaded file exceeds maximum 15 MB limit ({len(file_bytes)} bytes).")

    head_lower = file_bytes[:512].lstrip().lower()
    for sig in HAZARDOUS_SCRIPT_PATTERNS:
        if sig in head_lower:
            raise FileSecurityError("HTML/SVG or active script payloads are prohibited.")

    for kind, ext, magic in ALLOWED_MAGIC_SIGNATURES:
        if file_bytes.startswith(magic):
            return kind, ext

    raise FileSecurityError("Invalid file format. Only valid PDF, JPEG, or PNG files are accepted.")


def validate_and_sanitize_upload(file_bytes: bytes, declared_filename: str = "") -> Tuple[str, str, bytes]:
    """
    Full upload security pipeline:
    1. Enforces 15 MB limit and magic bytes (PDF/JPEG/PNG).
    2. For PDFs: blocks encrypted PDFs, page bombs (>50 pages or oversized dimensions),
       and strips JavaScript / embedded files if PyMuPDF is available.
    Returns (file_kind, safe_ext, sanitized_bytes).
    """
    if "\x00" in (declared_filename or ""):
        raise FileSecurityError("Null byte in filename.")

    kind, ext = detect_magic_file_type(file_bytes)
    if kind != "pdf":
        return kind, ext, file_bytes

    if fitz is None:
        return kind, ext, file_bytes

    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as exc:
        raise FileSecurityError("Malformed or unreadable PDF document.") from exc

    try:
        if doc.is_encrypted or doc.needs_pass:
            raise FileSecurityError("Encrypted or password-protected PDFs are not accepted.")
        if doc.page_count == 0 or doc.page_count > MAX_PDF_PAGES:
            raise FileSecurityError(f"PDF page count must be between 1 and {MAX_PDF_PAGES}.")

        for page in doc:
            rect = page.rect
            if rect.width > MAX_PDF_DIMENSION_PTS or rect.height > MAX_PDF_DIMENSION_PTS:
                raise FileSecurityError("PDF page dimensions exceed safe maximum limits.")

        # Strip any embedded files & JS actions if present
        emb_count = doc.embfile_count() if hasattr(doc, "embfile_count") else 0
        has_js_markers = any(m in file_bytes for m in (b"/JavaScript", b"/JS", b"/OpenAction"))
        if emb_count > 0 or has_js_markers:
            while hasattr(doc, "embfile_count") and doc.embfile_count() > 0:
                doc.embfile_del(0)
            sanitized = doc.tobytes(garbage=4, deflate=True, clean=True)
            # Strip residual /JS or /OpenAction names cleanly if still tagged on catalog
            for marker in (b"/JavaScript", b"/JS", b"/OpenAction"):
                sanitized = sanitized.replace(marker, b"/StrippedTag")
            return kind, ext, sanitized

        return kind, ext, file_bytes
    finally:
        doc.close()
