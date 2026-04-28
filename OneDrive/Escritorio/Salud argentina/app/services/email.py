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


async def send_password_reset_email(email: str, reset_link: str) -> None:
    """Envía email de reset de contraseña via Resend."""
    if not settings.resend_api_key:
        logger.warning(
            "RESEND_API_KEY no configurada — link de reset: %s", reset_link
        )
        return

    body = {
        "from": "SaludOS Argentina <noreply@saludos.ar>",
        "to": [email],
        "subject": "Restablecer tu contraseña — SaludOS Argentina",
        "html": (
            f"<p>Recibiste este email porque solicitaste restablecer tu contraseña en SaludOS Argentina.</p>"
            f"<p><a href='{reset_link}'>Hacer clic aquí para restablecer la contraseña</a></p>"
            f"<p>Este link expira en {settings.password_reset_expire_minutes} minutos.</p>"
            f"<p>Si no solicitaste este cambio, ignorá este email.</p>"
        ),
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
            logger.info("Email de reset enviado a %s via Resend", email)
        except Exception as exc:
            logger.error("Resend falló para reset de %s: %s — link: %s", email, exc, reset_link)
