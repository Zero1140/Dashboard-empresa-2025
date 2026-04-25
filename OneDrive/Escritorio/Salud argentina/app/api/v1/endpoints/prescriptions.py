import logging
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.v1.deps import require_role
from app.connectors.registry import get_eligibility_connector
from app.core.database import AsyncSessionLocal, get_tenant_db
from app.core.security import TokenPayload
from app.models.consultation import Consultation
from app.models.prescription import Prescription
from app.models.prescription import Prescription as PrescriptionModel  # alias for select() calls
from app.services.cuir import generate_cuir

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Prescripciones"])


class CreatePrescriptionRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    medicamento_snomed_code: str
    medicamento_nombre: str
    cantidad: int = 1
    posologia: str


class PrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    cuir: str
    consulta_id: str
    medicamento_snomed_code: str | None
    medicamento_nombre: str | None
    cantidad: int | None
    posologia: str | None
    fecha_vencimiento: date | None
    estado: str
    cobertura_verificada: bool
    qr_url: str
    created_at: str


class PublicPrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cuir: str
    paciente_nombre_parcial: str
    medicamento_nombre: str | None
    medicamento_snomed_code: str | None
    posologia: str | None
    cantidad: int | None
    estado: str
    prescriber_cufp: str | None
    fecha_vencimiento: date | None
    cobertura_verificada: bool


def _to_prescription_response(rx: Prescription) -> PrescriptionResponse:
    return PrescriptionResponse(
        id=str(rx.id),
        cuir=rx.cuir,
        consulta_id=str(rx.consulta_id),
        medicamento_snomed_code=rx.medicamento_snomed_code,
        medicamento_nombre=rx.medicamento_nombre,
        cantidad=rx.cantidad,
        posologia=rx.posologia,
        fecha_vencimiento=rx.fecha_vencimiento,
        estado=rx.estado,
        cobertura_verificada=rx.cobertura_verificada,
        qr_url=f"/v1/prescriptions/{rx.cuir}",
        created_at=rx.created_at.isoformat(),
    )


async def _get_consultation_or_403(session, consultation_id: str, tenant_id: str, user_id: str) -> Consultation:
    result = await session.execute(
        select(Consultation).where(
            Consultation.id == uuid.UUID(consultation_id),
            Consultation.tenant_id == uuid.UUID(tenant_id),
        )
    )
    c = result.scalar_one_or_none()
    if c is None:
        raise HTTPException(status_code=404, detail="Consulta no encontrada.")
    if c.medico_id != uuid.UUID(user_id):
        raise HTTPException(status_code=403, detail="Sin permisos sobre esta consulta.")
    return c


