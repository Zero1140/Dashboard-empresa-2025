import uuid
from datetime import UTC, date, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.v1.deps import get_current_user
from app.core.security import TokenPayload
from app.main import app

TENANT_ID = "00000000-0000-0000-0000-000000000002"
USER_ID = "00000000-0000-0000-0000-000000000001"
CONSULTATION_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"


def mock_prestador():
    return TokenPayload(
        sub=USER_ID,
        tenant_id=TENANT_ID,
        role="prestador",
        exp=datetime.now(UTC) + timedelta(hours=1),
    )


def make_mock_consultation(estado: str = "en_curso"):
    c = MagicMock()
    c.id = uuid.UUID(CONSULTATION_ID)
    c.tenant_id = uuid.UUID(TENANT_ID)
    c.medico_id = uuid.UUID(USER_ID)
    c.estado = estado
    c.paciente_dni = "12345678"
    c.paciente_afiliado_id = None
    c.financiador_id = None
    c.cobertura_verificada = False
    c.medico_cufp = "CUFP-00001234"
    c.diagnostico_snomed_code = None
    c.diagnostico_texto = None
    return c


def make_mock_prescription():
    rx = MagicMock()
    rx.id = uuid.UUID("ffffffff-ffff-ffff-ffff-ffffffffffff")
    rx.tenant_id = uuid.UUID(TENANT_ID)
    rx.cuir = "DEVP17454948273341a3f9c21AB"
    rx.consulta_id = uuid.UUID(CONSULTATION_ID)
    rx.prescriber_id = None
    rx.prescriber_cufp = "CUFP-00001234"
    rx.patient_dni = "12345678"
    rx.afiliado_id = None
    rx.medicamento_snomed_code = "372687004"
    rx.medicamento_nombre = "Amoxicilina 500mg"
    rx.cantidad = 2
    rx.posologia = "1 comprimido cada 8 horas por 7 días"
    rx.fecha_vencimiento = date.today() + timedelta(days=30)
    rx.estado = "activa"
    rx.cobertura_verificada = False
    rx.created_at = datetime.now(UTC)
    return rx


@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = mock_prestador
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def test_create_prescription_generates_cuir(client):
    mock_consultation = make_mock_consultation("en_curso")
    mock_prescription = make_mock_prescription()

    # First execute call: consultation lookup → returns mock_consultation.
    # Second execute call: CUIR collision check → returns None (no collision).
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
    ])
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        with patch("app.api.v1.endpoints.prescriptions.Prescription", return_value=mock_prescription):
            resp = client.post(
                f"/v1/consultations/{CONSULTATION_ID}/prescriptions",
                json={
                    "medicamento_snomed_code": "372687004",
                    "medicamento_nombre": "Amoxicilina 500mg",
                    "cantidad": 2,
                    "posologia": "1 comprimido cada 8 horas por 7 días",
                },
            )

    assert resp.status_code == 201
    data = resp.json()
    assert "cuir" in data
    assert len(data["cuir"]) == 27


def test_cancelled_consultation_returns_422(client):
    mock_consultation = make_mock_consultation("cancelada")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.post(
            f"/v1/consultations/{CONSULTATION_ID}/prescriptions",
            json={
                "medicamento_snomed_code": "372687004",
                "medicamento_nombre": "Amoxicilina 500mg",
                "cantidad": 1,
                "posologia": "1 diario",
            },
        )

    assert resp.status_code == 422


def test_public_lookup_returns_partial_name():
    cuir = "DEVP1745494827341a3f9c21AB"
    mock_rx = make_mock_prescription()
    mock_rx.cuir = cuir
    mock_rx.consulta_id = uuid.UUID(CONSULTATION_ID)

    mock_consultation = make_mock_consultation()
    mock_consultation.paciente_nombre = "Juan Pérez García"

    # Two sequential execute calls: first returns prescription, second returns consultation
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_rx)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
    ])
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.AsyncSessionLocal") as mock_sm:
        mock_sm.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_sm.return_value.__aexit__ = AsyncMock(return_value=False)
        with TestClient(app) as c:
            resp = c.get(f"/v1/prescriptions/{cuir}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["paciente_nombre_parcial"] == "Jua***"
    assert "Juan Pérez García" not in data["paciente_nombre_parcial"]


def test_programada_consultation_returns_422(client):
    mock_consultation = make_mock_consultation("programada")

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.post(
            f"/v1/consultations/{CONSULTATION_ID}/prescriptions",
            json={
                "medicamento_snomed_code": "372687004",
                "medicamento_nombre": "Amoxicilina 500mg",
                "cantidad": 1,
                "posologia": "1 diario",
            },
        )

    assert resp.status_code == 422


def test_fecha_vencimiento_is_30_days(client):
    mock_consultation = make_mock_consultation("en_curso")
    mock_prescription = make_mock_prescription()
    expected_vencimiento = (date.today() + timedelta(days=30)).isoformat()
    mock_prescription.fecha_vencimiento = date.today() + timedelta(days=30)

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=None)),
    ])
    mock_session.add = MagicMock()
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        with patch("app.api.v1.endpoints.prescriptions.Prescription", return_value=mock_prescription):
            resp = client.post(
                f"/v1/consultations/{CONSULTATION_ID}/prescriptions",
                json={
                    "medicamento_snomed_code": "372687004",
                    "medicamento_nombre": "Amoxicilina 500mg",
                    "cantidad": 1,
                    "posologia": "1 diario",
                },
            )

    assert resp.status_code == 201
    data = resp.json()
    assert data["fecha_vencimiento"] == expected_vencimiento


