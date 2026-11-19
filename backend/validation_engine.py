"""
HeatLedger AI - Deterministic Validation Engine & Standards Library (Prompt B5)
Strictly deterministic metallurgical, standards, and regulatory validator:
- Zero LLM calls
- Imports real limits from CSV standards tables (EN 10025-2, EN 10025-3, ASTM A36, IS 2062)
- Rejects invented values; unknown grade returns 'unknown grade, manual check'
- Detailed rule results: rule_id, severity, message, measured_value, limit, source_clause
- CEV (IIW Carbon Equivalent) calculation: C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15
- Generates reproducible ValidationReport with rule_set_version
"""

import os
import csv
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

RULE_SET_VERSION = "STANDARDS-2026.1"

STANDARDS_DIR = Path(os.getenv("STANDARDS_DATA_DIR", "backend/data"))
STANDARDS_FILE = STANDARDS_DIR / "standards.csv"
LIMITS_FILE = STANDARDS_DIR / "standard_limits.csv"


class RuleResult(BaseModel):
    rule_id: str
    property_name: str
    status: str  # "PASS", "WARN", "FAIL"
    severity: str  # "CRITICAL", "WARNING", "INFO"
    measured_value: Optional[float] = None
    min_limit: Optional[float] = None
    max_limit: Optional[float] = None
    unit: Optional[str] = None
    message: str
    source_clause: Optional[str] = None


class ValidationReport(BaseModel):
    status: str  # "PASS", "WARN", "FAIL"
    standard_code: str
    grade: str
    rule_set_version: str
    timestamp: str
    total_checks: int
    pass_count: int
    warn_count: int
    fail_count: int
    rules: List[RuleResult]


