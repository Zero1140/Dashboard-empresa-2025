"""Tests for consent event recording and history export."""
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


TENANT_ID = str(uuid.uuid4())
USER_ID = str(uuid.uuid4())
PRACTITIONER_ID = str(uuid.uuid4())


def make_token(role="financiador_admin"):
    from app.core.security import TokenPayload
    return TokenPayload(
        sub=USER_ID,
        tenant_id=TENANT_ID,
        role=role,
        exp=datetime.now(timezone.utc) + timedelta(hours=1),
    )


# ---------------------------------------------------------------------------
# Test 1: ConsentEvent model fields exist and can be set
# ---------------------------------------------------------------------------

def test_consent_event_model_fields():
    """ConsentEvent must expose the expected fields after instantiation."""
    from app.models.consent_event import ConsentEvent

    practitioner_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    event = ConsentEvent(
        practitioner_id=practitioner_id,
        tenant_id=tenant_id,
        action="accepted",
        tos_version="1.0",
        ip_address="10.0.0.1",
        user_agent="Mozilla/5.0",
    )

    assert event.practitioner_id == practitioner_id
    assert event.tenant_id == tenant_id
    assert event.action == "accepted"
    assert event.tos_version == "1.0"
    assert event.ip_address == "10.0.0.1"
    assert event.user_agent == "Mozilla/5.0"
    # id is None until DB insert (SQLAlchemy column default, not Python __init__ default)
    # Verify the column's default callable is uuid.uuid4 so the DB will auto-generate it
    id_col = ConsentEvent.__table__.c["id"]
    assert id_col.default.arg.__name__ == "uuid4"


# ---------------------------------------------------------------------------
# Test 2: get_consent_history endpoint returns events correctly structured
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_consent_history_endpoint_returns_events():
    """get_consent_history must return a list with the correct field structure."""
    import uuid as _uuid

    ev1 = MagicMock()
    ev1.id = _uuid.uuid4()
    ev1.action = "accepted"
    ev1.tos_version = "1.0"
    ev1.ip_address = "10.0.0.1"
    ev1.user_agent = "Mozilla/5.0"
    ev1.recorded_at = datetime.now(tz=timezone.utc)

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [ev1]
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    class FakeSession:
        async def __aenter__(self):
            return mock_db

        async def __aexit__(self, *a):
            pass

    token = make_token(role="financiador_admin")

    with patch("app.api.v1.endpoints.practitioners.get_tenant_db", return_value=FakeSession()):
        from app.api.v1.endpoints.practitioners import get_consent_history
        result = await get_consent_history(
            practitioner_id=str(_uuid.uuid4()),
            current_user=token,
        )

    assert len(result) == 1
    entry = result[0]
    assert entry["action"] == "accepted"
    assert entry["tos_version"] == "1.0"
    assert entry["ip_address"] == "10.0.0.1"
    assert entry["user_agent"] == "Mozilla/5.0"
    assert "id" in entry
    assert "recorded_at" in entry
    # recorded_at must be a non-None ISO string
    assert isinstance(entry["recorded_at"], str)


# ---------------------------------------------------------------------------
# Test 3: get_consent_history is forbidden for role 'prestador'
# ---------------------------------------------------------------------------

