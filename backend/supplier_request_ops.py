"""
Schema initialization, demo seeding, QA review, and reminder dispatch helpers
extracted from SupplierRequestService.
"""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

try:
    from backend.db.connection import get_db_connection as _get_db
except ImportError:
    from db.connection import get_db_connection as _get_db


def init_tables(service_cls: Any) -> None:
    """Initializes tables for Prompt P5 supplier data requests, submissions, and precursor records."""
    with service_cls._lock:
        with _get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS supplier_data_requests (
                    id TEXT PRIMARY KEY,
                    token TEXT NOT NULL UNIQUE,
                    organization_id TEXT NOT NULL,
                    plant_id TEXT NOT NULL,
                    supplier_id TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    supplier_contact_name TEXT,
                    supplier_email TEXT,
                    supplier_phone TEXT,
                    product_name TEXT NOT NULL,
                    cn_code TEXT NOT NULL,
                    reporting_period TEXT NOT NULL,
                    deadline TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'REQUESTED',
                    requested_fields TEXT NOT NULL,
                    custom_note TEXT,
                    reminder_day_3_sent_at TEXT,
                    reminder_day_7_sent_at TEXT,
                    review_notes TEXT,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)

            conn.commit()
            for alter_sql in (
                "ALTER TABLE supplier_data_requests ADD COLUMN custom_note TEXT",
                "ALTER TABLE supplier_data_requests ADD COLUMN review_notes TEXT",
                "ALTER TABLE supplier_data_requests ADD COLUMN reminder_day_3_sent_at TEXT",
                "ALTER TABLE supplier_data_requests ADD COLUMN reminder_day_7_sent_at TEXT",
            ):
                try:
                    conn.execute(alter_sql)
                    conn.commit()
                except Exception:
                    conn.rollback()

            conn.execute("""
                CREATE TABLE IF NOT EXISTS supplier_data_submissions (
                    id TEXT PRIMARY KEY,
                    request_id TEXT NOT NULL,
                    token TEXT NOT NULL,
                    is_draft INTEGER NOT NULL DEFAULT 1,
                    submitter_name TEXT,
                    submitter_designation TEXT,
                    submitter_email TEXT,
                    submitter_phone TEXT,
                    production_route TEXT,
                    direct_fuel_type TEXT,
                    direct_fuel_consumption_gj_per_t REAL,
                    electricity_consumption_mwh_per_t REAL,
                    electricity_source TEXT,
                    scrap_content_pct REAL,
                    total_output_tonnes REAL,
                    precursor_emissions_tco2_per_t REAL,
                    evidence_file_name TEXT,
                    evidence_file_sha256 TEXT,
                    evidence_file_url TEXT,
                    notes TEXT,
                    data_origin_tag TEXT DEFAULT 'SUPPLIER_REPORTED',
                    submitted_at TEXT NOT NULL,
                    FOREIGN KEY (request_id) REFERENCES supplier_data_requests(id)
                )
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS precursor_records (
                    id TEXT PRIMARY KEY,
                    request_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    supplier_id TEXT NOT NULL,
                    supplier_name TEXT NOT NULL,
                    product_name TEXT NOT NULL,
                    cn_code TEXT NOT NULL,
                    reporting_period TEXT NOT NULL,
                    precursor_see_tco2_per_t REAL NOT NULL,
                    production_route TEXT NOT NULL,
                    scrap_content_pct REAL,
                    evidence_sha256 TEXT,
                    linked_heats TEXT,
                    version INTEGER NOT NULL DEFAULT 1,
                    accepted_by TEXT NOT NULL,
                    accepted_at TEXT NOT NULL,
                    data_origin_tag TEXT DEFAULT 'VERIFIED_SUPPLIER_PRECURSOR',
                    FOREIGN KEY (request_id) REFERENCES supplier_data_requests(id)
                )
            """)

            is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
            is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
            if is_demo or is_test:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM supplier_data_requests")
                count = cur.fetchone()[0]
                if count == 0:
                    seed_demo_requests(conn)

            conn.commit()


