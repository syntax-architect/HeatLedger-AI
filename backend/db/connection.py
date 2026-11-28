# ============================================================================
# HEATLEDGER AI: PostgreSQL Connection & Pool Layer (Task 2.1 - Postgres Only)
#
# Connection Pool Architecture: Psycopg 3 ConnectionPool
# 1. Native client-side pooling with thread-safe acquire/release semantics.
# 2. Native PostgreSQL binary protocol support with dict_row factory.
# 3. Supports isolated ephemeral PostgreSQL schemas in TEST mode (PG_TEST_SCHEMA).
# ============================================================================

import contextvars
import os
import re
import threading
from contextlib import contextmanager
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import psycopg
from psycopg.errors import DatabaseError, IntegrityError, OperationalError
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

__all__ = [
    "DatabaseError",
    "IntegrityError",
    "OperationalError",
    "TENANT_TABLES",
    "DBConnectionWrapper",
    "DBCursorWrapper",
    "get_db",
    "get_db_connection",
    "get_postgres_pool",
    "reset_postgres_pool",
    "is_postgres",
    "set_tenant_context",
    "get_tenant_context",
    "tenant_context",
    "query_all",
    "query_one",
    "execute_mutation",
]

_pool_lock = threading.RLock()
_pool: Optional[ConnectionPool] = None
_pool_dsn: Optional[str] = None
_pool_schema: Optional[str] = None

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

_VALID_SCHEMA_RE = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,62}$")


def _get_database_url() -> str:
    dsn = os.getenv("DATABASE_URL", "").strip()
    if not dsn:
        env = os.getenv("ENV", "development").strip().lower()
        in_test = env in ("test", "testing") or bool(os.getenv("PYTEST_CURRENT_TEST"))
        if in_test:
            dsn = os.getenv("TEST_DATABASE_URL", "").strip()
    if not dsn or not (dsn.startswith("postgres://") or dsn.startswith("postgresql://")):
        raise RuntimeError(
            "DATABASE_URL must be configured as a PostgreSQL URI (postgresql://...)."
        )
    if dsn.startswith("postgres://"):
        dsn = "postgresql://" + dsn[len("postgres://"):]
    return dsn


def _get_test_schema() -> Optional[str]:
    schema = os.getenv("PG_TEST_SCHEMA", "").strip()
    if not schema:
        return None
    if not _VALID_SCHEMA_RE.match(schema):
        raise ValueError(f"Invalid PG_TEST_SCHEMA identifier: {schema!r}")
    return schema


def set_tenant_context(org_id: Optional[str] = None, is_service_role: Optional[bool] = None):
    """Sets ambient tenant organization ID and service-role privilege for the active context."""
    if org_id is not None and not isinstance(org_id, str):
        raise TypeError(f"org_id must be str or None, got {type(org_id).__name__}")
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
    """Returns True when PostgreSQL DATABASE_URL is configured."""
    dsn = os.getenv("DATABASE_URL", "").strip() or os.getenv("TEST_DATABASE_URL", "").strip()
    return bool(dsn and (dsn.startswith("postgres://") or dsn.startswith("postgresql://")))


def reset_postgres_pool() -> None:
    """Closes and clears the singleton connection pool (used when switching test schemas)."""
    global _pool, _pool_dsn, _pool_schema
    with _pool_lock:
        if _pool is not None:
            try:
                _pool.close()
            except Exception:
                pass
            _pool = None
        _pool_dsn = None
        _pool_schema = None


def get_postgres_pool() -> ConnectionPool:
    """Initializes and returns the singleton psycopg3 ConnectionPool."""
    global _pool, _pool_dsn, _pool_schema
    dsn = _get_database_url()
    test_schema = _get_test_schema()
    with _pool_lock:
        if _pool is not None and (_pool_dsn != dsn or _pool_schema != test_schema):
            try:
                _pool.close()
            except Exception:
                pass
            _pool = None
        if _pool is None:
            def _configure_conn(conn: psycopg.Connection) -> None:
                if test_schema:
                    with conn.cursor() as cur:
                        cur.execute(f"SET search_path TO {test_schema}")
                    conn.commit()

            _pool = ConnectionPool(
                conninfo=dsn,
                min_size=int(os.getenv("DB_POOL_MIN_SIZE", "2")),
                max_size=int(os.getenv("DB_POOL_MAX_SIZE", "20")),
                kwargs={"row_factory": dict_row},
                configure=_configure_conn if test_schema else None,
                open=True,
            )
            _pool_dsn = dsn
            _pool_schema = test_schema
    return _pool


