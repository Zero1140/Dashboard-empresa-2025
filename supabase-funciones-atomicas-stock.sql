-- ============================================================================
-- FUNCIONES ATÓMICAS PARA OPERACIONES DE STOCK
-- ============================================================================
-- Estas funciones garantizan que las operaciones de stock sean atómicas
-- y evitan condiciones de carrera cuando múltiples usuarios actualizan simultáneamente
-- ============================================================================
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase
-- ============================================================================

-- Función para sumar stock de manera atómica
CREATE OR REPLACE FUNCTION sumar_stock_atomico(
  p_tipo TEXT,
  p_color TEXT,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_stock_actual JSONB;
  v_stock_tipo JSONB;
  v_valor_actual INTEGER;
BEGIN
  -- Obtener el stock actual de manera atómica
  SELECT stock_data INTO v_stock_actual
  FROM stock
  WHERE id = 'stock_global'
  FOR UPDATE; -- Bloquea la fila para evitar condiciones de carrera
  
  -- Si no existe, crear estructura inicial
  IF v_stock_actual IS NULL THEN
    v_stock_actual := '{}'::JSONB;
  END IF;
  
  -- Obtener el stock del tipo específico
  v_stock_tipo := COALESCE(v_stock_actual->p_tipo, '{}'::JSONB);
  
  -- Obtener el valor actual del color (o 0 si no existe)
  v_valor_actual := COALESCE((v_stock_tipo->>p_color)::INTEGER, 0);
  
  -- Sumar la cantidad
  v_stock_tipo := jsonb_set(
    v_stock_tipo,
    ARRAY[p_color],
    to_jsonb(v_valor_actual + p_cantidad)
  );
  
  -- Actualizar el stock del tipo
  v_stock_actual := jsonb_set(
    v_stock_actual,
    ARRAY[p_tipo],
    v_stock_tipo
  );
  
  -- Guardar de manera atómica
  INSERT INTO stock (id, stock_data, updated_at)
  VALUES ('stock_global', v_stock_actual, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    stock_data = EXCLUDED.stock_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al sumar stock: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función para restar stock de manera atómica
CREATE OR REPLACE FUNCTION restar_stock_atomico(
  p_tipo TEXT,
  p_color TEXT,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_stock_actual JSONB;
  v_stock_tipo JSONB;
  v_valor_actual INTEGER;
  v_nuevo_valor INTEGER;
BEGIN
  -- Obtener el stock actual de manera atómica
  SELECT stock_data INTO v_stock_actual
  FROM stock
  WHERE id = 'stock_global'
  FOR UPDATE; -- Bloquea la fila para evitar condiciones de carrera
  
  -- Si no existe, crear estructura inicial
  IF v_stock_actual IS NULL THEN
    v_stock_actual := '{}'::JSONB;
  END IF;
  
  -- Obtener el stock del tipo específico
  v_stock_tipo := COALESCE(v_stock_actual->p_tipo, '{}'::JSONB);
  
  -- Obtener el valor actual del color (o 0 si no existe)
  v_valor_actual := COALESCE((v_stock_tipo->>p_color)::INTEGER, 0);
  
  -- Calcular nuevo valor (no permitir valores negativos)
  v_nuevo_valor := GREATEST(0, v_valor_actual - p_cantidad);
  
  -- Actualizar el stock del tipo
  v_stock_tipo := jsonb_set(
    v_stock_tipo,
    ARRAY[p_color],
    to_jsonb(v_nuevo_valor)
  );
  
  -- Actualizar el stock completo
  v_stock_actual := jsonb_set(
    v_stock_actual,
    ARRAY[p_tipo],
    v_stock_tipo
  );
  
  -- Guardar de manera atómica
  INSERT INTO stock (id, stock_data, updated_at)
  VALUES ('stock_global', v_stock_actual, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    stock_data = EXCLUDED.stock_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al restar stock: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función para establecer stock de manera atómica
CREATE OR REPLACE FUNCTION establecer_stock_atomico(
  p_tipo TEXT,
  p_color TEXT,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_stock_actual JSONB;
  v_stock_tipo JSONB;
BEGIN
  -- Obtener el stock actual de manera atómica
  SELECT stock_data INTO v_stock_actual
  FROM stock
  WHERE id = 'stock_global'
  FOR UPDATE; -- Bloquea la fila para evitar condiciones de carrera
  
  -- Si no existe, crear estructura inicial
  IF v_stock_actual IS NULL THEN
    v_stock_actual := '{}'::JSONB;
  END IF;
  
  -- Obtener el stock del tipo específico
  v_stock_tipo := COALESCE(v_stock_actual->p_tipo, '{}'::JSONB);
  
  -- Establecer el valor del color
  v_stock_tipo := jsonb_set(
    v_stock_tipo,
    ARRAY[p_color],
    to_jsonb(GREATEST(0, p_cantidad)) -- No permitir valores negativos
  );
  
  -- Actualizar el stock completo
  v_stock_actual := jsonb_set(
    v_stock_actual,
    ARRAY[p_tipo],
    v_stock_tipo
  );
  
  -- Guardar de manera atómica
  INSERT INTO stock (id, stock_data, updated_at)
  VALUES ('stock_global', v_stock_actual, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    stock_data = EXCLUDED.stock_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al establecer stock: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función para sumar stock de categoría de manera atómica
CREATE OR REPLACE FUNCTION sumar_stock_categoria_atomico(
  p_categoria_id TEXT,
  p_item_nombre TEXT,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_stock_actual JSONB;
  v_stock_categoria JSONB;
  v_valor_actual INTEGER;
BEGIN
  -- Obtener el stock actual de manera atómica
  SELECT stock_data INTO v_stock_actual
  FROM stock_categorias
  WHERE id = 'stock_categorias_global'
  FOR UPDATE; -- Bloquea la fila para evitar condiciones de carrera
  
  -- Si no existe, crear estructura inicial
  IF v_stock_actual IS NULL THEN
    v_stock_actual := '{}'::JSONB;
  END IF;
  
  -- Obtener el stock de la categoría específica
  v_stock_categoria := COALESCE(v_stock_actual->p_categoria_id, '{}'::JSONB);
  
  -- Obtener el valor actual del item (o 0 si no existe)
  v_valor_actual := COALESCE((v_stock_categoria->>p_item_nombre)::INTEGER, 0);
  
  -- Sumar la cantidad
  v_stock_categoria := jsonb_set(
    v_stock_categoria,
    ARRAY[p_item_nombre],
    to_jsonb(v_valor_actual + p_cantidad)
  );
  
  -- Actualizar el stock de la categoría
  v_stock_actual := jsonb_set(
    v_stock_actual,
    ARRAY[p_categoria_id],
    v_stock_categoria
  );
  
  -- Guardar de manera atómica
  INSERT INTO stock_categorias (id, stock_data, updated_at)
  VALUES ('stock_categorias_global', v_stock_actual, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    stock_data = EXCLUDED.stock_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al sumar stock de categoría: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Función para restar stock de categoría de manera atómica
CREATE OR REPLACE FUNCTION restar_stock_categoria_atomico(
  p_categoria_id TEXT,
  p_item_nombre TEXT,
  p_cantidad INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_stock_actual JSONB;
  v_stock_categoria JSONB;
  v_valor_actual INTEGER;
  v_nuevo_valor INTEGER;
BEGIN
  -- Obtener el stock actual de manera atómica
  SELECT stock_data INTO v_stock_actual
  FROM stock_categorias
  WHERE id = 'stock_categorias_global'
  FOR UPDATE; -- Bloquea la fila para evitar condiciones de carrera
  
  -- Si no existe, crear estructura inicial
  IF v_stock_actual IS NULL THEN
    v_stock_actual := '{}'::JSONB;
  END IF;
  
  -- Obtener el stock de la categoría específica
  v_stock_categoria := COALESCE(v_stock_actual->p_categoria_id, '{}'::JSONB);
  
  -- Obtener el valor actual del item (o 0 si no existe)
  v_valor_actual := COALESCE((v_stock_categoria->>p_item_nombre)::INTEGER, 0);
  
  -- Calcular nuevo valor (no permitir valores negativos)
  v_nuevo_valor := GREATEST(0, v_valor_actual - p_cantidad);
  
  -- Actualizar el stock de la categoría
  v_stock_categoria := jsonb_set(
    v_stock_categoria,
    ARRAY[p_item_nombre],
    to_jsonb(v_nuevo_valor)
  );
  
  -- Actualizar el stock completo
  v_stock_actual := jsonb_set(
    v_stock_actual,
    ARRAY[p_categoria_id],
    v_stock_categoria
  );
  
  -- Guardar de manera atómica
  INSERT INTO stock_categorias (id, stock_data, updated_at)
  VALUES ('stock_categorias_global', v_stock_actual, NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    stock_data = EXCLUDED.stock_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al restar stock de categoría: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================
COMMENT ON FUNCTION sumar_stock_atomico IS 'Suma stock de manera atómica usando FOR UPDATE para evitar condiciones de carrera';
COMMENT ON FUNCTION restar_stock_atomico IS 'Resta stock de manera atómica usando FOR UPDATE para evitar condiciones de carrera';
COMMENT ON FUNCTION establecer_stock_atomico IS 'Establece stock de manera atómica usando FOR UPDATE para evitar condiciones de carrera';
COMMENT ON FUNCTION sumar_stock_categoria_atomico IS 'Suma stock de categoría de manera atómica usando FOR UPDATE para evitar condiciones de carrera';
COMMENT ON FUNCTION restar_stock_categoria_atomico IS 'Resta stock de categoría de manera atómica usando FOR UPDATE para evitar condiciones de carrera';

-- ============================================================================
-- OTORGAR PERMISOS NECESARIOS
-- ============================================================================
-- Estas funciones deben ser ejecutables por usuarios autenticados y anónimos
GRANT EXECUTE ON FUNCTION sumar_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restar_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION establecer_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sumar_stock_categoria_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restar_stock_categoria_atomico TO authenticated, anon;

