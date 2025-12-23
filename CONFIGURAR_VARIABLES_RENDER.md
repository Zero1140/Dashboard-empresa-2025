# 🔑 Configurar Variables de Entorno en Render

## ⚠️ IMPORTANTE

El build está fallando porque las variables de entorno de Supabase no están configuradas. **Esto es OPCIONAL** - la aplicación funcionará con localStorage si no configuras Supabase.

## 📋 Pasos para Configurar Variables (Opcional)

### Opción 1: Sin Supabase (Funciona con localStorage)

Si no quieres usar Supabase ahora, puedes dejar las variables vacías y la aplicación funcionará con localStorage. El build debería pasar ahora con el código actualizado.

### Opción 2: Con Supabase (Recomendado para producción)

Si quieres usar Supabase:

#### Paso 1: Ve a Render Dashboard
1. Abre: https://dashboard.render.com
2. Selecciona tu servicio: **Dashboard-empresa-2025**

#### Paso 2: Ve a Environment Variables
1. En el menú lateral, haz clic en **Environment**
2. Busca la sección **Environment Variables**

#### Paso 3: Agrega las Variables

Agrega estas dos variables:

**Variable 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://rybokbjrbugvggprnith.supabase.co`

**Variable 2:**
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: `sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_`

#### Paso 4: Guarda y Redespliega
1. Haz clic en **Save Changes**
2. Ve a **Manual Deploy** → **Deploy latest commit**

## ✅ Verificación

Después de configurar las variables (o dejarlas vacías), el build debería:
- ✅ Completarse exitosamente
- ✅ La aplicación funcionará con localStorage si Supabase no está configurado
- ✅ La aplicación usará Supabase si las variables están configuradas

## 📝 Valores de Supabase

Si necesitas los valores de Supabase, están en `CONFIGURACION_SUPABASE.md`:

- **URL**: `https://rybokbjrbugvggprnith.supabase.co`
- **Anon Key**: `sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_`

## 🎯 Resumen

| Variable | Valor | Requerido |
|----------|-------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rybokbjrbugvggprnith.supabase.co` | Opcional |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_` | Opcional |

**Nota**: Si no configuras estas variables, la aplicación funcionará perfectamente con localStorage. Solo necesitas configurarlas si quieres usar Supabase para sincronización entre usuarios.

