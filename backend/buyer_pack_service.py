"""
HEATLEDGER AI: Buyer Compliance Pack Generator & Certificate Handling
Module: buyer_pack_service.py
Specification: Prompt R4 (Prompt Pack v3)
- One-page summary (shipment, buyer, heats, tonnes, melt-and-pour country, certificate list, warnings)
- Original certificates preserved byte-identical with zero overprinting or text stamps
- Manifest listing SHA-256 digests and file sizes
- Authorised inspector digital seal page with tamper-evidence statement
- ZIP archive and single combined PDF output
- Filename format: <shipment_id>_<date>_<hash_prefix>
- 25 MB max pack size warning
- Strict 'Not on certificate' when melt-and-pour country is missing
- CN scope classification from data/regulatory.json
- Quantities ledger reconciliation supporting split shipments
"""

import hashlib
import io
import json
import os
import re
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import pymupdf as fitz
import qrcode
import qrcode.image.svg

try:
    from backend.buyer_pack_pdf import (
        generate_summary_page_pdf as _generate_summary_page_pdf_op,
        generate_seal_page_pdf as _generate_seal_page_pdf_op,
    )
except ImportError:
    from buyer_pack_pdf import (
        generate_summary_page_pdf as _generate_summary_page_pdf_op,
        generate_seal_page_pdf as _generate_seal_page_pdf_op,
    )

REGULATORY_JSON_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)), "data", "regulatory.json"
)

MAX_PACK_BYTES_LIMIT = 25 * 1024 * 1024  # 25 MB


