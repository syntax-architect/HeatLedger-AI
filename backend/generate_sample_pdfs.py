"""
HEATLEDGER AI: Sample MTC Generator
Generates realistic EN 10204 3.1 test PDFs for SAIL Bokaro, Tata Steel, and JSW Steel.
Each sample has distinct, authentic chemistry and mechanical properties.
"""

import os

import pymupdf as fitz


def create_sample_pdf(
    filepath: str,
    mill_name: str,
    heat_no: str,
    grade: str,
    country: str,
    has_explicit_melt: bool,
    elems: list,
    mechs: list
):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4

    # Background frame
    page.draw_rect(fitz.Rect(20, 20, 575, 822), color=(0.1, 0.1, 0.1), width=1.5)
    page.draw_rect(fitz.Rect(25, 25, 570, 817), color=(0.7, 0.7, 0.7), width=0.5)

    # Header
    page.draw_rect(fitz.Rect(25, 25, 570, 85), fill=(0.04, 0.05, 0.09))
    page.insert_text(fitz.Point(40, 55), mill_name.upper(), fontsize=15, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(40, 72), "CENTRAL QUALITY CONTROL & METALLURGY DIVISION · NABL ACCREDITED LAB", fontsize=7.5, color=(0.06, 0.72, 0.51))
    page.insert_text(fitz.Point(370, 55), "EN 10204:2004 TYPE 3.1", fontsize=11, color=(1, 1, 1), fontname="helv")
    page.insert_text(fitz.Point(370, 72), f"TEST CERTIFICATE REF: {heat_no}-MTC", fontsize=8, color=(0.96, 0.62, 0.04))

    # Heat Identification Box
    page.draw_rect(fitz.Rect(40, 100, 555, 175), fill=(0.97, 0.98, 0.99), color=(0.8, 0.85, 0.9), width=1)
    page.insert_text(fitz.Point(55, 120), "HEAT / CAST NUMBER:", fontsize=8, color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(170, 120), f"#{heat_no}", fontsize=11, color=(0.6, 0.2, 0.0), fontname="helv")

    page.insert_text(fitz.Point(55, 140), "STANDARD / STEEL GRADE:", fontsize=8, color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(170, 140), grade, fontsize=9, color=(0.1, 0.1, 0.1))

    page.insert_text(fitz.Point(55, 160), "STEELMAKING ROUTE:", fontsize=8, color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(170, 160), "Basic Oxygen Furnace (BOF) / Continuous Cast Billet", fontsize=8, color=(0.1, 0.1, 0.1))

    # Country of Melt and Pour Attestation
    if has_explicit_melt:
        page.draw_rect(fitz.Rect(320, 110, 545, 165), fill=(0.95, 1.0, 0.95), color=(0.06, 0.72, 0.51), width=1)
        page.insert_text(fitz.Point(330, 128), "COUNTRY OF MELT & POUR (EU REG 2026/1963):", fontsize=7.5, color=(0.02, 0.4, 0.2))
        page.insert_text(fitz.Point(330, 148), f"COUNTRY OF MELT AND POUR: {country.upper()} (ISO 3166-1: IN)", fontsize=8.5, color=(0.02, 0.4, 0.2), fontname="helv")
    else:
        page.draw_rect(fitz.Rect(320, 110, 545, 165), fill=(1.0, 0.95, 0.95), color=(0.9, 0.2, 0.2), width=1)
        page.insert_text(fitz.Point(330, 138), "ORIGIN: DOMESTIC STOCK (NO EXPLICIT MELT FIELD)", fontsize=7.5, color=(0.8, 0.1, 0.1))

    # Chemical Ladle Spectrometry Table
    page.insert_text(fitz.Point(40, 205), "CHEMICAL COMPOSITION — LADLE OPTICAL EMISSION SPECTROMETRY (%)", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv")
    page.draw_rect(fitz.Rect(40, 215, 555, 260), fill=(0.94, 0.96, 0.98), color=(0.8, 0.85, 0.9), width=1)

    col_w = (555 - 40) / len(elems)
    for idx, (sym, val) in enumerate(elems):
        cx = 45 + (idx * col_w)
        page.insert_text(fitz.Point(cx, 233), sym, fontsize=8, color=(0.3, 0.3, 0.3))
        page.insert_text(fitz.Point(cx, 250), val, fontsize=8.5, color=(0.0, 0.0, 0.0), fontname="helv")

    # Mechanical Properties Table
    page.insert_text(fitz.Point(40, 290), "MECHANICAL & TENSILE PROPERTIES (ROOM TEMPERATURE 23°C)", fontsize=8.5, color=(0.1, 0.1, 0.1), fontname="helv")
    page.draw_rect(fitz.Rect(40, 300, 555, 380), fill=(1.0, 1.0, 1.0), color=(0.8, 0.85, 0.9), width=1)

    for m_idx, (m_name, m_val, m_req, m_res) in enumerate(mechs):
        my = 318 + (m_idx * 18)
        page.insert_text(fitz.Point(50, my), m_name, fontsize=8, color=(0.2, 0.2, 0.2))
        page.insert_text(fitz.Point(300, my), m_val, fontsize=8, color=(0.0, 0.0, 0.0), fontname="helv")
        page.insert_text(fitz.Point(420, my), m_req, fontsize=7.5, color=(0.4, 0.4, 0.4))
        page.insert_text(fitz.Point(510, my), m_res, fontsize=8, color=(0.06, 0.72, 0.51), fontname="helv")

    # Radiation & Radioactive Clearance
    page.draw_rect(fitz.Rect(40, 400, 555, 435), fill=(0.97, 0.98, 0.99), color=(0.85, 0.85, 0.85), width=0.5)
    page.insert_text(fitz.Point(50, 415), "RADIOACTIVE CONTAMINATION CHECK: Verified free from radioactive isotopes (< 0.1 Bq/g).", fontsize=7.5, color=(0.3, 0.3, 0.3))
    page.insert_text(fitz.Point(50, 428), "WELDABILITY & GRAIN SIZE: Fully killed, fine grain practice (ASTM Grain Size No. 7 or finer).", fontsize=7.5, color=(0.3, 0.3, 0.3))

    # Stamp & Signatures
    page.draw_rect(fitz.Rect(350, 460, 545, 560), color=(0.06, 0.72, 0.51), width=1.5)
    page.draw_circle(fitz.Point(480, 510), 30, color=(0.06, 0.72, 0.51), width=1)
    page.insert_text(fitz.Point(455, 507), "APPROVED", fontsize=8, color=(0.06, 0.72, 0.51), fontname="helv")
    page.insert_text(fitz.Point(460, 517), "QA STAMP", fontsize=7, color=(0.06, 0.72, 0.51))

    page.insert_text(fitz.Point(365, 480), "WORKS INSPECTION DEPARTMENT", fontsize=7.5, color=(0.2, 0.2, 0.2))
    page.insert_text(fitz.Point(365, 498), "Authorised Inspection Representative", fontsize=7.5, color=(0.4, 0.4, 0.4))
    page.insert_text(fitz.Point(365, 540), "EN 10204:2004 3.1 CERTIFIED", fontsize=7.5, color=(0.06, 0.72, 0.51), fontname="helv")

    doc.save(filepath)
    doc.close()
    print(f"Generated: {filepath}")


if __name__ == "__main__":
    sail_chem = [("C", "0.14"), ("Mn", "1.10"), ("Si", "0.22"), ("P", "0.018"), ("S", "0.012"), ("Cr", "0.08"), ("Ni", "0.05"), ("Mo", "0.02"), ("CEV", "0.334")]
    sail_mech = [
        ("Yield Strength ReH / 0.2% Proof", "285 MPa", "≥ 235 MPa", "PASS"),
        ("Tensile Strength Rm", "440 MPa", "360 - 510 MPa", "PASS"),
        ("Elongation A5 in 50mm", "28.5 %", "≥ 24.0 %", "PASS"),
        ("Hardness (Brinell HBW 10/3000)", "135 HBW", "≤ 160 HBW", "PASS"),
    ]

    tata_chem = [("C", "0.22"), ("Mn", "0.88"), ("Si", "0.25"), ("P", "0.015"), ("S", "0.010"), ("Cr", "0.12"), ("Ni", "0.08"), ("Mo", "0.02"), ("CEV", "0.392")]
    tata_mech = [
        ("Yield Strength ReH / 0.2% Proof", "310 MPa", "≥ 250 MPa", "PASS"),
        ("Tensile Strength Rm", "512 MPa", "485 - 650 MPa", "PASS"),
        ("Elongation A5 in 50mm", "28.5 %", "≥ 22.0 %", "PASS"),
        ("Hardness (Brinell HBW 10/3000)", "156 HBW", "≤ 187 HBW", "PASS"),
    ]

    jsw_chem = [("C", "0.41"), ("Mn", "0.82"), ("Si", "0.28"), ("P", "0.014"), ("S", "0.011"), ("Cr", "1.02"), ("Ni", "0.04"), ("Mo", "0.22"), ("CEV", "0.648")]
    jsw_mech = [
        ("Yield Strength ReH / 0.2% Proof", "760 MPa", "≥ 725 MPa", "PASS"),
        ("Tensile Strength Rm", "890 MPa", "≥ 860 MPa", "PASS"),
        ("Elongation A5 in 50mm", "18.5 %", "≥ 16.0 %", "PASS"),
        ("Hardness (Brinell HBW 10/3000)", "265 HBW", "220 - 321 HBW", "PASS"),
    ]

    sample_configs = [
        ("backend/samples/SAIL_Bokaro_3.1_MTC_BOK-26-4910.pdf", "SAIL Bokaro Steel Plant", "BOK-26-4910", "IS 2062 E250 / ASTM A53 Gr B", "INDIA", True, sail_chem, sail_mech),
        ("backend/samples/Tata_Steel_3.1_MTC_TSJ-26-9021.pdf", "Tata Steel Jamshedpur", "TSJ-26-9021", "ASTM A105 Carbon Forging Billet", "INDIA", True, tata_chem, tata_mech),
        ("backend/samples/JSW_Steel_3.1_MTC_JSW-26-7734.pdf", "JSW Steel Vijayanagar", "JSW-26-7734", "AISI 4140 / ASTM A193 B7 Alloy Bar", "INDIA", True, jsw_chem, jsw_mech),
    ]

    for path, mill, heat, gr, ctry, has_melt, chem, mech in sample_configs:
        create_sample_pdf(path, mill, heat, gr, ctry, has_melt, chem, mech)