def test_cuir_not_found_returns_404():
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.AsyncSessionLocal") as mock_sm:
        mock_sm.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_sm.return_value.__aexit__ = AsyncMock(return_value=False)
        with TestClient(app) as c:
            resp = c.get("/v1/prescriptions/NOTEXIST00000000000000000AB")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /v1/consultations/{id}/prescriptions — list prescriptions
# ---------------------------------------------------------------------------

def test_list_prescriptions_returns_list(client):
    mock_consultation = make_mock_consultation("en_curso")
    rx1 = make_mock_prescription()
    rx2 = make_mock_prescription()
    rx2.id = uuid.UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")
    rx2.cuir = "DEVP17454948273341a3f9c21CD"

    mock_scalars = MagicMock()
    mock_scalars.all = MagicMock(return_value=[rx1, rx2])
    mock_list_result = MagicMock()
    mock_list_result.scalars = MagicMock(return_value=mock_scalars)

    # First execute: _get_consultation_or_403 lookup → returns mock_consultation
    # Second execute: list prescriptions → returns list result
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
        mock_list_result,
    ])
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.get(f"/v1/consultations/{CONSULTATION_ID}/prescriptions")

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["cuir"] == rx1.cuir
    assert data[1]["cuir"] == rx2.cuir


def test_list_prescriptions_consultation_not_found_returns_404(client):
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.get(f"/v1/consultations/{CONSULTATION_ID}/prescriptions")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /v1/prescriptions/{id}/cancel — cancel prescription
# ---------------------------------------------------------------------------

def test_cancel_prescription_sets_estado_anulada(client):
    mock_consultation = make_mock_consultation("en_curso")
    rx = make_mock_prescription()
    rx.estado = "activa"

    # First execute: prescription lookup
    # Second execute: consultation ownership check
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=rx)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
    ])
    mock_session.flush = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    prescription_id = str(rx.id)
    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.delete(f"/v1/prescriptions/{prescription_id}/cancel")

    assert resp.status_code == 200
    assert rx.estado == "anulada"
    data = resp.json()
    assert data["estado"] == "anulada"


def test_cancel_prescription_not_found_returns_404(client):
    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.delete(f"/v1/prescriptions/{uuid.uuid4()}/cancel")

    assert resp.status_code == 404


def test_cancel_already_anulada_returns_422(client):
    mock_consultation = make_mock_consultation("en_curso")
    rx = make_mock_prescription()
    rx.estado = "anulada"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=rx)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
    ])
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.delete(f"/v1/prescriptions/{rx.id}/cancel")

    assert resp.status_code == 422


def test_cancel_prescription_wrong_doctor_returns_403(client):
    mock_consultation = make_mock_consultation("en_curso")
    mock_consultation.medico_id = uuid.UUID("99999999-9999-9999-9999-999999999999")
    rx = make_mock_prescription()
    rx.estado = "activa"

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(side_effect=[
        MagicMock(scalar_one_or_none=MagicMock(return_value=rx)),
        MagicMock(scalar_one_or_none=MagicMock(return_value=mock_consultation)),
    ])
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.delete(f"/v1/prescriptions/{rx.id}/cancel")

    assert resp.status_code == 403


def test_cancel_prescription_no_consulta_id_non_admin_returns_403(client):
    """A prescription with no consulta_id can only be cancelled by platform_admin."""
    rx = make_mock_prescription()
    rx.estado = "activa"
    rx.consulta_id = None  # no associated consultation

    mock_session = AsyncMock()
    mock_session.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=rx))
    )
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    # client fixture uses role="prestador", not "platform_admin"
    with patch("app.api.v1.endpoints.prescriptions.get_tenant_db", return_value=mock_session):
        resp = client.delete(f"/v1/prescriptions/{rx.id}/cancel")

    assert resp.status_code == 403
