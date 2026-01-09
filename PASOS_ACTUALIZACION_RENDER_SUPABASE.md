# Pasos para Actualizar Render y Supabase

## 📋 Resumen

Necesitamos hacer 2 cosas:
1. **Supabase**: Agregar el campo `estado` a la tabla `impresiones`
2. **Render**: Subir los cambios del código (se desplegará automáticamente)

---

## 🔵 PASO 1: Actualizar Supabase

### 1.1. Abrir Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto: **rybokbjrbugvggprnith** (o el nombre que tenga)

### 1.2. Ejecutar Script SQL

1. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (ícono de base de datos)
2. Haz clic en **"New Query"** (botón verde en la parte superior)
3. **Copia TODO** el contenido del archivo `web/supabase-add-estado.sql`:

```sql
-- Agregar campo 'estado' a la tabla impresiones
-- Ejecutar este script en el SQL Editor de Supabase después de crear las tablas básicas

-- Agregar columna estado si no existe
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error'));

-- Crear índice para mejorar consultas de impresiones pendientes
CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

-- Actualizar todas las impresiones existentes a 'impresa' (para que no se reimpriman)
UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;
```

4. **Pega** el código en el editor SQL
5. Haz clic en **"Run"** (botón en la esquina inferior derecha) o presiona **Ctrl+Enter** (Windows) / **Cmd+Enter** (Mac)
6. Espera unos segundos hasta que veas el mensaje **"Success"** en verde

### 1.3. Verificar que funcionó

1. En el menú lateral, haz clic en **"Table Editor"**
2. Selecciona la tabla **"impresiones"**
3. Verifica que la tabla tenga una columna llamada **"estado"**
4. Si ves la columna, ¡perfecto! ✅

---

## 🟢 PASO 2: Actualizar Render (Subir Código)

### Opción A: Si usas GitHub (Recomendado - Despliegue Automático)

Si tu código ya está conectado a GitHub y Render está configurado para desplegar automáticamente:

#### 2.1. Subir cambios a GitHub

1. Abre una terminal en la carpeta del proyecto:
   ```bash
   cd C:\Users\guill\Desktop\dashboardgst3d
   ```

2. Verifica los cambios:
   ```bash
   git status
   ```

3. Agrega todos los archivos modificados:
   ```bash
   git add .
   ```

4. Haz commit de los cambios:
   ```bash
   git commit -m "Agregar sistema de impresión física con estado pendiente/impresa"
   ```

5. Sube los cambios a GitHub:
   ```bash
   git push
   ```

6. **Render detectará automáticamente** el cambio y comenzará a desplegar
7. Ve a tu dashboard de Render y verás el proceso de despliegue
8. Espera 2-3 minutos hasta que veas **"Live"** en verde

#### 2.2. Verificar el despliegue

1. Ve a tu servicio en Render Dashboard
2. Ve a la pestaña **"Events"** o **"Logs"**
3. Busca mensajes como:
   - ✅ "Build successful"
   - ✅ "Deploy successful"
   - ✅ "Service is live"

### Opción B: Si NO usas GitHub (Despliegue Manual)

Si no tienes GitHub configurado:

#### 2.1. Empacar el código

1. Crea un archivo ZIP con toda la carpeta `web`
2. Asegúrate de incluir todos los archivos

#### 2.2. Subir manualmente a Render

1. Ve a tu servicio en Render Dashboard
2. Busca la opción de **"Manual Deploy"** o **"Upload"**
3. Sube el archivo ZIP
4. Render procesará el despliegue

---

## 🟡 PASO 3: Verificar Variables de Entorno en Render

Asegúrate de que las variables de entorno estén configuradas:

### 3.1. Ir a Configuración de Render

1. En Render Dashboard, ve a tu servicio web
2. En el menú lateral, haz clic en **"Environment"**

### 3.2. Verificar Variables

Debes tener estas variables configuradas:

```
NEXT_PUBLIC_SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

### 3.3. Si NO están configuradas

1. Haz clic en **"Add Environment Variable"**
2. Agrega cada variable:
   - **Key**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: `https://rybokbjrbugvggprnith.supabase.co`
3. Repite para la segunda variable
4. Haz clic en **"Save Changes"**
5. Render reiniciará automáticamente el servicio

---

## ✅ PASO 4: Verificar que Todo Funciona

### 4.1. Probar en la Web

1. Ve a tu aplicación desplegada en Render (ej: `https://dashboard-empresa-2025.onrender.com/`)
2. Abre la consola del navegador (presiona **F12**)
3. Ve a la pestaña **"Console"**
4. Haz una prueba:
   - Selecciona una máquina
   - Selecciona materiales y colores
   - Haz clic en **"Imprimir Etiquetas"**

### 4.2. Verificar en Supabase

1. Ve a Supabase Dashboard
2. Ve a **"Table Editor"** > **"impresiones"**
3. Deberías ver una nueva fila con:
   - `estado` = `'pendiente'` ✅
   - Los demás datos de la impresión

### 4.3. Verificar que el Estado se Guarda

1. En la tabla `impresiones` en Supabase
2. Busca la impresión que acabas de crear
3. Verifica que la columna `estado` tenga el valor `'pendiente'`
4. Si es así, ¡todo está funcionando! ✅

---

## 🐛 Solución de Problemas

### ❌ Error: "column estado does not exist"

**Solución**: No ejecutaste el script SQL. Vuelve al **PASO 1** y ejecuta el script.

### ❌ Error: Las impresiones no se guardan con estado='pendiente'

**Solución**: 
1. Verifica que el código esté desplegado en Render
2. Revisa los logs de Render para ver si hay errores
3. Verifica que las variables de entorno estén configuradas

### ❌ Error: Render no despliega automáticamente

**Solución**:
1. Ve a Render Dashboard > Tu Servicio > Settings
2. Verifica que "Auto-Deploy" esté habilitado
3. Verifica que esté conectado al repositorio correcto de GitHub

### ❌ Error: La aplicación no carga en Render

**Solución**:
1. Ve a Render Dashboard > Tu Servicio > Logs
2. Busca errores en los logs
3. Verifica que `package.json` tenga todas las dependencias necesarias

---

## 📝 Checklist Final

Marca cada paso cuando lo completes:

### Supabase
- [ ] Ejecuté el script SQL en Supabase
- [ ] Verifiqué que la columna `estado` existe en la tabla `impresiones`
- [ ] Verifiqué que las impresiones existentes tienen `estado='impresa'`

### Render
- [ ] Subí los cambios a GitHub (o desplegué manualmente)
- [ ] Render desplegó correctamente (veo "Live" en verde)
- [ ] Variables de entorno están configuradas
- [ ] La aplicación carga correctamente en el navegador

### Verificación
- [ ] Probé hacer una impresión desde la web
- [ ] Verifiqué en Supabase que se guardó con `estado='pendiente'`
- [ ] No hay errores en la consola del navegador

---

## 🎉 ¡Listo!

Una vez completados todos los pasos:

1. ✅ Supabase está actualizado con el campo `estado`
2. ✅ Render tiene el código actualizado
3. ✅ Las impresiones se guardan con `estado='pendiente'`
4. ✅ El servicio Python puede leerlas e imprimirlas

**Siguiente paso**: Configurar el servicio Python en la máquina donde está la impresora (ver `README_IMPRESION_SERVICIO.md`)

---

## 📞 ¿Necesitas Ayuda?

Si tienes problemas:
1. Revisa los logs de Render
2. Revisa la consola del navegador (F12)
3. Verifica que todos los pasos estén completados






