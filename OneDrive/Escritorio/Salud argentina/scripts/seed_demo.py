"""
scripts/seed_demo.py — Idempotent demo seed for SaludOS Argentina investor demos.

Populates the 'dev-prepaga' tenant with:
  - 10 practitioners (Argentine names, varied specialties + provinces)
  - 7 consultations (varied states)
  - 5 prescriptions (attached to completed consultations)

Run inside the Docker container:
    python -m scripts.seed_demo
or:
    python scripts/seed_demo.py

Idempotency: practitioners are skipped if DNI already exists for the tenant;
consultations/prescriptions are skipped if count >= threshold.
"""

import asyncio
import logging
import sys
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select

# ── App imports ──────────────────────────────────────────────────────────────
from app.core.database import AsyncSessionLocal
from app.models.consultation import Consultation
from app.models.practitioner import Practitioner
from app.models.prescription import Prescription
from app.models.tenant import Tenant
from app.models.user import User
from app.services.cuir import generate_cuir
from app.services.video import create_jitsi_room

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("seed_demo")

# ── Practitioner data ─────────────────────────────────────────────────────────
PRACTITIONERS_DATA = [
    {
        "nombre": "María",
        "apellido": "García",
        "dni": "12345678",
        "cufp": "CUFP-00001234",
        "matricula": "MN-98765",
        "especialidad": "Medicina General",
        "provincias": ["CABA", "Buenos Aires", "Córdoba"],
    },
    {
        "nombre": "Carlos",
        "apellido": "López",
        "dni": "98765432",
        "cufp": "CUFP-00005678",
        "matricula": "MN-11223",
        "especialidad": "Cardiología",
        "provincias": ["CABA", "Santa Fe"],
    },
    {
        "nombre": "Sofía",
        "apellido": "Fernández",
        "dni": "23456789",
        "cufp": "CUFP-00002345",
        "matricula": "MN-33445",
        "especialidad": "Pediatría",
        "provincias": ["CABA", "Buenos Aires", "Mendoza", "Córdoba"],
    },
    {
        "nombre": "Diego",
        "apellido": "Martínez",
        "dni": "34567890",
        "cufp": "CUFP-00003456",
        "matricula": "MN-55667",
        "especialidad": "Psiquiatría",
        "provincias": ["CABA"],
    },
    {
        "nombre": "Valentina",
        "apellido": "Torres",
        "dni": "45678901",
        "cufp": "CUFP-00004567",
        "matricula": "MN-77889",
        "especialidad": "Ginecología",
        "provincias": ["Buenos Aires", "CABA", "Santa Fe", "Entre Ríos"],
    },
    {
        "nombre": "Pablo",
        "apellido": "Rodríguez",
        "dni": "56789012",
        "cufp": "CUFP-00006789",
        "matricula": "MN-99001",
        "especialidad": "Traumatología",
        "provincias": ["Córdoba", "Mendoza"],
    },
    {
        "nombre": "Luciana",
        "apellido": "Pérez",
        "dni": "67890123",
        "cufp": "CUFP-00007890",
        "matricula": "MN-22334",
        "especialidad": "Dermatología",
        "provincias": ["CABA", "Buenos Aires"],
    },
    {
        "nombre": "Federico",
        "apellido": "González",
        "dni": "78901234",
        "cufp": "CUFP-00008901",
        "matricula": "MN-44556",
        "especialidad": "Neurología",
        "provincias": ["Santa Fe", "Córdoba", "Tucumán"],
    },
    {
        "nombre": "Ana",
        "apellido": "Sánchez",
        "dni": "89012345",
        "cufp": "CUFP-00009012",
        "matricula": "MN-66778",
        "especialidad": "Endocrinología",
        "provincias": ["CABA", "Buenos Aires", "Mendoza"],
    },
    {
        "nombre": "Rodrigo",
        "apellido": "Díaz",
        "dni": "90123456",
        "cufp": "CUFP-00000123",
        "matricula": "MN-88990",
        "especialidad": "Gastroenterología",
        "provincias": ["Buenos Aires"],
    },
]

