-- migrations/sql/003_add_practitioner_invitations.sql
-- Adds practitioner invitations and province tracking
-- Run after 002_add_consultations.sql

-- ============================================================
-- PRACTITIONER INVITATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS practitioner_invitations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    token           TEXT NOT NULL UNIQUE,
    estado          TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','aceptada','aprobada','expirada','rechazada')),
    practitioner_id UUID REFERENCES practitioners(id),
    invited_by_id   UUID NOT NULL REFERENCES users(id),
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pi_tenant_email   ON practitioner_invitations (tenant_id, email);
CREATE INDEX IF NOT EXISTS ix_pi_token          ON practitioner_invitations (token);
CREATE INDEX IF NOT EXISTS ix_pi_practitioner   ON practitioner_invitations (practitioner_id)
    WHERE practitioner_id IS NOT NULL;

-- Row-Level Security
ALTER TABLE practitioner_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY pi_tenant_isolation ON practitioner_invitations
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================================
-- PRACTITIONER PROVINCES
-- ============================================================
CREATE TABLE IF NOT EXISTS practitioner_provinces (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id     UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provincia           TEXT NOT NULL,
    estado              TEXT NOT NULL DEFAULT 'pendiente'
                            CHECK (estado IN ('pendiente','tramitando','habilitado')),
    updated_by_id       UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (practitioner_id, tenant_id, provincia)
);

CREATE INDEX IF NOT EXISTS ix_pp_practitioner ON practitioner_provinces (practitioner_id, tenant_id);

ALTER TABLE practitioner_provinces ENABLE ROW LEVEL SECURITY;
CREATE POLICY pp_tenant_isolation ON practitioner_provinces
    USING (tenant_id::text = current_setting('app.current_tenant_id', true));

-- ============================================================
-- Extend practitioners: add aprobado flag for cartilla
-- ============================================================
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS aprobado BOOLEAN NOT NULL DEFAULT FALSE;
