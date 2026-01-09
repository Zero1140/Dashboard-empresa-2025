-- ============================================================================
-- SCHEMA COMPLETO DE BASE DE DATOS PARA DASHBOARD GST3D - VERSIÓN OPTIMIZADA
-- ============================================================================
-- Este script es seguro de ejecutar múltiples veces
-- Maneja correctamente tablas existentes y evita errores
-- ============================================================================

-- ============================================================================
-- 1. CREAR/ACTUALIZAR TABLA DE IMPRESIONES
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna estado si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'impresiones' AND column_name = 'estado'
  ) THEN
    ALTER TABLE impresiones 
    ADD COLUMN estado TEXT DEFAULT 'pendiente' 
    CHECK (estado IN ('pendiente', 'impresa', 'error'));
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_impresiones_maquina ON impresiones(maquina_id);
CREATE INDEX IF NOT EXISTS idx_impresiones_operador ON impresiones(operador);
CREATE INDEX IF NOT EXISTS idx_impresiones_timestamp ON impresiones(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_impresiones_fecha ON impresiones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

-- Actualizar impresiones existentes
UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;

-- ============================================================================
-- 2. TABLA DE CAMBIOS DE OPERADOR
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
-- 3. TABLA DE CAMBIOS DE COLOR
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
-- 4. TABLA DE STOCK
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock (
  id TEXT PRIMARY KEY DEFAULT 'stock_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. TABLA DE OPERADORES PERSONALIZADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_personalizados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. TABLA DE OPERADORES ELIMINADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_eliminados (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TABLA DE PINs DE OPERADORES (ESTRUCTURA CORREGIDA)
-- ============================================================================
-- Si la tabla existe con estructura antigua, necesitamos recrearla
DO $$ 
BEGIN
  -- Verificar si existe con estructura antigua (operador como PK)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pins_operadores' AND column_name = 'operador'
  ) THEN
    -- Migrar datos si existen
    CREATE TABLE IF NOT EXISTS pins_operadores_backup AS 
    SELECT * FROM pins_operadores;
    
    -- Eliminar tabla antigua
    DROP TABLE IF EXISTS pins_operadores CASCADE;
  END IF;
END $$;

-- Crear tabla con estructura correcta
CREATE TABLE IF NOT EXISTS pins_operadores (
  id TEXT PRIMARY KEY DEFAULT 'pins_global',
  pins_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. TABLA DE STOCK MÍNIMOS (ESTRUCTURA CORREGIDA)
-- ============================================================================
-- Si la tabla existe con estructura antigua, necesitamos actualizarla
DO $$ 
BEGIN
  -- Verificar si existe con estructura antigua (solo minimos_data)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_minimos' 
    AND column_name = 'minimos_data'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stock_minimos' AND column_name = 'materiales_data'
    )
  ) THEN
    -- Agregar nuevas columnas
    ALTER TABLE stock_minimos 
    ADD COLUMN IF NOT EXISTS materiales_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS categorias_data JSONB DEFAULT '{}';
    
    -- Migrar datos si existen
    UPDATE stock_minimos 
    SET materiales_data = COALESCE(minimos_data, '{}'::jsonb),
        categorias_data = '{}'::jsonb
    WHERE materiales_data IS NULL;
    
    -- Eliminar columna antigua (opcional, comentado por seguridad)
    -- ALTER TABLE stock_minimos DROP COLUMN IF EXISTS minimos_data;
  END IF;
END $$;

-- Crear tabla si no existe
CREATE TABLE IF NOT EXISTS stock_minimos (
  id TEXT PRIMARY KEY DEFAULT 'minimos_global',
  materiales_data JSONB NOT NULL DEFAULT '{}',
  categorias_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar que las columnas existan
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_minimos' AND column_name = 'materiales_data'
  ) THEN
    ALTER TABLE stock_minimos ADD COLUMN materiales_data JSONB DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stock_minimos' AND column_name = 'categorias_data'
  ) THEN
    ALTER TABLE stock_minimos ADD COLUMN categorias_data JSONB DEFAULT '{}';
  END IF;
END $$;

