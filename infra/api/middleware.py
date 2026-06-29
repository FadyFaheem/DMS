"""Auth decorators for Flask routes.

Standard decorator order on an endpoint:

    @bp.route(...)
    @require_auth
    @require_permission('feature.view')
    def handler():
        ...

After @require_auth, the JWT payload is available on `g.current_user`.
"""

import os
import jwt
import logging
from functools import wraps
from flask import request, jsonify, g

logger = logging.getLogger(__name__)
ADMIN_ROLES = {'admin', 'super_admin'}


def is_admin_role(role):
    return role in ADMIN_ROLES


def _get_jwt_secret():
    from flask import current_app
    return current_app.config['JWT_SECRET_KEY']


def decode_token(token):
    """Decode and validate a JWT. Returns the payload dict or None."""
    try:
        return jwt.decode(token, _get_jwt_secret(), algorithms=['HS256'])
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", e)
        return None


def require_auth(f):
    """Enforce a valid JWT access token on the request.

    On success, sets g.current_user to the decoded JWT payload, which includes:
      sub (user id as string), username, role, is_admin, permissions, exp, iat.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing authorization header'}), 401

        payload = decode_token(auth_header[7:])
        if payload is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        if payload.get('type') != 'access':
            return jsonify({'error': 'Invalid token type'}), 401

        g.current_user = payload
        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """Enforce admin role. Must be used after @require_auth."""
    @wraps(f)
    def decorated(*args, **kwargs):
        user = getattr(g, 'current_user', None)
        if not user:
            return jsonify({'error': 'Admin access required'}), 403
        if user.get('is_admin') or is_admin_role(user.get('role', '')):
            return f(*args, **kwargs)
        return jsonify({'error': 'Admin access required'}), 403
    return decorated


def _has_permission(user_payload, perm_key):
    """Admins always pass. Otherwise check the permissions dict on the JWT."""
    if user_payload.get('is_admin') or is_admin_role(user_payload.get('role', '')):
        return True
    perms = user_payload.get('permissions') or {}
    if perms.get('full_access'):
        return True
    return bool(perms.get(perm_key))


def require_permission(*perm_keys):
    """Enforce one or more permission keys.

    The user passes if they are admin, have full_access, or ALL listed keys
    are granted in their permissions. Must be used after @require_auth.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user:
                return jsonify({'error': 'Authentication required'}), 401
            for key in perm_keys:
                if not _has_permission(user, key):
                    return jsonify({'error': f'Permission required: {key}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def auth_from_header_or_query():
    """Authenticate from Authorization header or ?token= query param.

    Used by endpoints that need to support new-tab viewing (documents, PDFs)
    where the token is passed as a query parameter instead of a header.
    Sets g.current_user on success, returns a 401 tuple on failure.
    """
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        payload = decode_token(auth_header[7:])
        if payload and payload.get('type') == 'access':
            g.current_user = payload
            return None
    token = request.args.get('token')
    if token:
        payload = decode_token(token)
        if payload and payload.get('type') == 'access':
            g.current_user = payload
            return None
    return jsonify({'error': 'Authentication required'}), 401