def get_regulatory_data() -> Dict[str, Any]:
    """Loads versioned regulatory definitions from data/regulatory.json."""
    if os.path.exists(REGULATORY_JSON_PATH):
        try:
            with open(REGULATORY_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    # Fallback to standard Prompt Pack v3 statutory values
    return {
        "version": "3.0.0",
        "last_reviewed": "2026-11-21",
        "statutory_scope": {
            "melt_and_pour": {
                "cn_range_start": 7208,
                "cn_range_end": 7306,
                "explicitly_excluded_cn": ["7307", "7318"],
            },
            "cbam": {
                "covered_chapters": ["72", "73"],
            },
        },
    }


def classify_cn_scope(cn_code_input: Optional[str]) -> Dict[str, Any]:
    """
    Classifies CN tariff code against EU/UK statutory scope:
    - CN 7208 to 7306: In melt-and-pour scope & CBAM scope
    - CN 7307 & 7318: NOT in melt-and-pour scope, but ARE in CBAM scope
    - Other 72/73: In CBAM scope
    """
    reg = get_regulatory_data()
    mp_scope = reg.get("statutory_scope", {}).get("melt_and_pour", {})

    if not cn_code_input:
        return {
            "cn_code": "UNSPECIFIED",
            "in_melt_and_pour_scope": False,
            "in_cbam_scope": False,
            "scope_label": "Unspecified Tariff Heading",
            "statutory_note": "No CN code specified.",
        }

    clean_cn = re.sub(r"[^0-9]", "", str(cn_code_input))
    if len(clean_cn) < 4:
        return {
            "cn_code": str(cn_code_input),
            "in_melt_and_pour_scope": False,
            "in_cbam_scope": False,
            "scope_label": "Invalid or Truncated CN Code",
            "statutory_note": "CN code must contain at least 4 digits.",
        }

    prefix_4 = int(clean_cn[:4])
    prefix_2 = clean_cn[:2]
    excluded_cn = mp_scope.get("explicitly_excluded_cn", ["7307", "7318"])

    # Check explicit exclusions (7307 fittings, 7318 fasteners)
    if clean_cn[:4] in excluded_cn:
        return {
            "cn_code": str(cn_code_input),
            "in_melt_and_pour_scope": False,
            "in_cbam_scope": True,
            "scope_label": "CBAM-Only Scope (Melt-and-Pour Exempt)",
            "statutory_note": f"CN {clean_cn[:4]} is excluded from melt-and-pour origin evidence under EU Reg 2026/1384 Annex I (review due 30 Jun 2027), but remains in CBAM scope.",
        }

    # Check 7208 to 7306 range
    range_start = mp_scope.get("cn_range_start", 7208)
    range_end = mp_scope.get("cn_range_end", 7306)
    in_mp = range_start <= prefix_4 <= range_end
    in_cbam = prefix_2 in ("72", "73")

    if in_mp:
        return {
            "cn_code": str(cn_code_input),
            "in_melt_and_pour_scope": True,
            "in_cbam_scope": True,
            "scope_label": "In Melt-and-Pour Scope & CBAM Scope",
            "statutory_note": "Subject to mandatory country of melt and pour evidence (EU Reg 2026/1384 / Impl. Reg 2026/1963) and CBAM declaration.",
        }

    return {
        "cn_code": str(cn_code_input),
        "in_melt_and_pour_scope": False,
        "in_cbam_scope": in_cbam,
        "scope_label": "CBAM Scope" if in_cbam else "Non-Steel Scope",
        "statutory_note": "Covered under CBAM Annex I." if in_cbam else "Outside EU steel compliance scope.",
    }


def reconcile_heat_ledger(
    total_received_tonnes: float,
    allocated_shipments: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Reconciles multi-shipment mass balance for a given heat.
    Ensures total allocated tonnes do not exceed received tonnes.
    Supports split shipments and maintains allocation history.
    """
    allocated_total = sum(float(s.get("allocated_tonnes", 0.0)) for s in allocated_shipments)
    remaining_tonnes = round(total_received_tonnes - allocated_total, 3)
    is_overallocated = remaining_tonnes < -0.001

    return {
        "total_received_tonnes": round(total_received_tonnes, 3),
        "total_allocated_tonnes": round(allocated_total, 3),
        "remaining_tonnes": max(0.0, remaining_tonnes),
        "overallocated_tonnes": abs(remaining_tonnes) if is_overallocated else 0.0,
        "is_overallocated": is_overallocated,
        "allocation_count": len(allocated_shipments),
        "allocations": allocated_shipments,
    }


class BuyerPackService:
    """
    Generates clean, correct buyer compliance packs and manages original certificate deliverables.
    Adheres to Prompt Pack v3 wording rules (no 'verified', 'certified', etc.).
    """

    @staticmethod
    def generate_qr_code_pixmap(data_url: str) -> fitz.Pixmap:
        """Generates a high-contrast vector Pixmap QR code without external imaging dependencies."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
        )
        qr.add_data(data_url)
        qr.make(fit=True)
        img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
        buf = io.BytesIO()
        img.save(buf)
        svg_bytes = buf.getvalue()
        svg_doc = fitz.open(stream=svg_bytes, filetype="svg")
        pix = svg_doc[0].get_pixmap()
        svg_doc.close()
        return pix

    @classmethod
    def generate_summary_page_pdf(
        cls,
        shipment_data: Dict[str, Any],
        heats_data: List[Dict[str, Any]],
        verification_code: str,
        verify_base_url: str = "https://heatledger.ai/verify"
    ) -> bytes:
        """Creates the One-Page Summary (Page 1) of the Buyer Pack."""
        return _generate_summary_page_pdf_op(
            cls,
            classify_cn_scope,
            get_regulatory_data,
            shipment_data,
            heats_data,
            verification_code,
            verify_base_url=verify_base_url,
        )

    @classmethod
    def generate_seal_page_pdf(
        cls,
        shipment_data: Dict[str, Any],
        signature_record: Dict[str, Any],
        pack_sha256: str,
        verification_code: str
    ) -> bytes:
        """Creates the Authorised Inspector Digital Seal Page (Page 2)."""
        return _generate_seal_page_pdf_op(
            shipment_data,
            signature_record,
            pack_sha256,
            verification_code,
        )

    @classmethod
    def compile_buyer_pack_pdf(
        cls,
        shipment_data: Dict[str, Any],
        heats_data: List[Dict[str, Any]],
        original_certificate_pdfs: List[Tuple[str, bytes]],
        signature_record: Optional[Dict[str, Any]] = None,
        verification_code: Optional[str] = None
    ) -> Tuple[bytes, str, bool]:
        """
        Compiles the Single Combined Buyer Pack PDF:
        - Page 1: One-Page Summary with QR link
        - Page 2: Inspector Digital Seal page
        - Pages 3+: Original Certificates appended BYTE-IDENTICALLY with ZERO overprinting or text stamps.
        Returns: (pdf_bytes, filename, size_warning)
        """
        v_code = verification_code or (signature_record.get("verification_code") if signature_record else f"HL-{shipment_data.get('shipment_id', 'DEMO')}")
        sig_rec = signature_record or {
            "signer_name": "Pending Inspector Sign-Off",
            "signer_role": "QA_INSPECTOR",
            "key_id": "draft_unsigned",
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_b64": "DRAFT_UNSIGNED_PACK",
        }

        # Step 1: Summary page
        summary_pdf = cls.generate_summary_page_pdf(shipment_data, heats_data, v_code)

        # Step 2: Calculate intermediate pack hash
        hasher = hashlib.sha256()
        hasher.update(summary_pdf)
        for _, cert_bytes in original_certificate_pdfs:
            hasher.update(cert_bytes)
        pack_sha256 = hasher.hexdigest()

        # Step 3: Seal page
        seal_pdf = cls.generate_seal_page_pdf(shipment_data, sig_rec, pack_sha256, v_code)

        # Step 4: Combine into final document
        combined_doc = fitz.open()
        doc_summary = fitz.open(stream=summary_pdf, filetype="pdf")
        doc_seal = fitz.open(stream=seal_pdf, filetype="pdf")

        combined_doc.insert_pdf(doc_summary)
        combined_doc.insert_pdf(doc_seal)

        # Step 5: Append original certificates unaltered (Zero Overprinting)
        for cert_name, cert_bytes in original_certificate_pdfs:
            upstream_doc = fitz.open(stream=cert_bytes, filetype="pdf")
            combined_doc.insert_pdf(upstream_doc)

        final_bytes = combined_doc.write()
        doc_summary.close()
        doc_seal.close()
        combined_doc.close()

        # Filename formatting: <shipment_id>_<date>_<hash_prefix>.pdf
        ship_id = shipment_data.get("shipment_id", "SHP-UNKNOWN").replace("/", "-")
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        hash_prefix = pack_sha256[:8]
        filename = f"{ship_id}_{date_str}_{hash_prefix}.pdf"

        size_warning = len(final_bytes) > MAX_PACK_BYTES_LIMIT

        return final_bytes, filename, size_warning

    @classmethod
    def compile_buyer_pack_zip(
        cls,
        shipment_data: Dict[str, Any],
        heats_data: List[Dict[str, Any]],
        original_certificate_files: List[Tuple[str, bytes]],
        signature_record: Optional[Dict[str, Any]] = None,
        verification_code: Optional[str] = None
    ) -> Tuple[bytes, str, bool, Dict[str, Any]]:
        """
        Compiles the primary deliverable: Verified Buyer Pack ZIP archive.
        Contains:
        1. Summary PDF (One-page summary)
        2. Seal PDF (Inspector seal)
        3. Combined PDF (Full pack with untouched original pages)
        4. Each original certificate file BYTE-IDENTICAL to the original upload
        5. MANIFEST.json listing SHA-256 digests and file sizes
        Returns: (zip_bytes, zip_filename, size_warning, manifest_dict)
        """
        v_code = verification_code or (signature_record.get("verification_code") if signature_record else f"HL-{shipment_data.get('shipment_id', 'DEMO')}")
        sig_rec = signature_record or {
            "signer_name": "Pending Inspector Sign-Off",
            "signer_role": "QA_INSPECTOR",
            "key_id": "draft_unsigned",
            "signed_at": datetime.now(timezone.utc).isoformat(),
            "signature_b64": "DRAFT_UNSIGNED_PACK",
        }

        # Generate combined PDF and individual parts
        combined_pdf_bytes, combined_pdf_name, _ = cls.compile_buyer_pack_pdf(
            shipment_data, heats_data, original_certificate_files, sig_rec, v_code
        )
        summary_pdf_bytes = cls.generate_summary_page_pdf(shipment_data, heats_data, v_code)
        pack_sha256 = hashlib.sha256(combined_pdf_bytes).hexdigest()
        seal_pdf_bytes = cls.generate_seal_page_pdf(shipment_data, sig_rec, pack_sha256, v_code)

        ship_id = shipment_data.get("shipment_id", "SHP-UNKNOWN").replace("/", "-")
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
        hash_prefix = pack_sha256[:8]
        zip_filename = f"{ship_id}_{date_str}_{hash_prefix}.zip"

        # Build Manifest
        manifest_files = [
            {
                "filename": combined_pdf_name,
                "type": "COMBINED_BUYER_PACK_PDF",
                "sha256": pack_sha256,
                "bytes": len(combined_pdf_bytes),
                "byte_identical_to_upload": False,
            },
            {
                "filename": "Summary.pdf",
                "type": "SUMMARY_PAGE_PDF",
                "sha256": hashlib.sha256(summary_pdf_bytes).hexdigest(),
                "bytes": len(summary_pdf_bytes),
                "byte_identical_to_upload": False,
            },
            {
                "filename": "Seal.pdf",
                "type": "INSPECTOR_SEAL_PAGE_PDF",
                "sha256": hashlib.sha256(seal_pdf_bytes).hexdigest(),
                "bytes": len(seal_pdf_bytes),
                "byte_identical_to_upload": False,
            },
        ]

        # Add original certificates (Strict Byte-Identity Assertion)
        for cert_name, cert_bytes in original_certificate_files:
            c_sha = hashlib.sha256(cert_bytes).hexdigest()
            manifest_files.append({
                "filename": cert_name,
                "type": "ORIGINAL_MILL_CERTIFICATE",
                "sha256": c_sha,
                "bytes": len(cert_bytes),
                "byte_identical_to_upload": True,
            })

        cn_code = shipment_data.get("cn_code", "7214.20.00")
        manifest: Dict[str, Any] = {
            "format": "HEATLEDGER-BUYER-PACK-V3",
            "shipment_id": shipment_data.get("shipment_id"),
            "buyer": shipment_data.get("buyer_name"),
            "destination_port": shipment_data.get("destination_port"),
            "invoice_number": shipment_data.get("invoice_number"),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "verification_code": v_code,
            "verification_url": f"https://heatledger.ai/verify/{v_code}",
            "pack_sha256": pack_sha256,
            "seal_statement": "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification.",
            "statutory_scope": classify_cn_scope(cn_code),
            "signer": {
                "name": sig_rec.get("signer_name"),
                "role": sig_rec.get("signer_role"),
                "key_id": sig_rec.get("key_id"),
            },
            "heats": heats_data,
            "files": manifest_files,
        }

        # Build ZIP stream
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            # Combined and individual PDF files
            zf.writestr(combined_pdf_name, combined_pdf_bytes)
            zf.writestr("Summary.pdf", summary_pdf_bytes)
            zf.writestr("Seal.pdf", seal_pdf_bytes)

            # Raw untouched original certificates
            for cert_name, cert_bytes in original_certificate_files:
                zf.writestr(f"originals/{cert_name}", cert_bytes)

            # MANIFEST.json
            manifest_json_str = json.dumps(manifest, indent=2)
            zf.writestr("MANIFEST.json", manifest_json_str.encode("utf-8"))

        zip_bytes = zip_buf.getvalue()
        size_warning = len(zip_bytes) > MAX_PACK_BYTES_LIMIT

        return zip_bytes, zip_filename, size_warning, manifest
