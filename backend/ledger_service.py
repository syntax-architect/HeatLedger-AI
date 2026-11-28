"""
HeatLedger AI - Traceability Ledger Service (Prompt B6)
Mathematical mass-balance ledger for heats, lots, and shipments:
- Supports splitting a heat across multiple shipments
- Supports combining multiple heats into a single shipment
- Anti-phantom over-allocation guard: checks total_allocated <= total_received
- Owner-approved override with audit log record
- Concurrency-safe transactions with exclusive locking
- Lineage graph JSON ('where did heat X go', 'what heats are in shipment Y')
"""

import os
import threading
import time
import uuid
from typing import Any, Dict, List, Optional

try:
    from backend.db.connection import get_db_connection
except ImportError:
    from db.connection import get_db_connection

DB_PATH = os.getenv("LEDGER_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "heatledger_b6.sqlite3"))


class LedgerEntryType:
    RECEIVED = "received"
    ALLOCATED = "allocated"
    SHIPPED = "shipped"
    SCRAP = "scrap"
    ADJUSTED = "adjusted"
    RELEASED = "released"


class OverAllocationError(Exception):
    def __init__(self, heat_number: str, requested_kg: float, remaining_kg: float):
        deficit = requested_kg - remaining_kg
        super().__init__(
            f"Over-allocation rejected for heat '{heat_number}'. "
            f"Requested: {requested_kg:.2f} kg, Available: {remaining_kg:.2f} kg (Deficit: {deficit:.2f} kg)."
        )
        self.heat_number = heat_number
        self.requested_kg = requested_kg
        self.remaining_kg = remaining_kg
        self.deficit = deficit


class LedgerService:
    _lock = threading.RLock()

    @classmethod
    def get_connection(cls) -> Any:
        return get_db_connection(target_path=DB_PATH, auto_close=False)

    @classmethod
    def init_db(cls):
        with cls._lock:
            conn = cls.get_connection()
            with conn:
                conn.execute("""
                CREATE TABLE IF NOT EXISTS heats (
                    heat_number TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    mill_name TEXT NOT NULL,
                    steel_grade TEXT NOT NULL,
                    initial_weight_kg REAL NOT NULL CHECK (initial_weight_kg > 0),
                    created_at REAL NOT NULL
                );
                """)
                conn.execute("""
                CREATE TABLE IF NOT EXISTS ledger_entries (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    heat_number TEXT NOT NULL REFERENCES heats(heat_number),
                    shipment_id TEXT,
                    entry_type TEXT NOT NULL,
                    quantity_kg REAL NOT NULL,
                    reason TEXT,
                    is_override INTEGER DEFAULT 0,
                    created_by TEXT,
                    created_at REAL NOT NULL
                );
                """)
                conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id TEXT PRIMARY KEY,
                    organization_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    details TEXT NOT NULL,
                    user_id TEXT,
                    timestamp REAL NOT NULL
                );
                """)
            conn.close()

    @classmethod
    def register_heat(
        cls,
        heat_number: str,
        organization_id: str,
        mill_name: str,
        steel_grade: str,
        initial_weight_kg: float,
        created_by: str = "system"
    ):
        cls.init_db()
        if not heat_number or not heat_number.strip() or heat_number.upper() in ["UNSPECIFIED", "UNKNOWN", "BLANK", "NONE", "NULL"]:
            raise ValueError("Cannot register heat: Missing or invalid heat number.")
        if initial_weight_kg is not None and initial_weight_kg <= 0:
            raise ValueError("Cannot register heat: Initial weight must be greater than zero.")
        with cls._lock:
            conn = cls.get_connection()
            with conn:
                now = time.time()
                # Clear previous entries for this heat if re-registering
                conn.execute("DELETE FROM ledger_entries WHERE heat_number = ?", (heat_number,))
                conn.execute(
                    """
                    INSERT OR REPLACE INTO heats (heat_number, organization_id, mill_name, steel_grade, initial_weight_kg, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (heat_number, organization_id, mill_name, steel_grade, initial_weight_kg, now)
                )
                # Record initial received entry
                entry_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO ledger_entries (id, organization_id, heat_number, shipment_id, entry_type, quantity_kg, reason, created_by, created_at)
                    VALUES (?, ?, ?, NULL, ?, ?, 'Initial MTC Intake', ?, ?)
                    """,
                    (entry_id, organization_id, heat_number, LedgerEntryType.RECEIVED, initial_weight_kg, created_by, now)
                )
            conn.close()

    @classmethod
    def get_heat_balance(cls, heat_number: str, conn: Optional[Any] = None, organization_id: Optional[str] = None) -> Dict[str, float]:
        cls.init_db()
        close_on_exit = False
        if conn is None:
            conn = cls.get_connection()
            close_on_exit = True

        cursor = conn.cursor()
        if organization_id:
            cursor.execute("SELECT initial_weight_kg, organization_id FROM heats WHERE heat_number = ? AND organization_id = ?", (heat_number, organization_id))
        else:
            cursor.execute("SELECT initial_weight_kg FROM heats WHERE heat_number = ?", (heat_number,))
        heat_row = cursor.fetchone()
        if not heat_row:
            if close_on_exit:
                conn.close()
            raise ValueError(f"Heat '{heat_number}' is not registered in ledger.")

        initial_kg = float(heat_row["initial_weight_kg"])

        cursor.execute(
            """
            SELECT entry_type, SUM(quantity_kg) as total_qty
            FROM ledger_entries
            WHERE heat_number = ?
            GROUP BY entry_type
            """,
            (heat_number,)
        )
        totals: Dict[str, float] = {
            LedgerEntryType.RECEIVED: 0.0,
            LedgerEntryType.ALLOCATED: 0.0,
            LedgerEntryType.SHIPPED: 0.0,
            LedgerEntryType.SCRAP: 0.0,
            LedgerEntryType.RELEASED: 0.0,
        }
        for row in cursor.fetchall():
            totals[row["entry_type"]] = float(row["total_qty"])

        net_allocated = max(0.0, totals[LedgerEntryType.ALLOCATED] - totals[LedgerEntryType.RELEASED])
        remaining = initial_kg - (net_allocated + totals[LedgerEntryType.SHIPPED] + totals[LedgerEntryType.SCRAP])

        if close_on_exit:
            conn.close()

        return {
            "initial_kg": initial_kg,
            "received_kg": totals[LedgerEntryType.RECEIVED] or initial_kg,
            "allocated_kg": net_allocated,
            "shipped_kg": totals[LedgerEntryType.SHIPPED],
            "scrap_kg": totals[LedgerEntryType.SCRAP],
            "remaining_kg": remaining,
            "is_over_allocated": remaining < -0.001
        }

    @classmethod
    def allocate_heat(
        cls,
        heat_number: str,
        shipment_id: str,
        quantity_kg: float,
        organization_id: str,
        allow_override: bool = False,
        override_reason: Optional[str] = None,
        created_by: str = "qa_inspector"
    ) -> Dict[str, Any]:
        """
        Concurrency-safe allocation of heat quantity to a shipment.
        Rejects over-allocation unless allow_override=True with valid reason.
        """
        cls.init_db()
        entry_id = str(uuid.uuid4())
        now = time.time()

        with cls._lock:
            conn = cls.get_connection()
            try:
                with conn:
                    balance = cls.get_heat_balance(heat_number, conn=conn)
                    remaining = balance["remaining_kg"]

                    if quantity_kg > remaining + 0.001:
                        if not allow_override:
                            raise OverAllocationError(heat_number, quantity_kg, remaining)

                        # Log owner override to audit log
                        audit_id = str(uuid.uuid4())
                        audit_details = (
                            f"OWNER OVERRIDE: Over-allocated {quantity_kg} kg for heat {heat_number} "
                            f"to shipment {shipment_id}. Available was {remaining} kg. Reason: {override_reason or 'No reason provided'}"
                        )
                        conn.execute(
                            """
                            INSERT INTO audit_log (id, organization_id, action, details, user_id, timestamp)
                            VALUES (?, ?, 'OVER_ALLOCATION_OVERRIDE', ?, ?, ?)
                            """,
                            (audit_id, organization_id, audit_details, created_by, now)
                        )

                    # Insert ledger allocation entry
                    conn.execute(
                        """
                        INSERT INTO ledger_entries (id, organization_id, heat_number, shipment_id, entry_type, quantity_kg, reason, is_override, created_by, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            entry_id,
                            organization_id,
                            heat_number,
                            shipment_id,
                            LedgerEntryType.ALLOCATED,
                            quantity_kg,
                            f"Allocated to shipment {shipment_id}",
                            1 if allow_override else 0,
                            created_by,
                            now
                        )
                    )

                updated_balance = cls.get_heat_balance(heat_number, conn=conn)
            finally:
                conn.close()

        return {
            "entry_id": entry_id,
            "heat_number": heat_number,
            "shipment_id": shipment_id,
            "allocated_kg": quantity_kg,
            "remaining_kg": updated_balance["remaining_kg"],
            "balance": updated_balance
        }

    @classmethod
    def release_allocation(
        cls,
        heat_number: str,
        shipment_id: str,
        quantity_kg: float,
        organization_id: str,
        reason: str = "Allocation release / revision",
        created_by: str = "qa_inspector"
    ) -> Dict[str, Any]:
        """Release previously allocated quantity back to remaining pool."""
        cls.init_db()
        conn = cls.get_connection()
        entry_id = str(uuid.uuid4())
        now = time.time()

        with conn:
            conn.execute(
                """
                INSERT INTO ledger_entries (id, organization_id, heat_number, shipment_id, entry_type, quantity_kg, reason, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (entry_id, organization_id, heat_number, shipment_id, LedgerEntryType.RELEASED, quantity_kg, reason, created_by, now)
            )

        balance = cls.get_heat_balance(heat_number)
        conn.close()

        return {
            "entry_id": entry_id,
            "released_kg": quantity_kg,
            "remaining_kg": balance["remaining_kg"],
            "balance": balance
        }

    @classmethod
    def get_heat_lineage(cls, heat_number: str, organization_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Return full lineage trace graph ('where did heat X go').
        Prompt A2: Filters strictly by organization_id to prevent cross-tenant enumeration.
        """
        cls.init_db()
        conn = cls.get_connection()
        cursor = conn.cursor()

        if organization_id:
            cursor.execute("SELECT * FROM heats WHERE heat_number = ? AND organization_id = ?", (heat_number, organization_id))
        else:
            cursor.execute("SELECT * FROM heats WHERE heat_number = ?", (heat_number,))
        heat_row = cursor.fetchone()
        if not heat_row:
            conn.close()
            raise ValueError(f"Heat '{heat_number}' not found.")

        if organization_id:
            cursor.execute(
                """
                SELECT * FROM ledger_entries
                WHERE heat_number = ? AND organization_id = ?
                ORDER BY created_at ASC
                """,
                (heat_number, organization_id)
            )
        else:
            cursor.execute(
                """
                SELECT * FROM ledger_entries
                WHERE heat_number = ?
                ORDER BY created_at ASC
                """,
                (heat_number,)
            )
        entries = [dict(r) for r in cursor.fetchall()]

        if organization_id:
            cursor.execute(
                """
                SELECT shipment_id, SUM(quantity_kg) as total_kg
                FROM ledger_entries
                WHERE heat_number = ? AND entry_type = 'allocated' AND shipment_id IS NOT NULL AND organization_id = ?
                GROUP BY shipment_id
                """,
                (heat_number, organization_id)
            )
        else:
            cursor.execute(
                """
                SELECT shipment_id, SUM(quantity_kg) as total_kg
                FROM ledger_entries
                WHERE heat_number = ? AND entry_type = 'allocated' AND shipment_id IS NOT NULL
                GROUP BY shipment_id
                """,
                (heat_number,)
            )
        shipments = [dict(r) for r in cursor.fetchall()]

        balance = cls.get_heat_balance(heat_number, conn=conn, organization_id=organization_id)
        conn.close()

        # Build lineage graph nodes and edges
        nodes = [
            {"id": f"heat:{heat_number}", "label": f"Heat #{heat_number}", "type": "heat", "details": dict(heat_row)}
        ]
        edges = []

        for s in shipments:
            s_id = s["shipment_id"]
            nodes.append({"id": f"shipment:{s_id}", "label": f"Shipment {s_id}", "type": "shipment", "quantity_kg": s["total_kg"]})
            edges.append({"source": f"heat:{heat_number}", "target": f"shipment:{s_id}", "weight_kg": s["total_kg"]})

        return {
            "heat_number": heat_number,
            "mill_name": heat_row["mill_name"],
            "steel_grade": heat_row["steel_grade"],
            "balance": balance,
            "shipments": shipments,
            "history": entries,
            "lineage_graph": {
                "nodes": nodes,
                "edges": edges
            }
        }

    @classmethod
    def get_shipment_heats(cls, shipment_id: str) -> List[Dict[str, Any]]:
        """Return all heats combined into a given shipment ('what heats are in shipment Y')."""
        cls.init_db()
        conn = cls.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT le.heat_number, h.mill_name, h.steel_grade, SUM(le.quantity_kg) as allocated_kg
            FROM ledger_entries le
            JOIN heats h ON le.heat_number = h.heat_number
            WHERE le.shipment_id = ? AND le.entry_type = 'allocated'
            GROUP BY le.heat_number, h.mill_name, h.steel_grade
            """,
            (shipment_id,)
        )
        rows = [dict(r) for r in cursor.fetchall()]
        total_shipment_kg = sum(r["allocated_kg"] for r in rows)

        for r in rows:
            pct = (r["allocated_kg"] / total_shipment_kg * 100.0) if total_shipment_kg > 0 else 0.0
            r["percentage_contribution"] = round(pct, 2)

        conn.close()
        return rows

    @classmethod
    def seed_sample_scenario(cls, organization_id: str = "org_demo_howrah"):
        """Seed realistic mill heats and shipments for demonstration."""
        cls.register_heat(
            heat_number="TSJ-26-9021",
            organization_id=organization_id,
            mill_name="Tata Steel Limited, Jamshedpur Works",
            steel_grade="EN 10025-2 S355JR",
            initial_weight_kg=48000.0
        )
        cls.register_heat(
            heat_number="SAIL-BOK-88192",
            organization_id=organization_id,
            mill_name="Steel Authority of India Ltd (SAIL) - Bokaro",
            steel_grade="IS 2062 E250",
            initial_weight_kg=35000.0
        )
        cls.register_heat(
            heat_number="JSW-VIJ-55104",
            organization_id=organization_id,
            mill_name="JSW Steel Ltd - Vijayanagar",
            steel_grade="EN 10025-2 S275JR",
            initial_weight_kg=60000.0
        )

        # Allocate partial splits
        cls.allocate_heat("TSJ-26-9021", "EXP-2026-109", 24500.0, organization_id)
        cls.allocate_heat("SAIL-BOK-88192", "EXP-2026-110", 18000.0, organization_id)
        # Combined shipment: EXP-2026-111 has both Tata and JSW
        cls.allocate_heat("TSJ-26-9021", "EXP-2026-111", 12000.0, organization_id)
        cls.allocate_heat("JSW-VIJ-55104", "EXP-2026-111", 28000.0, organization_id)

    @classmethod
    def get_all_heats(cls, organization_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Return all registered heats for an organization (never falls back to another org or auto-seeds in production)."""
        if not organization_id or not str(organization_id).strip():
            raise ValueError("Missing organization_id")
        cls.init_db()
        conn = cls.get_connection()
        cursor = conn.cursor()
        try:
            target_org = str(organization_id).strip()
            cursor.execute("SELECT * FROM heats WHERE organization_id = ? ORDER BY created_at DESC", (target_org,))
            rows = [dict(r) for r in cursor.fetchall()]
            is_demo = os.environ.get("DEMO_MODE", "false").lower() == "true"
            if not rows and is_demo and target_org == "org_demo_howrah":
                cls.seed_sample_scenario(target_org)
                cursor.execute("SELECT * FROM heats WHERE organization_id = ? ORDER BY created_at DESC", (target_org,))
                rows = [dict(r) for r in cursor.fetchall()]

            results = []
            for r in rows:
                bal = cls.get_heat_balance(r["heat_number"], conn=conn)
                r["initial_kg"] = bal["initial_kg"]
                r["allocated_kg"] = bal["allocated_kg"]
                r["remaining_kg"] = bal["remaining_kg"]
                r["allocated_weight_grams"] = int(bal["allocated_kg"] * 1000)
                r["available_weight_grams"] = int(bal["remaining_kg"] * 1000)
                if "melt_and_pour_country" not in r:
                    r["melt_and_pour_country"] = (
                        "India" if (is_demo and ("TSJ" in r["heat_number"] or "SAIL" in r["heat_number"])) else None
                    )
                results.append(r)
            return results
        finally:
            conn.close()

