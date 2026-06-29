"""Pytest configuration for API tests.

Tests run against the Flask app with all DB calls mocked. No live database
required. To add tests for a new module:

    1. Import the module
    2. Use the `client` fixture for HTTP requests
    3. Use `auth_headers` for admin-authenticated requests, or build a
       custom JWT with `_make_jwt({...})` for non-admin / specific-permission
       scenarios
    4. Patch `<module>.query` / `<module>.execute` to return canned data
"""

import os
import sys
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock
from types import ModuleType

import pytest

# Stub psycopg2 if it isn't installed -- API tests mock all DB calls anyway,
# so the real driver doesn't need to load.
if 'psycopg2' not in sys.modules:
    _pg = ModuleType('psycopg2')
    _pg.connect = MagicMock()
    _pg_extras = ModuleType('psycopg2.extras')
    _pg_extras.RealDictCursor = object
    _pg_extras.Json = lambda v: v
    _pg.extras = _pg_extras
    _pg_pool = ModuleType('psycopg2.pool')
    _pg_pool.ThreadedConnectionPool = MagicMock()
    _pg.pool = _pg_pool
    sys.modules['psycopg2'] = _pg
    sys.modules['psycopg2.extras'] = _pg_extras
    sys.modules['psycopg2.pool'] = _pg_pool

# Make the api/ directory importable so test files can `import app, auth, ...`.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('SECRET_KEY', 'test-secret')
os.environ.setdefault('JWT_SECRET_KEY', 'test-secret')
os.environ.setdefault('DB_HOST', 'localhost')
os.environ.setdefault('DB_PORT', '5432')
os.environ.setdefault('DB_NAME', 'test_db')
os.environ.setdefault('DB_USER', 'postgres')
os.environ.setdefault('DB_PASSWORD', 'postgres')
os.environ.setdefault('MIGRATIONS_DIR', '/nonexistent')


@pytest.fixture()
def app():
    """Flask app with migrations disabled.

    The /health route is registered on the module-level `app` object in
    app.py, so we import that object directly. We reload to pick up env vars
    set above on first import.
    """
    with patch('db.run_migrations'):
        import app as app_module
        import importlib
        importlib.reload(app_module)
        application = app_module.app
        application.config['TESTING'] = True
        yield application


@pytest.fixture()
def client(app):
    """Flask test client."""
    return app.test_client()


def _make_jwt(payload_overrides=None):
    """Generate a valid access JWT for testing."""
    secret = os.getenv('JWT_SECRET_KEY', 'test-secret')
    now = datetime.now(timezone.utc)
    payload = {
        'type': 'access',
        'sub': '1',
        'username': 'testuser',
        'role': 'admin',
        'is_admin': True,
        'permissions': {'full_access': True},
        'iat': now,
        'exp': now + timedelta(hours=1),
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(payload, secret, algorithm='HS256')


@pytest.fixture()
def auth_headers():
    """Authorization headers with an admin JWT."""
    token = _make_jwt()
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


@pytest.fixture()
def user_auth_headers():
    """Authorization headers with a non-admin JWT with no permissions."""
    token = _make_jwt({
        'role': 'user',
        'is_admin': False,
        'permissions': {},
    })
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


@pytest.fixture()
def mock_db():
    """Patch db.query and db.execute to return controlled data.

    Usage:
        def test_thing(client, auth_headers, mock_db):
            mock_db['query'].return_value = [{'id': 1}]
            ...
    """
    with patch('db.query') as mq, \
         patch('db.execute') as me, \
         patch('db.get_db_connection') as mc:
        conn = MagicMock()
        mc.return_value = conn
        yield {'query': mq, 'execute': me, 'get_connection': mc, 'conn': conn}


SAMPLE_USER = {
    'id': 1,
    'username': 'testuser',
    'email': 'test@example.com',
    'role': 'admin',
    'permissions': '{"full_access": true}',
    'is_admin': True,
    'is_active': True,
    'password_hash': '$argon2id$v=19$m=65536,t=3,p=4$placeholder',
    'created_at': datetime(2026, 1, 1, tzinfo=timezone.utc),
    'updated_at': datetime(2026, 1, 1, tzinfo=timezone.utc),
}
