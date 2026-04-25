"""Unit tests for FarmalinkConnector -- no real network calls."""

import json

import pytest
import respx
from httpx import Response

from app.connectors.farmalink.client import FarmalinkConnector

BASE = "https://sandbox.farmalink.com.ar"
COB_URL = f"{BASE}/FARMALINK_RE/farmalink/v3/cobertura"
REC_URL = f"{BASE}/FARMALINK_RE/farmalink/v3/receta"


@pytest.fixture
def connector():
    return FarmalinkConnector(base_url=BASE, api_key="test-key")


COV_OK = {
    "resultado": "OK",
    "cobertura": {
        "activa": True,
        "idAfiliado": "SWISS-001",
        "idFinanciador": "112233",
        "nombreFinanciador": "Swiss Medical",
        "plan": "SMG30",
        "estado": "ACTIVA",
    },
}
COV_INACTIVE = {
    "resultado": "OK",
    "cobertura": {
        "activa": False,
        "idAfiliado": "SANCOR-001",
        "idFinanciador": "445566",
        "nombreFinanciador": "Sancor Salud",
        "plan": "S30",
        "estado": "SUSPENDIDA",
    },
}
COV_ERROR = {"resultado": "ERROR", "errores": ["Afiliado no encontrado"]}
REC_OK = {"resultado": "OK", "trackingId": "FLK-TRK-ABC123", "cuir": "DEVP1745494827341a3f9c21AB"}
REC_ERROR = {"resultado": "ERROR", "errores": ["CUIR duplicado"]}


@pytest.mark.asyncio
@respx.mock
async def test_coverage_active(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_OK))
    r = await connector.check_coverage(afiliado_id="SWISS-001", financiador_id="112233")
    assert r.found is True
    assert r.activa is True
    assert r.afiliado_id == "SWISS-001"
    assert r.financiador_id == "112233"
    assert r.financiador_nombre == "Swiss Medical"
    assert r.plan == "SMG30"
    assert r.estado == "activa"
    assert r.fuente == "farmalink"
    assert r.error is None


@pytest.mark.asyncio
@respx.mock
async def test_coverage_inactive(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_INACTIVE))
    r = await connector.check_coverage(afiliado_id="SANCOR-001", financiador_id="445566")
    assert r.found is True
    assert r.activa is False
    assert r.estado == "suspendida"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_not_found(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_ERROR))
    r = await connector.check_coverage(afiliado_id="INEXISTENTE", financiador_id="000")
    assert r.found is False
    assert r.error == "Afiliado no encontrado"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_passes_prestacion_code(connector):
    route = respx.post(COB_URL).mock(return_value=Response(200, json=COV_OK))
    await connector.check_coverage(
        afiliado_id="SWISS-001", financiador_id="112233", prestacion_code="372687004"
    )
    body = json.loads(route.calls.last.request.content)
    assert body["idPrestacion"] == "372687004"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_http_error(connector):
    respx.post(COB_URL).mock(return_value=Response(503))
    r = await connector.check_coverage(afiliado_id="SWISS-001", financiador_id="112233")
    assert r.found is False
    assert r.error == "HTTP 503"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_success(connector):
    respx.post(REC_URL).mock(return_value=Response(200, json=REC_OK))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
        financiador_id="112233",
    )
    assert r.success is True
    assert r.cuir == "DEVP1745494827341a3f9c21AB"
    assert r.tracking_id == "FLK-TRK-ABC123"
    assert r.fuente == "farmalink"
    assert r.error is None


@pytest.mark.asyncio
@respx.mock
async def test_prescription_error(connector):
    respx.post(REC_URL).mock(return_value=Response(200, json=REC_ERROR))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
    )
    assert r.success is False
    assert r.error == "CUIR duplicado"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_sends_correct_body(connector):
    route = respx.post(REC_URL).mock(return_value=Response(200, json=REC_OK))
    await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
        financiador_id="112233",
    )
    body = json.loads(route.calls.last.request.content)
    assert body["cuir"] == "DEVP1745494827341a3f9c21AB"
    assert body["cufpPrescriptor"] == "CUFP00001234"
    assert body["dniPaciente"] == "12345678"
    assert body["medicamentoSnomedCode"] == "372687004"
    assert body["idFinanciador"] == "112233"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_http_error(connector):
    respx.post(REC_URL).mock(return_value=Response(500))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
    )
    assert r.success is False
    assert r.error == "HTTP 500"
    assert r.fuente == "farmalink"