def seed_demo_requests(conn: Any) -> None:
    """Seeds realistic Indian steel mill precursor requests for Tata, SAIL, and JSW."""
    now = datetime.now(timezone.utc)
    deadline_tata = (now + timedelta(days=14)).strftime("%Y-%m-%d")
    deadline_sail = (now - timedelta(days=2)).strftime("%Y-%m-%d")
    deadline_jsw = (now + timedelta(days=7)).strftime("%Y-%m-%d")

    default_fields = json.dumps([
        "production_route",
        "direct_fuel_consumption",
        "electricity_consumption",
        "electricity_source",
        "scrap_content_pct",
        "precursor_emissions_tco2_per_t",
        "evidence_doc",
    ])

    req1_id = "req_demo_tata_01"
    token1 = "sreq_tata_2026_q1"
    conn.execute("""
        INSERT INTO supplier_data_requests (
            id, token, organization_id, plant_id, supplier_id, supplier_name,
            supplier_contact_name, supplier_email, supplier_phone, product_name,
            cn_code, reporting_period, deadline, status, requested_fields,
            custom_note, created_by, created_at
        ) VALUES (?, ?, 'org_howrah_steel_01', 'plant-howrah-01', 'sup_tata_01',
            'Tata Steel Limited (Jamshedpur)', 'Sunil Sharma', 'cbam.desk@tatasteel.com',
            '+919830112233', 'Continuous Cast Prime Billets (150x150 mm)', '7207 11 00',
            '2026-Q1', ?, 'IN_REVIEW', ?, 'Urgent for Rotterdam Export Batch EXP-2026-109', 'usr_qa_04', ?
        )
    """, (req1_id, token1, deadline_tata, default_fields, now.isoformat()))

    conn.execute("""
        INSERT INTO supplier_data_submissions (
            id, request_id, token, is_draft, submitter_name, submitter_designation,
            submitter_email, submitter_phone, production_route, direct_fuel_type,
            direct_fuel_consumption_gj_per_t, electricity_consumption_mwh_per_t,
            electricity_source, scrap_content_pct, total_output_tonnes,
            precursor_emissions_tco2_per_t, evidence_file_name, evidence_file_sha256,
            notes, submitted_at
        ) VALUES (
            'sub_demo_tata_01', ?, ?, 0, 'Dr. P. Sen', 'Head of Decarbonization & Energy',
            'p.sen@tatasteel.com', '+919830112233', 'BF-BOF (Basic Oxygen Furnace)',
            'Coking Coal / Coke Oven Gas', 14.2, 0.48, 'Captive PPA + CEA Regional Grid',
            12.5, 45000.0, 1.825, 'Tata_Steel_Jamshedpur_Precursor_CBAM_2026Q1.xlsx',
            'a68f7b2e9d1234cde5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8',
            'Verified data certified under ISO 14064 third-party audit for Jamshedpur Works.', ?
        )
    """, (req1_id, token1, (now - timedelta(hours=6)).isoformat()))

    req2_id = "req_demo_sail_02"
    token2 = "sreq_sail_2026_overdue"
    conn.execute("""
        INSERT INTO supplier_data_requests (
            id, token, organization_id, plant_id, supplier_id, supplier_name,
            supplier_contact_name, supplier_email, supplier_phone, product_name,
            cn_code, reporting_period, deadline, status, requested_fields,
            custom_note, created_by, created_at, reminder_day_3_sent_at, reminder_day_7_sent_at
        ) VALUES (?, ?, 'org_howrah_steel_01', 'plant-howrah-01', 'sup_sail_02',
            'Steel Authority of India Limited (Durgapur)', 'A. K. Ganguly', 'cbam.durgapur@sail.in',
            '+919831998877', 'Hot Rolled Steel Rounds (Dia 80mm)', '7214 99 10',
            '2026-Q1', ?, 'OVERDUE', ?, 'Required for Durgapur Plant supply audit', 'usr_qa_04', ?, ?, ?
        )
    """, (
        req2_id, token2, deadline_sail, default_fields,
        (now - timedelta(days=10)).isoformat(),
        (now - timedelta(days=7)).isoformat(),
        (now - timedelta(days=3)).isoformat(),
    ))

    req3_id = "req_demo_jsw_03"
    token3 = "sreq_jsw_2026_accepted"
    conn.execute("""
        INSERT INTO supplier_data_requests (
            id, token, organization_id, plant_id, supplier_id, supplier_name,
            supplier_contact_name, supplier_email, supplier_phone, product_name,
            cn_code, reporting_period, deadline, status, requested_fields,
            custom_note, created_by, created_at
        ) VALUES (?, ?, 'org_howrah_steel_01', 'plant-howrah-01', 'sup_jsw_03',
            'JSW Steel Limited (Vijayanagar)', 'R. Venkatesh', 'cbam@jsw.in',
            '+919845112233', 'Carbon Steel Blooms & Billets', '7207 11 00',
            '2025-Annual', ?, 'ACCEPTED', ?, 'Approved for Vijayanagar supply batches', 'usr_qa_04', ?
        )
    """, (req3_id, token3, deadline_jsw, default_fields, (now - timedelta(days=15)).isoformat()))

    conn.execute("""
        INSERT INTO precursor_records (
            id, request_id, organization_id, supplier_id, supplier_name, product_name,
            cn_code, reporting_period, precursor_see_tco2_per_t, production_route,
            scrap_content_pct, evidence_sha256, linked_heats, version, accepted_by,
            accepted_at, data_origin_tag
        ) VALUES (
            'prec_jsw_2025_01', ?, 'org_howrah_steel_01', 'sup_jsw_03',
            'JSW Steel Limited (Vijayanagar)', 'Carbon Steel Blooms & Billets',
            '7207 11 00', '2025-Annual', 1.740, 'Corex / BOF-CC', 15.0,
            'c9e12f458a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6',
            ?, 1, 'usr_qa_04', ?, 'VERIFIED_SUPPLIER_PRECURSOR'
        )
    """, (req3_id, json.dumps(["JSW-VY-4409", "JSW-VY-4410"]), (now - timedelta(days=2)).isoformat()))


