# ============================================================================
# HEATLEDGER AI: Unified Database Connection & Pool Layer (Prompt S3)
#
# Connection Pool Architecture: Psycopg 3 ConnectionPool
# 1. Native client-side pooling with thread-safe acquire/release semantics and automatic reconnection.
# 2. Native PostgreSQL binary protocol support, zero-ORM overhead for raw SQL execution and high throughput.
# 3. Transparent local development fallback to SQLite connection pooling when DATABASE_URL is not set.
# ============================================================================

import contextvars
import os
import re
import sqlite3
import sys
import threading
from contextlib import contextmanager
from typing import Any, Dict, Generator, List, Optional, Set, Tuple, Union

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool
    HAS_PSYCOPG = True
except ImportError:
    HAS_PSYCOPG = False
    ConnectionPool = None

# Load root .env into os.environ for local dev/uvicorn when not inside pytest
if "pytest" not in sys.modules and os.getenv("PYTEST_CURRENT_TEST") is None and os.getenv("ENV", "").lower() not in ("test", "testing"):
    _root_dir = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    for _env_candidate in (os.path.join(_root_dir, ".env"), os.path.join(os.getcwd(), ".env")):
        if os.path.isfile(_env_candidate):
            try:
                with open(_env_candidate, "r", encoding="utf-8") as _ef:
                    for _line in _ef:
                        _line = _line.strip()
                        if not _line or _line.startswith("#") or "=" not in _line:
                            continue
                        _k, _v = _line.split("=", 1)
                        _k = _k.strip()
                        _v = _v.strip().strip('"').strip("'")
                        if _k:
                            os.environ.setdefault(_k, _v)
            except Exception:
                pass
            break

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_DB_PATH = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "auth_database.sqlite3"))
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", _DEFAULT_DB_PATH)

# Export standard DB exceptions so callers outside db/ do not need to import sqlite3 directly
IntegrityError = sqlite3.IntegrityError
OperationalError = sqlite3.OperationalError
DatabaseError = sqlite3.DatabaseError

_pool: Optional[Any] = None
_sqlite_lock = threading.RLock()

# Multi-Tenant Table Registry for Row-Level Security
TENANT_TABLES: Set[str] = {
    "plants", "memberships", "api_keys", "suppliers", "documents",
    "extraction_runs", "extracted_fields", "mill_certificates", "heat_numbers", "heats",
    "chemistry_results", "mechanical_results", "shipments", "shipment_items",
    "ledger_entries", "outgoing_certificates", "signatures", "dossiers",
    "share_links", "installations", "energy_inputs", "cbam_calculations",
    "rule_results", "supplier_requests", "supplier_responses", "audit_log",
    "notifications", "notification_preferences", "usage_events", "webhooks",
    "subscriptions", "invoices", "auth_refresh_tokens", "background_jobs",
    "mill_chase_requests", "mill_directory"
}

# Ambient tenant context variables for asynchronous and threaded execution
_current_org_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_org_id", default=None)
_is_service_role_var: contextvars.ContextVar[Optional[bool]] = contextvars.ContextVar("is_service_role", default=None)


def set_tenant_context(org_id: Optional[str] = None, is_service_role: Optional[bool] = None):
    """Sets ambient tenant organization ID and service-role privilege for the active context."""
    if org_id is not None and not isinstance(org_id, str):
        org_id = getattr(org_id, "current_org_id", None)
    _current_org_id_var.set(org_id)
    _is_service_role_var.set(is_service_role)


def get_tenant_context() -> Tuple[Optional[str], Optional[bool]]:
    """Returns (current_org_id, is_service_role) for the active execution context."""
    return _current_org_id_var.get(), _is_service_role_var.get()


@contextmanager
def tenant_context(org_id: Optional[str] = None, is_service_role: Optional[bool] = None):
    """Context manager to scope a block of code to a specific tenant organization or service role."""
    prev_org = _current_org_id_var.get()
    prev_sr = _is_service_role_var.get()
    _current_org_id_var.set(org_id)
    _is_service_role_var.set(is_service_role)
    try:
        yield
    finally:
        _current_org_id_var.set(prev_org)
        _is_service_role_var.set(prev_sr)


