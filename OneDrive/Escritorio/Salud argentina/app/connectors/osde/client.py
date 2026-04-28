"""
Conector OSDE FHIR R4.
OAuth2 client credentials flow + verificación de Coverage (FHIR R4).
Sandbox disponible en sandbox.farmalink.com.ar sin credenciales.
Para producción: OSDE_CLIENT_ID + OSDE_CLIENT_SECRET en .env.
"""
import logging
import time

import httpx

from app.connectors.base import CoverageResult, EligibilityConnector

logger = logging.getLogger(__name__)


class OSDEConnector(EligibilityConnector):
    """
    Conector al API FHIR R4 de OSDE via Farmalink Hub.
    OAuth2 client credentials → Bearer token cacheado → GET /Coverage.
    """

    def __init__(self, base_url: str, client_id: str, client_secret: str, token_url: str):
        self._base_url = base_url.rstrip("/")
        self._client_id = client_id
        self._client_secret = client_secret
        self._token_url = token_url
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        self._http = httpx.AsyncClient(timeout=15.0)

    async def _get_token(self) -> str:
        now = time.monotonic()
        if self._token and now < self._token_expires_at - 60:
            return self._token

        resp = await self._http.post(
            self._token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        data = resp.json()
        self._token = data["access_token"]
        self._token_expires_at = now + data.get("expires_in", 3600)
        return self._token

    async def check_coverage(
        self,
        afiliado_id: str,
        financiador_id: str,
        prestacion_code: str | None = None,
    ) -> CoverageResult:
        token = await self._get_token()
        params = {"subscriber": afiliado_id}
        if prestacion_code:
            params["service-type"] = prestacion_code

        resp = await self._http.get(
            f"{self._base_url}/Coverage",
            params=params,
            headers={"Authorization": f"Bearer {token}", "Accept": "application/fhir+json"},
        )
        resp.raise_for_status()
        bundle = resp.json()

        entries = bundle.get("entry", [])
        if not entries:
            return CoverageResult(
                found=False,
                afiliado_id=afiliado_id,
                financiador_id=financiador_id,
                activa=False,
                plan=None,
                fuente="osde_fhir",
            )

        coverage = entries[0]["resource"]
        activa = coverage.get("status") == "active"
        plan = None
        if "class" in coverage:
            plan_class = next(
                (
                    c
                    for c in coverage["class"]
                    if c.get("type", {}).get("coding", [{}])[0].get("code") == "plan"
                ),
                None,
            )
            if plan_class:
                plan = plan_class.get("name")

        return CoverageResult(
            found=True,
            afiliado_id=afiliado_id,
            financiador_id=financiador_id,
            activa=activa,
            plan=plan,
            fuente="osde_fhir",
        )

    async def health_check(self) -> bool:
        try:
            resp = await self._http.get(self._base_url, timeout=5.0)
            return resp.status_code < 500
        except Exception as e:
            logger.warning("OSDE health check falló: %s", e)
            return False

    async def close(self) -> None:
        await self._http.aclose()
