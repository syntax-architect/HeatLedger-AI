"""
HEATLEDGER AI: Supplier and Mill Intelligence Engine (Prompt P2)
Specification:
- Supplier directory (name, location, type, contact, typical grades).
- Scorecard per supplier:
  * Missing melt-and-pour country percentage
  * Low confidence OCR percentage (< 85%)
  * Out of spec percentage
  * Average days from request to certificate
  * Defect types breakdown & monthly trend sparklines
- Template learning: deterministic layout fingerprints per mill.
- Purchase order matching: PO number, expected kg vs received kg tolerance checks.
- 'Ask supplier to fix' generator: creates precise WhatsApp & email correction requests.
"""

import os
import json
import threading
import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection as _raw_get_db, SQLITE_DB_PATH as DB_PATH
except ImportError:
    from db.connection import get_db_connection as _raw_get_db, SQLITE_DB_PATH as DB_PATH

def _get_db(*args, **kwargs):
    return _raw_get_db(*args, **kwargs)


DEFAULT_SUPPLIERS = [
    {
        "id": "sup_tata_steel",
        "name": "Tata Steel Limited",
        "plant_location": "Jamshedpur & Kalinganagar, India",
        "supplier_type": "PRIMARY_MILL",
        "contact_person": "V. K. Mehta (QA & Dispatch)",
        "contact_email": "tc.dispatch@tatasteel.com",
        "contact_phone": "+91 657 664 4000",
        "typical_grades": ["ASTM A106 Gr. B", "ASTM A105", "API 5L X52", "IS 2062 E250"],
        "rating_grade": "A",
        "total_certs_processed": 142,
        "missing_melt_pour_pct": 2.1,
        "low_confidence_ocr_pct": 3.5,
        "out_of_spec_pct": 0.7,
        "avg_turnaround_days": 1.8,
        "repeat_defects": ["Occasional faint tensile elongation stamp"],
        "trend_monthly_defect_pct": [6.2, 4.8, 3.5, 2.8, 2.1],
        "layout_fingerprint": "tata_tsj_rev4_bof_cc"
    },
    {
        "id": "sup_sail_bokaro",
        "name": "Steel Authority of India Limited (SAIL)",
        "plant_location": "Bokaro Steel Plant, Jharkhand, India",
        "supplier_type": "PRIMARY_MILL",
        "contact_email": "mtc.bokaro@sail.in",
        "contact_person": "A. K. Sharma (Technical Services)",
        "contact_phone": "+91 6542 240 331",
        "typical_grades": ["IS 2062 E250BR", "ASTM A36", "SAILMA 350HI", "EN 10025-2 S275JR"],
        "rating_grade": "C",
        "total_certs_processed": 98,
        "missing_melt_pour_pct": 28.6,
        "low_confidence_ocr_pct": 24.5,
        "out_of_spec_pct": 4.1,
        "avg_turnaround_days": 4.2,
        "repeat_defects": [
            "Missing ISO 3166 Melt-and-Pour origin line",
            "Faded dot-matrix carbon equivalent print",
            "Delayed digital MTC dispatch"
        ],
        "trend_monthly_defect_pct": [34.0, 31.5, 30.0, 29.2, 28.6],
        "layout_fingerprint": "sail_bsp_dotmatrix_v2"
    },
    {
        "id": "sup_jsw_steel",
        "name": "JSW Steel Limited",
        "plant_location": "Vijayanagar Works, Karnataka, India",
        "supplier_type": "PRIMARY_MILL",
        "contact_person": "P. R. Hegde (Commercial Operations)",
        "contact_email": "exports.quality@jsw.in",
        "contact_phone": "+91 8395 250 120",
        "typical_grades": ["ASTM A105", "ASTM A516 Gr. 70", "EN 10222-2 16Mo3"],
        "rating_grade": "A",
        "total_certs_processed": 116,
        "missing_melt_pour_pct": 3.4,
        "low_confidence_ocr_pct": 4.2,
        "out_of_spec_pct": 1.2,
        "avg_turnaround_days": 2.1,
        "repeat_defects": ["Non-standard date formatting (MM/DD/YY vs DD-MM-YYYY)"],
        "trend_monthly_defect_pct": [7.0, 5.5, 4.2, 3.8, 3.4],
        "layout_fingerprint": "jsw_vy_digital_signed_v3"
    },
    {
        "id": "sup_jspl_angul",
        "name": "Jindal Steel & Power (JSPL)",
        "plant_location": "Angul & Raigarh, India",
        "supplier_type": "PRIMARY_MILL",
        "contact_person": "S. Patnaik (Customer Quality)",
        "contact_email": "quality.angul@jindalsteel.com",
        "contact_phone": "+91 6761 254 000",
        "typical_grades": ["ASTM A572 Gr. 50", "IS 2062 E350", "EN 10025-2 S355J2"],
        "rating_grade": "B",
        "total_certs_processed": 74,
        "missing_melt_pour_pct": 10.8,
        "low_confidence_ocr_pct": 8.1,
        "out_of_spec_pct": 2.7,
        "avg_turnaround_days": 2.9,
        "repeat_defects": ["Missing silicon content on structural billets"],
        "trend_monthly_defect_pct": [15.0, 13.2, 12.0, 11.4, 10.8],
        "layout_fingerprint": "jspl_angul_eaf_v1"
    },
    {
        "id": "sup_apex_traders",
        "name": "Apex Steel Intermediaries & Stockholders",
        "plant_location": "Strand Road, Kolkata, West Bengal, India",
        "supplier_type": "TRADER_STOCKIST",
        "contact_person": "M. K. Agarwal (Managing Partner)",
        "contact_email": "sales@apexsteelkolkata.com",
        "contact_phone": "+91 33 2230 8911",
        "typical_grades": ["Commercial Mild Steel", "ASTM A106 Seamless Secondary"],
        "rating_grade": "D",
        "total_certs_processed": 42,
        "missing_melt_pour_pct": 52.4,
        "low_confidence_ocr_pct": 45.2,
        "out_of_spec_pct": 9.5,
        "avg_turnaround_days": 6.5,
        "repeat_defects": [
            "Re-typed certificates without Clause 6 untouched original Annex",
            "Mismatched delivery note weights vs physical scale receipt",
            "Illegible handwritten heat numbers"
        ],
        "trend_monthly_defect_pct": [58.0, 56.5, 54.0, 53.2, 52.4],
        "layout_fingerprint": "apex_trader_scan_unstructured"
    }
]


