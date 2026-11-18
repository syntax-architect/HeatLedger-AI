"""
HEATLEDGER AI: Deterministic Metallurgy Validator & EU/UK CBAM Precursor Calculator
Module: compliance_engine.py
Zero LLM hallucinations - 100% Deterministic Engineering Math
"""

from typing import Dict, List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL_HIGH = "FAIL_HIGH"
    FAIL_LOW = "FAIL_LOW"
    MISSING = "MISSING"


class ElementCheckResult(BaseModel):
    element_symbol: str
    element_name: str
    measured_value: float
    min_limit: float
    max_limit: float
    status: CheckStatus
    delta: float = Field(
        ...,
        description="Distance from closest bound. 0 if inside tolerance, positive if above max, negative if below min."
    )


class MetallurgyValidationReport(BaseModel):
    standard_code: str
    is_fully_compliant: bool
    cev_calculated: float
    cev_status: CheckStatus
    chemical_checks: List[ElementCheckResult]
    mechanical_checks: List[dict]
    country_of_melt_pour_status: str
    audit_notes: List[str]


class CBAMEmissionResult(BaseModel):
    invoice_number: str
    cn_code: str
    net_shipment_tonnes: float
    scrap_loss_ratio: float
    precursor_embedded_see: float      # tCO2e / t
    plant_direct_fuel_see: float       # tCO2e / t
    plant_indirect_power_see: float    # tCO2e / t
    total_verified_see: float          # tCO2e / t
    eu_default_baseline: float         # tCO2e / t
    punitive_markup_pct: float         # 10% in 2026, 20% in 2027, 30% in 2028
    eu_default_with_markup: float      # tCO2e / t
    see_avoided_per_tonne: float       # tCO2e / t
    total_carbon_avoided_tonnes: float # tCO2e
    eu_ets_carbon_price_eur: float     # € / tCO2e
    total_tax_savings_eur: float       # €
    total_tax_savings_inr: float       # ₹


