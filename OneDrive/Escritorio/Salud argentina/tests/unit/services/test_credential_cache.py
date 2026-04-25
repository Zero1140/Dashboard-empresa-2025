"""Unit tests for CredentialCache -- fake Redis, no real network."""

import json
from dataclasses import asdict
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.connectors.base import PractitionerVerification
from app.services.credential_cache import CredentialCache

FOUND = PractitionerVerification(
    found=True,
    cufp="CUFP00001234",
    dni="12345678",
    matricula_nacional="123456",
    nombre="MARIA ALEJANDRA",
    apellido="GARCIA",
    estado_matricula="vigente",
    profesion="MEDICO",
    especialidad="MEDICINA GENERAL",
    provincias_habilitadas=["CAPITAL FEDERAL", "BUENOS AIRES"],
    fuente="refeps_rest",
)
NOT_FOUND = PractitionerVerification(found=False, fuente="refeps_rest")


def fake_redis(stored: str | None = None):
    r = MagicMock()
    r.get = AsyncMock(return_value=stored)
    r.setex = AsyncMock()
    return r


@pytest.mark.asyncio
async def test_cache_miss_calls_inner_and_stores():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock(return_value=FOUND)
    r = fake_redis(stored=None)

    result = await CredentialCache(inner=inner, redis=r).verify_matricula(dni="12345678")

    assert result.found is True
    inner.verify_matricula.assert_awaited_once_with(dni="12345678", matricula=None, cufp=None)
    r.setex.assert_awaited_once()
    key, ttl, _ = r.setex.call_args.args
    assert key == "refeps:v1:dni:12345678"
    assert ttl == 86400


@pytest.mark.asyncio
async def test_cache_hit_skips_inner():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock()
    r = fake_redis(stored=json.dumps(asdict(FOUND)))

    result = await CredentialCache(inner=inner, redis=r).verify_matricula(dni="12345678")

    assert result.found is True
    assert result.nombre == "MARIA ALEJANDRA"
    inner.verify_matricula.assert_not_awaited()


@pytest.mark.asyncio
async def test_cache_key_uses_matricula_when_no_dni():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock(return_value=FOUND)
    r = fake_redis()

    await CredentialCache(inner=inner, redis=r).verify_matricula(matricula="123456")

    key = r.setex.call_args.args[0]
    assert key == "refeps:v1:matricula:123456"


@pytest.mark.asyncio
async def test_cache_key_uses_cufp_when_only_cufp():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock(return_value=FOUND)
    r = fake_redis()

    await CredentialCache(inner=inner, redis=r).verify_matricula(cufp="CUFP00001234")

    key = r.setex.call_args.args[0]
    assert key == "refeps:v1:cufp:CUFP00001234"


@pytest.mark.asyncio
async def test_not_found_is_not_cached():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock(return_value=NOT_FOUND)
    r = fake_redis()

    result = await CredentialCache(inner=inner, redis=r).verify_matricula(dni="99999999")

    assert result.found is False
    r.setex.assert_not_awaited()


@pytest.mark.asyncio
async def test_redis_error_falls_through_to_inner():
    inner = MagicMock()
    inner.verify_matricula = AsyncMock(return_value=FOUND)
    r = MagicMock()
    r.get = AsyncMock(side_effect=Exception("Redis timeout"))
    r.setex = AsyncMock()

    result = await CredentialCache(inner=inner, redis=r).verify_matricula(dni="12345678")

    assert result.found is True
    inner.verify_matricula.assert_awaited_once()


@pytest.mark.asyncio
async def test_health_check_delegates():
    inner = MagicMock()
    inner.health_check = AsyncMock(return_value=True)

    assert await CredentialCache(inner=inner, redis=fake_redis()).health_check() is True
    inner.health_check.assert_awaited_once()
