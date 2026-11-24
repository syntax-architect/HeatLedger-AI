"""
HEATLEDGER AI: Certificate Anomaly & Duplicate Verification Engine (Prompt C5)
Specification: Prompt Pack v4 - Phase C (C5)

Catches certificate inconsistencies, data collisions, and editing indicators:
1. Same heat number on certificates from different mills or conflicting chemistry.
2. Ledger over-allocation (allocated tonnes > certified capacity).
3. Exact duplicate file hash or identical content under different filenames.
4. Date sequence anomalies (test date after certificate or dispatch date; odd format).
5. Physical plausibility checks (tensile < yield, carbon > 2.0%, negative elongation).
6. PDF metadata signs of external editing (Photoshop, Canva, PDFedit, modification lag).
7. Rounding patterns / repeated digits indicating manual typing rather than OES spectrometer.
8. Inspector resolution workflow with logged audit justification.
"""

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class AnomalyService:
    """Engine for detecting certificate anomalies, duplicates, and physical implausibility."""

    SUSPICIOUS_PRODUCERS = [
        "photoshop", "canva", "gimp", "pdfedit", "ilovepdf", "sejda",
        "smallpdf", "foxit phantompdf", "nitro pro", "inkscape"
    ]

    @classmethod
    def check_duplicate_heats(
        cls,
        heat_number: str,
        mill_name: str,
        chemistry: Dict[str, Any],
        existing_certs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Check 1: Same heat number on certificates from different mills or conflicting chemistry.
        """
        flags = []
        if not heat_number or heat_number.strip() in ("", "UNKNOWN", "NA", "N/A"):
            return flags

        h_norm = heat_number.strip().upper()
        m_norm = mill_name.strip().lower()

        for existing in existing_certs:
            ex_heat = str(existing.get("heat_number", "")).strip().upper()
            if ex_heat != h_norm:
                continue

            ex_mill = str(existing.get("mill_name", "")).strip().lower()
            ex_cert_id = existing.get("id") or existing.get("certificate_number") or "existing_cert"

            # Check 1a: Different mills claiming identical heat number
            if ex_mill and m_norm and ex_mill != m_norm:
                flags.append({
                    "flag_id": f"ANOM_DIFF_MILL_{h_norm}",
                    "check_code": "SAME_HEAT_DIFFERENT_MILL",
                    "severity": "BLOCKER",
                    "why": f"Heat number '{h_norm}' appears on certificate from a different mill ('{existing.get('mill_name')}') in existing records.",
                    "what_to_do": "Cross-check physical heat markings with raw material receiving tally and request mill proof of melt origin.",
                    "status": "ACTIVE"
                })

            # Check 1b: Same mill, but chemistry differs significantly (> 0.05% carbon variance)
            ex_chem = existing.get("chemistry", {})
            curr_c = chemistry.get("C")
            ex_c = ex_chem.get("C")
            if curr_c is not None and ex_c is not None:
                try:
                    if abs(float(curr_c) - float(ex_c)) > 0.05:
                        flags.append({
                            "flag_id": f"ANOM_CHEM_CONFLICT_{h_norm}",
                            "check_code": "SAME_HEAT_CONFLICTING_CHEMISTRY",
                            "severity": "WARNING",
                            "why": f"Heat '{h_norm}' has carbon {curr_c}%, but earlier certificate {ex_cert_id} reports {ex_c}% for the same heat number.",
                            "what_to_do": "Verify whether this is a separate ladle sample or a re-test from the producer.",
                            "status": "ACTIVE"
                        })
                except (ValueError, TypeError):
                    pass

        return flags

    @classmethod
    def check_tonnage_over_allocation(
        cls,
        heat_number: str,
        certified_tonnes: float,
        previously_allocated_tonnes: float,
        current_allocation_tonnes: float
    ) -> Optional[Dict[str, Any]]:
        """
        Check 2: Ledger over-allocation (allocated tonnes > certified tonnage).
        """
        if certified_tonnes <= 0:
            return None

        total_requested = previously_allocated_tonnes + current_allocation_tonnes
        if total_requested > certified_tonnes + 0.001:  # Allow 1kg float epsilon
            overage = round(total_requested - certified_tonnes, 2)
            return {
                "flag_id": f"ANOM_OVER_ALLOCATION_{heat_number}",
                "check_code": "LEDGER_OVER_ALLOCATION",
                "severity": "BLOCKER",
                "why": f"Heat '{heat_number}' certified capacity is {certified_tonnes} MT, but allocations total {total_requested} MT (over-allocated by {overage} MT).",
                "what_to_do": "Reduce allocated quantity or link additional certified heats to cover the shipment balance.",
                "status": "ACTIVE"
            }
        return None

    @classmethod
    def check_duplicate_content(
        cls,
        file_hash: str,
        filename: str,
        existing_records: List[Dict[str, Any]]
    ) -> Optional[Dict[str, Any]]:
        """
        Check 3: Same certificate file or identical content uploaded twice under different names.
        """
        if not file_hash:
            return None

        for rec in existing_records:
            if rec.get("file_hash") == file_hash:
                ex_name = rec.get("filename", "existing_file")
                return {
                    "flag_id": f"ANOM_DUPLICATE_FILE_{file_hash[:8]}",
                    "check_code": "DUPLICATE_CERTIFICATE_FILE",
                    "severity": "WARNING",
                    "why": f"File content is byte-identical to already uploaded certificate '{ex_name}' (SHA-256: {file_hash[:12]}...).",
                    "what_to_do": "Confirm if this lot is part of the same batch or if an identical certificate was uploaded in duplicate.",
                    "status": "ACTIVE"
                }
        return None

    @classmethod
    def check_date_sequences(
        cls,
        test_date_str: Optional[str],
        cert_date_str: Optional[str],
        dispatch_date_str: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Check 4: Test date after dispatch date, or test date after certificate date.
        """
        flags = []
        t_date = None
        c_date = None
        d_date = None

        if test_date_str:
            try:
                t_date = datetime.strptime(test_date_str[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass

        if cert_date_str:
            try:
                c_date = datetime.strptime(cert_date_str[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass

        if dispatch_date_str:
            try:
                d_date = datetime.strptime(dispatch_date_str[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                pass

        # Test date cannot be after certificate issuance date
        if t_date and c_date and t_date > c_date:
            flags.append({
                "flag_id": "ANOM_TEST_AFTER_CERT_DATE",
                "check_code": "TEST_DATE_AFTER_CERT_DATE",
                "severity": "WARNING",
                "why": f"Laboratory test date ({t_date}) is after certificate issue date ({c_date}).",
                "what_to_do": "Check original certificate scan for date transposition or typographical error.",
                "status": "ACTIVE"
            })

        # Test date cannot be after shipment dispatch
        if t_date and d_date and t_date > d_date:
            flags.append({
                "flag_id": "ANOM_TEST_AFTER_DISPATCH",
                "check_code": "TEST_DATE_AFTER_DISPATCH",
                "severity": "BLOCKER",
                "why": f"Certificate test date ({t_date}) is after shipment dispatch date ({d_date}). Material cannot be certified after departure.",
                "what_to_do": "Confirm dispatch departure manifest and verify testing schedule with quality controller.",
                "status": "ACTIVE"
            })

        return flags

    @classmethod
    def check_physical_plausibility(
        cls,
        chemistry: Dict[str, Any],
        mechanical: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Check 5: Chemistry or strength values outside physical plausibility for wrought steel.
        """
        flags = []

        # 5a: Tensile strength less than Yield strength
        yield_str = mechanical.get("yield_strength_mpa")
        tensile_str = mechanical.get("tensile_strength_mpa")
        if yield_str is not None and tensile_str is not None:
            try:
                y = float(yield_str)
                t = float(tensile_str)
                if t < y:
                    flags.append({
                        "flag_id": "ANOM_TENSILE_LT_YIELD",
                        "check_code": "TENSILE_LESS_THAN_YIELD",
                        "severity": "BLOCKER",
                        "why": f"Tensile strength ({t} MPa) is less than yield strength ({y} MPa), which is physically impossible in wrought steel.",
                        "what_to_do": "Review original physical test report; values may have been transposed during entry.",
                        "status": "ACTIVE"
                    })
                if y <= 0 or t <= 0:
                    flags.append({
                        "flag_id": "ANOM_NON_POSITIVE_STRENGTH",
                        "check_code": "NON_POSITIVE_STRENGTH",
                        "severity": "BLOCKER",
                        "why": f"Mechanical strength value is zero or negative ({y} / {t} MPa).",
                        "what_to_do": "Enter verified tensile test results.",
                        "status": "ACTIVE"
                    })
            except (ValueError, TypeError):
                pass

        # 5b: Elongation plausibility
        elongation = mechanical.get("elongation_pct")
        if elongation is not None:
            try:
                el = float(elongation)
                if el <= 0.0 or el > 75.0:
                    flags.append({
                        "flag_id": "ANOM_ELONGATION_IMPLAUSIBLE",
                        "check_code": "ELONGATION_OUT_OF_RANGE",
                        "severity": "WARNING",
                        "why": f"Reported elongation ({el}%) is outside expected physical range (2% - 70%) for industrial steel.",
                        "what_to_do": "Check gauge length standard (e.g. 4d, 5d, A50) and test report.",
                        "status": "ACTIVE"
                    })
            except (ValueError, TypeError):
                pass

        # 5c: Carbon content in wrought carbon/alloy steel > 2.0% (Cast iron threshold)
        carbon = chemistry.get("C")
        if carbon is not None:
            try:
                c = float(carbon)
                if c > 2.14:
                    flags.append({
                        "flag_id": "ANOM_CARBON_CAST_IRON",
                        "check_code": "CARBON_EXCEEDS_STEEL_THRESHOLD",
                        "severity": "BLOCKER",
                        "why": f"Carbon content ({c}%) exceeds the 2.14% thermodynamic limit for wrought steel (falls in cast iron domain).",
                        "what_to_do": "Confirm decimal place on spectrometry reading (e.g. 0.21% vs 2.10%).",
                        "status": "ACTIVE"
                    })
                elif c < 0.0:
                    flags.append({
                        "flag_id": "ANOM_NEGATIVE_ELEMENT",
                        "check_code": "NEGATIVE_CHEMISTRY",
                        "severity": "BLOCKER",
                        "why": f"Negative element value ({c}%) reported.",
                        "what_to_do": "Enter verified chemical composition.",
                        "status": "ACTIVE"
                    })
            except (ValueError, TypeError):
                pass

        return flags

    @classmethod
    def check_pdf_metadata(cls, pdf_metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check 6: PDF metadata signs of external editing (Producer tool, modification date lag).
        """
        flags = []
        if not pdf_metadata:
            return flags

        producer = str(pdf_metadata.get("producer") or pdf_metadata.get("creator") or "").lower()
        for suspicious in cls.SUSPICIOUS_PRODUCERS:
            if suspicious in producer:
                flags.append({
                    "flag_id": f"ANOM_PDF_EDITOR_{suspicious.upper()}",
                    "check_code": "PDF_EDITOR_TOOL_DETECTED",
                    "severity": "WARNING",
                    "why": f"PDF metadata indicates document was created or modified with an interactive design or editing tool ({pdf_metadata.get('producer') or suspicious}).",
                    "what_to_do": "Looks edited, ask the mill for the original unaltered export directly from their ERP/LIMS system.",
                    "status": "ACTIVE"
                })
                break

        # Check creation date vs modification date gap
        creation_date = pdf_metadata.get("creation_date")
        mod_date = pdf_metadata.get("mod_date")
        if creation_date and mod_date and isinstance(creation_date, str) and isinstance(mod_date, str):
            try:
                # PDF dates typically formatted D:YYYYMMDDHHmmSS or ISO
                c_clean = re.sub(r"[^0-9]", "", creation_date)[:8]
                m_clean = re.sub(r"[^0-9]", "", mod_date)[:8]
                if len(c_clean) == 8 and len(m_clean) == 8:
                    c_dt = datetime.strptime(c_clean, "%Y%m%d")
                    m_dt = datetime.strptime(m_clean, "%Y%m%d")
                    days_gap = (m_dt - c_dt).days
                    if days_gap > 30:
                        flags.append({
                            "flag_id": "ANOM_PDF_MODIFICATION_LAG",
                            "check_code": "PDF_MODIFIED_MONTHS_LATER",
                            "severity": "REVIEW",
                            "why": f"PDF modification date is {days_gap} days after creation date, indicating retrospective edits.",
                            "what_to_do": "Inspect certificate for pasted overlays and request direct mill confirmation.",
                            "status": "ACTIVE"
                        })
            except Exception:
                pass

        return flags

    @classmethod
    def check_digit_repetition_patterns(cls, chemistry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Check 7: Rounding patterns and repeated digits suggesting typing rather than spectrometer testing.
        """
        flags = []
        if not chemistry:
            return flags

        suspicious_entries = []
        for el, val in chemistry.items():
            if val is None or el in ("id", "heat_id", "mill"):
                continue
            val_str = str(val).strip()
            # Check for patterns like 0.222, 0.3333, 0.4444, 0.1234
            if re.search(r"(\d)\1{2,}", val_str):
                suspicious_entries.append(f"{el}={val_str}")
            elif val_str.endswith("000") and len(val_str) >= 5:
                suspicious_entries.append(f"{el}={val_str}")

        if len(suspicious_entries) >= 2:
            flags.append({
                "flag_id": "ANOM_SPECTROMETER_TYPED_PATTERNS",
                "check_code": "REPEATED_DIGIT_TYPING_DETECTED",
                "severity": "REVIEW",
                "why": f"Chemical composition contains repeated digit sequences ({', '.join(suspicious_entries)}) that suggest manual typing rather than automated spectrometer output.",
                "what_to_do": "Review original heat analysis sheet from testing laboratory.",
                "status": "ACTIVE"
            })

        return flags

    @classmethod
    def run_all_anomaly_checks(
        cls,
        certificate: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes all 7 certificate anomaly and duplicate checks.
        Returns complete audit report with itemized flags and suggested actions.
        """
        context = context or {}
        existing_certs = context.get("existing_certificates", [])
        existing_files = context.get("existing_files", [])

        heat_number = certificate.get("heat_number") or ""
        mill_name = certificate.get("mill_name") or ""
        chemistry = certificate.get("chemistry") or {}
        mechanical = certificate.get("mechanical") or {}
        file_hash = certificate.get("file_hash") or ""
        filename = certificate.get("filename") or ""
        pdf_metadata = certificate.get("pdf_metadata") or {}

        test_date = certificate.get("test_date")
        cert_date = certificate.get("certificate_date")
        dispatch_date = context.get("dispatch_date")

        all_flags = []

        # 1. Duplicate heat check across mills / conflicting chemistry
        all_flags.extend(cls.check_duplicate_heats(heat_number, mill_name, chemistry, existing_certs))

        # 2. Tonnage over-allocation check
        cert_tonnes = float(certificate.get("quantity_tonnes") or certificate.get("certified_tonnes") or 0.0)
        prev_tonnes = float(context.get("previously_allocated_tonnes", 0.0))
        curr_tonnes = float(context.get("current_allocation_tonnes", 0.0))
        if cert_tonnes > 0:
            over_alloc = cls.check_tonnage_over_allocation(heat_number, cert_tonnes, prev_tonnes, curr_tonnes)
            if over_alloc:
                all_flags.append(over_alloc)

        # 3. Duplicate content file hash
        file_dup = cls.check_duplicate_content(file_hash, filename, existing_files)
        if file_dup:
            all_flags.append(file_dup)

        # 4. Date sequence checks
        all_flags.extend(cls.check_date_sequences(test_date, cert_date, dispatch_date))

        # 5. Physical plausibility checks
        all_flags.extend(cls.check_physical_plausibility(chemistry, mechanical))

        # 6. PDF metadata signs of external editing
        all_flags.extend(cls.check_pdf_metadata(pdf_metadata))

        # 7. Digit repetition / manual typing patterns
        all_flags.extend(cls.check_digit_repetition_patterns(chemistry))

        blockers = [f for f in all_flags if f["severity"] == "BLOCKER"]
        warnings = [f for f in all_flags if f["severity"] == "WARNING"]
        reviews = [f for f in all_flags if f["severity"] == "REVIEW"]

        status = "FLAGGED" if len(all_flags) > 0 else "CLEAN"

        return {
            "certificate_id": certificate.get("id", "cert_unknown"),
            "heat_number": heat_number,
            "mill_name": mill_name,
            "status": status,
            "total_flags": len(all_flags),
            "blockers_count": len(blockers),
            "warnings_count": len(warnings),
            "reviews_count": len(reviews),
            "flags": all_flags,
            "disclaimer": "Automated anomaly checks highlight data discrepancies for inspector review. Not a legal accusation."
        }
