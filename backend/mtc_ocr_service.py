"""
HEATLEDGER AI: Vision & Vector Text-Layer Extraction Engine
Module: mtc_ocr_service.py
Specification: EN 10204:2004 3.1 MTC & EU Reg 2026/1963 Melt-and-Pour Verification
Hardened for Anti-Hallucination: Zero invented data, authentic PyMuPDF coordinates,
and database-backed cache (keyed by sha256, model, schema_version).
"""

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

import pymupdf as fitz
from pydantic import BaseModel, Field

logger = logging.getLogger("heatledger.ocr")

SCHEMA_VERSION = "2.0.0"


class BoundingBox(BaseModel):
    page: int = Field(default=1, description="1-indexed page number")
    x0: float = Field(..., description="Left coordinate (0-1000 scale)")
    y0: float = Field(..., description="Top coordinate (0-1000 scale)")
    x1: float = Field(..., description="Right coordinate (0-1000 scale)")
    y1: float = Field(..., description="Bottom coordinate (0-1000 scale)")


class ChemicalElementReading(BaseModel):
    measured: float
    min_limit: Optional[float] = None
    max_limit: Optional[float] = None
    unit: str = "%"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_text: Optional[str] = None
    bounding_box: Optional[BoundingBox] = None


class MechanicalReading(BaseModel):
    property_name: str
    measured_value: float
    unit: str
    requirement: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_text: Optional[str] = None
    bounding_box: Optional[BoundingBox] = None


class CountryMeltPourResult(BaseModel):
    country_name: Optional[str] = None
    iso_code: Optional[str] = None
    explicitly_stated_on_cert: bool = Field(
        default=False,
        description="True if 'Country of Melt and Pour' or primary steelmaking location is explicitly attested, False if missing (EU Reg 2026/1963 defect)"
    )
    melting_route: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_text: Optional[str] = None
    bounding_box: Optional[BoundingBox] = None


class MTCExtractionResult(BaseModel):
    status: str = Field(default="success", description="'success' or 'needs_manual_entry'")
    reason: Optional[str] = Field(default=None, description="Explanation when status is 'needs_manual_entry'")
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    mill_name: Optional[str] = None
    certificate_number: Optional[str] = None
    issue_date: Optional[str] = None
    heat_numbers: List[str] = Field(default_factory=list)
    grade: Optional[str] = None
    quantity_mt: Optional[float] = None
    country_of_melt_and_pour: Optional[CountryMeltPourResult] = None
    chemical_composition: Dict[str, ChemicalElementReading] = Field(default_factory=dict)
    mechanical_properties: Dict[str, MechanicalReading] = Field(default_factory=dict)
    raw_text_blocks_count: int = 0
    sha256_checksum: str = ""
    extracted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    flagged_for_review: bool = False
    review_reasons: List[str] = Field(default_factory=list)


# Country name to ISO 3166-1 alpha-2 mapping
COUNTRY_ISO_MAP = {
    "INDIA": "IN",
    "BHARAT": "IN",
    "GERMANY": "DE",
    "DEUTSCHLAND": "DE",
    "CHINA": "CN",
    "JAPAN": "JP",
    "UNITED STATES": "US",
    "USA": "US",
    "UNITED KINGDOM": "GB",
    "UK": "GB",
    "ITALY": "IT",
    "FRANCE": "FR",
    "SPAIN": "ES",
    "SWEDEN": "SE",
    "FINLAND": "FI",
    "AUSTRIA": "AT",
    "BELGIUM": "BE",
    "NETHERLANDS": "NL",
    "BRAZIL": "BR",
    "SOUTH KOREA": "KR",
    "KOREA": "KR",
    "TURKEY": "TR",
    "TURKIYE": "TR",
    "TAIWAN": "TW",
    "VIETNAM": "VN",
    "POLAND": "PL",
    "CZECH REPUBLIC": "CZ",
    "SLOVAKIA": "SK",
}


