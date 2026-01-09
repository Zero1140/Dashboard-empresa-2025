-- ============================================================
-- SCRIPT DE MIGRACIÓN A SUPABASE PARA GST3D PUSH SERVER
-- ============================================================
-- Ejecutar este script en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- TABLA 1: fcm_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  source TEXT,
  customer_id TEXT,
  email TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  country TEXT,
  country_name TEXT,
  region TEXT,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_platform ON fcm_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_country ON fcm_tokens(country);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_customer_id ON fcm_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_seen ON fcm_tokens(last_seen);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_registered_at ON fcm_tokens(registered_at);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_email ON fcm_tokens(email) WHERE email IS NOT NULL;

-- Habilitar Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Política: Solo el service_role puede acceder (desde el servidor)
-- Esto asegura que solo el servidor puede leer/escribir tokens
DROP POLICY IF EXISTS "Service role can do everything" ON fcm_tokens;
CREATE POLICY "Service role can do everything"
  ON fcm_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comentarios para documentación
COMMENT ON TABLE fcm_tokens IS 'Almacena tokens FCM de dispositivos registrados';
COMMENT ON COLUMN fcm_tokens.token IS 'Token FCM completo (único)';
COMMENT ON COLUMN fcm_tokens.platform IS 'Plataforma: android o ios';
COMMENT ON COLUMN fcm_tokens.last_seen IS 'Última vez que se actualizó el token';

-- ============================================================
-- TABLA 2: fcm_token_logs (Opcional - para auditoría)
-- ============================================================
CREATE TABLE IF NOT EXISTS fcm_token_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES fcm_tokens(id) ON DELETE CASCADE,
  token_preview TEXT,  -- Primeros 20 caracteres del token
  action TEXT NOT NULL CHECK (action IN ('registered', 'updated', 'deleted', 'sent', 'failed')),
  platform TEXT,
  details JSONB,       -- Datos adicionales en formato JSON
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_fcm_token_logs_token_id ON fcm_token_logs(token_id);
CREATE INDEX IF NOT EXISTS idx_fcm_token_logs_created_at ON fcm_token_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_fcm_token_logs_action ON fcm_token_logs(action);

-- Habilitar Row Level Security
ALTER TABLE fcm_token_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo el service_role puede acceder
DROP POLICY IF EXISTS "Service role can do everything" ON fcm_token_logs;
CREATE POLICY "Service role can do everything"
  ON fcm_token_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comentarios
COMMENT ON TABLE fcm_token_logs IS 'Logs de auditoría para tokens FCM';
COMMENT ON COLUMN fcm_token_logs.details IS 'Datos adicionales en formato JSON';

-- ============================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en fcm_tokens
DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at ON fcm_tokens;
CREATE TRIGGER update_fcm_tokens_updated_at
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- FUNCIÓN: Limpiar tokens antiguos (opcional - para mantenimiento)
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_old_tokens(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar tokens que no se han visto en X días
  DELETE FROM fcm_tokens
  WHERE last_seen < NOW() - (days_old || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comentario
COMMENT ON FUNCTION cleanup_old_tokens IS 'Elimina tokens que no se han visto en X días (default: 90)';

-- ============================================================
-- VERIFICACIÓN: Verificar que las tablas se crearon correctamente
-- ============================================================
-- Ejecutar estas consultas para verificar:

-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name IN ('fcm_tokens', 'fcm_token_logs')
-- ORDER BY table_name, ordinal_position;

-- SELECT COUNT(*) as total_tokens FROM fcm_tokens;
-- SELECT COUNT(*) as total_logs FROM fcm_token_logs;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================





