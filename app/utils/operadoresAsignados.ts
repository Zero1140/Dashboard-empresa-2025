import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_OPERADORES_ASIGNADOS = "operadores_asignados";
const OPERADORES_ASIGNADOS_ID = "asignaciones_global";

export type OperadoresAsignados = Record<number, string>;

/**
 * Carga operadores asignados desde Supabase
 */
async function cargarOperadoresAsignadosDesdeSupabase(): Promise<OperadoresAsignados> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('operadores_asignados')
      .select('asignaciones_data')
      .eq('id', OPERADORES_ASIGNADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar operadores asignados de Supabase:', error);
      return {};
    }
    
    if (!data || !data.asignaciones_data) return {};
    
    const asignaciones = data.asignaciones_data as OperadoresAsignados;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_OPERADORES_ASIGNADOS, JSON.stringify(asignaciones));
    }
    
    return asignaciones;
  } catch (error) {
    console.error('Error al cargar operadores asignados de Supabase:', error);
    return {};
  }
}

/**
 * Guarda operadores asignados en Supabase
 */
async function guardarOperadoresAsignadosEnSupabase(asignaciones: OperadoresAsignados): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('operadores_asignados')
      .upsert({
        id: OPERADORES_ASIGNADOS_ID,
        asignaciones_data: asignaciones,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar operadores asignados en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar operadores asignados en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene los operadores asignados (versión asíncrona)
 */
export async function obtenerOperadoresAsignados(): Promise<OperadoresAsignados> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const asignaciones = await cargarOperadoresAsignadosDesdeSupabase();
    if (Object.keys(asignaciones).length > 0) {
      return asignaciones;
    }
  }
  
  // Fallback a localStorage
  const asignacionesGuardadas = localStorage.getItem(STORAGE_KEY_OPERADORES_ASIGNADOS);
  if (asignacionesGuardadas) {
    try {
      return JSON.parse(asignacionesGuardadas);
    } catch (e) {
      console.error("Error al cargar operadores asignados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerOperadoresAsignadosSync(): OperadoresAsignados {
  if (typeof window === "undefined") return {};
  const asignacionesGuardadas = localStorage.getItem(STORAGE_KEY_OPERADORES_ASIGNADOS);
  if (asignacionesGuardadas) {
    try {
      return JSON.parse(asignacionesGuardadas);
    } catch (e) {
      console.error("Error al cargar operadores asignados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los operadores asignados (versión asíncrona)
 */
export async function guardarOperadoresAsignados(asignaciones: OperadoresAsignados): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_OPERADORES_ASIGNADOS, JSON.stringify(asignaciones));
  
  // Guardar en Supabase (asíncrono)
  await guardarOperadoresAsignadosEnSupabase(asignaciones);
}

/**
 * Suscripción Realtime a cambios en operadores asignados
 */
export function suscribirOperadoresAsignadosRealtime(
  callback: (asignaciones: OperadoresAsignados) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const subscription = supabase
    .channel('operadores_asignados_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'operadores_asignados',
        filter: `id=eq.${OPERADORES_ASIGNADOS_ID}`
      },
      async () => {
        // Recargar desde Supabase cuando hay cambios
        const nuevasAsignaciones = await cargarOperadoresAsignadosDesdeSupabase();
        callback(nuevasAsignaciones);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

