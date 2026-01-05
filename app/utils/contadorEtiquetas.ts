import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const CONTADOR_ID = "contador_global";

export interface ContadorEtiquetas {
  chicas: number;
  grandes: number;
}

/**
 * Carga contador de etiquetas desde Supabase
 */
async function cargarContadorDesdeSupabase(): Promise<ContadorEtiquetas> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('contador_etiquetas')
      .select('chicas, grandes')
      .eq('id', CONTADOR_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar contador de etiquetas de Supabase: ${error.message}`);
    }
    
    if (!data) return { chicas: 0, grandes: 0 };
    
    return {
      chicas: data.chicas || 0,
      grandes: data.grandes || 0,
    };
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar contador de etiquetas de Supabase: ${error}`);
  }
}

/**
 * Guarda contador de etiquetas en Supabase
 */
async function guardarContadorEnSupabase(contador: ContadorEtiquetas): Promise<void> {
  requireSupabase();
  
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
      throw new SupabaseConnectionError(`Error al guardar contador de etiquetas en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar contador de etiquetas en Supabase: ${error}`);
  }
}

/**
 * Obtiene el contador de etiquetas (versión asíncrona)
 */
export async function obtenerContadoresEtiquetas(): Promise<ContadorEtiquetas> {
  if (typeof window === "undefined") return { chicas: 0, grandes: 0 };
  
  return await cargarContadorDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerContadoresEtiquetasSync(): ContadorEtiquetas {
  if (typeof window === "undefined") return { chicas: 0, grandes: 0 };
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerContadoresEtiquetasSync() devolverá valores por defecto.');
    return { chicas: 0, grandes: 0 };
  }
  
  return { chicas: 0, grandes: 0 };
}

/**
 * Guarda el contador de etiquetas (versión asíncrona)
 */
export async function guardarContadoresEtiquetas(contador: ContadorEtiquetas): Promise<void> {
  if (typeof window === "undefined") return;
  
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
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
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
        try {
          const nuevoContador = await cargarContadorDesdeSupabase();
          callback(nuevoContador);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("contadorEtiquetasActualizado"));
          }
        } catch (error) {
          console.error('Error al recargar contador de etiquetas en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

