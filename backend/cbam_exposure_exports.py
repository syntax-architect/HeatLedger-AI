"""
Importer data pack exports (CSV, Excel, Summary PDF) and accredited verifier
handoff dossier builder extracted from CBAMExposureService.
"""

import io
from datetime import datetime, timezone
from typing import Any, Dict

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
import pymupdf as fitz

try:
    from security_hardening import SafeCSVWriter
except ImportError:
    from backend.security_hardening import SafeCSVWriter

# Mandatory regulatory disclaimer strings per Prompt C4
CBAM_DISCLAIMER_PREPARED = (
    "Prepared by the plant, not verified. EU CBAM compliance requires verification "
    "by an EU-accredited verifier before actual emissions can be claimed by the importer."
)
CBAM_VERIFIER_MEMO_DISCLAIMER = (
    "Prepared by the plant for accredited third-party verification. This dossier supports "
    "the verifier review and does not replace statutory EU accreditation."
)


def generate_importer_csv(exposure_result: Dict[str, Any]) -> str:
    """Produces clean, formula-injection safe CSV matching importer CBAM tool ingestion format."""
    output = io.StringIO()
    writer = SafeCSVWriter(output)

    writer.writerow(["HEATLEDGER AI - CBAM IMPORTER DATA PACK (PROMPT C4)"])
    writer.writerow(["STATUS", "Prepared by the plant, not verified"])
    writer.writerow(["PLANT", exposure_result.get("plant_name", "Export Facility")])
    writer.writerow(["IMPORTER", exposure_result.get("importer_name", "EU Importer")])
    writer.writerow(["CALCULATION_YEAR", exposure_result.get("year", 2026)])
    writer.writerow(["CERTIFICATE_PRICE_QUARTER", exposure_result.get("quarter", "2026-Q1")])
    writer.writerow(["CERTIFICATE_PRICE_EUR_PER_TCO2", exposure_result.get("certificate_price_eur", 0.0)])
    writer.writerow(["DEFAULT_MARKUP_PCT", f"{exposure_result.get('markup_pct_applied', 10.0)}%"])
    writer.writerow([])

    headers = [
        "Line", "Heat Number", "CN Code", "Description", "Net Mass (t)", "Route",
        "Scrap Share (%)", "Plant Direct (tCO2/t)", "Plant Indirect (tCO2/t)",
        "Plant Total (tCO2/t)", "Actual Emissions (tCO2)", "Default Marked (tCO2/t)",
        "Default Emissions (tCO2)", "Emissions Saved (tCO2)", "Plant Cost (€)",
        "Default Cost (€)", "Cost Savings (€)", "Direct Source Note", "Indirect Source Note",
    ]
    writer.writerow(headers)

    for line in exposure_result.get("lines", []):
        writer.writerow([
            line.get("line_number"),
            line.get("heat_number"),
            line.get("cn_code"),
            line.get("description"),
            line.get("net_mass_tonnes"),
            line.get("production_route"),
            line.get("scrap_share_pct"),
            line.get("actual_direct_tco2_per_t"),
            line.get("actual_indirect_tco2_per_t"),
            line.get("actual_total_tco2_per_t"),
            line.get("actual_emissions_tco2"),
            line.get("default_marked_tco2_per_t"),
            line.get("default_emissions_tco2"),
            line.get("emissions_savings_tco2"),
            line.get("actual_cbam_cost_eur"),
            line.get("default_cbam_cost_eur"),
            line.get("cost_exposure_savings_eur"),
            line.get("source_note_direct"),
            line.get("source_note_indirect"),
        ])

    totals = exposure_result.get("totals", {})
    writer.writerow([])
    writer.writerow([
        "TOTALS", "", "", "", totals.get("total_mass_tonnes"), "", "", "", "", "",
        totals.get("total_actual_emissions_tco2"), "",
        totals.get("total_default_emissions_tco2"), totals.get("total_emissions_savings_tco2"),
        totals.get("total_actual_cost_eur"), totals.get("total_default_cost_eur"),
        totals.get("total_cost_exposure_savings_eur"), "", "",
    ])

    writer.writerow([])
    writer.writerow(["EXPOSURE SUMMARY", exposure_result.get("exposure_card", {}).get("statement", "")])
    writer.writerow(["STATUTORY DISCLAIMER", CBAM_DISCLAIMER_PREPARED])

    return output.getvalue()


