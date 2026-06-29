"""Database helpers: connection pool, query helpers, and migration runner."""

import os
import re
import glob
from contextlib import contextmanager
from datetime import date, datetime
import logging

import psycopg2
import psycopg2.extras
import psycopg2.pool

logger = logging.getLogger(__name__)

MIGRATIONS_DIR = os.getenv('MIGRATIONS_DIR', '/migrations')

_pool = None


def _require_env(key):
    val = os.getenv(key)
    if not val:
        raise RuntimeError(f"Required environment variable {key} is not set")
    return val


def _get_pool():
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=_require_env('DB_HOST'),
            port=int(os.getenv('DB_PORT', '5432')),
            dbname=_require_env('DB_NAME'),
            user=_require_env('DB_USER'),
            password=_require_env('DB_PASSWORD'),
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
    return _pool


def get_db_connection():
    """Returns a connection from the pool."""
    return _get_pool().getconn()


def release_connection(conn):
    """Return a connection to the pool."""
    try:
        _get_pool().putconn(conn)
    except Exception:
        pass


@contextmanager
def transaction():
    """Context manager for multi-statement transactions.

    Usage:
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute(...)
                cur.execute(...)
    Commits on success, rolls back on exception, returns conn to pool.
    """
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


def query(sql, params=None, *, fetch_one=False):
    """Execute a read query and return results.

    Returns a list of RealDictRow (or a single row when fetch_one=True).
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchone() if fetch_one else cur.fetchall()
    finally:
        release_connection(conn)


def execute(sql, params=None, *, returning=False):
    """Execute a write query (INSERT/UPDATE/DELETE). Optionally returns rows."""
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            result = cur.fetchone() if returning else None
            conn.commit()
            return result
    except Exception:
        conn.rollback()
        raise
    finally:
        release_connection(conn)


def iso_utc(val):
    """Format a datetime/date as an ISO string. Naive datetimes get a Z suffix."""
    if val is None:
        return None
    if isinstance(val, datetime):
        s = val.isoformat()
        if val.tzinfo is None:
            s += 'Z'
        return s
    if isinstance(val, date):
        return val.isoformat()
    return val


def _strip_psql_meta(sql_text):
    """Remove psql meta-commands (\\echo, \\set, etc.) that aren't valid SQL."""
    return re.sub(r'^\\[a-zA-Z].*$', '', sql_text, flags=re.MULTILINE)


def run_migrations():
    """Apply pending SQL migrations from MIGRATIONS_DIR.

    Skips 000-prefixed files (those run as Postgres init mounts on first DB
    startup). Tracks applied versions in the schema_migrations table.
    """
    if not os.path.isdir(MIGRATIONS_DIR):
        logger.info("Migrations directory %s not found, skipping", MIGRATIONS_DIR)
        return

    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version VARCHAR(255) PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

            cur.execute("SELECT version FROM schema_migrations")
            applied = {row['version'] for row in cur.fetchall()}

        files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, '*.sql')))
        pending = []
        for filepath in files:
            filename = os.path.basename(filepath)
            if filename.startswith('000'):
                continue
            version = filename.replace('.sql', '')
            if version not in applied:
                pending.append((version, filepath))

        if not pending:
            logger.info("Database is up to date, no new migrations")
            return

        for version, filepath in pending:
            logger.info("Applying migration: %s", version)
            with open(filepath, 'r') as f:
                raw_sql = f.read()
            sql = _strip_psql_meta(raw_sql)
            conn2 = get_db_connection()
            try:
                with conn2.cursor() as cur2:
                    cur2.execute(sql)
                    conn2.commit()
                logger.info("Migration %s applied", version)
            except Exception:
                conn2.rollback()
                logger.exception("Migration %s FAILED", version)
                raise
            finally:
                release_connection(conn2)

        logger.info("All %d pending migration(s) applied", len(pending))
    finally:
        release_connection(conn)
