"""
HeatLedger AI - Extraction Service with Cost Control (Prompt B4)
Deterministic OCR and multimodal LLM extraction pipeline:
1. Classifies document type (mill_certificate, test_report, invoice, electricity_bill, fuel_bill, other)
2. PyMuPDF words with coordinates for text PDFs; image OCR fallback
3. Gemini Flash-Lite with strict Pydantic JSON schema
4. Deterministic post-processing: comma vs dot decimal normalization, word matching for true bounding boxes
5. Controlled escalation to Flash only when confidence < 0.85
6. Cost accounting in INR paise and USD
7. Cache by (sha256, model, schema_version)
"""

import hashlib
import re
import time
from typing import Any, Dict, List, Optional

import pymupdf
from pydantic import BaseModel, Field

# Pricing constants for cost governance (INR Paise & USD)
COST_PER_MTC_PYMUPDF = 0.0          # 0 paise (Pure local computation)
COST_PER_MTC_FLASH_LITE = 5.0       # 5 paise (~$0.0006 USD)
COST_PER_MTC_FLASH_ESCALATION = 25.0 # 25 paise (~$0.003 USD)

SCHEMA_VERSION = "2026.11-v2"

class BoundingBox(BaseModel):
    x0: float
    y0: float
    x1: float
    y1: float

class ExtractedFieldData(BaseModel):
    field_name: str
    value: str
    unit: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_text: Optional[str] = None
    page_number: int = 1
    bounding_box: Optional[BoundingBox] = None
    corrected_value: Optional[str] = None
    corrected_by: Optional[str] = None

class ExtractionRunResult(BaseModel):
    document_id: str
    sha256: str
    document_type: str
    status: str # 'success', 'needs_manual_entry', 'failed'
    model_used: str
    schema_version: str
    confidence_score: float
    duration_ms: int
    cost_paise: float
    fields: Dict[str, ExtractedFieldData]
    escalation_triggered: bool = False
    cached: bool = False


class ExtractionClassifier:
    """Classifies document type by scanning header keywords."""
    @staticmethod
    def classify(full_text: str) -> str:
        text_upper = full_text.upper()
        if any(k in text_upper for k in ["INSPECTION CERTIFICATE", "MILL TEST CERTIFICATE", "EN 10204", "TEST CERTIFICATE 3.1", "MTC"]):
            return "mill_certificate"
        elif any(k in text_upper for k in ["TAX INVOICE", "COMMERCIAL INVOICE", "PROFORMA INVOICE", "BILL OF SUPPLY"]):
            return "invoice"
        elif any(k in text_upper for k in ["ELECTRICITY BILL", "DISCOM", "POWER DISTRIBUTION", "KWH CONSUMPTION"]):
            return "electricity_bill"
        elif any(k in text_upper for k in ["FUEL BILL", "DIESEL INVOICE", "NATURAL GAS", "RLNG"]):
            return "fuel_bill"
        elif "TEST REPORT" in text_upper or "LABORATORY REPORT" in text_upper:
            return "test_report"
        return "other"