-- ============================================================================
-- 9. TABLA DE STOCK POR CATEGORÍAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_categorias (
  id TEXT PRIMARY KEY DEFAULT 'categorias_global',
  stock_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. TABLA DE CATEGORÍAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS categorias (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. TABLA DE COLORES PERSONALIZADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_personalizados (
  id TEXT PRIMARY KEY DEFAULT 'colores_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. TABLA DE COLORES ELIMINADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_eliminados (
  id TEXT PRIMARY KEY DEFAULT 'eliminados_global',
  eliminados_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. TABLA DE OPERADORES ASIGNADOS A MÁQUINAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS operadores_asignados (
  id TEXT PRIMARY KEY DEFAULT 'asignaciones_global',
  asignaciones_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. TABLA DE COLORES POR MÁQUINA
-- ============================================================================
CREATE TABLE IF NOT EXISTS colores_maquinas (
  id TEXT PRIMARY KEY DEFAULT 'colores_maquinas_global',
  colores_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 15. TABLA DE CONTADOR DE ETIQUETAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS contador_etiquetas (
  id TEXT PRIMARY KEY DEFAULT 'contador_global',
  chicas INTEGER DEFAULT 0,
  grandes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 16. HABILITAR ROW LEVEL SECURITY (RLS)
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
-- 17. CREAR POLÍTICAS DE SEGURIDAD (con IF NOT EXISTS usando DO block)
-- ============================================================================
DO $$ 
BEGIN
  -- Impresiones
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'impresiones' AND policyname = 'Allow all operations on impresiones') THEN
    CREATE POLICY "Allow all operations on impresiones" ON impresiones FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Cambios operador
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cambios_operador' AND policyname = 'Allow all operations on cambios_operador') THEN
    CREATE POLICY "Allow all operations on cambios_operador" ON cambios_operador FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Cambios color
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cambios_color' AND policyname = 'Allow all operations on cambios_color') THEN
    CREATE POLICY "Allow all operations on cambios_color" ON cambios_color FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Stock
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock' AND policyname = 'Allow all operations on stock') THEN
    CREATE POLICY "Allow all operations on stock" ON stock FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Operadores personalizados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operadores_personalizados' AND policyname = 'Allow all operations on operadores_personalizados') THEN
    CREATE POLICY "Allow all operations on operadores_personalizados" ON operadores_personalizados FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Operadores eliminados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operadores_eliminados' AND policyname = 'Allow all operations on operadores_eliminados') THEN
    CREATE POLICY "Allow all operations on operadores_eliminados" ON operadores_eliminados FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- PINs operadores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pins_operadores' AND policyname = 'Allow all operations on pins_operadores') THEN
    CREATE POLICY "Allow all operations on pins_operadores" ON pins_operadores FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Stock mínimos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_minimos' AND policyname = 'Allow all operations on stock_minimos') THEN
    CREATE POLICY "Allow all operations on stock_minimos" ON stock_minimos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Stock categorías
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'stock_categorias' AND policyname = 'Allow all operations on stock_categorias') THEN
    CREATE POLICY "Allow all operations on stock_categorias" ON stock_categorias FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Categorías
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'Allow all operations on categorias') THEN
    CREATE POLICY "Allow all operations on categorias" ON categorias FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Colores personalizados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colores_personalizados' AND policyname = 'Allow all operations on colores_personalizados') THEN
    CREATE POLICY "Allow all operations on colores_personalizados" ON colores_personalizados FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Colores eliminados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colores_eliminados' AND policyname = 'Allow all operations on colores_eliminados') THEN
    CREATE POLICY "Allow all operations on colores_eliminados" ON colores_eliminados FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Operadores asignados
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'operadores_asignados' AND policyname = 'Allow all operations on operadores_asignados') THEN
    CREATE POLICY "Allow all operations on operadores_asignados" ON operadores_asignados FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Colores máquinas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'colores_maquinas' AND policyname = 'Allow all operations on colores_maquinas') THEN
    CREATE POLICY "Allow all operations on colores_maquinas" ON colores_maquinas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  -- Contador etiquetas
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contador_etiquetas' AND policyname = 'Allow all operations on contador_etiquetas') THEN
    CREATE POLICY "Allow all operations on contador_etiquetas" ON contador_etiquetas FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- 18. INICIALIZAR REGISTROS GLOBALES
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
-- 19. HABILITAR REALTIME EN TODAS LAS TABLAS
-- ============================================================================
-- Usar DO block para manejar errores si ya están agregadas
DO $$ 
DECLARE
  table_name TEXT;
  tables_to_add TEXT[] := ARRAY[
    'categorias',
    'stock',
    'stock_categorias',
    'operadores_asignados',
    'colores_maquinas',
    'operadores_personalizados',
    'operadores_eliminados',
    'colores_personalizados',
    'colores_eliminados',
    'contador_etiquetas',
    'pins_operadores',
    'stock_minimos'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_add
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
    EXCEPTION
      WHEN duplicate_object THEN
        -- Ya está agregada, continuar
        NULL;
      WHEN OTHERS THEN
        -- Otro error, registrar pero continuar
        RAISE NOTICE 'Error al agregar tabla % a Realtime: %', table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Verificaciones post-ejecución:
-- 1. SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- 2. SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- 3. Database > Replication en Supabase Dashboard
-- ============================================================================