# ── Consultation data ─────────────────────────────────────────────────────────
CONSULTATIONS_DATA = [
    {
        "tipo": "teleconsulta",
        "paciente_dni": "11223344",
        "paciente_nombre": "Juan Alvarez",
        "afiliado_id": "SWISS-001",
        "financiador_id": "swiss-medical",
        "estado": "completada",
        "diagnostico": "Hipertensión arterial esencial",
        "snomed": "38341003",
    },
    {
        "tipo": "teleconsulta",
        "paciente_dni": "22334455",
        "paciente_nombre": "Elena Ruiz",
        "afiliado_id": "MEDIFE-001",
        "financiador_id": "medife",
        "estado": "completada",
        "diagnostico": "Diabetes mellitus tipo 2",
        "snomed": "44054006",
    },
    {
        "tipo": "externa",
        "paciente_dni": "33445566",
        "paciente_nombre": "Roberto Jiménez",
        "afiliado_id": "OMINT-001",
        "financiador_id": "omint",
        "estado": "completada",
        "diagnostico": "Lumbalgia inespecífica",
        "snomed": "279039007",
    },
    {
        "tipo": "teleconsulta",
        "paciente_dni": "44556677",
        "paciente_nombre": "Sandra Morales",
        "afiliado_id": "IOMA-001",
        "financiador_id": "ioma",
        "estado": "en_curso",
        "diagnostico": None,
        "snomed": None,
    },
    {
        "tipo": "teleconsulta",
        "paciente_dni": "55667788",
        "paciente_nombre": "Miguel Castro",
        "afiliado_id": "SWISS-001",
        "financiador_id": "swiss-medical",
        "estado": "programada",
        "diagnostico": None,
        "snomed": None,
    },
    {
        "tipo": "externa",
        "paciente_dni": "66778899",
        "paciente_nombre": "Patricia Vega",
        "afiliado_id": "MEDIFE-001",
        "financiador_id": "medife",
        "estado": "completada",
        "diagnostico": "Hipotiroidismo primario",
        "snomed": "40930008",
    },
    {
        "tipo": "teleconsulta",
        "paciente_dni": "77889900",
        "paciente_nombre": "Alejandro Romero",
        "afiliado_id": "SWISS-001",
        "financiador_id": "swiss-medical",
        "estado": "completada",
        "diagnostico": "Ansiedad generalizada",
        "snomed": "197480006",
    },
]

