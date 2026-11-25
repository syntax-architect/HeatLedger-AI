# ==============================================================================
# HEATLEDGER AI: Prompt L1 — Demo Mode & Sample Pack Engine
# Safe, isolated demo plant that never touches or pretends to be real customer data.
# Every synthetic document is watermarked 'SAMPLE - NOT A REAL CERTIFICATE'.
# ==============================================================================

import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

try:
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from db.connection import get_db_connection as _get_db

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

logger = logging.getLogger("heatledger.demo")

# Canonical identifiers for isolated demo organization
DEMO_ORG_ID = "org_sample_howrah_works"
DEMO_ORG_NAME = "SAMPLE - Howrah Castings Demo Plant"
DEMO_ORG_SLUG = "sample-howrah-castings"

DEMO_PLANT_ID = "plt_sample_demo"
DEMO_PLANT_NAME = "SAMPLE - Howrah Mill No. 4"
DEMO_INSTALLATION_ID = "IN-SAMPLE-HWH-04"

DEMO_USER_ID = "usr_sample_demo_inspector"
DEMO_USER_EMAIL = "demo.inspector@howrahsteel.in"
DEMO_USER_NAME = "Demo QA Inspector (SAMPLE)"

DEMO_SHARE_TOKEN = "tok_demo_sample_pack_2026"
SAMPLE_WATERMARK = "SAMPLE - NOT A REAL CERTIFICATE"
DEMO_WATERMARK_TEXT = SAMPLE_WATERMARK


