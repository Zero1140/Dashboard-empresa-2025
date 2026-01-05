import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_COLORES_MAQUINAS = "gst3d_colores_maquinas";
const COLORES_MAQUINAS_ID = "colores_maquinas_global";

export type ColoresPorMaquina = Record<number, { chica: string; grande: string }>;

/**
 * Carga colores por máquina desde Supabase
 */
async function cargarColoresMaquinasDesdeSupabase(): Promise<ColoresPorMaquina> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('colores_maquinas')
      .select('colores_data')
      .eq('id', COLORES_MAQUINAS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar colores de máquinas de Supabase:', error);
      return {};
    }
    
    if (!data || !data.colores_data) return {};
    
    const colores = data.colores_data as ColoresPorMaquina;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COLORES_MAQUINAS, JSON.stringify(colores));
    }
    
    return colores;
  } catch (error) {
    console.error('Error al cargar colores de máquinas de Supabase:', error);
    return {};
  }
}

/**
 * Guarda colores por máquina en Supabase
 */
async function guardarColoresMaquinasEnSupabase(colores: ColoresPorMaquina): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('colores_maquinas')
      .upsert({
        id: COLORES_MAQUINAS_ID,
        colores_data: colores,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar colores de máquinas en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar colores de máquinas en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene los colores por máquina (versión asíncrona)
 */
export async function obtenerColoresMaquinas(): Promise<ColoresPorMaquina> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const colores = await cargarColoresMaquinasDesdeSupabase();
    if (Object.keys(colores).length > 0) {
      return colores;
    }
  }
  
  // Fallback a localStorage
  const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_MAQUINAS);
  if (coloresGuardados) {
    try {
      return JSON.parse(coloresGuardados);
    } catch (e) {
      console.error("Error al cargar colores de máquinas:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerColoresMaquinasSync(): ColoresPorMaquina {
  if (typeof window === "undefined") return {};
  const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_MAQUINAS);
  if (coloresGuardados) {
    try {
      return JSON.parse(coloresGuardados);
    } catch (e) {
      console.error("Error al cargar colores de máquinas:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los colores por máquina (versión asíncrona)
 */
export async function guardarColoresMaquinas(colores: ColoresPorMaquina): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_COLORES_MAQUINAS, JSON.stringify(colores));
  
  // Guardar en Supabase (asíncrono)
  await guardarColoresMaquinasEnSupabase(colores);
}

/**
 * Suscripción Realtime a cambios en colores por máquina
 */
export function suscribirColoresMaquinasRealtime(
  callback: (colores: ColoresPorMaquina) => void
): () => void {
  if (!isSupabaseConfigured()) {
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
        // Recargar desde Supabase cuando hay cambios
        const nuevosColores = await cargarColoresMaquinasDesdeSupabase();
        callback(nuevosColores);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

