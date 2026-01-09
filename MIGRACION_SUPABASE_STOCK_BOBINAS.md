# 🔄 Migración de Supabase: Corrección Stock de Bobinas

## 📋 Resumen de Cambios

Después de la corrección del sistema de stock de bobinas, **NO se requieren cambios en el esquema de Supabase**. Sin embargo, **SÍ se recomienda una migración de datos** para consolidar el stock duplicado.

## ✅ Cambios en la Aplicación

### **Antes (Incorrecto):**
- Se sumaba stock a `CRYSTAL` y `CRYSTAL_GRANDE` por separado
- Esto creaba duplicidad en el stock

### **Ahora (Correcto):**
- Se suma stock solo al color base (sin `_GRANDE`)
- Ejemplo: Solo se suma a `CRYSTAL`, no a `CRYSTAL_GRANDE`

## 🔍 Verificación Necesaria en Supabase

### **1. Verificar Stock Duplicado**

Ejecuta esta consulta en Supabase SQL Editor para verificar si hay stock duplicado:

```sql
-- Verificar stock de colores con _GRANDE que deberían estar en el color base
SELECT 
  tipo,
  color,
  stock_value
FROM (
  SELECT 
    jsonb_object_keys(stock_data) as tipo,
    jsonb_object_keys(stock_data->jsonb_object_keys(stock_data)) as color,
    (stock_data->jsonb_object_keys(stock_data)->>jsonb_object_keys(stock_data->jsonb_object_keys(stock_data)))::integer as stock_value
  FROM stock
  WHERE id = 'stock_global'
) subquery
WHERE color LIKE '%_GRANDE'
ORDER BY tipo, color;
```

### **2. Verificar Stock Total por Color Base**

```sql
-- Ver stock actual por tipo y color (incluyendo _GRANDE)
SELECT 
  tipo,
  color,
  stock_value
FROM (
  SELECT 
    jsonb_object_keys(stock_data) as tipo,
    jsonb_object_keys(stock_data->jsonb_object_keys(stock_data)) as color,
    (stock_data->jsonb_object_keys(stock_data)->>jsonb_object_keys(stock_data->jsonb_object_keys(stock_data)))::integer as stock_value
  FROM stock
  WHERE id = 'stock_global'
) subquery
ORDER BY tipo, color;
```

## 🔧 Migración de Datos (Opcional pero Recomendado)

Si encuentras stock duplicado (colores con `_GRANDE` que tienen stock), puedes consolidarlo con este script:

```sql
-- Script para consolidar stock de colores _GRANDE al color base
DO $$
DECLARE
  stock_actual JSONB;
  tipo_actual TEXT;
  color_actual TEXT;
  color_base TEXT;
  stock_grande INTEGER;
  stock_base INTEGER;
  stock_total INTEGER;
BEGIN
  -- Obtener stock actual
  SELECT stock_data INTO stock_actual
  FROM stock
  WHERE id = 'stock_global'
  FOR UPDATE;
  
  -- Iterar sobre cada tipo de material
  FOR tipo_actual IN SELECT jsonb_object_keys(stock_actual)
  LOOP
    -- Iterar sobre cada color en el tipo
    FOR color_actual IN SELECT jsonb_object_keys(stock_actual->tipo_actual)
    LOOP
      -- Si el color termina en _GRANDE, consolidar con el color base
      IF color_actual LIKE '%_GRANDE' THEN
        color_base := REPLACE(color_actual, '_GRANDE', '');
        
        -- Obtener stock del color grande
        stock_grande := COALESCE((stock_actual->tipo_actual->>color_actual)::integer, 0);
        
        -- Obtener stock del color base (si existe)
        stock_base := COALESCE((stock_actual->tipo_actual->>color_base)::integer, 0);
        
        -- Sumar ambos stocks
        stock_total := stock_base + stock_grande;
        
        -- Actualizar stock del color base
        stock_actual := jsonb_set(
          stock_actual,
          ARRAY[tipo_actual, color_base],
          to_jsonb(stock_total),
          true
        );
        
        -- Eliminar el color _GRANDE
        stock_actual := stock_actual #- ARRAY[tipo_actual, color_actual];
        
        RAISE NOTICE 'Consolidado: % % -> % (stock: % + % = %)', 
          tipo_actual, color_actual, color_base, stock_base, stock_grande, stock_total;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Guardar stock consolidado
  UPDATE stock
  SET stock_data = stock_actual,
      updated_at = NOW()
  WHERE id = 'stock_global';
  
  RAISE NOTICE 'Migración completada. Stock consolidado.';
END $$;
```

## ⚠️ Advertencias

1. **Haz un backup antes de ejecutar la migración:**
   ```sql
   -- Crear backup del stock actual
   CREATE TABLE stock_backup AS 
   SELECT * FROM stock WHERE id = 'stock_global';
   ```

2. **Verifica los resultados antes de confirmar:**
   - Ejecuta primero las consultas de verificación
   - Revisa los valores que se van a consolidar
   - Asegúrate de que los cálculos sean correctos

3. **Si algo sale mal, puedes restaurar:**
   ```sql
   -- Restaurar desde backup (si es necesario)
   UPDATE stock
   SET stock_data = (SELECT stock_data FROM stock_backup),
       updated_at = NOW()
   WHERE id = 'stock_global';
   ```

## ✅ Pasos Recomendados

1. **Ejecutar consultas de verificación** para ver si hay stock duplicado
2. **Crear backup** de la tabla stock
3. **Ejecutar script de migración** (si hay stock duplicado)
4. **Verificar resultados** después de la migración
5. **Confirmar que el sistema funciona correctamente**

## 📝 Notas Importantes

- **No se requieren cambios en el esquema** (tablas, columnas, índices)
- **Las funciones SQL atómicas no necesitan cambios** (siguen funcionando igual)
- **La migración es opcional** pero recomendada si hay stock duplicado
- **El sistema funcionará correctamente** incluso sin la migración (solo sumará al color base desde ahora)

## 🎯 Conclusión

**Cambios necesarios en Supabase:**
- ✅ **Ninguno en el esquema** (estructura de tablas)
- ⚠️ **Migración de datos opcional** (consolidar stock duplicado si existe)
- ✅ **Verificación recomendada** (consultar stock actual)

El sistema funcionará correctamente sin la migración, pero la migración ayudará a limpiar datos históricos duplicados.


