# Instrucciones para Configurar Supabase - Realtime Completo

Este documento contiene las instrucciones específicas para configurar Supabase y habilitar Realtime en todas las tablas necesarias.

## ⚠️ IMPORTANTE: Script SQL Completo Disponible

Se ha creado un archivo `supabase-migration-completa.sql` que contiene TODO el schema necesario, incluyendo:
- Todas las tablas con la estructura correcta
- El campo `estado` en la tabla `impresiones`
- Todas las políticas RLS
- Inicialización de registros globales
- Habilitación de Realtime

**Recomendación:** Usa el archivo `supabase-migration-completa.sql` para una configuración completa y sin errores.

## ⚠️ IMPORTANTE: Verificar y Corregir el Schema (Solo si ya tienes tablas creadas)

Si ya tienes tablas creadas en Supabase, necesitas verificar y corregir algunas tablas para que coincidan con el código implementado.

### 1. Verificar/Corregir Tabla `pins_operadores`

El schema actual tiene una estructura diferente. Necesitas cambiarla a:

```sql
-- Eliminar la tabla actual si existe
DROP TABLE IF EXISTS pins_operadores CASCADE;

-- Crear la tabla con la estructura correcta
CREATE TABLE IF NOT EXISTS pins_operadores (
  id TEXT PRIMARY KEY DEFAULT 'pins_global',
  pins_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE pins_operadores ENABLE ROW LEVEL SECURITY;

-- Política de acceso
CREATE POLICY "Allow all operations on pins_operadores" 
ON pins_operadores FOR ALL 
USING (true) WITH CHECK (true);
```

### 2. Verificar/Corregir Tabla `stock_minimos`

El schema actual tiene `minimos_data` pero el código usa campos separados. Necesitas:

```sql
-- Verificar la estructura actual
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'stock_minimos';

-- Si tiene solo minimos_data, actualizar a la estructura correcta:
ALTER TABLE stock_minimos 
DROP COLUMN IF EXISTS minimos_data;

ALTER TABLE stock_minimos 
ADD COLUMN IF NOT EXISTS materiales_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS categorias_data JSONB DEFAULT '{}';
```

O si prefieres recrear la tabla:

```sql
-- Eliminar la tabla actual si existe
DROP TABLE IF EXISTS stock_minimos CASCADE;

-- Crear la tabla con la estructura correcta
CREATE TABLE IF NOT EXISTS stock_minimos (
  id TEXT PRIMARY KEY DEFAULT 'minimos_global',
  materiales_data JSONB NOT NULL DEFAULT '{}',
  categorias_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE stock_minimos ENABLE ROW LEVEL SECURITY;

-- Política de acceso
CREATE POLICY "Allow all operations on stock_minimos" 
ON stock_minimos FOR ALL 
USING (true) WITH CHECK (true);
```

## Paso 0: Ejecutar Script Completo (RECOMENDADO)

Si es la primera vez que configuras Supabase o quieres empezar desde cero:

1. Ve al **SQL Editor** de Supabase
2. Copia y pega el contenido completo del archivo `supabase-migration-completa.sql`
3. Ejecuta el script completo
4. Verifica que no hay errores

Este script incluye:
- ✅ Todas las tablas con la estructura correcta
- ✅ El campo `estado` en impresiones
- ✅ Todas las políticas RLS
- ✅ Inicialización de registros globales
- ✅ Habilitación de Realtime

**Si ya ejecutaste este script completo, puedes saltar al Paso 6 (Verificar).**

## Paso 1: Habilitar Realtime en Todas las Tablas (Solo si no usaste el script completo)

Ve al **SQL Editor** de Supabase y ejecuta el siguiente script completo:

```sql
-- Habilitar Realtime para todas las tablas necesarias
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
```

### Si alguna tabla ya está agregada

Si ejecutas el script y alguna tabla ya está en la publicación, verás un error. Esto es normal. Puedes verificar qué tablas ya están habilitadas con:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

## Paso 2: Verificar que Realtime está Habilitado

### Opción A: Desde la Interfaz Web

1. Ve a tu proyecto en Supabase
2. Navega a **Database** > **Replication**
3. Verifica que todas las siguientes tablas tienen el toggle **"Enable Replication"** activado:
   - ✅ categorias
   - ✅ stock
   - ✅ stock_categorias
   - ✅ operadores_asignados
   - ✅ colores_maquinas
   - ✅ operadores_personalizados
   - ✅ operadores_eliminados
   - ✅ colores_personalizados
   - ✅ colores_eliminados
   - ✅ contador_etiquetas
   - ✅ pins_operadores
   - ✅ stock_minimos

