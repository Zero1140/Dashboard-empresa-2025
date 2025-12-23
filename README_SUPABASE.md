# Integración con Supabase - Dashboard GST3D

## ✅ Estado de la Integración

La aplicación ahora está preparada para usar Supabase como base de datos, con fallback automático a localStorage si Supabase no está configurado.

## 📋 Archivos Creados/Modificados

### Nuevos Archivos:
- `app/utils/supabase.ts` - Cliente de Supabase
- `supabase-schema.sql` - Script SQL para crear las tablas
- `app/utils/migrate.ts` - Script de migración de datos
- `SUPABASE_SETUP.md` - Guía de configuración detallada
- `.env.example` - Ejemplo de variables de entorno

### Archivos Modificados:
- `app/utils/storage.ts` - Actualizado para usar Supabase con fallback
- `app/components/MaquinasPage.tsx` - Actualizado para funciones asíncronas
- `app/components/InformacionPage.tsx` - Actualizado para funciones asíncronas

## 🚀 Pasos para Activar Supabase

1. **Crear proyecto en Supabase** (ver `SUPABASE_SETUP.md`)
2. **Ejecutar el script SQL** (`supabase-schema.sql`) en Supabase
3. **Configurar variables de entorno** en Render:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Migrar datos existentes** (opcional, usar `migrate.ts`)

## 🔄 Funcionamiento

### Con Supabase Configurado:
- Los datos se guardan automáticamente en Supabase
- Los datos se sincronizan entre todos los usuarios
- Los datos persisten en el servidor

### Sin Supabase Configurado:
- La aplicación funciona normalmente con localStorage
- Cada usuario tiene sus propios datos localmente
- No hay sincronización entre usuarios

## 📊 Datos que se Migran

- ✅ Impresiones
- ✅ Cambios de operador
- ✅ Cambios de color
- ✅ Stock de materiales
- ✅ Operadores personalizados
- ✅ Operadores eliminados
- ✅ PINs de operadores
- ✅ Stock mínimos
- ✅ Stock por categorías
- ✅ Categorías
- ✅ Colores personalizados
- ✅ Colores eliminados
- ✅ Operadores asignados a máquinas
- ✅ Colores por máquina
- ✅ Contador de etiquetas

## 🔧 Uso del Script de Migración

Para migrar datos de localStorage a Supabase:

```typescript
import { migrarDatosLocalStorageASupabase } from './app/utils/migrate';

// Ejecutar migración
const resultado = await migrarDatosLocalStorageASupabase();
console.log(resultado);
```

O desde la consola del navegador:
```javascript
// En la consola del navegador después de cargar la página
import('./app/utils/migrate').then(m => {
  m.migrarDatosLocalStorageASupabase().then(r => console.log(r));
});
```

## ⚠️ Notas Importantes

1. **Backward Compatibility**: La aplicación funciona con o sin Supabase
2. **Fallback Automático**: Si Supabase falla, automáticamente usa localStorage
3. **Migración No Destructiva**: Los datos en localStorage no se eliminan después de migrar
4. **Sincronización**: Con Supabase, los cambios se ven en tiempo real entre usuarios

## 🐛 Solución de Problemas

Ver `SUPABASE_SETUP.md` para solución de problemas comunes.

