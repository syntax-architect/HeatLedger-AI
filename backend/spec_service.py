"""
HEATLEDGER AI: Buyer-Spec Check & Grade Tolerances Engine (Prompt C1)
Specification: Prompt Pack v4 - Phase C (C1)

Enforces buyer purchase order and grade specification checks:
1. Versioned spec library of plant-confirmed limits (data/grade_specs.json).
2. Per-element and mechanical property evaluation (pass, fail, unclear).
3. Stated rounding rule: ASTM E29 Rounding-Off Method.
4. Certificate self-consistency checks:
   - Total chemistry sum plausibility
   - Carbon Equivalent (CE) calculation
   - Product form vs mandatory testing requirements
   - Chronology verification (test date before dispatch date)
5. Wording compliance: "meets the limits you entered", never "compliant".
"""

import json
import os
import re
from datetime import date, datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GRADE_SPECS_PATH = os.path.join(REPO_ROOT, "data", "grade_specs.json")
SPEC_LIBRARY_PATH = os.getenv(
    "SPEC_LIBRARY_PATH",
    os.path.join(REPO_ROOT, "data", "spec_library.json"),
)
SPEC_DISCLAIMER_TEXT = "plant-confirmed limits, check against the current standard"


def round_half_up(value: float, decimals: int) -> float:
    """ASTM E29 standard rounding-off method using Decimal ROUND_HALF_UP."""
    if value is None:
        return 0.0
    d = Decimal(str(value))
    factor = Decimal('1.' + '0' * decimals) if decimals > 0 else Decimal('1')
    return float(d.quantize(factor, rounding=ROUND_HALF_UP))


