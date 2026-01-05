import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_CONTADOR_ETIQUETAS = "gst3d_contador_etiquetas";
const CONTADOR_ID = "contador_global";

export interface ContadorEtiquetas {
  chicas: number;
  grandes: number;
}

/**
 * Carga contador de etiquetas desde Supabase
 */
async function cargarContadorDesdeSupabase(): Promise<ContadorEtiquetas | null> {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const { data, error } = await supabase
      .from('contador_etiquetas')
      .select('chicas, grandes')
      .eq('id', CONTADOR_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar contador de etiquetas de Supabase:', error);
      return null;
    }
    
    if (!data) return null;
    
    const contador = {
      chicas: data.chicas || 0,
      grandes: data.grandes || 0,
    };
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CONTADOR_ETIQUETAS, JSON.stringify(contador));
    }
    
    return contador;
  } catch (error) {
    console.error('Error al cargar contador de etiquetas de Supabase:', error);
    return null;
  }
}

/**
 * Guarda contador de etiquetas en Supabase
 */
async function guardarContadorEnSupabase(contador: ContadorEtiquetas): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('contador_etiquetas')
      .upsert({
        id: CONTADOR_ID,
        chicas: contador.chicas,
        grandes: contador.grandes,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar contador de etiquetas en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar contador de etiquetas en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene el contador de etiquetas (versión asíncrona)
 */
export async function obtenerContadoresEtiquetas(): Promise<ContadorEtiquetas> {
  if (typeof window === "undefined") return { chicas: 0, grandes: 0 };
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const contador = await cargarContadorDesdeSupabase();
    if (contador) {
      return contador;
    }
  }
  
  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY_CONTADOR_ETIQUETAS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar contador de etiquetas:", e);
      return { chicas: 0, grandes: 0 };
    }
  }
  return { chicas: 0, grandes: 0 };
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerContadoresEtiquetasSync(): ContadorEtiquetas {
  if (typeof window === "undefined") return { chicas: 0, grandes: 0 };
  const stored = localStorage.getItem(STORAGE_KEY_CONTADOR_ETIQUETAS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar contador de etiquetas:", e);
      return { chicas: 0, grandes: 0 };
    }
  }
  return { chicas: 0, grandes: 0 };
}

/**
 * Guarda el contador de etiquetas (versión asíncrona)
 */
export async function guardarContadoresEtiquetas(contador: ContadorEtiquetas): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_CONTADOR_ETIQUETAS, JSON.stringify(contador));
  
  // Guardar en Supabase (asíncrono)
  await guardarContadorEnSupabase(contador);
  
  // Disparar evento local
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("contadorEtiquetasActualizado"));
  }
}

/**
 * Incrementa el contador de etiquetas
 */
export async function incrementarContadorEtiquetas(chicas: number = 0, grandes: number = 0): Promise<void> {
  const contador = await obtenerContadoresEtiquetas();
  contador.chicas += chicas;
  contador.grandes += grandes;
  await guardarContadoresEtiquetas(contador);
}

/**
 * Resetea el contador de etiquetas
 */
export async function resetearContadorEtiquetas(): Promise<void> {
  await guardarContadoresEtiquetas({ chicas: 0, grandes: 0 });
}

/**
 * Suscripción Realtime a cambios en contador de etiquetas
 */
export function suscribirContadorEtiquetasRealtime(
  callback: (contador: ContadorEtiquetas) => void
): () => void {
  if (!isSupabaseConfigured()) {
    const handler = () => {
      obtenerContadoresEtiquetas().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("contadorEtiquetasActualizado", handler);
      return () => window.removeEventListener("contadorEtiquetasActualizado", handler);
    }
    return () => {};
  }
  
  const subscription = supabase
    .channel('contador_etiquetas_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contador_etiquetas',
        filter: `id=eq.${CONTADOR_ID}`
      },
      async () => {
        const nuevoContador = await cargarContadorDesdeSupabase();
        if (nuevoContador) {
          callback(nuevoContador);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("contadorEtiquetasActualizado"));
          }
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

