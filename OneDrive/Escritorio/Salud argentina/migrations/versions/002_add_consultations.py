# migrations/versions/002_add_consultations.py
"""Add consultations table and extend prescriptions

Revision ID: 002
Revises: 001
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = None  # No previous Alembic revision; 001 was raw SQL
branch_labels = None
depends_on = None


def upgrade() -> None:
    # practitioners: add user_id FK
    op.add_column("practitioners", sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_practitioners_user_id", "practitioners", "users", ["user_id"], ["id"])
    op.create_index("ix_practitioners_user_id", "practitioners", ["user_id"], postgresql_where=sa.text("user_id IS NOT NULL"))

    # consultations table
    op.create_table(
        "consultations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", sa.String(20), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="programada"),
        sa.Column("medico_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("medico_cufp", sa.String(50), nullable=False),
        sa.Column("paciente_dni", sa.String(20), nullable=False),
        sa.Column("paciente_nombre", sa.String(200), nullable=False),
        sa.Column("paciente_afiliado_id", sa.String(100), nullable=True),
        sa.Column("financiador_id", sa.String(100), nullable=True),
        sa.Column("cobertura_verificada", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("sesion_video_id", sa.String(100), nullable=True),
        sa.Column("fecha_consulta", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("diagnostico_snomed_code", sa.String(50), nullable=True),
        sa.Column("diagnostico_texto", sa.Text(), nullable=True),
        sa.Column("notas_clinicas", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_consultations_tenant_medico", "consultations", ["tenant_id", "medico_id"])
    op.create_index("ix_consultations_tenant_estado", "consultations", ["tenant_id", "estado"])
    op.create_check_constraint(
        "ck_consultations_tipo",
        "consultations",
        "tipo IN ('teleconsulta', 'externa')"
    )
    op.create_check_constraint(
        "ck_consultations_estado",
        "consultations",
        "estado IN ('programada', 'en_curso', 'completada', 'cancelada')"
    )
    op.execute(text("ALTER TABLE consultations ENABLE ROW LEVEL SECURITY"))
    op.execute(text("""
        CREATE POLICY tenant_isolation_consultations ON consultations
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
    """))
    op.execute(text("""
        CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    """))

    # prescriptions: new columns
    op.add_column("prescriptions", sa.Column("consulta_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("consultations.id"), nullable=True))
    op.create_index("ix_prescriptions_consulta_id", "prescriptions", ["consulta_id"],
                    postgresql_where=sa.text("consulta_id IS NOT NULL"))
    op.add_column("prescriptions", sa.Column("medicamento_nombre", sa.String(255), nullable=True))
    op.add_column("prescriptions", sa.Column("cantidad", sa.Integer(), nullable=True, server_default="1"))
    op.add_column("prescriptions", sa.Column("posologia", sa.String(500), nullable=True))
    op.add_column("prescriptions", sa.Column("fecha_vencimiento", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("prescriptions", "fecha_vencimiento")
    op.drop_column("prescriptions", "posologia")
    op.drop_column("prescriptions", "cantidad")
    op.drop_column("prescriptions", "medicamento_nombre")
    op.drop_index("ix_prescriptions_consulta_id", "prescriptions")
    op.drop_constraint("prescriptions_consulta_id_fkey", "prescriptions", type_="foreignkey")
    op.drop_column("prescriptions", "consulta_id")
    op.drop_constraint("ck_consultations_tipo", "consultations", type_="check")
    op.drop_constraint("ck_consultations_estado", "consultations", type_="check")
    op.drop_table("consultations")
    op.drop_index("ix_practitioners_user_id", "practitioners")
    op.drop_constraint("fk_practitioners_user_id", "practitioners", type_="foreignkey")
    op.drop_column("practitioners", "user_id")
