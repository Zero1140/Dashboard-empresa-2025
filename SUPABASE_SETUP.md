# Guía de Configuración de Supabase para Dashboard GST3D

## 📋 Pasos para Configurar Supabase

### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa la información:
   - **Name**: `dashboard-gst3d` (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña de forma segura
   - **Region**: Elige la región más cercana a tus usuarios
5. Espera a que se cree el proyecto (puede tardar unos minutos)

### 2. Crear las Tablas en Supabase

1. En el dashboard de Supabase, ve a **SQL Editor** (ícono de base de datos en el menú lateral)
2. Haz clic en **New Query**
3. Copia y pega todo el contenido del archivo `supabase-schema.sql`
4. Haz clic en **Run** (o presiona Ctrl+Enter)
5. Verifica que todas las tablas se hayan creado correctamente

### 3. Obtener las Credenciales de Supabase

1. En el dashboard de Supabase, ve a **Settings** (ícono de engranaje)
2. Selecciona **API** en el menú lateral
3. Encontrarás:
   - **Project URL**: Copia esta URL
   - **anon/public key**: Copia esta clave

### 4. Configurar Variables de Entorno en Render

1. En Render, ve a tu servicio web
2. Ve a **Environment** en el menú lateral
3. Agrega las siguientes variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon-publica
```

**Importante**: Reemplaza los valores con tus credenciales reales de Supabase.

4. Guarda los cambios
5. Render reiniciará automáticamente tu aplicación

### 5. Migrar Datos de localStorage a Supabase (Opcional)

Si ya tienes datos en localStorage y quieres migrarlos:

1. Abre la aplicación en tu navegador
2. Abre la consola del navegador (F12)
3. Ejecuta el script de migración (se creará en `app/utils/migrate.ts`)
4. O usa la función de migración desde la interfaz de administración

## 🔒 Seguridad

Las políticas de Row Level Security (RLS) están configuradas para permitir todas las operaciones por ahora. 

**Para producción**, deberías:
1. Configurar autenticación en Supabase
2. Crear políticas RLS más restrictivas
3. Usar el `service_role` key solo en el servidor (nunca en el cliente)

## ✅ Verificación

Para verificar que Supabase está funcionando:

1. Abre la aplicación
2. Abre la consola del navegador (F12)
3. Deberías ver mensajes de conexión exitosa a Supabase
4. Intenta crear una impresión o cambiar un operador
5. Ve a Supabase Dashboard > Table Editor y verifica que los datos se están guardando

## 🐛 Solución de Problemas

### Error: "Supabase URL or Key not configured"
- Verifica que las variables de entorno estén configuradas correctamente en Render
- Asegúrate de que los nombres de las variables sean exactamente:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: "Failed to fetch" o errores de CORS
- Verifica que la URL de Supabase sea correcta
- Asegúrate de que las políticas RLS permitan las operaciones necesarias

### Los datos no se guardan
- Revisa la consola del navegador para ver errores específicos
- Verifica que las tablas existan en Supabase
- Asegúrate de que las políticas RLS estén configuradas correctamente

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Next.js con Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

