# tests/unit/connectors/test_refeps_real.py
"""Unit tests for REFEPSConnector.verify_matricula() -- no real network calls."""

from unittest.mock import AsyncMock, patch

import pytest
import respx
from httpx import Response

from app.connectors.refeps.client import REFEPSConnector

REST_URL = "https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar"


@pytest.fixture
def connector():
    return REFEPSConnector(
        ws_url="https://sisa.msal.gov.ar/sisa/services/profesionalService",
        rest_url=REST_URL,
        username="test_user",
        password="test_pass",
    )


FOUND_PAYLOAD = {
    "resultado": "OK",
    "errores": None,
    "profesional": {
        "cuil": "20123456789",
        "nroDoc": "12345678",
        "apellido": "GARCIA",
        "nombre": "MARIA ALEJANDRA",
        "cufp": "CUFP00001234",
        "titulos": [
            {
                "titulo": "MEDICO",
                "matriculaNacional": "123456",
                "estadoMatricula": "VIGENTE",
                "especialidades": [{"descripcion": "MEDICINA GENERAL"}],
                "habilitaciones": [
                    {"provincia": "CAPITAL FEDERAL"},
                    {"provincia": "BUENOS AIRES"},
                ],
            }
        ],
    },
}

NOT_FOUND_PAYLOAD = {"resultado": "OK", "errores": None, "profesional": None}
AUTH_ERROR_PAYLOAD = {"resultado": "ERROR", "errores": ["Credenciales invalidas"]}


@pytest.mark.asyncio
@respx.mock
async def test_verify_by_dni_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=FOUND_PAYLOAD))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is True
    assert result.dni == "12345678"
    assert result.cufp == "CUFP00001234"
    assert result.nombre == "MARIA ALEJANDRA"
    assert result.apellido == "GARCIA"
    assert result.estado_matricula == "vigente"
    assert result.matricula_nacional == "123456"
    assert result.especialidad == "MEDICINA GENERAL"
    assert "CAPITAL FEDERAL" in result.provincias_habilitadas
    assert "BUENOS AIRES" in result.provincias_habilitadas
    assert result.fuente == "refeps_rest"
    assert result.error is None


@pytest.mark.asyncio
@respx.mock
async def test_verify_by_matricula_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=FOUND_PAYLOAD))
    result = await connector.verify_matricula(matricula="123456")
    assert result.found is True
    assert result.matricula_nacional == "123456"


@pytest.mark.asyncio
@respx.mock
async def test_verify_not_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=NOT_FOUND_PAYLOAD))
    result = await connector.verify_matricula(dni="99999999")
    assert result.found is False
    assert result.fuente == "refeps_rest"
    assert result.error is None


@pytest.mark.asyncio
@respx.mock
async def test_verify_auth_error(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=AUTH_ERROR_PAYLOAD))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is False
    assert result.error == "Credenciales invalidas"
    assert result.fuente == "refeps_rest"


@pytest.mark.asyncio
async def test_verify_raises_on_no_params(connector):
    with pytest.raises(ValueError, match="Se requiere al menos uno"):
        await connector.verify_matricula()


@pytest.mark.asyncio
@respx.mock
async def test_verify_estado_lowercased(connector):
    payload = {
        "resultado": "OK",
        "errores": None,
        "profesional": {
            **FOUND_PAYLOAD["profesional"],
            "titulos": [
                {**FOUND_PAYLOAD["profesional"]["titulos"][0], "estadoMatricula": "SUSPENDIDA"}
            ],
        },
    }
    respx.get(REST_URL).mock(return_value=Response(200, json=payload))
    result = await connector.verify_matricula(dni="12345678")
    assert result.estado_matricula == "suspendida"


@pytest.mark.asyncio
@respx.mock
async def test_verify_sin_titulos(connector):
    payload = {
        "resultado": "OK",
        "errores": None,
        "profesional": {
            "cuil": "20123456789",
            "nroDoc": "12345678",
            "apellido": "GARCIA",
            "nombre": "MARIA",
            "cufp": "CUFP00001234",
            "titulos": [],
        },
    }
    respx.get(REST_URL).mock(return_value=Response(200, json=payload))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is True
    assert result.matricula_nacional is None
    assert result.estado_matricula == "desconocido"
    assert result.provincias_habilitadas == []


@pytest.mark.asyncio
@respx.mock
async def test_verify_http_500_returns_error_result(connector):
    respx.get(REST_URL).mock(return_value=Response(500))
    # Patch asyncio.sleep so the 3 retry attempts don't actually wait
    with patch("asyncio.sleep", new_callable=AsyncMock):
        result = await connector.verify_matricula(dni="12345678")
    assert result.found is False
    assert result.error == "HTTP 500"
    assert result.fuente == "refeps_rest"
