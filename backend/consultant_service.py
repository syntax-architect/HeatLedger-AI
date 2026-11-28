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
    from backend.consultant_billing import (
        get_consolidated_invoice as _cb_get_consolidated_invoice,
        get_referral_tracking as _cb_get_referral_tracking,
        get_white_label_config as _cb_get_white_label_config,
        update_white_label_config as _cb_update_white_label_config,
    )
    from backend.consultant_schema import _seed_demo_consultant_data, init_consultant_db
    from backend.db.connection import get_db_connection
except ImportError:
    from consultant_billing import (
        get_consolidated_invoice as _cb_get_consolidated_invoice,
        get_referral_tracking as _cb_get_referral_tracking,
        get_white_label_config as _cb_get_white_label_config,
        update_white_label_config as _cb_update_white_label_config,
    )
    from consultant_schema import _seed_demo_consultant_data, init_consultant_db
    from db.connection import get_db_connection

DB_PATH = os.path.join(os.path.dirname(__file__), "heatledger_consultant.db")


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
    # 6. White-Label Configuration, Consolidated Billing & Referrals (delegated)
    # =========================================================================
    def get_white_label_config(self, consultant_org_id: str) -> Dict[str, Any]:
        return _cb_get_white_label_config(consultant_org_id)

    def update_white_label_config(self, consultant_org_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        return _cb_update_white_label_config(consultant_org_id, payload)

    def get_consolidated_invoice(self, consultant_org_id: str, billing_month: str = "2026-04") -> Dict[str, Any]:
        return _cb_get_consolidated_invoice(self, consultant_org_id, billing_month)

    def get_referral_tracking(self, consultant_org_id: str) -> Dict[str, Any]:
        return _cb_get_referral_tracking(self, consultant_org_id)


# Singleton instance
consultant_service = ConsultantService()
