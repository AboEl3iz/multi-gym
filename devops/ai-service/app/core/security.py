"""
API Key middleware — validates X-API-Key header against the configured secret.
Returns None (allow) or a JSONResponse (deny) to keep the middleware clean.
An empty API_KEY disables auth completely (useful for local dev).

Security note: comparison uses hmac.compare_digest() to prevent timing attacks.
A plain string comparison (key != settings.API_KEY) leaks information about the
correct key length through measurable response-time differences.
"""

import hmac

from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.config import settings


async def api_key_middleware(request: Request):
    # Auth disabled in local dev mode
    if not settings.API_KEY:
        return None

    key = request.headers.get("X-API-Key", "")
    # Use constant-time comparison to prevent timing-based key enumeration
    if not hmac.compare_digest(key.encode(), settings.API_KEY.encode()):
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized", "detail": "Invalid or missing X-API-Key header"},
        )
    return None
