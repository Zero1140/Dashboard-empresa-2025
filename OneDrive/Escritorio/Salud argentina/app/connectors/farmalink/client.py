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
            return resp.status_code < 400
        except Exception as exc:
            logger.warning("Farmalink health check fallo: %s", exc)
            return False

    async def close(self) -> None:
        await self._http.aclose()
