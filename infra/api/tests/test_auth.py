"""Tests for the auth blueprint: login, refresh, me."""

from unittest.mock import patch
from tests.conftest import SAMPLE_USER


class TestLogin:
    def test_missing_credentials(self, client):
        resp = client.post('/api/auth/login', json={})
        assert resp.status_code == 400

    def test_invalid_user(self, client):
        with patch('auth.query') as mq:
            mq.return_value = None
            resp = client.post('/api/auth/login', json={
                'username': 'nobody', 'password': 'whatever',
            })
        assert resp.status_code == 401

    def test_invalid_password(self, client):
        from argon2 import PasswordHasher
        user_row = {
            **SAMPLE_USER,
            'password_hash': PasswordHasher().hash('correct-password'),
        }
        with patch('auth.query') as mq:
            mq.return_value = user_row
            resp = client.post('/api/auth/login', json={
                'username': 'testuser', 'password': 'wrong-password',
            })
        assert resp.status_code == 401

    def test_successful_login_returns_tokens(self, client):
        from argon2 import PasswordHasher
        user_row = {
            **SAMPLE_USER,
            'password_hash': PasswordHasher().hash('correct-password'),
        }
        with patch('auth.query') as mq, patch('auth.execute'):
            mq.return_value = user_row
            resp = client.post('/api/auth/login', json={
                'username': 'testuser', 'password': 'correct-password',
            })
        assert resp.status_code == 200
        data = resp.get_json()
        assert 'access_token' in data
        assert 'refresh_token' in data
        assert data['user']['username'] == 'testuser'
        assert data['user']['is_admin'] is True


class TestMe:
    def test_unauthenticated_blocked(self, client):
        resp = client.get('/api/auth/me')
        assert resp.status_code == 401

    def test_returns_current_user(self, client, auth_headers):
        with patch('auth.query') as mq:
            mq.return_value = SAMPLE_USER
            resp = client.get('/api/auth/me', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.get_json()
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert 'password_hash' not in data