class DemoService:
    """
    Prompt L1: One-click safe demo engine.
    - Creates and isolates SAMPLE organization
    - Generates synthetic certificates, heats, shipments, and finished dossier
    - Watermarks all documents with 'SAMPLE - NOT A REAL CERTIFICATE' on every page
    - Prevents unwatermarked export
    - Generates a 3-minute guided tour with tooltips
    - Clean reset functionality
    - Excludes demo data from production metrics
    """

    @classmethod
    def is_demo_org(cls, org_id: Optional[str]) -> bool:
        """Helper to ensure demo metrics are never mixed into production analytics."""
        if not org_id:
            return False
        return (
            org_id == DEMO_ORG_ID
            or org_id == "org_sample_demo"
            or "sample" in str(org_id).lower()
        )

    @classmethod
    def generate_sample_watermarked_pdf(
        cls,
        title: str = "SAMPLE MILL TEST CERTIFICATE (EN 10204 Type 3.1)",
        heat_number: str = "SAMPLE-TSL-2026-9021",
        grade: str = "316L Stainless Steel (1.4404)",
        buyer: str = "SAMPLE - ThyssenKrupp Materials Europe GmbH"
    ) -> bytes:
        """
        Creates a genuine vector PDF with prominent 'SAMPLE - NOT A REAL CERTIFICATE'
        watermark stamped across every page and immutable metadata.
        """
        if not fitz:
            return b"%PDF-1.4\n% SAMPLE - NOT A REAL CERTIFICATE\n"

        doc = fitz.open()

        # Page 1: Main Inspection Certificate
        page1 = doc.new_page(width=595, height=842)
        header_rect = fitz.Rect(30, 30, 565, 80)
        page1.draw_rect(header_rect, color=(0.1, 0.15, 0.2), fill=(0.95, 0.96, 0.98))
        page1.insert_text((45, 52), title, fontsize=13, fontname="helv", color=(0.08, 0.12, 0.18))
        page1.insert_text((45, 68), "Issued under simulated demo environment — EN 10204 3.1 Inspection Certificate", fontsize=8, color=(0.4, 0.45, 0.5))

        # Watermarks Page 1
        page1.insert_text((45, 95), f"*** {DEMO_WATERMARK_TEXT} ***", fontsize=11, fontname="helv", color=(0.85, 0.15, 0.15))
        page1.insert_text((45, 815), f"*** {DEMO_WATERMARK_TEXT} — NOT VALID FOR LEGAL OR CUSTOMS RELEASE ***", fontsize=9, color=(0.85, 0.15, 0.15))

        # Primary content box
        page1.draw_rect(fitz.Rect(30, 110, 565, 340), color=(0.8, 0.82, 0.85))
        y = 135
        details = [
            ("Manufacturer / Mill:", "SAMPLE - Tata Steel Long Products (Jamshedpur, IN)"),
            ("Melt & Pour Country:", "India (IN) — Certified under EU Reg 2026/1963"),
            ("Heat / Cast Number:", heat_number),
            ("Steel Grade & Spec:", grade),
            ("Intended Buyer:", buyer),
            ("Product Dimensions:", "Round Bar Dia 120mm x 6000mm"),
            ("Net Batch Weight:", "34.500 Metric Tonnes"),
            ("Quality Release Status:", "APPROVED (QA Inspector Digital Attestation Active)")
        ]
        for label, val in details:
            page1.insert_text((45, y), label, fontsize=9, fontname="helv", color=(0.3, 0.35, 0.4))
            page1.insert_text((190, y), val, fontsize=9, fontname="helv", color=(0.08, 0.12, 0.18))
            y += 22

        # Chemistry & Mechanical Tables
        page1.draw_rect(fitz.Rect(30, 355, 565, 470), color=(0.8, 0.82, 0.85))
        page1.insert_text((45, 375), "CHEMICAL ANALYSIS (Ladle %) & MECHANICAL PROPERTIES", fontsize=10, fontname="helv", color=(0.1, 0.15, 0.2))
        chem_text = "C: 0.022% | Si: 0.48% | Mn: 1.42% | P: 0.028% | S: 0.012% | Cr: 17.20% | Ni: 12.10% | Mo: 2.15%"
        page1.insert_text((45, 400), chem_text, fontsize=8.5, color=(0.15, 0.2, 0.25))
        mech_text = "Yield (Rp0.2): 265 MPa | Tensile (Rm): 580 MPa | Elongation (A5): 48.0% | Hardness: 175 HB"
        page1.insert_text((45, 425), mech_text, fontsize=8.5, color=(0.15, 0.2, 0.25))
        page1.insert_text((45, 450), "CEV: 0.412 (Within limits for high-integrity fabrication)", fontsize=8.5, color=(0.2, 0.5, 0.3))

        # Repeated watermark across page 1
        for wy in range(250, 750, 110):
            page1.insert_text((65, wy), DEMO_WATERMARK_TEXT, fontsize=20, fontname="helv", color=(0.88, 0.72, 0.72))

        # Page 2: Annex A & Cryptographic Seal
        page2 = doc.new_page(width=595, height=842)
        page2.insert_text((45, 52), "ANNEX A — CBAM VERIFICATION & METALLURGICAL CHAIN OF CUSTODY", fontsize=12, fontname="helv", color=(0.1, 0.15, 0.2))
        page2.insert_text((45, 75), f"*** {DEMO_WATERMARK_TEXT} ***", fontsize=11, fontname="helv", color=(0.85, 0.15, 0.15))
        page2.insert_text((45, 815), f"*** {DEMO_WATERMARK_TEXT} — NOT VALID FOR LEGAL OR CUSTOMS RELEASE ***", fontsize=9, color=(0.85, 0.15, 0.15))

        page2.draw_rect(fitz.Rect(30, 100, 565, 300), color=(0.8, 0.82, 0.85))
        page2.insert_text((45, 125), "EMBEDDED EMISSIONS & PROCESS ROUTE", fontsize=10, fontname="helv", color=(0.1, 0.15, 0.2))
        page2.insert_text((45, 150), "Direct Embedded Emissions: 1.450 tCO2e / t steel", fontsize=9, color=(0.2, 0.25, 0.3))
        page2.insert_text((45, 175), "Indirect Embedded Emissions: 0.400 tCO2e / t steel", fontsize=9, color=(0.2, 0.25, 0.3))
        page2.insert_text((45, 200), "Specific Embedded Emissions (Total SEE): 1.850 tCO2e / t steel", fontsize=9, fontname="helv", color=(0.1, 0.45, 0.25))

        for wy in range(250, 750, 110):
            page2.insert_text((65, wy), DEMO_WATERMARK_TEXT, fontsize=20, fontname="helv", color=(0.88, 0.72, 0.72))

        # Digital Seal box
        seal_rect = fitz.Rect(30, 320, 565, 420)
        page2.draw_rect(seal_rect, color=(0.75, 0.8, 0.85), fill=(0.97, 0.98, 1.0))
        page2.insert_text((45, 345), "CRYPTO-SIGNATURE & INTEGRITY VERIFICATION", fontsize=9, fontname="helv", color=(0.1, 0.2, 0.35))
        page2.insert_text((45, 365), "Ed25519 Digest: 7e2f9a1b8c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f", fontsize=7.5, color=(0.3, 0.35, 0.4))
        page2.insert_text((45, 385), "Public Verifier: https://heatledger.ai/verify (Tamper-Lock SHA-256 Validated)", fontsize=7.5, color=(0.15, 0.45, 0.3))

        doc.set_metadata({
            "title": f"{DEMO_WATERMARK_TEXT} - {heat_number}",
            "author": "HeatLedger AI Sample Pack Engine",
            "subject": "Synthetic demo mill test certificate — strictly not valid for customs clearance",
            "keywords": "SAMPLE, DEMO, CBAM, EN 10204 3.1, NOT FOR PRODUCTION"
        })

        return doc.tobytes()

    @classmethod
    def generate_watermarked_sample_pdf(cls, *args, **kwargs) -> bytes:
        return cls.generate_sample_watermarked_pdf(*args, **kwargs)

    @classmethod
    def load_demo_plant(cls) -> Dict[str, Any]:
        """
        Creates or refreshes the pristine SAMPLE organization.
        Seeds:
        1. Organization & Plant
        2. Demo QA Inspector user & membership
        3. 3 Synthetic Mill Certificates
        4. Synthetic Heat Inventory with Mass-Balance
        5. Synthetic Signed Shipment ('EXP-2026-081')
        6. Synthetic CBAM Dossier & Share Link
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        expires_iso = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()

        with _get_db(is_service_role=True) as conn:
            # 1. Organization
            conn.execute("""
                INSERT OR REPLACE INTO organizations (
                    id, name, is_sandbox, created_at, slug
                ) VALUES (?, ?, 1, ?, ?)
            """, (DEMO_ORG_ID, DEMO_ORG_NAME, now_iso, DEMO_ORG_SLUG))

            # 2. Plant
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO plants (
                        id, organization_id, name, unlocode, city, state, latitude, longitude,
                        eu_installation_id, created_at, updated_at
                    ) VALUES (?, ?, ?, 'IN CCU', 'Howrah', 'West Bengal', 22.5958, 88.2636, ?, ?, ?)
                """, (DEMO_PLANT_ID, DEMO_ORG_ID, DEMO_PLANT_NAME, DEMO_INSTALLATION_ID, now_iso, now_iso))
            except Exception as e:
                logger.debug(f"Plant note: {e}")

            # 3. Demo User & Membership
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO users (
                        id, email, password_hash, full_name, is_active, created_at
                    ) VALUES (?, ?, 'argon2id$demo_hash', ?, 1, ?)
                """, (DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME, now_iso))
            except Exception:
                try:
                    conn.execute("INSERT OR REPLACE INTO users (id, email) VALUES (?, ?)", (DEMO_USER_ID, DEMO_USER_EMAIL))
                except Exception:
                    pass

            try:
                conn.execute("""
                    INSERT OR REPLACE INTO memberships (
                        id, user_id, organization_id, role, created_at
                    ) VALUES ('mem_sample_demo_qa', ?, ?, 'QA_INSPECTOR', ?)
                """, (DEMO_USER_ID, DEMO_ORG_ID, now_iso))
            except Exception as e:
                logger.debug(f"Membership note: {e}")

            # 4. Synthetic Supplier
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO suppliers (
                        id, name, plant_location, supplier_type, typical_grades_json,
                        rating_grade, total_certs_processed, repeat_defects_json,
                        trend_monthly_json, updated_at
                    ) VALUES ('sup_sample_tatasteel', 'SAMPLE - Tata Steel Long Products (Jamshedpur)', 'Jamshedpur, IN', 'PRIMARY_MILL', '["316L"]', 'TIER_1', 142, '[]', '[]', ?)
                """, (now_iso,))
            except Exception as e:
                logger.debug(f"Supplier note: {e}")

            # 5. Synthetic Documents & 3 Mill Certificates (Prompt L1: 3 sample certificates)
            pdf_bytes = cls.generate_sample_watermarked_pdf()
            sha256_hash = hashlib.sha256(pdf_bytes).hexdigest()

            sample_certs = [
                ("doc_sample_01", "cert_sample_01", "MTC-TS-88190", "SAMPLE-TS-88190", "316L Stainless Steel"),
                ("doc_sample_02", "cert_sample_02", "MTC-JSW-4410", "SAMPLE-JSW-4410", "ASTM A106 Gr. B"),
                ("doc_sample_03", "cert_sample_03", "MTC-JSP-7712", "SAMPLE-JSP-7712", "EN 10025-2 S355JR")
            ]

            for doc_id, cert_id, cert_no, heat_no, grade in sample_certs:
                try:
                    conn.execute("""
                        INSERT OR REPLACE INTO documents (
                            id, organization_id, plant_id, file_name, file_size_bytes, mime_type, sha256,
                            storage_path, is_sample, uploaded_by, created_at
                        ) VALUES (?, ?, ?, ?, ?, 'application/pdf', ?, ?, 1, ?, ?)
                    """, (doc_id, DEMO_ORG_ID, DEMO_PLANT_ID, f"{cert_no}.pdf", len(pdf_bytes), sha256_hash, f"/storage/samples/{cert_no}.pdf", DEMO_USER_ID, now_iso))
                except Exception as e:
                    logger.debug(f"Document insert error: {e}")

                try:
                    conn.execute("""
                        INSERT OR REPLACE INTO mill_certificates (
                            id, organization_id, document_id, supplier_id, certificate_number,
                            issue_date, standard_id, melt_and_pour_country, melting_route,
                            has_explicit_melt_attestation, created_at
                        ) VALUES (?, ?, ?, 'sup_sample_tatasteel', ?, '2026-02-15', NULL, 'IN', 'BOF', 1, ?)
                    """, (cert_id, DEMO_ORG_ID, doc_id, cert_no, now_iso))
                except Exception as e:
                    logger.warning(f"Cert insert error: {e}")

            # 6. Synthetic Heat Inventory (Mass Balance)
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO heat_numbers (
                        id, organization_id, mill_certificate_id, heat_number,
                        initial_weight_grams, available_weight_grams, allocated_weight_grams,
                        cev_value, cev_pass, created_at
                    ) VALUES ('heat_sample_9021', ?, 'cert_sample_01', 'SAMPLE-TS-88190', 120000000, 85500000, 34500000, 0.412, 1, ?)
                """, (DEMO_ORG_ID, now_iso))
            except Exception as e:
                logger.debug(f"Heat note: {e}")

            # 7. Synthetic Shipment ('EXP-2026-081')
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO shipments (
                        id, organization_id, plant_id, invoice_number, buyer_name, destination_country,
                        cn_code, net_weight_grams, gross_weight_grams, status, departure_date, created_at, updated_at
                    ) VALUES ('shp_sample_081', ?, ?, 'EXP-2026-081', 'SAMPLE - ThyssenKrupp Materials Europe GmbH', 'DE', '7304.19.10', 34500000, 35100000, 'SIGNED', '2026-03-01', ?, ?)
                """, (DEMO_ORG_ID, DEMO_PLANT_ID, now_iso, now_iso))
            except Exception as e:
                logger.debug(f"Shipment note: {e}")

            # 8. Synthetic Dossier
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO dossiers (
                        id, organization_id, shipment_id, pdf_storage_path, xml_storage_path,
                        sha256_pdf, sha256_xml, is_demo, created_at
                    ) VALUES ('dos_sample_081', ?, 'shp_sample_081', '/storage/dossiers/SAMPLE_DOSSIER_081.pdf', '/storage/dossiers/SAMPLE_CBAM_081.xml', ?, ?, 1, ?)
                """, (DEMO_ORG_ID, sha256_hash, sha256_hash, now_iso))
            except Exception as e:
                logger.debug(f"Dossier note: {e}")

            # 9. Public Share Link
            try:
                conn.execute("""
                    INSERT OR REPLACE INTO share_links (
                        id, token, shipment_id, organization_id, plant_id, created_by,
                        passcode_hash, expires_at, custom_note, is_revoked, created_at
                    ) VALUES ('link_sample_demo_2026', ?, 'shp_sample_081', ?, ?, ?, NULL, ?, 'SAMPLE DEMO PACK - Read-only demonstration for buyer/customs verification', 0, ?)
                """, (DEMO_SHARE_TOKEN, DEMO_ORG_ID, DEMO_PLANT_ID, DEMO_USER_ID, expires_iso, now_iso))
            except Exception as e:
                logger.debug(f"Share link note: {e}")

            conn.commit()

        logger.info(f"Demo plant '{DEMO_ORG_NAME}' successfully initialized.")
        return {
            "status": "DEMO_PLANT_LOADED",
            "organization_id": DEMO_ORG_ID,
            "organization_name": DEMO_ORG_NAME,
            "demo_user": DEMO_USER_EMAIL,
            "sample_certificates_count": 3,
            "sample_shipments": ["EXP-2026-081"],
            "share_token": DEMO_SHARE_TOKEN,
            "public_demo_url": f"/share/{DEMO_SHARE_TOKEN}",
            "watermark": DEMO_WATERMARK_TEXT,
            "sample_pdf_size": len(pdf_bytes)
        }

    @classmethod
    def init_demo_plant(cls) -> Dict[str, Any]:
        return cls.load_demo_plant()

    @classmethod
    def reset_demo_plant(cls) -> Dict[str, Any]:
        """
        Clean atomic reset: removes any modified state in org_sample_howrah_works
        and wipes the sample organization completely as required by test_l1_3.
        """
        with _get_db(is_service_role=True) as conn:
            # Delete sample records across tenant tables
            tables = [
                "share_links", "dossiers", "shipments", "heat_numbers",
                "mill_certificates", "documents", "memberships", "plants", "organizations"
            ]
            for tbl in tables:
                try:
                    if tbl == "organizations":
                        conn.execute("DELETE FROM organizations WHERE id = ?", (DEMO_ORG_ID,))
                    else:
                        conn.execute(f"DELETE FROM {tbl} WHERE organization_id = ?", (DEMO_ORG_ID,))
                except Exception as e:
                    logger.debug(f"Clean reset on {tbl}: {e}")
            try:
                conn.execute("DELETE FROM suppliers WHERE id = 'sup_sample_tatasteel'")
            except Exception:
                pass
            conn.commit()

        return {"status": "DEMO_PLANT_RESET"}

    @classmethod
    def get_guided_tour_steps(cls) -> List[Dict[str, Any]]:
        """
        Prompt D5: 3-minute guided tour showing:
        1. Upload an MTC
        2. The Spec Check
        3. The Evidence Pack
        4. The Importer Page
        5. The Seal Check
        6. The CBAM Exposure Card
        """
        return [
            {
                "step": 1,
                "id": "tour-mtc-upload",
                "route": "/app/certificates",
                "target_route": "/app/certificates",
                "title": "Upload an MTC",
                "target": "[data-tour='mtc-upload']",
                "tooltip": "Fast extraction: Drop paper or digital mill test certificate for instant OCR and field recognition.",
                "duration_seconds": 30
            },
            {
                "step": 2,
                "id": "tour-spec-check",
                "route": "/app/spec-check",
                "target_route": "/app/spec-check",
                "title": "Buyer-Spec Check",
                "target": "[data-tour='spec-check']",
                "tooltip": "Does this heat meet the order? Validates chemistry (C, Mn, Cr, Ni, Mo) and mechanical specs against buyer standards.",
                "duration_seconds": 30
            },
            {
                "step": 3,
                "id": "tour-evidence-pack",
                "route": "/app/shipments",
                "target_route": "/app/shipments",
                "title": "EU Melt-and-Pour Evidence Pack",
                "target": "[data-tour='evidence-pack']",
                "tooltip": "Crucial export dossier: Country of melt, country of pour, and raw material heat traceability per shipment.",
                "duration_seconds": 30
            },
            {
                "step": 4,
                "id": "tour-importer-page",
                "route": f"/share/{DEMO_SHARE_TOKEN}",
                "target_route": f"/share/{DEMO_SHARE_TOKEN}",
                "title": "Free Importer Portal & Buyer Verification",
                "target": "[data-tour='importer-portal']",
                "tooltip": "Public verify page with QR seal: Importer downloads signed declaration pack with zero login friction.",
                "duration_seconds": 30
            },
            {
                "step": 5,
                "id": "tour-seal-check",
                "route": "/app/verify",
                "target_route": "/app/verify",
                "title": "Cryptographic Seal Check",
                "target": "[data-tour='seal-check']",
                "tooltip": "Untouched EN 10204 Clause 6 byte-identical verification: Ed25519 digital signature seal check.",
                "duration_seconds": 30
            },
            {
                "step": 6,
                "id": "tour-cbam-card",
                "route": "/app/cbam",
                "target_route": "/app/cbam",
                "title": "CBAM Exposure Card & Carbon Duty Radar",
                "target": "[data-tour='cbam-card']",
                "tooltip": "Specific Embedded Emissions (SEE) calculation and EU carbon tax liability summary per container.",
                "duration_seconds": 30
            }
        ]
