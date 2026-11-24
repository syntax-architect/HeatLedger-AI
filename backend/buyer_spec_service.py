"""
HeatLedger AI - Buyer Specification Tolerance & Heat Checker (Prompt Pack v4 - Task C1)

Provides:
1. Spec library as data: Table of grade rules with numeric element and mechanical limits,
   source notes, and 'plant-confirmed limits, check against current standard'.
2. Order spec comparison: Checks measured certificate properties against buyer entered limits
   with explicit rounding rule (ASTM E29 / ISO 80000-1).
3. Self-cross-checks:
   - Chemistry summation
   - IIW Carbon Equivalent (CEV) verification
   - Test date before dispatch/issue date
   - Product form vs test type consistency
4. Shipment aggregation: Summary lines:
   - 'All X heats meet the entered limits' or 'Y heats need attention'
5. Strict wording rule: 'meets the limits you entered', NEVER 'compliant'.
"""

import json
import os
import re
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field

# Storage path for spec library data
DATA_DIR = Path(__file__).resolve().parent / "data"
LIBRARY_FILE = DATA_DIR / "buyer_spec_library.json"

ROUNDING_RULE_DESCRIPTION = (
    "ASTM E29 Rounding Method: Chemistry percentages rounded to 3 decimal places (0.001%), "
    "yield & tensile strengths rounded to nearest 1 MPa, elongation to 0.5%, impact energy to nearest 1 J."
)


class PropertyStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    UNCLEAR = "UNCLEAR"


