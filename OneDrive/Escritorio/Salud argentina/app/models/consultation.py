# app/models/consultation.py
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.encryption import EncryptedString, hmac_sha256
from app.models.base import TimestampMixin, UUIDMixin


class Consultation(Base, UUIDMixin, TimestampMixin):
    """
    Consulta médica — entidad central del módulo de recetas.
    Cada prescripción pertenece a una consulta.
    Tipos: teleconsulta (Jitsi) | externa (presencial o sin video).
    """

    __tablename__ = "consultations"
    __table_args__ = (
        Index("ix_consultations_tenant_medico", "tenant_id", "medico_id"),
        Index("ix_consultations_tenant_estado", "tenant_id", "estado"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    tipo: Mapped[str] = mapped_column(String(20), nullable=False)
    estado: Mapped[str] = mapped_column(String(20), nullable=False, default="programada")

    medico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    medico_cufp: Mapped[str] = mapped_column(String(50), nullable=False)

    paciente_dni: Mapped[str] = mapped_column(EncryptedString(255), nullable=False)
    paciente_dni_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    paciente_nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    paciente_afiliado_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    financiador_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cobertura_verificada: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    sesion_video_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    fecha_consulta: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    diagnostico_snomed_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    diagnostico_texto: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notas_clinicas: Mapped[str | None] = mapped_column(Text, nullable=True)
    paciente_consentimiento_informado: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    prescriptions: Mapped[list["Prescription"]] = relationship(
        "Prescription", back_populates="consultation", lazy="selectin"
    )