class StandardsLibrary:
    _limits_cache: Dict[str, Dict[str, Dict[str, Any]]] = {}
    _standards_meta: Dict[str, Dict[str, Any]] = {}
    _loaded = False

    @classmethod
    def load_standards(cls):
        if cls._loaded:
            return

        # Load standards metadata
        if STANDARDS_FILE.exists():
            with open(STANDARDS_FILE, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cls._standards_meta[row["standard_code"].strip().upper()] = row

        # Load standard limits
        if LIMITS_FILE.exists():
            with open(LIMITS_FILE, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    std = row["standard_code"].strip().upper()
                    grade = row["grade"].strip().upper()
                    prop_name = row["property_name"].strip()

                    key = f"{std}:{grade}"
                    if key not in cls._limits_cache:
                        cls._limits_cache[key] = {}

                    cls._limits_cache[key][prop_name] = {
                        "property_type": row.get("property_type", "chemistry"),
                        "min_value": float(row["min_value"]) if row.get("min_value") else None,
                        "max_value": float(row["max_value"]) if row.get("max_value") else None,
                        "unit": row.get("unit", ""),
                        "source_clause": row.get("source_clause", "")
                    }

        cls._loaded = True

    @classmethod
    def get_limits_for_grade(cls, standard_code: str, grade: str) -> Optional[Dict[str, Any]]:
        cls.load_standards()
        key = f"{standard_code.strip().upper()}:{grade.strip().upper()}"
        return cls._limits_cache.get(key)

    @classmethod
    def normalize_grade(cls, raw_grade: str) -> Tuple[Optional[str], Optional[str]]:
        """Normalize grade strings to standard_code and grade."""
        cls.load_standards()
        g_clean = raw_grade.strip().upper()

        # Direct match check
        for std in ["EN 10025-2", "EN 10025-3", "ASTM A36/A36M", "IS 2062"]:
            for key in cls._limits_cache:
                s, gr = key.split(":")
                if gr in g_clean:
                    return s, gr

        # Common synonyms
        if "S355JR" in g_clean:
            return "EN 10025-2", "S355JR"
        if "S355J2" in g_clean:
            return "EN 10025-2", "S355J2"
        if "S275JR" in g_clean:
            return "EN 10025-2", "S275JR"
        if "S235JR" in g_clean:
            return "EN 10025-2", "S235JR"
        if "A36" in g_clean:
            return "ASTM A36/A36M", "A36"
        if "E250" in g_clean:
            return "IS 2062", "E250"
        if "E350" in g_clean:
            return "IS 2062", "E350"

        return None, None


class ValidationEngine:
    @staticmethod
    def calculate_cev(
        c: float,
        mn: float,
        cr: float = 0.0,
        mo: float = 0.0,
        v: float = 0.0,
        ni: float = 0.0,
        cu: float = 0.0
    ) -> float:
        """
        IIW Carbon Equivalent Formula:
        CEV = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
        """
        return c + (mn / 6.0) + ((cr + mo + v) / 5.0) + ((ni + cu) / 15.0)

    @classmethod
    def validate_certificate(
        cls,
        certificate_data: Dict[str, Any],
        standard_code: Optional[str] = None,
        grade: Optional[str] = None
    ) -> ValidationReport:
        StandardsLibrary.load_standards()
        rules: List[RuleResult] = []

        raw_grade = certificate_data.get("grade") or certificate_data.get("steel_grade") or ""
        norm_std, norm_grade = StandardsLibrary.normalize_grade(raw_grade)

        resolved_std = standard_code or norm_std
        resolved_grade = grade or norm_grade

        # 1. Unknown Grade Check
        if not resolved_std or not resolved_grade:
            rules.append(RuleResult(
                rule_id="RULE-GRADE-01",
                property_name="grade",
                status="WARN",
                severity="WARNING",
                message=f"unknown grade, manual check (received '{raw_grade}').",
                source_clause="HeatLedger Standards Policy"
            ))
            return ValidationReport(
                status="WARN",
                standard_code=resolved_std or "UNKNOWN",
                grade=raw_grade or "UNKNOWN",
                rule_set_version=RULE_SET_VERSION,
                timestamp=datetime.now(timezone.utc).isoformat(),
                total_checks=1,
                pass_count=0,
                warn_count=1,
                fail_count=0,
                rules=rules
            )

        limits = StandardsLibrary.get_limits_for_grade(resolved_std, resolved_grade)
        if not limits:
            rules.append(RuleResult(
                rule_id="RULE-LIMITS-01",
                property_name="grade_limits",
                status="WARN",
                severity="WARNING",
                message=f"No standard limits found for {resolved_std} grade {resolved_grade}. Manual review required.",
                source_clause=resolved_std
            ))
            return ValidationReport(
                status="WARN",
                standard_code=resolved_std,
                grade=resolved_grade,
                rule_set_version=RULE_SET_VERSION,
                timestamp=datetime.now(timezone.utc).isoformat(),
                total_checks=1,
                pass_count=0,
                warn_count=1,
                fail_count=0,
                rules=rules
            )

        # 2. Certificate Type Check (EN 10204 3.1 or 3.2)
        cert_type = str(certificate_data.get("certificate_type", "")).upper()
        if "3.1" in cert_type or "3.2" in cert_type or "3_1" in cert_type:
            rules.append(RuleResult(
                rule_id="RULE-MTC-TYPE",
                property_name="certificate_type",
                status="PASS",
                severity="CRITICAL",
                message=f"Valid EN 10204 inspection certificate type confirmed ({cert_type}).",
                source_clause="EN 10204:2004 Clause 3"
            ))
        else:
            rules.append(RuleResult(
                rule_id="RULE-MTC-TYPE",
                property_name="certificate_type",
                status="FAIL",
                severity="CRITICAL",
                message=f"Invalid or missing certificate type '{cert_type}'. Must be EN 10204 3.1 or 3.2.",
                source_clause="EN 10204:2004 Clause 3"
            ))

        # 3. Country of Melt & Pour Check
        melt_country = certificate_data.get("country_of_melt_and_pour") or certificate_data.get("country_of_melt") or ""
        if isinstance(melt_country, dict):
            melt_country = melt_country.get("country_name", "")

        if melt_country and melt_country.upper() not in ["NOT SPECIFIED", "UNKNOWN", ""]:
            rules.append(RuleResult(
                rule_id="RULE-MELT-COUNTRY",
                property_name="country_of_melt_and_pour",
                status="PASS",
                severity="CRITICAL",
                message=f"Origin country of melt and pour verified: {melt_country}.",
                source_clause="Regulation (EU) 2026/1963 Clause 6"
            ))
        else:
            rules.append(RuleResult(
                rule_id="RULE-MELT-COUNTRY",
                property_name="country_of_melt_and_pour",
                status="FAIL",
                severity="CRITICAL",
                message="Missing Country of Melt and Pour. Non-compliant with EU Regulation 2026/1963 Clause 6.",
                source_clause="Regulation (EU) 2026/1963 Clause 6"
            ))

        # 4. Heat Number Format Check
        heat_num = certificate_data.get("heat_number", "")
        if heat_num and len(heat_num) >= 4 and re.match(r'^[A-Z0-9][A-Z0-9\-_/]{3,24}$', heat_num, re.IGNORECASE):
            rules.append(RuleResult(
                rule_id="RULE-HEAT-FORMAT",
                property_name="heat_number",
                status="PASS",
                severity="CRITICAL",
                message=f"Heat number format compliant: {heat_num}.",
                source_clause="EN 10204 Traceability Clause 4"
            ))
        else:
            rules.append(RuleResult(
                rule_id="RULE-HEAT-FORMAT",
                property_name="heat_number",
                status="FAIL",
                severity="CRITICAL",
                message=f"Heat number '{heat_num}' is invalid or missing.",
                source_clause="EN 10204 Traceability Clause 4"
            ))

        # 5. Chemical Composition Check
        chemistry = certificate_data.get("chemistry") or certificate_data.get("chemical_composition") or {}
        # Normalize chemistry keys
        clean_chem: Dict[str, float] = {}
        for k, v in chemistry.items():
            elem = k.replace("chemical_", "").strip()
            try:
                clean_chem[elem] = float(v)
            except (ValueError, TypeError):
                pass

        # Calculate CEV if C and Mn exist
        if "C" in clean_chem and "Mn" in clean_chem:
            cev_val = cls.calculate_cev(
                c=clean_chem["C"],
                mn=clean_chem["Mn"],
                cr=clean_chem.get("Cr", 0.0),
                mo=clean_chem.get("Mo", 0.0),
                v=clean_chem.get("V", 0.0),
                ni=clean_chem.get("Ni", 0.0),
                cu=clean_chem.get("Cu", 0.0)
            )
            clean_chem["CEV"] = round(cev_val, 3)

        for prop_name, limit_info in limits.items():
            if limit_info["property_type"] == "chemistry":
                measured = clean_chem.get(prop_name)
                min_lim = limit_info["min_value"]
                max_lim = limit_info["max_value"]
                unit = limit_info["unit"]
                clause = limit_info["source_clause"]

                if measured is not None:
                    if max_lim is not None and measured > max_lim:
                        rules.append(RuleResult(
                            rule_id=f"RULE-CHEM-{prop_name}",
                            property_name=prop_name,
                            status="FAIL",
                            severity="CRITICAL",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured}{unit}) exceeds {resolved_std} limit (max {max_lim}{unit}).",
                            source_clause=f"{resolved_std} {clause}"
                        ))
                    elif min_lim is not None and measured < min_lim:
                        rules.append(RuleResult(
                            rule_id=f"RULE-CHEM-{prop_name}",
                            property_name=prop_name,
                            status="FAIL",
                            severity="CRITICAL",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured}{unit}) below {resolved_std} minimum (min {min_lim}{unit}).",
                            source_clause=f"{resolved_std} {clause}"
                        ))
                    else:
                        rules.append(RuleResult(
                            rule_id=f"RULE-CHEM-{prop_name}",
                            property_name=prop_name,
                            status="PASS",
                            severity="INFO",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured}{unit}) compliant (limit: <= {max_lim}{unit}).",
                            source_clause=f"{resolved_std} {clause}"
                        ))

        # 6. Mechanical Properties Check
        mechanics = certificate_data.get("mechanics") or certificate_data.get("mechanical_properties") or {}
        clean_mech: Dict[str, float] = {}
        for k, v in mechanics.items():
            k_lower = k.lower()
            num_match = re.search(r"[-+]?\d*\.?\d+", str(v))
            if num_match:
                val = float(num_match.group(0))
                if "yield" in k_lower or "reh" in k_lower or "rp0.2" in k_lower:
                    clean_mech["yield_strength"] = val
                elif "tensile" in k_lower or "rm" in k_lower:
                    clean_mech["tensile_strength"] = val
                elif "elongation" in k_lower or "a5" in k_lower:
                    clean_mech["elongation"] = val

        for prop_name, limit_info in limits.items():
            if limit_info["property_type"] == "mechanical":
                measured = clean_mech.get(prop_name)
                min_lim = limit_info["min_value"]
                max_lim = limit_info["max_value"]
                unit = limit_info["unit"]
                clause = limit_info["source_clause"]

                if measured is not None:
                    if min_lim is not None and measured < min_lim:
                        rules.append(RuleResult(
                            rule_id=f"RULE-MECH-{prop_name}",
                            property_name=prop_name,
                            status="FAIL",
                            severity="CRITICAL",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured} {unit}) below {resolved_std} minimum ({min_lim} {unit}).",
                            source_clause=f"{resolved_std} {clause}"
                        ))
                    elif max_lim is not None and max_lim < 990.0 and measured > max_lim:
                        rules.append(RuleResult(
                            rule_id=f"RULE-MECH-{prop_name}",
                            property_name=prop_name,
                            status="FAIL",
                            severity="CRITICAL",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured} {unit}) exceeds {resolved_std} maximum ({max_lim} {unit}).",
                            source_clause=f"{resolved_std} {clause}"
                        ))
                    else:
                        rules.append(RuleResult(
                            rule_id=f"RULE-MECH-{prop_name}",
                            property_name=prop_name,
                            status="PASS",
                            severity="INFO",
                            measured_value=measured,
                            min_limit=min_lim,
                            max_limit=max_lim,
                            unit=unit,
                            message=f"{prop_name} ({measured} {unit}) compliant.",
                            source_clause=f"{resolved_std} {clause}"
                        ))

        # Calculate Overall Status
        fail_count = sum(1 for r in rules if r.status == "FAIL")
        warn_count = sum(1 for r in rules if r.status == "WARN")
        pass_count = sum(1 for r in rules if r.status == "PASS")

        overall_status = "FAIL" if fail_count > 0 else "WARN" if warn_count > 0 else "PASS"

        return ValidationReport(
            status=overall_status,
            standard_code=resolved_std,
            grade=resolved_grade,
            rule_set_version=RULE_SET_VERSION,
            timestamp=datetime.now(timezone.utc).isoformat(),
            total_checks=len(rules),
            pass_count=pass_count,
            warn_count=warn_count,
            fail_count=fail_count,
            rules=rules
        )
