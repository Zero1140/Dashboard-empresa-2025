# Guía para Aplicar Cambios en Supabase

## 📋 Pasos para Aplicar las Funciones Atómicas de Stock

### Paso 1: Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. En el menú lateral izquierdo, haz clic en **"SQL Editor"**
4. Haz clic en **"New query"** (Nueva consulta)

### Paso 2: Ejecutar el Script de Funciones Atómicas

1. Abre el archivo `supabase-funciones-atomicas-stock.sql` en tu editor de código
2. Copia **TODO el contenido** del archivo
3. Pega el contenido en el SQL Editor de Supabase
4. Haz clic en **"Run"** (Ejecutar) o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Paso 3: Verificar que las Funciones se Crearon Correctamente

Ejecuta esta consulta para verificar:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'sumar_stock_atomico',
    'restar_stock_atomico',
    'establecer_stock_atomico',
    'sumar_stock_categoria_atomico',
    'restar_stock_categoria_atomico'
  )
ORDER BY routine_name;
```

**Resultado esperado:** Debes ver 5 funciones listadas.

### Paso 4: Verificar que Realtime Está Habilitado

Ejecuta esta consulta para verificar las publicaciones de Realtime:

```sql
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Resultado esperado:** Debes ver estas tablas:
- `categorias`
- `stock`
- `stock_categorias`
- `operadores_asignados`
- `colores_maquinas`
- `operadores_personalizados`
- `operadores_eliminados`
- `colores_personalizados`
- `colores_eliminados`
- `stock_minimos`
- `contador_etiquetas`
- `pins_operadores`

### Paso 5: Si Falta Alguna Tabla en Realtime

Si alguna tabla no aparece en la lista anterior, ejecuta este comando (reemplaza `nombre_tabla`):

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nombre_tabla;
```

Por ejemplo:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE stock;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_categorias;
-- Repite para cada tabla que falte
```

## ✅ Verificación de Funcionamiento

### 1. Verificar Funciones Atómicas

Abre la consola del navegador (F12) y busca mensajes como:
- ✅ "Función atómica no disponible, usando método tradicional" - Esto es normal si las funciones aún no están creadas
- ❌ Si NO ves este mensaje después de crear las funciones, significa que están funcionando correctamente

### 2. Verificar Sincronización en Tiempo Real

**Prueba desde dos navegadores/computadoras diferentes:**

1. **Desde Argentina:**
   - Abre el dashboard en una computadora/navegador
   - Cambia algún stock o categoría
   - Observa la consola del navegador (F12) - deberías ver mensajes de Realtime

2. **Desde Portugal (u otra ubicación):**
   - Abre el dashboard en otra computadora/navegador
   - **SIN hacer nada**, deberías ver los cambios reflejarse automáticamente
   - Los cambios aparecen en tiempo real (1-2 segundos)

### 3. Verificar Rate Limiting

1. Intenta imprimir desde una máquina
2. Intenta imprimir de nuevo inmediatamente - debería funcionar
3. Intenta imprimir una tercera vez - debería mostrar un mensaje de límite alcanzado

### 4. Verificar Teclado Numérico

1. Intenta cambiar un operador que tenga PIN configurado
2. Deberías ver el teclado numérico aparecer automáticamente
3. Prueba ingresar el PIN usando el teclado en pantalla

## 🔧 Solución de Problemas

### Problema: Las funciones atómicas no funcionan

**Solución:**
1. Verifica que ejecutaste el script completo
2. Verifica que no hay errores en el SQL Editor
3. Revisa los permisos de las funciones:
```sql
GRANT EXECUTE ON FUNCTION sumar_stock_atomico TO authenticated;
GRANT EXECUTE ON FUNCTION restar_stock_atomico TO authenticated;
GRANT EXECUTE ON FUNCTION establecer_stock_atomico TO authenticated;
GRANT EXECUTE ON FUNCTION sumar_stock_categoria_atomico TO authenticated;
GRANT EXECUTE ON FUNCTION restar_stock_categoria_atomico TO authenticated;
```

### Problema: No veo cambios en tiempo real

**Solución:**
1. Verifica que Realtime está habilitado (Paso 4)
2. Verifica que las variables de entorno están configuradas en Render:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Abre la consola del navegador y busca errores de conexión
4. Verifica que no hay bloqueadores de anuncios que interfieran con WebSockets

### Problema: El stock no se actualiza correctamente

**Solución:**
1. Verifica que las funciones atómicas están creadas
2. Revisa la consola del navegador para ver si hay errores
3. Verifica que Supabase está configurado correctamente
4. Si las funciones atómicas fallan, el sistema usa el método tradicional como fallback

## 📝 Checklist Final

- [ ] Script de funciones atómicas ejecutado sin errores
- [ ] 5 funciones creadas y verificadas
- [ ] Realtime habilitado en todas las tablas necesarias
- [ ] Variables de entorno configuradas en Render
- [ ] Prueba de sincronización en tiempo real exitosa
- [ ] Rate limiting funcionando
- [ ] Teclado numérico funcionando
- [ ] Muestra de color visible en selects

## 🎯 Resultado Esperado

Después de completar estos pasos:
- ✅ Todas las operaciones de stock son atómicas (sin condiciones de carrera)
- ✅ Los cambios se sincronizan en tiempo real entre todas las ubicaciones
- ✅ El sistema funciona correctamente desde Argentina y Portugal simultáneamente
- ✅ No hay pérdida de datos ni inconsistencias