class ComplianceEngine:
    """
    Deterministic metallurgical and regulatory verification suite.
    """

    @staticmethod
    def calculate_iiw_cev(chemistry: Dict[str, float]) -> float:
        """
        Calculates IIW Carbon Equivalent Value:
        CEV = C + (Mn / 6) + ((Cr + Mo + V) / 5) + ((Ni + Cu) / 15)
        """
        c = chemistry.get("C", 0.0)
        mn = chemistry.get("Mn", 0.0)
        cr = chemistry.get("Cr", 0.0)
        mo = chemistry.get("Mo", 0.0)
        v = chemistry.get("V", 0.0)
        ni = chemistry.get("Ni", 0.0)
        cu = chemistry.get("Cu", 0.0)

        cev = c + (mn / 6.0) + ((cr + mo + v) / 5.0) + ((ni + cu) / 15.0)
        return round(cev, 4)

    @classmethod
    def validate_metallurgy(
        cls,
        extracted_chemistry: Dict[str, float],
        extracted_mechanical: Dict[str, float],
        standard_chem_limits: Dict[str, dict],
        standard_mech_limits: Dict[str, dict],
        standard_code: str = "ASTM A105",
        country_of_melt_explicit: bool = True
    ) -> MetallurgyValidationReport:
        """
        Checks every chemical element and tensile reading against deterministic tolerance bounds.
        """
        chemical_checks: List[ElementCheckResult] = []
        is_all_pass = True
        audit_notes = []

        # Name mapping
        names = {
            "C": "Carbon", "Mn": "Manganese", "Si": "Silicon",
            "P": "Phosphorus", "S": "Sulphur", "Cr": "Chromium",
            "Ni": "Nickel", "Mo": "Molybdenum", "V": "Vanadium",
            "Cu": "Copper", "Al": "Aluminium", "N": "Nitrogen"
        }

        # Check each element in standard
        for sym, limits in standard_chem_limits.items():
            min_val = limits.get("min", 0.0)
            max_val = limits.get("max", 999.0)

            if sym == "CEV":
                continue  # Handled separately

            if sym not in extracted_chemistry:
                status = CheckStatus.MISSING
                delta = 0.0
                is_all_pass = False
                audit_notes.append(f"Required element {sym} not reported on certificate.")
            else:
                meas = extracted_chemistry[sym]
                if meas < min_val:
                    status = CheckStatus.FAIL_LOW
                    delta = round(meas - min_val, 4)
                    is_all_pass = False
                    audit_notes.append(f"{sym} ({meas}%) below required minimum of {min_val}%.")
                elif meas > max_val:
                    status = CheckStatus.FAIL_HIGH
                    delta = round(meas - max_val, 4)
                    is_all_pass = False
                    audit_notes.append(f"{sym} ({meas}%) exceeds maximum allowable {max_val}%.")
                else:
                    status = CheckStatus.PASS
                    delta = 0.0

            chemical_checks.append(ElementCheckResult(
                element_symbol=sym,
                element_name=names.get(sym, sym),
                measured_value=extracted_chemistry.get(sym, 0.0),
                min_limit=min_val,
                max_limit=max_val,
                status=status,
                delta=delta
            ))

        # Check IIW Carbon Equivalent
        calc_cev = cls.calculate_iiw_cev(extracted_chemistry)
        cev_max = standard_chem_limits.get("CEV", {}).get("max", 0.47)
        cev_status = CheckStatus.PASS if calc_cev <= cev_max else CheckStatus.FAIL_HIGH
        if cev_status != CheckStatus.PASS:
            is_all_pass = False
            audit_notes.append(f"Calculated CEV ({calc_cev}) exceeds weldability limit of {cev_max}.")

        # Check Mechanicals with flexible key normalization
        mechanical_checks = []
        # Common aliases mapping
        alias_map = {
            "yield_strength_mpa": ["yield_strength_mpa", "yield_strength", "yield", "yield strength", "yield strength (mpa)", "re", "reh", "rel"],
            "tensile_strength_mpa": ["tensile_strength_mpa", "tensile_strength", "tensile", "tensile strength", "tensile strength (mpa)", "rm"],
            "elongation_pct": ["elongation_pct", "elongation", "elongation a5 (%)", "elongation (%)", "a5", "a"],
            "reduction_of_area_pct": ["reduction_of_area_pct", "reduction_of_area", "reduction of area (%)", "z"],
            "hardness_hbw": ["hardness_hbw", "hardness", "hardness (hbw)", "hbw", "hb"]
        }

        for prop, limits in standard_mech_limits.items():
            min_val = limits.get("min", 0.0)
            max_val = limits.get("max", 9999.0)
            
            # Find measured value by checking exact key or aliases
            meas = None
            if prop in extracted_mechanical:
                meas = extracted_mechanical[prop]
            else:
                possible_aliases = alias_map.get(prop.lower(), [prop.lower()])
                for k, v in extracted_mechanical.items():
                    if k.lower() in possible_aliases:
                        meas = v
                        break
            
            if meas is None:
                meas = 0.0

            pass_status = (meas >= min_val) and (meas <= max_val)
            if not pass_status:
                is_all_pass = False
                audit_notes.append(f"Mechanical property {prop} ({meas}) outside range [{min_val}, {max_val}].")

            mechanical_checks.append({
                "property": prop,
                "measured": meas,
                "min": min_val,
                "max": max_val,
                "status": "PASS" if pass_status else "FAIL"
            })

        melt_status = "VERIFIED_INDIA" if country_of_melt_explicit else "DEFECT_MISSING_EXPLICIT_COUNTRY"
        if not country_of_melt_explicit:
            audit_notes.append("WARNING: Country of Melt and Pour not explicitly attested on certificate (EU Reg 2026/1963 risk).")

        return MetallurgyValidationReport(
            standard_code=standard_code,
            is_fully_compliant=is_all_pass,
            cev_calculated=calc_cev,
            cev_status=cev_status,
            chemical_checks=chemical_checks,
            mechanical_checks=mechanical_checks,
            country_of_melt_pour_status=melt_status,
            audit_notes=audit_notes
        )

    @classmethod
    def calculate_cbam_emissions(
        cls,
        invoice_number: str,
        cn_code: str,
        net_shipment_tonnes: float,
        upstream_precursor_see: float,
        scrap_loss_ratio: float,
        monthly_grid_kwh: float,
        monthly_solar_offset_kwh: float,
        monthly_fuel_liters: float,
        monthly_total_production_tonnes: float,
        year: int = 2026,
        eu_ets_price: float = 85.0,
        inr_per_eur: float = 92.0
    ) -> CBAMEmissionResult:
        """
        Computes Direct, Indirect, and Precursor SEE per tonne per EU Implementing Reg 2023/1773.
        Calculates exact Euro savings vs EU punitive default markup.
        """
        # 1. Factory Direct Emissions from Heating/Furnace Fuel
        # Factor: ~2.68 kg CO2/L for furnace oil/diesel
        direct_fuel_co2_tonnes = (monthly_fuel_liters * 2.68) / 1000.0
        plant_direct_fuel_see = direct_fuel_co2_tonnes / monthly_total_production_tonnes

        # 2. Factory Indirect Emissions from Grid Electricity
        # Factor: Eastern India Grid ~0.82 kg CO2/kWh
        net_grid_kwh = max(0.0, monthly_grid_kwh - monthly_solar_offset_kwh)
        indirect_power_co2_tonnes = (net_grid_kwh * 0.82) / 1000.0
        plant_indirect_power_see = indirect_power_co2_tonnes / monthly_total_production_tonnes

        # 3. Upstream Precursor Embedded Emissions
        precursor_embedded_see = upstream_precursor_see * scrap_loss_ratio

        # 4. Total Verified Specific Embedded Emissions (SEE)
        total_verified_see = round(precursor_embedded_see + plant_direct_fuel_see + plant_indirect_power_see, 4)

        # 5. EU Default Baseline & Punitive Markup Schedule
        # 2026: 10% markup | 2027: 20% markup | 2028: 30% markup
        markup_schedule = {2026: 0.10, 2027: 0.20, 2028: 0.30}
        punitive_pct = markup_schedule.get(year, 0.10)
        eu_default_baseline = 2.98  # Standard EU Commission steel precursor default
        eu_default_with_markup = round(eu_default_baseline * (1.0 + punitive_pct), 4)

        # 6. Commercial Financial Comparison
        see_avoided = max(0.0, eu_default_with_markup - total_verified_see)
        total_carbon_avoided = round(net_shipment_tonnes * see_avoided, 2)
        total_tax_savings_eur = round(total_carbon_avoided * eu_ets_price, 2)
        total_tax_savings_inr = round(total_tax_savings_eur * inr_per_eur, 2)

        return CBAMEmissionResult(
            invoice_number=invoice_number,
            cn_code=cn_code,
            net_shipment_tonnes=net_shipment_tonnes,
            scrap_loss_ratio=scrap_loss_ratio,
            precursor_embedded_see=round(precursor_embedded_see, 4),
            plant_direct_fuel_see=round(plant_direct_fuel_see, 4),
            plant_indirect_power_see=round(plant_indirect_power_see, 4),
            total_verified_see=total_verified_see,
            eu_default_baseline=eu_default_baseline,
            punitive_markup_pct=punitive_pct * 100.0,
            eu_default_with_markup=eu_default_with_markup,
            see_avoided_per_tonne=round(see_avoided, 4),
            total_carbon_avoided_tonnes=total_carbon_avoided,
            eu_ets_carbon_price_eur=eu_ets_price,
            total_tax_savings_eur=total_tax_savings_eur,
            total_tax_savings_inr=total_tax_savings_inr
        )