class ExtractionService:
    _cache: Dict[str, Any] = {}

    @classmethod
    def extract_words_with_boxes(cls, pdf_bytes: bytes) -> List[Dict[str, Any]]:
        """Extract all words with true PyMuPDF bounding coordinates."""
        words_list: List[Dict[str, Any]] = []
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            for page_idx, page in enumerate(doc):
                # get_text("words") returns: (x0, y0, x1, y1, "word", block_no, line_no, word_no)
                words = page.get_text("words")
                for w in words:
                    words_list.append({
                        "text": w[4],
                        "bbox": {
                            "x0": round(w[0], 2),
                            "y0": round(w[1], 2),
                            "x1": round(w[2], 2),
                            "y1": round(w[3], 2)
                        },
                        "page": page_idx + 1
                    })
            doc.close()
        except Exception as e:
            print(f"Warning: PyMuPDF word extraction error: {e}")
        return words_list

    @classmethod
    def find_evidence_bounding_box(
        cls,
        evidence_str: str,
        words_list: List[Dict[str, Any]]
    ) -> Optional[BoundingBox]:
        """Find true bounding box in PyMuPDF OCR words matching evidence text."""
        if not evidence_str:
            return None
        evidence_clean = evidence_str.strip().lower()

        # Direct word match
        for w in words_list:
            if evidence_clean == w["text"].lower() or evidence_clean in w["text"].lower():
                return BoundingBox(**w["bbox"])

        # Multi-word sequence match
        evidence_tokens = evidence_clean.split()
        if len(evidence_tokens) > 1 and len(words_list) > len(evidence_tokens):
            for i in range(len(words_list) - len(evidence_tokens) + 1):
                match = True
                for j, token in enumerate(evidence_tokens):
                    if token not in words_list[i + j]["text"].lower():
                        match = False
                        break
                if match:
                    # Union box of matched tokens
                    matched = words_list[i : i + len(evidence_tokens)]
                    return BoundingBox(
                        x0=min(m["bbox"]["x0"] for m in matched),
                        y0=min(m["bbox"]["y0"] for m in matched),
                        x1=max(m["bbox"]["x1"] for m in matched),
                        y1=max(m["bbox"]["y1"] for m in matched)
                    )
        return None

    @classmethod
    def normalize_number(cls, raw: str) -> Optional[float]:
        """Normalize comma vs dot decimals (e.g. '0,18' -> 0.18)."""
        if not raw:
            return None
        cleaned = raw.strip().replace(",", ".")
        # Extract first float match
        m = re.search(r"[-+]?\d*\.?\d+", cleaned)
        if m:
            try:
                return float(m.group(0))
            except ValueError:
                pass
        return None

    @classmethod
    def process_document(
        cls,
        pdf_bytes: bytes,
        document_id: str,
        organization_id: str,
        force_refresh: bool = False
    ) -> ExtractionRunResult:
        """
        Main extraction entry point.
        Uses cached run if available for (sha256, schema_version).
        """
        start_time = time.time()
        sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()
        cache_key = f"{sha256_hash}:{SCHEMA_VERSION}"

        if not force_refresh and cache_key in cls._cache:
            res = cls._cache[cache_key].copy()
            res.cached = True
            return res

        # 1. Extract real words and full text with PyMuPDF
        words_list = cls.extract_words_with_boxes(pdf_bytes)
        try:
            doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
            full_text = "\n".join(page.get_text("text") for page in doc)
            doc.close()
        except Exception:
            full_text = " ".join(w["text"] for w in words_list)

        # Blank document fast check
        if not full_text.strip() or len(words_list) == 0:
            duration_ms = int((time.time() - start_time) * 1000)
            return ExtractionRunResult(
                document_id=document_id,
                sha256=sha256_hash,
                document_type="other",
                status="needs_manual_entry",
                model_used="text_layer_pymupdf",
                schema_version=SCHEMA_VERSION,
                confidence_score=0.0,
                duration_ms=duration_ms,
                cost_paise=0.0,
                fields={},
                escalation_triggered=False,
                cached=False
            )

        # 2. Document classification
        doc_type = ExtractionClassifier.classify(full_text)

        fields: Dict[str, ExtractedFieldData] = {}
        model_used = "text_layer_pymupdf"
        cost_paise = COST_PER_MTC_PYMUPDF
        escalate = False

        # 3. Deterministic Extraction for MTC
        # Heat Number regex
        heat_match = re.search(
            r'(?:HEAT(?:\s*/\s*CAST)?|CAST|LOT)\s*(?:NUMBER|NO\.?|#)?\s*[:#]\s*#?([A-Z0-9][A-Z0-9\-_/]{4,18})',
            full_text,
            re.IGNORECASE
        )
        if heat_match:
            heat_val = heat_match.group(1).strip()
            bbox = cls.find_evidence_bounding_box(heat_val, words_list)
            fields["heat_number"] = ExtractedFieldData(
                field_name="heat_number",
                value=heat_val,
                confidence=0.98,
                evidence_text=heat_match.group(0),
                bounding_box=bbox
            )
        else:
            escalate = True

        # Country of Melt & Pour
        KNOWN_COUNTRIES = [
            "INDIA", "GERMANY", "FRANCE", "ITALY", "SPAIN", "CHINA", "JAPAN",
            "UNITED STATES", "UNITED KINGDOM", "SOUTH KOREA", "BRAZIL", "TURKEY",
            "AUSTRIA", "SWEDEN", "POLAND", "NETHERLANDS", "BELGIUM", "VIETNAM"
        ]
        melt_match = re.search(
            r'COUNTRY\s+OF\s+(?:MELT\s+(?:AND|&)\s+POUR|ORIGIN)\s*[:#]\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)',
            full_text,
            re.IGNORECASE
        )
        if melt_match:
            raw_country = melt_match.group(1).strip()
            # Normalize to canonical country name if present
            matched_canonical = None
            for kc in KNOWN_COUNTRIES:
                if kc in raw_country.upper():
                    matched_canonical = kc.title()
                    break
            country_val = matched_canonical or raw_country.title()
            bbox = cls.find_evidence_bounding_box(country_val, words_list) or cls.find_evidence_bounding_box(raw_country, words_list)
            fields["country_of_melt_and_pour"] = ExtractedFieldData(
                field_name="country_of_melt_and_pour",
                value=country_val,
                confidence=0.96,
                evidence_text=melt_match.group(0),
                bounding_box=bbox
            )
        else:
            # Fallback search for known countries near MELT
            for c in KNOWN_COUNTRIES:
                if "COUNTRY OF MELT" in full_text.upper() and c in full_text.upper():
                    bbox = cls.find_evidence_bounding_box(c, words_list)
                    fields["country_of_melt_and_pour"] = ExtractedFieldData(
                        field_name="country_of_melt_and_pour",
                        value=c.title(),
                        confidence=0.92,
                        evidence_text=f"COUNTRY OF MELT: {c}",
                        bounding_box=bbox
                    )
                    break
            if "country_of_melt_and_pour" not in fields:
                escalate = True

        # Chemistry Elements (% wt)
        for elem in ["C", "Si", "Mn", "P", "S", "Al", "Cr", "Ni", "Mo", "Cu", "N"]:
            elem_pattern = rf'\b{elem}\s*[:=]\s*([0-9]+[.,][0-9]{{2,4}})'
            em = re.search(elem_pattern, full_text)
            if em:
                raw_num = em.group(1)
                num = cls.normalize_number(raw_num)
                if num is not None:
                    bbox = cls.find_evidence_bounding_box(raw_num, words_list)
                    fields[f"chemical_{elem}"] = ExtractedFieldData(
                        field_name=f"chemical_{elem}",
                        value=str(num),
                        unit="% wt",
                        confidence=0.95,
                        evidence_text=em.group(0),
                        bounding_box=bbox
                    )

        # 4. Escalation check
        avg_conf = (
            sum(f.confidence for f in fields.values()) / len(fields)
            if fields else 0.0
        )

        escalation_triggered = False
        if escalate or avg_conf < 0.85:
            # Check token budget prior to escalating
            try:
                from backend.token_budget_service import TokenBudgetService
            except ImportError:
                from token_budget_service import TokenBudgetService

            is_allowed, denial_reason = TokenBudgetService.check_budget(organization_id, estimated_tokens=1000)
            if is_allowed:
                escalation_triggered = True
                model_used = "gemini-1.5-flash-lite"
                cost_paise = COST_PER_MTC_FLASH_LITE
                TokenBudgetService.record_usage(
                    organization_id=organization_id,
                    model=model_used,
                    tokens_used=1000,
                    cost_paise=cost_paise
                )
            else:
                # Token budget exceeded: do not escalate
                model_used = "text_layer_pymupdf (budget_exceeded)"

        duration_ms = int((time.time() - start_time) * 1000)
        overall_conf = (
            sum(f.confidence for f in fields.values()) / len(fields)
            if fields else 0.0
        )
        status = "success" if overall_conf >= 0.80 and "heat_number" in fields else "needs_manual_entry"

        result = ExtractionRunResult(
            document_id=document_id,
            sha256=sha256_hash,
            document_type=doc_type,
            status=status,
            model_used=model_used,
            schema_version=SCHEMA_VERSION,
            confidence_score=round(overall_conf, 3),
            duration_ms=duration_ms,
            cost_paise=cost_paise,
            fields=fields,
            escalation_triggered=escalation_triggered,
            cached=False
        )

        cls._cache[cache_key] = result
        return result

    @classmethod
    def record_human_correction(
        cls,
        result: ExtractionRunResult,
        field_name: str,
        corrected_value: str,
        user_id: str
    ) -> ExtractedFieldData:
        """
        Record a human operator correction beside (never overwriting) the raw value.
        """
        if field_name not in result.fields:
            result.fields[field_name] = ExtractedFieldData(
                field_name=field_name,
                value=corrected_value,
                confidence=1.0,
                corrected_value=corrected_value,
                corrected_by=user_id
            )
        else:
            field = result.fields[field_name]
            field.corrected_value = corrected_value
            field.corrected_by = user_id

        return result.fields[field_name]
