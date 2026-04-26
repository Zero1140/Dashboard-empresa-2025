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
