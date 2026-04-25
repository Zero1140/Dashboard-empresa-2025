-- migrations/sql/002_add_consultations.sql
-- Adds consultations table and extends prescriptions
-- Run after 001_initial_schema.sql

-- ============================================================
-- PRACTITIONERS: add user_id link (prestador → practitioner)
-- ============================================================
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS
    user_id UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS ix_practitioners_user_id ON practitioners (user_id)
    WHERE user_id IS NOT NULL;

-- ============================================================
-- CONSULTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS consultations (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tipo                    TEXT NOT NULL CHECK (tipo IN ('teleconsulta', 'externa')),
    estado                  TEXT NOT NULL DEFAULT 'programada'
                                CHECK (estado IN ('programada','en_curso','completada','cancelada')),
    medico_id               UUID NOT NULL REFERENCES users(id),
    medico_cufp             TEXT NOT NULL,
    paciente_dni            TEXT NOT NULL,
    paciente_nombre         TEXT NOT NULL,
    paciente_afiliado_id    TEXT,
    financiador_id          TEXT,
    cobertura_verificada    BOOLEAN NOT NULL DEFAULT FALSE,
    sesion_video_id         TEXT,
    fecha_consulta          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    diagnostico_snomed_code TEXT,
    diagnostico_texto       TEXT,
    notas_clinicas          TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_consultations_tenant_medico
    ON consultations (tenant_id, medico_id);
CREATE INDEX IF NOT EXISTS ix_consultations_tenant_estado
    ON consultations (tenant_id, estado);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_consultations ON consultations;
CREATE POLICY tenant_isolation_consultations ON consultations
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

DROP TRIGGER IF EXISTS update_consultations_updated_at ON consultations;
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PRESCRIPTIONS: extend with consultation link + new fields
-- ============================================================
ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS
    consulta_id UUID REFERENCES consultations(id);

CREATE INDEX IF NOT EXISTS ix_prescriptions_consulta_id
    ON prescriptions (consulta_id) WHERE consulta_id IS NOT NULL;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS
    medicamento_nombre TEXT;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS
    cantidad INTEGER DEFAULT 1;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS
    posologia TEXT;

ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS
    fecha_vencimiento DATE;

-- ============================================================
-- Seed: dev practitioner linked to dev tenant
-- (used by tests and local development)
-- ============================================================
DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id   UUID;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'dev-prepaga';
    IF v_tenant_id IS NULL THEN RETURN; END IF;

    -- Create dev user (prestador) if not exists
    INSERT INTO users (tenant_id, email, hashed_password, role)
    VALUES (
        v_tenant_id,
        'medico@dev.saludos.ar',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMVJcSRfVEhUzW5jyTPGFRXC2u', -- password: dev123
        'prestador'
    )
    ON CONFLICT (tenant_id, email) DO NOTHING;

    SELECT id INTO v_user_id FROM users
    WHERE tenant_id = v_tenant_id AND email = 'medico@dev.saludos.ar';

    -- Create dev practitioner linked to the user
    INSERT INTO practitioners (
        tenant_id, user_id, cufp, dni, matricula_nacional,
        nombre, apellido, especialidad, estado_matricula, fuente_verificacion
    )
    SELECT
        v_tenant_id,
        v_user_id,
        'CUFP-00001234',
        '12345678',
        'MN-98765',
        'María',
        'García',
        'Medicina General',
        'vigente',
        'mock'
    WHERE NOT EXISTS (
        SELECT 1 FROM practitioners WHERE tenant_id = v_tenant_id AND cufp = 'CUFP-00001234'
    );
END $$;
