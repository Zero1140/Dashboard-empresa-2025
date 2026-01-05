import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const COLORES_MAQUINAS_ID = "colores_maquinas_global";

export type ColoresPorMaquina = Record<number, { chica: string; grande: string }>;

/**
 * Carga colores por máquina desde Supabase
 */
async function cargarColoresMaquinasDesdeSupabase(): Promise<ColoresPorMaquina> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('colores_maquinas')
      .select('colores_data')
      .eq('id', COLORES_MAQUINAS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar colores de máquinas de Supabase: ${error.message}`);
    }
    
    if (!data || !data.colores_data) return {};
    
    return data.colores_data as ColoresPorMaquina;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar colores de máquinas de Supabase: ${error}`);
  }
}

/**
 * Guarda colores por máquina en Supabase
 */
async function guardarColoresMaquinasEnSupabase(colores: ColoresPorMaquina): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('colores_maquinas')
      .upsert({
        id: COLORES_MAQUINAS_ID,
        colores_data: colores,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar colores de máquinas en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar colores de máquinas en Supabase: ${error}`);
  }
}

/**
 * Obtiene los colores por máquina (versión asíncrona)
 */
export async function obtenerColoresMaquinas(): Promise<ColoresPorMaquina> {
  if (typeof window === "undefined") return {};
  
  return await cargarColoresMaquinasDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerColoresMaquinasSync(): ColoresPorMaquina {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerColoresMaquinasSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda los colores por máquina (versión asíncrona)
 */
export async function guardarColoresMaquinas(colores: ColoresPorMaquina): Promise<void> {
  if (typeof window === "undefined") return;
  
  await guardarColoresMaquinasEnSupabase(colores);
}

/**
 * Suscripción Realtime a cambios en colores por máquina
 */
export function suscribirColoresMaquinasRealtime(
  callback: (colores: ColoresPorMaquina) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('colores_maquinas_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'colores_maquinas',
        filter: `id=eq.${COLORES_MAQUINAS_ID}`
      },
      async () => {
        try {
          const nuevosColores = await cargarColoresMaquinasDesdeSupabase();
          callback(nuevosColores);
        } catch (error) {
          console.error('Error al recargar colores de máquinas en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

