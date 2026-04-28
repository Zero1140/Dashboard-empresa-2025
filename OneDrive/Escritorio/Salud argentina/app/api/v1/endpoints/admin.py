"""
Admin endpoints — Ley 25.326 compliance.
Provides audit log export for financiador_admin and platform_admin roles,
plus business stats and tenant management for platform_admin.
"""
import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select

from app.api.v1.deps import require_role
from app.core.database import AsyncSessionLocal
from app.core.security import TokenPayload, hash_password
from app.models.audit_log import AuditLog
from app.models.consultation import Consultation
from app.models.practitioner import Practitioner
from app.models.prescription import Prescription
from app.models.tenant import Tenant
from app.models.user import User

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
            ip_address=str(row.ip_address) if row.ip_address is not None else None,
            created_at=row.created_at,
        )


class TenantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    nombre: str
    tipo: str
    activo: bool
    created_at: datetime

    @classmethod
    def from_orm_row(cls, row: Tenant) -> "TenantOut":
        return cls(
            id=str(row.id),
            nombre=row.name,
            tipo=row.tipo,
            activo=row.activo,
            created_at=row.created_at,
        )


class TenantCreate(BaseModel):
    nombre: str
    tipo: str = "prepaga"
    admin_email: str
    admin_password: str


class BusinessStats(BaseModel):
    tenants_total: int
    practitioners_total: int
    practitioners_aprobados: int
    practitioners_pendientes: int
    consultations_total: int
    prescriptions_activas: int
    verificaciones_hoy: int
    cobertura_mercado_pct: int


@router.get("/stats", response_model=BusinessStats)
async def get_business_stats(
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
) -> BusinessStats:
    """KPIs de negocio para el dashboard."""
    async with AsyncSessionLocal() as db:
        if current_user.role == "platform_admin":
            tenants_total = (
                await db.execute(select(func.count()).select_from(Tenant))
            ).scalar_one()
        else:
            tenants_total = 1

        target_tid = uuid.UUID(current_user.tenant_id)

        practitioners_total = (
            await db.execute(
                select(func.count())
                .select_from(Practitioner)
                .where(Practitioner.tenant_id == target_tid)
            )
        ).scalar_one()

        practitioners_aprobados = (
            await db.execute(
                select(func.count())
                .select_from(Practitioner)
                .where(Practitioner.tenant_id == target_tid)
                .where(Practitioner.aprobado.is_(True))
            )
        ).scalar_one()

        practitioners_pendientes = (
            await db.execute(
                select(func.count())
                .select_from(Practitioner)
                .where(Practitioner.tenant_id == target_tid)
                .where(Practitioner.aprobado.is_(False))
            )
        ).scalar_one()

        consultations_total = (
            await db.execute(
                select(func.count())
                .select_from(Consultation)
                .where(Consultation.tenant_id == target_tid)
            )
        ).scalar_one()

        prescriptions_activas = (
            await db.execute(
                select(func.count())
                .select_from(Prescription)
                .where(Prescription.tenant_id == target_tid)
                .where(Prescription.estado == "activa")
            )
        ).scalar_one()

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        verificaciones_hoy = (
            await db.execute(
                select(func.count())
                .select_from(AuditLog)
                .where(AuditLog.tenant_id == target_tid)
                .where(AuditLog.action == "verify_credential")
                .where(AuditLog.created_at >= today_start)
            )
        ).scalar_one()

    return BusinessStats(
        tenants_total=tenants_total,
        practitioners_total=practitioners_total,
        practitioners_aprobados=practitioners_aprobados,
        practitioners_pendientes=practitioners_pendientes,
        consultations_total=consultations_total,
        prescriptions_activas=prescriptions_activas,
        verificaciones_hoy=verificaciones_hoy,
        cobertura_mercado_pct=70,
    )


@router.get("/tenants", response_model=list[TenantOut])
async def list_tenants(
    current_user: TokenPayload = Depends(require_role("platform_admin")),
) -> list[TenantOut]:
    """Lista todos los tenants. Solo platform_admin."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Tenant).order_by(Tenant.created_at.desc()))
        rows = result.scalars().all()
    return [TenantOut.from_orm_row(r) for r in rows]


@router.post("/tenants", response_model=TenantOut, status_code=201)
async def create_tenant(
    body: TenantCreate,
    current_user: TokenPayload = Depends(require_role("platform_admin")),
) -> TenantOut:
    """Crea un nuevo tenant (obra social/prepaga) con su admin. Solo platform_admin."""
    slug = re.sub(r"[^a-z0-9]+", "-", body.nombre.lower()).strip("-")[:100]

    async with AsyncSessionLocal() as db:
        existing_user = (
            await db.execute(select(User).where(User.email == body.admin_email))
        ).scalar_one_or_none()
        if existing_user:
            raise HTTPException(status_code=409, detail="El email ya existe en el sistema")

        existing_slug = (
            await db.execute(select(Tenant).where(Tenant.slug == slug))
        ).scalar_one_or_none()
        if existing_slug:
            slug = f"{slug}-{uuid.uuid4().hex[:6]}"

        new_tenant = Tenant(name=body.nombre, slug=slug, tipo=body.tipo)
        db.add(new_tenant)
        await db.flush()

        new_user = User(
            tenant_id=new_tenant.id,
            email=body.admin_email,
            hashed_password=hash_password(body.admin_password),
            role="financiador_admin",
        )
        db.add(new_user)
        await db.commit()
        await db.refresh(new_tenant)

    return TenantOut.from_orm_row(new_tenant)


@router.get("/audit-log", response_model=list[AuditLogEntry])
async def export_audit_log(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    action: str | None = Query(default=None, description="Filtrar por acción exacta"),
    from_date: str | None = Query(default=None, description="Fecha inicio ISO 8601 (ej: 2026-01-01)"),
    to_date: str | None = Query(default=None, description="Fecha fin ISO 8601 (ej: 2026-12-31)"),
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
    """
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

    if from_date is not None:
        try:
            dt_from = datetime.fromisoformat(from_date).replace(tzinfo=timezone.utc)
            stmt = stmt.where(AuditLog.created_at >= dt_from)
        except ValueError:
            raise HTTPException(status_code=422, detail="from_date inválida — usar formato YYYY-MM-DD")

    if to_date is not None:
        try:
            dt_to = datetime.fromisoformat(to_date).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
            stmt = stmt.where(AuditLog.created_at <= dt_to)
        except ValueError:
            raise HTTPException(status_code=422, detail="to_date inválida — usar formato YYYY-MM-DD")

    async with AsyncSessionLocal() as db:
        result = await db.execute(stmt)
        rows = result.scalars().all()

    return [AuditLogEntry.from_orm_row(row) for row in rows]
