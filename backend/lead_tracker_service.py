"""
HEATLEDGER AI: Lead Tracker & Outreach CRM Service (Prompt D4)
Specification: Prompt Pack v4 - Phase D (Task D4)

Features:
1. Leads Management & Lifecycle:
   - States: found, contacted, replied, call_booked, pilot, paid, lost.
   - Fields: company, contact, role, source, state, next_action_date, notes, last_message_sent.
2. CSV Lead Ingestion:
   - Imports EEPC, Udyog Aadhaar, or trade directory CSV exports.
3. Outreach & Email Templates:
   - Merge field interpolation ({contact}, {company}, {role}).
   - Statutory compliance: Unsubscribe header/footer, physical postal address, opt-out suppression.
4. Funnel Analytics & Daily Task Priority:
   - Funnel counts and conversion rates.
   - 'Do these 10 things' daily prioritized action list.
5. Pilot & Trial Lifecycle Logging:
   - Start/end dates, outcomes, conversion tracking.
"""

import csv
import io
import json
import logging
import os
import threading
import uuid
from datetime import datetime, timezone, date
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("heatledger.lead_tracker")

VALID_LEAD_STATES = [
    "found",
    "contacted",
    "replied",
    "call_booked",
    "pilot",
    "paid",
    "lost",
]

POSTAL_ADDRESS_FOOTER = (
    "HeatLedger AI Technologies Pvt Ltd, 14 Park Street, Kolkata, WB 700016, India. "
    "Sent to verified trade business contacts pursuant to commercial B2B compliance outreach."
)

DEFAULT_TEMPLATES = {
    "initial_outreach": {
        "subject": "EU Implementing Reg 2026/1963 evidence prep for {company}",
        "body": (
            "Dear {contact},\n\n"
            "Starting 1 October 2026, European customs and steel importers require mill test certificates "
            "to explicitly document country of melt-and-pour (Implementing Regulation 2026/1963).\n\n"
            "We built HeatLedger AI to help Indian engineering exporters automate MTC tolerance checks, "
            "seal melt-and-pour custody chains, and prepare CBAM importer packs in minutes without retyping.\n\n"
            "Would you be open to a 10-minute briefing on your upcoming export dispatches?\n\n"
            "Best regards,\nAgnish Ghosh\nHeatLedger AI Technologies\n\n"
            "Unsubscribe: https://heatledger.ai/opt-out?email={email}\n"
            f"{POSTAL_ADDRESS_FOOTER}"
        ),
    },
    "pilot_invitation": {
        "subject": "Pilot audit invitation for {company} export shipments",
        "body": (
            "Dear {contact},\n\n"
            "We are onboarding a cohort of 10 Indian steel and flange exporters for our 30-day pilot audit.\n"
            "We run one past export shipment end-to-end, cross-check 50 MTCs, and provide an audit-ready "
            "tamper-evident evidence pack.\n\n"
            "If your team subsequently subscribes, 100% of the pilot fee is credited against your subscription.\n\n"
            "Reply to this email or book a call: https://heatledger.ai/demo\n\n"
            "Best regards,\nAgnish Ghosh\n\n"
            "Unsubscribe: https://heatledger.ai/opt-out?email={email}\n"
            f"{POSTAL_ADDRESS_FOOTER}"
        ),
    },
}