# ── Prescription data ─────────────────────────────────────────────────────────
PRESCRIPTIONS_DATA = [
    {
        "medicamento_snomed": "372756006",
        "medicamento_nombre": "Enalapril 10mg",
        "cantidad": 30,
        "posologia": "1 comprimido cada 12 horas",
    },
    {
        "medicamento_snomed": "372756007",
        "medicamento_nombre": "Metformina 850mg",
        "cantidad": 60,
        "posologia": "1 comprimido con cada comida principal",
    },
    {
        "medicamento_snomed": "372756008",
        "medicamento_nombre": "Ibuprofeno 400mg",
        "cantidad": 20,
        "posologia": "1 comprimido cada 8 horas con alimentos",
    },
    {
        "medicamento_snomed": "372756009",
        "medicamento_nombre": "Levotiroxina 50mcg",
        "cantidad": 30,
        "posologia": "1 comprimido en ayunas 30 min antes del desayuno",
    },
    {
        "medicamento_snomed": "372756010",
        "medicamento_nombre": "Alprazolam 0.5mg",
        "cantidad": 30,
        "posologia": "1 comprimido por la noche",
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _now_utc() -> datetime:
    """Return current UTC time as datetime — matches refeps_verificado_en (TIMESTAMPTZ column)."""
    return datetime.now(UTC)


def _expiry_date() -> date:
    """Prescription expiry: 60 days from today."""
    return (datetime.now(UTC) + timedelta(days=60)).date()


# ── Main seed ─────────────────────────────────────────────────────────────────

async def seed() -> None:
    log.info("=== SaludOS Demo Seed — starting ===")

    async with AsyncSessionLocal() as db:
        # ── 1. Resolve tenant ───────────────────────────────────────────────
        result = await db.execute(
            select(Tenant).where(Tenant.slug == "dev-prepaga")
        )
        tenant: Tenant | None = result.scalar_one_or_none()

        if tenant is None:
            # Fallback: try generic 'dev' slug
            result = await db.execute(
                select(Tenant).where(Tenant.slug == "dev")
            )
            tenant = result.scalar_one_or_none()

        if tenant is None:
            log.error(
                "Tenant with slug 'dev-prepaga' (or 'dev') not found. "
                "Run the SQL migrations first: psql < migrations/sql/001_initial_schema.sql"
            )
            return

        log.info("Tenant found: %s (%s)", tenant.slug, tenant.id)

        # ── 2. Resolve or create admin user (financiador_admin) ───────────────
        ADMIN_EMAIL = "admin@dev.saludos.ar"
        ADMIN_PASSWORD = "dev123"
        # Precomputed bcrypt hash for "dev123" (generated with bcrypt 5.x / cost factor 12)
        # To regenerate: import bcrypt; bcrypt.hashpw(b"dev123", bcrypt.gensalt()).decode()
        DEV_PASSWORD_HASH = "$2b$12$fonJgn5AxQ/wxVJwlHSwYuFF0V67ruJ5BFwlQ6qXlhYxZqL/gRPlG"

        result = await db.execute(
            select(User).where(
                User.tenant_id == tenant.id,
                User.email == ADMIN_EMAIL,
            )
        )
        admin_user: User | None = result.scalar_one_or_none()

        if admin_user is None:
            admin_user = User(
                tenant_id=tenant.id,
                email=ADMIN_EMAIL,
                hashed_password=DEV_PASSWORD_HASH,
                role="financiador_admin",
                activo=True,
            )
            db.add(admin_user)
            await db.flush()  # get the ID without committing
            log.info("Created admin user: %s (role=financiador_admin)", ADMIN_EMAIL)
        else:
            log.info("Admin user already exists: %s", ADMIN_EMAIL)

        # ── 2b. Resolve medico user (prestador — created by migration 002) ───
        MEDICO_EMAIL = "medico@dev.saludos.ar"
        result = await db.execute(
            select(User).where(
                User.tenant_id == tenant.id,
                User.email == MEDICO_EMAIL,
            )
        )
        medico_user: User | None = result.scalar_one_or_none()
        if medico_user is None:
            medico_user = User(
                tenant_id=tenant.id,
                email=MEDICO_EMAIL,
                hashed_password=DEV_PASSWORD_HASH,
                role="prestador",
                activo=True,
            )
            db.add(medico_user)
            await db.flush()
            log.info("Created medico user: %s (role=prestador)", MEDICO_EMAIL)
        else:
            log.info("Medico user already exists: %s", MEDICO_EMAIL)
        # Use medico_user as the practitioner owner (links to practitioner record)
        practitioner_owner = medico_user

        # ── 3. Seed practitioners ───────────────────────────────────────────
        practitioners_created = 0
        practitioner_objects: list[Practitioner] = []

        for p_data in PRACTITIONERS_DATA:
            # Idempotency: check by (tenant_id, dni)
            result = await db.execute(
                select(Practitioner).where(
                    Practitioner.tenant_id == tenant.id,
                    Practitioner.dni == p_data["dni"],
                )
            )
            existing: Practitioner | None = result.scalar_one_or_none()

            if existing is not None:
                log.info(
                    "Practitioner already exists: %s %s (DNI %s) — skipping",
                    p_data["nombre"],
                    p_data["apellido"],
                    p_data["dni"],
                )
                practitioner_objects.append(existing)
                continue

            practitioner = Practitioner(
                tenant_id=tenant.id,
                user_id=practitioner_owner.id,
                cufp=p_data["cufp"],
                dni=p_data["dni"],
                matricula_nacional=p_data["matricula"],
                nombre=p_data["nombre"],
                apellido=p_data["apellido"],
                especialidad=p_data["especialidad"],
                estado_matricula="vigente",
                provincias_habilitadas=p_data["provincias"],
                refeps_verificado_en=_now_utc(),
                fuente_verificacion="mock",
                aprobado=True,
            )
            db.add(practitioner)
            await db.flush()
            practitioner_objects.append(practitioner)
            practitioners_created += 1
            log.info(
                "Created practitioner: %s %s — %s",
                p_data["nombre"],
                p_data["apellido"],
                p_data["especialidad"],
            )

        log.info(
            "Practitioners: %d created, %d already existed",
            practitioners_created,
            len(PRACTITIONERS_DATA) - practitioners_created,
        )

        # ── 4. Seed consultations ───────────────────────────────────────────
        result = await db.execute(
            select(func.count()).select_from(Consultation).where(
                Consultation.tenant_id == tenant.id
            )
        )
        existing_consultation_count: int = result.scalar_one()

        consultations_created = 0
        consultation_objects: list[Consultation] = []

        if existing_consultation_count >= len(CONSULTATIONS_DATA):
            log.info(
                "Consultations already seeded (%d found) — skipping",
                existing_consultation_count,
            )
            # Load existing ones for prescription linking
            result = await db.execute(
                select(Consultation)
                .where(Consultation.tenant_id == tenant.id)
                .order_by(Consultation.created_at)
                .limit(len(CONSULTATIONS_DATA))
            )
            consultation_objects = list(result.scalars().all())
        else:
            # Use first practitioner as the prescriber for all consultations
            prescriber = practitioner_objects[0]

            for c_data in CONSULTATIONS_DATA:
                jitsi_info = create_jitsi_room()

                consultation = Consultation(
                    tenant_id=tenant.id,
                    tipo=c_data["tipo"],
                    estado=c_data["estado"],
                    medico_id=practitioner_owner.id,
                    medico_cufp=prescriber.cufp or "",
                    paciente_dni=c_data["paciente_dni"],
                    paciente_nombre=c_data["paciente_nombre"],
                    paciente_afiliado_id=c_data["afiliado_id"],
                    financiador_id=c_data["financiador_id"],
                    cobertura_verificada=True,
                    sesion_video_id=jitsi_info["sesion_video_id"],
                    diagnostico_snomed_code=c_data["snomed"],
                    diagnostico_texto=c_data["diagnostico"],
                )
                db.add(consultation)
                await db.flush()
                consultation_objects.append(consultation)
                consultations_created += 1
                log.info(
                    "Created consultation: %s / %s — %s",
                    c_data["paciente_nombre"],
                    c_data["financiador_id"],
                    c_data["estado"],
                )

            log.info("Consultations: %d created", consultations_created)

        # ── 5. Seed prescriptions ───────────────────────────────────────────
        result = await db.execute(
            select(func.count()).select_from(Prescription).where(
                Prescription.tenant_id == tenant.id
            )
        )
        existing_prescription_count: int = result.scalar_one()

        prescriptions_created = 0

        if existing_prescription_count >= len(PRESCRIPTIONS_DATA):
            log.info(
                "Prescriptions already seeded (%d found) — skipping",
                existing_prescription_count,
            )
        else:
            # Attach prescriptions to completed consultations only
            completed_consultations = [
                c for c in consultation_objects if c.estado == "completada"
            ]

            prescriber = practitioner_objects[0]
            expiry = _expiry_date()

            for i, rx_data in enumerate(PRESCRIPTIONS_DATA):
                # Round-robin over completed consultations
                consulta = completed_consultations[i % len(completed_consultations)]

                prescription = Prescription(
                    tenant_id=tenant.id,
                    cuir=generate_cuir("DEVP"),
                    prescriber_id=prescriber.id,
                    prescriber_cufp=prescriber.cufp,
                    patient_ref=f"Patient/DNI-{consulta.paciente_dni}",
                    patient_dni=consulta.paciente_dni,
                    afiliado_id=consulta.paciente_afiliado_id,
                    diagnostico_snomed_code=consulta.diagnostico_snomed_code,
                    diagnostico_descripcion=consulta.diagnostico_texto,
                    medicamento_snomed_code=rx_data["medicamento_snomed"],
                    medicamento_descripcion=rx_data["medicamento_nombre"],
                    indicaciones=rx_data["posologia"],
                    estado="activa",
                    financiador_id=consulta.financiador_id,
                    cobertura_verificada=True,
                    consulta_id=consulta.id,
                    medicamento_nombre=rx_data["medicamento_nombre"],
                    cantidad=rx_data["cantidad"],
                    posologia=rx_data["posologia"],
                    fecha_vencimiento=expiry,
                )
                db.add(prescription)
                prescriptions_created += 1
                log.info(
                    "Created prescription: %s → %s",
                    rx_data["medicamento_nombre"],
                    consulta.paciente_nombre,
                )

            log.info("Prescriptions: %d created", prescriptions_created)

        # ── 6. Commit ────────────────────────────────────────────────────────
        await db.commit()
        log.info("=== Seed committed ===")

    # ── 7. Summary ───────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    print("  SaludOS Demo Seed — DONE")
    print("=" * 60)
    print(f"  Tenant:  {tenant.slug}")
    print(f"  Admin:   {ADMIN_EMAIL}  /  {ADMIN_PASSWORD}  (financiador_admin)")
    print(f"  Medico:  medico@dev.saludos.ar  /  {ADMIN_PASSWORD}  (prestador)")
    print()
    print(f"  Practitioners:  {len(PRACTITIONERS_DATA)} (10 especialistas AR)")
    print(f"  Consultations:  {len(CONSULTATIONS_DATA)} (variadas)")
    print(f"  Prescriptions:  {len(PRESCRIPTIONS_DATA)} (Ley 27.553, con CUIR)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
