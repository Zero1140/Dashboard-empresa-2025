from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.security import TokenPayload
from app.main import app
from app.api.v1.deps import get_current_user

TENANT_ID = "00000000-0000-0000-0000-000000000002"
USER_ID = "00000000-0000-0000-0000-000000000001"
PRACTITIONER_CUFP = "CUFP-00001234"


def mock_prestador():
    return TokenPayload(
        sub=USER_ID,
        tenant_id=TENANT_ID,
        role="prestador",
        exp=datetime.now(UTC) + timedelta(hours=1),
    )


def make_mock_practitioner(vigente: bool = True):
    p = MagicMock()
    p.cufp = PRACTITIONER_CUFP
    p.estado_matricula = "vigente" if vigente else "suspendida"
    return p


def make_mock_consultation(tipo: str = "teleconsulta"):
    c = MagicMock()
    c.id = uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    c.tipo = tipo
    c.estado = "programada"
    c.medico_id = uuid.UUID(USER_ID)
    c.medico_cufp = PRACTITIONER_CUFP
    c.paciente_dni = "12345678"
    c.paciente_nombre = "Juan Pérez"
    c.paciente_afiliado_id = None
    c.financiador_id = None
    c.cobertura_verificada = False
    c.sesion_video_id = "saludos-abc123" if tipo == "teleconsulta" else None
    c.fecha_consulta = datetime.now(UTC)
    c.diagnostico_snomed_code = None
    c.diagnostico_texto = None
    c.notas_clinicas = None
    c.created_at = datetime.now(UTC)
    c.prescriptions = []
    return c


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = mock_prestador
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_create_teleconsulta_has_video_id(client):
    mock_practitioner = make_mock_practitioner()
    mock_consultation = make_mock_consultation("teleconsulta")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_practitioner)))
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        with patch("app.api.v1.endpoints.consultations.Consultation", return_value=mock_consultation):
            resp = client.post("/v1/consultations", json={
                "tipo": "teleconsulta",
                "paciente_dni": "12345678",
                "paciente_nombre": "Juan Pérez",
            })

    assert resp.status_code == 201
    data = resp.json()
    assert data["tipo"] == "teleconsulta"
    assert data["sesion_video_id"] is not None
    assert data["sesion_video_url"].startswith("https://meet.jit.si/")


def test_create_externa_has_no_video_id(client):
    mock_practitioner = make_mock_practitioner()
    mock_consultation = make_mock_consultation("externa")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_practitioner)))
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        with patch("app.api.v1.endpoints.consultations.Consultation", return_value=mock_consultation):
            resp = client.post("/v1/consultations", json={
                "tipo": "externa",
                "paciente_dni": "12345678",
                "paciente_nombre": "Juan Pérez",
            })

    assert resp.status_code == 201
    data = resp.json()
    assert data["sesion_video_id"] is None
    assert data["sesion_video_url"] is None


def test_suspended_practitioner_returns_403(client):
    mock_practitioner = make_mock_practitioner(vigente=False)

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_practitioner)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.post("/v1/consultations", json={
            "tipo": "teleconsulta",
            "paciente_dni": "12345678",
            "paciente_nombre": "Juan Pérez",
        })

    assert resp.status_code == 403


def test_create_with_coverage_verificada(client):
    mock_practitioner = make_mock_practitioner()
    mock_consultation = make_mock_consultation("teleconsulta")
    mock_consultation.paciente_afiliado_id = "SWISS-001"
    mock_consultation.financiador_id = "swiss-medical"
    mock_consultation.cobertura_verificada = True

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_practitioner)))
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_coverage = MagicMock()
    mock_coverage.activa = True

    mock_connector = MagicMock()
    mock_connector.check_coverage = AsyncMock(return_value=mock_coverage)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        with patch("app.api.v1.endpoints.consultations.Consultation", return_value=mock_consultation):
            with patch("app.api.v1.endpoints.consultations.get_eligibility_connector", return_value=mock_connector):
                resp = client.post("/v1/consultations", json={
                    "tipo": "teleconsulta",
                    "paciente_dni": "12345678",
                    "paciente_nombre": "Juan Pérez",
                    "paciente_afiliado_id": "SWISS-001",
                    "financiador_id": "swiss-medical",
                })

    assert resp.status_code == 201
    data = resp.json()
    assert data["cobertura_verificada"] is True
