# migrations/versions/003_practitioner_invitations.py
"""Add practitioner invitations and provinces

Revision ID: 003
Revises: 002
Create Date: 2026-04-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "practitioner_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("practitioner_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("practitioners.id"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
    )
    op.create_index("ix_invitations_token_hash", "practitioner_invitations", ["token_hash"])
    op.create_index("ix_invitations_tenant_email", "practitioner_invitations",
                    ["tenant_id", "email"])

    op.create_table(
        "practitioner_provinces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("practitioner_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("practitioners.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provincia", sa.String(100), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"),
        sa.Column("updated_by_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.UniqueConstraint("practitioner_id", "provincia", name="uq_practitioner_province"),
    )
    op.execute(text(
        "ALTER TABLE practitioner_invitations ENABLE ROW LEVEL SECURITY"
    ))
    op.execute(text("""
        CREATE POLICY tenant_isolation_invitations ON practitioner_invitations
        USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
    """))


def downgrade() -> None:
    op.drop_table("practitioner_provinces")
    op.drop_table("practitioner_invitations")
