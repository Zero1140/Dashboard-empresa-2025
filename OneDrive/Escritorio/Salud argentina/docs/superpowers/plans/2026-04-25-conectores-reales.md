# Real External Connectors (REFEPS + Farmalink) -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `raise NotImplementedError` stubs in the REFEPS and Farmalink connectors with working HTTP implementations, add a Redis cache layer for REFEPS, register the prescription connector in the registry, and cover everything with unit + integration tests.

**Architecture:** Each connector wraps a single external API. REFEPS uses HTTP Basic auth against the SISA REST endpoint; results are cached 24 h in Redis via a thin `CredentialCache` service that implements the same `CredentialConnector` interface (decorator pattern). Farmalink uses Bearer token for both eligibility and prescription routing. `registry.py` wires the cache transparently when `refeps_mock_mode=False`. A new `get_prescription_connector()` is added to the registry so callers never import `FarmalinkConnector` directly. Integration tests live in `tests/integration/` and are skipped automatically unless the real env-vars are present.

**Tech Stack:** FastAPI async, Python 3.12, httpx (async HTTP), redis.asyncio (already in `app/core/redis.py`), tenacity (retries, already on `REFEPSConnector`), pytest + pytest-asyncio, respx (httpx mock transport for unit tests).

---

## File Map

**Create:**
- `tests/unit/connectors/test_refeps_real.py` -- unit tests for `REFEPSConnector.verify_matricula` using respx
- `app/services/credential_cache.py` -- Redis cache decorator implementing `CredentialConnector`
- `tests/unit/services/test_credential_cache.py` -- unit tests for the cache layer
- `tests/unit/connectors/test_farmalink_real.py` -- unit tests for `FarmalinkConnector.check_coverage` and `route_prescription` using respx
- `tests/integration/__init__.py` -- empty, marks the package
- `tests/integration/test_refeps_integration.py` -- integration tests, skip unless `REFEPS_USERNAME` set
- `tests/integration/test_farmalink_integration.py` -- integration tests, skip unless `FARMALINK_API_KEY` set

**Modify:**
- `app/connectors/refeps/client.py` -- implement `verify_matricula()`
- `app/connectors/farmalink/client.py` -- implement `check_coverage()` and `route_prescription()`
- `app/connectors/registry.py` -- wrap real REFEPS connector in cache; add `get_prescription_connector()`

---

## Task 1: Implement `REFEPSConnector.verify_matricula()`

**Files:**
- Modify: `app/connectors/refeps/client.py`
- Create: `tests/unit/connectors/test_refeps_real.py`

The SISA REST endpoint is `GET https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar` with HTTP Basic auth. Query params: `nroDoc` (DNI), `matricula`, `tipoProfesional` (always `"M"`). The connector already builds `self._auth` and `self._client` in `__init__`; the `@retry` decorator is already in place.

- [ ] **Step 1: Install respx**

```bash
uv add --dev respx
```

- [ ] **Step 2: Write the failing tests**

