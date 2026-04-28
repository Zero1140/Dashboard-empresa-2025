"""
Motor de Credencialización — Fase 1.
Verifica matrículas de profesionales de la salud contra REFEPS.

Modo actual: ⚠️ MOCK — cambiar REFEPS_MOCK_MODE=false cuando lleguen credenciales SISA.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.v1.deps import get_current_user
from app.connectors.base import PractitionerVerification
from app.connectors.registry import get_credential_connector
from app.core.security import TokenPayload
from app.fhir.practitioner import FHIRPractitioner

router = APIRouter(prefix="/credentials", tags=["Credencialización"])


class VerifyResponse(BaseModel):
    found: bool
    estado_matricula: str | None
    cufp: str | None
    nombre_completo: str | None
    especialidad: str | None
    provincias_habilitadas: list[str]
    fuente: str
    fhir_resource: dict | None = None


@router.get("/verify", response_model=VerifyResponse)
async def verify_matricula(
    dni: str | None = Query(default=None, description="DNI del profesional"),
    matricula: str | None = Query(default=None, description="Número de matrícula nacional"),
    cufp: str | None = Query(default=None, description="Clave Única Federal del Profesional"),
    include_fhir: bool = Query(default=False, description="Incluir recurso FHIR R4 completo"),
    _: TokenPayload = Depends(get_current_user),
):
    """
    Verifica la matrícula de un profesional de la salud contra REFEPS/SISA.

    Al menos uno de `dni`, `matricula` o `cufp` es requerido.

    **Estado actual:** Mock activo — las búsquedas retornan datos de prueba.
    Ver `PENDING_INTEGRATIONS.md` para migrar a REFEPS real.
    """
    if not any([dni, matricula, cufp]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Se requiere al menos uno: dni, matricula o cufp.",
        )

    connector = get_credential_connector()
    result: PractitionerVerification = await connector.verify_matricula(
        dni=dni, matricula=matricula, cufp=cufp
    )

    fhir = None
    if include_fhir and result.found:
        practitioner = FHIRPractitioner.from_refeps_response(
            {
                "cufp": result.cufp,
                "dni": result.dni,
                "matricula_nacional": result.matricula_nacional,
                "nombre": result.nombre,
                "apellido": result.apellido,
                "estado_matricula": result.estado_matricula,
            }
        )
        fhir = practitioner.model_dump()

    return VerifyResponse(
        found=result.found,
        estado_matricula=result.estado_matricula if result.found else None,
        cufp=result.cufp,
        nombre_completo=f"{result.nombre} {result.apellido}" if result.nombre else None,
        especialidad=result.especialidad,
        provincias_habilitadas=result.provincias_habilitadas,
        fuente=result.fuente,
        fhir_resource=fhir,
    )
