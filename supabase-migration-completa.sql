-- ============================================================================
-- SCHEMA COMPLETO DE BASE DE DATOS PARA DASHBOARD GST3D
-- ============================================================================
-- Ejecutar este script completo en el SQL Editor de Supabase
-- Este script incluye todas las tablas, índices, políticas y configuraciones
-- ============================================================================

-- ============================================================================
-- TABLA DE IMPRESIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS impresiones (
  id TEXT PRIMARY KEY,
  maquina_id INTEGER NOT NULL,
  tipo_material TEXT NOT NULL,
  etiqueta_chica TEXT NOT NULL,
  etiqueta_grande TEXT NOT NULL,
  operador TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  timestamp BIGINT NOT NULL,
  cantidad_chicas INTEGER DEFAULT 8,
  cantidad_grandes INTEGER DEFAULT 8,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar consultas de impresiones
CREATE INDEX IF NOT EXISTS idx_impresiones_maquina ON impresiones(maquina_id);
CREATE INDEX IF NOT EXISTS idx_impresiones_operador ON impresiones(operador);
CREATE INDEX IF NOT EXISTS idx_impresiones_timestamp ON impresiones(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_impresiones_fecha ON impresiones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

-- ============================================================================
-- TABLA DE CAMBIOS DE OPERADOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS cambios_operador (
  id TEXT PRIMARY KEY,
  maquina_id INTEGER NOT NULL,
  operador_anterior TEXT NOT NULL,
  operador_nuevo TEXT NOT NULL,
  supervisor TEXT NOT NULL DEFAULT 'Sistema',
  fecha TIMESTAMPTZ NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cambios_operador_maquina ON cambios_operador(maquina_id);
CREATE INDEX IF NOT EXISTS idx_cambios_operador_timestamp ON cambios_operador(timestamp DESC);

-- ============================================================================
-- TABLA DE CAMBIOS DE COLOR
-- ============================================================================
CREATE TABLE IF NOT EXISTS cambios_color (
  id TEXT PRIMARY KEY,
  maquina_id INTEGER NOT NULL,
  tipo_color TEXT NOT NULL CHECK (tipo_color IN ('chica', 'grande')),
  color_anterior TEXT NOT NULL,
  color_nuevo TEXT NOT NULL,
  supervisor TEXT NOT NULL DEFAULT 'Sistema',
  fecha TIMESTAMPTZ NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cambios_color_maquina ON cambios_color(maquina_id);
CREATE INDEX IF NOT EXISTS idx_cambios_color_timestamp ON cambios_color(timestamp DESC);

-- ============================================================================
-- TABLA DE STOCK (JSONB para flexibilidad)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY DEFAULT 'stock_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE OPERADORES PERSONALIZADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_personalizados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE OPERADORES ELIMINADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_eliminados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE PINs DE OPERADORES
-- IMPORTANTE: Estructura corregida para usar JSONB
-- ============================================================================
CREATE TABLE IF NOT EXISTS pins_operadores (
  id TEXT PRIMARY KEY DEFAULT 'pins_global',
  pins_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE STOCK MÍNIMOS
-- IMPORTANTE: Estructura corregida con materiales_data y categorias_data separados
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_minimos (
  id TEXT PRIMARY KEY DEFAULT 'minimos_global',
  materiales_data JSONB NOT NULL DEFAULT '{}',
  categorias_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE STOCK POR CATEGORÍAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_categorias (
  id TEXT PRIMARY KEY DEFAULT 'categorias_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE CATEGORÍAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE COLORES PERSONALIZADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_personalizados (
  id TEXT PRIMARY KEY DEFAULT 'colores_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE COLORES ELIMINADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_eliminados (
  id TEXT PRIMARY KEY DEFAULT 'eliminados_global',
  eliminados_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE OPERADORES ASIGNADOS A MÁQUINAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_asignados (
  id TEXT PRIMARY KEY DEFAULT 'asignaciones_global',
  asignaciones_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE COLORES POR MÁQUINA
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_maquinas (
  id TEXT PRIMARY KEY DEFAULT 'colores_maquinas_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE CONTADOR DE ETIQUETAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS contador_etiquetas (
  id TEXT PRIMARY KEY DEFAULT 'contador_global',
  chicas INTEGER DEFAULT 0,
  grandes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE impresiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_operador ENABLE ROW LEVEL SECURITY;
ALTER TABLE cambios_color ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores_personalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores_eliminados ENABLE ROW LEVEL SECURITY;
ALTER TABLE pins_operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_minimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores_personalizados ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores_eliminados ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores_asignados ENABLE ROW LEVEL SECURITY;
ALTER TABLE colores_maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE contador_etiquetas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS DE SEGURIDAD (Permitir todo por ahora)
-- En producción, deberías configurar políticas más restrictivas
-- ============================================================================
CREATE POLICY "Allow all operations on impresiones" 
ON impresiones FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on cambios_operador" 
ON cambios_operador FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on cambios_color" 
ON cambios_color FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stock" 
ON stock FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on operadores_personalizados" 
ON operadores_personalizados FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on operadores_eliminados" 
ON operadores_eliminados FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on pins_operadores" 
ON pins_operadores FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stock_minimos" 
ON stock_minimos FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on stock_categorias" 
ON stock_categorias FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on categorias" 
ON categorias FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on colores_personalizados" 
ON colores_personalizados FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on colores_eliminados" 
ON colores_eliminados FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on operadores_asignados" 
ON operadores_asignados FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on colores_maquinas" 
ON colores_maquinas FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on contador_etiquetas" 
ON contador_etiquetas FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- INICIALIZAR REGISTROS GLOBALES
-- ============================================================================
INSERT INTO stock (id, stock_data) 
VALUES ('stock_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_categorias (id, stock_data) 
VALUES ('categorias_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO operadores_asignados (id, asignaciones_data) 
VALUES ('asignaciones_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO colores_maquinas (id, colores_data) 
VALUES ('colores_maquinas_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO colores_personalizados (id, colores_data) 
VALUES ('colores_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO colores_eliminados (id, eliminados_data) 
VALUES ('eliminados_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contador_etiquetas (id, chicas, grandes) 
VALUES ('contador_global', 0, 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pins_operadores (id, pins_data) 
VALUES ('pins_global', '{}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_minimos (id, materiales_data, categorias_data) 
VALUES ('minimos_global', '{}', '{}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ACTUALIZAR IMPRESIONES EXISTENTES
-- Solo ejecutar si ya tienes datos en la tabla impresiones
-- ============================================================================
-- Agregar columna estado si no existe (para tablas ya creadas)
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error'));

-- Actualizar todas las impresiones existentes a 'impresa' (para que no se reimpriman)
UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;

-- ============================================================================
-- HABILITAR REALTIME EN TODAS LAS TABLAS
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE stock;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_categorias;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_asignados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_maquinas;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_personalizados;
ALTER PUBLICATION supabase_realtime ADD TABLE operadores_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_personalizados;
ALTER PUBLICATION supabase_realtime ADD TABLE colores_eliminados;
ALTER PUBLICATION supabase_realtime ADD TABLE contador_etiquetas;
ALTER PUBLICATION supabase_realtime ADD TABLE pins_operadores;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_minimos;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Después de ejecutar este script:
-- 1. Verifica que todas las tablas se crearon correctamente
-- 2. Verifica que Realtime está habilitado (Database > Replication)
-- 3. Verifica que las políticas RLS están activas
-- ============================================================================


