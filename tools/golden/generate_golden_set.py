"""
HEATLEDGER AI: Golden Set Generator (Prompt C0)
Generates 30 realistic, redacted MTC PDF documents across 5 major Indian mills
and their corresponding ground-truth JSON verification records.
"""

import json
import os
import pymupdf as fitz

MILLS = [
    {
        "name": "Tata Steel Limited, Jamshedpur Works",
        "short_code": "TATA",
        "country_melt": "India",
        "country_pour": "India",
        "grades": [
            {"grade": "ASTM A105", "std": "ASTM A105/A105M-21", "dim": "150mm x 25mm Round", "c": 0.21, "mn": 0.85, "p": 0.015, "s": 0.012, "si": 0.24, "cr": 0.08, "ni": 0.06, "ys": 295, "ts": 510, "el": 28.5},
            {"grade": "ASTM A36", "std": "ASTM A36/A36M-19", "dim": "20mm x 2500mm x 6000mm Plate", "c": 0.18, "mn": 0.90, "p": 0.020, "s": 0.015, "si": 0.22, "cr": 0.05, "ni": 0.04, "ys": 275, "ts": 465, "el": 26.0},
        ],
    },
    {
        "name": "JSW Steel Limited, Vijayanagar Works",
        "short_code": "JSW",
        "country_melt": "India",
        "country_pour": "India",
        "grades": [
            {"grade": "EN 10025-2 S355J2", "std": "EN 10025-2:2019", "dim": "25mm x 2000mm x 8000mm Heavy Plate", "c": 0.16, "mn": 1.45, "p": 0.018, "s": 0.009, "si": 0.32, "cr": 0.12, "ni": 0.08, "ys": 365, "ts": 530, "el": 24.0},
            {"grade": "EN 10025-2 S235JR", "std": "EN 10025-2:2019", "dim": "12mm x 1500mm x 6000mm Plate", "c": 0.14, "mn": 0.75, "p": 0.022, "s": 0.014, "si": 0.18, "cr": 0.04, "ni": 0.03, "ys": 255, "ts": 415, "el": 29.0},
        ],
    },
    {
        "name": "Jindal Stainless Limited, Hisar Plant",
        "short_code": "JSL",
        "country_melt": "India",
        "country_pour": "India",
        "grades": [
            {"grade": "ASTM A240 316L", "std": "ASTM A240/A240M-22", "dim": "6.0mm x 1250mm Coil", "c": 0.024, "mn": 1.35, "p": 0.028, "s": 0.006, "si": 0.45, "cr": 16.85, "ni": 10.20, "ys": 285, "ts": 595, "el": 45.0},
            {"grade": "ASTM A240 304", "std": "ASTM A240/A240M-22", "dim": "8.0mm x 1500mm Sheet", "c": 0.045, "mn": 1.42, "p": 0.030, "s": 0.008, "si": 0.48, "cr": 18.25, "ni": 8.15, "ys": 290, "ts": 620, "el": 48.0},
        ],
    },
    {
        "name": "Steel Authority of India Ltd (SAIL), Bokaro Steel Plant",
        "short_code": "SAIL",
        "country_melt": "India",
        "country_pour": "India",
        "is_bilingual": True,
        "grades": [
            {"grade": "IS 2062 E250 / S235JR", "std": "IS 2062:2011 / EN 10025-2", "dim": "16mm x 2000mm x 6000mm Plate", "c": 0.17, "mn": 0.82, "p": 0.025, "s": 0.018, "si": 0.20, "cr": 0.05, "ni": 0.04, "ys": 260, "ts": 430, "el": 27.5},
            {"grade": "ASTM A516 Gr 70", "std": "ASTM A516/A516M-17", "dim": "32mm x 2500mm x 7000mm Boiler Plate", "c": 0.23, "mn": 1.15, "p": 0.016, "s": 0.010, "si": 0.28, "cr": 0.08, "ni": 0.07, "ys": 315, "ts": 545, "el": 23.0},
        ],
    },
    {
        "name": "Kalyani Steels Limited, Pune Works",
        "short_code": "KSL",
        "country_melt": "India",
        "country_pour": "India",
        "grades": [
            {"grade": "SAE 4140 / 42CrMo4", "std": "ASTM A29 / EN 10083-3", "dim": "100mm Dia Round Bar", "c": 0.40, "mn": 0.88, "p": 0.014, "s": 0.008, "si": 0.26, "cr": 1.05, "ni": 0.18, "ys": 680, "ts": 950, "el": 17.0},
            {"grade": "SAE 1018", "std": "ASTM A29/A29M-20", "dim": "75mm Dia Round Bar", "c": 0.18, "mn": 0.72, "p": 0.018, "s": 0.015, "si": 0.20, "cr": 0.04, "ni": 0.03, "ys": 280, "ts": 460, "el": 25.0},
        ],
    },
]