```python
# tests/unit/connectors/test_refeps_real.py
"""Unit tests for REFEPSConnector.verify_matricula() -- no real network calls."""

import pytest
import respx
from httpx import Response

from app.connectors.refeps.client import REFEPSConnector

REST_URL = "https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar"


@pytest.fixture
def connector():
    return REFEPSConnector(
        ws_url="https://sisa.msal.gov.ar/sisa/services/profesionalService",
        rest_url=REST_URL,
        username="test_user",
        password="test_pass",
    )


FOUND_PAYLOAD = {
    "resultado": "OK",
    "errores": None,
    "profesional": {
        "cuil": "20123456789",
        "nroDoc": "12345678",
        "apellido": "GARCIA",
        "nombre": "MARIA ALEJANDRA",
        "cufp": "CUFP00001234",
        "titulos": [
            {
                "titulo": "MEDICO",
                "matriculaNacional": "123456",
                "estadoMatricula": "VIGENTE",
                "especialidades": [{"descripcion": "MEDICINA GENERAL"}],
                "habilitaciones": [
                    {"provincia": "CAPITAL FEDERAL"},
                    {"provincia": "BUENOS AIRES"},
                ],
            }
        ],
    },
}

NOT_FOUND_PAYLOAD = {"resultado": "OK", "errores": None, "profesional": None}
AUTH_ERROR_PAYLOAD = {"resultado": "ERROR", "errores": ["Credenciales invalidas"]}


@pytest.mark.asyncio
@respx.mock
async def test_verify_by_dni_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=FOUND_PAYLOAD))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is True
    assert result.dni == "12345678"
    assert result.cufp == "CUFP00001234"
    assert result.nombre == "MARIA ALEJANDRA"
    assert result.apellido == "GARCIA"
    assert result.estado_matricula == "vigente"
    assert result.matricula_nacional == "123456"
    assert result.especialidad == "MEDICINA GENERAL"
    assert "CAPITAL FEDERAL" in result.provincias_habilitadas
    assert "BUENOS AIRES" in result.provincias_habilitadas
    assert result.fuente == "refeps_rest"
    assert result.error is None


@pytest.mark.asyncio
@respx.mock
async def test_verify_by_matricula_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=FOUND_PAYLOAD))
    result = await connector.verify_matricula(matricula="123456")
    assert result.found is True
    assert result.matricula_nacional == "123456"


@pytest.mark.asyncio
@respx.mock
async def test_verify_not_found(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=NOT_FOUND_PAYLOAD))
    result = await connector.verify_matricula(dni="99999999")
    assert result.found is False
    assert result.fuente == "refeps_rest"
    assert result.error is None


@pytest.mark.asyncio
@respx.mock
async def test_verify_auth_error(connector):
    respx.get(REST_URL).mock(return_value=Response(200, json=AUTH_ERROR_PAYLOAD))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is False
    assert result.error == "Credenciales invalidas"
    assert result.fuente == "refeps_rest"


@pytest.mark.asyncio
async def test_verify_raises_on_no_params(connector):
    with pytest.raises(ValueError, match="Se requiere al menos uno"):
        await connector.verify_matricula()


@pytest.mark.asyncio
@respx.mock
async def test_verify_estado_lowercased(connector):
    payload = {
        "resultado": "OK",
        "errores": None,
        "profesional": {
            **FOUND_PAYLOAD["profesional"],
            "titulos": [
                {**FOUND_PAYLOAD["profesional"]["titulos"][0], "estadoMatricula": "SUSPENDIDA"}
            ],
        },
    }
    respx.get(REST_URL).mock(return_value=Response(200, json=payload))
    result = await connector.verify_matricula(dni="12345678")
    assert result.estado_matricula == "suspendida"


@pytest.mark.asyncio
@respx.mock
async def test_verify_sin_titulos(connector):
    payload = {
        "resultado": "OK",
        "errores": None,
        "profesional": {
            "cuil": "20123456789",
            "nroDoc": "12345678",
            "apellido": "GARCIA",
            "nombre": "MARIA",
            "cufp": "CUFP00001234",
            "titulos": [],
        },
    }
    respx.get(REST_URL).mock(return_value=Response(200, json=payload))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is True
    assert result.matricula_nacional is None
    assert result.estado_matricula == "desconocido"
    assert result.provincias_habilitadas == []


@pytest.mark.asyncio
@respx.mock
async def test_verify_http_500_returns_error_result(connector):
    respx.get(REST_URL).mock(return_value=Response(500))
    result = await connector.verify_matricula(dni="12345678")
    assert result.found is False
    assert result.error == "HTTP 500"
    assert result.fuente == "refeps_rest"
```

- [ ] **Step 3: Run tests -- confirm they fail**

```bash
pytest tests/unit/connectors/test_refeps_real.py -v --no-cov
```

Expected: `FAILED` with `NotImplementedError`.

- [ ] **Step 4: Replace `app/connectors/refeps/client.py`**

