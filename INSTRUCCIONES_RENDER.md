# 🚨 INSTRUCCIONES URGENTES PARA RENDER

## ⚠️ PROBLEMA ACTUAL

Render está usando `pnpm` pero el proyecto usa `npm`. **DEBES cambiar esto manualmente en Render Dashboard**.

## 📋 PASOS OBLIGATORIOS (Hazlo AHORA)

### Paso 1: Ve a Render Dashboard
1. Abre: https://dashboard.render.com
2. Inicia sesión
3. Haz clic en tu servicio: **Dashboard-empresa-2025**

### Paso 2: Ve a Settings
1. En el menú lateral izquierdo, haz clic en **Settings**
2. Desplázate hasta la sección **Build & Deploy**

### Paso 3: CAMBIA el Build Command
1. Busca el campo **Build Command**
2. **BORRA COMPLETAMENTE** este texto:
   ```
   pnpm install --frozen-lockfile; pnpm run build
   ```
3. **ESCRIBE** este texto exactamente:
   ```
   npm install && npm run build
   ```

### Paso 4: Verifica Start Command
1. Busca el campo **Start Command**
2. Debe decir exactamente:
   ```
   npm start
   ```
3. Si dice algo diferente, cámbialo a `npm start`

### Paso 5: GUARDA los cambios
1. Haz clic en el botón **Save Changes** (abajo de la página)
2. Espera a que se guarde

### Paso 6: REDESPLIEGA
1. Ve a la pestaña **Manual Deploy** (en el menú superior)
2. Haz clic en **Deploy latest commit**
3. O simplemente espera el próximo despliegue automático

## ✅ VERIFICACIÓN

Después de hacer estos cambios, en los logs de build deberías ver:
- ✅ `npm install` en lugar de `pnpm install`
- ✅ El build debería completarse exitosamente

## 🎯 Resumen de Comandos Correctos

| Campo | Valor Correcto |
|-------|----------------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Node Version** | `22.16.0` (o superior) |

## ❌ NO HACER

- ❌ NO uses `pnpm`
- ❌ NO uses `yarn`
- ❌ NO uses `pnpm install --frozen-lockfile`
- ❌ NO dejes el Build Command vacío

## 🆘 Si No Funciona

Si después de cambiar el Build Command sigue fallando:

1. Verifica que guardaste los cambios (botón Save Changes)
2. Verifica que el despliegue está usando el nuevo comando (revisa los logs)
3. Asegúrate de que el campo Build Command tenga EXACTAMENTE: `npm install && npm run build`
4. Verifica que no haya espacios extra al inicio o final del comando

## 📸 Ubicación Visual

```
Render Dashboard
└── Tu Servicio (Dashboard-empresa-2025)
    └── Settings (menú lateral izquierdo)
        └── Build & Deploy (sección)
            ├── Build Command ← CAMBIAR AQUÍ
            └── Start Command ← VERIFICAR AQUÍ
```