def create_golden_set():
    base_dir = os.path.dirname(__file__)
    pdf_dir = os.path.join(base_dir, "mtcs")
    gt_dir = os.path.join(base_dir, "ground_truth")
    os.makedirs(pdf_dir, exist_ok=True)
    os.makedirs(gt_dir, exist_ok=True)

    mtc_index = 1

    for mill_idx, mill in enumerate(MILLS):
        for variant in range(6):  # 6 certificates per mill = 30 total
            spec_data = mill["grades"][variant % len(mill["grades"])]
            cert_id = f"mtc_{mtc_index:03d}"
            heat_no = f"{mill['short_code']}-26-{4000 + mtc_index * 17}"
            cert_no = f"CERT/{mill['short_code']}/2026/{8000 + mtc_index}"
            date_str = f"2026-05-{(mtc_index % 25) + 1:02d}"

            # Variations in chemistry
            c_val = round(spec_data["c"] + ((variant - 2) * 0.005), 3)
            mn_val = round(spec_data["mn"] + ((variant - 2) * 0.01), 2)
            p_val = round(spec_data["p"] + ((variant % 3) * 0.001), 3)
            s_val = round(spec_data["s"] + ((variant % 2) * 0.001), 3)
            si_val = round(spec_data["si"], 2)
            cr_val = round(spec_data["cr"], 2)
            ni_val = round(spec_data["ni"], 2)

            ys_val = spec_data["ys"] + (variant * 5)
            ts_val = spec_data["ts"] + (variant * 6)
            el_val = round(spec_data["el"] - (variant * 0.3), 1)

            # Build ground truth JSON
            gt_record = {
                "id": cert_id,
                "mill": mill["name"],
                "certificate_number": cert_no,
                "heat_number": heat_no,
                "date": date_str,
                "grade": spec_data["grade"],
                "standard": spec_data["std"],
                "dimensions": spec_data["dim"],
                "country_of_melt": mill["country_melt"],
                "country_of_pour": mill["country_pour"],
                "chemistry": {
                    "C": c_val,
                    "Mn": mn_val,
                    "P": p_val,
                    "S": s_val,
                    "Si": si_val,
                    "Cr": cr_val,
                    "Ni": ni_val,
                },
                "mechanical": {
                    "yield_strength_mpa": ys_val,
                    "tensile_strength_mpa": ts_val,
                    "elongation_pct": el_val,
                },
                "layout_style": "bilingual_hindi" if mill.get("is_bilingual") else ("scanned_dotmatrix" if variant % 2 == 1 else "clean_vector"),
            }

            gt_file = os.path.join(gt_dir, f"{cert_id}.json")
            with open(gt_file, "w", encoding="utf-8") as f:
                json.dump(gt_record, f, indent=2)

            # Generate PDF matching this ground truth
            doc = fitz.open()
            page = doc.new_page(width=595, height=842)

            # Styling
            is_dotmatrix = (variant % 2 == 1)
            font_title = "helv"
            font_body = "helv"
            c_text = (0.1, 0.1, 0.1) if not is_dotmatrix else (0.15, 0.15, 0.25)

            # Header Banner
            page.draw_rect(fitz.Rect(36, 36, 559, 86), color=(0.85, 0.88, 0.92), fill=(0.95, 0.96, 0.98))
            header_title = "MILL TEST CERTIFICATE (EN 10204 3.1) - BILINGUAL EDITION" if mill.get("is_bilingual") else "INSPECTION TEST CERTIFICATE - EN 10204 TYPE 3.1"
            page.insert_text((48, 56), header_title, fontsize=10, color=c_text, fontname=font_title)
            page.insert_text((48, 72), mill["name"].upper(), fontsize=11, color=(0.05, 0.35, 0.20), fontname=font_title)

            # Metadata Table
            y = 105
            page.draw_rect(fitz.Rect(36, y, 559, y + 80), color=(0.8, 0.8, 0.8))
            page.insert_text((45, y + 18), f"Certificate No: {cert_no}", fontsize=8.5, color=c_text, fontname=font_body)
            page.insert_text((340, y + 18), f"Issue Date: {date_str}", fontsize=8.5, color=c_text, fontname=font_body)
            page.insert_text((45, y + 36), f"Heat Number: {heat_no}", fontsize=9, color=(0.1, 0.2, 0.5), fontname=font_title)
            page.insert_text((340, y + 36), f"Material Grade: {spec_data['grade']}", fontsize=9, color=c_text, fontname=font_title)
            page.insert_text((45, y + 54), f"Standard / Spec: {spec_data['std']}", fontsize=8.5, color=c_text, fontname=font_body)
            page.insert_text((340, y + 54), f"Dimensions: {spec_data['dim']}", fontsize=8.5, color=c_text, fontname=font_body)
            page.insert_text((45, y + 72), f"Country of Melt: {mill['country_melt']}", fontsize=8.5, color=(0.05, 0.45, 0.20), fontname=font_body)
            page.insert_text((340, y + 72), f"Country of Pour: {mill['country_pour']}", fontsize=8.5, color=(0.05, 0.45, 0.20), fontname=font_body)

            # Chemical Analysis Table
            y = 205
            page.insert_text((36, y), "CHEMICAL COMPOSITION (% WT - LADLE ANALYSIS)", fontsize=9, color=(0.05, 0.15, 0.30), fontname=font_title)
            y += 10
            page.draw_rect(fitz.Rect(36, y, 559, y + 35), color=(0.7, 0.75, 0.8), fill=(0.95, 0.96, 0.98))
            cols = ["C", "Mn", "P", "S", "Si", "Cr", "Ni"]
            vals = [c_val, mn_val, p_val, s_val, si_val, cr_val, ni_val]
            x_start = 50
            for c_name, val in zip(cols, vals):
                page.insert_text((x_start, y + 14), c_name, fontsize=8, color=c_text, fontname=font_title)
                page.insert_text((x_start, y + 28), f"{val:.3f}" if c_name in ["C", "P", "S"] else f"{val:.2f}", fontsize=8, color=c_text, fontname=font_body)
                x_start += 70

            # Mechanical Properties Table
            y = 265
            page.insert_text((36, y), "MECHANICAL PROPERTIES / TENSILE TESTING", fontsize=9, color=(0.05, 0.15, 0.30), fontname=font_title)
            y += 10
            page.draw_rect(fitz.Rect(36, y, 559, y + 35), color=(0.7, 0.75, 0.8), fill=(0.95, 0.96, 0.98))
            page.insert_text((50, y + 14), "Yield Strength (MPa)", fontsize=8, color=c_text, fontname=font_title)
            page.insert_text((50, y + 28), str(ys_val), fontsize=8.5, color=c_text, fontname=font_body)

            page.insert_text((220, y + 14), "Tensile Strength (MPa)", fontsize=8, color=c_text, fontname=font_title)
            page.insert_text((220, y + 28), str(ts_val), fontsize=8.5, color=c_text, fontname=font_body)

            page.insert_text((400, y + 14), "Elongation A5 (%)", fontsize=8, color=c_text, fontname=font_title)
            page.insert_text((400, y + 28), f"{el_val:.1f}%", fontsize=8.5, color=c_text, fontname=font_body)

            # Footer / Endorsement
            y = 330
            page.draw_rect(fitz.Rect(36, y, 559, y + 55), color=(0.85, 0.85, 0.85))
            page.insert_text((45, y + 18), "CERTIFIED BY QUALITY ASSURANCE DIVISION", fontsize=8, color=c_text, fontname=font_title)
            page.insert_text((45, y + 32), "Material conforms to specified standard. Redacted commercial copy pursuant to regulatory golden set.", fontsize=7.5, color=(0.4, 0.4, 0.4), fontname=font_body)
            page.insert_text((45, y + 46), f"Verification Hash: SHA256({cert_id})", fontsize=7, color=(0.5, 0.5, 0.5), fontname="helv")

            pdf_file = os.path.join(pdf_dir, f"{cert_id}.pdf")
            doc.save(pdf_file)
            doc.close()

            mtc_index += 1

    print(f"Golden Set generated: {mtc_index - 1} MTC PDFs and ground truth JSONs created.")


if __name__ == "__main__":
    create_golden_set()
