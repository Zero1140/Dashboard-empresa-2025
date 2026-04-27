"""
Tests for audit log DB persistence (Ley 25.326).

Test 1 — AuditLog model instantiation with required fields.
Test 2 — _write_audit writes a row to the DB (AsyncSessionLocal mocked).
Test 3 — GET /v1/admin/audit-log returns 403 for an unauthorized role.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Test 1: AuditLog model can be instantiated with required fields
# ---------------------------------------------------------------------------

def test_audit_log_model_instantiation():
    from app.models.audit_log import AuditLog

    log = AuditLog(
        action="list_practitioners",
        resource="/v1/practitioners",
        ip_address="127.0.0.1",
    )
    assert log.action == "list_practitioners"
    assert log.resource == "/v1/practitioners"
    assert log.ip_address == "127.0.0.1"
    assert log.tenant_id is None
    assert log.user_id is None


def test_audit_log_model_with_uuids():
    from app.models.audit_log import AuditLog

    tid = uuid.uuid4()
    uid = uuid.uuid4()
    log = AuditLog(
        tenant_id=tid,
        user_id=uid,
        action="create_prescription",
        resource="/v1/prescriptions",
        ip_address="10.0.0.1",
    )
    assert log.tenant_id == tid
    assert log.user_id == uid
    assert log.action == "create_prescription"


# ---------------------------------------------------------------------------
# Test 2: _write_audit writes to DB (AsyncSessionLocal mocked)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_write_audit_calls_db():
    from app.middleware.audit import _write_audit

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    mock_session_factory = MagicMock(return_value=mock_session)

    # _write_audit does `from app.core.database import AsyncSessionLocal` locally,
    # so we patch the attribute on the source module it imports from.
    with patch("app.core.database.AsyncSessionLocal", mock_session_factory):
        await _write_audit(
            action="list_practitioners",
            resource="/v1/practitioners",
            user_id_str=str(uuid.uuid4()),
            tenant_id_str=str(uuid.uuid4()),
            ip="127.0.0.1",
        )

    mock_session.add.assert_called_once()
    mock_session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_write_audit_anonymous_user():
    """Anonymous/unknown strings should produce None UUIDs without raising."""
    from app.middleware.audit import _write_audit

    added_rows = []

    mock_session = AsyncMock()
    mock_session.add = MagicMock(side_effect=lambda row: added_rows.append(row))
    mock_session.commit = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.database.AsyncSessionLocal", return_value=mock_session):
        await _write_audit(
            action="check_eligibility",
            resource="/v1/eligibility/check",
            user_id_str="anonymous",
            tenant_id_str="unknown",
            ip="192.168.1.1",
        )

    assert mock_session.add.called
    row = added_rows[0]
    assert row.user_id is None
    assert row.tenant_id is None


@pytest.mark.asyncio
async def test_write_audit_swallows_db_errors():
    """DB errors must not propagate — the middleware should stay silent."""
    from app.middleware.audit import _write_audit

    mock_session = AsyncMock()
    mock_session.add = MagicMock(side_effect=RuntimeError("DB down"))
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    with patch("app.core.database.AsyncSessionLocal", return_value=mock_session):
        # Should not raise
        await _write_audit("list_practitioners", "/v1/practitioners", "anonymous", "unknown", "1.2.3.4")


# ---------------------------------------------------------------------------
# Test 3: GET /v1/admin/audit-log returns 403 for unauthorized role
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_admin_audit_log_unauthorized_role():
    """A user with role 'prestador' must get 403."""
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/v1/admin/audit-log")

    # No Authorization header → HTTPBearer returns 403
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_audit_log_wrong_role_token():
    """A valid token with role 'prestador' must get 403 (require_role check)."""
    from app.core.security import create_access_token
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    token = create_access_token(
        user_id=str(uuid.uuid4()),
        tenant_id=str(uuid.uuid4()),
        role="prestador",
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get(
            "/v1/admin/audit-log",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 4: _derive_action label mapping
# ---------------------------------------------------------------------------

def test_derive_action_known_paths():
    from app.middleware.audit import _derive_action

    assert _derive_action("GET", "/v1/practitioners") == "list_practitioners"
    assert _derive_action("POST", "/v1/practitioners/invite") == "invite_practitioner"
    assert _derive_action("GET", "/v1/credentials/verify") == "verify_credentials"
    assert _derive_action("GET", "/v1/eligibility/check") == "check_eligibility"
    assert _derive_action("POST", "/v1/consultations") == "create_consultation"
    assert _derive_action("POST", "/v1/prescriptions") == "create_prescription"


def test_derive_action_unknown_path():
    from app.middleware.audit import _derive_action

    result = _derive_action("DELETE", "/v1/unknown/path")
    assert result == "DELETE /v1/unknown/path"
