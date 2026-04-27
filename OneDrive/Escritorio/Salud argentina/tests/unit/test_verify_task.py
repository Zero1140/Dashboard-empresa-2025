"""Unit tests for the Celery weekly re-verification task."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


def test_verify_all_active_task_registered():
    from app.tasks.verify_practitioners import verify_all_active
    assert callable(verify_all_active)


@pytest.mark.asyncio
async def test_verify_all_async_no_practitioners():
    """With an empty DB, returns updated=0, errors=0."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    class FakeSession:
        async def __aenter__(self):
            return mock_db
        async def __aexit__(self, *args):
            pass

    # get_credential_connector is imported inside the function from app.connectors.registry
    with patch("app.connectors.registry.get_credential_connector") as mock_reg, \
         patch("app.core.database.AsyncSessionLocal", FakeSession):
        mock_reg.return_value = AsyncMock()
        from app.tasks.verify_practitioners import _verify_all_async
        result = await _verify_all_async()

    assert result == {"updated": 0, "errors": 0}


@pytest.mark.asyncio
async def test_verify_all_async_errors_handled():
    """Connector errors are counted, not propagated."""
    fake_p = MagicMock()
    fake_p.id = "p-uuid-err"
    fake_p.dni = "99999999"

    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [fake_p]

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(return_value=mock_result)

    class FakeSession:
        async def __aenter__(self):
            return mock_db
        async def __aexit__(self, *args):
            pass

    mock_connector = AsyncMock()
    mock_connector.verify_matricula = AsyncMock(side_effect=Exception("REFEPS unavailable"))

    with patch("app.connectors.registry.get_credential_connector", return_value=mock_connector), \
         patch("app.core.database.AsyncSessionLocal", FakeSession):
        from app.tasks.verify_practitioners import _verify_all_async
        result = await _verify_all_async()

    assert result["updated"] == 0
    assert result["errors"] == 1


def test_verify_all_active_sync_calls_asyncio_run():
    """verify_all_active() delegates to asyncio.run(_verify_all_async())."""
    with patch("app.tasks.verify_practitioners.asyncio") as mock_asyncio:
        mock_asyncio.run.return_value = {"updated": 2, "errors": 0}
        from app.tasks.verify_practitioners import verify_all_active
        result = verify_all_active()
    mock_asyncio.run.assert_called_once()
    assert result == {"updated": 2, "errors": 0}


@pytest.mark.asyncio
async def test_verify_all_async_updates_found_practitioner():
    """When connector finds a practitioner, DB record is updated and committed."""
    fake_p = MagicMock()
    fake_p.id = "p-uuid-ok"
    fake_p.dni = "12345678"

    # First execute call: SELECT all active practitioners
    mock_result_list = MagicMock()
    mock_result_list.scalars.return_value.all.return_value = [fake_p]

    # Second execute call: SELECT practitioner by id for the update
    mock_result_single = MagicMock()
    mock_result_single.scalar_one_or_none.return_value = fake_p

    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(side_effect=[mock_result_list, mock_result_single])
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    class FakeSession:
        async def __aenter__(self):
            return mock_db
        async def __aexit__(self, *args):
            pass

    verify_response = MagicMock()
    verify_response.found = True
    verify_response.estado_matricula = "vigente"
    verify_response.provincias_habilitadas = ["Buenos Aires"]
    verify_response.fuente = "REFEPS"

    mock_connector = AsyncMock()
    mock_connector.verify_matricula = AsyncMock(return_value=verify_response)

    with patch("app.connectors.registry.get_credential_connector", return_value=mock_connector), \
         patch("app.core.database.AsyncSessionLocal", FakeSession):
        from app.tasks.verify_practitioners import _verify_all_async
        result = await _verify_all_async()

    assert result["updated"] == 1
    assert result["errors"] == 0
    mock_db.commit.assert_called_once()
