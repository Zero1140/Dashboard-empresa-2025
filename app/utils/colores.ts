import { coloresPorTipo } from "../data";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_COLORES_PERSONALIZADOS = "gst3d_colores_personalizados";
const STORAGE_KEY_COLORES_ELIMINADOS = "gst3d_colores_eliminados";
const COLORES_PERSONALIZADOS_ID = "colores_global";
const COLORES_ELIMINADOS_ID = "eliminados_global";

/**
 * Carga colores personalizados desde Supabase
 */
async function cargarColoresPersonalizadosDesdeSupabase(): Promise<Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('colores_personalizados')
      .select('colores_data')
      .eq('id', COLORES_PERSONALIZADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar colores personalizados de Supabase:', error);
      return {};
    }
    
    if (!data || !data.colores_data) return {};
    
    const colores = data.colores_data;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COLORES_PERSONALIZADOS, JSON.stringify(colores));
    }
    
    return colores;
  } catch (error) {
    console.error('Error al cargar colores personalizados de Supabase:', error);
    return {};
  }
}

/**
 * Guarda colores personalizados en Supabase
 */
async function guardarColoresPersonalizadosEnSupabase(colores: Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('colores_personalizados')
      .upsert({
        id: COLORES_PERSONALIZADOS_ID,
        colores_data: colores,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar colores personalizados en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar colores personalizados en Supabase:', error);
    return false;
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
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const colores = await cargarColoresPersonalizadosDesdeSupabase();
    if (Object.keys(colores).length > 0) {
      return colores;
    }
  }
  
  // Fallback a localStorage
  const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_PERSONALIZADOS);
  if (coloresGuardados) {
    try {
      return JSON.parse(coloresGuardados);
    } catch (e) {
      console.error("Error al cargar colores personalizados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerColoresPersonalizadosSync(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  if (typeof window === "undefined") return {};
  const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_PERSONALIZADOS);
  if (coloresGuardados) {
    try {
      return JSON.parse(coloresGuardados);
    } catch (e) {
      console.error("Error al cargar colores personalizados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Carga colores eliminados desde Supabase
 */
async function cargarColoresEliminadosDesdeSupabase(): Promise<Record<string, {
  chica: string[];
  grande: string[];
}>> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('colores_eliminados')
      .select('eliminados_data')
      .eq('id', COLORES_ELIMINADOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar colores eliminados de Supabase:', error);
      return {};
    }
    
    if (!data || !data.eliminados_data) return {};
    
    const eliminados = data.eliminados_data;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_COLORES_ELIMINADOS, JSON.stringify(eliminados));
    }
    
    return eliminados;
  } catch (error) {
    console.error('Error al cargar colores eliminados de Supabase:', error);
    return {};
  }
}

/**
 * Guarda colores eliminados en Supabase
 */
async function guardarColoresEliminadosEnSupabase(coloresEliminados: Record<string, {
  chica: string[];
  grande: string[];
}>): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('colores_eliminados')
      .upsert({
        id: COLORES_ELIMINADOS_ID,
        eliminados_data: coloresEliminados,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar colores eliminados en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar colores eliminados en Supabase:', error);
    return false;
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
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const eliminados = await cargarColoresEliminadosDesdeSupabase();
    if (Object.keys(eliminados).length > 0) {
      return eliminados;
    }
  }
  
  // Fallback a localStorage
  const coloresEliminados = localStorage.getItem(STORAGE_KEY_COLORES_ELIMINADOS);
  if (coloresEliminados) {
    try {
      return JSON.parse(coloresEliminados);
    } catch (e) {
      console.error("Error al cargar colores eliminados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerColoresEliminadosSync(): Record<string, {
  chica: string[];
  grande: string[];
}> {
  if (typeof window === "undefined") return {};
  const coloresEliminados = localStorage.getItem(STORAGE_KEY_COLORES_ELIMINADOS);
  if (coloresEliminados) {
    try {
      return JSON.parse(coloresEliminados);
    } catch (e) {
      console.error("Error al cargar colores eliminados:", e);
      return {};
    }
  }
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
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_COLORES_ELIMINADOS, JSON.stringify(coloresEliminados));
  
  // Guardar en Supabase (asíncrono)
  await guardarColoresEliminadosEnSupabase(coloresEliminados);
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
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_COLORES_PERSONALIZADOS, JSON.stringify(colores));
  
  // Guardar en Supabase (asíncrono)
  await guardarColoresPersonalizadosEnSupabase(colores);
  
  // Disparar evento local
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
export function obtenerColoresCombinadosSync(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  const coloresPersonalizados = obtenerColoresPersonalizadosSync();
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
  
  return combinados;
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
    const handler = () => {
      obtenerColoresPersonalizados().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("coloresActualizados", handler);
      return () => window.removeEventListener("coloresActualizados", handler);
    }
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
        const nuevosColores = await cargarColoresPersonalizadosDesdeSupabase();
        callback(nuevosColores);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("coloresActualizados"));
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
        const nuevosEliminados = await cargarColoresEliminadosDesdeSupabase();
        callback(nuevosEliminados);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}
