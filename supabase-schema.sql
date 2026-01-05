-- Schema de base de datos para Dashboard GST3D
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla de impresiones
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_impresiones_maquina ON impresiones(maquina_id);
CREATE INDEX IF NOT EXISTS idx_impresiones_operador ON impresiones(operador);
CREATE INDEX IF NOT EXISTS idx_impresiones_timestamp ON impresiones(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_impresiones_fecha ON impresiones(fecha DESC);

-- Tabla de cambios de operador
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

-- Tabla de cambios de color
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

-- Tabla de stock (JSONB para flexibilidad)
CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY DEFAULT 'stock_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de operadores personalizados
CREATE TABLE IF NOT EXISTS operadores_personalizados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de operadores eliminados
CREATE TABLE IF NOT EXISTS operadores_eliminados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de PINs de operadores
CREATE TABLE IF NOT EXISTS pins_operadores (
  id TEXT PRIMARY KEY DEFAULT 'pins_global',
  pins_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de stock mínimos
CREATE TABLE IF NOT EXISTS stock_minimos (
  id TEXT PRIMARY KEY DEFAULT 'minimos_global',
  materiales_data JSONB NOT NULL DEFAULT '{}',
  categorias_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de stock por categorías
CREATE TABLE IF NOT EXISTS stock_categorias (
  id TEXT PRIMARY KEY DEFAULT 'categorias_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de colores personalizados
CREATE TABLE IF NOT EXISTS colores_personalizados (
  id TEXT PRIMARY KEY DEFAULT 'colores_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de colores eliminados
CREATE TABLE IF NOT EXISTS colores_eliminados (
  id TEXT PRIMARY KEY DEFAULT 'eliminados_global',
  eliminados_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de operadores asignados a máquinas
CREATE TABLE IF NOT EXISTS operadores_asignados (
  id TEXT PRIMARY KEY DEFAULT 'asignaciones_global',
  asignaciones_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de colores por máquina
CREATE TABLE IF NOT EXISTS colores_maquinas (
  id TEXT PRIMARY KEY DEFAULT 'colores_maquinas_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de contador de etiquetas
CREATE TABLE IF NOT EXISTS contador_etiquetas (
  id TEXT PRIMARY KEY DEFAULT 'contador_global',
  chicas INTEGER DEFAULT 0,
  grandes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) - Permitir lectura/escritura pública por ahora
-- En producción, deberías configurar políticas más restrictivas
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

-- Políticas: Permitir todo por ahora (ajustar según necesidades de seguridad)
CREATE POLICY "Allow all operations on impresiones" ON impresiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cambios_operador" ON cambios_operador FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cambios_color" ON cambios_color FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on stock" ON stock FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on operadores_personalizados" ON operadores_personalizados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on operadores_eliminados" ON operadores_eliminados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on pins_operadores" ON pins_operadores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on stock_minimos" ON stock_minimos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on stock_categorias" ON stock_categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on colores_personalizados" ON colores_personalizados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on colores_eliminados" ON colores_eliminados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on operadores_asignados" ON operadores_asignados FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on colores_maquinas" ON colores_maquinas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on contador_etiquetas" ON contador_etiquetas FOR ALL USING (true) WITH CHECK (true);

