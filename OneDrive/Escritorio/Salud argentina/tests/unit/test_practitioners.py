import pytest
from app.models.practitioner_invitation import PractitionerInvitation, PractitionerProvince


def test_invitation_model_fields():
    assert hasattr(PractitionerInvitation, "email")
    assert hasattr(PractitionerInvitation, "token")
    assert hasattr(PractitionerInvitation, "estado")
    assert hasattr(PractitionerInvitation, "expires_at")
    assert hasattr(PractitionerInvitation, "tenant_id")
    assert hasattr(PractitionerInvitation, "invited_by_id")
    assert hasattr(PractitionerInvitation, "practitioner_id")


def test_province_model_fields():
    assert hasattr(PractitionerProvince, "provincia")
    assert hasattr(PractitionerProvince, "estado")
    assert hasattr(PractitionerProvince, "practitioner_id")
    assert hasattr(PractitionerProvince, "tenant_id")
    assert hasattr(PractitionerProvince, "updated_by_id")


@pytest.mark.asyncio
async def test_list_practitioners_requires_auth():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/practitioners")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_invite_requires_auth():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/v1/practitioners/invite", json={"email": "dr@test.com"})
    assert resp.status_code == 403


def test_register_token_not_found():
    from unittest.mock import AsyncMock, MagicMock, patch
    from fastapi.testclient import TestClient
    from app.main import app

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch(
        "app.api.v1.endpoints.practitioners.AsyncSessionLocal",
        return_value=mock_session,
    ):
        with TestClient(app) as client:
            resp = client.get("/v1/practitioners/register/token-invalido-000000000000")

    assert resp.status_code == 404
