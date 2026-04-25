import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Prescription(Base, UUIDMixin, TimestampMixin):
    """
    Receta electrónica. Corresponde al recurso FHIR MedicationRequest.
    Requiere CUIR válida (Clave Única de Identificación de Receta) antes de persistir.
    Ley 27.553 + Decreto 98/2023 + Res. 5744/2024.
    """

    __tablename__ = "prescriptions"
    __table_args__ = (
        Index("ix_prescriptions_tenant_cuir", "tenant_id", "cuir"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )

    # CUIR — obligatorio por ley antes de emitir la receta
    cuir: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    # Médico prescriptor
    prescriber_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("practitioners.id"), nullable=True
    )
    prescriber_cufp: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Paciente (referencia FHIR)
    patient_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    patient_dni: Mapped[str | None] = mapped_column(String(20), nullable=True)
    afiliado_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Diagnóstico y medicamento (SNOMED CT — obligatorio por Res. 5744/2024)
    diagnostico_snomed_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    diagnostico_descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    medicamento_snomed_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    medicamento_descripcion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    indicaciones: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Estado y trazabilidad
    estado: Mapped[str] = mapped_column(
        String(30), default="activa", nullable=False
    )  # activa | dispensada | anulada | vencida
    financiador_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cobertura_verificada: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Consulta a la que pertenece (módulo recetas v2)
    consulta_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consultations.id"), nullable=True
    )

    # Detalle de la prescripción
    medicamento_nombre: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cantidad: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1)
    posologia: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date, nullable=True)

    consultation: Mapped["Consultation | None"] = relationship(
        "Consultation", back_populates="prescriptions"
    )
