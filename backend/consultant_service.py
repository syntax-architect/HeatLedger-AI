"""
HeatLedger AI - Consultant & Multi-Plant Mode Service (Prompt P10)
Enables CA firms, compliance consultants, and industrial conglomerates to manage
multiple client plants with strict row-level security (RLS), consolidated at-risk
shipments monitoring, white-label branding, CSV bulk onboarding, and consolidated invoicing.

Statutory and architectural constraints:
- Plants own their data: access can be revoked by the plant at any time.
- White-label applies consultant logo and colours, but NEVER removes the
  mandatory 'Prepared with HeatLedger AI' Clause 6 cryptographic verification footer.
- Row-Level Security: consultants can query data ONLY for client plants with active,
  unexpired access grants. Unauthorized cross-plant access strictly raises PermissionError.
"""

import os
import csv
import io
import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

DB_PATH = os.path.join(os.path.dirname(__file__), "heatledger_consultant.db")


def init_consultant_db():
    """Initializes tables for multi-plant consultant management, access grants, white-label, and invoicing."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Consultant Organization Profiles
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS consultant_profiles (
            consultant_org_id TEXT PRIMARY KEY,
            firm_name TEXT NOT NULL,
            contact_email TEXT NOT NULL,
            phone TEXT,
            referral_code TEXT UNIQUE,
            discount_pct REAL DEFAULT 15.0,
            commission_pct REAL DEFAULT 20.0,
            per_plant_monthly_fee_inr REAL DEFAULT 6999.0,
            created_at TEXT NOT NULL
        )
        """
    )

    # 2. White-Label Branding Configuration
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS consultant_white_label (
            consultant_org_id TEXT PRIMARY KEY,
            firm_name TEXT NOT NULL,
            logo_url TEXT,
            primary_color TEXT DEFAULT '#0f172a',
            secondary_color TEXT DEFAULT '#10b981',
            custom_domain TEXT,
            tagline TEXT,
            show_consultant_brand_on_pdf INTEGER DEFAULT 1,
            show_consultant_brand_on_portal INTEGER DEFAULT 1,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (consultant_org_id) REFERENCES consultant_profiles(consultant_org_id)
        )
        """
    )

    # 3. Client Plant Access Grants (RLS Core)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS client_plant_access (
            id TEXT PRIMARY KEY,
            consultant_org_id TEXT NOT NULL,
            plant_id TEXT NOT NULL,
            plant_name TEXT NOT NULL,
            plant_code TEXT NOT NULL,
            gst_or_pan TEXT,
            location TEXT,
            granted_role TEXT NOT NULL, -- 'AUDITOR_READONLY', 'QA_CONSULTANT', 'COMPLIANCE_MANAGER'
            status TEXT NOT NULL,       -- 'ACTIVE', 'REVOKED', 'EXPIRED'
            granted_by_user_id TEXT NOT NULL,
            expires_at TEXT,            -- ISO8601 or NULL for indefinite
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(consultant_org_id, plant_id)
        )
        """
    )

    # 4. Mock Cross-Plant Production & Compliance Cache (Simulating plant data for multi-plant view)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS client_plant_records (
            id TEXT PRIMARY KEY,
            plant_id TEXT NOT NULL,
            entity_type TEXT NOT NULL, -- 'SHIPMENT', 'MTC'
            entity_identifier TEXT NOT NULL,
            destination_country TEXT,
            importer_name TEXT,
            readiness_status TEXT NOT NULL, -- 'READY', 'AT_RISK', 'BLOCKED'
            block_reasons TEXT, -- JSON array of string reasons
            cbam_due_date TEXT,
            total_tonnage REAL DEFAULT 0.0,
            review_status TEXT NOT NULL, -- 'PENDING_REVIEW', 'APPROVED', 'RELEASED'
            updated_at TEXT NOT NULL
        )
        """
    )

    conn.commit()

    # Seed initial demo data if empty
    cursor.execute("SELECT COUNT(*) as count FROM consultant_profiles")
    if cursor.fetchone()["count"] == 0:
        _seed_demo_consultant_data(cursor)
        conn.commit()

    conn.close()


def _seed_demo_consultant_data(cursor: Any):
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    one_year_later = (now + timedelta(days=365)).isoformat()

    # Demo Consultant Org
    c_org = "org_consultant_singhania"
    cursor.execute(
        """
        INSERT INTO consultant_profiles (
            consultant_org_id, firm_name, contact_email, phone, referral_code,
            discount_pct, commission_pct, per_plant_monthly_fee_inr, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            c_org,
            "Singhania & Partners Global Trade Advisory",
            "compliance@singhaniaglobal.com",
            "+91 98300 45678",
            "CA-SINGHANIA-2026",
            15.0,
            20.0,
            6999.0,
            now_iso,
        ),
    )

    # Demo White-Label
    cursor.execute(
        """
        INSERT INTO consultant_white_label (
            consultant_org_id, firm_name, logo_url, primary_color, secondary_color,
            custom_domain, tagline, show_consultant_brand_on_pdf, show_consultant_brand_on_portal, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            c_org,
            "Singhania Global Advisory",
            "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&auto=format&fit=crop&q=60",
            "#047857",  # Emerald shade
            "#065f46",
            "cbam.singhaniaglobal.com",
            "Authorised Customs & CBAM Compliance Auditors",
            1,
            1,
            now_iso,
        ),
    )

    # 3 Client Plants
    plants = [
        (
            f"access_{uuid.uuid4().hex[:8]}",
            c_org,
            "PLANT-HOWRAH-01",
            "Howrah Precision Forgings Pvt Ltd",
            "HPF-01",
            "19AABCH4910C1Z2",
            "Howrah, West Bengal, India",
            "COMPLIANCE_MANAGER",
            "ACTIVE",
            "usr_howrah_owner",
            one_year_later,
            now_iso,
            now_iso,
        ),
        (
            f"access_{uuid.uuid4().hex[:8]}",
            c_org,
            "PLANT-LUDHIANA-02",
            "Punjab Fasteners & Heavy Engineering Works",
            "PFH-02",
            "03AACCP8921B1Z8",
            "Ludhiana, Punjab, India",
            "QA_CONSULTANT",
            "ACTIVE",
            "usr_ludhiana_owner",
            one_year_later,
            now_iso,
            now_iso,
        ),
        (
            f"access_{uuid.uuid4().hex[:8]}",
            c_org,
            "PLANT-DURGAPUR-03",
            "Mayurbhanj Alloys & Castings Ltd",
            "MAC-03",
            "21AAACM7781D1ZQ",
            "Baripada / Durgapur, India",
            "AUDITOR_READONLY",
            "ACTIVE",
            "usr_mayurbhanj_owner",
            one_year_later,
            now_iso,
            now_iso,
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO client_plant_access (
            id, consultant_org_id, plant_id, plant_name, plant_code, gst_or_pan,
            location, granted_role, status, granted_by_user_id, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        plants,
    )

    # Cross-Plant Records (Shipments & MTCs)
    records = [
        # Howrah Records (1 at-risk, 1 ready)
        (
            "rec_hpf_01",
            "PLANT-HOWRAH-01",
            "SHIPMENT",
            "EXP-2026-089",
            "Germany (Hamburg Port)",
            "ThyssenKrupp Materials AG",
            "AT_RISK",
            json.dumps(["Missing melt-and-pour country origin proof", "IIW CEV 0.44% exceeds 0.42% max threshold"]),
            "2026-04-30",
            34.8,
            "PENDING_REVIEW",
            now_iso,
        ),
        (
            "rec_hpf_02",
            "PLANT-HOWRAH-01",
            "SHIPMENT",
            "EXP-2026-092",
            "Netherlands (Rotterdam)",
            "Tata Steel Europe B.V.",
            "READY",
            json.dumps([]),
            "2026-05-15",
            68.0,
            "APPROVED",
            now_iso,
        ),
        # Ludhiana Records (1 at-risk, 1 pending review)
        (
            "rec_pfh_01",
            "PLANT-LUDHIANA-02",
            "SHIPMENT",
            "EXP-2026-104",
            "Belgium (Antwerp)",
            "ArcelorMittal Distribution S.A.",
            "AT_RISK",
            json.dumps(["Scrap mass balance deficit: 12.4% unaccounted losses"]),
            "2026-04-30",
            42.5,
            "PENDING_REVIEW",
            now_iso,
        ),
        (
            "rec_pfh_02",
            "PLANT-LUDHIANA-02",
            "MTC",
            "MTC-JINDAL-9921",
            "Italy (Genoa)",
            "Marcegaglia S.p.A.",
            "AT_RISK",
            json.dumps(["Supplier Scope 2 grid emissions factor outdated (2023 instead of 2024 CEA CEA CO2 database)"]),
            "2026-06-10",
            28.0,
            "PENDING_REVIEW",
            now_iso,
        ),
        # Mayurbhanj Records (1 ready)
        (
            "rec_mac_01",
            "PLANT-DURGAPUR-03",
            "SHIPMENT",
            "EXP-2026-118",
            "France (Le Havre)",
            "Vallourec Tubes France",
            "READY",
            json.dumps([]),
            "2026-07-31",
            55.0,
            "RELEASED",
            now_iso,
        ),
    ]
    cursor.executemany(
        """
        INSERT INTO client_plant_records (
            id, plant_id, entity_type, entity_identifier, destination_country,
            importer_name, readiness_status, block_reasons, cbam_due_date,
            total_tonnage, review_status, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        records,
    )


class ConsultantService:
    def __init__(self):
        init_consultant_db()

    # =========================================================================
    # 1. Row-Level Security (RLS) Checks
    # =========================================================================
    def check_consultant_access(
        self, consultant_org_id: str, plant_id: str
    ) -> Any:
        """
        Enforces Row-Level Security:
        Verifies that consultant_org_id has an ACTIVE, unexpired grant for plant_id.
        Raises PermissionError if unauthorized or revoked.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT * FROM client_plant_access
            WHERE consultant_org_id = ? AND plant_id = ?
            """,
            (consultant_org_id, plant_id),
        )
        grant = cursor.fetchone()
        conn.close()

        if not grant:
            raise PermissionError(
                f"Access Denied: Consultant '{consultant_org_id}' has not been granted access to Plant '{plant_id}'."
            )

        if grant["status"] == "REVOKED":
            raise PermissionError(
                f"Access Revoked: Plant '{plant_id}' has revoked consultant access."
            )

        if grant["expires_at"]:
            try:
                expires_dt = datetime.fromisoformat(grant["expires_at"].replace("Z", "+00:00"))
                if datetime.now(timezone.utc) > expires_dt:
                    raise PermissionError(
                        f"Access Expired: Consultant grant for Plant '{plant_id}' expired at {grant['expires_at']}."
                    )
            except Exception as e:
                if isinstance(e, PermissionError):
                    raise e

        return grant

    # =========================================================================
    # 2. Portfolio Overview & Cross-Client Metrics
    # =========================================================================
    def get_consultant_portfolio(
        self, consultant_org_id: str
    ) -> Dict[str, Any]:
        """
        Returns all client plants with their access grants, combined health status,
        and high-level metrics for the consultant dashboard.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Fetch consultant profile
        cursor.execute(
            "SELECT * FROM consultant_profiles WHERE consultant_org_id = ?",
            (consultant_org_id,),
        )
        profile = cursor.fetchone()
        if not profile:
            # Create default profile if not exists
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.execute(
                """
                INSERT INTO consultant_profiles (
                    consultant_org_id, firm_name, contact_email, referral_code, created_at
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    consultant_org_id,
                    "Trade Advisory Partner",
                    "advisor@heatledger.com",
                    f"REF-{uuid.uuid4().hex[:6].upper()}",
                    now_iso,
                ),
            )
            conn.commit()
            cursor.execute(
                "SELECT * FROM consultant_profiles WHERE consultant_org_id = ?",
                (consultant_org_id,),
            )
            profile = cursor.fetchone()

        # Fetch active client grants
        cursor.execute(
            """
            SELECT * FROM client_plant_access
            WHERE consultant_org_id = ?
            ORDER BY created_at DESC
            """,
            (consultant_org_id,),
        )
        grants = cursor.fetchall()

        client_plants = []
        plant_ids = []
        for g in grants:
            is_active = g["status"] == "ACTIVE"
            if is_active and g["expires_at"]:
                try:
                    exp = datetime.fromisoformat(g["expires_at"].replace("Z", "+00:00"))
                    if datetime.now(timezone.utc) > exp:
                        is_active = False
                except Exception:
                    pass

            client_plants.append(
                {
                    "id": g["id"],
                    "plant_id": g["plant_id"],
                    "plant_name": g["plant_name"],
                    "plant_code": g["plant_code"],
                    "gst_or_pan": g["gst_or_pan"],
                    "location": g["location"],
                    "granted_role": g["granted_role"],
                    "status": "ACTIVE" if is_active else g["status"],
                    "granted_by_user_id": g["granted_by_user_id"],
                    "expires_at": g["expires_at"],
                    "created_at": g["created_at"],
                }
            )
            if is_active:
                plant_ids.append(g["plant_id"])

        # Aggregate cross-client metrics for active plants only
        total_tonnage = 0.0
        at_risk_count = 0
        pending_review_count = 0
        total_shipments = 0

        if plant_ids:
            allowed_set = set(plant_ids)
            cursor.execute(
                """
                SELECT plant_id, readiness_status, review_status, total_tonnage
                FROM client_plant_records
                """
            )
            matched_rows = [r for r in cursor.fetchall() if r["plant_id"] in allowed_set]
            total_shipments = len(matched_rows)
            at_risk_count = sum(1 for r in matched_rows if r["readiness_status"] == "AT_RISK")
            pending_review_count = sum(1 for r in matched_rows if r["review_status"] == "PENDING_REVIEW")
            total_tonnage = round(sum(float(r["total_tonnage"] or 0.0) for r in matched_rows), 1)

        # Monthly retainer calculation: active_plants * fee
        active_count = len(plant_ids)
        fee_per_plant = float(profile["per_plant_monthly_fee_inr"] or 6999.0)
        monthly_retainer_inr = active_count * fee_per_plant

        conn.close()

        return {
            "consultant_org_id": consultant_org_id,
            "firm_name": profile["firm_name"],
            "contact_email": profile["contact_email"],
            "referral_code": profile["referral_code"],
            "discount_pct": float(profile["discount_pct"]),
            "commission_pct": float(profile["commission_pct"]),
            "total_clients": len(client_plants),
            "active_clients": active_count,
            "total_shipments_monitored": total_shipments,
            "at_risk_shipments_count": at_risk_count,
            "pending_reviews_count": pending_review_count,
            "monitored_tonnage_mt": total_tonnage,
            "monthly_retainer_inr": monthly_retainer_inr,
            "client_plants": client_plants,
        }

    # =========================================================================
    # 3. Cross-Client At-Risk Radar & Review Queue
    # =========================================================================
    def get_cross_client_at_risk_shipments(
        self, consultant_org_id: str, plant_id_filter: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists all at-risk shipments across all client factories where consultant has active access.
        Strictly applies RLS: if plant_id_filter is provided, checks grant first.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # Get list of authorized active plant IDs
        cursor.execute(
            """
            SELECT plant_id, plant_name, plant_code, status, expires_at
            FROM client_plant_access
            WHERE consultant_org_id = ? AND status = 'ACTIVE'
            """,
            (consultant_org_id,),
        )
        grants = cursor.fetchall()
        now = datetime.now(timezone.utc)

        valid_plants: Dict[str, Dict[str, str]] = {}
        for g in grants:
            if g["expires_at"]:
                try:
                    exp = datetime.fromisoformat(g["expires_at"].replace("Z", "+00:00"))
                    if now > exp:
                        continue
                except Exception:
                    pass
            valid_plants[g["plant_id"]] = {
                "name": g["plant_name"],
                "code": g["plant_code"],
            }

        if not valid_plants:
            conn.close()
            return []

        if plant_id_filter:
            if plant_id_filter not in valid_plants:
                conn.close()
                raise PermissionError(
                    f"Access Denied: Consultant does not have active grant for filtered plant '{plant_id_filter}'."
                )
            target_ids = [plant_id_filter]
        else:
            target_ids = list(valid_plants.keys())

        target_set = set(target_ids)
        cursor.execute(
            """
            SELECT * FROM client_plant_records
            WHERE readiness_status = 'AT_RISK'
            ORDER BY cbam_due_date ASC
            """
        )
        rows = [r for r in cursor.fetchall() if r["plant_id"] in target_set]
        conn.close()

        items = []
        for r in rows:
            p_info = valid_plants.get(r["plant_id"], {"name": r["plant_id"], "code": "N/A"})
            reasons = []
            try:
                reasons = json.loads(r["block_reasons"] or "[]")
            except Exception:
                pass

            items.append(
                {
                    "id": r["id"],
                    "plant_id": r["plant_id"],
                    "plant_name": p_info["name"],
                    "plant_code": p_info["code"],
                    "entity_type": r["entity_type"],
                    "entity_identifier": r["entity_identifier"],
                    "destination_country": r["destination_country"],
                    "importer_name": r["importer_name"],
                    "readiness_status": r["readiness_status"],
                    "block_reasons": reasons,
                    "cbam_due_date": r["cbam_due_date"],
                    "total_tonnage": r["total_tonnage"],
                    "review_status": r["review_status"],
                    "updated_at": r["updated_at"],
                }
            )

        return items

    def get_cross_client_review_queue(
        self, consultant_org_id: str
    ) -> List[Dict[str, Any]]:
        """
        Retrieves pending review items across all authorized client plants for consultant sign-off.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT plant_id, plant_name, plant_code, status, expires_at
            FROM client_plant_access
            WHERE consultant_org_id = ? AND status = 'ACTIVE'
            """,
            (consultant_org_id,),
        )
        grants = cursor.fetchall()
        now = datetime.now(timezone.utc)

        valid_plants: Dict[str, Dict[str, str]] = {}
        for g in grants:
            if g["expires_at"]:
                try:
                    exp = datetime.fromisoformat(g["expires_at"].replace("Z", "+00:00"))
                    if now > exp:
                        continue
                except Exception:
                    pass
            valid_plants[g["plant_id"]] = {
                "name": g["plant_name"],
                "code": g["plant_code"],
            }

        if not valid_plants:
            conn.close()
            return []

        valid_set = set(valid_plants.keys())
        cursor.execute(
            """
            SELECT * FROM client_plant_records
            WHERE review_status = 'PENDING_REVIEW'
            ORDER BY updated_at DESC
            """
        )
        rows = [r for r in cursor.fetchall() if r["plant_id"] in valid_set]
        conn.close()

        results = []
        for r in rows:
            p_info = valid_plants[r["plant_id"]]
            results.append(
                {
                    "id": r["id"],
                    "plant_id": r["plant_id"],
                    "plant_name": p_info["name"],
                    "plant_code": p_info["code"],
                    "entity_type": r["entity_type"],
                    "entity_identifier": r["entity_identifier"],
                    "destination_country": r["destination_country"],
                    "importer_name": r["importer_name"],
                    "readiness_status": r["readiness_status"],
                    "cbam_due_date": r["cbam_due_date"],
                    "total_tonnage": r["total_tonnage"],
                    "updated_at": r["updated_at"],
                }
            )
        return results

    # =========================================================================
    # 4. Plant Access Revocation & Invitation
    # =========================================================================
    def revoke_client_access(
        self, plant_id: str, consultant_org_id: str, acting_user_id: str
    ) -> Dict[str, Any]:
        """
        Plant owner revoking consultant access.
        Plants always own their data and can revoke access instantly.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT * FROM client_plant_access
            WHERE plant_id = ? AND consultant_org_id = ?
            """,
            (plant_id, consultant_org_id),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            raise ValueError(
                f"No access relationship found between plant '{plant_id}' and consultant '{consultant_org_id}'."
            )

        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            """
            UPDATE client_plant_access
            SET status = 'REVOKED', updated_at = ?
            WHERE plant_id = ? AND consultant_org_id = ?
            """,
            (now_iso, plant_id, consultant_org_id),
        )
        conn.commit()
        conn.close()

        return {
            "success": True,
            "plant_id": plant_id,
            "consultant_org_id": consultant_org_id,
            "status": "REVOKED",
            "revoked_at": now_iso,
            "revoked_by": acting_user_id,
            "message": "Consultant access successfully revoked. RLS queries will now be rejected.",
        }

    def invite_or_grant_client_access(
        self,
        consultant_org_id: str,
        plant_id: str,
        plant_name: str,
        plant_code: str,
        gst_or_pan: str,
        location: str,
        role: str = "QA_CONSULTANT",
        duration_days: int = 365,
        acting_user_id: str = "usr_owner",
    ) -> Dict[str, Any]:
        """
        Invites or attaches a client plant to the consultant's organization with an expiry.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        expires_at = (now + timedelta(days=duration_days)).isoformat()
        access_id = f"access_{uuid.uuid4().hex[:8]}"

        cursor.execute(
            """
            INSERT INTO client_plant_access (
                id, consultant_org_id, plant_id, plant_name, plant_code, gst_or_pan,
                location, granted_role, status, granted_by_user_id, expires_at, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)
            ON CONFLICT(consultant_org_id, plant_id) DO UPDATE SET
                plant_name = excluded.plant_name,
                plant_code = excluded.plant_code,
                granted_role = excluded.granted_role,
                status = 'ACTIVE',
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at
            """,
            (
                access_id,
                consultant_org_id,
                plant_id,
                plant_name,
                plant_code,
                gst_or_pan,
                location,
                role,
                acting_user_id,
                expires_at,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        conn.close()

        return {
            "success": True,
            "access_id": access_id,
            "consultant_org_id": consultant_org_id,
            "plant_id": plant_id,
            "plant_name": plant_name,
            "granted_role": role,
            "status": "ACTIVE",
            "expires_at": expires_at,
        }

    # =========================================================================
    # 5. Bulk Client Onboarding via CSV
    # =========================================================================
    def bulk_onboard_clients_from_csv(
        self, consultant_org_id: str, csv_content: str, acting_user_id: str
    ) -> Dict[str, Any]:
        """
        Parses CSV with header:
        client_name, plant_code, gst_or_pan, location, contact_email, role, duration_days
        and bulk onboards client plants into the consultant organization.
        """
        f = io.StringIO(csv_content)
        reader = csv.DictReader(f)

        onboarded = []
        errors = []
        row_num = 1

        for row in reader:
            row_num += 1
            client_name = row.get("client_name", "").strip()
            plant_code = row.get("plant_code", "").strip() or f"PLT-{uuid.uuid4().hex[:4].upper()}"
            gst_or_pan = row.get("gst_or_pan", "").strip()
            location = row.get("location", "").strip() or "India"
            role = row.get("role", "QA_CONSULTANT").strip()
            try:
                days = int(row.get("duration_days", "365").strip() or 365)
            except ValueError:
                days = 365

            if not client_name:
                errors.append({"row": row_num, "error": "client_name is required"})
                continue

            plant_id = f"PLANT-{plant_code.replace(' ', '-').upper()}"
            try:
                res = self.invite_or_grant_client_access(
                    consultant_org_id=consultant_org_id,
                    plant_id=plant_id,
                    plant_name=client_name,
                    plant_code=plant_code,
                    gst_or_pan=gst_or_pan,
                    location=location,
                    role=role,
                    duration_days=days,
                    acting_user_id=acting_user_id,
                )
                onboarded.append(res)
            except Exception as e:
                errors.append({"row": row_num, "client": client_name, "error": str(e)})

        return {
            "total_processed": len(onboarded) + len(errors),
            "successfully_onboarded_count": len(onboarded),
            "error_count": len(errors),
            "onboarded_plants": onboarded,
            "errors": errors,
        }

    # =========================================================================
    # 6. White-Label Configuration & Branding Rules
    # =========================================================================
    def get_white_label_config(self, consultant_org_id: str) -> Dict[str, Any]:
        """
        Retrieves white-label logo and color settings for the consultant organization.
        Enforces immutable requirement that Clause 6 / HeatLedger verification footer is preserved.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM consultant_white_label WHERE consultant_org_id = ?",
            (consultant_org_id,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            return {
                "consultant_org_id": consultant_org_id,
                "firm_name": "Consultant Advisory",
                "logo_url": None,
                "primary_color": "#0f172a",
                "secondary_color": "#10b981",
                "custom_domain": None,
                "tagline": "Authorised CBAM Advisory",
                "show_consultant_brand_on_pdf": True,
                "show_consultant_brand_on_portal": True,
                "mandatory_verification_footer": "Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact",
            }

        return {
            "consultant_org_id": row["consultant_org_id"],
            "firm_name": row["firm_name"],
            "logo_url": row["logo_url"],
            "primary_color": row["primary_color"],
            "secondary_color": row["secondary_color"],
            "custom_domain": row["custom_domain"],
            "tagline": row["tagline"],
            "show_consultant_brand_on_pdf": bool(row["show_consultant_brand_on_pdf"]),
            "show_consultant_brand_on_portal": bool(row["show_consultant_brand_on_portal"]),
            "mandatory_verification_footer": "Prepared with HeatLedger AI · Cryptographic Clause 6 Verification Intact",
        }

    def update_white_label_config(
        self, consultant_org_id: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Updates white-label branding parameters.
        """
        conn = get_db_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()

        firm_name = payload.get("firm_name", "Consultant Advisory")
        logo_url = payload.get("logo_url")
        primary_color = payload.get("primary_color", "#0f172a")
        secondary_color = payload.get("secondary_color", "#10b981")
        custom_domain = payload.get("custom_domain")
        tagline = payload.get("tagline")
        show_pdf = 1 if payload.get("show_consultant_brand_on_pdf", True) else 0
        show_portal = 1 if payload.get("show_consultant_brand_on_portal", True) else 0

        cursor.execute(
            """
            INSERT INTO consultant_white_label (
                consultant_org_id, firm_name, logo_url, primary_color, secondary_color,
                custom_domain, tagline, show_consultant_brand_on_pdf, show_consultant_brand_on_portal, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(consultant_org_id) DO UPDATE SET
                firm_name = excluded.firm_name,
                logo_url = excluded.logo_url,
                primary_color = excluded.primary_color,
                secondary_color = excluded.secondary_color,
                custom_domain = excluded.custom_domain,
                tagline = excluded.tagline,
                show_consultant_brand_on_pdf = excluded.show_consultant_brand_on_pdf,
                show_consultant_brand_on_portal = excluded.show_consultant_brand_on_portal,
                updated_at = excluded.updated_at
            """,
            (
                consultant_org_id,
                firm_name,
                logo_url,
                primary_color,
                secondary_color,
                custom_domain,
                tagline,
                show_pdf,
                show_portal,
                now_iso,
            ),
        )
        conn.commit()
        conn.close()

        return self.get_white_label_config(consultant_org_id)

    # =========================================================================
    # 7. Consolidated Monthly Invoice Generation
    # =========================================================================
    def get_consolidated_invoice(
        self, consultant_org_id: str, billing_month: str = "2026-04"
    ) -> Dict[str, Any]:
        """
        Generates one consolidated monthly invoice with per-plant line items
        and commission/discount lines.
        """
        portfolio = self.get_consultant_portfolio(consultant_org_id)
        active_plants = [p for p in portfolio["client_plants"] if p["status"] == "ACTIVE"]

        fee_per_plant = 6999.0
        line_items = []
        subtotal = 0.0

        for p in active_plants:
            item_total = fee_per_plant
            subtotal += item_total
            line_items.append(
                {
                    "plant_id": p["plant_id"],
                    "plant_name": p["plant_name"],
                    "plant_code": p["plant_code"],
                    "service_description": "HeatLedger AI Multi-Plant Enterprise Compliance Tier",
                    "monthly_rate_inr": fee_per_plant,
                    "gst_18_pct": round(fee_per_plant * 0.18, 2),
                    "total_inr": round(fee_per_plant * 1.18, 2),
                }
            )

        # Consultant referral commission
        comm_pct = portfolio.get("commission_pct", 20.0)
        commission_credit_inr = round(subtotal * (comm_pct / 100.0), 2)
        net_payable_inr = round(subtotal * 1.18 - commission_credit_inr, 2)

        return {
            "invoice_number": f"INV-HL-{billing_month}-{uuid.uuid4().hex[:6].upper()}",
            "consultant_org_id": consultant_org_id,
            "firm_name": portfolio["firm_name"],
            "billing_month": billing_month,
            "generated_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "total_active_plants": len(active_plants),
            "subtotal_inr": round(subtotal, 2),
            "gst_18_pct_total_inr": round(subtotal * 0.18, 2),
            "gross_amount_inr": round(subtotal * 1.18, 2),
            "consultant_commission_pct": comm_pct,
            "commission_credit_inr": commission_credit_inr,
            "net_payable_inr": max(0.0, net_payable_inr),
            "line_items": line_items,
        }

    # =========================================================================
    # 8. Referral Tracking
    # =========================================================================
    def get_referral_tracking(self, consultant_org_id: str) -> Dict[str, Any]:
        """
        Returns consultant referral link, promo code, attributed client plants,
        and accrued commission payout ledger.
        """
        portfolio = self.get_consultant_portfolio(consultant_org_id)
        ref_code = portfolio.get("referral_code", "CA-PARTNER-2026")
        clients = portfolio["client_plants"]

        attributed_list = []
        for c in clients:
            attributed_list.append(
                {
                    "plant_id": c["plant_id"],
                    "plant_name": c["plant_name"],
                    "status": c["status"],
                    "referred_date": c["created_at"][:10],
                    "client_discount_applied_pct": portfolio.get("discount_pct", 15.0),
                    "consultant_monthly_credit_inr": round(float(portfolio.get("per_plant_monthly_fee_inr", 6999.0)) * 0.20, 2),  # 20% commission
                }
            )

        credit_per_plant = round(float(portfolio.get("per_plant_monthly_fee_inr", 6999.0)) * 0.20, 2)
        total_accrued = len([c for c in clients if c["status"] == "ACTIVE"]) * credit_per_plant

        return {
            "referral_code": ref_code,
            "share_url": f"https://heatledger.ai/signup?ref={ref_code}",
            "client_discount_pct": portfolio.get("discount_pct", 15.0),
            "consultant_commission_pct": portfolio.get("commission_pct", 20.0),
            "active_referred_plants_count": len([c for c in clients if c["status"] == "ACTIVE"]),
            "monthly_recurring_commission_inr": round(total_accrued, 2),
            "attributed_clients": attributed_list,
        }


# Singleton instance
consultant_service = ConsultantService()
