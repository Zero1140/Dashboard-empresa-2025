# ✅ Verificación Completa del Sistema

## 📋 Checklist de Verificación

### 1. ✅ Funciones Atómicas de Stock

**Ubicación:** Supabase SQL Editor

**Pasos:**
1. Ve a Supabase Dashboard → SQL Editor
2. Ejecuta el archivo `supabase-funciones-atomicas-stock.sql`
3. Verifica que no hay errores

**Verificación:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%atomico%'
ORDER BY routine_name;
```

**Resultado esperado:** 5 funciones
- `establecer_stock_atomico`
- `restar_stock_atomico`
- `restar_stock_categoria_atomico`
- `sumar_stock_atomico`
- `sumar_stock_categoria_atomico`

### 2. ✅ Realtime Habilitado

**Ubicación:** Supabase Dashboard → Database → Replication

**Verificación SQL:**
```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

**Resultado esperado:** 12 tablas
- `categorias`
- `colores_eliminados`
- `colores_maquinas`
- `colores_personalizados`
- `contador_etiquetas`
- `operadores_asignados`
- `operadores_eliminados`
- `operadores_personalizados`
- `pins_operadores`
- `stock`
- `stock_categorias`
- `stock_minimos`

### 3. ✅ Variables de Entorno en Render

**Ubicación:** Render Dashboard → Tu Servicio → Environment

**Variables requeridas:**
- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase

**Cómo obtenerlas:**
1. Ve a Supabase Dashboard → Settings → API
2. Copia "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copia "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. ✅ Sincronización en Tiempo Real

**Prueba desde dos ubicaciones diferentes:**

#### Desde Argentina:
1. Abre el dashboard en un navegador
2. Abre la consola del navegador (F12)
3. Realiza un cambio (ej: modifica stock, agrega categoría)
4. Observa la consola - deberías ver mensajes de Realtime

#### Desde Portugal (u otra ubicación):
1. Abre el dashboard en otro navegador/computadora
2. **SIN hacer nada**, espera 1-2 segundos
3. Los cambios deberían aparecer automáticamente
4. Verifica en la consola que recibes actualizaciones

**Mensajes esperados en consola:**
```
Realtime: Stock changed!
Realtime: Categorías changed!
```

### 5. ✅ Funciones Atómicas Funcionando

**Prueba:**
1. Abre la consola del navegador (F12)
2. Realiza una operación de stock (imprimir etiquetas)
3. **NO deberías ver** el mensaje: "Función atómica no disponible"
4. Si ves ese mensaje, significa que las funciones no están creadas o no tienen permisos

**Solución si ves el mensaje:**
```sql
-- Verificar que las funciones existen
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%atomico%';

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION sumar_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restar_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION establecer_stock_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sumar_stock_categoria_atomico TO authenticated, anon;
GRANT EXECUTE ON FUNCTION restar_stock_categoria_atomico TO authenticated, anon;
```

### 6. ✅ Rate Limiting

**Prueba:**
1. Intenta imprimir desde una máquina (debería funcionar)
2. Intenta imprimir de nuevo inmediatamente (debería funcionar)
3. Intenta imprimir una tercera vez (debería mostrar mensaje de límite)

**Mensaje esperado:**
```
⚠️ Límite de impresiones alcanzado para la máquina X.
Solo se permiten 2 impresiones por hora por máquina.
Podrás imprimir nuevamente en X minutos.
```

### 7. ✅ Teclado Numérico

**Prueba:**
1. Intenta cambiar un operador que tenga PIN configurado
2. Deberías ver el teclado numérico aparecer automáticamente
3. Prueba ingresar el PIN usando el teclado en pantalla
4. Verifica que funciona correctamente

### 8. ✅ Muestra Visual de Color

**Prueba:**
1. Ve a la página de máquinas
2. Selecciona un color en los selects de etiquetas
3. Deberías ver un círculo de color al lado del select
4. El color debería coincidir con el color seleccionado

## 🔍 Verificación de Errores

### Consola del Navegador

**Abre la consola (F12) y verifica:**

✅ **Sin errores:**
- No hay errores en rojo
- No hay warnings sobre funciones atómicas
- No hay errores de conexión a Supabase

❌ **Si hay errores:**
- Revisa las variables de entorno en Render
- Verifica que Supabase está configurado correctamente
- Revisa que las funciones atómicas están creadas

### Logs de Render

**Ubicación:** Render Dashboard → Tu Servicio → Logs

**Verifica:**
- No hay errores de build
- No hay errores de runtime
- La aplicación se despliega correctamente

## 📊 Prueba de Sincronización Completa

### Escenario de Prueba:

1. **Desde Argentina:**
   - Abre el dashboard
   - Agrega una nueva categoría
   - Modifica el stock de un color
   - Asigna un operador a una máquina

2. **Desde Portugal (simultáneamente):**
   - Abre el dashboard en otra computadora/navegador
   - **SIN hacer nada**, espera 1-2 segundos
   - Deberías ver:
     - ✅ La nueva categoría aparecer
     - ✅ El stock actualizado
     - ✅ El operador asignado

3. **Desde Portugal (hacer cambio):**
   - Modifica el stock de otro color
   - Cambia el color de una máquina

4. **Desde Argentina:**
   - **SIN hacer nada**, espera 1-2 segundos
   - Deberías ver los cambios reflejados automáticamente

## ✅ Resultado Final Esperado

Después de completar todas las verificaciones:

- ✅ Todas las operaciones de stock son atómicas
- ✅ Los cambios se sincronizan en tiempo real (1-2 segundos)
- ✅ El sistema funciona desde Argentina y Portugal simultáneamente
- ✅ No hay pérdida de datos
- ✅ No hay inconsistencias
- ✅ Rate limiting funciona correctamente
- ✅ Teclado numérico funciona
- ✅ Muestra visual de color funciona

## 🆘 Si Algo No Funciona

### Problema: No veo cambios en tiempo real

**Solución:**
1. Verifica que Realtime está habilitado (Paso 2)
2. Verifica las variables de entorno en Render
3. Revisa la consola del navegador para errores
4. Verifica que no hay bloqueadores de anuncios

### Problema: Las funciones atómicas no funcionan

**Solución:**
1. Ejecuta el script de funciones atómicas nuevamente
2. Verifica los permisos (Paso 5)
3. Revisa la consola del navegador para errores específicos

### Problema: El stock no se actualiza

**Solución:**
1. Verifica que Supabase está configurado
2. Revisa la consola del navegador
3. Verifica que las funciones atómicas están creadas
4. Si las funciones fallan, el sistema usa el método tradicional como fallback


