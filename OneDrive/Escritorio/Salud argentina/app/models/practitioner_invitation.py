import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class PractitionerInvitation(Base, UUIDMixin, TimestampMixin):
    """
    Invitación enviada por un admin del tenant para incorporar un prestador.
    token: 64-char hex, único, expira en 7 días.
    """

    __tablename__ = "practitioner_invitations"

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    estado: Mapped[str] = mapped_column(
        String(20), default="pendiente", nullable=False
    )  # pendiente | aceptada | aprobada | expirada | rechazada
    practitioner_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("practitioners.id"), nullable=True
    )
    invited_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class PractitionerProvince(Base, UUIDMixin, TimestampMixin):
    """
    Estado de habilitación de un prestador en una provincia específica, dentro de un tenant.
    """

    __tablename__ = "practitioner_provinces"
    __table_args__ = (
        UniqueConstraint("practitioner_id", "tenant_id", "provincia"),
    )

    practitioner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("practitioners.id"), nullable=False
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False
    )
    provincia: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), default="pendiente", nullable=False
    )  # pendiente | tramitando | habilitado
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
