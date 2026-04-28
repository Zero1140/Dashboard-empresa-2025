from datetime import date

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
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
async def get_patient_prescriptions(dni: str):
    """
    Devuelve las recetas de un paciente por DNI.
    Endpoint público — no requiere autenticación.
    Solo expone campos seguros (sin PII sensible).
    """
    if not dni or not dni.strip():
        raise HTTPException(status_code=422, detail="El parámetro 'dni' es requerido.")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Prescription)
            .where(Prescription.patient_dni == dni.strip())
            .order_by(Prescription.created_at.desc())
            .limit(50)
        )
        prescriptions = result.scalars().all()

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