def test_consent_history_forbidden_for_prestador():
    """require_role must raise HTTP 403 when role is 'prestador'."""
    from fastapi import HTTPException
    from app.api.v1.deps import require_role

    prestador_token = make_token(role="prestador")
    _check = require_role("financiador_admin", "platform_admin")

    with pytest.raises(HTTPException) as exc_info:
        _check(payload=prestador_token)

    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Test 4: ConsentEvent is inserted with correct fields during registration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_consent_event_inserted_on_register():
    """
    register_practitioner must add a ConsentEvent with action='accepted' and
    tos_version='1.0' alongside the Practitioner row.
    """
    from app.models.consent_event import ConsentEvent

    # ── Shared state to capture what was added ──────────────────────────────
    added_objects = []

    # ── Mock for the tenant DB session (get_tenant_db) ─────────────────────
    mock_practitioner = MagicMock()
    mock_practitioner.id = uuid.UUID(PRACTITIONER_ID)

    mock_user = MagicMock()
    mock_user.id = uuid.uuid4()

    # execute() returns different results depending on call order:
    # 1st call (User duplicate check / insert flush) → not needed, flush handles it
    # The session needs to create User then Practitioner via add()+flush().
    # We shortcut by letting flush() be a no-op and modelling practitioner.id directly.

    call_count = {"n": 0}

    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=lambda obj: added_objects.append(obj))
    mock_db.flush = AsyncMock()

    class FakeTenantSession:
        async def __aenter__(self):
            return mock_db

        async def __aexit__(self, *a):
            pass

    # ── Mock for the anonymous DB session (AsyncSessionLocal) used to read invitation ──
    inv = MagicMock()
    inv.estado = "pendiente"
    inv.expires_at = datetime.now(tz=timezone.utc) + timedelta(days=1)
    inv.tenant_id = uuid.UUID(TENANT_ID)
    inv.email = "medico@example.com"
    inv.practitioner_id = None

    mock_anon_result = MagicMock()
    mock_anon_result.scalar_one_or_none.return_value = inv

    mock_anon_db = AsyncMock()
    mock_anon_db.execute = AsyncMock(return_value=mock_anon_result)

    class FakeAnonSession:
        async def __aenter__(self):
            return mock_anon_db

        async def __aexit__(self, *a):
            pass

    # ── Fake REFEPS verification ────────────────────────────────────────────
    fake_verification = MagicMock()
    fake_verification.found = False
    fake_verification.estado_matricula = "desconocido"
    fake_verification.fuente = "mock"
    fake_verification.cufp = None
    fake_verification.matricula_nacional = None
    fake_verification.provincias_habilitadas = []

    fake_connector = AsyncMock()
    fake_connector.verify_matricula = AsyncMock(return_value=fake_verification)

    # The Practitioner object constructed inside register_practitioner will have
    # its .id set only after flush().  We patch Practitioner so that the instance
    # already has a real UUID id.
    from app.models.practitioner import Practitioner as RealPractitioner

    class FakePractitioner(RealPractitioner):
        """Subclass that injects a stable id before SQLAlchemy assigns one."""
        def __init__(self, **kw):
            # bypass super().__init__ mapping to avoid needing a real engine
            for k, v in kw.items():
                object.__setattr__(self, k, v)
            object.__setattr__(self, "id", uuid.UUID(PRACTITIONER_ID))
            object.__setattr__(self, "consent_recorded_at", None)
            object.__setattr__(self, "consent_ip", None)

    from app.models.user import User as RealUser

    class FakeUser(RealUser):
        def __init__(self, **kw):
            for k, v in kw.items():
                object.__setattr__(self, k, v)
            object.__setattr__(self, "id", uuid.uuid4())

    fake_request = MagicMock()
    fake_request.client.host = "10.1.2.3"
    fake_request.headers.get = MagicMock(return_value="TestAgent/1.0")

    from app.api.v1.endpoints.practitioners import register_practitioner

    body = MagicMock()
    body.dni = "12345678"
    body.nombre = "Ana"
    body.apellido = "García"
    body.especialidad = "Pediatría"
    body.password = "Password1"
    body.acepta_terminos = True

    with patch("app.api.v1.endpoints.practitioners.AsyncSessionLocal", return_value=FakeAnonSession()), \
         patch("app.api.v1.endpoints.practitioners.get_tenant_db", return_value=FakeTenantSession()), \
         patch("app.api.v1.endpoints.practitioners.get_credential_connector", return_value=fake_connector), \
         patch("app.api.v1.endpoints.practitioners.Practitioner", FakePractitioner), \
         patch("app.api.v1.endpoints.practitioners.User", FakeUser):
        await register_practitioner(body=body, token="a" * 64, request=fake_request)

    consent_events = [o for o in added_objects if isinstance(o, ConsentEvent)]
    assert len(consent_events) == 1, (
        f"Expected 1 ConsentEvent, found {len(consent_events)}. "
        f"added_objects types: {[type(o).__name__ for o in added_objects]}"
    )
    ce = consent_events[0]
    assert ce.action == "accepted"
    assert ce.tos_version == "1.0"
    assert ce.practitioner_id == uuid.UUID(PRACTITIONER_ID)
    assert ce.tenant_id == uuid.UUID(TENANT_ID)
    assert ce.ip_address == "10.1.2.3"
    assert ce.user_agent == "TestAgent/1.0"
