#!/usr/bin/env python3
"""Project API Server -- Flask-based REST API."""

from datetime import date, datetime
import os
import logging

from flask import Flask
from flask.json.provider import DefaultJSONProvider
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class UTCJSONProvider(DefaultJSONProvider):
    """Ensures naive datetimes are serialized with a Z suffix (UTC)."""
    sort_keys = False

    def default(self, o):
        if isinstance(o, datetime):
            s = o.isoformat()
            if o.tzinfo is None:
                s += 'Z'
            return s
        if isinstance(o, date):
            return o.isoformat()
        return super().default(o)


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.json_provider_class = UTCJSONProvider
    app.json = UTCJSONProvider(app)

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-change-in-production')
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') != 'development'
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 3600

    CORS(app, supports_credentials=True, expose_headers=['Authorization'])

    # Register blueprints. Add new ones below as you create domain modules
    # (e.g. items, orders, reports, etc.).
    from auth import auth_bp
    app.register_blueprint(auth_bp)

    # Apply pending SQL migrations on startup. Failures are logged but do
    # not prevent the app from booting -- so the health check stays available.
    from db import run_migrations
    try:
        run_migrations()
    except Exception:
        logger.exception("Migration check failed -- app will start but DB may be outdated")

    logger.info("Flask application created")
    return app


app = create_app()


@app.route('/health')
def health():
    """Health check endpoint."""
    return {'status': 'healthy', 'service': 'project-api'}, 200


if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug)
