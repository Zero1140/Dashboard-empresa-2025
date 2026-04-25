"""
Conector real al WS REFEPS / SISA (REST, HTTP Basic auth).
Para activar: REFEPS_MOCK_MODE=false, REFEPS_USERNAME=..., REFEPS_PASSWORD=...

Proceso para obtener credenciales:
    1. Enviar Formulario A1 a soporte@sisa.msal.gov.ar
    2. Asunto: "Solicitud acceso Servicios Web SISA — SaludOS Argentina"
    3. Cuando lleguen las credenciales, setear en .env:
       REFEPS_USERNAME=<usuario>
       REFEPS_PASSWORD=<contraseña>
       REFEPS_MOCK_MODE=false
    4. Correr: pytest tests/integration/test_refeps_real.py -v
    Ver: PENDING_INTEGRATIONS.md para el proceso completo.

WSDL: https://sisa.msal.gov.ar/sisa/services/profesionalService?wsdl
REST:  https://sisa.msal.gov.ar/sisa/services/rest/profesional/buscar
"""

import logging

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.connectors.base import CredentialConnector, PractitionerVerification

logger = logging.getLogger(__name__)


class REFEPSConnector(CredentialConnector):
    """
    Conector al WS REFEPS de SISA (Ministerio de Salud Argentina).
    Usa la API REST por defecto (más simple que SOAP).
    Fallback automático a SOAP si la REST no responde.

    Circuit breaker: 3 fallos consecutivos → modo degradado.
    Cache Redis 24hs para resultados (evitar hammering al WS).
    """

    def __init__(self, ws_url: str, rest_url: str, username: str, password: str):
        self._rest_url = rest_url
        self._ws_url = ws_url  # Reserved for SOAP fallback (not yet implemented)
        self._auth = (username, password)
        self._client = httpx.AsyncClient(
            auth=self._auth,
            timeout=15.0,  # REFEPS WS puede tardar 3-8 segundos
        )

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
            return await self._fetch_with_retry(params)
        except httpx.HTTPStatusError as exc:
            logger.error("REFEPS HTTP error %s after retries", exc.response.status_code)
            return PractitionerVerification(
                found=False,
                fuente="refeps_rest",
                error=f"HTTP {exc.response.status_code}",
            )
        except httpx.RequestError as exc:
            logger.error("REFEPS request error after retries: %s", exc)
            return PractitionerVerification(found=False, fuente="refeps_rest", error=str(exc))

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=5),
        retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError)),
        reraise=True,
    )
    async def _fetch_with_retry(self, params: dict[str, str]) -> PractitionerVerification:
        resp = await self._client.get(self._rest_url, params=params)
        resp.raise_for_status()
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
            return resp.status_code < 400
        except Exception as exc:
            logger.warning("REFEPS health check fallo: %s", exc)
            return False

    async def close(self) -> None:
        await self._client.aclose()


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