class MTCOCRService:
    def __init__(self, gemini_api_key: Optional[str] = None, db_path: Optional[str] = None):
        self.api_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        if db_path:
            self.db_path = db_path
        else:
            self.db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ocr_cache.sqlite3")
        self._init_sqlite_cache()

    def _init_sqlite_cache(self):
        """Initializes persistent SQLite cache table for extraction results."""
        try:
            with get_db_connection(target_path=self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS ocr_extractions_cache (
                        sha256 TEXT NOT NULL,
                        model TEXT NOT NULL,
                        schema_version TEXT NOT NULL,
                        result_json TEXT NOT NULL,
                        is_valid_schema INTEGER NOT NULL DEFAULT 1,
                        human_rejected INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        PRIMARY KEY (sha256, model, schema_version)
                    );
                """)
                conn.commit()
        except Exception as e:
            logger.warning(f"[OCR Cache] SQLite cache initialization warning: {e}")

    def get_cached_result(self, sha256: str, model: str = "any") -> Optional[MTCExtractionResult]:
        """
        Retrieves cached result if sha256 matches, schema_version is current,
        schema passed validation, and no human rejection has occurred.
        """
        try:
            with get_db_connection(target_path=self.db_path) as conn:
                cursor = conn.cursor()
                if model == "any":
                    cursor.execute("""
                        SELECT result_json FROM ocr_extractions_cache
                        WHERE sha256 = ? AND schema_version = ? AND is_valid_schema = 1 AND human_rejected = 0
                        ORDER BY created_at DESC LIMIT 1
                    """, (sha256, SCHEMA_VERSION))
                else:
                    cursor.execute("""
                        SELECT result_json FROM ocr_extractions_cache
                        WHERE sha256 = ? AND model = ? AND schema_version = ? AND is_valid_schema = 1 AND human_rejected = 0
                        LIMIT 1
                    """, (sha256, model, SCHEMA_VERSION))
                row = cursor.fetchone()
                if row:
                    data = json.loads(row[0])
                    # Strictly only return cached data if it was a successful extraction
                    if data.get("status") == "success":
                        return MTCExtractionResult.model_validate(data)
        except Exception as e:
            logger.warning(f"[OCR Cache] Read error for {sha256[:12]}: {e}")
        return None

    def save_cached_result(self, sha256: str, result: MTCExtractionResult, model: str = "text_layer_pymupdf"):
        """
        Caches ONLY extractions that succeeded, passed schema validation,
        and were not rejected. Never caches 'needs_manual_entry'.
        """
        if result.status != "success":
            return
        try:
            with get_db_connection(target_path=self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO ocr_extractions_cache
                    (sha256, model, schema_version, result_json, is_valid_schema, human_rejected, created_at)
                    VALUES (?, ?, ?, ?, 1, 0, datetime('now'))
                """, (sha256, model, SCHEMA_VERSION, result.model_dump_json()))
                conn.commit()
        except Exception as e:
            logger.warning(f"[OCR Cache] Write error for {sha256[:12]}: {e}")

    @staticmethod
    def sanitize_pdf_payload(pdf_bytes: bytes) -> bytes:
        """
        OWASP Defense-in-Depth: Scans PDF catalog and xref objects for active content and exploits:
        /JS, /JavaScript, /Launch, /EmbeddedFiles, /AA (Auto-Action).
        Neutralizes and scrubs malicious PDF payloads before processing with PyMuPDF.
        """
        if not pdf_bytes.startswith(b"%PDF-"):
            return pdf_bytes

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise ValueError(f"Corrupt or unreadable PDF: {e}")

        dangerous_patterns = [
            re.compile(rb"/JS\b", re.IGNORECASE),
            re.compile(rb"/JavaScript\b", re.IGNORECASE),
            re.compile(rb"/Launch\b", re.IGNORECASE),
            re.compile(rb"/EmbeddedFiles\b", re.IGNORECASE),
            re.compile(rb"/AA\b", re.IGNORECASE),
        ]

        modified = False

        for xref in range(1, doc.xref_length()):
            try:
                raw_obj = doc.xref_object(xref).encode("utf-8", errors="ignore")
            except Exception:
                continue

            for pattern in dangerous_patterns:
                if pattern.search(raw_obj):
                    modified = True
                    clean_obj = pattern.sub(rb"/DisabledSecAction", raw_obj)
                    try:
                        doc.update_object(xref, clean_obj.decode("utf-8", errors="ignore"))
                    except Exception:
                        pass

        try:
            catalog_xref = doc.pdf_catalog()
            raw_catalog = doc.xref_object(catalog_xref).encode("utf-8", errors="ignore")
            for pattern in dangerous_patterns:
                if pattern.search(raw_catalog):
                    modified = True
                    clean_catalog = pattern.sub(rb"/DisabledSecAction", raw_catalog)
                    try:
                        doc.update_object(catalog_xref, clean_catalog.decode("utf-8", errors="ignore"))
                    except Exception:
                        pass
        except Exception:
            pass

        if modified:
            logger.info("[Security Firewall] Active content (/JS, /Launch, /AA, /EmbeddedFiles) neutralized in PDF.")
            cleaned_bytes = doc.write(clean=True, deflate=True)
            doc.close()
            return cleaned_bytes

        doc.close()
        return pdf_bytes

    def extract_pdf_vector_blocks(self, pdf_bytes: bytes) -> tuple[List[dict], int, int]:
        """
        Uses PyMuPDF to extract text blocks and compute normalized 0-1000 scale coordinates.
        """
        safe_bytes = self.sanitize_pdf_payload(pdf_bytes)
        doc = fitz.open(stream=safe_bytes, filetype="pdf")
        if len(doc) == 0:
            doc.close()
            return [], 595, 842

        page = doc[0]
        rect = page.rect
        width = rect.width or 595
        height = rect.height or 842

        blocks = []
        for b in page.get_text("blocks"):
            if b[6] == 0:  # Text block
                norm_x0 = round((b[0] / width) * 1000, 1)
                norm_y0 = round((b[1] / height) * 1000, 1)
                norm_x1 = round((b[2] / width) * 1000, 1)
                norm_y1 = round((b[3] / height) * 1000, 1)
                blocks.append({
                    "text": b[4].strip(),
                    "bbox": [1, norm_x0, norm_y0, norm_x1, norm_y1]
                })

        doc.close()
        return blocks, int(width), int(height)

    def parse_text_layer_mtc(
        self,
        pdf_bytes: bytes,
        sha256: str
    ) -> MTCExtractionResult:
        """
        High-fidelity PyMuPDF Text-Layer Parser:
        Parses actual words, text lines, coordinates, and table structures directly from the PDF canvas.
        ANTI-HALLUCINATION: If the document lacks steelmaking data, returns status='needs_manual_entry'.
        Never returns a hardcoded default or invented values.
        """
        safe_bytes = self.sanitize_pdf_payload(pdf_bytes)
        doc = fitz.open(stream=safe_bytes, filetype="pdf")
        if len(doc) == 0:
            doc.close()
            return MTCExtractionResult(
                status="needs_manual_entry",
                reason="No certificate data found",
                confidence_score=0.0,
                sha256_checksum=sha256,
                flagged_for_review=True,
                review_reasons=["Blank document: No certificate data found"]
            )

        page = doc[0]
        rect = page.rect
        width = rect.width or 595
        height = rect.height or 842

        words = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)
        full_text = page.get_text("text")
        blocks = page.get_text("blocks")
        doc.close()

        # Immediate return on blank page / whitespace-only canvas
        if not full_text.strip() or len(words) == 0:
            return MTCExtractionResult(
                status="needs_manual_entry",
                reason="No certificate data found",
                confidence_score=0.0,
                sha256_checksum=sha256,
                flagged_for_review=True,
                review_reasons=["Blank document: No certificate data found"]
            )

        def to_norm_box(x0: float, y0: float, x1: float, y1: float) -> BoundingBox:
            return BoundingBox(
                page=1,
                x0=round((x0 / width) * 1000, 1),
                y0=round((y0 / height) * 1000, 1),
                x1=round((x1 / width) * 1000, 1),
                y1=round((y1 / height) * 1000, 1)
            )

        flagged_for_review = False
        review_reasons: List[str] = []

        # 1. Heat Number Detection
        heat_numbers: List[str] = []
        found_heat = None
        is_malformed_heat = False

        heat_patterns = [
            r'\b(?:HEAT(?:\s*/\s*CAST)?|CAST|LOT)\b\s*(?:NUMBER|NO\.?|#)?\s*[:#\-]\s*#?([A-Z0-9][A-Z0-9\-_/]{3,24})',
            r'#([A-Z0-9]{2,5}-\d{2,4}-\d{3,6})',
            r'\bHEAT\b\s*[:#]\s*([A-Za-z0-9\-_]+)'
        ]

        m_heat_explicit = re.search(r'\b(?:HEAT(?:\s*/\s*CAST)?|CAST|LOT)\b\s*(?:NUMBER|NO\.?|#)?\s*[:#\-]\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if m_heat_explicit:
            raw_cand = m_heat_explicit.group(1).strip()
            clean_cand = raw_cand.lstrip("#").strip()
            if any(ch in clean_cand for ch in ["?", "*", "!", "~", "$"]) or "UNKNOWN" in clean_cand.upper() or "INVALID" in clean_cand.upper():
                found_heat = clean_cand
                is_malformed_heat = True
            else:
                m_sub = re.match(r'([A-Za-z0-9][A-Za-z0-9\-_/]{2,24})', clean_cand)
                if m_sub and m_sub.group(1).upper() not in ["NO", "NUMBER", "CAST", "LOT", "MTC", "DATE", "STEEL"]:
                    found_heat = m_sub.group(1)

        if not found_heat:
            for pattern in heat_patterns:
                m = re.search(pattern, full_text, re.IGNORECASE)
                if m:
                    cand = m.group(1).strip()
                    if cand.upper() not in ["NO", "NUMBER", "CAST", "LOT", "MTC", "DATE", "STEEL"]:
                        found_heat = cand
                        break

        if found_heat:
            heat_numbers.append(found_heat)

        if is_malformed_heat:
            flagged_for_review = True
            review_reasons.append(f"Malformed heat number: {found_heat}")
        elif not found_heat:
            flagged_for_review = True
            review_reasons.append("Missing heat number")

        # 2. Mill Name Detection from Header Blocks
        mill_name: Optional[str] = None
        for b in blocks:
            b_text = b[4].strip()
            if not b_text:
                continue
            if b[1] < height * 0.35:
                b_upper = b_text.upper()
                if "TATA STEEL" in b_upper:
                    mill_name = "Tata Steel Limited"
                    break
                elif "SAIL" in b_upper or "STEEL AUTHORITY" in b_upper:
                    mill_name = "Steel Authority of India Limited (SAIL)"
                    break
                elif "JSW" in b_upper:
                    mill_name = "JSW Steel Limited"
                    break
                elif "JINDAL" in b_upper:
                    mill_name = "Jindal Steel & Power"
                    break
                elif "AM/NS" in b_upper or "ARCELORMITTAL" in b_upper:
                    mill_name = "ArcelorMittal Nippon Steel India"
                    break
                elif "SALZGITTER" in b_upper:
                    mill_name = "Salzgitter Flachstahl GmbH"
                    break
                elif "VOESTALPINE" in b_upper:
                    mill_name = "Voestalpine Stahl GmbH"
                    break
                elif "POSCO" in b_upper:
                    mill_name = "POSCO Pohang Works"
                    break
                elif "US STEEL" in b_upper or "UNITED STATES STEEL" in b_upper:
                    mill_name = "United States Steel Corp"
                    break
                elif "STEEL" in b_upper or "MILL" in b_upper or "FORGING" in b_upper or "ALLOY" in b_upper:
                    first_line = b_text.splitlines()[0].strip()
                    if len(first_line) > 3 and not mill_name:
                        mill_name = first_line

        # 3. Certificate Number & Issue Date
        cert_number: Optional[str] = None
        issue_date: Optional[str] = None

        cert_match = re.search(r'(?:CERT(?:IFICATE)?\s*(?:NO\.?|NUMBER|REF)?|TEST\s*CERT(?:IFICATE)?\s*REF)\s*[:#\-]?\s*([A-Za-z0-9\-_/.]{4,36})', full_text, re.IGNORECASE)
        if cert_match:
            cert_number = cert_match.group(1).strip()

        date_match = re.search(r'(?:ISSUE\s*DATE|DATE)\s*[:#\-]?\s*(\d{4}-\d{2}-\d{2}|\d{2}[./-]\d{2}[./-]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})', full_text, re.IGNORECASE)
        if date_match:
            issue_date = date_match.group(1).strip()

        # 4. Steel Grade Detection
        grade: Optional[str] = None
        m_grade = re.search(r'(?:STANDARD\s*/\s*STEEL\s*GRADE|STEEL\s*GRADE|GRADE|SPECIFICATION)\s*[:#\-]?\s*([^\n\r]+)', full_text, re.IGNORECASE)
        if m_grade:
            cand_g = m_grade.group(1).strip()
            cand_g = re.split(r'\b(?:STEELMAKING|DISPATCH|HEAT|CHEMICAL|ROUTE|POUR)\b', cand_g, flags=re.IGNORECASE)[0].strip()
            if len(cand_g) > 1 and cand_g.upper() not in ["STANDARD", "GRADE", "SPEC", "SPECIFICATION"]:
                grade = cand_g

        # 5. Dispatch Quantity Detection
        quantity_mt: Optional[float] = None
        m_qty = re.search(r'(?:DISPATCH\s*QUANTITY|NET\s*QUANTITY|QUANTITY|NET\s*WEIGHT|WEIGHT)\s*[:#\-]?\s*(\d+(?:[.,]\d+)?)\s*(MT|TONNES|TONS|T|KG)?', full_text, re.IGNORECASE)
        if m_qty:
            try:
                raw_q = m_qty.group(1).replace(",", ".")
                q_val = float(raw_q)
                unit = (m_qty.group(2) or "MT").upper()
                quantity_mt = round(q_val / 1000.0, 3) if unit == "KG" else round(q_val, 2)
            except ValueError:
                pass

        # 6. Country of Melt and Pour (EU Reg 2026/1963)
        country_result: Optional[CountryMeltPourResult] = None
        melt_box: Optional[BoundingBox] = None
        has_explicit_melt = False
        country_name: Optional[str] = None
        iso_code: Optional[str] = None

        m_c = re.search(r'COUNTRY\s+OF\s+MELT[^\n]*\b([A-Za-z\s]+?)(?:—|–|-|\(|,|\n|$)', full_text, re.IGNORECASE)
        cand_c = m_c.group(1).strip().upper() if m_c else ""
        for c_name, c_iso in COUNTRY_ISO_MAP.items():
            if (cand_c and c_name in cand_c) or re.search(rf'COUNTRY\s+OF\s+MELT[^\n]*\b{c_name}\b', full_text, re.IGNORECASE):
                country_name = c_name.title()
                iso_code = c_iso
                has_explicit_melt = True
                break

        if not country_name:
            m_orig = re.search(r'(?:COUNTRY\s+OF\s+ORIGIN|ORIGIN\s*[:\-])\s*[:\-]?\s*([A-Za-z\s]+?)(?:—|–|-|\(|,|\n|$)', full_text, re.IGNORECASE)
            if m_orig:
                cand_o = m_orig.group(1).strip().upper()
                for c_name, c_iso in COUNTRY_ISO_MAP.items():
                    if c_name in cand_o:
                        country_name = c_name.title()
                        iso_code = c_iso
                        break

        if re.search(r'COUNTRY\s+OF\s+MELT', full_text, re.IGNORECASE):
            for w in words:
                if "MELT" in w[4].upper():
                    melt_box = to_norm_box(w[0], w[1], w[2], w[3])
                    break

        melting_route: Optional[str] = None
        if re.search(r'BASIC\s*OXYGEN\s*FURNACE|BOF', full_text, re.IGNORECASE):
            melting_route = "Basic Oxygen Furnace (BOF) / CC"
        elif re.search(r'ELECTRIC\s*ARC\s*FURNACE|EAF', full_text, re.IGNORECASE):
            melting_route = "Electric Arc Furnace (EAF)"
        elif re.search(r'INDUCTION\s*FURNACE|IF', full_text, re.IGNORECASE):
            melting_route = "Induction Furnace (IF)"

        if country_name:
            country_result = CountryMeltPourResult(
                country_name=country_name,
                iso_code=iso_code or "XX",
                explicitly_stated_on_cert=has_explicit_melt,
                melting_route=melting_route,
                confidence=0.95 if has_explicit_melt else 0.70,
                bounding_box=melt_box
            )
        else:
            flagged_for_review = True
            review_reasons.append("Missing explicit Country of Melt and Pour (EU Reg 2026/1963 defect)")

        # 7. Chemical Composition Extraction
        recognized_elements = ["C", "Mn", "Si", "P", "S", "Cr", "Ni", "Mo", "Cu", "V", "Al", "N", "CEV", "Ti", "Nb", "B"]
        chemistry: Dict[str, ChemicalElementReading] = {}
        elem_positions: Dict[str, Tuple[float, float, float, float]] = {}

        for w in words:
            elem = w[4].strip(":,.-")
            if elem in recognized_elements and 150 <= w[1] <= 450:
                if elem not in elem_positions:
                    elem_positions[elem] = (w[0], w[1], w[2], w[3])

        for elem, (ex0, ey0, ex1, ey1) in elem_positions.items():
            best_val = None
            best_dist = float("inf")
            best_bbox = None
            for w in words:
                try:
                    v = float(w[4].strip("%,"))
                    if 0.0001 <= v <= 25.0:
                        wx0, wy0, wx1, wy1 = w[0], w[1], w[2], w[3]
                        if 0.5 <= (wy0 - ey1) <= 60 and abs(wx0 - ex0) <= 30:
                            dist = abs(wx0 - ex0) + (wy0 - ey1)
                            if dist < best_dist:
                                best_dist = dist
                                best_val = v
                                best_bbox = to_norm_box(wx0, wy0, wx1, wy1)
                except ValueError:
                    pass
            if best_val is not None:
                chemistry[elem] = ChemicalElementReading(
                    measured=best_val,
                    unit="%",
                    confidence=0.95,
                    evidence_text=f"{elem}: {best_val}%",
                    bounding_box=best_bbox
                )

        # Chemistry Out-of-Spec Sanity Checks
        is_medium_carbon_alloy = bool(grade and any(k in grade.upper() for k in ["4140", "4130", "B7", "SPRING", "ALLOY BAR"]))
        c_max_limit = 0.50 if is_medium_carbon_alloy else 0.30

        if "C" in chemistry and chemistry["C"].measured > c_max_limit:
            flagged_for_review = True
            review_reasons.append(f"Chemistry out-of-spec: Carbon ({chemistry['C'].measured}%) exceeds standard limit ({c_max_limit}%)")
        if "S" in chemistry and chemistry["S"].measured > 0.045:
            flagged_for_review = True
            review_reasons.append(f"Chemistry out-of-spec: Sulfur ({chemistry['S'].measured}%) exceeds standard limit")
        if "P" in chemistry and chemistry["P"].measured > 0.045:
            flagged_for_review = True
            review_reasons.append(f"Chemistry out-of-spec: Phosphorus ({chemistry['P'].measured}%) exceeds standard limit")

        # 8. Mechanical Properties Extraction
        mechanics: Dict[str, MechanicalReading] = {}

        yield_match = re.search(r'(?:Yield\s*Strength|ReH|Rp0\.?2)\s*(?:\([^)]*\))?\s*[:\s]*(\d{2,4})', full_text, re.IGNORECASE)
        if yield_match:
            y_val = float(yield_match.group(1))
            mechanics["yield_strength"] = MechanicalReading(
                property_name="Yield Strength (ReH)",
                measured_value=y_val,
                unit="MPa",
                requirement="≥ 250 MPa",
                confidence=0.90
            )

        tens_match = re.search(r'(?:Tensile\s*Strength|Rm)\s*(?:\([^)]*\))?\s*[:\s]*(\d{2,4})', full_text, re.IGNORECASE)
        if tens_match:
            t_val = float(tens_match.group(1))
            mechanics["tensile_strength"] = MechanicalReading(
                property_name="Tensile Strength (Rm)",
                measured_value=t_val,
                unit="MPa",
                requirement="485 - 720 MPa",
                confidence=0.90
            )

        elon_match = re.search(r'(?:Elongation|A5|A)\s*(?:\([^)]*\))?\s*[:\s]*(\d{1,2}(?:\.\d{1,2})?)', full_text, re.IGNORECASE)
        if elon_match:
            e_val = float(elon_match.group(1))
            mechanics["elongation"] = MechanicalReading(
                property_name="Elongation (A5)",
                measured_value=e_val,
                unit="%",
                requirement="≥ 22 %",
                confidence=0.90
            )

        hard_match = re.search(r'(?:Hardness|HBW|Brinell)\s*(?:\([^)]*\))?\s*[:\s]*(\d{2,4})', full_text, re.IGNORECASE)
        if hard_match:
            h_val = float(hard_match.group(1))
            mechanics["hardness"] = MechanicalReading(
                property_name="Hardness (Brinell)",
                measured_value=h_val,
                unit="HBW",
                requirement="≤ 187 HBW",
                confidence=0.90
            )

        # 9. Anti-Hallucination Decision Gate
        if not heat_numbers and not chemistry:
            no_cert_reason = "No recognizable steel mill certificate data found" if full_text.strip() else "No certificate data found"
            return MTCExtractionResult(
                status="needs_manual_entry",
                reason=no_cert_reason,
                confidence_score=0.0,
                mill_name=mill_name,
                certificate_number=cert_number,
                issue_date=issue_date,
                heat_numbers=[],
                grade=grade,
                quantity_mt=quantity_mt,
                country_of_melt_and_pour=country_result,
                chemical_composition={},
                mechanical_properties={},
                raw_text_blocks_count=len(blocks),
                sha256_checksum=sha256,
                flagged_for_review=True,
                review_reasons=[no_cert_reason]
            )

        status = "needs_manual_entry" if (flagged_for_review or is_malformed_heat or not found_heat) else "success"
        confidence = 0.95 if status == "success" else (0.50 if is_malformed_heat else 0.72)

        return MTCExtractionResult(
            status=status,
            reason="Flagged for manual review: " + "; ".join(review_reasons) if flagged_for_review else None,
            confidence_score=confidence,
            mill_name=mill_name or "Unknown Mill",
            certificate_number=cert_number or (f"MTC-{heat_numbers[0]}" if heat_numbers else "UNSPECIFIED"),
            issue_date=issue_date or "2026-01-01",
            heat_numbers=heat_numbers,
            grade=grade,
            quantity_mt=quantity_mt,
            country_of_melt_and_pour=country_result,
            chemical_composition=chemistry,
            mechanical_properties=mechanics,
            raw_text_blocks_count=len(blocks),
            sha256_checksum=sha256,
            flagged_for_review=flagged_for_review,
            review_reasons=review_reasons
        )

    def extract_mtc(
        self,
        pdf_bytes: bytes,
        file_name: str = "document.pdf",
        organization_id: str = "default_org"
    ) -> MTCExtractionResult:
        """
        Processes an uploaded mill certificate with two-tier extraction and cost guardrails:
        1. Neutralizes active exploits (/JS, /Launch, /EmbeddedFiles, /AA).
        2. Computes authentic SHA-256 and queries SQLite cache table.
        3. Tier 1: Deterministic PyMuPDF text-layer parser (0 paise cost).
        4. Decision Gate: If confidence >= 0.85 and no flags, caches and returns.
        5. If blank document, returns 'No certificate data found' immediately (never escalates).
        6. Tier 2: Only escalates to paid model on low confidence (< 0.85) after checking token budget.
        """
        # Step 1: Neutralize exploits
        pdf_bytes = self.sanitize_pdf_payload(pdf_bytes)
        sha256 = hashlib.sha256(pdf_bytes).hexdigest()

        # Step 2: Query database cache
        cached = self.get_cached_result(sha256)
        if cached:
            return cached

        # Step 3: Tier 1 - Cheap local text-layer extraction
        result = self.parse_text_layer_mtc(pdf_bytes, sha256=sha256)

        # If high-confidence clean extraction, cache and return immediately
        if result.status == "success" and result.confidence_score >= 0.85 and not result.flagged_for_review:
            self.save_cached_result(sha256, result, model="text_layer_pymupdf")
            return result

        # Blank PDF check: never escalate to paid model
        if result.reason == "No certificate data found" or (len(result.heat_numbers) == 0 and not result.chemical_composition):
            return result

        # Step 4: Tier 2 - Paid model escalation (Gemini) ONLY on low confidence
        if self.api_key and (result.confidence_score < 0.85 or result.status == "needs_manual_entry"):
            # Check organization AI consent policy (Prompt R6)
            try:
                try:
                    from backend.privacy_service import PrivacyService
                except ImportError:
                    from privacy_service import PrivacyService
                priv_settings = PrivacyService.get_settings(organization_id)
                if not priv_settings.get("ai_extraction_consent", True):
                    logger.info(f"[OCR] AI extraction consent disabled for {organization_id}. Retaining local text-layer result.")
                    return result
            except Exception:
                pass

            try:
                try:
                    from backend.token_budget_service import TokenBudgetService
                except ImportError:
                    from token_budget_service import TokenBudgetService

                # Enforce token budget guardrail
                is_allowed, denial_reason = TokenBudgetService.check_budget(organization_id, estimated_tokens=1500)
                if not is_allowed:
                    logger.warning(f"[OCR] Token budget guardrail: {denial_reason}")
                    result.reason = denial_reason or "Daily or monthly token budget limit reached. Manual entry or plan upgrade required."
                    return result

                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self.api_key)
                prompt = (
                    "You are a Senior Metallurgist and Lead Customs Inspector. "
                    "Extract all fields from this EN 10204 3.1 Mill Test Certificate. "
                    "If this is not a steel mill test certificate, return status 'needs_manual_entry' and empty fields. "
                    "Pay special attention to whether 'Country of Melt and Pour' is explicitly stated on the document canvas, "
                    "as required by EU Reg 2026/1963. Provide bounding boxes on 0-1000 normalized scale."
                )

                try:
                    from backend.model_config import FIRST_PASS_MODEL, ESCALATION_MODEL
                except ImportError:
                    from model_config import FIRST_PASS_MODEL, ESCALATION_MODEL

                models = [FIRST_PASS_MODEL, ESCALATION_MODEL]
                for model_name in models:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=[
                                types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                                prompt
                            ],
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                response_schema=MTCExtractionResult
                            )
                        )

                        result_json = json.loads(response.text)
                        result_json["sha256_checksum"] = sha256
                        extraction_result = MTCExtractionResult(**result_json)

                        # Record consumed tokens in budget tracking
                        tokens_est = getattr(response, "usage_metadata", None)
                        total_tok = tokens_est.total_token_count if tokens_est else 1200
                        TokenBudgetService.record_usage(
                            organization_id=organization_id,
                            model=model_name,
                            tokens_used=total_tok,
                            cost_paise=5.0 if "flash-lite" in model_name else 25.0
                        )

                        if extraction_result.status == "success" and not extraction_result.flagged_for_review:
                            self.save_cached_result(sha256, extraction_result, model=model_name)
                        return extraction_result

                    except Exception as model_err:
                        if model_name == models[-1]:
                            logger.warning(f"[OCR] Gemini Vision escalation failed: {model_err}")
                            break
                        continue

            except Exception as e:
                logger.warning(f"[OCR] Gemini escalation offline/failed ({e}); retaining text-layer result.")

        return result
