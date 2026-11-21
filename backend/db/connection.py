# ============================================================================
# HEATLEDGER AI: Unified Database Connection & Pool Layer (Prompt S3)
#
# Connection Pool Architecture: Psycopg 3 ConnectionPool
# 1. Native client-side pooling with thread-safe acquire/release semantics and automatic reconnection.
# 2. Native PostgreSQL binary protocol support, zero-ORM overhead for raw SQL execution and high throughput.
# 3. Transparent local development fallback to SQLite connection pooling when DATABASE_URL is not set.
# ============================================================================

import os
import re
import sqlite3
import threading
from typing import Any, Dict, Generator, List, Optional, Tuple, Union

try:
    import psycopg
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool
    HAS_PSYCOPG = True
except ImportError:
    HAS_PSYCOPG = False
    ConnectionPool = None

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", os.path.join(BASE_DIR, "auth_database.sqlite3"))

# Export standard DB exceptions so callers outside db/ do not need to import sqlite3 directly
IntegrityError = sqlite3.IntegrityError
OperationalError = sqlite3.OperationalError
DatabaseError = sqlite3.DatabaseError

_pool: Optional[Any] = None
_sqlite_lock = threading.RLock()


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
    """Cursor wrapper that transparently adapts placeholders between DB engines."""
    def __init__(self, raw_cursor: Any, is_pg: bool):
        self._cur = raw_cursor
        self._is_pg = is_pg

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> Any:
        sql = _translate_sql(sql, self._is_pg)
        if params is not None:
            self._cur.execute(sql, params)
        else:
            self._cur.execute(sql)
        return self

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> Any:
        sql = _translate_sql(sql, self._is_pg)
        self._cur.executemany(sql, seq_of_parameters)
        return self

    def fetchone(self) -> Any:
        return self._cur.fetchone()

    def fetchall(self) -> List[Any]:
        return self._cur.fetchall()

    def fetchmany(self, size: Optional[int] = None) -> List[Any]:
        return self._cur.fetchmany(size) if size else self._cur.fetchmany()

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
        return iter(self._cur)


class DBConnectionWrapper:
    """
    Unified database connection wrapper providing standard execute, commit,
    and row factory methods across both PostgreSQL (psycopg3) and SQLite.
    Supports both context manager syntax (`with conn:`) and explicit lifecycle (`conn.close()`).
    """
    def __init__(self, raw_conn: Any, is_pg: bool, pool: Optional[Any] = None, auto_close: bool = True):
        self._conn = raw_conn
        self._is_pg = is_pg
        self._pool = pool
        self._closed = False
        self._auto_close = auto_close

    @property
    def raw_connection(self) -> Any:
        return self._conn

    def execute(self, sql: str, params: Optional[Union[Tuple, List, Dict]] = None) -> DBCursorWrapper:
        translated_sql = _translate_sql(sql, self._is_pg)
        cursor = self._conn.cursor()
        if params is not None:
            cursor.execute(translated_sql, params)
        else:
            cursor.execute(translated_sql)
        return DBCursorWrapper(cursor, self._is_pg)

    def executemany(self, sql: str, seq_of_parameters: List[Any]) -> DBCursorWrapper:
        translated_sql = _translate_sql(sql, self._is_pg)
        cursor = self._conn.cursor()
        cursor.executemany(translated_sql, seq_of_parameters)
        return DBCursorWrapper(cursor, self._is_pg)

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
        return DBCursorWrapper(self._conn.cursor(), self._is_pg)

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


def get_db_connection(target_path: Optional[str] = None, auto_close: bool = True) -> DBConnectionWrapper:
    """
    Acquires a unified database connection from the psycopg3 pool or SQLite fallback.
    Can be used both as a context manager:
        with get_db_connection() as conn:
            conn.execute(...)
    and as an explicit connection object:
        conn = get_db_connection(auto_close=False)
        cursor = conn.cursor()
        conn.close()
    """
    if is_postgres() and HAS_PSYCOPG:
        pool = get_postgres_pool()
        if pool is not None:
            pg_conn = pool.getconn()
            return DBConnectionWrapper(pg_conn, is_pg=True, pool=pool, auto_close=auto_close)

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
    return DBConnectionWrapper(conn, is_pg=False, auto_close=auto_close)


def query_all(sql: str, params: Optional[Union[Tuple, List]] = None) -> List[Dict[str, Any]]:
    """Executes a query and returns all rows as a list of dicts."""
    with get_db_connection() as db:
        cur = db.execute(sql, params)
        rows = cur.fetchall()
        return [dict(r) for r in rows]


def query_one(sql: str, params: Optional[Union[Tuple, List]] = None) -> Optional[Dict[str, Any]]:
    """Executes a query and returns a single row as a dict, or None."""
    with get_db_connection() as db:
        cur = db.execute(sql, params)
        row = cur.fetchone()
        if row is None:
            return None
        return dict(row)


def execute_mutation(sql: str, params: Optional[Union[Tuple, List]] = None) -> int:
    """Executes an INSERT, UPDATE, or DELETE mutation and returns rowcount."""
    with get_db_connection() as db:
        cur = db.execute(sql, params)
        return cur.rowcount
