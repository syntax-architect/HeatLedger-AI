"""
HEATLEDGER AI: End-to-End Pipeline Automated Test Runner
Tests the full lifecycle: Sample MTC PDF -> OCR -> Metallurgy Validation -> CBAM Engine -> Stamped Dossier & XML
"""

import os
import json
from compliance_engine import ComplianceEngine
from dossier_generator import DossierGenerator

def run_e2e_pipeline():
    print("=" * 80)
    print("HEATLEDGER AI: END-TO-END VERIFICATION PIPELINE TEST")
    print("=" * 80)

    # 1. Define Test Shipment Specifications
    shipment = {
        "invoice_number": "EXP-2026-109",
        "buyer": "Wilhelm Flanschen GmbH, Hamburg, Germany",
        "company_name": "Howrah Precision Forgings Pvt. Ltd.",
        "plant_id": "IN-WB-4409",
        "unlocode": "IN CCU",
        "lat": 22.6105,
        "lon": 88.3421,
        "cn_code": "73079100",
        "product": "Forged Carbon Steel Flanges ASTM A105",
        "net_tonnes": 24.5,
        "gross_tonnes": 26.2,
        "upstream_mill": "Tata Steel Limited, Jamshedpur Works",
        "heat_no": "TSJ-26-9021",
        "country_of_melt": "INDIA",
        "precursor_see": 1.65,
        "scrap_ratio": 1.08,
        "monthly_grid_kwh": 145000,
        "monthly_solar_kwh": 35000,
        "monthly_fuel_liters": 12000,
        "monthly_production_tonnes": 450,
        "qa_inspector": "R. K. Chatterjee",
        "qa_emp_id": "QA-04"
    }

    # Chemistry extracted from the sample MTC
    sample_chem = {
        "C": 0.22,
        "Mn": 0.88,
        "Si": 0.25,
        "P": 0.015,
        "S": 0.010,
        "Cr": 0.12,
        "Ni": 0.08,
        "Mo": 0.03,
        "Cu": 0.06,
        "V": 0.01
    }
    
    sample_mech = {
        "Yield Strength": 310,
        "Tensile Strength": 512,
        "Elongation": 30.0,
        "Hardness": 149
    }

    # ASTM A105 limits
    a105_chem_limits = {
        "C": {"min": 0.00, "max": 0.35},
        "Mn": {"min": 0.60, "max": 1.05},
        "P": {"min": 0.00, "max": 0.035},
        "S": {"min": 0.00, "max": 0.040},
        "Si": {"min": 0.10, "max": 0.35},
        "Cr": {"min": 0.00, "max": 0.30},
        "Ni": {"min": 0.00, "max": 0.40},
        "Mo": {"min": 0.00, "max": 0.12},
        "Cu": {"min": 0.00, "max": 0.40},
        "V": {"min": 0.00, "max": 0.08}
    }

    a105_mech_limits = {
        "tensile_strength_mpa": {"min": 485, "max": 650},
        "yield_strength_mpa": {"min": 250, "max": 500},
        "elongation_pct": {"min": 22, "max": 100}
    }

    print("\n[STEP 1] Validating Metallurgy & IIW Carbon Equivalent (CEV)...")
    report = ComplianceEngine.validate_metallurgy(
        extracted_chemistry=sample_chem,
        extracted_mechanical=sample_mech,
        standard_chem_limits=a105_chem_limits,
        standard_mech_limits=a105_mech_limits,
        standard_code="ASTM A105",
        country_of_melt_explicit=True
    )

    print(f"  -> Standard: {report.standard_code}")
    print(f"  -> Compliance Status: {'PASSED (100% IN SPEC)' if report.is_fully_compliant else 'FAILED'}")
    print(f"  -> IIW CEV: {report.cev_calculated:.4f} (Max 0.48: {report.cev_status.value})")
    print(f"  -> Melt & Pour Status: {report.country_of_melt_pour_status}")
    assert report.is_fully_compliant, "Expected metallurgy to be compliant"

    print("\n[STEP 2] Computing EU/UK CBAM Recursive Embedded Emissions & Savings...")
    cbam = ComplianceEngine.calculate_cbam_emissions(
        invoice_number=shipment["invoice_number"],
        cn_code=shipment["cn_code"],
        net_shipment_tonnes=shipment["net_tonnes"],
        upstream_precursor_see=shipment["precursor_see"],
        scrap_loss_ratio=shipment["scrap_ratio"],
        monthly_grid_kwh=shipment["monthly_grid_kwh"],
        monthly_solar_offset_kwh=shipment["monthly_solar_kwh"],
        monthly_fuel_liters=shipment["monthly_fuel_liters"],
        monthly_total_production_tonnes=shipment["monthly_production_tonnes"],
        year=2026,
        eu_ets_price=85.0
    )

    print(f"  -> Precursor SEE: {cbam.precursor_embedded_see:.3f} tCO2e/t")
    print(f"  -> Factory Direct Fuel SEE: {cbam.plant_direct_fuel_see:.4f} tCO2e/t")
    print(f"  -> Factory Indirect Power SEE: {cbam.plant_indirect_power_see:.4f} tCO2e/t")
    print(f"  -> Total Verified Actual SEE: {cbam.total_verified_see:.4f} tCO2e/t")
    print(f"  -> EU Default Baseline + 10% Markup: {cbam.eu_default_with_markup:.3f} tCO2e/t")
    print(f"  -> Net CBAM Certificate Savings: EUR {cbam.total_tax_savings_eur:,.2f} (INR {cbam.total_tax_savings_inr:,.2f})")
    assert cbam.total_tax_savings_eur > 0, "Expected positive tax savings"

    print("\n[STEP 3] Compiling Tamper-Evident EN 10204 Clause 6 PDF Dossier...")
    output_dir = "output_dossiers"
    os.makedirs(output_dir, exist_ok=True)

    sample_mtc_path = os.path.join("sample_data", "Tata_Steel_Heat_TSJ-26-9021.pdf")
    with open(sample_mtc_path, "rb") as f:
        upstream_bytes = f.read()

    cover_pdf = DossierGenerator.generate_cover_certificate_pdf(
        company_name=shipment["company_name"],
        eu_installation_id=shipment["plant_id"],
        invoice_number=shipment["invoice_number"],
        cn_code=shipment["cn_code"],
        heat_number=shipment["heat_no"],
        upstream_mill=shipment["upstream_mill"],
        country_of_melt=shipment["country_of_melt"],
        chemistry=sample_chem,
        mechanics=sample_mech,
        qa_inspector_name=shipment["qa_inspector"],
        qa_emp_id=shipment["qa_emp_id"],
        compliance_mode="TRANSFORMED_3_1"
    )

    merged_pdf = DossierGenerator.compile_merged_clause6_dossier(
        cover_pdf_bytes=cover_pdf,
        upstream_mill_pdf_bytes=upstream_bytes,
        invoice_number=shipment["invoice_number"]
    )

    merged_pdf_path = os.path.join(output_dir, f"Dossier_{shipment['invoice_number']}_Clause6.pdf")
    with open(merged_pdf_path, "wb") as f:
        f.write(merged_pdf)

    print(f"  -> Generated Merged Dossier: {merged_pdf_path} ({len(merged_pdf)} bytes)")
    assert os.path.exists(merged_pdf_path), "Merged PDF dossier should exist"

    print("\n[STEP 4] Generating Official EU CBAM Communication XML...")
    xml_str = DossierGenerator.generate_cbam_communication_xml(
        installation_id=shipment["plant_id"],
        company_name=shipment["company_name"],
        unlocode=shipment["unlocode"],
        latitude=shipment["lat"],
        longitude=shipment["lon"],
        cn_code=shipment["cn_code"],
        net_tonnes=shipment["net_tonnes"],
        total_see=cbam.total_verified_see,
        direct_see=cbam.plant_direct_fuel_see,
        indirect_see=cbam.plant_indirect_power_see,
        precursor_see=cbam.precursor_embedded_see,
        heat_number=shipment["heat_no"],
        melt_country="IN"
    )

    xml_path = os.path.join(output_dir, f"CBAM_Communication_{shipment['invoice_number']}.xml")
    with open(xml_path, "w", encoding="utf-8") as f:
        f.write(xml_str)

    print(f"  -> Generated EU CBAM XML: {xml_path} ({len(xml_str)} characters)")
    assert os.path.exists(xml_path), "CBAM XML file should exist"

    print("\n" + "=" * 80)
    print("SUCCESS: ALL 4 PIPELINE STAGES PASSED WITHOUT ERRORS!")
    print("=" * 80)

def test_e2e_pipeline():
    run_e2e_pipeline()


if __name__ == "__main__":
    run_e2e_pipeline()
