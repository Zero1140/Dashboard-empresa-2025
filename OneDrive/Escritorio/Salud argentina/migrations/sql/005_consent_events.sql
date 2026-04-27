-- Migration 005: consent_events table for full consent audit trail (Ley 25.326 / AAIP)
CREATE TABLE IF NOT EXISTS consent_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
    tenant_id   UUID NOT NULL REFERENCES tenants(id),
    action      VARCHAR(20) NOT NULL,
    tos_version VARCHAR(10) NOT NULL DEFAULT '1.0',
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_consent_events_practitioner ON consent_events (practitioner_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS ix_consent_events_tenant ON consent_events (tenant_id);

-- Enable RLS (tenant isolation)
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_consent_events ON consent_events
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
