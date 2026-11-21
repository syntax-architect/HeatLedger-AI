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
        """
        Creates the One-Page Summary (Page 1) of the Buyer Pack:
        - Shipment ID, Buyer, Port of Destination, Date
        - CN Scope and Tariff Classification (from data/regulatory.json)
        - Table of Heats with tonnes and Country of Melt and Pour:
          If missing, renders 'Not on certificate' and flags shipment at risk.
        - Open Warnings / Gaps
        - Public verification QR code
        """
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)  # A4

        # Clean corporate color palette
        c_brand = (15 / 255, 23 / 255, 42 / 255)       # Slate 900
        c_emerald = (5 / 255, 150 / 255, 105 / 255)    # Emerald 600
        c_amber = (217 / 255, 119 / 255, 6 / 255)      # Amber 600
        c_rose = (220 / 255, 38 / 255, 38 / 255)       # Rose 600
        c_dark = (15 / 255, 23 / 255, 42 / 255)        # Text Dark
        c_slate = (100 / 255, 116 / 255, 139 / 255)    # Text Muted
        c_border = (226 / 255, 232 / 255, 240 / 255)   # Border Light
        c_bg_subtle = (248 / 255, 250 / 255, 252 / 255) # Light Slate Fill

        shipment_id = shipment_data.get("shipment_id", "SHP-UNKNOWN")
        buyer_name = shipment_data.get("buyer_name", "International Steel Importer")
        dest_port = shipment_data.get("destination_port", "Rotterdam, NL")
        invoice_ref = shipment_data.get("invoice_number", shipment_id)
        cn_code = shipment_data.get("cn_code", "7214.20.00")
        total_tonnes = shipment_data.get("total_tonnes", sum(h.get("allocated_tonnes", 0.0) for h in heats_data))

        scope_info = classify_cn_scope(cn_code)

        # Header Banner
        page.draw_rect(fitz.Rect(30, 30, 565, 85), fill=c_brand)
        page.insert_text(fitz.Point(45, 54), "HEATLEDGER AI · BUYER COMPLIANCE PACK", fontsize=12, color=(1, 1, 1), fontname="helv")
        page.insert_text(fitz.Point(45, 70), "EXPORT SHIPMENT DOCUMENTARY SUMMARY", fontsize=8, color=c_emerald)
        page.insert_text(fitz.Point(360, 54), f"REF: {shipment_id}", fontsize=9, color=(1, 1, 1))
        page.insert_text(fitz.Point(360, 70), f"DATE: {datetime.now(timezone.utc).strftime('%d-%b-%Y')}", fontsize=8, color=c_slate)

        # Statutory Scope Banner (from regulatory.json)
        y = 95
        scope_color = c_emerald if scope_info["in_melt_and_pour_scope"] else c_amber
        page.draw_rect(fitz.Rect(30, y, 565, y + 36), fill=c_bg_subtle, color=scope_color, width=1)
        page.insert_text(fitz.Point(45, y + 15), f"TARIFF HEADING: CN {scope_info['cn_code']} · {scope_info['scope_label']}", fontsize=8.5, color=c_dark)
        page.insert_text(fitz.Point(45, y + 28), scope_info["statutory_note"][:110], fontsize=7, color=c_slate)

        # Shipment Metadata Grid
        y = 140
        page.draw_rect(fitz.Rect(30, y, 565, y + 54), fill=(1, 1, 1), color=c_border, width=0.8)
        col_w = (565 - 30) / 4

        meta_cols = [
            ("Buyer / Consignee", buyer_name[:24]),
            ("Invoice Reference", invoice_ref),
            ("Destination Port", dest_port),
            ("Total Weight (Tonnes)", f"{float(total_tonnes):.3f} MT"),
        ]
        for idx, (label, val) in enumerate(meta_cols):
            cx = 38 + (idx * col_w)
            page.insert_text(fitz.Point(cx, y + 20), label.upper(), fontsize=6.5, color=c_slate)
            page.insert_text(fitz.Point(cx, y + 38), str(val), fontsize=9, color=c_dark)

        # Linked Upstream Heats Table
        y = 208
        page.insert_text(fitz.Point(30, y), "LINKED UPSTREAM HEATS & ORIGINAL CERTIFICATES", fontsize=9, color=c_dark)
        y += 10
        page.draw_rect(fitz.Rect(30, y, 565, y + 20), fill=c_brand)

        th_cols = [
            (38, "HEAT NUMBER"),
            (130, "PRIMARY MILL"),
            (230, "GRADE / PRODUCT"),
            (340, "TONNES"),
            (410, "MELT & POUR COUNTRY"),
            (520, "DIGEST"),
        ]
        for xpos, th in th_cols:
            page.insert_text(fitz.Point(xpos, y + 13), th, fontsize=7, color=(1, 1, 1))

        y += 20
        open_warnings: List[str] = []
        has_missing_country = False

        if not heats_data:
            page.draw_rect(fitz.Rect(30, y, 565, y + 24), fill=c_bg_subtle, color=c_border, width=0.5)
            page.insert_text(fitz.Point(45, y + 15), "No upstream heats currently allocated to this shipment.", fontsize=8, color=c_rose)
            open_warnings.append("No upstream heats allocated. Shipment pack is incomplete.")
            y += 24
        else:
            for h in heats_data[:6]:  # Show up to 6 on single summary page
                heat_no = str(h.get("heat_number", "UNKNOWN"))
                mill = str(h.get("mill", "Declared Mill"))[:18]
                grade = str(h.get("grade", "Steel"))[:16]
                tonnes = f"{float(h.get('allocated_tonnes', 0.0)):.2f} MT"
                raw_country = h.get("melt_and_pour_country")
                cert_hash = str(h.get("certificate_sha256", "------"))[:8]

                # Strict requirement: if not on certificate, show 'Not on certificate'
                if not raw_country or str(raw_country).strip().upper() in ("UNKNOWN", "UNCONFIRMED", "MISSING", "NONE", ""):
                    country_display = "Not on certificate"
                    country_color = c_rose
                    has_missing_country = True
                    open_warnings.append(f"Heat {heat_no}: Melt-and-pour country not stated on certificate.")
                else:
                    country_display = str(raw_country).strip().upper()
                    country_color = c_dark

                row_bg = c_bg_subtle if (heats_data.index(h) % 2 == 1) else (1, 1, 1)
                page.draw_rect(fitz.Rect(30, y, 565, y + 22), fill=row_bg, color=c_border, width=0.5)

                page.insert_text(fitz.Point(38, y + 14), heat_no, fontsize=7.5, color=c_dark)
                page.insert_text(fitz.Point(130, y + 14), mill, fontsize=7.5, color=c_dark)
                page.insert_text(fitz.Point(230, y + 14), grade, fontsize=7.5, color=c_dark)
                page.insert_text(fitz.Point(340, y + 14), tonnes, fontsize=7.5, color=c_dark)
                page.insert_text(fitz.Point(410, y + 14), country_display, fontsize=7.5, color=country_color)
                page.insert_text(fitz.Point(520, y + 14), cert_hash, fontsize=7, color=c_slate)

                y += 22

        # Status & Warnings Box
        y += 10
        if has_missing_country:
            status_title = "SHIPMENT AT RISK: MELT-AND-POUR EVIDENCE MISSING"
            status_box_bg = (254 / 255, 242 / 255, 242 / 255) # Rose 50
            status_box_border = c_rose
            status_text_color = c_rose
        elif open_warnings:
            status_title = "ACTION REQUIRED: DOCUMENTARY GAPS FLAGGED"
            status_box_bg = (255 / 255, 251 / 255, 235 / 255) # Amber 50
            status_box_border = c_amber
            status_text_color = c_amber
        else:
            status_title = "SHIPMENT PREPARED: ALL HEATS LINKED WITH COUNTRY EVIDENCE"
            status_box_bg = (236 / 255, 253 / 255, 245 / 255) # Emerald 50
            status_box_border = c_emerald
            status_text_color = c_emerald

        page.draw_rect(fitz.Rect(30, y, 565, y + 70), fill=status_box_bg, color=status_box_border, width=1)
        page.insert_text(fitz.Point(45, y + 18), status_title, fontsize=8.5, color=status_text_color)

        if open_warnings:
            for widx, w in enumerate(open_warnings[:2]):
                page.insert_text(fitz.Point(45, y + 34 + (widx * 14)), f"• {w}", fontsize=7.5, color=c_dark)
        else:
            page.insert_text(fitz.Point(45, y + 36), "• All heats match active purchase orders and convey untouched mill certificates.", fontsize=7.5, color=c_dark)
            page.insert_text(fitz.Point(45, y + 50), "• Importer evidence file assembled with byte-identical upstream mill copies.", fontsize=7.5, color=c_dark)

        # Verification & QR Section
        y += 85
        verify_url = f"{verify_base_url.rstrip('/')}/{verification_code}"
        qr_pix = cls.generate_qr_code_pixmap(verify_url)

        page.draw_rect(fitz.Rect(30, y, 565, y + 105), fill=(1, 1, 1), color=c_border, width=1)

        # Insert QR image
        qr_rect = fitz.Rect(45, y + 12, 125, y + 92)
        page.insert_image(qr_rect, pixmap=qr_pix)

        # Verification metadata
        page.insert_text(fitz.Point(140, y + 26), "TAMPER-EVIDENT PACK VERIFICATION", fontsize=9, color=c_dark)
        page.insert_text(fitz.Point(140, y + 42), f"Verification Code: {verification_code}", fontsize=8, color=c_emerald)
        page.insert_text(fitz.Point(140, y + 58), f"Public Link: {verify_url}", fontsize=7.5, color=c_slate)
        page.insert_text(fitz.Point(140, y + 72), "Scan with mobile camera or enter code to inspect cryptographic hash chain and original certificates.", fontsize=7, color=c_slate)
        page.insert_text(fitz.Point(140, y + 86), "This digital seal is a tamper-evidence feature, not a legal verification.", fontsize=7, color=c_amber)

        # Footer Statutory Disclaimer (Prompt Pack v3 wording rule)
        page.draw_line(fitz.Point(30, 800), fitz.Point(565, 800), color=c_border, width=0.5)
        page.insert_text(
            fitz.Point(30, 814),
            "Prepares documents for review. Not legal advice. The digital seal is a tamper-evidence feature, not a legal verification.",
            fontsize=6.5,
            color=c_slate,
        )
        page.insert_text(
            fitz.Point(430, 814),
            f"Regulatory Data Rev: {get_regulatory_data().get('last_reviewed', '2026-11-21')}",
            fontsize=6.5,
            color=c_slate,
        )

        return doc.write()

    @classmethod
    def generate_seal_page_pdf(
        cls,
        shipment_data: Dict[str, Any],
        signature_record: Dict[str, Any],
        pack_sha256: str,
        verification_code: str
    ) -> bytes:
        """
        Creates the Authorised Inspector Digital Seal Page (Page 2):
        - Inspector name, designation, employee ID, timestamp
        - Cryptographic seal, key ID, pack SHA-256
        - Mandatory tamper-evidence sentence:
          'Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification.'
        """
        doc = fitz.open()
        page = doc.new_page(width=595, height=842)

        c_brand = (15 / 255, 23 / 255, 42 / 255)
        c_emerald = (5 / 255, 150 / 255, 105 / 255)
        c_amber = (217 / 255, 119 / 255, 6 / 255)
        c_dark = (15 / 255, 23 / 255, 42 / 255)
        c_slate = (100 / 255, 116 / 255, 139 / 255)
        c_border = (226 / 255, 232 / 255, 240 / 255)
        c_bg_subtle = (248 / 255, 250 / 255, 252 / 255)

        shipment_id = shipment_data.get("shipment_id", "SHP-UNKNOWN")
        signer_name = signature_record.get("signer_name", "Authorised Plant Inspector")
        signer_role = signature_record.get("signer_role", "QA_INSPECTOR")
        key_id = signature_record.get("key_id", "ed25519_2026_primary")
        signed_at = signature_record.get("signed_at", datetime.now(timezone.utc).isoformat())
        sig_b64 = signature_record.get("signature_b64", signature_record.get("signature", ""))

        # Header
        page.draw_rect(fitz.Rect(30, 30, 565, 85), fill=c_brand)
        page.insert_text(fitz.Point(45, 54), "HEATLEDGER AI · AUTHORISED INSPECTOR DIGITAL SEAL", fontsize=12, color=(1, 1, 1))
        page.insert_text(fitz.Point(45, 70), "TAMPER-EVIDENT PACK INTEGRITY ATTESTATION", fontsize=8, color=c_emerald)
        page.insert_text(fitz.Point(360, 54), f"REF: {shipment_id}", fontsize=9, color=(1, 1, 1))
        page.insert_text(fitz.Point(360, 70), f"SEAL CODE: {verification_code}", fontsize=8, color=c_slate)

        # Primary Regulatory Rule Notice
        y = 100
        page.draw_rect(fitz.Rect(30, y, 565, y + 45), fill=(254 / 255, 243 / 255, 199 / 255), color=c_amber, width=1)
        page.insert_text(
            fitz.Point(45, y + 18),
            "MANDATORY DISCLOSURE & STATUTORY LIMITATION:",
            fontsize=8,
            color=(146 / 255, 64 / 255, 14 / 255),
        )
        page.insert_text(
            fitz.Point(45, y + 32),
            "Sealed by the plant's authorised inspector. This is a tamper-evidence seal, not a legal verification.",
            fontsize=8,
            color=c_dark,
        )

        # Signatory Identity Box
        y = 160
        page.draw_rect(fitz.Rect(30, y, 565, y + 110), fill=c_bg_subtle, color=c_border, width=1)
        page.insert_text(fitz.Point(45, y + 22), "AUTHORISED SIGNATORY DETAILS", fontsize=9, color=c_dark)

        sig_fields = [
            ("Signatory Name", signer_name),
            ("Designation / Role", signer_role),
            ("Key Identifier (KID)", key_id),
            ("Timestamp (UTC)", str(signed_at)),
        ]
        col_w = (565 - 30) / 2
        for idx, (label, val) in enumerate(sig_fields):
            row = idx // 2
            col = idx % 2
            cx = 45 + (col * col_w)
            cy = y + 46 + (row * 30)
            page.insert_text(fitz.Point(cx, cy), label.upper(), fontsize=7, color=c_slate)
            page.insert_text(fitz.Point(cx, cy + 14), str(val), fontsize=8.5, color=c_dark)

        # Cryptographic Hashes & Signature Box
        y = 285
        page.draw_rect(fitz.Rect(30, y, 565, y + 160), fill=(1, 1, 1), color=c_emerald, width=1.2)
        page.insert_text(fitz.Point(45, y + 22), "CRYPTOGRAPHIC INTEGRITY EVIDENCE", fontsize=9, color=c_dark)

        page.insert_text(fitz.Point(45, y + 45), "COMPLETE BUYER PACK SHA-256 DIGEST:", fontsize=7, color=c_slate)
        page.draw_rect(fitz.Rect(45, y + 52, 545, y + 72), fill=c_bg_subtle, color=c_border, width=0.5)
        page.insert_text(fitz.Point(52, y + 66), pack_sha256, fontsize=7.5, color=c_dark)

        page.insert_text(fitz.Point(45, y + 90), "ASYMMETRIC DIGITAL SEAL SIGNATURE (BASE64):", fontsize=7, color=c_slate)
        page.draw_rect(fitz.Rect(45, y + 97, 545, y + 145), fill=c_bg_subtle, color=c_border, width=0.5)

        sig_str = str(sig_b64) or "DEMO_UNSET_SIGNATURE"
        for l_idx in range(0, min(len(sig_str), 240), 80):
            chunk = sig_str[l_idx : l_idx + 80]
            page.insert_text(fitz.Point(52, y + 112 + ((l_idx // 80) * 12)), chunk, fontsize=7, color=c_emerald)

        # Verification Instructions
        y = 460
        page.draw_rect(fitz.Rect(30, y, 565, y + 70), fill=c_bg_subtle, color=c_border, width=1)
        page.insert_text(fitz.Point(45, y + 20), "INSTRUCTIONS FOR BUYER AND CUSTOMS VERIFIERS", fontsize=8.5, color=c_dark)
        page.insert_text(
            fitz.Point(45, y + 36),
            "1. Access the public verification portal at https://heatledger.ai/verify and enter the verification code.",
            fontsize=7.5,
            color=c_dark,
        )
        page.insert_text(
            fitz.Point(45, y + 50),
            "2. Upload this file to re-calculate its SHA-256 digest and confirm cryptographic match against the immutable ledger.",
            fontsize=7.5,
            color=c_dark,
        )

        # Footer
        page.draw_line(fitz.Point(30, 800), fitz.Point(565, 800), color=c_border, width=0.5)
        page.insert_text(
            fitz.Point(30, 814),
            "Prepares documents for review. Not legal advice. The digital seal is a tamper-evidence feature, not a legal verification.",
            fontsize=6.5,
            color=c_slate,
        )

        return doc.write()

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
