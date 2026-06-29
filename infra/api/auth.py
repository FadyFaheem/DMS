"""Authentication blueprint: login, refresh, logout, me, change-password.

Plus a minimal admin user CRUD: list, create, delete.

This module is intentionally lean. Common add-ons (2FA/TOTP, account
lockout after N failed attempts, password-reset enforcement, IP rate
limiting, audit logging) are documented in CLAUDE.md and can be added
per-project.
"""

import os
import json
import jwt
import logging
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, g
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from db import query, execute, iso_utc
from middleware import require_auth, require_admin, is_admin_role

logger = logging.getLogger(__name__)
ph = PasswordHasher()

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

ACCESS_EXPIRY_MINUTES = int(os.getenv('JWT_ACCESS_EXPIRY', 15))
REFRESH_EXPIRY_DAYS = int(os.getenv('JWT_REFRESH_EXPIRY', 7))
# Hard cap on total session length (from initial login). Even if refresh
# tokens keep rolling, after this the user must log in again.
SESSION_MAX_DAYS = int(os.getenv('SESSION_MAX_DAYS', 30))


def _jwt_secret():
    from flask import current_app
    return current_app.config['JWT_SECRET_KEY']


def _create_tokens(user, session_exp_ts=None):
    """Mint a fresh access/refresh pair.

    session_exp_ts: optional unix timestamp (seconds) for the hard session
    expiry. If not provided, the session starts now and lasts SESSION_MAX_DAYS.
    On refresh, the caller forwards the existing session_exp_ts so the cap
    is preserved across refreshes.
    """
    now = datetime.now(timezone.utc)
    is_admin = bool(user.get('is_admin')) or is_admin_role(user.get('role', ''))

    if session_exp_ts is None:
        session_exp = now + timedelta(days=SESSION_MAX_DAYS)
    else:
        session_exp = datetime.fromtimestamp(int(session_exp_ts), tz=timezone.utc)

    access_exp = min(now + timedelta(minutes=ACCESS_EXPIRY_MINUTES), session_exp)
    refresh_exp = min(now + timedelta(days=REFRESH_EXPIRY_DAYS), session_exp)
    session_exp_int = int(session_exp.timestamp())

    perms = user.get('permissions') or {}
    if isinstance(perms, str):
        try:
            perms = json.loads(perms)
        except json.JSONDecodeError:
            perms = {}

    user_id = str(user['id'])
    access_payload = {
        'type': 'access',
        'sub': user_id,
        'username': user['username'],
        'role': user['role'],
        'is_admin': is_admin,
        'permissions': perms,
        'iat': now,
        'exp': access_exp,
        'session_exp': session_exp_int,
    }
    refresh_payload = {
        'type': 'refresh',
        'sub': user_id,
        'iat': now,
        'exp': refresh_exp,
        'session_exp': session_exp_int,
    }

    access_token = jwt.encode(access_payload, _jwt_secret(), algorithm='HS256')
    refresh_token = jwt.encode(refresh_payload, _jwt_secret(), algorithm='HS256')

    expires_in = max(int((access_exp - now).total_seconds()), 0)
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'expires_in': expires_in,
    }


def _user_response(user):
    """Sanitize a user row for API output (no password hash)."""
    is_admin = bool(user.get('is_admin')) or is_admin_role(user.get('role', ''))

    perms = user.get('permissions') or {}
    if isinstance(perms, str):
        try:
            perms = json.loads(perms)
        except json.JSONDecodeError:
            perms = {}

    return {
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'is_admin': is_admin,
        'is_active': user['is_active'],
        'permissions': perms,
        'created_at': iso_utc(user['created_at']),
        'updated_at': iso_utc(user['updated_at']),
    }


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = query(
        "SELECT * FROM users WHERE username = %s AND is_active = TRUE",
        (username,),
        fetch_one=True,
    )
    if user is None:
        return jsonify({'error': 'Invalid credentials'}), 401

    try:
        ph.verify(user['password_hash'], password)
    except VerifyMismatchError:
        return jsonify({'error': 'Invalid credentials'}), 401

    if ph.check_needs_rehash(user['password_hash']):
        execute(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (ph.hash(password), user['id']),
        )

    tokens = _create_tokens(user)
    return jsonify({**tokens, 'user': _user_response(user)}), 200