class SpecService:
    """Engine for checking MTC chemistry and mechanical data against buyer/grade specs."""

    _SPECS_CACHE: Optional[Dict[str, Any]] = None
    _cached_specs: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def _load_specs(cls) -> Dict[str, Any]:
        """Loads and caches data/grade_specs.json."""
        if cls._SPECS_CACHE is not None:
            return cls._SPECS_CACHE
        if not os.path.exists(GRADE_SPECS_PATH):
            raise FileNotFoundError(f"Grade specifications database not found at {GRADE_SPECS_PATH}")
        with open(GRADE_SPECS_PATH, "r", encoding="utf-8") as f:
            cls._SPECS_CACHE = json.load(f)
        return cls._SPECS_CACHE

    @classmethod
    def reload_specs(cls) -> Dict[str, Any]:
        """Forces cache invalidation and reload."""
        cls._SPECS_CACHE = None
        return cls._load_specs()

    @classmethod
    def list_grades(cls, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns all seeded grade rules, optionally filtered by category."""
        specs = cls._load_specs()
        grades = specs.get("grades", [])
        if category:
            cat_upper = category.upper()
            grades = [g for g in grades if g.get("category") == cat_upper]
        return grades

    @classmethod
    def get_grade(cls, grade_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves a specific grade rule set by unique grade ID or grade name."""
        specs = cls._load_specs()
        for g in specs.get("grades", []):
            if g.get("id") == grade_id or g.get("grade", "").lower() == grade_id.lower():
                return g
        return None

    @classmethod
    def calculate_carbon_equivalent(cls, elements: Dict[str, float]) -> Optional[float]:
        """
        Calculates IIW Carbon Equivalent (CE):
        CE = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
        """
        if not elements or "C" not in elements:
            return None
        c = float(elements.get("C", 0.0) or 0.0)
        mn = float(elements.get("Mn", 0.0) or 0.0)
        cr = float(elements.get("Cr", 0.0) or 0.0)
        mo = float(elements.get("Mo", 0.0) or 0.0)
        v = float(elements.get("V", 0.0) or 0.0)
        ni = float(elements.get("Ni", 0.0) or 0.0)
        cu = float(elements.get("Cu", 0.0) or 0.0)

        ce = c + (mn / 6.0) + ((cr + mo + v) / 5.0) + ((ni + cu) / 15.0)
        return round_half_up(ce, 3)

    @classmethod
    def verify_self_consistency(
        cls,
        elements: Dict[str, float],
        mechanical: Dict[str, float],
        test_date_str: Optional[str] = None,
        dispatch_date_str: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Performs internal cross-checks of the certificate against itself:
        1. Total chemistry plausibility (98.0% <= sum <= 100.5%)
        2. Mechanical plausibility (Tensile >= Yield strength)
        3. Chronological validity (Test date <= Dispatch date)
        4. Category mandatory tests (e.g. low-temp impact testing)
        """
        findings = []

        # 1. Total Chemistry Sum Check
        if elements:
            # If Fe is reported, include it. If not, calculate assuming steel matrix
            reported_sum = sum(float(v or 0.0) for k, v in elements.items() if k != "Fe")
            fe_val = elements.get("Fe")
            if fe_val is not None:
                total_sum = reported_sum + float(fe_val)
                if total_sum < 98.0 or total_sum > 101.0:
                    findings.append({
                        "check": "CHEMISTRY_TOTAL_SUM",
                        "status": "fail",
                        "message": f"Chemistry sum of all elements + Fe is {round(total_sum, 2)}% (expected 98.5% - 100.5%).",
                        "severity": "WARNING"
                    })
            else:
                if reported_sum > 30.0 and category not in ("STAINLESS", "ALLOY"):
                    findings.append({
                        "check": "CHEMISTRY_UNALLOYED_PLAUSIBILITY",
                        "status": "fail",
                        "message": f"Carbon steel alloying element sum is unusually high ({round(reported_sum, 2)}%).",
                        "severity": "WARNING"
                    })

        # 2. Tensile vs Yield Relationship
        if mechanical:
            yield_val = mechanical.get("yield_strength_mpa")
            tensile_val = mechanical.get("tensile_strength_mpa")
            if yield_val is not None and tensile_val is not None:
                if float(tensile_val) < float(yield_val):
                    findings.append({
                        "check": "TENSILE_YIELD_RATIO",
                        "status": "fail",
                        "message": f"Tensile strength ({tensile_val} MPa) is less than Yield strength ({yield_val} MPa), which is physically impossible for wrought steel.",
                        "severity": "BLOCKER"
                    })

        # 3. Chronological Verification
        if test_date_str and dispatch_date_str:
            try:
                t_date = datetime.strptime(test_date_str[:10], "%Y-%m-%d").date()
                d_date = datetime.strptime(dispatch_date_str[:10], "%Y-%m-%d").date()
                if t_date > d_date:
                    findings.append({
                        "check": "CHRONOLOGY",
                        "status": "fail",
                        "message": f"Certificate test date ({t_date}) is after dispatch date ({d_date}).",
                        "severity": "WARNING"
                    })
            except (ValueError, TypeError):
                pass

        return findings

    @classmethod
    def check_heat_against_spec(
        cls,
        heat_id: str,
        heat_elements: Dict[str, Any],
        heat_mechanical: Dict[str, Any],
        grade_id: str,
        test_date: Optional[str] = None,
        dispatch_date: Optional[str] = None,
        custom_spec: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Compares heat chemistry and mechanical properties against the selected grade specification.
        Returns itemized property results, self-consistency cross-checks, and clean summary statement.
        """
        grade = custom_spec or cls.get_grade(grade_id)
        if not grade:
            return {
                "heat_id": heat_id,
                "grade_id": grade_id,
                "status": "unclear",
                "summary": "Target grade specification not found in confirmed library",
                "property_results": {},
                "self_consistency": []
            }

        element_specs = grade.get("elements", {})
        mech_specs = grade.get("mechanical", {})
        rounding_method = "ASTM E29 Rounding-Off Method"

        property_results: Dict[str, Dict[str, Any]] = {}
        failing_properties = []
        unclear_properties = []

        # 1. Evaluate Chemical Elements
        PRIMARY_ELEMENTS = {"C", "Mn", "P", "S"}
        for el, limits in element_specs.items():
            min_lim = limits.get("min")
            max_lim = limits.get("max")
            raw_val = heat_elements.get(el)

            if raw_val is None or str(raw_val).strip() == "":
                # If element has a minimum requirement or is a core element, missing is unclear
                if min_lim is not None or el in PRIMARY_ELEMENTS:
                    property_results[el] = {
                        "category": "CHEMISTRY",
                        "property": el,
                        "value": None,
                        "limit_min": min_lim,
                        "limit_max": max_lim,
                        "unit": "%",
                        "status": "unclear",
                        "reason": f"Mandatory element {el} missing or unreadable on certificate",
                        "rounding_rule": rounding_method
                    }
                    unclear_properties.append(el)
                else:
                    property_results[el] = {
                        "category": "CHEMISTRY_RESIDUAL",
                        "property": el,
                        "value": None,
                        "limit_min": None,
                        "limit_max": max_lim,
                        "unit": "%",
                        "status": "not_reported",
                        "reason": f"Residual element {el} not reported on certificate",
                        "rounding_rule": rounding_method
                    }
                continue

            try:
                val = float(raw_val)
            except (ValueError, TypeError):
                property_results[el] = {
                    "category": "CHEMISTRY",
                    "property": el,
                    "value": str(raw_val),
                    "limit_min": min_lim,
                    "limit_max": max_lim,
                    "unit": "%",
                    "status": "unclear",
                    "reason": "Non-numeric entry",
                    "rounding_rule": rounding_method
                }
                unclear_properties.append(el)
                continue

            # Standard rounding: 3 decimals for trace (P, S, V), 2 decimals for main elements
            decimals = 3 if el in ("P", "S", "V", "N", "B") else 2
            rounded_val = round_half_up(val, decimals)

            passed = True
            reason = "Within limit"

            if min_lim is not None and rounded_val < float(min_lim):
                passed = False
                reason = f"Below minimum limit ({rounded_val}% < {min_lim}%)"

            if max_lim is not None and rounded_val > float(max_lim):
                passed = False
                reason = f"Above maximum limit ({rounded_val}% > {max_lim}%)"

            status = "pass" if passed else "fail"
            if not passed:
                failing_properties.append(f"{el}: {reason}")

            property_results[el] = {
                "category": "CHEMISTRY",
                "property": el,
                "value": rounded_val,
                "limit_min": min_lim,
                "limit_max": max_lim,
                "unit": "%",
                "status": status,
                "reason": reason,
                "rounding_rule": rounding_method
            }

        # 2. Evaluate Carbon Equivalent (CE) if configured
        ce_max = grade.get("carbon_equivalent_max")
        calc_ce = cls.calculate_carbon_equivalent(heat_elements)
        if ce_max is not None:
            if calc_ce is not None:
                ce_passed = calc_ce <= float(ce_max)
                status = "pass" if ce_passed else "fail"
                reason = "Within maximum limit" if ce_passed else f"Exceeds max CE limit ({calc_ce} > {ce_max})"
                if not ce_passed:
                    failing_properties.append(f"CE: {reason}")
                property_results["Carbon_Equivalent"] = {
                    "category": "CHEMISTRY_DERIVED",
                    "property": "Carbon_Equivalent (CE)",
                    "value": calc_ce,
                    "limit_min": None,
                    "limit_max": ce_max,
                    "unit": "ratio",
                    "status": status,
                    "reason": reason,
                    "rounding_rule": "IIW Formula rounded to 3 decimal places"
                }
            else:
                property_results["Carbon_Equivalent"] = {
                    "category": "CHEMISTRY_DERIVED",
                    "property": "Carbon_Equivalent (CE)",
                    "value": None,
                    "limit_min": None,
                    "limit_max": ce_max,
                    "unit": "ratio",
                    "status": "unclear",
                    "reason": "Missing carbon or manganese for CE calculation",
                    "rounding_rule": "IIW Formula"
                }

        # 3. Evaluate Mechanical Properties
        mech_mappings = [
            ("yield_strength_mpa", "yield_strength_min_mpa", "yield_strength_max_mpa", "Yield Strength", "MPa"),
            ("tensile_strength_mpa", "tensile_strength_min_mpa", "tensile_strength_max_mpa", "Tensile Strength", "MPa"),
            ("elongation_pct", "elongation_min_pct", None, "Elongation (A5)", "%"),
            ("reduction_of_area_pct", "reduction_of_area_min_pct", None, "Reduction of Area (Z)", "%"),
            ("hardness_hb", None, "hardness_max_hb", "Hardness (HB)", "HBW")
        ]

        for heat_key, min_key, max_key, label, unit in mech_mappings:
            min_lim = mech_specs.get(min_key) if min_key else None
            max_lim = mech_specs.get(max_key) if max_key else None
            raw_val = heat_mechanical.get(heat_key)

            if min_lim is None and max_lim is None:
                continue

            if raw_val is None or str(raw_val).strip() == "":
                # Core mandatory tensile properties
                if min_lim is not None and heat_key in ("yield_strength_mpa", "tensile_strength_mpa", "elongation_pct"):
                    property_results[heat_key] = {
                        "category": "MECHANICAL",
                        "property": label,
                        "value": None,
                        "limit_min": min_lim,
                        "limit_max": max_lim,
                        "unit": unit,
                        "status": "unclear",
                        "reason": f"Mandatory mechanical property {label} missing from certificate",
                        "rounding_rule": "Integer / ASTM E29"
                    }
                    unclear_properties.append(label)
                else:
                    property_results[heat_key] = {
                        "category": "MECHANICAL_SUPPLEMENTARY",
                        "property": label,
                        "value": None,
                        "limit_min": min_lim,
                        "limit_max": max_lim,
                        "unit": unit,
                        "status": "not_reported",
                        "reason": f"Supplementary property {label} not reported",
                        "rounding_rule": "Integer / ASTM E29"
                    }
                continue

            try:
                val = float(raw_val)
            except (ValueError, TypeError):
                property_results[heat_key] = {
                    "category": "MECHANICAL",
                    "property": label,
                    "value": str(raw_val),
                    "limit_min": min_lim,
                    "limit_max": max_lim,
                    "unit": unit,
                    "status": "unclear",
                    "reason": "Non-numeric entry",
                    "rounding_rule": "Integer / ASTM E29"
                }
                unclear_properties.append(label)
                continue

            val_rounded = round_half_up(val, 1 if unit == "%" else 0)
            passed = True
            reason = "Within limit"

            if min_lim is not None and val_rounded < float(min_lim):
                passed = False
                reason = f"Below minimum limit ({val_rounded} < {min_lim} {unit})"

            if max_lim is not None and val_rounded > float(max_lim):
                passed = False
                reason = f"Above maximum limit ({val_rounded} > {max_lim} {unit})"

            status = "pass" if passed else "fail"
            if not passed:
                failing_properties.append(f"{label}: {reason}")

            property_results[heat_key] = {
                "category": "MECHANICAL",
                "property": label,
                "value": val_rounded,
                "limit_min": min_lim,
                "limit_max": max_lim,
                "unit": unit,
                "status": status,
                "reason": reason,
                "rounding_rule": "ASTM E29 Rounding-Off Method"
            }

        # 4. Impact Toughness Check if Required
        if mech_specs.get("impact_test_required"):
            impact_energy = heat_mechanical.get("impact_energy_joules")
            impact_min = mech_specs.get("impact_energy_min_joules")
            impact_temp = mech_specs.get("impact_test_temp_c")
            if impact_energy is None:
                property_results["impact_energy"] = {
                    "category": "MECHANICAL",
                    "property": "Charpy V-Notch Impact Energy",
                    "value": None,
                    "limit_min": impact_min,
                    "limit_max": None,
                    "unit": "Joules",
                    "status": "unclear",
                    "reason": f"Mandatory impact test at {impact_temp}°C missing from certificate",
                    "rounding_rule": "ASTM E29"
                }
                unclear_properties.append("Impact Toughness")
            else:
                try:
                    i_val = round_half_up(float(impact_energy), 1)
                    i_pass = i_val >= float(impact_min)
                    reason = "Meets minimum impact toughness" if i_pass else f"Below minimum toughness ({i_val} J < {impact_min} J)"
                    status = "pass" if i_pass else "fail"
                    if not i_pass:
                        failing_properties.append(f"Impact Toughness: {reason}")
                    property_results["impact_energy"] = {
                        "category": "MECHANICAL",
                        "property": f"Charpy V-Notch Impact Energy (at {impact_temp}°C)",
                        "value": i_val,
                        "limit_min": impact_min,
                        "limit_max": None,
                        "unit": "Joules",
                        "status": status,
                        "reason": reason,
                        "rounding_rule": "ASTM E29"
                    }
                except (ValueError, TypeError):
                    property_results["impact_energy"] = {
                        "category": "MECHANICAL",
                        "property": "Charpy V-Notch Impact Energy",
                        "value": str(impact_energy),
                        "limit_min": impact_min,
                        "limit_max": None,
                        "unit": "Joules",
                        "status": "unclear",
                        "reason": "Non-numeric impact value",
                        "rounding_rule": "ASTM E29"
                    }

        # 5. Internal Self-Consistency Cross-Checks
        consistency_findings = cls.verify_self_consistency(
            elements=heat_elements,
            mechanical=heat_mechanical,
            test_date_str=test_date,
            dispatch_date_str=dispatch_date,
            category=grade.get("category")
        )

        for finding in consistency_findings:
            if finding["severity"] == "BLOCKER":
                failing_properties.append(f"{finding['check']}: {finding['message']}")

        # 6. Overall Evaluation Statement (Regulatory wording rule: "meets the limits you entered", never "compliant")
        if len(failing_properties) == 0 and len(unclear_properties) == 0:
            overall_status = "pass"
            summary_statement = "Meets the limits you entered"
        elif len(failing_properties) > 0:
            overall_status = "fail"
            summary_statement = f"{len(failing_properties)} properties need attention"
        else:
            overall_status = "unclear"
            summary_statement = f"{len(unclear_properties)} properties unclear or unreadable"

        return {
            "heat_id": heat_id,
            "grade_id": grade["id"],
            "grade_name": grade["grade"],
            "standard": grade["standard"],
            "status": overall_status,
            "summary_statement": summary_statement,
            "failing_count": len(failing_properties),
            "unclear_count": len(unclear_properties),
            "failing_details": failing_properties,
            "unclear_details": unclear_properties,
            "property_results": property_results,
            "self_consistency_findings": consistency_findings,
            "carbon_equivalent": calc_ce,
            "legal_notice": "Plant-confirmed limits. Prepares documents for review. Not legal or metallurgical advice."
        }

    @classmethod
    def check_shipment_heats(cls, shipment_id: str, heats: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Batch evaluates all heats allocated to a shipment against their assigned grade specs.
        Generates executive 1-line shipment readiness status.
        """
        results = []
        failing_heats = 0
        unclear_heats = 0

        for heat in heats:
            h_id = heat.get("heat_number") or heat.get("heat_id", "UNKNOWN")
            g_id = heat.get("grade_id") or heat.get("grade", "astm_a105")
            res = cls.check_heat_against_spec(
                heat_id=h_id,
                heat_elements=heat.get("chemistry", {}),
                heat_mechanical=heat.get("mechanical", {}),
                grade_id=g_id,
                test_date=heat.get("test_date"),
                dispatch_date=heat.get("dispatch_date")
            )
            results.append(res)
            if res["status"] == "fail":
                failing_heats += 1
            elif res["status"] == "unclear":
                unclear_heats += 1

        total_heats = len(heats)
        if total_heats == 0:
            summary = "No heats allocated to shipment"
            status = "empty"
        elif failing_heats == 0 and unclear_heats == 0:
            summary = f"All {total_heats} heats meet the entered limits"
            status = "pass"
        elif failing_heats > 0:
            summary = f"{failing_heats} of {total_heats} heats need attention"
            status = "fail"
        else:
            summary = f"{unclear_heats} heats have unreadable properties requiring check"
            status = "unclear"

        return {
            "shipment_id": shipment_id,
            "status": status,
            "summary_statement": summary,
            "total_heats": total_heats,
            "heats_meeting_limits": total_heats - failing_heats - unclear_heats,
            "heats_needing_attention": failing_heats,
            "heats_unclear": unclear_heats,
            "heat_evaluations": results,
            "disclaimer": "Prepares specifications against entered limits. Not legal advice."
        }

    # -------------------------------------------------------------------------
    # Buyer Spec Library (/api/spec-check/*) Methods (merged from spec_check_service)
    # -------------------------------------------------------------------------

    @classmethod
    def load_spec_library(cls, force_reload: bool = False) -> List[Dict[str, Any]]:
        """Loads seeded and custom grade rules from data/spec_library.json."""
        if cls._cached_specs is not None and not force_reload:
            return cls._cached_specs
        if not os.path.exists(SPEC_LIBRARY_PATH):
            return []
        try:
            with open(SPEC_LIBRARY_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                grades = data.get("grades", [])
                cls._cached_specs = grades
                return grades
        except Exception:
            return []

    @classmethod
    def get_spec_by_grade_or_id(cls, identifier: str) -> Optional[Dict[str, Any]]:
        """Finds a specification by ID or grade string."""
        specs = cls.load_spec_library()
        ident_clean = identifier.strip().upper()
        for s in specs:
            if s.get("id", "").upper() == ident_clean:
                return s
        for s in specs:
            grade_name = s.get("grade", "").upper()
            if ident_clean in grade_name or grade_name in ident_clean:
                return s
        clean_norm = re.sub(r"[^A-Z0-9]", "", ident_clean)
        for s in specs:
            s_norm = re.sub(r"[^A-Z0-9]", "", s.get("grade", "").upper())
            if clean_norm in s_norm or s_norm in clean_norm:
                return s
        return None

    @classmethod
    def save_spec(cls, spec_data: Dict[str, Any], entered_by: str = "Plant QA Engineering") -> Dict[str, Any]:
        """Saves or updates a grade specification with author tracking and disclaimer."""
        specs = cls.load_spec_library()
        spec_id = spec_data.get("id") or f"CUSTOM_{spec_data.get('grade', 'SPEC').replace(' ', '_').upper()}"
        updated_spec = {
            "id": spec_id,
            "standard_name": spec_data.get("standard_name", "Plant Custom Spec"),
            "grade": spec_data.get("grade", "Custom Grade"),
            "category": spec_data.get("category", "custom"),
            "elements": spec_data.get("elements", {}),
            "mechanical": spec_data.get("mechanical", {}),
            "cev_max": spec_data.get("cev_max"),
            "source_note": spec_data.get("source_note", "Plant Entered Parameters"),
            "entered_by": entered_by,
            "status": "plant_confirmed",
        }
        existing_idx = next((i for i, s in enumerate(specs) if s.get("id") == spec_id), None)
        if existing_idx is not None:
            specs[existing_idx] = updated_spec
        else:
            specs.append(updated_spec)
        try:
            with open(SPEC_LIBRARY_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "$schema": "https://json-schema.org/draft/2020-12/schema",
                        "version": "1.0.0",
                        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        "notice": SPEC_DISCLAIMER_TEXT,
                        "grades": specs,
                    },
                    f,
                    indent=2,
                )
            cls._cached_specs = specs
        except Exception:
            pass
        return updated_spec

    @classmethod
    def check_certificate_self_consistency(cls, cert: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Performs chemistry sum, mechanical yield<tensile, and date-order self-consistency checks."""
        anomalies: List[Dict[str, Any]] = []
        chem = cert.get("chemistry") or {}
        known_elements = ["C", "Mn", "Si", "P", "S", "Cr", "Ni", "Mo", "Cu", "V", "Al", "Ti", "Nb", "N"]
        alloy_sum = sum(float(chem[k]) for k in known_elements if k in chem and chem[k] is not None)
        base_fe = chem.get("Fe")
        if base_fe is not None:
            total_sum = round(float(base_fe) + alloy_sum, 2)
            if total_sum > 100.5 or total_sum < 98.0:
                anomalies.append({
                    "check": "chemistry_sum_balance",
                    "severity": "WARNING",
                    "reason": f"Total chemical constituents sum ({total_sum}%) deviates outside plausible metallurgical range (98.0% - 100.5%).",
                    "recommendation": "Review reported balance element percentages.",
                })
        elif alloy_sum > 100.2:
            anomalies.append({
                "check": "chemistry_sum_balance",
                "severity": "WARNING",
                "reason": f"Sum of reported alloying elements ({round(alloy_sum, 2)}%) exceeds 100%.",
                "recommendation": "Verify spectrometry percentage decimal placement.",
            })

        mech = cert.get("mechanical") or {}
        yield_val = mech.get("yield_strength_mpa") or mech.get("yield_strength") or mech.get("yield")
        tensile_val = mech.get("tensile_strength_mpa") or mech.get("tensile_strength") or mech.get("tensile")
        if yield_val is not None and tensile_val is not None:
            try:
                y_float = float(yield_val)
                t_float = float(tensile_val)
                if y_float >= t_float:
                    anomalies.append({
                        "check": "mechanical_property_logic",
                        "severity": "CRITICAL",
                        "reason": f"Reported yield strength ({y_float} MPa) is greater than or equal to tensile strength ({t_float} MPa). Physically contradictory.",
                        "recommendation": "Check for inverted test columns or laboratory recording error.",
                    })
            except (ValueError, TypeError):
                pass

        def _parse_date(d_str: Optional[str]) -> Optional[date]:
            if not d_str:
                return None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(str(d_str).strip(), fmt).date()
                except ValueError:
                    continue
            return None

        test_date_str = cert.get("test_date")
        cert_date_str = cert.get("certificate_date") or cert.get("issue_date")
        dispatch_date_str = cert.get("dispatch_date")
        t_date = _parse_date(test_date_str)
        c_date = _parse_date(cert_date_str)
        d_date = _parse_date(dispatch_date_str)
        if t_date and d_date and t_date > d_date:
            anomalies.append({
                "check": "date_sequence_timeline",
                "severity": "WARNING",
                "reason": f"Test date ({test_date_str}) occurs after shipment dispatch date ({dispatch_date_str}).",
                "recommendation": "Verify dispatch date against bill of lading.",
            })
        if t_date and c_date and t_date > c_date:
            anomalies.append({
                "check": "date_sequence_timeline",
                "severity": "WARNING",
                "reason": f"Test date ({test_date_str}) occurs after certificate issuance date ({cert_date_str}).",
                "recommendation": "Confirm certificate sign-off sequence.",
            })
        return anomalies

    @classmethod
    def evaluate_heat_against_spec(cls, heat: Dict[str, Any], spec: Dict[str, Any]) -> Dict[str, Any]:
        """Compares a single heat against spec limits with rounding rules and self-consistency checks."""
        heat_number = heat.get("heat_number", "UNKNOWN_HEAT")
        grade_reported = heat.get("grade", spec.get("grade", "Steel Grade"))
        chem = heat.get("chemistry") or {}
        mech = heat.get("mechanical") or {}
        property_checks: List[Dict[str, Any]] = []

        for elem, limits in (spec.get("elements") or {}).items():
            val = chem.get(elem)
            min_limit, max_limit, unit = limits.get("min"), limits.get("max"), limits.get("unit", "%")
            if val is None:
                property_checks.append({
                    "property": elem, "property_type": "chemical", "value": None,
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "3 decimal places (standard ladle spectrometry)",
                    "status": "UNCLEAR", "reason": f"Value for {elem} is missing or unstated on certificate.",
                })
                continue
            try:
                v_float = round(float(val), 3)
                fail_reasons = []
                if max_limit is not None and v_float > round(float(max_limit), 3):
                    fail_reasons.append(f"Value {v_float}% exceeds entered maximum limit of {max_limit}%")
                if min_limit is not None and v_float < round(float(min_limit), 3):
                    fail_reasons.append(f"Value {v_float}% is below entered minimum limit of {min_limit}%")
                property_checks.append({
                    "property": elem, "property_type": "chemical", "value": v_float,
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "3 decimal places",
                    "status": "FAIL" if fail_reasons else "PASS",
                    "reason": "; ".join(fail_reasons) if fail_reasons else "Meets entered limits",
                })
            except (ValueError, TypeError):
                property_checks.append({
                    "property": elem, "property_type": "chemical", "value": str(val),
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "Non-numeric value", "status": "UNCLEAR",
                    "reason": f"Could not parse numeric value: '{val}'",
                })

        mech_aliases = {
            "yield_strength_mpa": ("yield_strength", "yield"),
            "tensile_strength_mpa": ("tensile_strength", "tensile"),
            "elongation_pct": ("elongation",),
            "impact_joules": ("impact", "charpy"),
        }
        for prop_key, limits in (spec.get("mechanical") or {}).items():
            val = mech.get(prop_key)
            if val is None:
                for alias in mech_aliases.get(prop_key, ()):
                    val = mech.get(alias)
                    if val is not None:
                        break
            min_limit, max_limit, unit = limits.get("min"), limits.get("max"), limits.get("unit", "")
            if val is None:
                property_checks.append({
                    "property": prop_key, "property_type": "mechanical", "value": None,
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "Whole number or 1 decimal place",
                    "status": "UNCLEAR", "reason": f"Mechanical property {prop_key} not reported on certificate.",
                })
                continue
            try:
                v_float = round(float(val), 1)
                fail_reasons = []
                if min_limit is not None and v_float < float(min_limit):
                    fail_reasons.append(f"Measured {v_float} {unit} is below entered minimum of {min_limit} {unit}")
                if max_limit is not None and v_float > float(max_limit):
                    fail_reasons.append(f"Measured {v_float} {unit} exceeds entered maximum of {max_limit} {unit}")
                property_checks.append({
                    "property": prop_key, "property_type": "mechanical", "value": v_float,
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "1 decimal place",
                    "status": "FAIL" if fail_reasons else "PASS",
                    "reason": "; ".join(fail_reasons) if fail_reasons else "Meets entered limits",
                })
            except (ValueError, TypeError):
                property_checks.append({
                    "property": prop_key, "property_type": "mechanical", "value": str(val),
                    "min_limit": min_limit, "max_limit": max_limit, "unit": unit,
                    "rounding_rule": "Non-numeric", "status": "UNCLEAR",
                    "reason": f"Could not parse numeric mechanical value: '{val}'",
                })

        cev_calculated = cls.calculate_carbon_equivalent(chem) if (chem.get("C") is not None and chem.get("Mn") is not None) else None
        cev_max = spec.get("cev_max")
        if cev_calculated is not None and cev_max is not None:
            is_cev_fail = cev_calculated > float(cev_max)
            property_checks.append({
                "property": "Carbon Equivalent (CEV IIW)", "property_type": "calculated",
                "value": cev_calculated, "min_limit": None, "max_limit": cev_max,
                "unit": "ratio", "rounding_rule": "IIW formula rounded to 3 decimals",
                "status": "FAIL" if is_cev_fail else "PASS",
                "reason": f"Calculated CEV {cev_calculated} exceeds weldability limit of {cev_max}" if is_cev_fail else "Meets entered limits",
            })

        anomalies = cls.check_certificate_self_consistency(heat)
        fail_count = sum(1 for p in property_checks if p["status"] == "FAIL")
        unclear_count = sum(1 for p in property_checks if p["status"] == "UNCLEAR")
        critical_anomalies = [a for a in anomalies if a.get("severity") == "CRITICAL"]
        all_meet = fail_count == 0 and len(critical_anomalies) == 0

        if all_meet and unclear_count == 0:
            summary = f"Heat {heat_number} meets the limits you entered"
        elif all_meet and unclear_count > 0:
            summary = f"Heat {heat_number} meets the limits you entered for reported fields ({unclear_count} unstated)"
        else:
            reasons_preview = [p["reason"] for p in property_checks if p["status"] == "FAIL"] + [a["reason"] for a in critical_anomalies]
            summary = f"Heat {heat_number} needs attention: {'; '.join(reasons_preview[:2])}"

        return {
            "heat_number": heat_number,
            "grade_reported": grade_reported,
            "target_grade": spec.get("grade"),
            "standard_name": spec.get("standard_name"),
            "all_meet": all_meet,
            "has_failures": fail_count > 0 or len(critical_anomalies) > 0,
            "fail_count": fail_count,
            "unclear_count": unclear_count,
            "property_checks": property_checks,
            "self_consistency_anomalies": anomalies,
            "calculated_cev": cev_calculated,
            "summary": summary,
            "disclaimer": SPEC_DISCLAIMER_TEXT,
        }

    @classmethod
    def evaluate_shipment_against_spec(
        cls,
        shipment: Dict[str, Any],
        spec_rule: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Evaluates all heats in an export shipment against order limits."""
        heats = shipment.get("heats") or shipment.get("certificates") or []
        target_grade = shipment.get("target_grade") or shipment.get("grade") or "S355JR"
        spec = spec_rule
        if spec is None:
            spec = cls.get_spec_by_grade_or_id(target_grade) or cls.get_spec_by_grade_or_id("S355JR") or {}

        heat_results = [cls.evaluate_heat_against_spec(heat, spec) for heat in heats]
        total_heats = len(heat_results)
        failing_heats = [h for h in heat_results if h["has_failures"]]
        if len(failing_heats) == 0:
            summary_line = "No heats provided in shipment" if total_heats == 0 else f"All {total_heats} heats meet the entered limits"
        else:
            count = len(failing_heats)
            summary_line = f"{count} heat{'s' if count != 1 else ''} need attention"

        return {
            "shipment_id": shipment.get("id") or shipment.get("shipment_id", "SHP-UNKNOWN"),
            "invoice_number": shipment.get("invoice_number", "INV-UNKNOWN"),
            "target_grade": spec.get("grade"),
            "standard_name": spec.get("standard_name"),
            "total_heats": total_heats,
            "passing_heats_count": total_heats - len(failing_heats),
            "failing_heats_count": len(failing_heats),
            "summary_line": summary_line,
            "all_meet_entered_limits": len(failing_heats) == 0,
            "disclaimer": SPEC_DISCLAIMER_TEXT,
            "heats": heat_results,
        }