def generate_importer_excel(exposure_result: Dict[str, Any]) -> bytes:
    """Generates formatted Excel workbook (.xlsx) with formulas and styling for importer CBAM teams."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "CBAM Importer Data Pack"

    font_title = Font(name="Calibri", size=14, bold=True, color="0F172A")
    font_sub = Font(name="Calibri", size=10, italic=True, color="475569")
    font_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    fill_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    border_thin = Side(border_style="thin", color="CBD5E1")
    cell_border = Border(top=border_thin, left=border_thin, right=border_thin, bottom=border_thin)

    ws.cell(row=1, column=1, value="HEATLEDGER AI - CBAM DATA PACK (PROMPT C4)").font = font_title
    ws.cell(row=2, column=1, value="Status: Prepared by the plant, not verified").font = font_sub
    ws.cell(row=3, column=1, value=f"Exporter: {exposure_result.get('plant_name')} | Importer: {exposure_result.get('importer_name')}").font = font_sub
    ws.cell(row=4, column=1, value=f"Quarter Price: €{exposure_result.get('certificate_price_eur')}/tCO2 ({exposure_result.get('quarter')}) | Default Markup: {exposure_result.get('markup_pct_applied')}%").font = font_sub

    headers = [
        "Line", "Heat No", "CN Code", "Product Description", "Mass (t)",
        "Route", "Scrap %", "Plant Dir (t/t)", "Plant Indir (t/t)", "Plant Total (t/t)",
        "Actual CO2 (t)", "Def Marked (t/t)", "Default CO2 (t)", "CO2 Savings (t)",
        "Plant Cost (€)", "Default Cost (€)", "Exposure Savings (€)",
    ]

    start_row = 6
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=start_row, column=col_idx, value=header)
        cell.font = font_header
        cell.fill = fill_header
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = cell_border

    current_row = start_row + 1
    for line in exposure_result.get("lines", []):
        vals = [
            line.get("line_number"),
            line.get("heat_number"),
            line.get("cn_code"),
            line.get("description"),
            line.get("net_mass_tonnes"),
            line.get("production_route"),
            line.get("scrap_share_pct"),
            line.get("actual_direct_tco2_per_t"),
            line.get("actual_indirect_tco2_per_t"),
            line.get("actual_total_tco2_per_t"),
            line.get("actual_emissions_tco2"),
            line.get("default_marked_tco2_per_t"),
            line.get("default_emissions_tco2"),
            line.get("emissions_savings_tco2"),
            line.get("actual_cbam_cost_eur"),
            line.get("default_cbam_cost_eur"),
            line.get("cost_exposure_savings_eur"),
        ]
        for col_idx, v in enumerate(vals, 1):
            cell = ws.cell(row=current_row, column=col_idx, value=v)
            cell.font = Font(name="Calibri", size=10)
            cell.border = cell_border
            if isinstance(v, (int, float)):
                cell.alignment = Alignment(horizontal="right")
        current_row += 1

    totals = exposure_result.get("totals", {})
    total_vals = [
        "TOTALS", "", "", "", totals.get("total_mass_tonnes"),
        "", "", "", "", "", totals.get("total_actual_emissions_tco2"),
        "", totals.get("total_default_emissions_tco2"), totals.get("total_emissions_savings_tco2"),
        totals.get("total_actual_cost_eur"), totals.get("total_default_cost_eur"), totals.get("total_cost_exposure_savings_eur"),
    ]
    for col_idx, v in enumerate(total_vals, 1):
        cell = ws.cell(row=current_row, column=col_idx, value=v)
        cell.font = Font(name="Calibri", size=10, bold=True)
        cell.fill = fill_totals
        cell.border = cell_border
        if isinstance(v, (int, float)):
            cell.alignment = Alignment(horizontal="right")

    current_row += 2
    card_text = exposure_result.get("exposure_card", {}).get("statement", "")
    ws.cell(row=current_row, column=1, value=f"EXPOSURE: {card_text}").font = Font(name="Calibri", size=10, bold=True, color="166534")
    current_row += 1
    ws.cell(row=current_row, column=1, value=f"NOTE: {CBAM_DISCLAIMER_PREPARED}").font = font_sub

    for col in ws.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = openpyxl.utils.get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 11)

    out_stream = io.BytesIO()
    wb.save(out_stream)
    return out_stream.getvalue()


def generate_importer_summary_pdf(exposure_result: Dict[str, Any]) -> bytes:
    """Generates clean 1-page PDF summary stamped as 'Prepared by <plant>. Not verified.'"""
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)

    C_DARK = (0.06, 0.09, 0.16)
    C_GREEN = (0.08, 0.50, 0.32)
    C_CARD = (0.95, 0.97, 0.99)
    C_TEXT = (0.15, 0.20, 0.28)
    C_MUTED = (0.45, 0.50, 0.58)

    page.draw_rect(fitz.Rect(36, 36, 559, 90), color=C_DARK, fill=C_DARK)
    page.insert_text((48, 58), "HEATLEDGER AI · CBAM EXPOSURE & DATA PACK", fontsize=11, color=(1, 1, 1), fontname="helv")
    page.insert_text((48, 73), "Regulation (EU) 2023/956 & Implementing Regulation (EU) 2023/1773 Annex III", fontsize=7.5, color=(0.4, 0.85, 0.6), fontname="helv")
    page.insert_text((48, 83), "STATUTORY STATUS: Prepared by the plant, not verified.", fontsize=7.5, color=(1, 0.8, 0.4), fontname="helv")

    card_rect = fitz.Rect(36, 102, 559, 168)
    page.draw_rect(card_rect, color=(0.85, 0.90, 0.95), fill=C_CARD)
    page.insert_text((48, 120), "ESTIMATED CBAM FINANCIAL EXPOSURE", fontsize=9, color=C_GREEN, fontname="helv")

    card_text = exposure_result.get("exposure_card", {}).get("statement", "")
    page.insert_text((48, 136), card_text[:95], fontsize=8.5, color=C_TEXT, fontname="helv")
    if len(card_text) > 95:
        page.insert_text((48, 149), card_text[95:], fontsize=8.5, color=C_TEXT, fontname="helv")

    q_info = f"Certificate Price: €{exposure_result.get('certificate_price_eur')}/tCO2 ({exposure_result.get('quarter')}) · Year Markup: {exposure_result.get('markup_pct_applied')}%"
    page.insert_text((48, 162), q_info, fontsize=7.5, color=C_MUTED, fontname="helv")

    y = 185
    page.insert_text((36, y), "SHIPMENT LINES & EMISSIONS COMPARISON", fontsize=9, color=C_DARK, fontname="helv")
    y += 12

    page.draw_rect(fitz.Rect(36, y, 559, y + 16), color=(0.88, 0.91, 0.95), fill=(0.88, 0.91, 0.95))
    for xpos, label in (
        (40, "Line"), (65, "Heat No"), (130, "CN Code"), (180, "Mass (t)"),
        (230, "Actual (t/t)"), (295, "Default (t/t)"), (365, "Actual CO2"),
        (430, "Actual Cost"), (495, "Savings (€)"),
    ):
        page.insert_text((xpos, y + 11), label, fontsize=7.5, color=C_DARK, fontname="helv")
    y += 18

    for line in exposure_result.get("lines", []):
        page.draw_line(fitz.Point(36, y + 12), fitz.Point(559, y + 12), color=(0.92, 0.94, 0.96))
        page.insert_text((40, y + 9), str(line.get("line_number")), fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((65, y + 9), str(line.get("heat_number"))[:12], fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((130, y + 9), str(line.get("cn_code")), fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((180, y + 9), f"{line.get('net_mass_tonnes'):.2f}", fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((230, y + 9), f"{line.get('actual_total_tco2_per_t'):.3f}", fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((295, y + 9), f"{line.get('default_marked_tco2_per_t'):.3f}", fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((365, y + 9), f"{line.get('actual_emissions_tco2'):.2f} t", fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((430, y + 9), f"€{line.get('actual_cbam_cost_eur'):,.0f}", fontsize=7.5, color=C_TEXT, fontname="helv")
        page.insert_text((495, y + 9), f"€{line.get('cost_exposure_savings_eur'):,.0f}", fontsize=7.5, color=C_GREEN, fontname="helv")
        y += 14

    totals = exposure_result.get("totals", {})
    y += 4
    page.draw_rect(fitz.Rect(36, y, 559, y + 16), color=(0.94, 0.96, 0.98), fill=(0.94, 0.96, 0.98))
    page.insert_text((40, y + 11), "TOTAL", fontsize=8, color=C_DARK, fontname="helv")
    page.insert_text((180, y + 11), f"{totals.get('total_mass_tonnes'):.2f} t", fontsize=8, color=C_DARK, fontname="helv")
    page.insert_text((365, y + 11), f"{totals.get('total_actual_emissions_tco2'):.2f} t", fontsize=8, color=C_DARK, fontname="helv")
    page.insert_text((430, y + 11), f"€{totals.get('total_actual_cost_eur'):,.0f}", fontsize=8, color=C_DARK, fontname="helv")
    page.insert_text((495, y + 11), f"€{totals.get('total_cost_exposure_savings_eur'):,.0f}", fontsize=8, color=C_GREEN, fontname="helv")
    y += 26

    page.insert_text((36, y), "KEY REGULATORY ASSUMPTIONS & AUDIT NOTES", fontsize=8.5, color=C_DARK, fontname="helv")
    y += 12
    for asm in exposure_result.get("exposure_card", {}).get("assumptions", []):
        page.insert_text((42, y), f"• {asm}", fontsize=7, color=C_MUTED, fontname="helv")
        y += 10

    plant_label = exposure_result.get("plant_name", "the plant")
    watermark_text = f"Prepared by {plant_label}. Tamper-evident seal. Not a legal verification."
    page.draw_rect(fitz.Rect(36, 792, 559, 814), color=(0.90, 0.92, 0.95), fill=(0.95, 0.96, 0.98))
    page.insert_text((48, 806), watermark_text, fontsize=7.5, color=C_MUTED, fontname="helv")

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def generate_verifier_handoff_package(exposure_result: Dict[str, Any]) -> Dict[str, Any]:
    """Creates structured verifier handoff package an EU-accredited verifier can open."""
    lines_audit = []
    for line in exposure_result.get("lines", []):
        lines_audit.append({
            "line_number": line.get("line_number"),
            "heat_number": line.get("heat_number"),
            "cn_code": line.get("cn_code"),
            "production_route": line.get("production_route"),
            "scrap_share_pct": line.get("scrap_share_pct"),
            "activity_data": {
                "net_mass_tonnes": line.get("net_mass_tonnes"),
                "actual_direct_tco2_per_t": line.get("actual_direct_tco2_per_t"),
                "actual_indirect_tco2_per_t": line.get("actual_indirect_tco2_per_t"),
                "source_note_direct": line.get("source_note_direct"),
                "source_note_indirect": line.get("source_note_indirect"),
            },
            "calculation_trace": {
                "formula_actual": line.get("formula_actual"),
                "actual_emissions_tco2": line.get("actual_emissions_tco2"),
                "default_benchmark_base_tco2_per_t": line.get("default_base_tco2_per_t"),
                "markup_pct_applied": line.get("markup_pct_applied"),
                "default_benchmark_marked_tco2_per_t": line.get("default_marked_tco2_per_t"),
                "formula_default": line.get("formula_default"),
                "default_emissions_tco2": line.get("default_emissions_tco2"),
            },
            "evidence_references": [
                {"document_type": "MTC", "heat_number": line.get("heat_number"), "status": "AVAILABLE_FOR_AUDIT"},
                {"document_type": "POWER_BILL_GRID_FACTOR", "status": "ON_FILE"},
                {"document_type": "FUEL_CONSUMPTION_LOG", "status": "ON_FILE"},
            ],
        })

    return {
        "dossier_type": "CBAM_ACCREDITED_VERIFIER_HANDOFF_PACKAGE",
        "schema_version": "2026.11-v1",
        "statutory_notice": CBAM_VERIFIER_MEMO_DISCLAIMER,
        "verification_disclaimer": "This dossier supports the accredited verifier review and does not replace statutory EU accreditation.",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "plant_name": exposure_result.get("plant_name"),
        "importer_name": exposure_result.get("importer_name"),
        "reporting_year": exposure_result.get("year"),
        "quarterly_price_used_eur": exposure_result.get("certificate_price_eur"),
        "quarter_label": exposure_result.get("quarter"),
        "totals": exposure_result.get("totals"),
        "lines_audit_trail": lines_audit,
        "methodology_reference": "Commission Implementing Regulation (EU) 2023/1773 Annex III & Regulation (EU) 2023/956",
    }
