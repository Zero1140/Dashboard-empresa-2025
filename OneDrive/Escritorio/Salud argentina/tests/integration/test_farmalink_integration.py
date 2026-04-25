"""
Integration tests for FarmalinkConnector against the Farmalink sandbox.
Skipped unless FARMALINK_API_KEY is set.

Run:
    FARMALINK_API_KEY=<key> pytest tests/integration/test_farmalink_integration.py -v -s

Optional env vars:
    FARMALINK_TEST_AFILIADO    (default: "SWISS-001")
    FARMALINK_TEST_FINANCIADOR (default: "112233")
    FARMALINK_TEST_CUFP        (default: "CUFP00001234")
    FARMALINK_TEST_DNI         (default: "12345678")
"""

import os
import time
import uuid

import pytest

from app.connectors.farmalink.client import FarmalinkConnector

pytestmark = pytest.mark.skipif(
    not os.getenv("FARMALINK_API_KEY"),
    reason="FARMALINK_API_KEY not set -- skipping Farmalink integration tests",
)

SANDBOX = "https://sandbox.farmalink.com.ar"


@pytest.fixture
def connector():
    return FarmalinkConnector(base_url=SANDBOX, api_key=os.environ["FARMALINK_API_KEY"])


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_sandbox(connector):
    """Farmalink sandbox endpoint is reachable."""
    result = await connector.health_check()
    assert isinstance(result, bool)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_check_coverage_sandbox_afiliado(connector):
    """Sandbox test afiliado returns a structured CoverageResult."""
    afiliado = os.getenv("FARMALINK_TEST_AFILIADO", "SWISS-001")
    financiador = os.getenv("FARMALINK_TEST_FINANCIADOR", "112233")

    result = await connector.check_coverage(afiliado_id=afiliado, financiador_id=financiador)

    assert result.fuente == "farmalink"
    assert isinstance(result.found, bool)
    if result.found:
        assert result.afiliado_id == afiliado
        assert result.estado in ("activa", "inactiva", "suspendida", "desconocida")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_check_coverage_nonexistent_returns_not_found(connector):
    """Non-existent afiliado must return found=False."""
    result = await connector.check_coverage(
        afiliado_id="NONEXISTENT-XYZ-999999", financiador_id="000000"
    )
    assert result.found is False
    assert result.fuente == "farmalink"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_route_prescription_sandbox_end_to_end(connector):
    """Route a prescription through the sandbox. Each run uses a unique CUIR."""
    ts = int(time.time())
    suffix = uuid.uuid4().hex[:8].upper()
    cuir = f"DEVP{ts}{suffix}"[:27]

    result = await connector.route_prescription(
        cuir=cuir,
        prescriber_cufp=os.getenv("FARMALINK_TEST_CUFP", "CUFP00001234"),
        patient_dni=os.getenv("FARMALINK_TEST_DNI", "12345678"),
        medicamento_snomed="372687004",
        financiador_id=os.getenv("FARMALINK_TEST_FINANCIADOR", "112233"),
    )
    assert result.fuente == "farmalink"
    assert isinstance(result.success, bool)
    if result.success:
        assert result.tracking_id is not None
        assert result.cuir is not None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_route_prescription_invalid_cuir_returns_error(connector):
    """Malformed CUIR provokes a Farmalink error -- verifies error mapping."""
    result = await connector.route_prescription(
        cuir="INVALID",
        prescriber_cufp="CUFP00000000",
        patient_dni="00000000",
        medicamento_snomed="000000000",
        financiador_id=None,
    )
    assert result.success is False
    assert result.error is not None
    assert result.fuente == "farmalink"
