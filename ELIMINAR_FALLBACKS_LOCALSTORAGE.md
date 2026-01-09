# Eliminación de Fallbacks a localStorage

## Objetivo
Eliminar TODOS los fallbacks a localStorage y hacer que el sistema funcione EXCLUSIVAMENTE con Supabase. Si Supabase no está configurado, el sistema debe mostrar errores claros con instrucciones.

## Cambios Realizados

### ✅ Archivos Actualizados

1. **app/utils/supabaseError.ts** (NUEVO)
   - Clases de error: `SupabaseNotConfiguredError`, `SupabaseConnectionError`
   - Función `requireSupabase()` para validar configuración
   - Mensajes de error con instrucciones

2. **app/components/SupabaseError.tsx** (NUEVO)
   - Componente visual para mostrar errores de Supabase
   - Instrucciones claras para solucionar problemas

3. **app/utils/stock.ts**
   - ✅ Eliminados todos los fallbacks a localStorage
   - ✅ Funciones ahora requieren Supabase
   - ✅ Errores claros si Supabase no está configurado

4. **app/utils/categorias.ts**
   - ✅ Eliminados todos los fallbacks a localStorage
   - ✅ Funciones ahora requieren Supabase
   - ✅ Errores claros si Supabase no está configurado

### ⏳ Archivos Pendientes de Actualizar

5. **app/utils/stockCategorias.ts**
6. **app/utils/operadoresAsignados.ts**
7. **app/utils/coloresMaquinas.ts**
8. **app/utils/operadores.ts**
9. **app/utils/colores.ts**
10. **app/utils/contadorEtiquetas.ts**
11. **app/utils/pins.ts**
12. **app/utils/stockMinimos.ts**
13. **app/utils/storage.ts** (impresiones, cambios operador, cambios color)

## Patrón de Cambios

Para cada archivo, seguir este patrón:

1. **Importar errores:**
```typescript
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";
```

2. **Eliminar constantes de localStorage:**
```typescript
// ELIMINAR: const STORAGE_KEY_XXX = "...";
```

3. **Actualizar funciones de carga:**
```typescript
// ANTES:
async function cargarDesdeSupabase(): Promise<Data> {
  if (!isSupabaseConfigured()) return {};
  // ... código ...
  localStorage.setItem(...); // ELIMINAR
  return data;
}

// DESPUÉS:
async function cargarDesdeSupabase(): Promise<Data> {
  requireSupabase(); // Lanza error si no está configurado
  try {
    // ... código ...
    if (error) {
      throw new SupabaseConnectionError(`Error: ${error.message}`);
    }
    return data;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error: ${error}`);
  }
}
```

4. **Actualizar funciones de guardado:**
```typescript
// ANTES:
async function guardar(data: Data): Promise<void> {
  localStorage.setItem(...); // ELIMINAR
  await guardarEnSupabase(data);
}

// DESPUÉS:
async function guardar(data: Data): Promise<void> {
  requireSupabase();
  await guardarEnSupabase(data); // Ya lanza errores
}
```

5. **Actualizar funciones públicas:**
```typescript
// ANTES:
export async function obtener(): Promise<Data> {
  if (isSupabaseConfigured()) {
    return await cargarDesdeSupabase();
  }
  // Fallback a localStorage - ELIMINAR
  return JSON.parse(localStorage.getItem(...));
}

// DESPUÉS:
export async function obtener(): Promise<Data> {
  return await cargarDesdeSupabase(); // Ya valida Supabase
}
```

6. **Actualizar versiones síncronas:**
```typescript
// ANTES:
export function obtenerSync(): Data {
  const stored = localStorage.getItem(...);
  return JSON.parse(stored);
}

// DESPUÉS:
export function obtenerSync(): Data {
  // Solo lectura, puede devolver datos desactualizados
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerSync() devolverá un objeto vacío.');
    return {};
  }
  // Para sincronización, usar useRealtimeSync en componentes
  return {};
}
```

## Integración en Componentes

Los componentes deben manejar errores de Supabase:

```typescript
import SupabaseError from "../components/SupabaseError";
import { isSupabaseConfigured } from "../utils/supabase";

export default function MyComponent() {
  const [supabaseError, setSupabaseError] = useState<"NOT_CONFIGURED" | "CONNECTION_ERROR" | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setSupabaseError("NOT_CONFIGURED");
      return;
    }

    // Cargar datos
    obtenerDatos()
      .catch((error) => {
        if (error.name === 'SupabaseNotConfiguredError') {
          setSupabaseError("NOT_CONFIGURED");
        } else if (error.name === 'SupabaseConnectionError') {
          setSupabaseError("CONNECTION_ERROR");
        }
      });
  }, []);

  if (supabaseError) {
    return <SupabaseError type={supabaseError} />;
  }

  // ... resto del componente
}
```

## Verificación

Después de actualizar todos los archivos:

1. ✅ No debe haber referencias a `localStorage.getItem()` o `localStorage.setItem()` en funciones de datos
2. ✅ Todas las funciones deben usar `requireSupabase()` o validar `isSupabaseConfigured()`
3. ✅ Los errores deben ser claros y proporcionar instrucciones
4. ✅ Los componentes deben mostrar `SupabaseError` cuando hay problemas


