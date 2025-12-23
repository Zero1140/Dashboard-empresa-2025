# 🔑 CONFIGURAR VARIABLES DE SUPABASE EN RENDER (OBLIGATORIO)

## ⚠️ IMPORTANTE

**La aplicación REQUIERE Supabase para funcionar.** Debes configurar las variables de entorno antes de desplegar.

## 📋 Pasos OBLIGATORIOS

### Paso 1: Ve a Render Dashboard
1. Abre: https://dashboard.render.com
2. Inicia sesión
3. Selecciona tu servicio: **Dashboard-empresa-2025**

### Paso 2: Ve a Environment Variables
1. En el menú lateral izquierdo, haz clic en **Environment**
2. Busca la sección **Environment Variables**

### Paso 3: Agrega las Variables (OBLIGATORIAS)

Debes agregar estas **DOS variables**:

#### Variable 1: NEXT_PUBLIC_SUPABASE_URL
1. Haz clic en **Add Environment Variable**
2. En **Key**, escribe: `NEXT_PUBLIC_SUPABASE_URL`
3. En **Value**, escribe: `https://rybokbjrbugvggprnith.supabase.co`
4. Haz clic en **Save**

#### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
1. Haz clic en **Add Environment Variable** nuevamente
2. En **Key**, escribe: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En **Value**, escribe: `sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_`
4. Haz clic en **Save**

### Paso 4: Verifica que las Variables Estén Configuradas

Deberías ver estas dos variables en la lista:

```
✅ NEXT_PUBLIC_SUPABASE_URL = https://rybokbjrbugvggprnith.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

### Paso 5: Guarda y Redespliega
1. Haz clic en **Save Changes** (si aparece)
2. Ve a la pestaña **Manual Deploy** (en el menú superior)
3. Haz clic en **Deploy latest commit**
4. Espera a que el build complete

## ✅ Verificación

Después de configurar las variables, el build debería:
- ✅ Completarse exitosamente
- ✅ La aplicación se conectará a Supabase automáticamente
- ✅ Los datos se guardarán en Supabase

## 📝 Valores Exactos

Copia y pega estos valores exactamente:

| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rybokbjrbugvggprnith.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_` |

## 🐛 Si el Build Falla

Si el build falla con un error sobre variables faltantes:

1. ✅ Verifica que agregaste AMBAS variables
2. ✅ Verifica que los nombres sean EXACTAMENTE como se muestran arriba (case-sensitive)
3. ✅ Verifica que los valores sean correctos (sin espacios al inicio o final)
4. ✅ Guarda los cambios
5. ✅ Redespliega manualmente

## 📸 Ubicación Visual

```
Render Dashboard
└── Tu Servicio (Dashboard-empresa-2025)
    └── Environment (menú lateral izquierdo)
        └── Environment Variables (sección)
            ├── Add Environment Variable ← Click aquí
            └── Lista de variables ← Deberías ver las 2 variables aquí
```

## 🎯 Checklist

Antes de redesplegar, verifica:

- [ ] Variable `NEXT_PUBLIC_SUPABASE_URL` está configurada
- [ ] Variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada
- [ ] Los valores son correctos (sin espacios extra)
- [ ] Guardaste los cambios
- [ ] Estás listo para redesplegar

## ⚡ Después de Configurar

Una vez configuradas las variables:
1. El build debería completarse exitosamente
2. La aplicación se conectará automáticamente a Supabase
3. Todos los datos se guardarán en Supabase
4. Los datos se sincronizarán entre todos los usuarios
