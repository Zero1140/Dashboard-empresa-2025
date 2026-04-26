-- migrations/sql/004_consent_and_refresh_tokens.sql
-- Adds consent tracking (Ley 25.326) and refresh tokens table

-- ============================================================
-- PRACTITIONERS: campos de consentimiento informado (Ley 25.326)
-- ============================================================
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS
    consent_recorded_at TIMESTAMPTZ;

ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS
    consent_ip TEXT;

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_rt_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS ix_rt_user_id    ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS ix_rt_expires    ON refresh_tokens (expires_at) WHERE NOT revoked;