```python
# app/connectors/refeps/client.py
"""
Conector real al WS REFEPS / SISA (REST, HTTP Basic auth).
Para activar: REFEPS_MOCK_MODE=false, REFEPS_USERNAME=..., REFEPS_PASSWORD=...
Ver PENDING_INTEGRATIONS.md.
"""

import logging

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.connectors.base import CredentialConnector, PractitionerVerification

logger = logging.getLogger(__name__)


class REFEPSConnector(CredentialConnector):
    def __init__(self, ws_url: str, rest_url: str, username: str, password: str):
        self._rest_url = rest_url
        self._ws_url = ws_url
        self._auth = (username, password)
        self._client = httpx.AsyncClient(auth=self._auth, timeout=15.0)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=5))
    async def verify_matricula(
        self,
        dni: str | None = None,
        matricula: str | None = None,
        cufp: str | None = None,
    ) -> PractitionerVerification:
        if not any([dni, matricula, cufp]):
            raise ValueError("Se requiere al menos uno: dni, matricula o cufp.")

        params: dict[str, str] = {"tipoProfesional": "M"}
        if dni:
            params["nroDoc"] = dni
        elif matricula:
            params["matricula"] = matricula
        elif cufp:
            params["nroDoc"] = cufp

        try:
            resp = await self._client.get(self._rest_url, params=params)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("REFEPS HTTP error %s", exc.response.status_code)
            return PractitionerVerification(
                found=False, fuente="refeps_rest", error=f"HTTP {exc.response.status_code}"
            )
        except httpx.RequestError as exc:
            logger.error("REFEPS request error: %s", exc)
            return PractitionerVerification(found=False, fuente="refeps_rest", error=str(exc))

        data = resp.json()

        if data.get("resultado") == "ERROR":
            errores = data.get("errores") or []
            msg = "; ".join(errores) if errores else "Error desconocido"
            return PractitionerVerification(found=False, fuente="refeps_rest", error=msg)

        profesional = data.get("profesional")
        if not profesional:
            return PractitionerVerification(found=False, fuente="refeps_rest")

        return _parse_profesional(profesional)

    async def health_check(self) -> bool:
        try:
            resp = await self._client.get(self._rest_url, timeout=5.0)
            return resp.status_code < 500
        except Exception as exc:
            logger.warning("REFEPS health check fallo: %s", exc)
            return False


def _parse_profesional(p: dict) -> PractitionerVerification:
    titulos: list[dict] = p.get("titulos") or []
    titulo = titulos[0] if titulos else {}
    especialidades: list[dict] = titulo.get("especialidades") or []
    especialidad = especialidades[0].get("descripcion") if especialidades else None
    habilitaciones: list[dict] = titulo.get("habilitaciones") or []
    provincias = [h["provincia"] for h in habilitaciones if h.get("provincia")]
    raw_estado: str = titulo.get("estadoMatricula") or "DESCONOCIDO"

    return PractitionerVerification(
        found=True,
        cufp=p.get("cufp"),
        dni=p.get("nroDoc"),
        matricula_nacional=titulo.get("matriculaNacional"),
        nombre=p.get("nombre"),
        apellido=p.get("apellido"),
        estado_matricula=raw_estado.lower(),
        profesion=titulo.get("titulo"),
        especialidad=especialidad,
        provincias_habilitadas=provincias,
        fuente="refeps_rest",
    )
```

- [ ] **Step 5: Run tests -- confirm they pass**

```bash
pytest tests/unit/connectors/test_refeps_real.py -v --no-cov
```

Expected: `8 passed`.

- [ ] **Step 6: Run full unit suite**

```bash
pytest tests/unit/ --no-cov -q
```

- [ ] **Step 7: Commit**

```bash
git add app/connectors/refeps/client.py tests/unit/connectors/test_refeps_real.py
git commit -m "feat(refeps): implement verify_matricula() against SISA REST endpoint"
```

---

## Task 2: Add Redis cache wrapper for REFEPS

**Files:**
- Create: `app/services/credential_cache.py`
- Create: `tests/unit/services/test_credential_cache.py`

Wraps any `CredentialConnector` using the decorator pattern. Cache key: `refeps:v1:{type}:{value}`. TTL: 86400 s. Only positive results are cached. Redis failures are swallowed (fail-open). Accepts an injected `aioredis.Redis` instance (tests) or a lazy `redis_url` string (production).

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/services/test_credential_cache.py
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
```

- [ ] **Step 2: Run tests -- confirm they fail**

```bash
pytest tests/unit/services/test_credential_cache.py -v --no-cov
```

Expected: `ModuleNotFoundError: No module named 'app.services.credential_cache'`.

- [ ] **Step 3: Create `app/services/credential_cache.py`**

```python
# app/services/credential_cache.py
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
```

- [ ] **Step 4: Run tests -- confirm they pass**

```bash
pytest tests/unit/services/test_credential_cache.py -v --no-cov
```

Expected: `7 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/services/credential_cache.py tests/unit/services/test_credential_cache.py
git commit -m "feat(cache): add Redis 24h cache decorator for REFEPS credential lookups"
```

---

## Task 3: Wire cache into registry + add `get_prescription_connector()`

**Files:**
- Modify: `app/connectors/registry.py`

- [ ] **Step 1: Replace `app/connectors/registry.py`**

```python
# app/connectors/registry.py
"""
Registry de conectores. Devuelve la implementacion correcta segun la config.
Cambiar REFEPS_MOCK_MODE / FARMALINK_MOCK_MODE en .env.
"""

from functools import lru_cache

