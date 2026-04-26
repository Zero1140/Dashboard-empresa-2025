# app/middleware/audit.py
"""
Audit middleware — Ley 25.326 (Protección de Datos Personales).
Loguea operaciones sobre datos sensibles de salud.
"""
import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("saludos.audit")

_SENSITIVE_PATHS = (
    "/v1/credentials",
    "/v1/eligibility",
    "/v1/consultations",
    "/v1/prescriptions",
    "/v1/practitioners",
)


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        response = await call_next(request)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        path = request.url.path
        if not any(path.startswith(p) for p in _SENSITIVE_PATHS):
            return response

        user_sub = "anonymous"
        tenant_id = "unknown"
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                from app.core.security import decode_token
                payload = decode_token(auth.removeprefix("Bearer ").strip())
                user_sub = payload.sub
                tenant_id = payload.tenant_id
            except Exception:
                pass

        logger.info(
            "AUDIT method=%s path=%s status=%d user=%s tenant=%s ip=%s elapsed_ms=%d",
            request.method,
            path,
            response.status_code,
            user_sub,
            tenant_id,
            request.client.host if request.client else "unknown",
            elapsed_ms,
        )
        return response
