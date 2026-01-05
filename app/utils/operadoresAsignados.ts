import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const OPERADORES_ASIGNADOS_ID = "asignaciones_global";

export type OperadoresAsignados = Record<number, string>;

/**
 * Carga operadores asignados desde Supabase
 */
async function cargarOperadoresAsignadosDesdeSupabase(): Promise<OperadoresAsignados> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('operadores_asignados')
      .select('asignaciones_data')
      .eq('id', OPERADORES_ASIGNADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar operadores asignados de Supabase: ${error.message}`);
    }
    
    if (!data || !data.asignaciones_data) return {};
    
    return data.asignaciones_data as OperadoresAsignados;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar operadores asignados de Supabase: ${error}`);
  }
}

/**
 * Guarda operadores asignados en Supabase
 */
async function guardarOperadoresAsignadosEnSupabase(asignaciones: OperadoresAsignados): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('operadores_asignados')
      .upsert({
        id: OPERADORES_ASIGNADOS_ID,
        asignaciones_data: asignaciones,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar operadores asignados en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar operadores asignados en Supabase: ${error}`);
  }
}

/**
 * Obtiene los operadores asignados (versión asíncrona)
 */
export async function obtenerOperadoresAsignados(): Promise<OperadoresAsignados> {
  if (typeof window === "undefined") return {};
  
  return await cargarOperadoresAsignadosDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerOperadoresAsignadosSync(): OperadoresAsignados {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerOperadoresAsignadosSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda los operadores asignados (versión asíncrona)
 */
export async function guardarOperadoresAsignados(asignaciones: OperadoresAsignados): Promise<void> {
  if (typeof window === "undefined") return;
  
  await guardarOperadoresAsignadosEnSupabase(asignaciones);
}

/**
 * Suscripción Realtime a cambios en operadores asignados
 */
export function suscribirOperadoresAsignadosRealtime(
  callback: (asignaciones: OperadoresAsignados) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
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
        try {
          const nuevasAsignaciones = await cargarOperadoresAsignadosDesdeSupabase();
          callback(nuevasAsignaciones);
        } catch (error) {
          console.error('Error al recargar operadores asignados en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