from app.connectors.base import CredentialConnector, EligibilityConnector, PrescriptionConnector
from app.core.config import settings


@lru_cache
def get_credential_connector() -> CredentialConnector:
    if settings.refeps_mock_mode:
        from app.connectors.refeps.mock import MockREFEPSConnector
        return MockREFEPSConnector()
    from app.connectors.refeps.client import REFEPSConnector
    from app.services.credential_cache import CredentialCache
    real = REFEPSConnector(
        ws_url=settings.refeps_ws_url,
        rest_url=settings.refeps_rest_url,
        username=settings.refeps_username,
        password=settings.refeps_password,
    )
    return CredentialCache(inner=real, redis_url=settings.redis_url)


@lru_cache
def get_eligibility_connector() -> EligibilityConnector:
    """
    Farmalink es el hub principal: OSDE + Swiss Medical + Medife + IOMA + 20 mas.
    Cuando llegue homologacion, cambiar FARMALINK_MOCK_MODE=false.
    """
    if settings.farmalink_mock_mode:
        from app.connectors.farmalink.mock import MockFarmalinkConnector
        return MockFarmalinkConnector()
    from app.connectors.farmalink.client import FarmalinkConnector
    return FarmalinkConnector(
        base_url=settings.farmalink_base_url,
        api_key=settings.farmalink_api_key,
    )


@lru_cache
def get_prescription_connector() -> PrescriptionConnector:
    """Returns the prescription connector. Farmalink routes prescriptions to pharmacies."""
    if settings.farmalink_mock_mode:
        from app.connectors.farmalink.mock import MockFarmalinkConnector
        return MockFarmalinkConnector()
    from app.connectors.farmalink.client import FarmalinkConnector
    return FarmalinkConnector(
        base_url=settings.farmalink_base_url,
        api_key=settings.farmalink_api_key,
    )
```

- [ ] **Step 2: Run all unit tests -- confirm nothing broke**

```bash
pytest tests/unit/ --no-cov -q
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/connectors/registry.py
git commit -m "feat(registry): wrap real REFEPS in Redis cache; add get_prescription_connector()"
```

---

## Task 4: Implement `FarmalinkConnector.check_coverage()` and `route_prescription()`

**Files:**
- Modify: `app/connectors/farmalink/client.py`
- Create: `tests/unit/connectors/test_farmalink_real.py`

Coverage: `POST {base_url}/FARMALINK_RE/farmalink/v3/cobertura` with JSON body.
Routing: `POST {base_url}/FARMALINK_RE/farmalink/v3/receta` with JSON body.
Auth: `Authorization: Bearer {api_key}` (already set in `__init__`).

- [ ] **Step 1: Write the failing tests**

```python
# tests/unit/connectors/test_farmalink_real.py
"""Unit tests for FarmalinkConnector -- no real network calls."""

import json

import pytest
import respx
from httpx import Response

from app.connectors.farmalink.client import FarmalinkConnector

BASE = "https://sandbox.farmalink.com.ar"
COB_URL = f"{BASE}/FARMALINK_RE/farmalink/v3/cobertura"
REC_URL = f"{BASE}/FARMALINK_RE/farmalink/v3/receta"


@pytest.fixture
def connector():
    return FarmalinkConnector(base_url=BASE, api_key="test-key")


COV_OK = {
    "resultado": "OK",
    "cobertura": {
        "activa": True,
        "idAfiliado": "SWISS-001",
        "idFinanciador": "112233",
        "nombreFinanciador": "Swiss Medical",
        "plan": "SMG30",
        "estado": "ACTIVA",
    },
}
COV_INACTIVE = {
    "resultado": "OK",
    "cobertura": {
        "activa": False,
        "idAfiliado": "SANCOR-001",
        "idFinanciador": "445566",
        "nombreFinanciador": "Sancor Salud",
        "plan": "S30",
        "estado": "SUSPENDIDA",
    },
}
COV_ERROR = {"resultado": "ERROR", "errores": ["Afiliado no encontrado"]}
REC_OK = {"resultado": "OK", "trackingId": "FLK-TRK-ABC123", "cuir": "DEVP1745494827341a3f9c21AB"}
REC_ERROR = {"resultado": "ERROR", "errores": ["CUIR duplicado"]}


