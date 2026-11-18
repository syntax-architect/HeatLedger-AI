"""
HEATLEDGER AI: Realistic Sample EN 10204 3.1 Mill Test Certificate Generator
Creates authentic-looking upstream mill test certificates for SAIL, Tata Steel, and JSW.
"""

import os
import pymupdf

def create_sample_mtcs(output_dir: str = "sample_data"):
    os.makedirs(output_dir, exist_ok=True)
    
    samples = [
        {
            "filename": "SAIL_Bokaro_Heat_BOK-26-4910.pdf",
            "mill": "STEEL AUTHORITY OF INDIA LIMITED (SAIL)",
            "plant": "Bokaro Steel Plant, Jharkhand, India",
            "cert_no": "SAIL/BSL/QA/2026/4910-3.1",
            "date": "2026-08-14",
            "heat_no": "BOK-26-4910",
            "product": "Hot Rolled Carbon Steel Coils / Pipe Grade",
            "spec": "EN 10216-2 Grade P235GH (CN 7306)",
            "route": "Basic Oxygen Furnace (BOF) / Ladle Refining",
            "melt_country": "INDIA (IN)",
            "chem": [
                ("C", "0.14"), ("Mn", "1.10"), ("Si", "0.22"), 
                ("P", "0.018"), ("S", "0.012"), ("Cr", "0.08"), 
                ("Ni", "0.05"), ("Mo", "0.02"), ("Cu", "0.04")
            ],
            "mech": [
                ("Yield Strength (MPa)", "285"),
                ("Tensile Strength (MPa)", "440"),
                ("Elongation A5 (%)", "28.5"),
                ("Hardness (HBW)", "135")
            ]
        },
        {
            "filename": "Tata_Steel_Heat_TSJ-26-9021.pdf",
            "mill": "TATA STEEL LIMITED",
            "plant": "Jamshedpur Works, Jharkhand, India",
            "cert_no": "TSL/JAM/MTC/3.1/2026/9021",
            "date": "2026-09-02",
            "heat_no": "TSJ-26-9021",
            "product": "Forging Quality Round Billets",
            "spec": "ASTM A105 / ASME SA105 (CN 7307)",
            "route": "Basic Oxygen Furnace (BOF) / Vacuum Degassed",
            "melt_country": "INDIA (IN)",
            "chem": [
                ("C", "0.22"), ("Mn", "0.88"), ("Si", "0.25"), 
                ("P", "0.015"), ("S", "0.010"), ("Cr", "0.12"), 
                ("Ni", "0.08"), ("Mo", "0.03"), ("Cu", "0.06")
            ],
            "mech": [
                ("Yield Strength (MPa)", "310"),
                ("Tensile Strength (MPa)", "512"),
                ("Elongation A5 (%)", "30.0"),
                ("Reduction of Area (%)", "48.0"),
                ("Hardness (HBW)", "149")
            ]
        },
        {
            "filename": "JSW_Alloy_Heat_JSW-26-7734.pdf",
            "mill": "JSW STEEL LIMITED",
            "plant": "Salem Works, Tamil Nadu, India",
            "cert_no": "JSW/SLM/SBQ/2026/7734",
            "date": "2026-09-18",
            "heat_no": "JSW-26-7734",
            "product": "Alloy Steel Rolled Bars (Grade B7)",
            "spec": "ASTM A193 Grade B7 / AISI 4140 (CN 7318)",
            "route": "Electric Arc Furnace (EAF) / AOD",
            "melt_country": "INDIA (IN)",
            "chem": [
                ("C", "0.41"), ("Mn", "0.82"), ("Si", "0.28"), 
                ("P", "0.014"), ("S", "0.011"), ("Cr", "1.02"), 
                ("Mo", "0.22"), ("Ni", "0.04"), ("Cu", "0.05")
            ],
            "mech": [
                ("Yield Strength (MPa)", "760"),
                ("Tensile Strength (MPa)", "890"),
                ("Elongation A5 (%)", "18.5"),
                ("Reduction of Area (%)", "54.0"),
                ("Hardness (HBW)", "265")
            ]
        }
    ]

    generated_paths = []

    for s in samples:
        doc = pymupdf.open()
        page = doc.new_page(width=595, height=842)  # A4 size

        # Outer border
        page.draw_rect(pymupdf.Rect(20, 20, 575, 822), color=(0.1, 0.15, 0.25), width=1.5)
        
        # Header Box
        page.draw_rect(pymupdf.Rect(20, 20, 575, 90), color=(0.1, 0.15, 0.25), fill=(0.95, 0.96, 0.98))
        page.insert_text(pymupdf.Point(35, 45), s["mill"], fontsize=13, fontname="helv", color=(0.05, 0.1, 0.2))
        page.insert_text(pymupdf.Point(35, 60), f"Manufacturing Plant: {s['plant']}", fontsize=8.5, fontname="helv", color=(0.3, 0.35, 0.4))
        page.insert_text(pymupdf.Point(35, 78), "INSPECTION CERTIFICATE EN 10204:2004 TYPE 3.1 / ISO 10474 3.1.B", fontsize=9.5, fontname="helv", color=(0.1, 0.45, 0.2))

        # Right header block
        page.insert_text(pymupdf.Point(380, 45), f"Cert No: {s['cert_no']}", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text(pymupdf.Point(380, 60), f"Issue Date: {s['date']}", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text(pymupdf.Point(380, 78), "Page: 1 of 1", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))

        # Traceability & Origin Box
        page.draw_rect(pymupdf.Rect(30, 105, 565, 175), color=(0.8, 0.85, 0.9), fill=(0.98, 0.98, 1.0))
        page.insert_text(pymupdf.Point(40, 122), "MATERIAL TRACEABILITY & CUSTOMS ORIGIN ATTRIBUTION", fontsize=9, fontname="helv", color=(0.1, 0.2, 0.4))
        
        page.insert_text(pymupdf.Point(40, 142), f"Heat / Cast Number: {s['heat_no']}", fontsize=10, fontname="helv", color=(0.8, 0.35, 0.0))
        page.insert_text(pymupdf.Point(320, 142), f"Steelmaking Route: {s['route']}", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        
        page.insert_text(pymupdf.Point(40, 162), f"Product Description: {s['product']}", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))
        page.insert_text(pymupdf.Point(320, 162), f"Applicable Standard: {s['spec']}", fontsize=8.5, fontname="helv", color=(0.1, 0.1, 0.1))

        # Regulatory Melt & Pour Highlight Box
        page.draw_rect(pymupdf.Rect(30, 185, 565, 220), color=(0.1, 0.6, 0.3), fill=(0.92, 0.98, 0.94), width=1.0)
        page.insert_text(pymupdf.Point(40, 207), f"COUNTRY OF MELT AND POUR: {s['melt_country']} — EU REG 2026/1963 & UK CDS COMPLIANT", fontsize=8.5, fontname="helv", color=(0.05, 0.45, 0.2))

        # Chemical Composition Table
        page.draw_rect(pymupdf.Rect(30, 235, 565, 330), color=(0.7, 0.75, 0.8))
        page.draw_rect(pymupdf.Rect(30, 235, 565, 260), fill=(0.9, 0.93, 0.96))
        page.insert_text(pymupdf.Point(40, 252), "LADLE CHEMICAL ANALYSIS (% Weight)", fontsize=9, fontname="helv", color=(0.1, 0.15, 0.25))

        col_w = 520 / len(s["chem"])
        for i, (elem, val) in enumerate(s["chem"]):
            x = 35 + i * col_w
            page.insert_text(pymupdf.Point(x + 10, 280), elem, fontsize=9, fontname="helv", color=(0.2, 0.25, 0.35))
            page.insert_text(pymupdf.Point(x + 8, 305), val, fontsize=9, fontname="courier", color=(0.05, 0.1, 0.15))

        # Mechanical Test Results Table
        page.draw_rect(pymupdf.Rect(30, 345, 565, 435), color=(0.7, 0.75, 0.8))
        page.draw_rect(pymupdf.Rect(30, 345, 565, 370), fill=(0.9, 0.93, 0.96))
        page.insert_text(pymupdf.Point(40, 362), "MECHANICAL TEST RESULTS (ROOM TEMPERATURE)", fontsize=9, fontname="helv", color=(0.1, 0.15, 0.25))

        m_col_w = 520 / len(s["mech"])
        for i, (param, val) in enumerate(s["mech"]):
            x = 35 + i * m_col_w
            page.insert_text(pymupdf.Point(x + 5, 392), param[:18], fontsize=7.5, fontname="helv", color=(0.2, 0.25, 0.35))
            page.insert_text(pymupdf.Point(x + 15, 415), val, fontsize=9, fontname="courier", color=(0.05, 0.1, 0.15))

        # Sign-off and Legal Attestation
        page.draw_rect(pymupdf.Rect(30, 450, 565, 560), color=(0.8, 0.85, 0.9))
        page.insert_text(pymupdf.Point(40, 470), "INSPECTION REPRESENTATIVE VALIDATION", fontsize=9, fontname="helv", color=(0.1, 0.15, 0.25))
        page.insert_text(pymupdf.Point(40, 490), "We hereby certify that the material described above has been manufactured, sampled, tested,", fontsize=7.5, fontname="helv", color=(0.3, 0.3, 0.3))
        page.insert_text(pymupdf.Point(40, 503), "and inspected in accordance with the specification requirements and is found fully compliant.", fontsize=7.5, fontname="helv", color=(0.3, 0.3, 0.3))
        
        # Digital stamp mock
        page.draw_rect(pymupdf.Rect(380, 480, 540, 545), color=(0.1, 0.45, 0.2), width=1)
        page.insert_text(pymupdf.Point(395, 502), "APPROVED QUALITY CONTROL", fontsize=7.5, fontname="helv", color=(0.1, 0.45, 0.2))
        page.insert_text(pymupdf.Point(405, 517), "CHIEF METALLURGIST", fontsize=7, fontname="helv", color=(0.1, 0.45, 0.2))
        page.insert_text(pymupdf.Point(415, 532), "STAMP & SIGNATURE", fontsize=6.5, fontname="helv", color=(0.1, 0.45, 0.2))

        filepath = os.path.join(output_dir, s["filename"])
        doc.save(filepath)
        doc.close()
        generated_paths.append(filepath)
        print(f"Generated sample MTC: {filepath}")

    return generated_paths

if __name__ == "__main__":
    create_sample_mtcs()
