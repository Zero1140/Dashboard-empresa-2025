# ✅ Solución al Error de Deployment en Render

## 🔴 Problema Encontrado

El error ocurre porque **Render está buscando `package.json` en una ubicación incorrecta**:

```
npm error path /opt/render/project/src/package.json
```

Tu `package.json` está en la raíz (`/opt/render/project/package.json`), no en `/src/`.

## ✅ Cambios Realizados

### 1. Actualizado `render.yaml`

```yaml
buildCommand: npm install && npm run build  # Antes: npm run build
```

Ahora instala las dependencias explícitamente antes de compilar.

## 🚨 ACCIÓN REQUERIDA - Pasos a Seguir

### Paso 1: Configurar Render Dashboard

> [!IMPORTANT]
> Este es el paso MÁS IMPORTANTE

1. Ve a https://dashboard.render.com
2. Selecciona tu servicio **"dashboard-gst3d"**
3. Ve a **Settings** → **Build & Deploy**
4. Verifica estas configuraciones:

   | Configuración | Valor Correcto |
   |--------------|----------------|
   | **Root Directory** | (vacío) o `/` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm start` |

5. Si cambiaste algo, haz clic en **"Save Changes"**

### Paso 2: Configurar Variables de Entorno

En Render Dashboard → **Environment**:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu clave anónima |

### Paso 3: Subir Cambios a GitHub

Desde PowerShell o CMD:

```powershell
cd C:\Users\guill\Desktop\dashboardgst3d

git add render.yaml

git commit -m "Fix: Corregir buildCommand en render.yaml para deployment"

git push origin main
```

### Paso 4: Desplegar en Render

**Opción A: Automático** (si tienes Auto-Deploy habilitado)
- Render detectará el push y desplegará automáticamente

**Opción B: Manual**
1. En Render Dashboard → Tu servicio
2. Clic en **"Manual Deploy"**
3. Selecciona **"Deploy latest commit"**

### Paso 5: Verificar Logs

1. Ve a la pestaña **"Logs"** en Render
2. Observa el proceso:
   ```
   ==> Running build command 'npm install && npm run build'...
   npm install
   added 312 packages...
   npm run build
   ✓ Compiled successfully
   ```

## 🎯 Verificación Final

Una vez que el deploy sea exitoso:

1. Abre tu app: `https://dashboard-gst3d.onrender.com`
2. Verifica que funcione correctamente
3. Prueba las funcionalidades principales

## ❓ Si Aún Falla

Si después de estos pasos sigue fallando con el mismo error:

1. **Verifica Root Directory**:
   - En Render Settings → Build & Deploy
   - Debe estar completamente vacío o ser `/`
   - NO debe ser `/src` ni ninguna subcarpeta

2. **Verifica la Rama**:
   - Settings → Build & Deploy → Branch
   - Debe ser `main` (o la rama que uses)

3. **Limpia caché de Build**:
   - Settings → "Clear build cache & deploy"

## 📝 Resumen

- ✅ `render.yaml` actualizado
- ⚠️ **CRÍTICO**: Verifica "Root Directory" en Render
- ⚠️ Configura variables de entorno de Supabase
- ⚠️ Haz push a GitHub
- ⚠️ Despliega en Render

---

**Siguiente paso:** Sigue los pasos de la sección "ACCIÓN REQUERIDA" en orden.