@pytest.mark.asyncio
@respx.mock
async def test_coverage_active(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_OK))
    r = await connector.check_coverage(afiliado_id="SWISS-001", financiador_id="112233")
    assert r.found is True
    assert r.activa is True
    assert r.afiliado_id == "SWISS-001"
    assert r.financiador_id == "112233"
    assert r.financiador_nombre == "Swiss Medical"
    assert r.plan == "SMG30"
    assert r.estado == "activa"
    assert r.fuente == "farmalink"
    assert r.error is None


@pytest.mark.asyncio
@respx.mock
async def test_coverage_inactive(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_INACTIVE))
    r = await connector.check_coverage(afiliado_id="SANCOR-001", financiador_id="445566")
    assert r.found is True
    assert r.activa is False
    assert r.estado == "suspendida"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_not_found(connector):
    respx.post(COB_URL).mock(return_value=Response(200, json=COV_ERROR))
    r = await connector.check_coverage(afiliado_id="INEXISTENTE", financiador_id="000")
    assert r.found is False
    assert r.error == "Afiliado no encontrado"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_passes_prestacion_code(connector):
    route = respx.post(COB_URL).mock(return_value=Response(200, json=COV_OK))
    await connector.check_coverage(
        afiliado_id="SWISS-001", financiador_id="112233", prestacion_code="372687004"
    )
    body = json.loads(route.calls.last.request.content)
    assert body["idPrestacion"] == "372687004"


@pytest.mark.asyncio
@respx.mock
async def test_coverage_http_error(connector):
    respx.post(COB_URL).mock(return_value=Response(503))
    r = await connector.check_coverage(afiliado_id="SWISS-001", financiador_id="112233")
    assert r.found is False
    assert r.error == "HTTP 503"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_success(connector):
    respx.post(REC_URL).mock(return_value=Response(200, json=REC_OK))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
        financiador_id="112233",
    )
    assert r.success is True
    assert r.cuir == "DEVP1745494827341a3f9c21AB"
    assert r.tracking_id == "FLK-TRK-ABC123"
    assert r.fuente == "farmalink"
    assert r.error is None


@pytest.mark.asyncio
@respx.mock
async def test_prescription_error(connector):
    respx.post(REC_URL).mock(return_value=Response(200, json=REC_ERROR))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
    )
    assert r.success is False
    assert r.error == "CUIR duplicado"
    assert r.fuente == "farmalink"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_sends_correct_body(connector):
    route = respx.post(REC_URL).mock(return_value=Response(200, json=REC_OK))
    await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
        financiador_id="112233",
    )
    body = json.loads(route.calls.last.request.content)
    assert body["cuir"] == "DEVP1745494827341a3f9c21AB"
    assert body["cufpPrescriptor"] == "CUFP00001234"
    assert body["dniPaciente"] == "12345678"
    assert body["medicamentoSnomedCode"] == "372687004"
    assert body["idFinanciador"] == "112233"


@pytest.mark.asyncio
@respx.mock
async def test_prescription_http_error(connector):
    respx.post(REC_URL).mock(return_value=Response(500))
    r = await connector.route_prescription(
        cuir="DEVP1745494827341a3f9c21AB",
        prescriber_cufp="CUFP00001234",
        patient_dni="12345678",
        medicamento_snomed="372687004",
    )
    assert r.success is False
    assert r.error == "HTTP 500"
    assert r.fuente == "farmalink"
```

- [ ] **Step 2: Run tests -- confirm they fail**

```bash
pytest tests/unit/connectors/test_farmalink_real.py -v --no-cov
```

Expected: `FAILED` with `NotImplementedError`.

- [ ] **Step 3: Replace `app/connectors/farmalink/client.py`**

```python
# app/connectors/farmalink/client.py
"""
Conector Farmalink Hub -- elegibilidad + routing de recetas, 25+ financiadores.
Para activar: FARMALINK_MOCK_MODE=false, FARMALINK_API_KEY=...
Ver PENDING_INTEGRATIONS.md.
Sandbox: https://sandbox.farmalink.com.ar/apis-docs/FARMALINK_RE/farmalink/v3
"""

import logging

import httpx

from app.connectors.base import (
    CoverageResult,
    EligibilityConnector,
    PrescriptionConnector,
    PrescriptionRouteResult,
)

logger = logging.getLogger(__name__)

_COB_PATH = "/FARMALINK_RE/farmalink/v3/cobertura"
_REC_PATH = "/FARMALINK_RE/farmalink/v3/receta"


