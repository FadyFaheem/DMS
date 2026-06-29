"""Tests for middleware decorators: require_auth, require_admin, require_permission."""

import os
import jwt
from datetime import datetime, timezone, timedelta


def _make_jwt(payload_overrides=None):
    secret = os.getenv('JWT_SECRET_KEY', 'test-secret')
    now = datetime.now(timezone.utc)
    payload = {
        'type': 'access', 'sub': '1', 'username': 'testuser',
        'role': 'admin', 'is_admin': True,
        'permissions': {'full_access': True},
        'iat': now, 'exp': now + timedelta(hours=1),
    }
    if payload_overrides:
        payload.update(payload_overrides)
    return jwt.encode(payload, secret, algorithm='HS256')


class TestRequireAuth:
    def test_missing_header(self, client):
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401
        assert 'authorization' in resp.get_json()['error'].lower()

    def test_malformed_header(self, client):
        resp = client.get('/api/auth/me', headers={'Authorization': 'Basic xyz'})
        assert resp.status_code == 401

    def test_expired_token(self, client):
        secret = os.getenv('JWT_SECRET_KEY', 'test-secret')
        now = datetime.now(timezone.utc)
        token = jwt.encode({
            'type': 'access', 'sub': '1', 'username': 'x', 'role': 'admin',
            'permissions': {}, 'iat': now, 'exp': now - timedelta(hours=1),
        }, secret, algorithm='HS256')
        resp = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {token}',
        })
        assert resp.status_code == 401

    def test_refresh_token_rejected_for_access_route(self, client):
        secret = os.getenv('JWT_SECRET_KEY', 'test-secret')
        now = datetime.now(timezone.utc)
        token = jwt.encode({
            'type': 'refresh', 'sub': '1',
            'iat': now, 'exp': now + timedelta(hours=1),
        }, secret, algorithm='HS256')
        resp = client.get('/api/auth/me', headers={
            'Authorization': f'Bearer {token}',
        })
        assert resp.status_code == 401
        assert 'token type' in resp.get_json()['error'].lower()


class TestRequireAdmin:
    def test_non_admin_blocked(self, client, user_auth_headers):
        resp = client.get('/api/auth/users', headers=user_auth_headers)
        assert resp.status_code == 403
        assert 'admin' in resp.get_json()['error'].lower()

    def test_admin_allowed(self, client, auth_headers):
        from unittest.mock import patch
        with patch('auth.query') as mq:
            mq.return_value = []
            resp = client.get('/api/auth/users', headers=auth_headers)
        assert resp.status_code == 200

    def test_super_admin_allowed(self, client):
        token = _make_jwt({'role': 'super_admin'})
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        from unittest.mock import patch
        with patch('auth.query') as mq:
            mq.return_value = []
            resp = client.get('/api/auth/users', headers=headers)
        assert resp.status_code == 200
