import uuid

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Practitioner(Base, UUIDMixin, TimestampMixin):
    """
    Profesional de la salud. Corresponde al recurso FHIR Practitioner.
    Identificado canónicamente por CUFP (Clave Única Federal del Profesional de Salud).
    """

    __tablename__ = "practitioners"
    __table_args__ = (
        Index("ix_practitioners_tenant_dni", "tenant_id", "dni"),
        Index("ix_practitioners_cufp", "cufp"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )

    # Vínculo con el usuario de la plataforma
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True
    )

    # Identificación
    cufp: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    dni: Mapped[str] = mapped_column(String(20), nullable=False)
    matricula_nacional: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Datos personales
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    apellido: Mapped[str] = mapped_column(String(150), nullable=False)

    # Profesión y especialidad (SNOMED CT)
    profesion_snomed: Mapped[str | None] = mapped_column(String(50), nullable=True)
    especialidad: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # Estado de matrícula (según REFEPS)
    estado_matricula: Mapped[str] = mapped_column(
        String(30), default="desconocido", nullable=False
    )  # vigente | suspendida | inhabilitada | desconocido
    provincias_habilitadas: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Metadatos de verificación
    refeps_verificado_en: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )  # ISO datetime de última verificación
    fuente_verificacion: Mapped[str] = mapped_column(
        String(20), default="mock", nullable=False
    )  # mock | refeps_ws | refeps_rest | manual

    tenant: Mapped["Tenant"] = relationship(back_populates="practitioners")
