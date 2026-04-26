"""Unit tests for the email service."""

import logging
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_send_invitation_no_api_key_logs_link(caplog):
    """When no RESEND_API_KEY, logs the link instead of sending."""
    with patch("app.services.email.settings") as mock_settings:
        mock_settings.resend_api_key = ""
        from app.services.email import send_practitioner_invitation

        with caplog.at_level(logging.INFO, logger="app.services.email"):
            await send_practitioner_invitation(
                to_email="dr.garcia@test.com",
                tenant_name="Prepaga Demo",
                registration_url="http://localhost:3000/registro/abc123",
            )

    assert "dr.garcia@test.com" in caplog.text
    assert "abc123" in caplog.text


@pytest.mark.asyncio
async def test_send_invitation_resend_success():
    """With a RESEND_API_KEY, calls Resend API."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)

    with patch("app.services.email.settings") as mock_settings, \
         patch("app.services.email.httpx.AsyncClient") as MockClient:
        mock_settings.resend_api_key = "re_test_key"
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

        from app.services.email import send_practitioner_invitation
        await send_practitioner_invitation(
            to_email="medico@test.com",
            tenant_name="Obra Social Demo",
            registration_url="http://localhost:3000/registro/xyz789",
        )

    mock_client.post.assert_called_once()
    call_kwargs = mock_client.post.call_args
    assert "medico@test.com" in str(call_kwargs)


@pytest.mark.asyncio
async def test_send_invitation_resend_failure_does_not_raise():
    """If Resend fails, logs error but does not propagate the exception."""
    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=Exception("Connection refused"))

    with patch("app.services.email.settings") as mock_settings, \
         patch("app.services.email.httpx.AsyncClient") as MockClient:
        mock_settings.resend_api_key = "re_test_key"
        MockClient.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=None)

        from app.services.email import send_practitioner_invitation
        # Should not raise
        await send_practitioner_invitation(
            to_email="error@test.com",
            tenant_name="Tenant",
            registration_url="http://localhost/registro/err",
        )
