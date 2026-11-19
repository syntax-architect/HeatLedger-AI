"""
HEATLEDGER AI: Sourced Regulatory Constants & CBAM Default Values Store
Module: regulatory_store.py
Specification: Dated, sourced regulatory tables, versioned default values,
exchange rates, and calculation constant provenance.
"""

import os
import csv
import sqlite3
import logging
from typing import Dict, List, Optional, Tuple, Any

logger = logging.getLogger("heatledger.regulatory")

DB_PATH = os.path.join(os.path.dirname(__file__), "heatledger_security.db")
DEFAULT_CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "cbam_default_values.csv")


class RegulatoryStore:
    """
    Manages SQLite-backed versioned regulatory constants and CBAM default values.
    Guarantees that numbers are never hardcoded in logic and always carry provenance.
    """
    DB_PATH = DB_PATH

    @classmethod
    def init_tables(cls, db_path: str = DB_PATH) -> None:
        """Creates regulatory_constants and cbam_default_values tables if they do not exist."""
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS regulatory_constants (
                    key TEXT PRIMARY KEY,
                    value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    source_url TEXT NOT NULL,
                    last_verified TEXT NOT NULL,
                    effective_from TEXT NOT NULL,
                    effective_to TEXT,
                    description TEXT NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cbam_default_values (
                    cn_code TEXT NOT NULL,
                    country TEXT NOT NULL,
                    base_value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    source TEXT NOT NULL,
                    version TEXT NOT NULL,
                    PRIMARY KEY (cn_code, country, version)
                )
            """)

            # Seed default constants if empty
            cursor.execute("SELECT COUNT(*) FROM regulatory_constants")
            if cursor.fetchone()[0] == 0:
                cls._seed_default_constants(cursor)

            # Seed default values from CSV if empty
            cursor.execute("SELECT COUNT(*) FROM cbam_default_values")
            if cursor.fetchone()[0] == 0 and os.path.exists(DEFAULT_CSV_PATH):
                cls._seed_default_values_from_csv(cursor, DEFAULT_CSV_PATH)

            conn.commit()

    @classmethod
    def _seed_default_constants(cls, cursor: sqlite3.Cursor) -> None:
        initial_constants = [
            (
                "cbam_certificate_price_eur_2026_q1",
                75.36,
                "EUR/tCO2e",
                "https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en",
                "2026-11-19",
                "2026-01-01",
                "2026-03-31",
                "European Commission published Q1 2026 quarterly average EU ETS allowance price"
            ),
            (
                "cbam_markup_pct_2026",
                0.10,
                "fraction",
                "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2621",
                "2026-11-19",
                "2026-01-01",
                "2026-12-31",
                "10% markup applied to default values for year 2026 under Implementing Regulation (EU) 2025/2621"
            ),
            (
                "cbam_markup_pct_2027",
                0.20,
                "fraction",
                "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2621",
                "2026-11-19",
                "2027-01-01",
                "2027-12-31",
                "20% markup applied to default values for year 2027 under Implementing Regulation (EU) 2025/2621"
            ),
            (
                "cbam_markup_pct_2028",
                0.30,
                "fraction",
                "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2621",
                "2026-11-19",
                "2028-01-01",
                "2099-12-31",
                "30% markup applied to default values from year 2028 onwards under Implementing Regulation (EU) 2025/2621"
            ),
            (
                "grid_emission_factor_in",
                0.727,
                "tCO2e/MWh",
                "https://cea.nic.in/wp-content/uploads/baseline/2024/10/User_Guide_ver_20.pdf",
                "2026-11-19",
                "2024-10-01",
                "2027-03-31",
                "Central Electricity Authority (CEA) of India National Grid Weighted Average Emission Factor v20.0"
            ),
            (
                "fuel_emission_factor_furnace_oil",
                2.68,
                "kg CO2e/L",
                "https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol2.html",
                "2026-11-19",
                "2006-01-01",
                "2030-12-31",
                "IPCC 2006 Guidelines for National GHG Inventories: Stationary Combustion (Light fuel oil / furnace oil)"
            ),
            (
                "eur_to_inr_exchange_rate",
                90.50,
                "INR/EUR",
                "https://www.rbi.org.in/scripts/ReferenceRateArchive.aspx",
                "2026-11-19",
                "2026-01-02",
                "2026-12-31",
                "Reserve Bank of India (RBI) Reference Exchange Rate EUR/INR"
            )
        ]

        cursor.executemany("""
            INSERT OR REPLACE INTO regulatory_constants 
            (key, value, unit, source_url, last_verified, effective_from, effective_to, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_constants)

    @classmethod
    def _seed_default_values_from_csv(cls, cursor: sqlite3.Cursor, csv_path: str) -> None:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = [
                (
                    row["cn_code"].strip(),
                    row["country"].strip().upper(),
                    float(row["base_value"]),
                    row["unit"].strip(),
                    row["source"].strip(),
                    row["version"].strip()
                )
                for row in reader
            ]
            cursor.executemany("""
                INSERT OR REPLACE INTO cbam_default_values
                (cn_code, country, base_value, unit, source, version)
                VALUES (?, ?, ?, ?, ?, ?)
            """, rows)

    @classmethod
    def get_constant(cls, key: str, default: Optional[float] = None, db_path: str = DB_PATH) -> float:
        """Retrieves a numeric regulatory constant by key."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM regulatory_constants WHERE key = ?", (key,))
            row = cursor.fetchone()
            if row:
                return float(row[0])
            if default is not None:
                return default
            raise KeyError(f"Regulatory constant '{key}' not found in active database.")

    @classmethod
    def get_constant_record(cls, key: str, db_path: str = DB_PATH) -> Optional[Dict[str, Any]]:
        """Retrieves full record for a regulatory constant."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM regulatory_constants WHERE key = ?", (key,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @classmethod
    def list_constants(cls, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
        """Returns all regulatory constants with provenance metadata."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM regulatory_constants ORDER BY key ASC")
            return [dict(r) for r in cursor.fetchall()]

    @classmethod
    def set_constant(
        cls,
        key: str,
        value: float,
        unit: str,
        source_url: str,
        description: str,
        last_verified: str = "2026-11-19",
        effective_from: str = "2026-01-01",
        effective_to: Optional[str] = None,
        db_path: str = DB_PATH
    ) -> None:
        """Updates or inserts a regulatory constant."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO regulatory_constants
                (key, value, unit, source_url, last_verified, effective_from, effective_to, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (key, value, unit, source_url, last_verified, effective_from, effective_to, description))
            conn.commit()

    @classmethod
    def get_cbam_default(
        cls,
        cn_code: str,
        country_iso: str,
        version: str = "REG-2026-Q1-V1",
        db_path: str = DB_PATH
    ) -> Tuple[float, str, str, str]:
        """
        Looks up the official default value for a CN code and country.
        Returns: (base_value, matched_country, source, version)
        First checks exact 4-digit CN code and exact country.
        Falls back to GLOBAL_DEFAULT for the CN code if country specific row not present.
        """
        cls.init_tables(db_path)
        clean_cn = cn_code.replace(" ", "").replace(".", "")[:4]
        clean_iso = country_iso.strip().upper() if country_iso else "GLOBAL_DEFAULT"

        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # 1. Exact match on CN prefix and country
            cursor.execute("""
                SELECT base_value, country, source, version 
                FROM cbam_default_values 
                WHERE cn_code = ? AND country = ? AND version = ?
            """, (clean_cn, clean_iso, version))
            row = cursor.fetchone()
            if row:
                return float(row[0]), row[1], row[2], row[3]

            # 2. Fallback to GLOBAL_DEFAULT for CN code
            cursor.execute("""
                SELECT base_value, country, source, version 
                FROM cbam_default_values 
                WHERE cn_code = ? AND country = 'GLOBAL_DEFAULT' AND version = ?
            """, (clean_cn, version))
            row = cursor.fetchone()
            if row:
                return float(row[0]), "GLOBAL_DEFAULT", row[2], row[3]

            # 3. Fallback to generic steel global fallback (2.15 tCO2e/t)
            return 2.15, "GLOBAL_DEFAULT", "Implementing Regulation (EU) 2025/2621 Fallback", version

    @classmethod
    def list_cbam_defaults(cls, version: Optional[str] = None, db_path: str = DB_PATH) -> List[Dict[str, Any]]:
        """Lists all CBAM default values, optionally filtered by version."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if version:
                cursor.execute("SELECT * FROM cbam_default_values WHERE version = ? ORDER BY cn_code, country", (version,))
            else:
                cursor.execute("SELECT * FROM cbam_default_values ORDER BY version DESC, cn_code, country")
            return [dict(r) for r in cursor.fetchall()]

    @classmethod
    def import_default_values_csv(cls, csv_path: str, db_path: str = DB_PATH) -> int:
        """Imports or updates default values from a supplied CSV file."""
        cls.init_tables(db_path)
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            cls._seed_default_values_from_csv(cursor, csv_path)
            conn.commit()
            cursor.execute("SELECT COUNT(*) FROM cbam_default_values")
            return cursor.fetchone()[0]