class DBCursorWrapper:
    """Thin psycopg3 cursor wrapper preserving standard DB-API helpers."""
    def __init__(self, raw_cursor: Any):
        self._cur = raw_cursor

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> "DBCursorWrapper":
        if params is not None:
            self._cur.execute(sql, params)
        else:
            self._cur.execute(sql)
        return self

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> "DBCursorWrapper":
        self._cur.executemany(sql, seq_of_parameters)
        return self

    def fetchone(self) -> Any:
        return self._cur.fetchone()

    def fetchall(self) -> List[Any]:
        return self._cur.fetchall()

    def fetchmany(self, size: Optional[int] = None) -> List[Any]:
        if size is not None:
            return self._cur.fetchmany(size)
        return self._cur.fetchall()

    @property
    def rowcount(self) -> int:
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
    PostgreSQL connection wrapper providing standard execute, commit,
    tenant RLS session configuration, context manager, and pool return.
    """
    def __init__(
        self,
        raw_conn: Any,
        pool: Optional[ConnectionPool] = None,
        auto_close: bool = True,
        org_id: Optional[str] = None,
        is_service_role: bool = False,
    ):
        self._conn = raw_conn
        self._pool = pool
        self._closed = False
        self._auto_close = auto_close
        ambient_org, ambient_sr = get_tenant_context()
        self.current_org_id = org_id if org_id is not None else ambient_org
        self.is_service_role = bool(is_service_role or ambient_sr)

        if self.current_org_id or self.is_service_role:
            try:
                cur = self._conn.cursor()
                if self.current_org_id and self.is_service_role:
                    cur.execute(
                        "SELECT set_config('app.org_id', %s, true), set_config('app.current_organization_id', %s, true), set_config('app.is_service_role', 'true', true)",
                        (self.current_org_id, self.current_org_id),
                    )
                elif self.current_org_id:
                    cur.execute(
                        "SELECT set_config('app.org_id', %s, true), set_config('app.current_organization_id', %s, true)",
                        (self.current_org_id, self.current_org_id),
                    )
                else:
                    cur.execute("SELECT set_config('app.is_service_role', 'true', true)")
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
        cur = self._conn.cursor()
        if org_id:
            cur.execute("SET LOCAL app.org_id = %s;", (org_id,))
            cur.execute("SET LOCAL app.current_organization_id = %s;", (org_id,))
        if is_service_role:
            cur.execute("SET LOCAL app.is_service_role = 'true';")
        cur.close()

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> DBCursorWrapper:
        cursor = DBCursorWrapper(self._conn.cursor())
        cursor.execute(sql, params)
        return cursor

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> DBCursorWrapper:
        cursor = DBCursorWrapper(self._conn.cursor())
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
        return DBCursorWrapper(self._conn.cursor())

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
            if self._pool is not None:
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
    auto_close: bool = True,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None,
) -> DBConnectionWrapper:
    """
    Acquires a PostgreSQL connection from the psycopg3 ConnectionPool.
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

    pool = get_postgres_pool()
    pg_conn = pool.getconn()
    return DBConnectionWrapper(
        pg_conn,
        pool=pool,
        auto_close=auto_close,
        org_id=effective_org,
        is_service_role=effective_sr,
    )


def query_all(
    sql: str,
    params: Optional[Union[Tuple, List]] = None,
    org_id: Optional[str] = None,
    is_service_role: Optional[bool] = None,
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
    is_service_role: Optional[bool] = None,
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
    is_service_role: Optional[bool] = None,
) -> int:
    """Executes an INSERT, UPDATE, or DELETE mutation and returns rowcount."""
    with get_db_connection(org_id=org_id, is_service_role=is_service_role) as db:
        cur = db.execute(sql, params)
        return cur.rowcount


# Alias for dependency injection and tests
get_db = get_db_connection
