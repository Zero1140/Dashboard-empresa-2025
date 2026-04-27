# app/api/v1/endpoints/practitioners.py
import hashlib
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from pydantic import BaseModel, ConfigDict, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user, require_role
from app.connectors.registry import get_credential_connector
from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_tenant_db
from app.core.security import TokenPayload, hash_password
from app.models.audit_log import AuditLog
from app.models.consent_event import ConsentEvent
from app.models.practitioner import Practitioner
from app.models.practitioner_invitation import PractitionerInvitation, PractitionerProvince
from app.models.user import User
from app.services.email import send_practitioner_invitation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/practitioners", tags=["Prestadores"])

PROVINCIAS_AR = [
    "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut",
    "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
    "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
    "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
    "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]


# ── Schemas ──────────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: EmailStr


class RegisterRequest(BaseModel):
    nombre: str
    apellido: str
    dni: str
    especialidad: str
    password: str
    acepta_terminos: bool

    @field_validator("acepta_terminos")
    @classmethod
    def must_accept_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debe aceptar los términos de uso para registrarse")
        return v

    @field_validator("dni")
    @classmethod
    def validate_dni_format(cls, v: str) -> str:
        stripped = v.strip()
        if not re.match(r"^\d{7,8}$", stripped):
            raise ValueError("DNI debe tener 7 u 8 dígitos numéricos")
        return stripped

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v


class PatchProvinceRequest(BaseModel):
    estado: str


class ProvinceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    provincia: str
    estado: str


class PractitionerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nombre: str
    apellido: str
    dni: str
    cufp: str | None
    matricula_nacional: str | None
    especialidad: str | None
    estado_matricula: str
    provincias_habilitadas: list[str]
    fuente_verificacion: str
    aprobado: bool
    provinces: list[ProvinceOut] = []


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str
    estado: str
    expires_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_practitioner_with_provinces(
    practitioner_id: uuid.UUID,
    tenant_id: uuid.UUID,
    db: AsyncSession,
) -> tuple[Practitioner, list[PractitionerProvince]]:
    result = await db.execute(
        select(Practitioner).where(
            Practitioner.id == practitioner_id,
            Practitioner.tenant_id == tenant_id,
        )
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Prestador no encontrado")
    provinces_result = await db.execute(
        select(PractitionerProvince).where(
            PractitionerProvince.practitioner_id == p.id,
            PractitionerProvince.tenant_id == tenant_id,
        )
    )
    provinces = list(provinces_result.scalars().all())
    return p, provinces


def _to_practitioner_out(p: Practitioner, provinces: list[PractitionerProvince]) -> PractitionerOut:
    return PractitionerOut(
        id=str(p.id),
        nombre=p.nombre,
        apellido=p.apellido,
        dni=p.dni,
        cufp=p.cufp,
        matricula_nacional=p.matricula_nacional,
        especialidad=p.especialidad,
        estado_matricula=p.estado_matricula,
        provincias_habilitadas=p.provincias_habilitadas or [],
        fuente_verificacion=p.fuente_verificacion,
        aprobado=p.aprobado,
        provinces=[ProvinceOut(provincia=pr.provincia, estado=pr.estado) for pr in provinces],
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/invite", response_model=InvitationOut, status_code=201)
async def invite_practitioner(
    body: InviteRequest,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """Admin invita un prestador por email. Genera token de 7 días."""
    token = secrets.token_hex(32)
    expires = datetime.now(tz=timezone.utc) + timedelta(days=7)

    async with get_tenant_db(current_user.tenant_id) as db:
        invitation = PractitionerInvitation(
            tenant_id=uuid.UUID(current_user.tenant_id),
            email=body.email,
            token=token,
            expires_at=expires,
            invited_by_id=uuid.UUID(current_user.sub),
        )
        db.add(invitation)
        await db.flush()
        await db.refresh(invitation)
        invitation_id = str(invitation.id)
        invitation_email = invitation.email
        invitation_estado = invitation.estado
        invitation_expires_at = invitation.expires_at

    reg_url = f"{settings.frontend_base_url}/registro/{token}"
    await send_practitioner_invitation(
        to_email=body.email,
        tenant_name=current_user.tenant_id,
        registration_url=reg_url,
    )
    return InvitationOut(
        id=invitation_id,
        email=invitation_email,
        estado=invitation_estado,
        expires_at=invitation_expires_at,
    )


@router.get("/register/{token}")
async def get_invitation_info(token: str = Path(..., min_length=10)):
    """Retorna info de la invitación para mostrar en el formulario de registro público."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PractitionerInvitation).where(PractitionerInvitation.token == token)
        )
        inv = result.scalar_one_or_none()

    if not inv:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    if inv.estado == "expirada" or inv.expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=410, detail="Invitación expirada")
    if inv.estado != "pendiente":
        raise HTTPException(status_code=409, detail=f"Invitación ya {inv.estado}")

    return {
        "email": inv.email,
        "expires_at": inv.expires_at.isoformat(),
        "tenant_id": str(inv.tenant_id),
    }


@router.post("/register/{token}", status_code=201)
async def register_practitioner(
    body: RegisterRequest,
    token: str = Path(..., min_length=10),
    request: Request = None,  # for IP logging
):
    """Prestador completa su registro. Crea User + Practitioner y verifica REFEPS."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(PractitionerInvitation).where(PractitionerInvitation.token == token)
        )
        inv = result.scalar_one_or_none()

    if not inv:
        raise HTTPException(status_code=404, detail="Invitación no encontrada")
    if inv.estado != "pendiente" or inv.expires_at < datetime.now(tz=timezone.utc):
        raise HTTPException(status_code=410, detail="Invitación no válida o expirada")

    connector = get_credential_connector()
    verification = await connector.verify_matricula(dni=body.dni)

    async with get_tenant_db(str(inv.tenant_id)) as db:
        new_user = User(
            tenant_id=inv.tenant_id,
            email=inv.email,
            hashed_password=hash_password(body.password),
            role="prestador",
        )
        db.add(new_user)
        await db.flush()

        practitioner = Practitioner(
            tenant_id=inv.tenant_id,
            user_id=new_user.id,
            dni=body.dni,
            nombre=body.nombre,
            apellido=body.apellido,
            especialidad=body.especialidad,
            cufp=verification.cufp if verification.found else None,
            matricula_nacional=verification.matricula_nacional if verification.found else None,
            estado_matricula=verification.estado_matricula if verification.found else "desconocido",
            provincias_habilitadas=verification.provincias_habilitadas if verification.found else [],
            fuente_verificacion=verification.fuente,
            refeps_verificado_en=datetime.now(tz=timezone.utc).isoformat(),
            aprobado=False,
        )
        practitioner.consent_recorded_at = datetime.now(tz=timezone.utc)
        practitioner.consent_ip = request.client.host if request and request.client else None
        db.add(practitioner)
        await db.flush()

        # Insert consent event for audit history (Ley 25.326 / AAIP)
        consent_event = ConsentEvent(
            practitioner_id=practitioner.id,
            tenant_id=inv.tenant_id,
            action="accepted",
            tos_version="1.0",
            ip_address=request.client.host if request and request.client else None,
            user_agent=request.headers.get("user-agent") if request else None,
        )
        db.add(consent_event)

        inv.estado = "aceptada"
        inv.practitioner_id = practitioner.id
        db.add(inv)

    return {
        "message": "Registro completado. El administrador del tenant aprobará tu acceso.",
        "refeps_verificado": verification.found,
        "estado_matricula": verification.estado_matricula if verification.found else "no encontrado",
    }


@router.get("", response_model=list[PractitionerOut])
async def list_practitioners(
    current_user: TokenPayload = Depends(get_current_user),
    solo_aprobados: bool = True,
):
    """Lista los prestadores del tenant."""
    async with get_tenant_db(current_user.tenant_id) as db:
        q = select(Practitioner).where(
            Practitioner.tenant_id == uuid.UUID(current_user.tenant_id)
        )
        if solo_aprobados:
            q = q.where(Practitioner.aprobado.is_(True))
        result = await db.execute(q)
        practitioners = list(result.scalars().all())

        # Load all provinces for this tenant in one batch query
        provinces_result = await db.execute(
            select(PractitionerProvince).where(
                PractitionerProvince.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        all_provinces = list(provinces_result.scalars().all())
        provinces_by_practitioner: dict = {}
        for pp in all_provinces:
            provinces_by_practitioner.setdefault(pp.practitioner_id, []).append(pp)

        out = [
            _to_practitioner_out(p, provinces_by_practitioner.get(p.id, []))
            for p in practitioners
        ]
    return out


@router.get("/{practitioner_id}", response_model=PractitionerOut)
async def get_practitioner(
    practitioner_id: str,
    current_user: TokenPayload = Depends(get_current_user),
):
    async with get_tenant_db(current_user.tenant_id) as db:
        p, provinces = await _get_practitioner_with_provinces(
            uuid.UUID(practitioner_id),
            uuid.UUID(current_user.tenant_id),
            db,
        )
    return _to_practitioner_out(p, provinces)


@router.post("/{practitioner_id}/approve")
async def approve_practitioner(
    practitioner_id: str,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """Admin aprueba un prestador — lo agrega a la cartilla del tenant."""
    async with get_tenant_db(current_user.tenant_id) as db:
        result = await db.execute(
            select(Practitioner).where(
                Practitioner.id == uuid.UUID(practitioner_id),
                Practitioner.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Prestador no encontrado")
        p.aprobado = True
        db.add(p)
    return {"message": "Prestador aprobado y agregado a la cartilla"}


@router.patch("/{practitioner_id}/provinces/{provincia}")
async def patch_province(
    practitioner_id: str,
    provincia: str,
    body: PatchProvinceRequest,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """Admin actualiza el estado de habilitación de una provincia para un prestador."""
    if provincia not in PROVINCIAS_AR:
        raise HTTPException(status_code=422, detail=f"Provincia inválida: {provincia}")
    if body.estado not in ("pendiente", "tramitando", "habilitado"):
        raise HTTPException(status_code=422, detail="Estado inválido")

    async with get_tenant_db(current_user.tenant_id) as db:
        result = await db.execute(
            select(PractitionerProvince).where(
                PractitionerProvince.practitioner_id == uuid.UUID(practitioner_id),
                PractitionerProvince.tenant_id == uuid.UUID(current_user.tenant_id),
                PractitionerProvince.provincia == provincia,
            )
        )
        pp = result.scalar_one_or_none()
        if pp:
            pp.estado = body.estado
            pp.updated_by_id = uuid.UUID(current_user.sub)
        else:
            pp = PractitionerProvince(
                practitioner_id=uuid.UUID(practitioner_id),
                tenant_id=uuid.UUID(current_user.tenant_id),
                provincia=provincia,
                estado=body.estado,
                updated_by_id=uuid.UUID(current_user.sub),
            )
            db.add(pp)
    return {"provincia": provincia, "estado": body.estado}


@router.post("/{practitioner_id}/verify")
async def verify_practitioner(
    practitioner_id: str,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """Re-ejecuta verificación REFEPS para un prestador."""
    async with get_tenant_db(current_user.tenant_id) as db:
        result = await db.execute(
            select(Practitioner).where(
                Practitioner.id == uuid.UUID(practitioner_id),
                Practitioner.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Prestador no encontrado")

        connector = get_credential_connector()
        verification = await connector.verify_matricula(dni=p.dni)

        p.estado_matricula = verification.estado_matricula if verification.found else "desconocido"
        p.provincias_habilitadas = verification.provincias_habilitadas if verification.found else []
        if verification.found:
            p.cufp = verification.cufp
        p.fuente_verificacion = verification.fuente
        p.refeps_verificado_en = datetime.now(tz=timezone.utc).isoformat()
        db.add(p)

    return {
        "verificado": verification.found,
        "estado_matricula": p.estado_matricula,
        "fuente": p.fuente_verificacion,
    }


@router.delete("/{practitioner_id}", status_code=200)
async def erase_practitioner(
    practitioner_id: str,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """
    Anonimiza los datos personales de un prestador (derecho de supresión — Ley 25.326, Art. 16).
    No borra el registro para preservar el audit trail. Registra la supresión en audit_log.
    """
    async with get_tenant_db(current_user.tenant_id) as db:
        result = await db.execute(
            select(Practitioner).where(
                Practitioner.id == uuid.UUID(practitioner_id),
                Practitioner.tenant_id == uuid.UUID(current_user.tenant_id),
            )
        )
        p = result.scalar_one_or_none()
        if not p:
            raise HTTPException(status_code=404, detail="Prestador no encontrado")

        # Anonymize PII in-place — soft erasure, not hard delete
        p.nombre = "[ELIMINADO]"
        p.apellido = "[ELIMINADO]"
        p.dni = hashlib.sha256(p.dni.encode()).hexdigest()[:16]
        p.cufp = None
        p.matricula_nacional = None
        p.especialidad = None
        p.consent_ip = None
        # consent_recorded_at is kept (timestamp, not PII)
        db.add(p)

    # Write erasure event to audit_log using AsyncSessionLocal directly
    # (audit_log has no RLS so we bypass get_tenant_db)
    async with AsyncSessionLocal() as audit_db:
        audit_db.add(AuditLog(
            tenant_id=uuid.UUID(current_user.tenant_id),
            user_id=uuid.UUID(current_user.sub),
            action="erasure_request",
            resource=f"practitioners:{practitioner_id}",
            ip_address=None,
        ))
        await audit_db.commit()

    return {
        "message": "Datos personales del prestador eliminados conforme Ley 25.326",
        "id": practitioner_id,
    }


@router.get("/{practitioner_id}/consent-history")
async def get_consent_history(
    practitioner_id: str,
    current_user: TokenPayload = Depends(require_role("financiador_admin", "platform_admin")),
):
    """
    Exporta el historial de consentimientos de un prestador (requisito AAIP).
    Solo accesible para admins.
    """
    async with get_tenant_db(current_user.tenant_id) as db:
        result = await db.execute(
            select(ConsentEvent)
            .where(
                ConsentEvent.practitioner_id == uuid.UUID(practitioner_id),
                ConsentEvent.tenant_id == uuid.UUID(current_user.tenant_id),
            )
            .order_by(ConsentEvent.recorded_at.desc())
        )
        events = list(result.scalars().all())

    return [
        {
            "id": str(e.id),
            "action": e.action,
            "tos_version": e.tos_version,
            "ip_address": e.ip_address,
            "user_agent": e.user_agent,
            "recorded_at": e.recorded_at.isoformat() if e.recorded_at else None,
        }
        for e in events
    ]
