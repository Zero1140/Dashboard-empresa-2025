"""Add paciente_consentimiento_informado to consultations

Revision ID: 008
Revises: 007
Create Date: 2026-04-28
"""
from alembic import op
import sqlalchemy as sa

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "consultations",
        sa.Column(
            "paciente_consentimiento_informado",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("consultations", "paciente_consentimiento_informado")
