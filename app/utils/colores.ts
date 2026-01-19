import { coloresPorTipo } from "../data";
import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const COLORES_PERSONALIZADOS_ID = "colores_global";
const COLORES_ELIMINADOS_ID = "eliminados_global";

/**
 * Carga colores personalizados desde Supabase
 */
async function cargarColoresPersonalizadosDesdeSupabase(): Promise<Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('colores_personalizados')
      .select('colores_data')
      .eq('id', COLORES_PERSONALIZADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar colores personalizados de Supabase: ${error.message}`);
    }
    
    if (!data || !data.colores_data) return {};
    
    return data.colores_data;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar colores personalizados de Supabase: ${error}`);
  }
}

/**
 * Guarda colores personalizados en Supabase
 */
async function guardarColoresPersonalizadosEnSupabase(colores: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('colores_personalizados')
      .upsert({
        id: COLORES_PERSONALIZADOS_ID,
        colores_data: colores,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar colores personalizados en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar colores personalizados en Supabase: ${error}`);
  }
}

/**
 * Obtiene los colores personalizados (versión asíncrona)
 */
export async function obtenerColoresPersonalizados(): Promise<Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>> {
  if (typeof window === "undefined") return {};

  const colores = await cargarColoresPersonalizadosDesdeSupabase();

  // Actualizar caché para acceso síncrono
  actualizarCacheColores(colores);

  return colores;
}

/**
 * Versión síncrona para compatibilidad - devuelve vacío (usa versión async)
 */
export function obtenerColoresPersonalizadosSync(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  // Solo devuelve colores base, los personalizados se cargan async
  return {};
}

/**
 * Carga colores eliminados desde Supabase
 */
async function cargarColoresEliminadosDesdeSupabase(): Promise<Record<string, {
  chica: string[];
  grande: string[];
}>> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('colores_eliminados')
      .select('eliminados_data')
      .eq('id', COLORES_ELIMINADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar colores eliminados de Supabase: ${error.message}`);
    }
    
    if (!data || !data.eliminados_data) return {};
    
    return data.eliminados_data;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar colores eliminados de Supabase: ${error}`);
  }
}

/**
 * Guarda colores eliminados en Supabase
 */
async function guardarColoresEliminadosEnSupabase(coloresEliminados: Record<string, {
  chica: string[];
  grande: string[];
}>): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('colores_eliminados')
      .upsert({
        id: COLORES_ELIMINADOS_ID,
        eliminados_data: coloresEliminados,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar colores eliminados en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar colores eliminados en Supabase: ${error}`);
  }
}

/**
 * Obtiene los colores eliminados (versión asíncrona)
 */
export async function obtenerColoresEliminados(): Promise<Record<string, {
  chica: string[];
  grande: string[];
}>> {
  if (typeof window === "undefined") return {};

  const coloresEliminados = await cargarColoresEliminadosDesdeSupabase();

  // Actualizar caché
  actualizarCacheColores();

  return coloresEliminados;
}

/**
 * Versión síncrona para compatibilidad - devuelve vacío (usa versión async)
 */
export function obtenerColoresEliminadosSync(): Record<string, {
  chica: string[];
  grande: string[];
}> {
  // Solo devuelve vacío, los eliminados se cargan async
  return {};
}

/**
 * Guarda los colores eliminados (versión asíncrona)
 */
export async function guardarColoresEliminados(coloresEliminados: Record<string, {
  chica: string[];
  grande: string[];
}>): Promise<void> {
  if (typeof window === "undefined") return;

  await guardarColoresEliminadosEnSupabase(coloresEliminados);

  // Actualizar caché
  actualizarCacheColores();
}

/**
 * Elimina un color (lo marca como eliminado) - versión asíncrona
 */
export async function eliminarColor(tipo: string, variante: "chica" | "grande", nombre: string): Promise<void> {
  const coloresEliminados = await obtenerColoresEliminados();
  
  if (!coloresEliminados[tipo]) {
    coloresEliminados[tipo] = { chica: [], grande: [] };
  }
  
  if (!coloresEliminados[tipo][variante].includes(nombre)) {
    coloresEliminados[tipo][variante].push(nombre);
    await guardarColoresEliminados(coloresEliminados);
    
    // Disparar evento para actualizar otros componentes
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("coloresActualizados"));
    }
  }
}

/**
 * Restaura un color eliminado - versión asíncrona
 */
export async function restaurarColor(tipo: string, variante: "chica" | "grande", nombre: string): Promise<void> {
  const coloresEliminados = await obtenerColoresEliminados();
  
  if (coloresEliminados[tipo] && coloresEliminados[tipo][variante]) {
    coloresEliminados[tipo][variante] = coloresEliminados[tipo][variante].filter(c => c !== nombre);
    
    // Si no quedan colores eliminados en el tipo, eliminar el tipo
    if (coloresEliminados[tipo].chica.length === 0 && coloresEliminados[tipo].grande.length === 0) {
      delete coloresEliminados[tipo];
    }
    
    await guardarColoresEliminados(coloresEliminados);
    
    // Disparar evento para actualizar otros componentes
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("coloresActualizados"));
    }
  }
}

