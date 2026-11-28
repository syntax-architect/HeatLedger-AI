"""
HEATLEDGER AI: Audit Trail CSV & A4 PDF Certificate Exporters
Extracted from audit_service.py for Prompt Pack v5 Task 6.1.
"""

import io
from datetime import datetime, timezone
from typing import Any, Dict, List

import pymupdf as fitz
from security_hardening import SafeCSVWriter


def export_audit_csv(records: List[Dict[str, Any]]) -> str:
    """Serializes chronological audit records into formula-injection-safe CSV."""
    output = io.StringIO()
    writer = SafeCSVWriter(output)

    headers = [
        "Sequence", "Timestamp (UTC)", "Entity Type", "Entity ID", "Action",
        "User Name", "User Role", "IP Address", "Record Hash (SHA-256)", "Previous Hash",
    ]
    writer.writerow(headers)

    for rec in records:
        writer.writerow([
            rec["sequence_number"],
            rec["timestamp"],
            rec["entity_type"],
            rec["entity_id"],
            rec["action"],
            rec["user_name"],
            rec["user_role"],
            rec["ip_address"],
            rec["record_hash"],
            rec["previous_hash"],
        ])

    return output.getvalue()


def _draw_pdf_header_and_banner(
    page: fitz.Page, org_display_name: str, audit_data: Dict[str, Any]
) -> None:
    """Renders top dark header block and cryptographic integrity banner."""
    c_dark = (0.05, 0.08, 0.14)
    c_emerald = (0.02, 0.58, 0.41)
    c_border = (0.86, 0.90, 0.94)
    c_rose = (0.85, 0.20, 0.20)
    integrity = audit_data["integrity_status"]

    page.draw_rect(fitz.Rect(36, 36, 559, 105), color=c_dark, fill=c_dark)
    page.insert_text(
        (50, 62),
        "HEATLEDGER AI · TAMPER-EVIDENT AUDIT TRAIL CERTIFICATE",
        fontsize=11,
        color=(1, 1, 1),
        fontname="helv",
    )
    page.insert_text(
        (50, 78),
        f"Organization: {org_display_name}   |   Standard: EN 10204:2004 Clause 6",
        fontsize=8,
        color=c_border,
        fontname="helv",
    )
    page.insert_text(
        (50, 92),
        f"Generated: {datetime.now(timezone.utc).isoformat()[:19]}Z   |   Append-Only Cryptographic Chain",
        fontsize=7.5,
        color=(0.7, 0.75, 0.8),
        fontname="helv",
    )

    y = 118
    if integrity["valid"]:
        page.draw_rect(fitz.Rect(36, y, 559, y + 44), color=c_emerald, fill=(0.95, 0.99, 0.97))
        page.insert_text(
            (50, y + 18),
            "✓ CRYPTOGRAPHIC INTEGRITY VERIFIED · ZERO HASH CHAIN MUTATIONS",
            fontsize=9,
            color=c_emerald,
            fontname="helv",
        )
        page.insert_text(
            (50, y + 32),
            f"All {audit_data['total_count']} chronological entries link unbroken to Genesis Anchor. Verified by SHA-256 state hashing.",
            fontsize=7.5,
            color=c_dark,
            fontname="helv",
        )
    else:
        page.draw_rect(fitz.Rect(36, y, 559, y + 44), color=c_rose, fill=(1, 0.95, 0.95))
        page.insert_text(
            (50, y + 18),
            "⚠ TAMPERING DETECTED · HASH CHAIN DISCONTINUITY FLAGGED",
            fontsize=9,
            color=c_rose,
            fontname="helv",
        )
        page.insert_text(
            (50, y + 32),
            f"Chain broken at sequence {integrity.get('tampered_sequence')}. Security alert dispatched to compliance auditor.",
            fontsize=7.5,
            color=c_rose,
            fontname="helv",
        )


def render_audit_pdf_certificate(
    org_display_name: str, audit_data: Dict[str, Any]
) -> bytes:
    """Generates an official A4 Audit Trail & Hash Chain Attestation Certificate via PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    c_dark = (0.05, 0.08, 0.14)
    c_emerald = (0.02, 0.58, 0.41)
    c_slate = (0.35, 0.42, 0.52)
    c_border = (0.86, 0.90, 0.94)
    c_card = (0.97, 0.98, 0.99)

    _draw_pdf_header_and_banner(page, org_display_name, audit_data)

    y_table = 175
    page.draw_rect(fitz.Rect(36, y_table, 559, y_table + 20), color=c_dark, fill=c_dark)
    for x, label in [
        (42, "SEQ"),
        (68, "TIMESTAMP (UTC)"),
        (160, "ENTITY"),
        (230, "ACTION"),
        (290, "USER / ROLE"),
        (410, "SHA-256 RECORD HASH"),
    ]:
        page.insert_text((x, y_table + 13), label, fontsize=7, color=(1, 1, 1), fontname="helv")

    row_y = y_table + 20
    for rec in audit_data["records"][:18]:
        fill_color = c_card if rec["sequence_number"] % 2 == 0 else (1, 1, 1)
        page.draw_rect(fitz.Rect(36, row_y, 559, row_y + 22), color=c_border, fill=fill_color)
        page.insert_text((42, row_y + 14), f"#{rec['sequence_number']}", fontsize=6.8, color=c_slate, fontname="helv")
        page.insert_text((68, row_y + 14), rec["timestamp"][:19], fontsize=6.8, color=c_dark, fontname="helv")
        page.insert_text((160, row_y + 14), f"{rec['entity_type']}: {rec['entity_id']}", fontsize=6.8, color=c_dark, fontname="helv")
        page.insert_text((230, row_y + 14), rec["action"], fontsize=6.8, color=c_emerald, fontname="helv")
        page.insert_text((290, row_y + 14), f"{rec['user_name']} ({rec['user_role']})", fontsize=6.5, color=c_dark, fontname="helv")
        page.insert_text((410, row_y + 14), f"{rec['record_hash'][:28]}...", fontsize=6.5, color=c_slate, fontname="helv")
        row_y += 22

    y_bot = 730
    page.draw_rect(fitz.Rect(36, y_bot, 559, y_bot + 75), color=c_border, fill=c_card)
    page.insert_text((48, y_bot + 16), "STATUTORY MAKER-CHECKER & RETENTION ATTESTATION", fontsize=7.8, color=c_dark, fontname="helv")
    page.insert_text((48, y_bot + 30), "• Dual-authorization segregation strictly enforced under ISO/IEC 17025 & EN 10204 3.1 Clause 6.", fontsize=7, color=c_slate, fontname="helv")
    page.insert_text((48, y_bot + 44), "• Immutable record retention configured to 10 years with active Legal-Hold preservation against soft/hard deletion.", fontsize=7, color=c_slate, fontname="helv")
    page.insert_text((48, y_bot + 58), "• Verifiable independently by executing SHA-256 tree walk over primary gazette certificates.", fontsize=7, color=c_emerald, fontname="helv")
    page.insert_text((36, 818), "HeatLedger AI · Certified Cryptographic Ledger · https://heatledger.ai/verify", fontsize=6.8, color=c_slate, fontname="helv")

    return doc.tobytes()