### Opción B: Desde SQL

Ejecuta esta consulta para ver todas las tablas con Realtime habilitado:

```sql
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Deberías ver las 12 tablas listadas arriba.

## Paso 3: Verificar Políticas de Seguridad (RLS)

Asegúrate de que todas las tablas tienen políticas que permiten lectura y escritura. Ejecuta este script para verificar:

```sql
-- Verificar que todas las tablas tienen políticas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
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
  )
ORDER BY tablename, policyname;
```

Si alguna tabla no tiene políticas, créalas con:

```sql
-- Ejemplo para una tabla (repetir para cada una que falte)
CREATE POLICY "Allow all operations on [nombre_tabla]" 
ON [nombre_tabla] FOR ALL 
USING (true) WITH CHECK (true);
```

## Paso 4: Inicializar Datos Globales (Opcional pero Recomendado)

Para asegurar que las tablas con IDs globales existan, ejecuta:

```sql
-- Inicializar registros globales si no existen
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
```

## Paso 5: Verificar Variables de Entorno en Render

Asegúrate de que en Render tienes configuradas estas variables de entorno:

- `NEXT_PUBLIC_SUPABASE_URL` - URL de tu proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clave anónima de Supabase

Puedes encontrarlas en Supabase:
1. Ve a **Settings** > **API**
2. Copia **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copia **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Paso 6: Probar Realtime

### Desde la Consola del Navegador

1. Abre tu aplicación en dos navegadores diferentes (o dos pestañas)
2. Abre la consola del desarrollador (F12) en ambas
3. En una pestaña, realiza un cambio (por ejemplo, agrega una categoría)
4. En la otra pestaña, deberías ver en la consola mensajes como:
   ```
   Realtime: Categorías changed!
   ```

### Desde Supabase Dashboard

1. Ve a **Database** > **Table Editor**
2. Selecciona una tabla (por ejemplo, `categorias`)
3. Modifica un registro
4. En tu aplicación, deberías ver el cambio reflejado automáticamente

## Troubleshooting

### Error: "relation does not exist"

**Problema:** La tabla no existe en Supabase.

**Solución:** Ejecuta el script `supabase-schema.sql` completo en el SQL Editor.

### Error: "permission denied for publication supabase_realtime"

**Problema:** No tienes permisos para modificar la publicación.

**Solución:** Asegúrate de estar usando la cuenta de administrador del proyecto.

### Realtime no funciona

**Problema:** Los cambios no se sincronizan en tiempo real.

**Soluciones:**
1. Verifica que Realtime está habilitado en la tabla (Paso 2)
2. Verifica que las variables de entorno están configuradas correctamente
3. Revisa la consola del navegador para errores
4. Verifica que las políticas RLS permiten acceso

### Error: "column does not exist"

**Problema:** La estructura de la tabla no coincide con el código.

**Solución:** 
- Para `pins_operadores`: Usa el script del Paso 1.1
- Para `stock_minimos`: Usa el script del Paso 1.2

## Resumen de Tablas con Realtime

| Tabla | ID Global | Estructura |
|-------|-----------|------------|
| categorias | No (múltiples registros) | id, nombre, items |
| stock | stock_global | id, stock_data (JSONB) |
| stock_categorias | categorias_global | id, stock_data (JSONB) |
| operadores_asignados | asignaciones_global | id, asignaciones_data (JSONB) |
| colores_maquinas | colores_maquinas_global | id, colores_data (JSONB) |
| operadores_personalizados | No (múltiples registros) | id, nombre |
| operadores_eliminados | No (múltiples registros) | id, nombre |
| colores_personalizados | colores_global | id, colores_data (JSONB) |
| colores_eliminados | eliminados_global | id, eliminados_data (JSONB) |
| contador_etiquetas | contador_global | id, chicas, grandes |
| pins_operadores | pins_global | id, pins_data (JSONB) |
| stock_minimos | minimos_global | id, materiales_data (JSONB), categorias_data (JSONB) |

## Checklist Final

Antes de considerar que todo está configurado:

- [ ] Tabla `pins_operadores` tiene la estructura correcta (id, pins_data)
- [ ] Tabla `stock_minimos` tiene materiales_data y categorias_data
- [ ] Todas las 12 tablas tienen Realtime habilitado
- [ ] Todas las tablas tienen políticas RLS configuradas
- [ ] Registros globales inicializados (Paso 4)
- [ ] Variables de entorno configuradas en Render
- [ ] Probado Realtime desde dos navegadores diferentes

¡Listo! Con estos pasos, Realtime debería funcionar perfectamente en toda la aplicación.

