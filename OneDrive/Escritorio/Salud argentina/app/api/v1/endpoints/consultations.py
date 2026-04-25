import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.v1.deps import require_role
from app.connectors.registry import get_eligibility_connector
from app.core.database import get_tenant_db
from app.core.security import TokenPayload
from app.models.consultation import Consultation
from app.models.practitioner import Practitioner
from app.services.video import create_jitsi_room

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/consultations", tags=["Consultas"])


class CreateConsultationRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tipo: str
    paciente_dni: str
    paciente_nombre: str
    paciente_afiliado_id: str | None = None
    financiador_id: str | None = None


class UpdateConsultationRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    diagnostico_snomed_code: str | None = None
    diagnostico_texto: str | None = None
    notas_clinicas: str | None = None


class PatchStatusRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    estado: str


class PrescriptionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    cuir: str
    medicamento_nombre: str | None
    estado: str


class ConsultationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tipo: str
    estado: str
    medico_id: str
    medico_cufp: str
    paciente_dni: str
    paciente_nombre: str
    paciente_afiliado_id: str | None
    financiador_id: str | None
    cobertura_verificada: bool
    sesion_video_id: str | None
    sesion_video_url: str | None
    fecha_consulta: datetime
    diagnostico_snomed_code: str | None
    diagnostico_texto: str | None
    notas_clinicas: str | None
    created_at: datetime
    prescriptions: list[PrescriptionSummary] = []


VALID_TRANSITIONS = {
    "programada": {"en_curso", "cancelada"},
    "en_curso": {"completada", "cancelada"},
    "completada": set(),
    "cancelada": set(),
}


def _video_url(sesion_video_id: str | None) -> str | None:
    return f"https://meet.jit.si/{sesion_video_id}" if sesion_video_id else None


def _to_response(c: Consultation) -> ConsultationResponse:
    return ConsultationResponse(
        id=str(c.id),
        tipo=c.tipo,
        estado=c.estado,
        medico_id=str(c.medico_id),
        medico_cufp=c.medico_cufp,
        paciente_dni=c.paciente_dni,
        paciente_nombre=c.paciente_nombre,
        paciente_afiliado_id=c.paciente_afiliado_id,
        financiador_id=c.financiador_id,
        cobertura_verificada=c.cobertura_verificada,
        sesion_video_id=c.sesion_video_id,
        sesion_video_url=_video_url(c.sesion_video_id),
        fecha_consulta=c.fecha_consulta,
        diagnostico_snomed_code=c.diagnostico_snomed_code,
        diagnostico_texto=c.diagnostico_texto,
        notas_clinicas=c.notas_clinicas,
        created_at=c.created_at,
        prescriptions=[
            PrescriptionSummary(
                id=str(rx.id),
                cuir=rx.cuir,
                medicamento_nombre=rx.medicamento_nombre,
                estado=rx.estado,
            )
            for rx in (c.prescriptions or [])
        ],
    )


async def _get_verified_practitioner(session, tenant_id: str, user_id: str):
    result = await session.execute(
        select(Practitioner).where(
            Practitioner.tenant_id == uuid.UUID(tenant_id),
            Practitioner.user_id == uuid.UUID(user_id),
        )
    )
    practitioner = result.scalar_one_or_none()
    if practitioner is None:
        raise HTTPException(status_code=403, detail="Sin perfil de prestador asociado.")
    if practitioner.estado_matricula != "vigente":
        raise HTTPException(status_code=403, detail="Matrícula no vigente — no puede crear consultas.")
    return practitioner


@router.post("", response_model=ConsultationResponse, status_code=status.HTTP_201_CREATED)
async def create_consultation(
    body: CreateConsultationRequest,
    current_user: TokenPayload = Depends(require_role("prestador")),
):
    if body.tipo not in ("teleconsulta", "externa"):
        raise HTTPException(status_code=422, detail="tipo debe ser 'teleconsulta' o 'externa'.")

    async with get_tenant_db(current_user.tenant_id) as session:
        practitioner = await _get_verified_practitioner(session, current_user.tenant_id, current_user.sub)

        video_id = None
        if body.tipo == "teleconsulta":
            video_id = create_jitsi_room()["sesion_video_id"]

        cobertura_verificada = False
        if body.paciente_afiliado_id and body.financiador_id:
            try:
                connector = get_eligibility_connector()
                cov = await connector.check_coverage(
                    afiliado_id=body.paciente_afiliado_id,
                    financiador_id=body.financiador_id,
                )
                cobertura_verificada = cov.activa
            except Exception:
                logger.warning("Eligibility check failed for afiliado_id=%s", body.paciente_afiliado_id, exc_info=True)

        consultation = Consultation(
            tenant_id=uuid.UUID(current_user.tenant_id),
            tipo=body.tipo,
            estado="programada",
            medico_id=uuid.UUID(current_user.sub),
            medico_cufp=practitioner.cufp or "",
            paciente_dni=body.paciente_dni,
            paciente_nombre=body.paciente_nombre,
            paciente_afiliado_id=body.paciente_afiliado_id,
            financiador_id=body.financiador_id,
            cobertura_verificada=cobertura_verificada,
            sesion_video_id=video_id,
        )
        session.add(consultation)
        await session.flush()
        await session.refresh(consultation, attribute_names=["prescriptions"])
        return _to_response(consultation)


