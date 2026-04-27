"""
Admin endpoints — Ley 25.326 compliance.
Provides audit log export for financiador_admin and platform_admin roles.
"""
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.api.v1.deps import require_role
from app.core.database import AsyncSessionLocal
from app.core.security import TokenPayload
from app.models.audit_log import AuditLog

router = APIRouter(prefix="/admin", tags=["Admin"])


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str | None
    action: str
    resource: str | None
    ip_address: str | None
    created_at: datetime

    @classmethod
    def from_orm_row(cls, row: AuditLog) -> "AuditLogEntry":
        return cls(
            id=row.id,
            user_id=str(row.user_id) if row.user_id is not None else None,
            action=row.action,
            resource=row.resource,
            ip_address=row.ip_address,
            created_at=row.created_at,
        )


@router.get("/audit-log", response_model=list[AuditLogEntry])
async def export_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None, description="Filtrar por acción exacta"),
    tenant_id: str | None = Query(
        default=None,
        description="Solo platform_admin: filtrar por tenant_id UUID",
    ),
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
) -> list[AuditLogEntry]:
    """
    Exporta entradas del audit_log para el tenant del usuario autenticado.

    - **financiador_admin**: solo ve registros de su propio tenant.
    - **platform_admin**: puede ver registros de cualquier tenant pasando ?tenant_id=<uuid>.
      Sin ese parámetro verá los de su propio tenant.

    El audit_log NO tiene RLS (el middleware corre fuera del contexto de tenant),
    por eso la query aplica WHERE tenant_id explícito.
    """
    # Determine which tenant to query
    if current_user.role == "platform_admin" and tenant_id is not None:
        target_tenant_id = uuid.UUID(tenant_id)
    else:
        target_tenant_id = uuid.UUID(current_user.tenant_id)

    stmt = (
        select(AuditLog)
        .where(AuditLog.tenant_id == target_tenant_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    if action is not None:
        stmt = stmt.where(AuditLog.action == action)

    async with AsyncSessionLocal() as db:
        result = await db.execute(stmt)
        rows = result.scalars().all()

    return [AuditLogEntry.from_orm_row(row) for row in rows]
