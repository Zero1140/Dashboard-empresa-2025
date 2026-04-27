# app/middleware/audit.py
"""
Audit middleware — Ley 25.326 (Protección de Datos Personales).
Loguea operaciones sobre datos sensibles de salud y persiste en audit_log.
"""
import asyncio
import logging
import time
import uuid

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

# Maps (METHOD, path-prefix) → action label. Checked in order; first match wins.
_ACTION_MAP = [
    ("GET",    "/v1/practitioners/register/", "register_practitioner"),
    ("POST",   "/v1/practitioners/invite",    "invite_practitioner"),
    ("GET",    "/v1/practitioners",           "list_practitioners"),
    ("POST",   "/v1/practitioners",           "create_practitioner"),
    ("GET",    "/v1/credentials",             "verify_credentials"),
    ("POST",   "/v1/credentials",             "verify_credentials"),
    ("GET",    "/v1/eligibility",             "check_eligibility"),
    ("POST",   "/v1/eligibility",             "check_eligibility"),
    ("POST",   "/v1/consultations",           "create_consultation"),
    ("GET",    "/v1/consultations",           "list_consultations"),
    ("POST",   "/v1/prescriptions",           "create_prescription"),
    ("GET",    "/v1/prescriptions",           "list_prescriptions"),
]


def _derive_action(method: str, path: str) -> str:
    """Derive a human-readable action label from HTTP method + path."""
    for m, prefix, label in _ACTION_MAP:
        if method.upper() == m and path.startswith(prefix):
            return label
    return f"{method.upper()} {path}"


async def _write_audit(
    action: str,
    resource: str,
    user_id_str: str,
    tenant_id_str: str,
    ip: str,
) -> None:
    """Fire-and-forget DB write — errors are swallowed so the response is never blocked."""
    from app.core.database import AsyncSessionLocal  # local import avoids circular deps
    from app.models.audit_log import AuditLog

    try:
        uid = (
            uuid.UUID(user_id_str)
            if user_id_str not in ("anonymous", "unknown")
            else None
        )
        tid = (
            uuid.UUID(tenant_id_str)
            if tenant_id_str not in ("anonymous", "unknown")
            else None
        )
        async with AsyncSessionLocal() as db:
            db.add(
                AuditLog(
                    tenant_id=tid,
                    user_id=uid,
                    action=action,
                    resource=resource,
                    ip_address=ip,
                )
            )
            await db.commit()
    except Exception as exc:  # noqa: BLE001
        logger.error("Audit DB write failed: %s", exc)


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
            except Exception:  # noqa: BLE001
                pass

        ip = request.client.host if request.client else "unknown"
        action = _derive_action(request.method, path)

        # Belt-and-suspenders: structured log always fires
        logger.info(
            "AUDIT method=%s path=%s status=%d user=%s tenant=%s ip=%s elapsed_ms=%d",
            request.method,
            path,
            response.status_code,
            user_sub,
            tenant_id,
            ip,
            elapsed_ms,
        )

        # Fire-and-forget DB write — must NOT slow down the response
        asyncio.create_task(_write_audit(action, path, user_sub, tenant_id, ip))

        return response
