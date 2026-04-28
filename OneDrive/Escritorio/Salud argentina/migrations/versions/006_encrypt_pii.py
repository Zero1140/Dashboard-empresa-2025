"""Encrypt PII fields and add search hashes

Revision ID: 006
Revises: 005
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Agregar columnas _hash (nullable para permitir la migración)
    op.add_column("practitioners", sa.Column("dni_hash", sa.String(64), nullable=True))
    op.add_column("practitioners", sa.Column("cufp_hash", sa.String(64), nullable=True))
    op.add_column("practitioners", sa.Column("matricula_hash", sa.String(64), nullable=True))
    op.add_column("consultations", sa.Column("paciente_dni_hash", sa.String(64), nullable=True))

    # 2. Agregar firma_digital a prescriptions
    op.add_column("prescriptions", sa.Column("firma_digital", sa.String(2048), nullable=True))

    # 3. Ampliar columnas existentes para acomodar ciphertext de Fernet (~300 chars para 20-char plaintext)
    op.alter_column("practitioners", "dni", type_=sa.String(512))
    op.alter_column("practitioners", "cufp", type_=sa.String(512))
    op.alter_column("practitioners", "matricula_nacional", type_=sa.String(512))
    op.alter_column("practitioners", "nombre", type_=sa.String(512))
    op.alter_column("practitioners", "apellido", type_=sa.String(512))
    op.alter_column("consultations", "paciente_dni", type_=sa.String(512))

    # 4. Migrar datos: encriptar plaintext existente y calcular hashes
    conn = op.get_bind()
    _migrate_practitioners(conn)
    _migrate_consultations(conn)

    # 5. Crear índices sobre columnas _hash
    op.create_index("ix_practitioners_tenant_dni_hash", "practitioners", ["tenant_id", "dni_hash"])
    op.create_index("ix_practitioners_cufp_hash", "practitioners", ["cufp_hash"],
                    postgresql_where=sa.text("cufp_hash IS NOT NULL"))
    op.create_index("ix_consultations_paciente_dni_hash", "consultations", ["paciente_dni_hash"])

    # 6. Hacer dni_hash NOT NULL (ya todos los rows tienen valor)
    op.alter_column("practitioners", "dni_hash", nullable=False)
    op.alter_column("consultations", "paciente_dni_hash", nullable=False)


def _migrate_practitioners(conn) -> None:
    from app.core.encryption import get_fernet, hmac_sha256
    fernet = get_fernet()
    rows = conn.execute(text(
        "SELECT id, dni, cufp, matricula_nacional, nombre, apellido FROM practitioners"
    )).fetchall()
    for row in rows:
        conn.execute(text("""
            UPDATE practitioners SET
                dni = :dni_enc,
                dni_hash = :dni_hash,
                cufp = :cufp_enc,
                cufp_hash = :cufp_hash,
                matricula_nacional = :mat_enc,
                matricula_hash = :mat_hash,
                nombre = :nombre_enc,
                apellido = :apellido_enc
            WHERE id = :id
        """), {
            "dni_enc": fernet.encrypt(row.dni.encode()).decode() if row.dni else None,
            "dni_hash": hmac_sha256(row.dni) if row.dni else None,
            "cufp_enc": fernet.encrypt(row.cufp.encode()).decode() if row.cufp else None,
            "cufp_hash": hmac_sha256(row.cufp) if row.cufp else None,
            "mat_enc": fernet.encrypt(row.matricula_nacional.encode()).decode() if row.matricula_nacional else None,
            "mat_hash": hmac_sha256(row.matricula_nacional) if row.matricula_nacional else None,
            "nombre_enc": fernet.encrypt(row.nombre.encode()).decode() if row.nombre else None,
            "apellido_enc": fernet.encrypt(row.apellido.encode()).decode() if row.apellido else None,
            "id": row.id,
        })


def _migrate_consultations(conn) -> None:
    from app.core.encryption import get_fernet, hmac_sha256
    fernet = get_fernet()
    rows = conn.execute(text(
        "SELECT id, paciente_dni FROM consultations"
    )).fetchall()
    for row in rows:
        conn.execute(text("""
            UPDATE consultations SET
                paciente_dni = :dni_enc,
                paciente_dni_hash = :dni_hash
            WHERE id = :id
        """), {
            "dni_enc": fernet.encrypt(row.paciente_dni.encode()).decode(),
            "dni_hash": hmac_sha256(row.paciente_dni),
            "id": row.id,
        })


def downgrade() -> None:
    conn = op.get_bind()
    _restore_practitioners(conn)
    _restore_consultations(conn)

    op.drop_index("ix_consultations_paciente_dni_hash", "consultations")
    op.drop_index("ix_practitioners_cufp_hash", "practitioners")
    op.drop_index("ix_practitioners_tenant_dni_hash", "practitioners")
    op.drop_column("consultations", "paciente_dni_hash")
    op.drop_column("prescriptions", "firma_digital")
    op.drop_column("practitioners", "matricula_hash")
    op.drop_column("practitioners", "cufp_hash")
    op.drop_column("practitioners", "dni_hash")
    op.alter_column("practitioners", "dni", type_=sa.String(20))
    op.alter_column("practitioners", "cufp", type_=sa.String(50))
    op.alter_column("practitioners", "matricula_nacional", type_=sa.String(50))
    op.alter_column("practitioners", "nombre", type_=sa.String(150))
    op.alter_column("practitioners", "apellido", type_=sa.String(150))
    op.alter_column("consultations", "paciente_dni", type_=sa.String(20))


def _restore_practitioners(conn) -> None:
    from app.core.encryption import get_fernet
    fernet = get_fernet()
    rows = conn.execute(text(
        "SELECT id, dni, cufp, matricula_nacional, nombre, apellido FROM practitioners"
    )).fetchall()
    for row in rows:
        try:
            conn.execute(text("""
                UPDATE practitioners SET
                    dni = :dni, cufp = :cufp,
                    matricula_nacional = :mat, nombre = :nombre, apellido = :apellido
                WHERE id = :id
            """), {
                "dni": fernet.decrypt(row.dni.encode()).decode() if row.dni else None,
                "cufp": fernet.decrypt(row.cufp.encode()).decode() if row.cufp else None,
                "mat": fernet.decrypt(row.matricula_nacional.encode()).decode() if row.matricula_nacional else None,
                "nombre": fernet.decrypt(row.nombre.encode()).decode() if row.nombre else None,
                "apellido": fernet.decrypt(row.apellido.encode()).decode() if row.apellido else None,
                "id": row.id,
            })
        except Exception:
            pass  # If already plaintext, leave as-is


def _restore_consultations(conn) -> None:
    from app.core.encryption import get_fernet
    fernet = get_fernet()
    rows = conn.execute(text(
        "SELECT id, paciente_dni FROM consultations"
    )).fetchall()
    for row in rows:
        try:
            conn.execute(text("UPDATE consultations SET paciente_dni = :dni WHERE id = :id"), {
                "dni": fernet.decrypt(row.paciente_dni.encode()).decode(),
                "id": row.id,
            })
        except Exception:
            pass
