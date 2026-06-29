"""Shared request-handling helpers used across blueprints."""

from flask import request


def parse_pagination(default_per_page=50, max_per_page=200):
    """Extract page / per_page / offset from query-string parameters.

    Returns ``(page, per_page, offset)`` -- all ints, safe-clamped.
    """
    try:
        page = int(request.args.get('page', 1))
    except (TypeError, ValueError):
        page = 1
    page = max(page, 1)

    try:
        per_page = int(request.args.get('per_page', default_per_page))
    except (TypeError, ValueError):
        per_page = default_per_page
    per_page = max(1, min(per_page, max_per_page))

    offset = (page - 1) * per_page
    return page, per_page, offset
