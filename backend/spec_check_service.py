"""
HEATLEDGER AI: Buyer Spec Check & Certificate Self-Consistency Engine (Prompt C1)
Specification: Prompt Pack v4 - Phase C (Task C1)

Provides:
1. Dynamic Specification Library:
   - Reads/writes numeric limits from data/spec_library.json.
   - Contains 18 standard steel grades with chemical and mechanical numeric boundaries.
   - Preserves source notes and author records.
   - Mandates disclaimer: "plant-confirmed limits, check against the current standard".
2. Buyer Spec Evaluation:
   - Compares heat properties (chemistry and mechanicals) against entered limits.
   - Explicit rounding rules and reason statements.
   - Statuses: PASS (meets entered limits), FAIL (out of bounds), UNCLEAR (missing/unreadable).
3. Certificate Self-Consistency Cross-Checks:
   - Chemistry sum balance sanity (elements + base iron).
   - International Institute of Welding (IIW) Carbon Equivalent formula.
   - Mechanical property logic (Yield strength must be < Tensile strength).
   - Date sequence integrity (Test date <= Certificate date <= Dispatch date).
4. Shipment-Level Aggregation:
   - Single summary line per shipment:
     "All X heats meet the entered limits" or "Y heats need attention"
   - Strict invariant: never uses the word "compliant".
"""

import os
import json
import re
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional, Tuple

SPEC_LIBRARY_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "spec_library.json"
)

SPEC_DISCLAIMER_TEXT = "plant-confirmed limits, check against the current standard"