# ---------------------------------------------------------------------------
# POST /api/auth/refresh
# ---------------------------------------------------------------------------
@auth_bp.route('/refresh', methods=['POST'])
def refresh():
    data = request.get_json(silent=True) or {}
    refresh_token = data.get('refresh_token', '')

    if not refresh_token:
        return jsonify({'error': 'Refresh token is required'}), 400

    try:
        payload = jwt.decode(refresh_token, _jwt_secret(), algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError) as e:
        logger.warning("Refresh token decode failed: %s", e)
        return jsonify({'error': 'Invalid or expired refresh token'}), 401

    if payload.get('type') != 'refresh':
        return jsonify({'error': 'Invalid token type'}), 401

    now_ts = int(datetime.now(timezone.utc).timestamp())
    session_exp_ts = payload.get('session_exp')
    if session_exp_ts is None:
        iat = payload.get('iat')
        if iat is None:
            return jsonify({'error': 'Session expired, please log in again'}), 401
        session_exp_ts = int(iat) + SESSION_MAX_DAYS * 86400

    if int(session_exp_ts) <= now_ts:
        return jsonify({'error': 'Session expired, please log in again'}), 401

    user = query(
        "SELECT * FROM users WHERE id = %s AND is_active = TRUE",
        (payload['sub'],),
        fetch_one=True,
    )
    if user is None:
        return jsonify({'error': 'User not found or inactive'}), 401

    tokens = _create_tokens(user, session_exp_ts=session_exp_ts)
    return jsonify({**tokens, 'user': _user_response(user)}), 200


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------
@auth_bp.route('/me', methods=['GET'])
@require_auth
def me():
    user = query(
        "SELECT * FROM users WHERE id = %s",
        (g.current_user['sub'],),
        fetch_one=True,
    )
    if user is None:
        return jsonify({'error': 'User not found'}), 404
    return jsonify(_user_response(user)), 200


# ---------------------------------------------------------------------------
# POST /api/auth/change-password
# ---------------------------------------------------------------------------
@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if not current_password or not new_password:
        return jsonify({'error': 'Current and new password are required'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'New password must be at least 8 characters'}), 400

    user = query(
        "SELECT * FROM users WHERE id = %s",
        (g.current_user['sub'],),
        fetch_one=True,
    )
    if user is None:
        return jsonify({'error': 'User not found'}), 404

    try:
        ph.verify(user['password_hash'], current_password)
    except VerifyMismatchError:
        return jsonify({'error': 'Current password is incorrect'}), 401

    execute(
        "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
        (ph.hash(new_password), user['id']),
    )
    return jsonify({'message': 'Password changed successfully'}), 200


# ---------------------------------------------------------------------------
# GET /api/auth/users  (admin only)
# ---------------------------------------------------------------------------
@auth_bp.route('/users', methods=['GET'])
@require_auth
@require_admin
def list_users():
    users = query("SELECT * FROM users ORDER BY id")
    return jsonify([_user_response(u) for u in users]), 200


# ---------------------------------------------------------------------------
# POST /api/auth/users  (admin only)
# ---------------------------------------------------------------------------
@auth_bp.route('/users', methods=['POST'])
@require_auth
@require_admin
def create_user():
    data = request.get_json(silent=True) or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'user').strip()
    permissions = data.get('permissions', {})

    if not username or not email or not password:
        return jsonify({'error': 'Username, email, and password are required'}), 400
    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    if role == 'super_admin':
        return jsonify({'error': 'super_admin is reserved'}), 403

    existing = query(
        "SELECT id FROM users WHERE username = %s OR email = %s",
        (username, email),
        fetch_one=True,
    )
    if existing:
        return jsonify({'error': 'Username or email already exists'}), 409

    is_admin_flag = is_admin_role(role)
    user = execute(
        """INSERT INTO users (username, email, password_hash, role, permissions, is_admin)
           VALUES (%s, %s, %s, %s, %s, %s)
           RETURNING *""",
        (username, email, ph.hash(password), role, json.dumps(permissions), is_admin_flag),
        returning=True,
    )
    return jsonify(_user_response(user)), 201


# ---------------------------------------------------------------------------
# DELETE /api/auth/users/<id>  (admin only)
# ---------------------------------------------------------------------------
@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_auth
@require_admin
def delete_user(user_id):
    target = query("SELECT * FROM users WHERE id = %s", (user_id,), fetch_one=True)
    if target is None:
        return jsonify({'error': 'User not found'}), 404

    if target['role'] == 'super_admin':
        return jsonify({'error': 'Cannot delete the super_admin account'}), 403

    if str(target['id']) == g.current_user['sub']:
        return jsonify({'error': 'Cannot delete yourself'}), 403

    execute("DELETE FROM users WHERE id = %s", (user_id,))
    return jsonify({'message': f'User "{target["username"]}" deleted'}), 200
