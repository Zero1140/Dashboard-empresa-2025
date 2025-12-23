# Configuración de Supabase - Valores Específicos

## 🔑 Credenciales de Supabase

**Project URL:**
```
https://rybokbjrbugvggprnith.supabase.co
```

**Publishable Key (anon key):**
```
sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

⚠️ **IMPORTANTE**: La Secret Key (`sb_secret_...`) NO debe usarse en el cliente. Solo se usa en el servidor.

## 📝 Variables de Entorno para Render

Configura estas variables en Render (Environment):

```
NEXT_PUBLIC_SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

## ✅ Checklist de Configuración

### 1. ✅ Proyecto Creado
- [x] Proyecto creado en Supabase
- [x] URL obtenida: `https://rybokbjrbugvggprnith.supabase.co`
- [x] Publishable key obtenida

### 2. ⏳ Crear Tablas en Supabase
- [ ] Abrir SQL Editor en Supabase Dashboard
- [ ] Ejecutar el script completo de `supabase-schema.sql`
- [ ] Verificar que todas las tablas se crearon correctamente

### 3. ⏳ Configurar Variables en Render
- [ ] Ir a Render Dashboard > Tu Servicio > Environment
- [ ] Agregar `NEXT_PUBLIC_SUPABASE_URL` con el valor correcto
- [ ] Agregar `NEXT_PUBLIC_SUPABASE_ANON_KEY` con el valor correcto
- [ ] Guardar y esperar el reinicio automático

### 4. ⏳ Verificar Funcionamiento
- [ ] Abrir la aplicación desplegada
- [ ] Abrir consola del navegador (F12)
- [ ] Intentar crear una impresión
- [ ] Verificar en Supabase Dashboard > Table Editor que los datos se guardaron

## 🔍 Verificación Rápida

Para verificar que Supabase está funcionando, abre la consola del navegador y ejecuta:

```javascript
// Verificar conexión
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configurada' : 'No configurada');
```

O desde el código, puedes verificar en `app/utils/supabase.ts` que `isSupabaseConfigured()` retorne `true`.

## 📊 Tablas que se Crearán

El script SQL creará las siguientes tablas:

1. ✅ `impresiones` - Historial de impresiones
2. ✅ `cambios_operador` - Historial de cambios de operador
3. ✅ `cambios_color` - Historial de cambios de color
4. ✅ `stock` - Stock de materiales
5. ✅ `operadores_personalizados` - Operadores agregados manualmente
6. ✅ `operadores_eliminados` - Operadores marcados como eliminados
7. ✅ `pins_operadores` - PINs de seguridad de operadores
8. ✅ `stock_minimos` - Stock mínimos configurados
9. ✅ `stock_categorias` - Stock por categorías
10. ✅ `categorias` - Categorías de productos
11. ✅ `colores_personalizados` - Colores agregados manualmente
12. ✅ `colores_eliminados` - Colores marcados como eliminados
13. ✅ `operadores_asignados` - Operadores asignados a cada máquina
14. ✅ `colores_maquinas` - Colores seleccionados por máquina
15. ✅ `contador_etiquetas` - Contador global de etiquetas

## 🚀 Siguiente Paso

**Ejecuta el script SQL en Supabase ahora:**

1. Ve a tu proyecto en Supabase Dashboard
2. Click en "SQL Editor" (menú lateral izquierdo)
3. Click en "New Query"
4. Copia TODO el contenido del archivo `supabase-schema.sql`
5. Pégalo en el editor
6. Click en "Run" o presiona Ctrl+Enter
7. Espera a que termine (debería mostrar "Success")

Después de esto, configura las variables de entorno en Render y estarás listo.