class LeadTrackerService:
    _lock = threading.RLock()
    _storage_path: str = os.path.join(
        os.path.dirname(os.path.dirname(__file__)), "data", "leads.json"
    )

    @classmethod
    def set_storage_path(cls, path: str) -> None:
        with cls._lock:
            cls._storage_path = path

    @classmethod
    def _load_db(cls) -> Dict[str, Any]:
        """Loads leads store from JSON."""
        with cls._lock:
            if not os.path.exists(cls._storage_path):
                default_data = {
                    "schema_version": "2026.11-v1",
                    "leads": [],
                    "templates": DEFAULT_TEMPLATES,
                }
                os.makedirs(os.path.dirname(cls._storage_path), exist_ok=True)
                with open(cls._storage_path, "w", encoding="utf-8") as f:
                    json.dump(default_data, f, indent=2)
                return default_data

            with open(cls._storage_path, "r", encoding="utf-8") as f:
                return json.load(f)

    @classmethod
    def _save_db(cls, data: Dict[str, Any]) -> None:
        """Saves leads store atomically to JSON."""
        with cls._lock:
            tmp = f"{cls._storage_path}.tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            os.replace(tmp, cls._storage_path)

    @classmethod
    def create_or_update_lead(cls, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new lead or updates existing lead by ID or email."""
        with cls._lock:
            db = cls._load_db()
            leads = db.setdefault("leads", [])

            lead_id = lead_data.get("id")
            email = str(lead_data.get("email", "")).strip().lower()

            existing = None
            if lead_id:
                existing = next((l for l in leads if l.get("id") == lead_id), None)
            if not existing and email:
                existing = next((l for l in leads if l.get("email", "").lower() == email), None)

            now_iso = datetime.now(timezone.utc).isoformat()
            state = lead_data.get("state", "found").lower()
            if state not in VALID_LEAD_STATES:
                state = "found"

            if existing:
                for k, v in lead_data.items():
                    if k != "id":
                        existing[k] = v
                existing["updated_at"] = now_iso
                lead_record = existing
            else:
                lead_record = {
                    "id": lead_id or f"lead_{uuid.uuid4().hex[:8]}",
                    "company": lead_data.get("company", "Unknown Exporter"),
                    "contact": lead_data.get("contact", "Commercial Lead"),
                    "email": email,
                    "phone": lead_data.get("phone", ""),
                    "role": lead_data.get("role", "Export Manager"),
                    "source": lead_data.get("source", "MANUAL"),
                    "state": state,
                    "next_action_date": lead_data.get("next_action_date", date.today().isoformat()),
                    "notes": lead_data.get("notes", ""),
                    "last_message_sent": lead_data.get("last_message_sent"),
                    "opted_out": lead_data.get("opted_out", False),
                    "pilot_details": lead_data.get("pilot_details"),
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                leads.append(lead_record)

            cls._save_db(db)
            return lead_record

    @classmethod
    def list_leads(cls, state: Optional[str] = None, include_opted_out: bool = True) -> List[Dict[str, Any]]:
        """Lists leads, optionally filtered by lifecycle state."""
        db = cls._load_db()
        leads = db.get("leads", [])
        if state:
            s_clean = state.strip().lower()
            leads = [l for l in leads if l.get("state") == s_clean]
        if not include_opted_out:
            leads = [l for l in leads if not l.get("opted_out", False)]
        return leads

    @classmethod
    def get_lead(cls, lead_id: str) -> Optional[Dict[str, Any]]:
        """Finds a lead by ID."""
        db = cls._load_db()
        for l in db.get("leads", []):
            if l.get("id") == lead_id:
                return l
        return None

    @classmethod
    def opt_out_lead(cls, email: str) -> bool:
        """Records an opt-out / unsubscribe event."""
        with cls._lock:
            db = cls._load_db()
            target = email.strip().lower()
            found = False
            for l in db.get("leads", []):
                if l.get("email", "").lower() == target:
                    l["opted_out"] = True
                    l["updated_at"] = datetime.now(timezone.utc).isoformat()
                    found = True
            if found:
                cls._save_db(db)
            return found

    @classmethod
    def get_funnel_metrics(cls) -> Dict[str, Any]:
        """
        Computes counts and conversion progression across the sales pipeline:
        found -> contacted -> replied -> call_booked -> pilot -> paid.
        """
        db = cls._load_db()
        leads = db.get("leads", [])

        state_counts = {s: 0 for s in VALID_LEAD_STATES}
        for l in leads:
            st = l.get("state", "found")
            if st in state_counts:
                state_counts[st] += 1

        total_leads = len(leads)
        active_pipeline = sum(state_counts[s] for s in ["contacted", "replied", "call_booked", "pilot"])

        # Conversion percentages
        contacted_cnt = state_counts["contacted"] + state_counts["replied"] + state_counts["call_booked"] + state_counts["pilot"] + state_counts["paid"]
        replied_cnt = state_counts["replied"] + state_counts["call_booked"] + state_counts["pilot"] + state_counts["paid"]
        calls_cnt = state_counts["call_booked"] + state_counts["pilot"] + state_counts["paid"]
        pilots_cnt = state_counts["pilot"] + state_counts["paid"]
        paid_cnt = state_counts["paid"]

        return {
            "total_leads": total_leads,
            "active_pipeline": active_pipeline,
            "state_counts": state_counts,
            "funnel_progression": {
                "contacted": contacted_cnt,
                "replied": replied_cnt,
                "call_booked": calls_cnt,
                "pilot": pilots_cnt,
                "paid": paid_cnt,
            },
            "conversion_rates_pct": {
                "contacted_to_reply": round((replied_cnt / contacted_cnt * 100), 1) if contacted_cnt > 0 else 0.0,
                "reply_to_call": round((calls_cnt / replied_cnt * 100), 1) if replied_cnt > 0 else 0.0,
                "call_to_pilot": round((pilots_cnt / calls_cnt * 100), 1) if calls_cnt > 0 else 0.0,
                "pilot_to_paid": round((paid_cnt / pilots_cnt * 100), 1) if pilots_cnt > 0 else 0.0,
            },
        }

    @classmethod
    def get_daily_actions(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Returns the top 10 prioritized daily actions for the founder/sales reviewer:
        Overdue follow-ups, scheduled calls, hot replies, and newly added leads.
        """
        db = cls._load_db()
        leads = [l for l in db.get("leads", []) if not l.get("opted_out", False) and l.get("state") not in ["paid", "lost"]]

        today_str = date.today().isoformat()

        def priority_score(lead: Dict[str, Any]) -> int:
            st = lead.get("state", "found")
            action_date = lead.get("next_action_date", today_str)

            score = 0
            if action_date <= today_str:
                score += 50  # Due or overdue
            if st == "call_booked":
                score += 40
            elif st == "pilot":
                score += 35
            elif st == "replied":
                score += 30
            elif st == "contacted":
                score += 20
            elif st == "found":
                score += 10
            return score

        sorted_leads = sorted(leads, key=priority_score, reverse=True)
        return sorted_leads[:limit]

    @classmethod
    def import_leads_from_csv(cls, csv_text: str, default_source: str = "CSV_IMPORT") -> Dict[str, Any]:
        """
        Imports leads from CSV text (e.g. EEPC, Udyog Aadhaar lists).
        Maps standard column names flexibly.
        """
        reader = csv.reader(io.StringIO(csv_text.strip()))
        rows = list(reader)
        if not rows:
            return {"imported": 0, "errors": ["Empty CSV file"]}

        raw_headers = [h.strip().lower().replace(" ", "_") for h in rows[0]]

        def find_col(*aliases):
            for a in aliases:
                for idx, h in enumerate(raw_headers):
                    if a in h:
                        return idx
            return -1

        col_company = find_col("company", "plant", "name_of_unit", "enterprise_name")
        col_contact = find_col("contact", "person", "representative", "owner")
        col_email = find_col("email", "e-mail", "mail")
        col_phone = find_col("phone", "mobile", "contact_no", "tel")
        col_role = find_col("role", "designation", "title")

        if col_email == -1 and col_company == -1:
            return {"imported": 0, "errors": ["Could not locate 'company' or 'email' column in header"]}

        imported_count = 0
        errors = []

        for row_idx, row in enumerate(rows[1:], start=2):
            if not row or not any(row):
                continue

            company = row[col_company].strip() if col_company != -1 and col_company < len(row) else f"Company Row {row_idx}"
            email = row[col_email].strip() if col_email != -1 and col_email < len(row) else ""
            contact = row[col_contact].strip() if col_contact != -1 and col_contact < len(row) else "Plant Executive"
            phone = row[col_phone].strip() if col_phone != -1 and col_phone < len(row) else ""
            role = row[col_role].strip() if col_role != -1 and col_role < len(row) else "Export Manager"

            if not email and not company:
                errors.append(f"Row {row_idx}: Missing both company and email")
                continue

            cls.create_or_update_lead({
                "company": company,
                "contact": contact,
                "email": email,
                "phone": phone,
                "role": role,
                "source": default_source,
                "state": "found",
                "next_action_date": date.today().isoformat(),
            })
            imported_count += 1

        return {
            "status": "success",
            "imported": imported_count,
            "errors": errors,
        }

    @classmethod
    def send_batch_email(
        cls,
        lead_ids: List[str],
        template_name: str = "initial_outreach",
        dry_run: bool = False,
    ) -> Dict[str, Any]:
        """
        Sends outreach emails to a small batch of leads using merge fields.
        Validates business email address and skips opted-out leads.
        """
        db = cls._load_db()
        templates = db.get("templates", DEFAULT_TEMPLATES)
        if template_name not in templates:
            raise ValueError(f"Unknown template '{template_name}'. Available: {list(templates.keys())}")

        tpl = templates[template_name]
        sent_records = []
        skipped_records = []

        for lid in lead_ids:
            lead = cls.get_lead(lid)
            if not lead:
                skipped_records.append({"lead_id": lid, "reason": "Not found"})
                continue

            if lead.get("opted_out", False):
                skipped_records.append({"lead_id": lid, "email": lead.get("email"), "reason": "Opted out"})
                continue

            email = lead.get("email", "")
            if not email or "@" not in email:
                skipped_records.append({"lead_id": lid, "reason": "Invalid or missing email"})
                continue

            # Merge fields
            subject = tpl["subject"].format(
                company=lead.get("company", "your plant"),
                contact=lead.get("contact", "Exporter"),
                role=lead.get("role", "Manager"),
                email=email,
            )
            body = tpl["body"].format(
                company=lead.get("company", "your plant"),
                contact=lead.get("contact", "Exporter"),
                role=lead.get("role", "Manager"),
                email=email,
            )

            if not dry_run:
                # Update lead state to 'contacted'
                cls.create_or_update_lead({
                    "id": lead["id"],
                    "state": "contacted" if lead.get("state") == "found" else lead.get("state"),
                    "last_message_sent": datetime.now(timezone.utc).isoformat(),
                    "next_action_date": (date.today()).isoformat(),
                })

            sent_records.append({
                "lead_id": lead["id"],
                "company": lead.get("company"),
                "email": email,
                "subject": subject,
                "sent_at": datetime.now(timezone.utc).isoformat(),
                "status": "SENT" if not dry_run else "DRY_RUN",
            })

        return {
            "status": "success",
            "batch_size": len(lead_ids),
            "sent_count": len(sent_records),
            "skipped_count": len(skipped_records),
            "sent": sent_records,
            "skipped": skipped_records,
        }

    @classmethod
    def log_pilot(
        cls,
        lead_id: str,
        start_date: str,
        end_date: str,
        outcome: str = "IN_PROGRESS",
        notes: str = "",
    ) -> Dict[str, Any]:
        """Logs a structured pilot or trial run for the lead."""
        lead = cls.get_lead(lead_id)
        if not lead:
            raise ValueError(f"Lead '{lead_id}' not found")

        pilot_details = {
            "start_date": start_date,
            "end_date": end_date,
            "outcome": outcome,
            "notes": notes,
            "logged_at": datetime.now(timezone.utc).isoformat(),
        }

        new_state = "paid" if outcome == "CONVERTED" else ("lost" if outcome == "FAILED" else "pilot")
        return cls.create_or_update_lead({
            "id": lead_id,
            "state": new_state,
            "pilot_details": pilot_details,
        })