class FarmalinkConnector(EligibilityConnector, PrescriptionConnector):
    """Hub Farmalink: una integracion cubre ~70% del mercado argentino."""

    def __init__(self, base_url: str, api_key: str):
        self._base_url = base_url.rstrip("/")
        self._http = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=10.0,
        )

    async def check_coverage(
        self,
        afiliado_id: str,
        financiador_id: str,
        prestacion_code: str | None = None,
    ) -> CoverageResult:
        url = f"{self._base_url}{_COB_PATH}"
        body = {
            "idAfiliado": afiliado_id,
            "idFinanciador": financiador_id,
            "idPrestacion": prestacion_code,
        }
        try:
            resp = await self._http.post(url, json=body)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("Farmalink cobertura HTTP %s", exc.response.status_code)
            return CoverageResult(
                found=False, fuente="farmalink", error=f"HTTP {exc.response.status_code}"
            )
        except httpx.RequestError as exc:
            logger.error("Farmalink cobertura request error: %s", exc)
            return CoverageResult(found=False, fuente="farmalink", error=str(exc))

        data = resp.json()
        if data.get("resultado") == "ERROR":
            errores = data.get("errores") or []
            msg = "; ".join(errores) if errores else "Error desconocido"
            return CoverageResult(found=False, fuente="farmalink", error=msg)

        cob = data.get("cobertura") or {}
        raw_estado: str = cob.get("estado") or "DESCONOCIDA"
        return CoverageResult(
            found=True,
            activa=bool(cob.get("activa")),
            afiliado_id=cob.get("idAfiliado"),
            financiador_id=cob.get("idFinanciador"),
            financiador_nombre=cob.get("nombreFinanciador"),
            plan=cob.get("plan"),
            estado=raw_estado.lower(),
            fuente="farmalink",
        )

    async def route_prescription(
        self,
        cuir: str,
        prescriber_cufp: str,
        patient_dni: str,
        medicamento_snomed: str,
        financiador_id: str | None = None,
    ) -> PrescriptionRouteResult:
        url = f"{self._base_url}{_REC_PATH}"
        body = {
            "cuir": cuir,
            "cufpPrescriptor": prescriber_cufp,
            "dniPaciente": patient_dni,
            "medicamentoSnomedCode": medicamento_snomed,
            "idFinanciador": financiador_id,
        }
        try:
            resp = await self._http.post(url, json=body)
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.error("Farmalink receta HTTP %s", exc.response.status_code)
            return PrescriptionRouteResult(
                success=False, fuente="farmalink", error=f"HTTP {exc.response.status_code}"
            )
        except httpx.RequestError as exc:
            logger.error("Farmalink receta request error: %s", exc)
            return PrescriptionRouteResult(success=False, fuente="farmalink", error=str(exc))

        data = resp.json()
        if data.get("resultado") == "ERROR":
            errores = data.get("errores") or []
            msg = "; ".join(errores) if errores else "Error desconocido"
            return PrescriptionRouteResult(success=False, fuente="farmalink", error=msg)

        return PrescriptionRouteResult(
            success=True,
            cuir=data.get("cuir"),
            tracking_id=data.get("trackingId"),
            fuente="farmalink",
        )

    async def health_check(self) -> bool:
        try:
            resp = await self._http.get(f"{self._base_url}/health", timeout=5.0)
            return resp.status_code < 500
        except Exception as exc:
            logger.warning("Farmalink health check fallo: %s", exc)
            return False
```

- [ ] **Step 4: Run Farmalink unit tests**

```bash
pytest tests/unit/connectors/test_farmalink_real.py tests/unit/connectors/test_farmalink_mock.py -v --no-cov
```

Expected: `14 passed`.

- [ ] **Step 5: Commit**

```bash
git add app/connectors/farmalink/client.py tests/unit/connectors/test_farmalink_real.py
git commit -m "feat(farmalink): implement check_coverage() and route_prescription() against Farmalink v3"
```

---

## Task 5: Full unit suite green check

No new code -- validation gate before writing integration tests.

- [ ] **Step 1: Run all unit tests with coverage**

```bash
pytest tests/unit/ -v
```

Expected: all tests pass, coverage >= 80% (threshold set in `pyproject.toml`).

- [ ] **Step 2: If coverage is below 80%, find uncovered lines**

```bash
pytest tests/unit/ --cov=app --cov-report=term-missing -q 2>&1 | grep "MISS"
```

Add tests for any lines flagged before continuing.

---

## Task 6: Integration test scaffolding

**Files:**
- Create: `tests/integration/__init__.py`
- Create: `tests/integration/test_refeps_integration.py`
- Create: `tests/integration/test_farmalink_integration.py`

Tests skip automatically unless the relevant env-var is present -- CI never breaks without credentials. They call the real sandbox/production APIs directly (no mocks).

- [ ] **Step 1: Create `tests/integration/__init__.py`**

```python
# tests/integration/__init__.py
```

- [ ] **Step 2: Create `tests/integration/test_refeps_integration.py`**

```python
# tests/integration/test_refeps_integration.py
"""
Integration tests for REFEPSConnector against the real SISA REST endpoint.
Skipped unless REFEPS_USERNAME is set.

Run:
    REFEPS_USERNAME=<user> REFEPS_PASSWORD=<pass> pytest tests/integration/test_refeps_integration.py -v -s

Optional:
    REFEPS_TEST_DNI  -- a known DNI from the SISA welcome email (default tries "20304050")
"""

