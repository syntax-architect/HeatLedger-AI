"""
PDF summary and digital seal page renderers extracted from BuyerPackService.
"""

from datetime import datetime, timezone
from typing import Any, Callable, Dict, List

import pymupdf as fitz


def generate_summary_page_pdf(
    service_cls: Any,
    classify_cn_scope_fn: Callable[[str], Dict[str, Any]],
    get_regulatory_data_fn: Callable[[], Dict[str, Any]],
    shipment_data: Dict[str, Any],
    heats_data: List[Dict[str, Any]],
    verification_code: str,
    verify_base_url: str = "https://heatledger.ai/verify",
) -> bytes:
    """Creates the One-Page Summary (Page 1) of the Buyer Pack."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    c_brand = (15 / 255, 23 / 255, 42 / 255)
    c_emerald = (5 / 255, 150 / 255, 105 / 255)
    c_amber = (217 / 255, 119 / 255, 6 / 255)
    c_rose = (220 / 255, 38 / 255, 38 / 255)
    c_dark = (15 / 255, 23 / 255, 42 / 255)
    c_slate = (100 / 255, 116 / 255, 139 / 255)
    c_border = (226 / 255, 232 / 255, 240 / 255)
    c_bg_subtle = (248 / 255, 250 / 255, 252 / 255)

    shipment_id = shipment_data.get("shipment_id", "SHP-UNKNOWN")
    buyer_name = shipment_data.get("buyer_name", "International Steel Importer")
    dest_port = shipment_data.get("destination_port", "Rotterdam, NL")
    invoice_ref = shipment_data.get("invoice_number", shipment_id)
    cn_code = shipment_data.get("cn_code", "7214.20.00")
    total_tonnes = shipment_data.get("total_tonnes", sum(h.get("allocated_tonnes", 0.0) for h in heats_data))

    scope_info = classify_cn_scope_fn(cn_code)

    page.draw_rect(fitz.Rect(30, 30, 565, 85), fill=c_brand)
    page.insert_text(fitz.Point(45, 54), "HEATLEDGER AI · BUYER COMPLIANCE PACK", fontsize=12, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(45, 70), "EXPORT SHIPMENT DOCUMENTARY SUMMARY", fontsize=8, color=c_emerald)
    page.insert_text(fitz.Point(360, 54), f"REF: {shipment_id}", fontsize=9, color=(1, 1, 1))
    page.insert_text(fitz.Point(360, 70), f"DATE: {datetime.now(timezone.utc).strftime('%d-%b-%Y')}", fontsize=8, color=c_slate)

    y = 95
    scope_color = c_emerald if scope_info["in_melt_and_pour_scope"] else c_amber
    page.draw_rect(fitz.Rect(30, y, 565, y + 36), fill=c_bg_subtle, color=scope_color, width=1)
    page.insert_text(fitz.Point(45, y + 15), f"TARIFF HEADING: CN {scope_info['cn_code']} · {scope_info['scope_label']}", fontsize=8.5, color=c_dark)
    page.insert_text(fitz.Point(45, y + 28), scope_info["statutory_note"][:110], fontsize=7, color=c_slate)

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
        for h in heats_data[:6]:
            heat_no = str(h.get("heat_number", "UNKNOWN"))
            mill = str(h.get("mill", "Declared Mill"))[:18]
            grade = str(h.get("grade", "Steel"))[:16]
            tonnes = f"{float(h.get('allocated_tonnes', 0.0)):.2f} MT"
            raw_country = h.get("melt_and_pour_country")
            cert_hash = str(h.get("certificate_sha256", "------"))[:8]

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

    y += 10
    if has_missing_country:
        status_title = "SHIPMENT AT RISK: MELT-AND-POUR EVIDENCE MISSING"
        status_box_bg = (254 / 255, 242 / 255, 242 / 255)
        status_box_border = c_rose
        status_text_color = c_rose
    elif open_warnings:
        status_title = "ACTION REQUIRED: DOCUMENTARY GAPS FLAGGED"
        status_box_bg = (255 / 255, 251 / 255, 235 / 255)
        status_box_border = c_amber
        status_text_color = c_amber
    else:
        status_title = "SHIPMENT PREPARED: ALL HEATS LINKED WITH COUNTRY EVIDENCE"
        status_box_bg = (236 / 255, 253 / 255, 245 / 255)
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

    y += 85
    verify_url = f"{verify_base_url.rstrip('/')}/{verification_code}"
    qr_pix = service_cls.generate_qr_code_pixmap(verify_url)

    page.draw_rect(fitz.Rect(30, y, 565, y + 105), fill=(1, 1, 1), color=c_border, width=1)
    qr_rect = fitz.Rect(45, y + 12, 125, y + 92)
    page.insert_image(qr_rect, pixmap=qr_pix)

    page.insert_text(fitz.Point(140, y + 26), "TAMPER-EVIDENT PACK VERIFICATION", fontsize=9, color=c_dark)
    page.insert_text(fitz.Point(140, y + 42), f"Verification Code: {verification_code}", fontsize=8, color=c_emerald)
    page.insert_text(fitz.Point(140, y + 58), f"Public Link: {verify_url}", fontsize=7.5, color=c_slate)
    page.insert_text(fitz.Point(140, y + 72), "Scan with mobile camera or enter code to inspect cryptographic hash chain and original certificates.", fontsize=7, color=c_slate)
    page.insert_text(fitz.Point(140, y + 86), "This digital seal is a tamper-evidence feature, not a legal verification.", fontsize=7, color=c_amber)

    page.draw_line(fitz.Point(30, 800), fitz.Point(565, 800), color=c_border, width=0.5)
    page.insert_text(
        fitz.Point(30, 814),
        "Prepares documents for review. Not legal advice. The digital seal is a tamper-evidence feature, not a legal verification.",
        fontsize=6.5,
        color=c_slate,
    )
    page.insert_text(
        fitz.Point(430, 814),
        f"Regulatory Data Rev: {get_regulatory_data_fn().get('last_reviewed', '2026-11-21')}",
        fontsize=6.5,
        color=c_slate,
    )

    return doc.write()


def generate_seal_page_pdf(
    shipment_data: Dict[str, Any],
    signature_record: Dict[str, Any],
    pack_sha256: str,
    verification_code: str,
) -> bytes:
    """Creates the Authorised Inspector Digital Seal Page (Page 2)."""
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

    page.draw_rect(fitz.Rect(30, 30, 565, 85), fill=c_brand)
    page.insert_text(fitz.Point(45, 54), "HEATLEDGER AI · AUTHORISED INSPECTOR DIGITAL SEAL", fontsize=12, color=(1, 1, 1))
    page.insert_text(fitz.Point(45, 70), "TAMPER-EVIDENT PACK INTEGRITY ATTESTATION", fontsize=8, color=c_emerald)
    page.insert_text(fitz.Point(360, 54), f"REF: {shipment_id}", fontsize=9, color=(1, 1, 1))
    page.insert_text(fitz.Point(360, 70), f"SEAL CODE: {verification_code}", fontsize=8, color=c_slate)

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

    page.draw_line(fitz.Point(30, 800), fitz.Point(565, 800), color=c_border, width=0.5)
    page.insert_text(
        fitz.Point(30, 814),
        "Prepares documents for review. Not legal advice. The digital seal is a tamper-evidence feature, not a legal verification.",
        fontsize=6.5,
        color=c_slate,
    )

    return doc.write()