/**
 * Guarda colores personalizados (versión asíncrona)
 */
export async function guardarColoresPersonalizados(colores: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>): Promise<void> {
  if (typeof window === "undefined") return;

  await guardarColoresPersonalizadosEnSupabase(colores);

  // Actualizar caché
  actualizarCacheColores();

  // Disparar evento local para actualizar componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("coloresActualizados"));
  }
}

/**
 * Combina los colores originales con los personalizados, excluyendo los eliminados (versión asíncrona)
 */
export async function obtenerColoresCombinados(): Promise<Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>> {
  const coloresPersonalizados = await obtenerColoresPersonalizados();
  const coloresEliminados = await obtenerColoresEliminados();
  const combinados = { ...coloresPorTipo };
  
  // Agregar colores personalizados
  Object.keys(coloresPersonalizados).forEach((tipo) => {
    if (!combinados[tipo]) {
      combinados[tipo] = { chica: {}, grande: {} };
    }
    
    // Combinar colores chicos
    combinados[tipo].chica = {
      ...combinados[tipo].chica,
      ...coloresPersonalizados[tipo].chica,
    };
    
    // Combinar colores grandes
    combinados[tipo].grande = {
      ...combinados[tipo].grande,
      ...coloresPersonalizados[tipo].grande,
    };
  });
  
  // Eliminar colores marcados como eliminados
  Object.keys(coloresEliminados).forEach((tipo) => {
    if (combinados[tipo]) {
      // Eliminar colores chicos
      coloresEliminados[tipo].chica.forEach((color) => {
        delete combinados[tipo].chica[color];
      });
      
      // Eliminar colores grandes
      coloresEliminados[tipo].grande.forEach((color) => {
        delete combinados[tipo].grande[color];
      });
    }
  });
  
  return combinados;
}

/**
 * Versión síncrona para compatibilidad
 */
// Caché global para colores combinados
let coloresCache: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 segundos

export function obtenerColoresCombinadosSync(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  // Si tenemos caché válido, usarlo
  if (coloresCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return coloresCache;
  }

  // Si no hay caché, devolver solo colores base
  // Los componentes deben cargar datos async para obtener colores personalizados
  return { ...coloresPorTipo };
}

// Función para actualizar el caché (llamada desde funciones async)
export function actualizarCacheColores(coloresPersonalizados?: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>) {
  // Si no se pasan colores, intentar obtener del estado global
  if (!coloresPersonalizados) {
    coloresPersonalizados = obtenerColoresPersonalizadosSync();
  }

  const coloresEliminados = obtenerColoresEliminadosSync();
  const combinados = { ...coloresPorTipo };

  // Agregar colores personalizados
  Object.keys(coloresPersonalizados).forEach((tipo) => {
    if (!combinados[tipo]) {
      combinados[tipo] = { chica: {}, grande: {} };
    }

    // Combinar colores chicos
    combinados[tipo].chica = {
      ...combinados[tipo].chica,
      ...coloresPersonalizados[tipo].chica,
    };

    // Combinar colores grandes
    combinados[tipo].grande = {
      ...combinados[tipo].grande,
      ...coloresPersonalizados[tipo].grande,
    };
  });

  // Eliminar colores marcados como eliminados
  Object.keys(coloresEliminados).forEach((tipo) => {
    if (combinados[tipo]) {
      // Eliminar colores chicos
      coloresEliminados[tipo].chica.forEach((color) => {
        delete combinados[tipo].chica[color];
      });

      // Eliminar colores grandes
      coloresEliminados[tipo].grande.forEach((color) => {
        delete combinados[tipo].grande[color];
      });
    }
  });

  coloresCache = combinados;
  cacheTimestamp = Date.now();
}

/**
 * Suscripción Realtime a cambios en colores personalizados
 */
export function suscribirColoresPersonalizadosRealtime(
  callback: (colores: Record<string, {
    chica: Record<string, string>;
    grande: Record<string, string>;
  }>) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('colores_personalizados_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'colores_personalizados',
        filter: `id=eq.${COLORES_PERSONALIZADOS_ID}`
      },
      async () => {
        try {
          const nuevosColores = await cargarColoresPersonalizadosDesdeSupabase();
          callback(nuevosColores);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("coloresActualizados"));
          }
        } catch (error) {
          console.error('Error al recargar colores personalizados en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Suscripción Realtime a cambios en colores eliminados
 */
export function suscribirColoresEliminadosRealtime(
  callback: (eliminados: Record<string, {
    chica: string[];
    grande: string[];
  }>) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('colores_eliminados_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'colores_eliminados',
        filter: `id=eq.${COLORES_ELIMINADOS_ID}`
      },
      async () => {
        try {
          const nuevosEliminados = await cargarColoresEliminadosDesdeSupabase();
          callback(nuevosEliminados);
        } catch (error) {
          console.error('Error al recargar colores eliminados en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}
