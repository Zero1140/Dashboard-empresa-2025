# app/services/email.py
"""
Email service — Resend (free tier: 3,000 emails/mes).
Si RESEND_API_KEY no está configurada, loguea el link (útil en desarrollo/demo).
"""

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_RESEND_SEND_URL = "https://api.resend.com/emails"


async def send_practitioner_invitation(
    to_email: str,
    tenant_name: str,
    registration_url: str,
) -> None:
    """Envía email de invitación al prestador. Fallback a log si no hay API key."""
    if not settings.resend_api_key:
        logger.info(
            "📧 [DEV] Invitación a %s — Link de registro: %s",
            to_email,
            registration_url,
        )
        return

    body = {
        "from": "SaludOS Argentina <invitaciones@saludos.ar>",
        "to": [to_email],
        "subject": f"Invitación para unirte a la red de {tenant_name}",
        "html": f"""
<h2>Te invitaron a la red de prestadores de {tenant_name}</h2>
<p>Para completar tu registro en SaludOS Argentina, hacé clic en el botón:</p>
<a href="{registration_url}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">
  Completar registro
</a>
<p>Este link expira en 7 días.</p>
<p style="color:#6b7280;font-size:12px;">
  Si no esperabas esta invitación, ignorá este email.
</p>
""",
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                _RESEND_SEND_URL,
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json=body,
                timeout=10.0,
            )
            resp.raise_for_status()
            logger.info("Email enviado a %s via Resend", to_email)
        except Exception as exc:
            logger.error("Resend falló para %s: %s — link: %s", to_email, exc, registration_url)
