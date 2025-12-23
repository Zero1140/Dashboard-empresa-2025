# ⚙️ Configuración Manual en Render

Render está intentando usar `pnpm` pero el proyecto usa `npm`. Sigue estos pasos para corregirlo:

## 🔧 Pasos para Corregir en Render

### 1. Ve a tu Servicio en Render Dashboard

1. Inicia sesión en [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio web (Dashboard-empresa-2025)

### 2. Configura el Build Command

1. Ve a **Settings** → **Build & Deploy**
2. Busca la sección **Build Command**
3. **BORRA** el comando actual que dice:
   ```
   pnpm install --frozen-lockfile; pnpm run build
   ```
4. **REEMPLAZA** con:
   ```
   npm install && npm run build
   ```

### 3. Configura el Start Command

1. En la misma sección, busca **Start Command**
2. Asegúrate de que diga:
   ```
   npm start
   ```

### 4. Verifica la Versión de Node

1. En **Settings** → **Environment**
2. Verifica que **Node Version** esté configurado como `22.16.0` o superior
3. Si no está configurado, agrégalo como variable de entorno:
   - Key: `NODE_VERSION`
   - Value: `22.16.0`

### 5. Guarda y Redespliega

1. Haz clic en **Save Changes**
2. Ve a **Manual Deploy** → **Deploy latest commit**
3. O simplemente espera el próximo despliegue automático

## ✅ Verificación

Después de hacer estos cambios, el build debería:
- ✅ Usar `npm` en lugar de `pnpm`
- ✅ Instalar dependencias correctamente
- ✅ Construir el proyecto sin errores

## 📝 Resumen de Comandos Correctos

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Node Version**: `22.16.0` o superior

## 🐛 Si Aún Falla

Si después de estos cambios sigue fallando:

1. Verifica que el archivo `package-lock.json` esté presente en el repositorio
2. Verifica que no haya un archivo `pnpm-lock.yaml` en el repositorio (si existe, elimínalo)
3. Revisa los logs de build en Render para ver el error específico