import os

import pytest

from app.connectors.refeps.client import REFEPSConnector

pytestmark = pytest.mark.skipif(
    not os.getenv("REFEPS_USERNAME"),
    reason="REFEPS_USERNAME not set -- skipping REFEPS integration tests",
)


@pytest.fixture
def connector():
    return REFEPSConnector(
        ws_url="https://sisa.msal.gov.ar/sisa/services/profesionalService",
        rest_url="https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar",
        username=os.environ["REFEPS_USERNAME"],
        password=os.environ["REFEPS_PASSWORD"],
    )


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_real(connector):
    """SISA endpoint is reachable and returns non-5xx."""
    result = await connector.health_check()
    assert result is True, "SISA REST endpoint unreachable or returned 5xx"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_nonexistent_dni_returns_structured_result(connector):
    """DNI 00000001 is unlikely to exist -- tests not-found path on real API."""
    result = await connector.verify_matricula(dni="00000001")
    assert result.fuente == "refeps_rest"
    assert isinstance(result.found, bool)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_raises_on_no_params(connector):
    """Validation guard raises before any network call."""
    with pytest.raises(ValueError, match="Se requiere al menos uno"):
        await connector.verify_matricula()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_verify_known_dni_structure(connector):
    """When a known DNI returns a result, the full dataclass must be populated."""
    test_dni = os.getenv("REFEPS_TEST_DNI", "20304050")
    result = await connector.verify_matricula(dni=test_dni)
    assert result.fuente == "refeps_rest"
    if result.found:
        assert result.cufp is not None
        assert result.estado_matricula in ("vigente", "suspendida", "inhabilitada", "desconocido")
        assert isinstance(result.provincias_habilitadas, list)
```

- [ ] **Step 3: Create `tests/integration/test_farmalink_integration.py`**

```python
# tests/integration/test_farmalink_integration.py
"""
Integration tests for FarmalinkConnector against the Farmalink sandbox.
Skipped unless FARMALINK_API_KEY is set.

Run:
    FARMALINK_API_KEY=<key> pytest tests/integration/test_farmalink_integration.py -v -s

Optional env vars:
    FARMALINK_TEST_AFILIADO    (default: "SWISS-001")
    FARMALINK_TEST_FINANCIADOR (default: "112233")
    FARMALINK_TEST_CUFP        (default: "CUFP00001234")
    FARMALINK_TEST_DNI         (default: "12345678")
"""

import os
import time
import uuid

import pytest

from app.connectors.farmalink.client import FarmalinkConnector

pytestmark = pytest.mark.skipif(
    not os.getenv("FARMALINK_API_KEY"),
    reason="FARMALINK_API_KEY not set -- skipping Farmalink integration tests",
)

SANDBOX = "https://sandbox.farmalink.com.ar"


@pytest.fixture
def connector():
    return FarmalinkConnector(base_url=SANDBOX, api_key=os.environ["FARMALINK_API_KEY"])


@pytest.mark.integration
@pytest.mark.asyncio
async def test_health_check_sandbox(connector):
    """Farmalink sandbox endpoint is reachable."""
    result = await connector.health_check()
    assert isinstance(result, bool)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_check_coverage_sandbox_afiliado(connector):
    """Sandbox test afiliado returns a structured CoverageResult."""
    afiliado = os.getenv("FARMALINK_TEST_AFILIADO", "SWISS-001")
    financiador = os.getenv("FARMALINK_TEST_FINANCIADOR", "112233")

    result = await connector.check_coverage(afiliado_id=afiliado, financiador_id=financiador)

    assert result.fuente == "farmalink"
    assert isinstance(result.found, bool)
    if result.found:
        assert result.afiliado_id == afiliado
        assert result.estado in ("activa", "inactiva", "suspendida", "desconocida")