@router.post("/consultations/{consultation_id}/prescriptions", response_model=PrescriptionResponse, status_code=201)
async def create_prescription(
    consultation_id: str,
    body: CreatePrescriptionRequest,
    current_user: TokenPayload = Depends(require_role("prestador")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        consultation = await _get_consultation_or_403(session, consultation_id, current_user.tenant_id, current_user.sub)

        if consultation.estado not in ("en_curso", "completada"):
            raise HTTPException(
                status_code=422,
                detail=f"No se pueden emitir recetas en una consulta con estado '{consultation.estado}'.",
            )

        # Verify coverage if not already done
        cobertura_verificada = consultation.cobertura_verificada
        if not cobertura_verificada and consultation.paciente_afiliado_id and consultation.financiador_id:
            try:
                connector = get_eligibility_connector()
                cov = await connector.check_coverage(
                    afiliado_id=consultation.paciente_afiliado_id,
                    financiador_id=consultation.financiador_id,
                )
                cobertura_verificada = cov.activa
            except Exception:
                logger.warning("Eligibility check failed during prescription creation", exc_info=True)

        # Generate CUIR — timestamp(ms) + UUID4 entropy makes collisions astronomically
        # unlikely (< 1 in 10^19). The unique DB constraint is the authoritative guard;
        # a DB-level IntegrityError on duplicate CUIR is the correct failure path.
        tenant_prefix = current_user.tenant_id.replace("-", "")[:4]
        cuir = generate_cuir(tenant_prefix)

        prescription = Prescription(
            tenant_id=uuid.UUID(current_user.tenant_id),
            cuir=cuir,
            consulta_id=consultation.id,
            prescriber_id=None,
            prescriber_cufp=consultation.medico_cufp,
            patient_dni=consultation.paciente_dni,
            afiliado_id=consultation.paciente_afiliado_id,
            financiador_id=consultation.financiador_id,
            diagnostico_snomed_code=consultation.diagnostico_snomed_code,
            diagnostico_descripcion=consultation.diagnostico_texto,
            medicamento_snomed_code=body.medicamento_snomed_code,
            medicamento_nombre=body.medicamento_nombre,
            medicamento_descripcion=body.medicamento_nombre,
            cantidad=body.cantidad,
            posologia=body.posologia,
            fecha_vencimiento=date.today() + timedelta(days=30),
            estado="activa",
            cobertura_verificada=cobertura_verificada,
        )
        # Ensure the generated CUIR is always present on the object
        # (guards against ORM not yet reflecting the kwarg before flush).
        prescription.cuir = cuir
        session.add(prescription)
        await session.flush()
        await session.refresh(prescription)
        return _to_prescription_response(prescription)


@router.get("/consultations/{consultation_id}/prescriptions", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    consultation_id: str,
    current_user: TokenPayload = Depends(require_role("prestador", "platform_admin")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        await _get_consultation_or_403(session, consultation_id, current_user.tenant_id, current_user.sub)
        result = await session.execute(
            select(PrescriptionModel).where(
                PrescriptionModel.consulta_id == uuid.UUID(consultation_id),
                PrescriptionModel.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        return [_to_prescription_response(rx) for rx in result.scalars().all()]


@router.delete("/prescriptions/{prescription_id}/cancel", response_model=PrescriptionResponse)
async def cancel_prescription(
    prescription_id: str,
    current_user: TokenPayload = Depends(require_role("prestador", "platform_admin")),
):
    async with get_tenant_db(current_user.tenant_id) as session:
        result = await session.execute(
            select(PrescriptionModel).where(
                PrescriptionModel.id == uuid.UUID(prescription_id),
                PrescriptionModel.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        rx = result.scalar_one_or_none()
        if rx is None:
            raise HTTPException(status_code=404, detail="Receta no encontrada.")
        if rx.estado in ("dispensada", "anulada"):
            raise HTTPException(status_code=422, detail=f"No se puede anular una receta con estado '{rx.estado}'.")
        rx.estado = "anulada"
        await session.flush()
        return _to_prescription_response(rx)


@router.get("/prescriptions/{cuir}", response_model=PublicPrescriptionResponse)
async def get_prescription_public(cuir: str):
    """Lookup público para farmacias — no requiere autenticación."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(PrescriptionModel).where(PrescriptionModel.cuir == cuir)
        )
        rx = result.scalar_one_or_none()
        if rx is None:
            raise HTTPException(status_code=404, detail="Receta no encontrada.")

        paciente_nombre_parcial = "***"
        if rx.consulta_id:
            consult_result = await session.execute(
                select(Consultation).where(Consultation.id == rx.consulta_id)
            )
            consultation = consult_result.scalar_one_or_none()
            if consultation:
                nombre = consultation.paciente_nombre
                paciente_nombre_parcial = nombre[:3] + "***" if len(nombre) > 3 else "***"

        return PublicPrescriptionResponse(
            cuir=rx.cuir,
            paciente_nombre_parcial=paciente_nombre_parcial,
            medicamento_nombre=rx.medicamento_nombre,
            medicamento_snomed_code=rx.medicamento_snomed_code,
            posologia=rx.posologia,
            cantidad=rx.cantidad,
            estado=rx.estado,
            prescriber_cufp=rx.prescriber_cufp,
            fecha_vencimiento=rx.fecha_vencimiento,
            cobertura_verificada=rx.cobertura_verificada,
        )