@router.get("", response_model=list[ConsultationResponse])
async def list_consultations(
    tipo: str | None = Query(default=None),
    estado: str | None = Query(default=None),
    fecha_desde: str | None = Query(default=None),
    current_user: TokenPayload = Depends(require_role("prestador")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        stmt = (
            select(Consultation)
            .where(
                Consultation.tenant_id == uuid.UUID(current_user.tenant_id),
                Consultation.medico_id == uuid.UUID(current_user.sub),
            )
            .order_by(Consultation.fecha_consulta.desc())
        )
        if tipo:
            stmt = stmt.where(Consultation.tipo == tipo)
        if estado:
            stmt = stmt.where(Consultation.estado == estado)
        if fecha_desde:
            try:
                dt = datetime.fromisoformat(fecha_desde).replace(tzinfo=timezone.utc)
                stmt = stmt.where(Consultation.fecha_consulta >= dt)
            except ValueError:
                raise HTTPException(status_code=422, detail="fecha_desde inválida — usar formato ISO 8601.")
        result = await session.execute(stmt)
        return [_to_response(c) for c in result.scalars().all()]


@router.get("/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: str,
    current_user: TokenPayload = Depends(require_role("prestador", "platform_admin")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        result = await session.execute(
            select(Consultation).where(
                Consultation.id == uuid.UUID(consultation_id),
                Consultation.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        c = result.scalar_one_or_none()
        if c is None:
            raise HTTPException(status_code=404, detail="Consulta no encontrada.")
        if c.medico_id != uuid.UUID(current_user.sub):
            raise HTTPException(status_code=403, detail="Sin permisos sobre esta consulta.")
        return _to_response(c)


@router.patch("/{consultation_id}/status", response_model=ConsultationResponse)
async def patch_consultation_status(
    consultation_id: str,
    body: PatchStatusRequest,
    current_user: TokenPayload = Depends(require_role("prestador", "platform_admin")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        result = await session.execute(
            select(Consultation).where(
                Consultation.id == uuid.UUID(consultation_id),
                Consultation.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        c = result.scalar_one_or_none()
        if c is None:
            raise HTTPException(status_code=404, detail="Consulta no encontrada.")
        if c.medico_id != uuid.UUID(current_user.sub):
            raise HTTPException(status_code=403, detail="Sin permisos sobre esta consulta.")

        allowed = VALID_TRANSITIONS.get(c.estado, set())
        if body.estado not in allowed:
            raise HTTPException(
                status_code=422,
                detail=f"Transición inválida: {c.estado} → {body.estado}. Permitidas: {sorted(allowed)}",
            )
        c.estado = body.estado
        await session.flush()
        return _to_response(c)


@router.patch("/{consultation_id}", response_model=ConsultationResponse)
async def update_consultation(
    consultation_id: str,
    body: UpdateConsultationRequest,
    current_user: TokenPayload = Depends(require_role("prestador", "platform_admin")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        result = await session.execute(
            select(Consultation).where(
                Consultation.id == uuid.UUID(consultation_id),
                Consultation.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        c = result.scalar_one_or_none()
        if c is None:
            raise HTTPException(status_code=404, detail="Consulta no encontrada.")
        if c.medico_id != uuid.UUID(current_user.sub):
            raise HTTPException(status_code=403, detail="Sin permisos sobre esta consulta.")
        if c.estado in ("cancelada", "completada"):
            raise HTTPException(status_code=422, detail="No se puede modificar una consulta finalizada.")

        if body.diagnostico_snomed_code is not None:
            c.diagnostico_snomed_code = body.diagnostico_snomed_code
        if body.diagnostico_texto is not None:
            c.diagnostico_texto = body.diagnostico_texto
        if body.notas_clinicas is not None:
            c.notas_clinicas = body.notas_clinicas

        await session.flush()
        return _to_response(c)