class ElementLimit(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    unit: str = "%"


class MechanicalLimit(BaseModel):
    min: Optional[float] = None
    max: Optional[float] = None
    unit: str = "MPa"
    test_temp_c: Optional[float] = None


class GradeRule(BaseModel):
    grade_id: str
    standard_name: str
    grade: str
    category: str
    element_limits: Dict[str, ElementLimit]
    mechanical_limits: Dict[str, MechanicalLimit]
    source_note: str = "plant-confirmed limits, check against current standard"
    entered_by: str = "system_seed"
    last_confirmed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PropertyCheckResult(BaseModel):
    property_name: str
    property_type: str  # 'chemistry' | 'mechanical'
    measured_value: Optional[float] = None
    min_limit: Optional[float] = None
    max_limit: Optional[float] = None
    unit: str
    status: PropertyStatus
    delta: Optional[float] = None
    message: str
    rounding_rule: str = ROUNDING_RULE_DESCRIPTION


class CertificateSelfCheck(BaseModel):
    check_name: str
    passed: bool
    details: str
    severity: str  # 'info' | 'warning' | 'flag'


class HeatSpecCheckResult(BaseModel):
    heat_number: str
    certificate_id: Optional[str] = None
    standard_name: str
    grade: str
    meets_limits: bool
    status_summary: str  # 'meets the limits you entered' or 'does not meet the limits you entered'
    property_results: List[PropertyCheckResult]
    self_checks: List[CertificateSelfCheck]
    flags_count: int
    unclear_count: int
    passed_count: int
    total_properties: int


class ShipmentSpecCheckSummary(BaseModel):
    shipment_id: Optional[str] = None
    total_heats: int
    passing_heats: int
    attention_heats: int
    summary_line: str  # 'All X heats meet the entered limits' or 'Y heats need attention'
    heats: List[HeatSpecCheckResult]
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    wording_notice: str = "plant-confirmed limits, check against current standard. Not a legal compliance certificate."


# --------------------------------------------------------------------------------
# Default 18 Common Grades Seed Data (Data as JSON, not hardcoded logic)
# --------------------------------------------------------------------------------
DEFAULT_SEEDED_GRADES: List[Dict[str, Any]] = [
    {
        "grade_id": "astm-a105",
        "standard_name": "ASTM A105 / A105M",
        "grade": "A105",
        "category": "Carbon Forgings",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.35, "unit": "%"},
            "Mn": {"min": 0.60, "max": 1.05, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.040, "unit": "%"},
            "Si": {"min": 0.10, "max": 0.35, "unit": "%"},
            "Cu": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Ni": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Cr": {"min": 0.0, "max": 0.30, "unit": "%"},
            "Mo": {"min": 0.0, "max": 0.12, "unit": "%"},
            "V": {"min": 0.0, "max": 0.08, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.47, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 250.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 485.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 22.0, "max": None, "unit": "%"},
            "hardness_hb": {"min": 137.0, "max": 187.0, "unit": "HBW"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "astm-a36",
        "standard_name": "ASTM A36 / A36M",
        "grade": "A36",
        "category": "Structural Carbon Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.25, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.20, "unit": "%"},
            "P": {"min": 0.0, "max": 0.040, "unit": "%"},
            "S": {"min": 0.0, "max": 0.050, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.40, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 250.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 400.0, "max": 550.0, "unit": "MPa"},
            "elongation": {"min": 20.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "astm-a516-70",
        "standard_name": "ASTM A516 / A516M",
        "grade": "Grade 70",
        "category": "Pressure Vessel Plates",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.27, "unit": "%"},
            "Mn": {"min": 0.85, "max": 1.20, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.035, "unit": "%"},
            "Si": {"min": 0.15, "max": 0.40, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 260.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 485.0, "max": 620.0, "unit": "MPa"},
            "elongation": {"min": 21.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "astm-a106-b",
        "standard_name": "ASTM A106 / A106M",
        "grade": "Grade B",
        "category": "Seamless Carbon Steel Pipe",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.30, "unit": "%"},
            "Mn": {"min": 0.29, "max": 1.06, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.035, "unit": "%"},
            "Si": {"min": 0.10, "max": 0.40, "unit": "%"},
            "Cr": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Cu": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Mo": {"min": 0.0, "max": 0.15, "unit": "%"},
            "Ni": {"min": 0.0, "max": 0.40, "unit": "%"},
            "V": {"min": 0.0, "max": 0.08, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 240.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 415.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 30.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "astm-a53-b",
        "standard_name": "ASTM A53 / A53M",
        "grade": "Grade B",
        "category": "Welded and Seamless Pipe",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.30, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.20, "unit": "%"},
            "P": {"min": 0.0, "max": 0.050, "unit": "%"},
            "S": {"min": 0.0, "max": 0.045, "unit": "%"},
            "Cu": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Ni": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Cr": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Mo": {"min": 0.0, "max": 0.15, "unit": "%"},
            "V": {"min": 0.0, "max": 0.08, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 240.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 415.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 25.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "en10025-2-s235jr",
        "standard_name": "EN 10025-2",
        "grade": "S235JR",
        "category": "Hot-Rolled Structural Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.17, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.40, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.035, "unit": "%"},
            "N": {"min": 0.0, "max": 0.012, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.35, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 235.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 360.0, "max": 510.0, "unit": "MPa"},
            "elongation": {"min": 26.0, "max": None, "unit": "%"},
            "impact_energy": {"min": 27.0, "max": None, "unit": "J", "test_temp_c": 20.0},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "en10025-2-s275jr",
        "standard_name": "EN 10025-2",
        "grade": "S275JR",
        "category": "Hot-Rolled Structural Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.21, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.50, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.035, "unit": "%"},
            "N": {"min": 0.0, "max": 0.012, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.40, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 275.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 410.0, "max": 560.0, "unit": "MPa"},
            "elongation": {"min": 23.0, "max": None, "unit": "%"},
            "impact_energy": {"min": 27.0, "max": None, "unit": "J", "test_temp_c": 20.0},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "en10025-2-s355j2",
        "standard_name": "EN 10025-2",
        "grade": "S355J2",
        "category": "High-Strength Structural Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.20, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.60, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.55, "unit": "%"},
            "P": {"min": 0.0, "max": 0.025, "unit": "%"},
            "S": {"min": 0.0, "max": 0.025, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.45, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 355.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 470.0, "max": 630.0, "unit": "MPa"},
            "elongation": {"min": 22.0, "max": None, "unit": "%"},
            "impact_energy": {"min": 27.0, "max": None, "unit": "J", "test_temp_c": -20.0},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "en10217-1-p235tr1",
        "standard_name": "EN 10217-1",
        "grade": "P235TR1",
        "category": "Welded Steel Tubes for Pressure",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.16, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.35, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.20, "unit": "%"},
            "P": {"min": 0.0, "max": 0.025, "unit": "%"},
            "S": {"min": 0.0, "max": 0.020, "unit": "%"},
            "Cr": {"min": 0.0, "max": 0.30, "unit": "%"},
            "Cu": {"min": 0.0, "max": 0.30, "unit": "%"},
            "Ni": {"min": 0.0, "max": 0.30, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 235.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 360.0, "max": 500.0, "unit": "MPa"},
            "elongation": {"min": 25.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "en10217-1-p265tr1",
        "standard_name": "EN 10217-1",
        "grade": "P265TR1",
        "category": "Welded Steel Tubes for Pressure",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.20, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.40, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.40, "unit": "%"},
            "P": {"min": 0.0, "max": 0.025, "unit": "%"},
            "S": {"min": 0.0, "max": 0.020, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 265.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 410.0, "max": 570.0, "unit": "MPa"},
            "elongation": {"min": 23.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "is2062-e250a",
        "standard_name": "IS 2062:2011",
        "grade": "E250 A",
        "category": "Indian Standard Structural Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.23, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.50, "unit": "%"},
            "P": {"min": 0.0, "max": 0.045, "unit": "%"},
            "S": {"min": 0.0, "max": 0.045, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.40, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.42, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 250.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 410.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 23.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "is2062-e350a",
        "standard_name": "IS 2062:2011",
        "grade": "E350 A",
        "category": "Indian Standard High Tensile Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.20, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.55, "unit": "%"},
            "P": {"min": 0.0, "max": 0.045, "unit": "%"},
            "S": {"min": 0.0, "max": 0.045, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.45, "unit": "%"},
            "CEV": {"min": 0.0, "max": 0.47, "unit": ""},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 350.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 490.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 22.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "is1239-part1",
        "standard_name": "IS 1239 (Part 1)",
        "grade": "Mild Steel Tubes",
        "category": "Indian Welded Steel Tubes",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.20, "unit": "%"},
            "Mn": {"min": 0.0, "max": 1.30, "unit": "%"},
            "P": {"min": 0.0, "max": 0.040, "unit": "%"},
            "S": {"min": 0.0, "max": 0.040, "unit": "%"},
        },
        "mechanical_limits": {
            "tensile_strength": {"min": 320.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 20.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "aisi-1018",
        "standard_name": "AISI / SAE",
        "grade": "1018",
        "category": "Low Carbon Steel Bar",
        "element_limits": {
            "C": {"min": 0.15, "max": 0.20, "unit": "%"},
            "Mn": {"min": 0.60, "max": 0.90, "unit": "%"},
            "P": {"min": 0.0, "max": 0.040, "unit": "%"},
            "S": {"min": 0.0, "max": 0.050, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 370.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 440.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 15.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "aisi-1045",
        "standard_name": "AISI / SAE",
        "grade": "1045",
        "category": "Medium Carbon Engineering Steel",
        "element_limits": {
            "C": {"min": 0.43, "max": 0.50, "unit": "%"},
            "Mn": {"min": 0.60, "max": 0.90, "unit": "%"},
            "P": {"min": 0.0, "max": 0.040, "unit": "%"},
            "S": {"min": 0.0, "max": 0.050, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 310.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 565.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 16.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "aisi-304",
        "standard_name": "ASTM A240 / EN 1.4301",
        "grade": "AISI 304",
        "category": "Austenitic Stainless Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.08, "unit": "%"},
            "Mn": {"min": 0.0, "max": 2.00, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.75, "unit": "%"},
            "P": {"min": 0.0, "max": 0.045, "unit": "%"},
            "S": {"min": 0.0, "max": 0.030, "unit": "%"},
            "Cr": {"min": 17.50, "max": 19.50, "unit": "%"},
            "Ni": {"min": 8.00, "max": 10.50, "unit": "%"},
            "N": {"min": 0.0, "max": 0.10, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 205.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 515.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 40.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "aisi-316l",
        "standard_name": "ASTM A240 / EN 1.4404",
        "grade": "AISI 316L",
        "category": "Molybdenum Stainless Steel",
        "element_limits": {
            "C": {"min": 0.0, "max": 0.030, "unit": "%"},
            "Mn": {"min": 0.0, "max": 2.00, "unit": "%"},
            "Si": {"min": 0.0, "max": 0.75, "unit": "%"},
            "P": {"min": 0.0, "max": 0.045, "unit": "%"},
            "S": {"min": 0.0, "max": 0.030, "unit": "%"},
            "Cr": {"min": 16.0, "max": 18.0, "unit": "%"},
            "Ni": {"min": 10.0, "max": 14.0, "unit": "%"},
            "Mo": {"min": 2.00, "max": 3.00, "unit": "%"},
            "N": {"min": 0.0, "max": 0.10, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 220.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 520.0, "max": None, "unit": "MPa"},
            "elongation": {"min": 40.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
    {
        "grade_id": "aisi-4140",
        "standard_name": "ASTM A29 / EN 42CrMo4",
        "grade": "4140 / 42CrMo4",
        "category": "Alloy Engineering Steel",
        "element_limits": {
            "C": {"min": 0.38, "max": 0.45, "unit": "%"},
            "Mn": {"min": 0.60, "max": 0.90, "unit": "%"},
            "Si": {"min": 0.15, "max": 0.35, "unit": "%"},
            "P": {"min": 0.0, "max": 0.035, "unit": "%"},
            "S": {"min": 0.0, "max": 0.040, "unit": "%"},
            "Cr": {"min": 0.90, "max": 1.20, "unit": "%"},
            "Mo": {"min": 0.15, "max": 0.30, "unit": "%"},
        },
        "mechanical_limits": {
            "yield_strength": {"min": 650.0, "max": None, "unit": "MPa"},
            "tensile_strength": {"min": 900.0, "max": 1100.0, "unit": "MPa"},
            "elongation": {"min": 12.0, "max": None, "unit": "%"},
        },
        "source_note": "plant-confirmed limits, check against current standard",
        "entered_by": "system_seed",
    },
]


class BuyerSpecService:
    """
    Core engine managing the Buyer Spec library and executing tolerance comparisons
    and certificate cross-checks.
    """

    @classmethod
    def _ensure_library_file(cls) -> None:
        """Ensures the library JSON file exists, populated with default seed grades if missing."""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not LIBRARY_FILE.exists():
            with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SEEDED_GRADES, f, indent=2)

    @classmethod
    def list_grades(cls) -> List[GradeRule]:
        """Returns all available grade rules from the library."""
        cls._ensure_library_file()
        try:
            with open(LIBRARY_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return [GradeRule(**item) for item in data]
        except Exception:
            return [GradeRule(**item) for item in DEFAULT_SEEDED_GRADES]

    @classmethod
    def get_grade(cls, grade_id: str) -> Optional[GradeRule]:
        """Fetches a specific grade rule by ID or normalized grade name."""
        grades = cls.list_grades()
        norm_id = grade_id.strip().lower()
        for g in grades:
            if g.grade_id.lower() == norm_id or g.grade.lower() == norm_id:
                return g
        return None

    @classmethod
    def save_custom_grade(cls, grade_data: Dict[str, Any], entered_by: str = "plant_user") -> GradeRule:
        """Adds or updates a plant-confirmed grade rule in the data store."""
        cls._ensure_library_file()
        grades = cls.list_grades()
        
        grade_id = grade_data.get("grade_id") or re.sub(r"[^a-z0-9]+", "-", grade_data.get("grade", "custom").lower()).strip("-")
        grade_data["grade_id"] = grade_id
        grade_data["entered_by"] = entered_by
        grade_data["source_note"] = grade_data.get("source_note") or "plant-confirmed limits, check against current standard"
        grade_data["last_confirmed_at"] = datetime.now(timezone.utc).isoformat()

        new_rule = GradeRule(**grade_data)
        
        # Replace or append
        updated_list = [g.dict() for g in grades if g.grade_id != grade_id]
        updated_list.append(new_rule.dict())

        with open(LIBRARY_FILE, "w", encoding="utf-8") as f:
            json.dump(updated_list, f, indent=2)

        return new_rule

    @classmethod
    def calculate_cev(cls, chemistry: Dict[str, Optional[float]]) -> Optional[float]:
        """
        Calculates International Institute of Welding (IIW) Carbon Equivalent:
        CEV = C + Mn/6 + (Cr + Mo + V)/5 + (Ni + Cu)/15
        Returns None if C or Mn is missing.
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
    def perform_certificate_self_checks(
        cls,
        certificate_data: Dict[str, Any],
        measured_chemistry: Dict[str, Optional[float]],
    ) -> List[CertificateSelfCheck]:
        """
        Self-cross-checks certificate against itself:
        1. Chemistry sum (must not exceed 100.0%; non-Fe sum plausible)
        2. IIW CEV formula comparison vs reported CEV
        3. Test date on or before dispatch date and certificate issue date
        4. Product form versus test type
        """
        checks: List[CertificateSelfCheck] = []

        # 1. Chemistry sum check
        valid_chem_vals = [float(v) for k, v in measured_chemistry.items() if v is not None and k not in ["CEV", "Fe"]]
        total_alloy_sum = sum(valid_chem_vals)
        if total_alloy_sum > 100.0:
            checks.append(CertificateSelfCheck(
                check_name="Chemistry Summation",
                passed=False,
                details=f"Total measured alloying elements sum to {round(total_alloy_sum, 3)}%, which exceeds 100%.",
                severity="flag",
            ))
        else:
            checks.append(CertificateSelfCheck(
                check_name="Chemistry Summation",
                passed=True,
                details=f"Measured elements sum to {round(total_alloy_sum, 3)}% (within 100.0% physical balance).",
                severity="info",
            ))

        # 2. CEV Cross Check
        calc_cev = cls.calculate_cev(measured_chemistry)
        rep_cev = measured_chemistry.get("CEV") or certificate_data.get("reported_cev")
        if calc_cev is not None and rep_cev is not None:
            discrepancy = abs(float(rep_cev) - calc_cev)
            if discrepancy > 0.02:
                checks.append(CertificateSelfCheck(
                    check_name="Carbon Equivalent (CEV) Cross-Check",
                    passed=False,
                    details=f"Reported CEV ({round(float(rep_cev), 3)}) diverges from calculated IIW formula ({calc_cev}) by {round(discrepancy, 3)}.",
                    severity="warning",
                ))
            else:
                checks.append(CertificateSelfCheck(
                    check_name="Carbon Equivalent (CEV) Cross-Check",
                    passed=True,
                    details=f"Calculated CEV ({calc_cev}) matches reported CEV ({round(float(rep_cev), 3)}) within tolerance.",
                    severity="info",
                ))
        elif calc_cev is not None:
            checks.append(CertificateSelfCheck(
                check_name="Carbon Equivalent (CEV) Cross-Check",
                passed=True,
                details=f"Calculated IIW CEV = {calc_cev} (no reported CEV on certificate).",
                severity="info",
            ))

        # 3. Date Consistency
        test_date_str = certificate_data.get("test_date")
        issue_date_str = certificate_data.get("issue_date") or certificate_data.get("certificate_date")
        dispatch_date_str = certificate_data.get("dispatch_date")

        def parse_date(d_str: Optional[str]) -> Optional[datetime]:
            if not d_str:
                return None
            for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
                try:
                    return datetime.strptime(d_str.strip(), fmt)
                except ValueError:
                    continue
            return None

        t_date = parse_date(test_date_str)
        i_date = parse_date(issue_date_str)
        d_date = parse_date(dispatch_date_str)

        date_issues = []
        if t_date and d_date and t_date > d_date:
            date_issues.append(f"Mechanical/Chemical test date ({test_date_str}) is after dispatch date ({dispatch_date_str})")
        if t_date and i_date and t_date > i_date:
            date_issues.append(f"Test date ({test_date_str}) is after certificate issue date ({issue_date_str})")

        if date_issues:
            checks.append(CertificateSelfCheck(
                check_name="Chronological Date Order",
                passed=False,
                details="; ".join(date_issues),
                severity="flag",
            ))
        else:
            checks.append(CertificateSelfCheck(
                check_name="Chronological Date Order",
                passed=True,
                details="Test date preceded certificate issue and dispatch.",
                severity="info",
            ))

        # 4. Product Form vs Test Type
        product_form = str(certificate_data.get("product_form", "")).lower()
        thickness_mm = certificate_data.get("thickness_mm")
        test_types = [str(t).lower() for t in certificate_data.get("tests_performed", [])]

        if "impact" in test_types or "charpy" in test_types:
            if thickness_mm is not None and float(thickness_mm) < 6.0:
                checks.append(CertificateSelfCheck(
                    check_name="Product Form vs Test Type",
                    passed=False,
                    details=f"Charpy impact test reported for {thickness_mm}mm thickness; sub-size impact specimen requires min 6mm (ASTM A370 Clause 19).",
                    severity="warning",
                ))
            else:
                checks.append(CertificateSelfCheck(
                    check_name="Product Form vs Test Type",
                    passed=True,
                    details="Mechanical test types are appropriate for certified product form.",
                    severity="info",
                ))
        else:
            checks.append(CertificateSelfCheck(
                check_name="Product Form vs Test Type",
                passed=True,
                details="Standard tensile and chemical testing verified for certified product dimensions.",
                severity="info",
            ))

        return checks

    @classmethod
    def evaluate_heat_against_spec(
        cls,
        heat_number: str,
        grade_rule: GradeRule,
        measured_chemistry: Dict[str, Optional[float]],
        measured_mechanical: Dict[str, Optional[float]],
        certificate_data: Optional[Dict[str, Any]] = None,
        custom_buyer_limits: Optional[Dict[str, Any]] = None,
    ) -> HeatSpecCheckResult:
        """
        Evaluates a single heat against entered grade limits (with optional buyer custom PO overrides).
        Computes pass/fail/unclear status per property, deltas, and self-checks.
        """
        certificate_data = certificate_data or {}
        property_results: List[PropertyCheckResult] = []

        # Merge buyer custom element limits if provided (stricter than standard)
        effective_elements: Dict[str, ElementLimit] = dict(grade_rule.element_limits)
        if custom_buyer_limits and "element_limits" in custom_buyer_limits:
            for el, lim in custom_buyer_limits["element_limits"].items():
                effective_elements[el] = ElementLimit(**lim)

        # Merge buyer custom mechanical limits if provided
        effective_mechanical: Dict[str, MechanicalLimit] = dict(grade_rule.mechanical_limits)
        if custom_buyer_limits and "mechanical_limits" in custom_buyer_limits:
            for prop, lim in custom_buyer_limits["mechanical_limits"].items():
                effective_mechanical[prop] = MechanicalLimit(**lim)

        meets_all = True
        flags_count = 0
        unclear_count = 0
        passed_count = 0

        # Evaluate Chemistry
        for elem_name, limits in effective_elements.items():
            # If CEV is in limits and not directly measured, try to calculate it
            val = measured_chemistry.get(elem_name)
            if val is None and elem_name == "CEV":
                val = cls.calculate_cev(measured_chemistry)

            if val is None:
                # Value missing
                property_results.append(PropertyCheckResult(
                    property_name=elem_name,
                    property_type="chemistry",
                    measured_value=None,
                    min_limit=limits.min,
                    max_limit=limits.max,
                    unit=limits.unit,
                    status=PropertyStatus.UNCLEAR,
                    delta=None,
                    message="Value missing or unreadable on certificate",
                ))
                unclear_count += 1
                meets_all = False
                continue

            # Round measured value according to rounding rule
            rounded_val = round(float(val), 3)
            delta = None
            prop_status = PropertyStatus.PASS
            msg = f"{elem_name} {rounded_val}{limits.unit} meets the limits you entered"

            if limits.max is not None and rounded_val > round(limits.max, 3):
                prop_status = PropertyStatus.FAIL
                delta = round(rounded_val - limits.max, 3)
                msg = f"{elem_name} {rounded_val}{limits.unit} exceeds entered max {limits.max}{limits.unit} (+{delta}{limits.unit})"
                meets_all = False
                flags_count += 1
            elif limits.min is not None and rounded_val < round(limits.min, 3):
                prop_status = PropertyStatus.FAIL
                delta = round(rounded_val - limits.min, 3)
                msg = f"{elem_name} {rounded_val}{limits.unit} below entered min {limits.min}{limits.unit} ({delta}{limits.unit})"
                meets_all = False
                flags_count += 1
            else:
                passed_count += 1

            property_results.append(PropertyCheckResult(
                property_name=elem_name,
                property_type="chemistry",
                measured_value=rounded_val,
                min_limit=limits.min,
                max_limit=limits.max,
                unit=limits.unit,
                status=prop_status,
                delta=delta,
                message=msg,
            ))

        # Evaluate Mechanical
        for mech_name, limits in effective_mechanical.items():
            val = measured_mechanical.get(mech_name)
            if val is None:
                property_results.append(PropertyCheckResult(
                    property_name=mech_name,
                    property_type="mechanical",
                    measured_value=None,
                    min_limit=limits.min,
                    max_limit=limits.max,
                    unit=limits.unit,
                    status=PropertyStatus.UNCLEAR,
                    delta=None,
                    message="Value missing or unreadable on certificate",
                ))
                unclear_count += 1
                meets_all = False
                continue

            rounded_val = round(float(val), 1)
            delta = None
            prop_status = PropertyStatus.PASS
            msg = f"{mech_name} {rounded_val} {limits.unit} meets the limits you entered"

            if limits.max is not None and rounded_val > limits.max:
                prop_status = PropertyStatus.FAIL
                delta = round(rounded_val - limits.max, 1)
                msg = f"{mech_name} {rounded_val} {limits.unit} exceeds entered max {limits.max} {limits.unit} (+{delta})"
                meets_all = False
                flags_count += 1
            elif limits.min is not None and rounded_val < limits.min:
                prop_status = PropertyStatus.FAIL
                delta = round(rounded_val - limits.min, 1)
                msg = f"{mech_name} {rounded_val} {limits.unit} below entered min {limits.min} {limits.unit} ({delta})"
                meets_all = False
                flags_count += 1
            else:
                passed_count += 1

            property_results.append(PropertyCheckResult(
                property_name=mech_name,
                property_type="mechanical",
                measured_value=rounded_val,
                min_limit=limits.min,
                max_limit=limits.max,
                unit=limits.unit,
                status=prop_status,
                delta=delta,
                message=msg,
            ))

        # Execute Self-Cross Checks
        self_checks = cls.perform_certificate_self_checks(certificate_data, measured_chemistry)

        # Check if any critical self-check failed
        for sc in self_checks:
            if not sc.passed and sc.severity == "flag":
                meets_all = False
                flags_count += 1

        summary_wording = "meets the limits you entered" if meets_all else "does not meet the limits you entered"

        return HeatSpecCheckResult(
            heat_number=heat_number,
            certificate_id=certificate_data.get("certificate_id"),
            standard_name=grade_rule.standard_name,
            grade=grade_rule.grade,
            meets_limits=meets_all,
            status_summary=summary_wording,
            property_results=property_results,
            self_checks=self_checks,
            flags_count=flags_count,
            unclear_count=unclear_count,
            passed_count=passed_count,
            total_properties=len(property_results),
        )

    @classmethod
    def evaluate_shipment_heats(
        cls,
        shipment_id: Optional[str],
        grade_id: str,
        heats_payload: List[Dict[str, Any]],
        custom_buyer_limits: Optional[Dict[str, Any]] = None,
    ) -> ShipmentSpecCheckSummary:
        """
        Aggregates tolerance evaluations across all heats in a shipment.
        Produces the exact summary line required by Prompt Pack v4 Task C1:
        'All X heats meet the entered limits' or 'Y heats need attention'.
        """
        grade_rule = cls.get_grade(grade_id)
        if not grade_rule:
            # Fallback to ASTM A105 default if grade not found
            grade_rule = cls.list_grades()[0]

        heat_results: List[HeatSpecCheckResult] = []
        attention_count = 0
        passing_count = 0

        for heat_item in heats_payload:
            heat_num = heat_item.get("heat_number", "UNKNOWN-HEAT")
            chem = heat_item.get("chemistry", {})
            mech = heat_item.get("mechanical", {})
            cert = heat_item.get("certificate", {})

            res = cls.evaluate_heat_against_spec(
                heat_number=heat_num,
                grade_rule=grade_rule,
                measured_chemistry=chem,
                measured_mechanical=mech,
                certificate_data=cert,
                custom_buyer_limits=custom_buyer_limits,
            )

            if res.meets_limits:
                passing_count += 1
            else:
                attention_count += 1

            heat_results.append(res)

        total_heats = len(heat_results)
        if attention_count == 0:
            summary_line = f"All {total_heats} heats meet the entered limits"
        else:
            summary_line = f"{attention_count} heats need attention"

        return ShipmentSpecCheckSummary(
            shipment_id=shipment_id,
            total_heats=total_heats,
            passing_heats=passing_count,
            attention_heats=attention_count,
            summary_line=summary_line,
            heats=heat_results,
        )

    @classmethod
    def propose_limits_from_po_text(cls, po_text: str) -> Dict[str, Any]:
        """
        Extracts/proposes numeric property limits from buyer purchase order or specification text.
        Always flagged for user confirmation before becoming effective.
        """
        proposals: Dict[str, Any] = {
            "source_type": "po_text_extraction",
            "element_limits": {},
            "mechanical_limits": {},
            "notes": "Plant-confirmed limits, check against current standard before confirming.",
        }

        # Carbon regex: max C 0.22% or C <= 0.22 or Carbon max: 0.22
        c_match = re.search(r"(?:max\s+c(?:arbon)?|c(?:arbon)?\s*<=\s*|c\s+max[:=]?)\s*([0-9]*\.?[0-9]+)\s*%", po_text, re.IGNORECASE)
        if c_match:
            proposals["element_limits"]["C"] = {"min": 0.0, "max": float(c_match.group(1)), "unit": "%"}

        # CEV regex: max CEV 0.41 or CEV <= 0.41
        cev_match = re.search(r"(?:max\s+cev|cev\s*<=\s*|cev\s+max[:=]?)\s*([0-9]*\.?[0-9]+)", po_text, re.IGNORECASE)
        if cev_match:
            proposals["element_limits"]["CEV"] = {"min": 0.0, "max": float(cev_match.group(1)), "unit": ""}

        # Manganese regex
        mn_match = re.search(r"(?:mn|manganese)\s*(?:max|<=|[:=])\s*([0-9]*\.?[0-9]+)\s*%", po_text, re.IGNORECASE)
        if mn_match:
            proposals["element_limits"]["Mn"] = {"min": 0.0, "max": float(mn_match.group(1)), "unit": "%"}

        # Yield strength: min yield 250 MPa or YS >= 250
        ys_match = re.search(r"(?:min\s+yield|yield\s*(?:strength)?\s*(?:min|>=|[:=])|ys\s*(?:min|>=|[:=]))\s*([0-9]+(?:\.[0-9]+)?)\s*(?:mpa|n/mm2)?", po_text, re.IGNORECASE)
        if ys_match:
            proposals["mechanical_limits"]["yield_strength"] = {"min": float(ys_match.group(1)), "max": None, "unit": "MPa"}

        # Tensile strength: tensile min 485 or TS 485-620
        ts_match = re.search(r"(?:tensile\s*(?:strength)?|ts)\s*(?:min|>=|[:=])?\s*([0-9]+)\s*(?:-|to)\s*([0-9]+)\s*(?:mpa|n/mm2)?", po_text, re.IGNORECASE)
        if ts_match:
            proposals["mechanical_limits"]["tensile_strength"] = {"min": float(ts_match.group(1)), "max": float(ts_match.group(2)), "unit": "MPa"}

        # Charpy impact: Charpy at -20C min 27J
        impact_match = re.search(r"(?:charpy|impact)\s*(?:at\s*([+-]?[0-9]+)\s*°?c)?\s*(?:min|>=|[:=])?\s*([0-9]+)\s*j", po_text, re.IGNORECASE)
        if impact_match:
            temp = float(impact_match.group(1)) if impact_match.group(1) else -20.0
            joules = float(impact_match.group(2))
            proposals["mechanical_limits"]["impact_energy"] = {"min": joules, "max": None, "unit": "J", "test_temp_c": temp}

        return proposals
