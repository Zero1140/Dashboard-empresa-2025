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


# ---------------------------------------------------------------------------
# GET /v1/consultations — list
# ---------------------------------------------------------------------------

def _make_session_with_scalars(items: list):
    """Return a mock async session whose execute returns a scalars().all() list."""
    mock_scalars = MagicMock()
    mock_scalars.all = MagicMock(return_value=items)
    mock_result = MagicMock()
    mock_result.scalars = MagicMock(return_value=mock_scalars)

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)
    return mock_session


def test_list_consultations_no_filters(client):
    c1 = make_mock_consultation("teleconsulta")
    c2 = make_mock_consultation("externa")

    mock_session = _make_session_with_scalars([c1, c2])

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get("/v1/consultations")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["tipo"] == "teleconsulta"
    assert data[1]["tipo"] == "externa"


def test_list_consultations_filter_tipo(client):
    c1 = make_mock_consultation("teleconsulta")

    mock_session = _make_session_with_scalars([c1])

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get("/v1/consultations?tipo=teleconsulta")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["tipo"] == "teleconsulta"


def test_list_consultations_filter_estado(client):
    c1 = make_mock_consultation("teleconsulta")
    c1.estado = "en_curso"

    mock_session = _make_session_with_scalars([c1])

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get("/v1/consultations?estado=en_curso")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["estado"] == "en_curso"


# ---------------------------------------------------------------------------
# GET /v1/consultations/{id} — single consultation
# ---------------------------------------------------------------------------

def test_get_consultation_success(client):
    c = make_mock_consultation()

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get(f"/v1/consultations/{c.id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(c.id)
    assert data["tipo"] == "teleconsulta"


def test_get_consultation_not_found(client):
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get("/v1/consultations/00000000-0000-0000-0000-000000000099")

    assert resp.status_code == 404


def test_get_consultation_wrong_doctor_returns_403(client):
    c = make_mock_consultation()
    # Assign a different medico_id so ownership check fails
    c.medico_id = uuid.UUID("99999999-9999-9999-9999-999999999999")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get(f"/v1/consultations/{c.id}")

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PATCH /v1/consultations/{id}/status
# ---------------------------------------------------------------------------

def test_patch_status_valid_transition(client):
    c = make_mock_consultation()
    c.estado = "programada"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.flush = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(f"/v1/consultations/{c.id}/status", json={"estado": "en_curso"})

    assert resp.status_code == 200
    # After the transition the mock's estado was mutated in place
    assert c.estado == "en_curso"


def test_patch_status_invalid_transition_returns_422(client):
    c = make_mock_consultation()
    c.estado = "programada"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        # "completada" is not reachable directly from "programada"
        resp = client.patch(f"/v1/consultations/{c.id}/status", json={"estado": "completada"})

    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# PATCH /v1/consultations/{id} — update diagnosis / notes
# ---------------------------------------------------------------------------

def test_update_consultation_sets_diagnostico(client):
    c = make_mock_consultation()
    c.estado = "en_curso"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.flush = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(
            f"/v1/consultations/{c.id}",
            json={
                "diagnostico_snomed_code": "386661006",
                "diagnostico_texto": "Fiebre",
                "notas_clinicas": "Paciente con fiebre alta",
            },
        )

    assert resp.status_code == 200
    assert c.diagnostico_snomed_code == "386661006"
    assert c.diagnostico_texto == "Fiebre"
    assert c.notas_clinicas == "Paciente con fiebre alta"


def test_update_consultation_not_found_returns_404(client):
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(
            "/v1/consultations/00000000-0000-0000-0000-000000000099",
            json={"diagnostico_texto": "algo"},
        )

    assert resp.status_code == 404


def test_list_consultations_invalid_fecha_desde_returns_422(client):
    mock_session = _make_session_with_scalars([])

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.get("/v1/consultations?fecha_desde=not-a-date")

    assert resp.status_code == 422


def test_patch_status_wrong_doctor_returns_403(client):
    c = make_mock_consultation()
    c.estado = "programada"
    c.medico_id = uuid.UUID("99999999-9999-9999-9999-999999999999")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(f"/v1/consultations/{c.id}/status", json={"estado": "en_curso"})

    assert resp.status_code == 403


def test_update_consultation_wrong_doctor_returns_403(client):
    c = make_mock_consultation()
    c.estado = "en_curso"
    c.medico_id = uuid.UUID("99999999-9999-9999-9999-999999999999")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(
            f"/v1/consultations/{c.id}",
            json={"diagnostico_texto": "algo"},
        )

    assert resp.status_code == 403


def test_update_finalizada_consultation_returns_422(client):
    """Cannot update a completed/cancelled consultation."""
    c = make_mock_consultation()
    c.estado = "completada"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=c)))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.consultations.get_tenant_db", return_value=mock_session):
        resp = client.patch(
            f"/v1/consultations/{c.id}",
            json={"diagnostico_texto": "intentando modificar"},
        )

    assert resp.status_code == 422
