"""
Redis cache decorator for CredentialConnector.
Cache-aside, 24 h TTL. Only positive results cached. Redis failures swallowed.
"""

import json
import logging
from dataclasses import asdict

import redis.asyncio as aioredis

from app.connectors.base import CredentialConnector, PractitionerVerification

logger = logging.getLogger(__name__)

_PREFIX = "refeps:v1"
_TTL = 86400  # 24 hours


class CredentialCache(CredentialConnector):
    """
    Wraps a CredentialConnector with Redis caching.

    Production: CredentialCache(inner=REFEPSConnector(...), redis_url="redis://redis:6379/0")
    Tests:      CredentialCache(inner=mock_connector, redis=fake_redis_instance)
    """

    def __init__(
        self,
        inner: CredentialConnector,
        redis: aioredis.Redis | None = None,
        redis_url: str | None = None,
    ):
        self._inner = inner
        self._redis: aioredis.Redis | None = redis
        self._redis_url = redis_url

    async def _get_redis(self) -> aioredis.Redis | None:
        if self._redis is not None:
            return self._redis
        if self._redis_url:
            self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
            return self._redis
        return None

    async def verify_matricula(
        self,
        dni: str | None = None,
        matricula: str | None = None,
        cufp: str | None = None,
    ) -> PractitionerVerification:
        key = _cache_key(dni=dni, matricula=matricula, cufp=cufp)
        r = await self._get_redis()

        if key and r:
            try:
                cached = await r.get(key)
                if cached:
                    logger.debug("REFEPS cache HIT: %s", key)
                    return PractitionerVerification(**json.loads(cached))
            except Exception as exc:
                logger.warning("Redis GET failed, bypassing cache: %s", exc)

        result = await self._inner.verify_matricula(dni=dni, matricula=matricula, cufp=cufp)

        if result.found and key and r:
            try:
                await r.setex(key, _TTL, json.dumps(asdict(result)))
                logger.debug("REFEPS cache SET: %s (TTL=%ds)", key, _TTL)
            except Exception as exc:
                logger.warning("Redis SETEX failed: %s", exc)

        return result

    async def health_check(self) -> bool:
        return await self._inner.health_check()


def _cache_key(dni: str | None, matricula: str | None, cufp: str | None) -> str | None:
    if dni:
        return f"{_PREFIX}:dni:{dni}"
    if matricula:
        return f"{_PREFIX}:matricula:{matricula}"
    if cufp:
        return f"{_PREFIX}:cufp:{cufp}"
    return None