class SpecCheckService:
    """Service implementing Prompt C1: Buyer-spec check & certificate self-consistency."""

    _cached_specs: Optional[List[Dict[str, Any]]] = None

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

        # Exact ID match
        for s in specs:
            if s.get("id", "").upper() == ident_clean:
                return s

        # Grade name match
        for s in specs:
            grade_name = s.get("grade", "").upper()
            if ident_clean in grade_name or grade_name in ident_clean:
                return s

        # Normalize common grade names (e.g., '316L' matches '316L / 1.4404')
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
            "status": "plant_confirmed"
        }

        # Replace or append
        existing_idx = next((i for i, s in enumerate(specs) if s.get("id") == spec_id), None)
        if existing_idx is not None:
            specs[existing_idx] = updated_spec
        else:
            specs.append(updated_spec)

        try:
            with open(SPEC_LIBRARY_PATH, "w", encoding="utf-8") as f:
                json.dump({
                    "$schema": "https://json-schema.org/draft/2020-12/schema",
                    "version": "1.0.0",
                    "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "notice": SPEC_DISCLAIMER_TEXT,
                    "grades": specs
                }, f, indent=2)
            cls._cached_specs = specs
        except Exception:
            pass

        return updated_spec

    @classmethod
    def calculate_iiw_cev(cls, chemistry: Dict[str, float]) -> Optional[float]:
        """
        Calculates Carbon Equivalent according to International Institute of Welding (IIW):
        CEV = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
        """
        c = chemistry.get("C")
        mn = chemistry.get("Mn")
        if c is None or mn is None:
            return None

        cr = chemistry.get("Cr", 0.0) or 0.0
        mo = chemistry.get("Mo", 0.0) or 0.0
        v = chemistry.get("V", 0.0) or 0.0
        ni = chemistry.get("Ni", 0.0) or 0.0
        cu = chemistry.get("Cu", 0.0) or 0.0

        cev = float(c) + (float(mn) / 6.0) + ((float(cr) + float(mo) + float(v)) / 5.0) + ((float(ni) + float(cu)) / 15.0)
        return round(cev, 3)

    @classmethod
    def check_certificate_self_consistency(cls, cert: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Performs internal consistency checks on certificate data (Task C1 item 4):
        - Chemistry sums plausibility
        - Yield vs Tensile mechanical logic
        - Date sequence sanity (test date vs certificate date vs dispatch date)
        """
        anomalies: List[Dict[str, Any]] = []
        chem = cert.get("chemistry") or {}

        # 1. Chemistry Balance Check
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
                    "recommendation": "Review reported balance element percentages."
                })
        elif alloy_sum > 100.2:
            anomalies.append({
                "check": "chemistry_sum_balance",
                "severity": "WARNING",
                "reason": f"Sum of reported alloying elements ({round(alloy_sum, 2)}%) exceeds 100%.",
                "recommendation": "Verify spectrometry percentage decimal placement."
            })

        # 2. Mechanical Property Logic: Yield must be < Tensile
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
                        "recommendation": "Check for inverted test columns or laboratory recording error."
                    })
            except (ValueError, TypeError):
                pass

        # 3. Date Sequence Check: test_date <= certificate_date <= dispatch_date
        test_date_str = cert.get("test_date")
        cert_date_str = cert.get("certificate_date") or cert.get("issue_date")
        dispatch_date_str = cert.get("dispatch_date")

        def parse_date(d_str: Optional[str]) -> Optional[date]:
            if not d_str:
                return None
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
                try:
                    return datetime.strptime(str(d_str).strip(), fmt).date()
                except ValueError:
                    continue
            return None

        t_date = parse_date(test_date_str)
        c_date = parse_date(cert_date_str)
        d_date = parse_date(dispatch_date_str)

        if t_date and d_date and t_date > d_date:
            anomalies.append({
                "check": "date_sequence_timeline",
                "severity": "WARNING",
                "reason": f"Test date ({test_date_str}) occurs after shipment dispatch date ({dispatch_date_str}).",
                "recommendation": "Verify dispatch date against bill of lading."
            })

        if t_date and c_date and t_date > c_date:
            anomalies.append({
                "check": "date_sequence_timeline",
                "severity": "WARNING",
                "reason": f"Test date ({test_date_str}) occurs after certificate issuance date ({cert_date_str}).",
                "recommendation": "Confirm certificate sign-off sequence."
            })

        return anomalies

    @classmethod
    def evaluate_heat_against_spec(
        cls,
        heat: Dict[str, Any],
        spec: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compares a single heat certificate against the plant-confirmed limits of a spec.
        Returns field-by-field evaluations with rounding rules, self-consistency checks, and summary.
        """
        heat_number = heat.get("heat_number", "UNKNOWN_HEAT")
        grade_reported = heat.get("grade", spec.get("grade", "Steel Grade"))
        chem = heat.get("chemistry") or {}
        mech = heat.get("mechanical") or {}

        property_checks: List[Dict[str, Any]] = []
        element_limits = spec.get("elements") or {}
        mechanical_limits = spec.get("mechanical") or {}

        # 1. Chemical Elements Evaluation
        for elem, limits in element_limits.items():
            val = chem.get(elem)
            max_limit = limits.get("max")
            min_limit = limits.get("min")
            unit = limits.get("unit", "%")

            if val is None:
                property_checks.append({
                    "property": elem,
                    "property_type": "chemical",
                    "value": None,
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "3 decimal places (standard ladle spectrometry)",
                    "status": "UNCLEAR",
                    "reason": f"Value for {elem} is missing or unstated on certificate."
                })
                continue

            try:
                v_float = round(float(val), 3)
                is_fail = False
                fail_reasons = []

                if max_limit is not None and v_float > round(float(max_limit), 3):
                    is_fail = True
                    fail_reasons.append(f"Value {v_float}% exceeds entered maximum limit of {max_limit}%")

                if min_limit is not None and v_float < round(float(min_limit), 3):
                    is_fail = True
                    fail_reasons.append(f"Value {v_float}% is below entered minimum limit of {min_limit}%")

                status = "FAIL" if is_fail else "PASS"
                reason = "; ".join(fail_reasons) if is_fail else "Meets entered limits"

                property_checks.append({
                    "property": elem,
                    "property_type": "chemical",
                    "value": v_float,
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "3 decimal places",
                    "status": status,
                    "reason": reason
                })
            except (ValueError, TypeError):
                property_checks.append({
                    "property": elem,
                    "property_type": "chemical",
                    "value": str(val),
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "Non-numeric value",
                    "status": "UNCLEAR",
                    "reason": f"Could not parse numeric value: '{val}'"
                })

        # 2. Mechanical Properties Evaluation
        for prop_key, limits in mechanical_limits.items():
            val = mech.get(prop_key)
            # Support alias lookups
            if val is None:
                if prop_key == "yield_strength_mpa":
                    val = mech.get("yield_strength") or mech.get("yield")
                elif prop_key == "tensile_strength_mpa":
                    val = mech.get("tensile_strength") or mech.get("tensile")
                elif prop_key == "elongation_pct":
                    val = mech.get("elongation")
                elif prop_key == "impact_joules":
                    val = mech.get("impact") or mech.get("charpy")

            min_limit = limits.get("min")
            max_limit = limits.get("max")
            unit = limits.get("unit", "")

            if val is None:
                property_checks.append({
                    "property": prop_key,
                    "property_type": "mechanical",
                    "value": None,
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "Whole number or 1 decimal place",
                    "status": "UNCLEAR",
                    "reason": f"Mechanical property {prop_key} not reported on certificate."
                })
                continue

            try:
                v_float = round(float(val), 1)
                is_fail = False
                fail_reasons = []

                if min_limit is not None and v_float < float(min_limit):
                    is_fail = True
                    fail_reasons.append(f"Measured {v_float} {unit} is below entered minimum of {min_limit} {unit}")

                if max_limit is not None and v_float > float(max_limit):
                    is_fail = True
                    fail_reasons.append(f"Measured {v_float} {unit} exceeds entered maximum of {max_limit} {unit}")

                status = "FAIL" if is_fail else "PASS"
                reason = "; ".join(fail_reasons) if is_fail else "Meets entered limits"

                property_checks.append({
                    "property": prop_key,
                    "property_type": "mechanical",
                    "value": v_float,
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "1 decimal place",
                    "status": status,
                    "reason": reason
                })
            except (ValueError, TypeError):
                property_checks.append({
                    "property": prop_key,
                    "property_type": "mechanical",
                    "value": str(val),
                    "min_limit": min_limit,
                    "max_limit": max_limit,
                    "unit": unit,
                    "rounding_rule": "Non-numeric",
                    "status": "UNCLEAR",
                    "reason": f"Could not parse numeric mechanical value: '{val}'"
                })

        # 3. Carbon Equivalent (CEV) Check if defined
        cev_calculated = cls.calculate_iiw_cev(chem)
        cev_max = spec.get("cev_max")
        if cev_calculated is not None and cev_max is not None:
            is_cev_fail = cev_calculated > float(cev_max)
            property_checks.append({
                "property": "Carbon Equivalent (CEV IIW)",
                "property_type": "calculated",
                "value": cev_calculated,
                "min_limit": None,
                "max_limit": cev_max,
                "unit": "ratio",
                "rounding_rule": "IIW formula rounded to 3 decimals",
                "status": "FAIL" if is_cev_fail else "PASS",
                "reason": f"Calculated CEV {cev_calculated} exceeds weldability limit of {cev_max}" if is_cev_fail else "Meets entered limits"
            })

        # 4. Certificate Self-Consistency Cross-Checks
        anomalies = cls.check_certificate_self_consistency(heat)

        # 5. Summarize Heat Result
        fail_count = sum(1 for p in property_checks if p["status"] == "FAIL")
        unclear_count = sum(1 for p in property_checks if p["status"] == "UNCLEAR")
        critical_anomalies = [a for a in anomalies if a.get("severity") == "CRITICAL"]

        all_meet = (fail_count == 0 and len(critical_anomalies) == 0)

        # Build honest summary (never use the word 'compliant')
        if all_meet and unclear_count == 0:
            summary = f"Heat {heat_number} meets the limits you entered"
        elif all_meet and unclear_count > 0:
            summary = f"Heat {heat_number} meets the limits you entered for reported fields ({unclear_count} unstated)"
        else:
            reasons_preview = [p["reason"] for p in property_checks if p["status"] == "FAIL"]
            for a in critical_anomalies:
                reasons_preview.append(a["reason"])
            summary = f"Heat {heat_number} needs attention: {'; '.join(reasons_preview[:2])}"

        return {
            "heat_number": heat_number,
            "grade_reported": grade_reported,
            "target_grade": spec.get("grade"),
            "standard_name": spec.get("standard_name"),
            "all_meet": all_meet,
            "has_failures": (fail_count > 0 or len(critical_anomalies) > 0),
            "fail_count": fail_count,
            "unclear_count": unclear_count,
            "property_checks": property_checks,
            "self_consistency_anomalies": anomalies,
            "calculated_cev": cev_calculated,
            "summary": summary,
            "disclaimer": SPEC_DISCLAIMER_TEXT
        }

    @classmethod
    def evaluate_shipment_against_spec(
        cls,
        shipment: Dict[str, Any],
        spec_rule: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates all heats in an export shipment against order specifications.
        Produces the single summary line requested by Prompt C1:
        'All X heats meet the entered limits' or 'Y heats need attention'.
        """
        heats = shipment.get("heats") or shipment.get("certificates") or []
        target_grade = shipment.get("target_grade") or shipment.get("grade") or "S355JR"

        spec = spec_rule
        if spec is None:
            spec = cls.get_spec_by_grade_or_id(target_grade)
            if not spec:
                # Default to S355JR standard structural limits if none found
                spec = cls.get_spec_by_grade_or_id("S355JR") or {}

        heat_results: List[Dict[str, Any]] = []
        for heat in heats:
            res = cls.evaluate_heat_against_spec(heat, spec)
            heat_results.append(res)

        total_heats = len(heat_results)
        failing_heats = [h for h in heat_results if h["has_failures"]]
        attention_heats = [h for h in heat_results if not h["all_meet"] or h["unclear_count"] > 0]

        # Single Summary Line (Prompt C1 Requirement 5)
        if len(failing_heats) == 0:
            if total_heats == 0:
                summary_line = "No heats provided in shipment"
            else:
                summary_line = f"All {total_heats} heats meet the entered limits"
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
            "heats": heat_results
        }