def is_postgres() -> bool:
    """Returns True if the application is configured to connect to PostgreSQL / Supabase."""
    return bool(DATABASE_URL and (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")))


def get_postgres_pool() -> Optional[Any]:
    """Initializes and returns the singleton psycopg3 ConnectionPool."""
    global _pool
    if not is_postgres() or not HAS_PSYCOPG:
        return None
    if _pool is None:
        with _sqlite_lock:
            if _pool is None:
                dsn = DATABASE_URL
                if dsn.startswith("postgres://"):
                    dsn = "postgresql://" + dsn[len("postgres://"):]
                _pool = ConnectionPool(
                    conninfo=dsn,
                    min_size=int(os.getenv("DB_POOL_MIN_SIZE", "2")),
                    max_size=int(os.getenv("DB_POOL_MAX_SIZE", "20")),
                    kwargs={"row_factory": dict_row},
                    open=True
                )
    return _pool


def _translate_sql(sql: str, is_pg: bool) -> str:
    """Translates placeholder syntax between SQLite (?) and Postgres (%s)."""
    if is_pg:
        return re.sub(r'(?<!\w)\?(?!\w)', '%s', sql)
    else:
        return re.sub(r'%s', '?', sql)


class DBCursorWrapper:
    """Cursor wrapper that transparently adapts placeholders between DB engines and enforces RLS."""
    def __init__(self, raw_cursor: Any, is_pg: bool, org_id: Optional[str] = None, is_service_role: bool = False):
        self._cur = raw_cursor
        self._is_pg = is_pg
        self.org_id = org_id
        self.is_service_role = is_service_role
        self._touches_tenant = False
        self._empty_result = False

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> Any:
        sql_clean = sql.strip()
        sql_upper = sql_clean.upper()

        # Handle SET LOCAL in SQLite mode
        if not self._is_pg and sql_upper.startswith("SET LOCAL APP."):
            m_org = re.search(r'SET\s+LOCAL\s+app\.(?:org_id|current_organization_id)\s*=\s*(.*)', sql_clean, re.IGNORECASE)
            if m_org:
                val = params[0] if (params and len(params) > 0) else m_org.group(1).strip().strip("'\"")
                self.org_id = str(val) if val else None
            m_sr = re.search(r'SET\s+LOCAL\s+app\.is_service_role\s*=\s*(.*)', sql_clean, re.IGNORECASE)
            if m_sr:
                val_sr = params[0] if (params and len(params) > 0) else m_sr.group(1).strip().strip("'\"")
                self.is_service_role = str(val_sr).lower() in ("true", "1")
            return self

        # Determine if query touches any multi-tenant table
        tokens = set(re.findall(r'\b[a-zA-Z_0-9]+\b', sql_clean.lower()))
        self._touches_tenant = bool(tokens.intersection(TENANT_TABLES))

        # In SQLite fallback mode, enforce tenant isolation
        if not self._is_pg and not self.is_service_role and self._touches_tenant:
            if self.org_id is None:
                # Prompt S4 Invariant: "Requests with no context see nothing."
                if not (sql_upper.startswith("CREATE") or sql_upper.startswith("PRAGMA")):
                    if sql_upper.startswith("SELECT"):
                        self._empty_result = True
                        self._cur.execute("SELECT 1 WHERE 1=0")
                        return self
                    elif sql_upper.startswith("INSERT"):
                        raise IntegrityError("RLS Violation: Cannot insert into multi-tenant table without active organization context.")
                    elif sql_upper.startswith(("UPDATE", "DELETE")):
                        self._empty_result = True
                        self._cur.execute("SELECT 1 WHERE 1=0")
                        return self
            else:
                # Active tenant context: enforce tenant boundary on mutations
                safe_org = self.org_id.replace("'", "''") if isinstance(self.org_id, str) else ""
                if sql_upper.startswith("UPDATE"):
                    m_where = re.search(r'\bWHERE\b', sql, flags=re.IGNORECASE)
                    if m_where:
                        idx = m_where.end()
                        sql = f"{sql[:idx]} ({sql[idx:]}) AND organization_id = '{safe_org}'"
                    else:
                        sql = f"{sql} WHERE organization_id = '{safe_org}'"
                    sql_upper = sql.strip().upper()
                elif sql_upper.startswith("DELETE"):
                    m_where = re.search(r'\bWHERE\b', sql, flags=re.IGNORECASE)
                    if m_where:
                        idx = m_where.end()
                        sql = f"{sql[:idx]} ({sql[idx:]}) AND organization_id = '{safe_org}'"
                    else:
                        sql = f"{sql} WHERE organization_id = '{safe_org}'"
                    sql_upper = sql.strip().upper()

        translated_sql = _translate_sql(sql, self._is_pg)
        if params is not None:
            self._cur.execute(translated_sql, params)
        else:
            self._cur.execute(translated_sql)
        self._empty_result = False
        return self

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> Any:
        sql_clean = sql.strip()
        tokens = set(re.findall(r'\b[a-zA-Z_0-9]+\b', sql_clean.lower()))
        self._touches_tenant = bool(tokens.intersection(TENANT_TABLES))

        if not self._is_pg and not self.is_service_role and self._touches_tenant:
            if self.org_id is None and not (sql_clean.upper().startswith("CREATE") or sql_clean.upper().startswith("PRAGMA")):
                raise IntegrityError("RLS Violation: Cannot execute mutations on multi-tenant table without active organization context.")
            elif self.org_id:
                safe_org = self.org_id.replace("'", "''")
                sql_upper = sql_clean.upper()
                if sql_upper.startswith("UPDATE"):
                    m_where = re.search(r'\bWHERE\b', sql, flags=re.IGNORECASE)
                    if m_where:
                        idx = m_where.end()
                        sql = f"{sql[:idx]} ({sql[idx:]}) AND organization_id = '{safe_org}'"
                    else:
                        sql = f"{sql} WHERE organization_id = '{safe_org}'"
                elif sql_upper.startswith("DELETE"):
                    m_where = re.search(r'\bWHERE\b', sql, flags=re.IGNORECASE)
                    if m_where:
                        idx = m_where.end()
                        sql = f"{sql[:idx]} ({sql[idx:]}) AND organization_id = '{safe_org}'"
                    else:
                        sql = f"{sql} WHERE organization_id = '{safe_org}'"

        translated_sql = _translate_sql(sql, self._is_pg)
        self._cur.executemany(translated_sql, seq_of_parameters)
        return self

    def fetchone(self) -> Any:
        if self._empty_result:
            return None
        if not self._is_pg and not self.is_service_role and self._touches_tenant:
            if self.org_id is None:
                return None
            while True:
                row = self._cur.fetchone()
                if row is None:
                    return None
                if hasattr(row, "keys"):
                    keys = row.keys()
                    if "organization_id" in keys:
                        row_org = row["organization_id"]
                        if row_org and row_org != self.org_id:
                            continue
                return row
        return self._cur.fetchone()

    def fetchall(self) -> List[Any]:
        if self._empty_result:
            return []
        rows = self._cur.fetchall()
        if not self._is_pg and not self.is_service_role and self._touches_tenant:
            if self.org_id is None:
                return []
            filtered = []
            for row in rows:
                if hasattr(row, "keys"):
                    keys = row.keys()
                    if "organization_id" in keys:
                        row_org = row["organization_id"]
                        if row_org and row_org != self.org_id:
                            continue
                filtered.append(row)
            return filtered
        return rows

    def fetchmany(self, size: Optional[int] = None) -> List[Any]:
        all_rows = self.fetchall()
        if size is not None:
            return all_rows[:size]
        return all_rows

    @property
    def rowcount(self) -> int:
        if self._empty_result:
            return 0
        return self._cur.rowcount

    @property
    def lastrowid(self) -> Optional[int]:
        return getattr(self._cur, "lastrowid", None)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._cur, name)

    def close(self):
        try:
            self._cur.close()
        except Exception:
            pass

    def __iter__(self):
        return iter(self.fetchall())


class DBConnectionWrapper:
    """
    Unified database connection wrapper providing standard execute, commit,
    and row factory methods across both PostgreSQL (psycopg3) and SQLite.
    Supports tenant context setting, context managers (`with conn:`), and explicit lifecycle (`conn.close()`).
    """
    def __init__(
        self,
        raw_conn: Any,
        is_pg: bool,
        pool: Optional[Any] = None,
        auto_close: bool = True,
        org_id: Optional[str] = None,
        is_service_role: bool = False
    ):
        self._conn = raw_conn
        self._is_pg = is_pg
        self._pool = pool
        self._closed = False
        self._auto_close = auto_close
        ambient_org, ambient_sr = get_tenant_context()
        self.current_org_id = org_id if org_id is not None else ambient_org
        self.is_service_role = is_service_role or ambient_sr

        if self._is_pg:
            try:
                cur = self._conn.cursor()
                if self.current_org_id:
                    cur.execute("SET LOCAL app.org_id = %s;", (self.current_org_id,))
                    cur.execute("SET LOCAL app.current_organization_id = %s;", (self.current_org_id,))
                if self.is_service_role:
                    cur.execute("SET LOCAL app.is_service_role = 'true';")
                cur.close()
            except Exception:
                pass

    @property
    def raw_connection(self) -> Any:
        return self._conn

    def set_tenant_context(self, org_id: Optional[str] = None, is_service_role: bool = False):
        """Updates the tenant context for this connection."""
        self.current_org_id = org_id
        self.is_service_role = is_service_role
        if self._is_pg:
            cur = self._conn.cursor()
            if org_id:
                cur.execute("SET LOCAL app.org_id = %s;", (org_id,))
                cur.execute("SET LOCAL app.current_organization_id = %s;", (org_id,))
            if is_service_role:
                cur.execute("SET LOCAL app.is_service_role = 'true';")
            cur.close()

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> DBCursorWrapper:
        cursor = DBCursorWrapper(
            self._conn.cursor(),
            self._is_pg,
            org_id=self.current_org_id,
            is_service_role=self.is_service_role
        )
        cursor.execute(sql, params)
        if not self._is_pg:
            self.current_org_id = cursor.org_id
            self.is_service_role = cursor.is_service_role
        return cursor

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> DBCursorWrapper:
        cursor = DBCursorWrapper(
            self._conn.cursor(),
            self._is_pg,
            org_id=self.current_org_id,
            is_service_role=self.is_service_role
        )
        cursor.executemany(sql, seq_of_parameters)
        return cursor

    def commit(self):
        try:
            self._conn.commit()
        except Exception:
            pass

    def rollback(self):
        try:
            self._conn.rollback()
        except Exception:
            pass

    def cursor(self) -> DBCursorWrapper:
        return DBCursorWrapper(
            self._conn.cursor(),
            self._is_pg,
            org_id=self.current_org_id,
            is_service_role=self.is_service_role
        )

    @property
    def row_factory(self) -> Any:
        return getattr(self._conn, "row_factory", None)

    @row_factory.setter
    def row_factory(self, factory: Any):
        if hasattr(self._conn, "row_factory"):
            self._conn.row_factory = factory

    def __getattr__(self, name: str) -> Any:
        return getattr(self._conn, name)

    def close(self):
        if not self._closed:
            self._closed = True
            if self._is_pg and self._pool is not None:
                self._pool.putconn(self._conn)
            else:
                try:
                    self._conn.close()
                except Exception:
                    pass

    def __enter__(self) -> "DBConnectionWrapper":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        try:
            if exc_type is not None:
                self.rollback()
            else:
                self.commit()
        finally:
            if self._auto_close:
                self.close()


def get_db_connection(
    target_path: Optional[str] = None,
    auto_close: bool = True,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None
) -> DBConnectionWrapper:
    """
    Acquires a unified database connection from the psycopg3 pool or SQLite fallback.
    Can be used both as a context manager:
        with get_db_connection(org_id=org_id) as conn:
            conn.execute(...)
    and as an explicit connection object:
        conn = get_db_connection(auto_close=False)
        cursor = conn.cursor()
        conn.close()
    """
    ambient_org, ambient_sr = get_tenant_context()
    effective_org = org_id if org_id is not None else ambient_org
    if is_service_role is not None:
        effective_sr = is_service_role
    elif ambient_sr is not None:
        effective_sr = ambient_sr
    elif effective_org is not None:
        effective_sr = False
    else:
        effective_sr = True

    if is_postgres() and HAS_PSYCOPG:
        pool = get_postgres_pool()
        if pool is not None:
            pg_conn = pool.getconn()
            return DBConnectionWrapper(
                pg_conn,
                is_pg=True,
                pool=pool,
                auto_close=auto_close,
                org_id=effective_org,
                is_service_role=effective_sr
            )

    # SQLite fallback
    path = target_path or SQLITE_DB_PATH
    conn = sqlite3.connect(path, timeout=30.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
    except Exception:
        pass
    return DBConnectionWrapper(
        conn,
        is_pg=False,
        auto_close=auto_close,
        org_id=effective_org,
        is_service_role=effective_sr
    )


def query_all(
    sql: str,
    params: Optional[Union[Tuple, List]] = None,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None
) -> List[Dict[str, Any]]:
    """Executes a query and returns all rows as a list of dicts."""
    with get_db_connection(org_id=org_id, is_service_role=is_service_role) as db:
        cur = db.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def query_one(
    sql: str,
    params: Optional[Union[Tuple, List]] = None,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None
) -> Optional[Dict[str, Any]]:
    """Executes a query and returns a single row as a dict, or None."""
    with get_db_connection(org_id=org_id, is_service_role=is_service_role) as db:
        cur = db.execute(sql, params)
        row = cur.fetchone()
        if row is None:
            return None
        return dict(row)


def execute_mutation(
    sql: str,
    params: Optional[Union[Tuple, List]] = None,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None
) -> int:
    """Executes an INSERT, UPDATE, or DELETE mutation and returns rowcount."""
    with get_db_connection(org_id=org_id, is_service_role=is_service_role) as db:
        cur = db.execute(sql, params)
        return cur.rowcount


# Alias for dependency injection and tests
get_db = get_db_connection
