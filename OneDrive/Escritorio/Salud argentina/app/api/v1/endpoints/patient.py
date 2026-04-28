from datetime import date

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.consultation import Consultation
from app.models.prescription import Prescription

router = APIRouter(tags=["Portal Paciente"])


class PatientPrescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    cuir: str
    medicamento_nombre: str | None
    posologia: str | None
    estado: str
    fecha_vencimiento: date | None


@router.get("/patient/prescriptions", response_model=list[PatientPrescriptionResponse])
async def get_patient_prescriptions(
    dni: str = Query(...),
    nombre: str = Query(..., min_length=2),
):
    """
    Devuelve las recetas de un paciente verificando DNI + nombre (Ley 25.326).
    Endpoint público — no requiere autenticación.
    Solo expone campos seguros (sin PII sensible).
    El segundo factor (nombre) nunca se revela ni se almacena en logs.
    Se devuelve lista vacía ante cualquier no-coincidencia para no revelar
    si el DNI existe en el sistema.
    """
    dni_clean = (dni or "").strip()
    nombre_clean = (nombre or "").strip()

    if not dni_clean:
        raise HTTPException(status_code=422, detail="El parámetro 'dni' es requerido.")

    if len(nombre_clean) < 2:
        raise HTTPException(
            status_code=422,
            detail="El nombre debe tener al menos 2 caracteres.",
        )

    # Use first 4 chars of nombre as prefix for LIKE matching (case-insensitive).
    # paciente_nombre in Consultation is stored as plain String — SQL LIKE is safe.
    nombre_prefix = nombre_clean[:4].lower()

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Prescription)
            .join(Consultation, Prescription.consulta_id == Consultation.id)
            .where(
                Prescription.patient_dni == dni_clean,
                func.lower(Consultation.paciente_nombre).like(f"{nombre_prefix}%"),
            )
            .order_by(Prescription.created_at.desc())
            .limit(50)
        )
        prescriptions = result.scalars().all()

    # Prescriptions without a linked consultation are excluded intentionally —
    # they cannot be verified against a nombre and should not be exposed publicly.
    return [
        PatientPrescriptionResponse(
            cuir=rx.cuir,
            medicamento_nombre=rx.medicamento_nombre,
            posologia=rx.posologia,
            estado=rx.estado,
            fecha_vencimiento=rx.fecha_vencimiento,
        )
        for rx in prescriptions
    ]
