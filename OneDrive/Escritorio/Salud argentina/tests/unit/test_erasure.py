"""Unit tests for Ley 25.326 right-to-erasure endpoint."""
import hashlib
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
# Helpers for mocking the DB sessions
# ---------------------------------------------------------------------------

def _make_tenant_session(fake_p):
    """Return a context-manager that yields a mock DB with fake_p as query result."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = fake_p

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.add = MagicMock()

    class _Session:
        async def __aenter__(self):
            return mock_db

        async def __aexit__(self, *a):
            pass

    return _Session(), mock_db


def _make_audit_session():
    """Return (context-manager, mock_db) for the audit_log session."""
    mock_audit_db = AsyncMock()
    mock_audit_db.add = MagicMock()
    mock_audit_db.commit = AsyncMock()

    class _Session:
        async def __aenter__(self):
            return mock_audit_db

        async def __aexit__(self, *a):
            pass

    return _Session(), mock_audit_db


# ---------------------------------------------------------------------------
# Test 1: anonymizes PII fields in-place
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_erase_anonymizes_fields():
    """erase_practitioner must overwrite PII fields and not raise."""
    from app.api.v1.endpoints.practitioners import erase_practitioner

    fake_p = MagicMock()
    fake_p.id = uuid.UUID(PRACTITIONER_ID)
    fake_p.dni = "12345678"
    fake_p.nombre = "Juan"
    fake_p.apellido = "Pérez"
    fake_p.cufp = "CUFP12345"
    fake_p.matricula_nacional = "MN-001"
    fake_p.especialidad = "Clínica Médica"
    fake_p.consent_ip = "192.168.1.1"

    tenant_session, mock_db = _make_tenant_session(fake_p)
    audit_session, mock_audit_db = _make_audit_session()

    expected_dni_hash = hashlib.sha256("12345678".encode()).hexdigest()[:16]

    with patch("app.api.v1.endpoints.practitioners.get_tenant_db", return_value=tenant_session), \
         patch("app.api.v1.endpoints.practitioners.AsyncSessionLocal", return_value=audit_session):
        result = await erase_practitioner(
            practitioner_id=PRACTITIONER_ID,
            current_user=make_token(),
        )

    assert fake_p.nombre == "[ELIMINADO]"
    assert fake_p.apellido == "[ELIMINADO]"
    assert fake_p.dni == expected_dni_hash
    assert len(fake_p.dni) == 16
    assert fake_p.cufp is None
    assert fake_p.matricula_nacional is None
    assert fake_p.especialidad is None
    assert fake_p.consent_ip is None
    assert result["id"] == PRACTITIONER_ID
    assert "Ley 25.326" in result["message"]


# ---------------------------------------------------------------------------
# Test 2: writes audit log with action="erasure_request"
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_erase_writes_audit_log():
    """erase_practitioner must add an AuditLog row with action='erasure_request'."""
    from app.api.v1.endpoints.practitioners import erase_practitioner
    from app.models.audit_log import AuditLog

    fake_p = MagicMock()
    fake_p.id = uuid.UUID(PRACTITIONER_ID)
    fake_p.dni = "87654321"

    tenant_session, _ = _make_tenant_session(fake_p)
    audit_session, mock_audit_db = _make_audit_session()

    added_rows = []
    mock_audit_db.add = MagicMock(side_effect=lambda row: added_rows.append(row))

    with patch("app.api.v1.endpoints.practitioners.get_tenant_db", return_value=tenant_session), \
         patch("app.api.v1.endpoints.practitioners.AsyncSessionLocal", return_value=audit_session):
        await erase_practitioner(
            practitioner_id=PRACTITIONER_ID,
            current_user=make_token(),
        )

    assert mock_audit_db.commit.awaited, "audit_db.commit() should have been awaited"
    assert len(added_rows) == 1
    row = added_rows[0]
    assert isinstance(row, AuditLog)
    assert row.action == "erasure_request"
    assert f"practitioners:{PRACTITIONER_ID}" in row.resource
    assert row.tenant_id == uuid.UUID(TENANT_ID)
    assert row.user_id == uuid.UUID(USER_ID)
    assert row.ip_address is None


# ---------------------------------------------------------------------------
# Test 3: returns 404 when practitioner not found in tenant
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_erase_returns_404_when_not_found():
    """If the practitioner doesn't exist in the tenant, must raise HTTP 404."""
    from fastapi import HTTPException
    from app.api.v1.endpoints.practitioners import erase_practitioner

    tenant_session, _ = _make_tenant_session(None)  # DB returns None
    audit_session, _ = _make_audit_session()

    with patch("app.api.v1.endpoints.practitioners.get_tenant_db", return_value=tenant_session), \
         patch("app.api.v1.endpoints.practitioners.AsyncSessionLocal", return_value=audit_session):
        with pytest.raises(HTTPException) as exc_info:
            await erase_practitioner(
                practitioner_id=PRACTITIONER_ID,
                current_user=make_token(),
            )

    assert exc_info.value.status_code == 404
    assert "Prestador no encontrado" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Test 4: returns 403 for role 'prestador'
# ---------------------------------------------------------------------------

def test_erase_forbidden_for_prestador_role():
    """A token with role 'prestador' must be rejected with HTTP 403."""
    from fastapi import HTTPException
    from app.api.v1.deps import require_role

    prestador_token = make_token(role="prestador")

    # require_role("financiador_admin", "platform_admin") returns _check(payload=...)
    # We call the inner function directly, bypassing FastAPI DI.
    _check = require_role("financiador_admin", "platform_admin")
    with pytest.raises(HTTPException) as exc_info:
        _check(payload=prestador_token)

    assert exc_info.value.status_code == 403


# ---------------------------------------------------------------------------
# Test 5: full HTTP integration — DELETE /v1/practitioners/{id} requires auth
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_erase_endpoint_requires_auth():
    """DELETE /v1/practitioners/{id} with no token must return 403."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.delete(f"/v1/practitioners/{PRACTITIONER_ID}")

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 6: dni hash is deterministic and 16-chars long
# ---------------------------------------------------------------------------

def test_dni_hash_is_deterministic_and_truncated():
    """The sha256[:16] hash used for DNI anonymization must be stable and 16 chars."""
    dni = "12345678"
    h1 = hashlib.sha256(dni.encode()).hexdigest()[:16]
    h2 = hashlib.sha256(dni.encode()).hexdigest()[:16]
    assert h1 == h2
    assert len(h1) == 16
    # Must not be the original DNI
    assert h1 != dni
