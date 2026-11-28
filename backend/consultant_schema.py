"""
HEATLEDGER AI: Consultant Multi-Plant Database Schema & Demo Seeding
Extracted from consultant_service.py for Prompt Pack v5 Task 6.1.
"""

import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection


def init_consultant_db() -> None:
    """Initializes tables for multi-plant consultant management, access grants, white-label, and invoicing."""
    conn = get_db_connection()
    cursor = conn.cursor()

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
            granted_role TEXT NOT NULL,
            status TEXT NOT NULL,
            granted_by_user_id TEXT NOT NULL,
            expires_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(consultant_org_id, plant_id)
        )
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS client_plant_records (
            id TEXT PRIMARY KEY,
            plant_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_identifier TEXT NOT NULL,
            destination_country TEXT,
            importer_name TEXT,
            readiness_status TEXT NOT NULL,
            block_reasons TEXT,
            cbam_due_date TEXT,
            total_tonnage REAL DEFAULT 0.0,
            review_status TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )

    conn.commit()

    is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
    is_test = os.environ.get("ENV", "").lower() in ("test", "testing") or os.environ.get("PYTEST_CURRENT_TEST") is not None
    if is_demo or is_test:
        cursor.execute("SELECT COUNT(*) as count FROM consultant_profiles")
        if cursor.fetchone()["count"] == 0:
            _seed_demo_consultant_data(cursor)
            conn.commit()

    conn.close()


def _seed_demo_consultant_data(cursor: Any) -> None:
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    one_year_later = (now + timedelta(days=365)).isoformat()
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
            "#047857",
            "#065f46",
            "cbam.singhaniaglobal.com",
            "Authorised Customs & CBAM Compliance Auditors",
            1,
            1,
            now_iso,
        ),
    )

    plants = [
        (
            f"access_{uuid.uuid4().hex[:8]}", c_org, "PLANT-HOWRAH-01",
            "Howrah Precision Forgings Pvt Ltd", "HPF-01", "19AABCH4910C1Z2",
            "Howrah, West Bengal, India", "COMPLIANCE_MANAGER", "ACTIVE",
            "usr_howrah_owner", one_year_later, now_iso, now_iso,
        ),
        (
            f"access_{uuid.uuid4().hex[:8]}", c_org, "PLANT-LUDHIANA-02",
            "Punjab Fasteners & Heavy Engineering Works", "PFH-02", "03AACCP8921B1Z8",
            "Ludhiana, Punjab, India", "QA_CONSULTANT", "ACTIVE",
            "usr_ludhiana_owner", one_year_later, now_iso, now_iso,
        ),
        (
            f"access_{uuid.uuid4().hex[:8]}", c_org, "PLANT-DURGAPUR-03",
            "Mayurbhanj Alloys & Castings Ltd", "MAC-03", "21AAACM7781D1ZQ",
            "Baripada / Durgapur, India", "AUDITOR_READONLY", "ACTIVE",
            "usr_mayurbhanj_owner", one_year_later, now_iso, now_iso,
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

    records = [
        (
            "rec_hpf_01", "PLANT-HOWRAH-01", "SHIPMENT", "EXP-2026-089",
            "Germany (Hamburg Port)", "ThyssenKrupp Materials AG", "AT_RISK",
            json.dumps(["Missing melt-and-pour country origin proof", "IIW CEV 0.44% exceeds 0.42% max threshold"]),
            "2026-04-30", 34.8, "PENDING_REVIEW", now_iso,
        ),
        (
            "rec_hpf_02", "PLANT-HOWRAH-01", "SHIPMENT", "EXP-2026-092",
            "Netherlands (Rotterdam)", "Tata Steel Europe B.V.", "READY",
            json.dumps([]), "2026-05-15", 68.0, "APPROVED", now_iso,
        ),
        (
            "rec_pfh_01", "PLANT-LUDHIANA-02", "SHIPMENT", "EXP-2026-104",
            "Belgium (Antwerp)", "ArcelorMittal Distribution S.A.", "AT_RISK",
            json.dumps(["Scrap mass balance deficit: 12.4% unaccounted losses"]),
            "2026-04-30", 42.5, "PENDING_REVIEW", now_iso,
        ),
        (
            "rec_pfh_02", "PLANT-LUDHIANA-02", "MTC", "MTC-JINDAL-9921",
            "Italy (Genoa)", "Marcegaglia S.p.A.", "AT_RISK",
            json.dumps(["Supplier Scope 2 grid emissions factor outdated (2023 instead of 2024 CEA CEA CO2 database)"]),
            "2026-06-10", 28.0, "PENDING_REVIEW", now_iso,
        ),
        (
            "rec_mac_01", "PLANT-DURGAPUR-03", "SHIPMENT", "EXP-2026-118",
            "France (Le Havre)", "Vallourec Tubes France", "READY",
            json.dumps([]), "2026-07-31", 55.0, "RELEASED", now_iso,
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
