# migrations/versions/005_consent_events_rls.py
"""Enable RLS on audit_log

Revision ID: 005
Revises: 004
Create Date: 2026-04-27
"""
from alembic import op
from sqlalchemy import text

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(text("""
        ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY
    """))
    op.execute(text("""
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename='audit_log' AND policyname='tenant_isolation_audit_log'
          ) THEN
            CREATE POLICY tenant_isolation_audit_log ON audit_log
            USING (
              tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID
              OR current_setting('app.current_tenant_id', TRUE) IS NULL
            );
          END IF;
        END;
        $$
    """))


def downgrade() -> None:
    op.execute(text("DROP POLICY IF EXISTS tenant_isolation_audit_log ON audit_log"))
    op.execute(text("ALTER TABLE audit_log DISABLE ROW LEVEL SECURITY"))