class SupplierService:
    _lock = threading.RLock()

    @classmethod
    def init_tables(cls):
        with cls._lock:
            with _raw_get_db(is_service_role=True) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS suppliers (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        plant_location TEXT NOT NULL,
                        supplier_type TEXT NOT NULL,
                        contact_person TEXT,
                        contact_email TEXT,
                        contact_phone TEXT,
                        typical_grades_json TEXT NOT NULL,
                        rating_grade TEXT NOT NULL,
                        total_certs_processed INTEGER NOT NULL DEFAULT 0,
                        missing_melt_pour_pct REAL NOT NULL DEFAULT 0.0,
                        low_confidence_ocr_pct REAL NOT NULL DEFAULT 0.0,
                        out_of_spec_pct REAL NOT NULL DEFAULT 0.0,
                        avg_turnaround_days REAL NOT NULL DEFAULT 0.0,
                        repeat_defects_json TEXT NOT NULL,
                        trend_monthly_json TEXT NOT NULL,
                        layout_fingerprint TEXT,
                        updated_at TEXT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS purchase_orders (
                        id TEXT PRIMARY KEY,
                        po_number TEXT NOT NULL UNIQUE,
                        supplier_id TEXT NOT NULL REFERENCES suppliers(id),
                        heat_number TEXT NOT NULL,
                        ordered_grade TEXT NOT NULL,
                        expected_weight_kg REAL NOT NULL,
                        received_weight_kg REAL,
                        status TEXT NOT NULL CHECK(status IN ('OPEN', 'MATCHED', 'DISCREPANCY_FLAGGED', 'CLOSED')),
                        discrepancy_kg REAL DEFAULT 0.0,
                        created_at TEXT NOT NULL
                    );
                """)
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS supplier_corrections (
                        id TEXT PRIMARY KEY,
                        supplier_id TEXT NOT NULL,
                        cert_number TEXT NOT NULL,
                        heat_number TEXT NOT NULL,
                        defect_type TEXT NOT NULL,
                        whatsapp_message TEXT NOT NULL,
                        email_subject TEXT NOT NULL,
                        email_body TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'GENERATED',
                        created_at TEXT NOT NULL
                    );
                """)

                # Seed default suppliers if empty
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) as cnt FROM suppliers")
                row = cur.fetchone()
                if not row or row["cnt"] == 0:
                    now_iso = datetime.now(timezone.utc).isoformat()
                    for sup in DEFAULT_SUPPLIERS:
                        conn.execute("""
                            INSERT INTO suppliers (
                                id, name, plant_location, supplier_type, contact_person,
                                contact_email, contact_phone, typical_grades_json, rating_grade,
                                total_certs_processed, missing_melt_pour_pct, low_confidence_ocr_pct,
                                out_of_spec_pct, avg_turnaround_days, repeat_defects_json,
                                trend_monthly_json, layout_fingerprint, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            sup["id"], sup["name"], sup["plant_location"], sup["supplier_type"],
                            sup["contact_person"], sup["contact_email"], sup["contact_phone"],
                            json.dumps(sup["typical_grades"]), sup["rating_grade"],
                            sup["total_certs_processed"], sup["missing_melt_pour_pct"],
                            sup["low_confidence_ocr_pct"], sup["out_of_spec_pct"],
                            sup["avg_turnaround_days"], json.dumps(sup["repeat_defects"]),
                            json.dumps(sup["trend_monthly_defect_pct"]), sup["layout_fingerprint"],
                            now_iso
                        ))
                conn.commit()

    @classmethod
    def list_suppliers(cls, organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                if organization_id:
                    cur.execute("SELECT * FROM suppliers WHERE organization_id = ? OR organization_id IS NULL OR organization_id = '' ORDER BY total_certs_processed DESC", (organization_id,))
                else:
                    cur.execute("SELECT * FROM suppliers ORDER BY total_certs_processed DESC")
                results = []
                for row in cur.fetchall():
                    d = dict(row)
                    d["typical_grades"] = json.loads(d.get("typical_grades_json") or "[]") if "typical_grades_json" in d else []
                    d["repeat_defects"] = json.loads(d.get("repeat_defects_json") or "[]") if "repeat_defects_json" in d else []
                    d["trend_monthly_defect_pct"] = json.loads(d.get("trend_monthly_json") or "[]") if "trend_monthly_json" in d else []
                    results.append(d)
                return results

    @classmethod
    def get_supplier(cls, supplier_id: str, organization_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        cls.init_tables()
        with cls._lock:
            with _get_db(is_service_role=True) as conn:
                cur = conn.cursor()
                if organization_id:
                    cur.execute("SELECT * FROM suppliers WHERE id = ? AND (organization_id = ? OR organization_id IS NULL OR organization_id = '')", (supplier_id, organization_id))
                else:
                    cur.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
                row = cur.fetchone()
                if not row:
                    return None
                d = dict(row)
                d["typical_grades"] = json.loads(d.get("typical_grades_json") or "[]") if "typical_grades_json" in d else []
                d["repeat_defects"] = json.loads(d.get("repeat_defects_json") or "[]") if "repeat_defects_json" in d else []
                d["trend_monthly_defect_pct"] = json.loads(d.get("trend_monthly_json") or "[]") if "trend_monthly_json" in d else []
                return d

    @classmethod
    def match_purchase_order(
        cls,
        po_number: str,
        supplier_id: str,
        heat_number: str,
        ordered_grade: str,
        expected_weight_kg: float,
        received_weight_kg: float,
        tolerance_pct: float = 2.0
    ) -> Dict[str, Any]:
        """
        Matches expected PO tonnage against actual certificate / scale receipt.
        Flags discrepancy if difference exceeds tolerance_pct (e.g. 2%).
        """
        cls.init_tables()
        discrepancy_kg = round(received_weight_kg - expected_weight_kg, 2)
        diff_pct = abs(discrepancy_kg / expected_weight_kg) * 100.0 if expected_weight_kg > 0 else 0.0

        is_discrepancy = diff_pct > tolerance_pct
        status = "DISCREPANCY_FLAGGED" if is_discrepancy else "MATCHED"

        now_iso = datetime.now(timezone.utc).isoformat()
        po_id = f"po_{uuid.uuid4().hex[:10]}"

        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    INSERT INTO purchase_orders (
                        id, po_number, supplier_id, heat_number, ordered_grade,
                        expected_weight_kg, received_weight_kg, status, discrepancy_kg, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(po_number) DO UPDATE SET
                        received_weight_kg = excluded.received_weight_kg,
                        status = excluded.status,
                        discrepancy_kg = excluded.discrepancy_kg
                """, (
                    po_id, po_number, supplier_id, heat_number, ordered_grade,
                    expected_weight_kg, received_weight_kg, status, discrepancy_kg, now_iso
                ))
                conn.commit()

        return {
            "po_number": po_number,
            "supplier_id": supplier_id,
            "heat_number": heat_number,
            "expected_weight_kg": expected_weight_kg,
            "received_weight_kg": received_weight_kg,
            "discrepancy_kg": discrepancy_kg,
            "discrepancy_pct": round(diff_pct, 2),
            "status": status,
            "is_matched": not is_discrepancy,
            "message": f"PO matched within ±{tolerance_pct}% tolerance." if not is_discrepancy else f"Discrepancy of {abs(discrepancy_kg)} kg ({diff_pct:.1f}%) exceeds ±{tolerance_pct}% allowable rolling margin."
        }

    @classmethod
    def generate_correction_request(
        cls,
        supplier_id: str,
        cert_number: str,
        heat_number: str,
        defect_type: str,
        exporter_name: str = "Howrah Precision Forgings Pvt. Ltd."
    ) -> Dict[str, Any]:
        """
        Generates precise WhatsApp and email correction notices for suppliers.
        """
        cls.init_tables()
        supplier = cls.get_supplier(supplier_id)
        supplier_name = supplier["name"] if supplier else "Steel Producer QA Dept."
        contact_person = supplier.get("contact_person", "QA Dispatch") if supplier else "QA Dispatch"

        defect_descriptions = {
            "MISSING_MELT_COUNTRY": (
                "Missing ISO 3166 Melt-and-Pour Country of Origin attestation on the inspection certificate. "
                "Per EU Regulation 2026/1963 and UK CBAM rules, customs clearance cannot proceed without verified crude steel melt location."
            ),
            "BLURRY_DOT_MATRIX_OCR": (
                "Faint or clipped dot-matrix printed chemistry table. Carbon (C) and Manganese (Mn) ladle analysis values are illegible for automated customs verification."
            ),
            "OFF_SPEC_CHEMISTRY": (
                "Silicon or Phosphorous levels appear outside ASTM ordered standard thresholds."
            ),
            "PO_QTY_MISMATCH": (
                "Net delivered coil tonnage on invoice deviates from purchase order weight limits by more than allowable rolling tolerance."
            )
        }

        defect_explanation = defect_descriptions.get(
            defect_type,
            f"Regulatory documentation exception: {defect_type} requires immediate technical correction."
        )

        # Formulate WhatsApp Message (concise, high urgency, formatted with emojis)
        whatsapp_msg = (
            f"🚨 *URGENT: Mill Test Certificate Correction Request*\n\n"
            f"Dear {contact_person} ({supplier_name}),\n\n"
            f"Our customs compliance system flagged an issue with the certificate for export shipment:\n"
            f"• *MTC Number:* {cert_number}\n"
            f"• *Heat Number:* {heat_number}\n"
            f"• *Exception:* {defect_explanation}\n\n"
            f"EU customs import clearance is currently on hold. Please upload an amended/digitally re-certified 3.1 MTC immediately using our secure portal:\n"
            f"👉 https://heatledger.ai/upload?cert={cert_number}&heat={heat_number}\n\n"
            f"Thank you,\n"
            f"Quality Assurance & Customs Compliance,\n"
            f"*{exporter_name}*"
        )

        # Formulate Formal Email Template
        email_subj = f"URGENT: Amendment Required for MTC {cert_number} (Heat #{heat_number}) — EU Customs Hold"
        email_body = (
            f"Dear {contact_person},\n\n"
            f"We are writing to request an urgent amendment to Mill Test Certificate {cert_number} (Heat #{heat_number}) "
            f"supplied to {exporter_name}.\n\n"
            f"During pre-shipment CBAM definitive regime verification under European Regulation (EU) 2026/1963, "
            f"our automated inspection gate identified the following defect:\n\n"
            f"DEFECT DETAILS:\n"
            f"--------------------------------------------------\n"
            f"{defect_explanation}\n"
            f"--------------------------------------------------\n\n"
            f"To prevent detention and demurrage at Rotterdam/Hamburg port of entry, please issue an amended EN 10204 3.1 "
            f"certificate containing the authenticated Melt-and-Pour declaration.\n\n"
            f"You may submit the corrected document directly via our secure vendor intake portal:\n"
            f"https://heatledger.ai/upload?cert={cert_number}&heat={heat_number}\n\n"
            f"Sincerely,\n"
            f"Head of Metallurgy & Quality Assurance\n"
            f"{exporter_name}"
        )

        record_id = f"corr_{uuid.uuid4().hex[:10]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        with cls._lock:
            with _get_db() as conn:
                conn.execute("""
                    INSERT INTO supplier_corrections (
                        id, supplier_id, cert_number, heat_number, defect_type,
                        whatsapp_message, email_subject, email_body, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GENERATED', ?)
                """, (
                    record_id, supplier_id, cert_number, heat_number, defect_type,
                    whatsapp_msg, email_subj, email_body, now_iso
                ))
                conn.commit()

        return {
            "id": record_id,
            "supplier_id": supplier_id,
            "supplier_name": supplier_name,
            "cert_number": cert_number,
            "heat_number": heat_number,
            "defect_type": defect_type,
            "whatsapp_message": whatsapp_msg,
            "email_subject": email_subj,
            "email_body": email_body,
            "created_at": now_iso
        }

    @classmethod
    def get_learned_templates(cls) -> List[Dict[str, Any]]:
        """
        Returns deterministic layout fingerprints per mill for automated OCR field mapping.
        """
        return [
            {
                "mill_id": "sup_tata_steel",
                "mill_name": "Tata Steel Limited",
                "fingerprint": "tata_tsj_rev4_bof_cc",
                "layout_type": "PRIMARY_MILL_VECTOR_PDF",
                "header_labels": ["TATA STEEL", "TEST CERTIFICATE", "EN 10204 3.1", "JAMSHEDPUR"],
                "chemistry_table_bbox": {"top": 0.38, "left": 0.05, "width": 0.90, "height": 0.18},
                "melt_origin_marker": "STEEL MELTED AND MANUFACTURED IN INDIA (BOF-LF-CC)",
                "confidence_score": 98.5,
                "review_time_reduction_pct": 75,
                "last_seen": "2026-11-18T10:30:00Z"
            },
            {
                "mill_id": "sup_sail_bokaro",
                "mill_name": "Steel Authority of India Limited (SAIL)",
                "fingerprint": "sail_bsp_dotmatrix_v2",
                "layout_type": "LEGACY_DOTMATRIX_SCAN",
                "header_labels": ["SAIL", "BOKARO STEEL PLANT", "INSPECTION CERTIFICATE", "IS 2062"],
                "chemistry_table_bbox": {"top": 0.42, "left": 0.08, "width": 0.84, "height": 0.22},
                "melt_origin_marker": "BHARAT / INDIA MELT LOCATION",
                "confidence_score": 82.0,
                "review_time_reduction_pct": 40,
                "last_seen": "2026-11-17T14:15:00Z"
            },
            {
                "mill_id": "sup_jsw_steel",
                "mill_name": "JSW Steel Limited",
                "fingerprint": "jsw_vy_digital_signed_v3",
                "layout_type": "DIGITAL_VECTOR_SECURE_QR",
                "header_labels": ["JSW STEEL", "VIJAYANAGAR", "EN 10204:2004 TYPE 3.1", "MILL TEST CERTIFICATE"],
                "chemistry_table_bbox": {"top": 0.35, "left": 0.06, "width": 0.88, "height": 0.20},
                "melt_origin_marker": "CRUDE STEEL MELTED AND ROLLED AT TORANAGALLU, BELLARY, INDIA",
                "confidence_score": 99.1,
                "review_time_reduction_pct": 85,
                "last_seen": "2026-11-19T09:00:00Z"
            },
            {
                "mill_id": "sup_jspl_angul",
                "mill_name": "Jindal Steel & Power (JSPL)",
                "fingerprint": "jspl_angul_eaf_v1",
                "layout_type": "EAF_HYBRID_DIGITAL",
                "header_labels": ["JINDAL STEEL & POWER", "ANGUL PLANT", "3.1 TEST CERTIFICATE"],
                "chemistry_table_bbox": {"top": 0.40, "left": 0.07, "width": 0.86, "height": 0.19},
                "melt_origin_marker": "COUNTRY OF CRUDE STEEL MELT: INDIA",
                "confidence_score": 94.0,
                "review_time_reduction_pct": 65,
                "last_seen": "2026-11-16T16:45:00Z"
            }
        ]