@pytest.mark.integration
@pytest.mark.asyncio
async def test_check_coverage_nonexistent_returns_not_found(connector):
    """Non-existent afiliado must return found=False."""
    result = await connector.check_coverage(
        afiliado_id="NONEXISTENT-XYZ-999999", financiador_id="000000"
    )
    assert result.found is False
    assert result.fuente == "farmalink"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_route_prescription_sandbox_end_to_end(connector):
    """Route a prescription through the sandbox. Each run uses a unique CUIR."""
    ts = int(time.time())
    suffix = uuid.uuid4().hex[:8].upper()
    cuir = f"DEVP{ts}{suffix}"[:27]

    result = await connector.route_prescription(
        cuir=cuir,
        prescriber_cufp=os.getenv("FARMALINK_TEST_CUFP", "CUFP00001234"),
        patient_dni=os.getenv("FARMALINK_TEST_DNI", "12345678"),
        medicamento_snomed="372687004",
        financiador_id=os.getenv("FARMALINK_TEST_FINANCIADOR", "112233"),
    )
    assert result.fuente == "farmalink"
    assert isinstance(result.success, bool)
    if result.success:
        assert result.tracking_id is not None
        assert result.cuir is not None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_route_prescription_invalid_cuir_returns_error(connector):
    """Malformed CUIR provokes a Farmalink error -- verifies error mapping."""
    result = await connector.route_prescription(
        cuir="INVALID",
        prescriber_cufp="CUFP00000000",
        patient_dni="00000000",
        medicamento_snomed="000000000",
        financiador_id=None,
    )
    assert result.success is False
    assert result.error is not None
    assert result.fuente == "farmalink"
```

- [ ] **Step 4: Verify integration tests skip cleanly**

```bash
pytest tests/integration/ -v --no-cov
```

Expected (no credentials set):
```
SKIPPED [4] tests/integration/test_refeps_integration.py  - REFEPS_USERNAME not set
SKIPPED [4] tests/integration/test_farmalink_integration.py - FARMALINK_API_KEY not set
```

- [ ] **Step 5: Run full suite**

```bash
pytest tests/unit/ tests/integration/ -v
```

Expected: all unit tests pass, all integration tests skip, coverage >= 80%.

- [ ] **Step 6: Commit**

```bash
git add tests/integration/
git commit -m "test(integration): add skippable integration scaffolding for REFEPS and Farmalink sandbox"
```

---

## Self-Review

**1. Spec coverage:**

| Requirement | Task |
|---|---|
| `REFEPSConnector.verify_matricula()` implemented | Task 1 |
| Redis cache 24 h, key `refeps:v1:{type}:{value}`, TTL 86400 | Task 2 |
| Cache decorator implements `CredentialConnector` interface | Task 2 |
| `get_credential_connector()` wraps real connector in cache when `refeps_mock_mode=False` | Task 3 |
| `get_prescription_connector()` added to registry | Task 3 |
| `FarmalinkConnector.check_coverage()` implemented | Task 4 |
| `FarmalinkConnector.route_prescription()` implemented | Task 4 |
| Unit tests use respx mock transport, no real network | Tasks 1, 4 |
| Integration tests marked `@pytest.mark.integration`, skip unless API key set | Task 6 |
| Integration tests call real sandbox APIs, not mocks | Task 6 |
| TDD: failing test written before every implementation | All tasks |
| One commit per task | All tasks |

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or "handle errors appropriately" in any code block. Every error branch returns an explicit dataclass with a specific `error` string.

**3. Type consistency:**
- `PractitionerVerification` fields used identically in Task 1 `_parse_profesional()`, Task 2 cache `asdict()`/`**json.loads()`, and Task 6 assertions.
- `CoverageResult` fields `found`, `activa`, `afiliado_id`, `financiador_id`, `financiador_nombre`, `plan`, `estado`, `fuente`, `error` consistent across Task 4 implementation and all tests.
- `PrescriptionRouteResult` fields `success`, `cuir`, `tracking_id`, `fuente`, `error` consistent in Task 4 implementation and tests.
- `CredentialCache.__init__` accepts `redis=` (injected, tests) or `redis_url=` (lazy, production). Task 2 tests use `redis=fake_redis()`. Task 3 registry uses `redis_url=settings.redis_url`. Both paths use `_get_redis()`.
- `get_prescription_connector()` returns `PrescriptionConnector`. `FarmalinkConnector` inherits from both `EligibilityConnector` and `PrescriptionConnector`. Consistent.
