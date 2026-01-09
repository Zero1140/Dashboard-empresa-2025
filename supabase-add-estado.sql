-- Agregar campo 'estado' a la tabla impresiones
-- Ejecutar este script en el SQL Editor de Supabase después de crear las tablas básicas

-- Agregar columna estado si no existe
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error'));

-- Crear índice para mejorar consultas de impresiones pendientes
CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

-- Actualizar todas las impresiones existentes a 'impresa' (para que no se reimpriman)
UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;






