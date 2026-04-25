"""
Integration tests for REFEPSConnector against the real SISA REST endpoint.
Skipped unless REFEPS_USERNAME is set.

Run:
    REFEPS_USERNAME=<user> REFEPS_PASSWORD=<pass> pytest tests/integration/test_refeps_integration.py -v -s

Optional:
    REFEPS_TEST_DNI  -- a known DNI from the SISA welcome email (default tries "20304050")
"""

import os

import pytest

from app.connectors.refeps.client import REFEPSConnector

pytestmark = pytest.mark.skipif(
    not os.getenv("REFEPS_USERNAME"),
    reason="REFEPS_USERNAME not set -- skipping REFEPS integration tests",
)


@pytest.fixture
def connector():
    return REFEPSConnector(
        ws_url="https://sisa.msal.gov.ar/sisa/services/profesionalService",
        rest_url="https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar",
        username=os.environ["REFEPS_USERNAME"],
        password=os.environ["REFEPS_PASSWORD"],
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_real(connector):
    """SISA endpoint is reachable and returns non-4xx."""
    result = await connector.health_check()
    assert result is True, "SISA REST endpoint unreachable or returned 4xx/5xx"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_nonexistent_dni_returns_structured_result(connector):
    """DNI 00000001 is unlikely to exist -- tests not-found path on real API."""
    result = await connector.verify_matricula(dni="00000001")
    assert result.fuente == "refeps_rest"
    assert isinstance(result.found, bool)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_raises_on_no_params(connector):
    """Validation guard raises before any network call."""
    with pytest.raises(ValueError, match="Se requiere al menos uno"):
        await connector.verify_matricula()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_known_dni_structure(connector):
    """When a known DNI returns a result, the full dataclass must be populated."""
    test_dni = os.getenv("REFEPS_TEST_DNI", "20304050")
    result = await connector.verify_matricula(dni=test_dni)
    assert result.fuente == "refeps_rest"
    if result.found:
        assert result.cufp is not None
        assert result.estado_matricula in ("vigente", "suspendida", "inhabilitada", "desconocido")
        assert isinstance(result.provincias_habilitadas, list)
