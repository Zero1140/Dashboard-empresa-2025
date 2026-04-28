# tests/unit/test_osde_connector.py
import pytest
import respx
import httpx
from app.connectors.osde.client import OSDEConnector


@pytest.fixture
def connector():
    return OSDEConnector(
        base_url="https://sandbox.farmalink.com.ar/FARMALINK_RE/farmalink/v3",
        client_id="test-client",
        client_secret="test-secret",
        token_url="https://sandbox.farmalink.com.ar/oauth2/token",
    )


@respx.mock
@pytest.mark.asyncio
async def test_get_token_success(connector):
    respx.post("https://sandbox.farmalink.com.ar/oauth2/token").mock(
        return_value=httpx.Response(200, json={"access_token": "test-token", "expires_in": 3600})
    )
    token = await connector._get_token()
    assert token == "test-token"


@respx.mock
@pytest.mark.asyncio
async def test_check_coverage_active(connector):
    respx.post("https://sandbox.farmalink.com.ar/oauth2/token").mock(
        return_value=httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
    )
    respx.get(
        "https://sandbox.farmalink.com.ar/FARMALINK_RE/farmalink/v3/Coverage"
    ).mock(return_value=httpx.Response(200, json={
        "resourceType": "Bundle",
        "entry": [{"resource": {
            "resourceType": "Coverage",
            "status": "active",
            "subscriber": {"reference": "Patient/12345678"},
        }}]
    }))
    result = await connector.check_coverage(
        afiliado_id="12345678",
        financiador_id="osde",
    )
    assert result.activa is True


@respx.mock
@pytest.mark.asyncio
async def test_check_coverage_not_found(connector):
    respx.post("https://sandbox.farmalink.com.ar/oauth2/token").mock(
        return_value=httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
    )
    respx.get(
        "https://sandbox.farmalink.com.ar/FARMALINK_RE/farmalink/v3/Coverage"
    ).mock(return_value=httpx.Response(200, json={"resourceType": "Bundle", "entry": []}))
    result = await connector.check_coverage(
        afiliado_id="00000000",
        financiador_id="osde",
    )
    assert result.activa is False