def review_request(
    service_cls: Any,
    request_id: str,
    action: str,
    comment: str,
    org_id: str,
    reviewer_id: Optional[str] = None,
    linked_heats: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Exporter QA reviews the submitted precursor data."""
    service_cls.init_tables()
    action_clean = action.upper()
    now = datetime.now(timezone.utc).isoformat()

    with service_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM supplier_data_requests WHERE id = ?", (request_id,))
            req = cur.fetchone()
            if not req:
                raise ValueError(f"Request {request_id} not found")

            cur.execute("""
                SELECT * FROM supplier_data_submissions
                WHERE request_id = ? AND is_draft = 0
                ORDER BY submitted_at DESC LIMIT 1
            """, (request_id,))
            sub = cur.fetchone()
            if not sub:
                raise ValueError("No final submission available to review")

            if action_clean in ["ACCEPTED", "ACCEPT"]:
                cur.execute("""
                    SELECT MAX(version) FROM precursor_records
                    WHERE supplier_id = ? AND cn_code = ? AND reporting_period = ?
                """, (req["supplier_id"], req["cn_code"], req["reporting_period"]))
                v_row = cur.fetchone()
                version = (v_row[0] or 0) + 1

                prec_id = f"prec_{uuid.uuid4().hex[:10]}"
                heats_json = json.dumps(linked_heats or ["TSJ-26-9021", "TSJ-26-9022"])

                conn.execute("""
                    INSERT INTO precursor_records (
                        id, request_id, organization_id, supplier_id, supplier_name,
                        product_name, cn_code, reporting_period, precursor_see_tco2_per_t,
                        production_route, scrap_content_pct, evidence_sha256,
                        linked_heats, version, accepted_by, accepted_at, data_origin_tag
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'VERIFIED_SUPPLIER_PRECURSOR')
                """, (
                    prec_id, request_id, org_id, req["supplier_id"], req["supplier_name"],
                    req["product_name"], req["cn_code"], req["reporting_period"],
                    sub["precursor_emissions_tco2_per_t"] or 1.85,
                    sub["production_route"] or "BF-BOF",
                    sub["scrap_content_pct"] or 10.0,
                    sub["evidence_file_sha256"],
                    heats_json, version, reviewer_id or "", now,
                ))

                conn.execute("""
                    UPDATE supplier_data_requests
                    SET status = 'ACCEPTED', review_notes = ?
                    WHERE id = ?
                """, (comment or "Precursor data approved and verified by QA.", request_id))
                conn.commit()

                return {
                    "status": "success",
                    "action": "Accepted",
                    "request_status": "ACCEPTED",
                    "precursor_record_id": prec_id,
                    "version": version,
                    "precursor_see_tco2_per_t": sub["precursor_emissions_tco2_per_t"],
                    "linked_heats": json.loads(heats_json),
                    "message": "Supplier precursor data successfully accepted and linked to heats.",
                }

            elif action_clean in ["RETURNED", "RETURN"]:
                conn.execute("""
                    UPDATE supplier_data_requests
                    SET status = 'RETURNED', review_notes = ?
                    WHERE id = ?
                """, (comment or "Returned for clarification / revised evidence.", request_id))
                conn.commit()

                return {
                    "status": "success",
                    "action": "Returned",
                    "request_status": "RETURNED",
                    "comment": comment,
                    "message": "Data returned to supplier with review notes.",
                }
            else:
                raise ValueError(f"Unsupported action: {action}")


def send_reminder(
    service_cls: Any,
    request_id: str,
    org_id: str,
    channel: str = "WHATSAPP",
    reminder_type: str = "DAY_3",
) -> Dict[str, Any]:
    """Dispatches or simulates Day 3 / Day 7 reminder."""
    service_cls.init_tables()
    now = datetime.now(timezone.utc).isoformat()
    with service_cls._lock:
        with _get_db() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM supplier_data_requests WHERE id = ?", (request_id,))
            req = cur.fetchone()
            if not req:
                raise ValueError(f"Request {request_id} not found")

            if reminder_type == "DAY_3":
                conn.execute("""
                    UPDATE supplier_data_requests
                    SET reminder_day_3_sent_at = ?, status = 'REMINDED'
                    WHERE id = ?
                """, (now, request_id))
            else:
                conn.execute("""
                    UPDATE supplier_data_requests
                    SET reminder_day_7_sent_at = ?, status = 'REMINDED'
                    WHERE id = ?
                """, (now, request_id))
            conn.commit()

    exporter_name = service_cls._resolve_exporter_name(req["organization_id"])
    link_url = f"https://heatledger.in/supplier-request/{req['token']}"
    whatsapp_message = (
        f"Dear {req['supplier_contact_name'] or 'Partner'},\n\n"
        f"This is a friendly reminder from {exporter_name} regarding required EU CBAM Precursor Emissions Data:\n"
        f"• Product: {req['product_name']} (CN {req['cn_code']})\n"
        f"• Period: {req['reporting_period']}\n"
        f"• Target Due Date: {req['deadline']}\n\n"
        f"Please complete or update your submission on your mobile using your direct secure link:\n"
        f"{link_url}\n\n"
        f"No login is required. For questions, reply directly to this chat."
    )

    return {
        "status": "success",
        "reminder_sent": True,
        "channel": channel,
        "sent_at": now,
        "supplier_email": req["supplier_email"],
        "supplier_phone": req["supplier_phone"],
        "whatsapp_message": whatsapp_message,
        "email_subject": f"ACTION REQUIRED: Reminder to Submit CBAM Precursor Data for {req['reporting_period']}",
        "link_url": link_url,
    }
