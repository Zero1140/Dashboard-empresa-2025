/**
 * Utilidades para gestionar PINs de operadores
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const PINS_ID = "pins_global";

export interface PinOperador {
  operador: string;
  pin: string;
  fechaCreacion: number;
  fechaUltimaModificacion: number;
}

export interface PinsOperadores {
  [operador: string]: PinOperador;
}

/**
 * Carga PINs desde Supabase
 */
async function cargarPinsDesdeSupabase(): Promise<PinsOperadores> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('pins_operadores')
      .select('pins_data')
      .eq('id', PINS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar PINs de operadores de Supabase: ${error.message}`);
    }
    
    if (!data || !data.pins_data) return {};
    
    return data.pins_data as PinsOperadores;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar PINs de operadores de Supabase: ${error}`);
  }
}

/**
 * Guarda PINs en Supabase
 */
async function guardarPinsEnSupabase(pins: PinsOperadores): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('pins_operadores')
      .upsert({
        id: PINS_ID,
        pins_data: pins,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar PINs de operadores en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar PINs de operadores en Supabase: ${error}`);
  }
}

/**
 * Obtiene todos los PINs de operadores (versión asíncrona)
 */
export async function obtenerPinsOperadores(): Promise<PinsOperadores> {
  if (typeof window === "undefined") return {};
  
  return await cargarPinsDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerPinsOperadoresSync(): PinsOperadores {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerPinsOperadoresSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda los PINs de operadores (versión asíncrona)
 */
async function guardarPinsOperadores(pins: PinsOperadores): Promise<void> {
  if (typeof window === "undefined") return;
  
  await guardarPinsEnSupabase(pins);
}

/**
 * Establece o actualiza el PIN de un operador (versión asíncrona)
 */
export async function establecerPinOperador(operador: string, pin: string): Promise<void> {
  const pins = await obtenerPinsOperadores();
  const ahora = Date.now();
  
  if (pins[operador]) {
    // Actualizar PIN existente
    pins[operador].pin = pin;
    pins[operador].fechaUltimaModificacion = ahora;
  } else {
    // Crear nuevo PIN
    pins[operador] = {
      operador,
      pin,
      fechaCreacion: ahora,
      fechaUltimaModificacion: ahora,
    };
  }
  
  await guardarPinsOperadores(pins);
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinsActualizados"));
  }
}

/**
 * Elimina el PIN de un operador (versión asíncrona)
 */
export async function eliminarPinOperador(operador: string): Promise<void> {
  const pins = await obtenerPinsOperadores();
  delete pins[operador];
  await guardarPinsOperadores(pins);
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinsActualizados"));
  }
}

/**
 * Obtiene el PIN de un operador específico (versión asíncrona)
 */
export async function obtenerPinOperador(operador: string): Promise<string | null> {
  const pins = await obtenerPinsOperadores();
  return pins[operador]?.pin || null;
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerPinOperadorSync(operador: string): string | null {
  const pins = obtenerPinsOperadoresSync();
  return pins[operador]?.pin || null;
}

/**
 * Verifica si un operador tiene PIN configurado (versión asíncrona)
 */
export async function tienePinOperador(operador: string): Promise<boolean> {
  const pins = await obtenerPinsOperadores();
  return !!pins[operador]?.pin;
}

/**
 * Versión síncrona para compatibilidad
 */
export function tienePinOperadorSync(operador: string): boolean {
  const pins = obtenerPinsOperadoresSync();
  return !!pins[operador]?.pin;
}

/**
 * Verifica si un PIN es correcto para un operador (versión asíncrona)
 */
export async function verificarPinOperador(operador: string, pin: string): Promise<boolean> {
  const pinGuardado = await obtenerPinOperador(operador);
  return pinGuardado !== null && pinGuardado === pin;
}

/**
 * Versión síncrona para compatibilidad
 */
export function verificarPinOperadorSync(operador: string, pin: string): boolean {
  const pinGuardado = obtenerPinOperadorSync(operador);
  return pinGuardado !== null && pinGuardado === pin;
}

/**
 * Suscripción Realtime a cambios en PINs de operadores
 */
export function suscribirPinsOperadoresRealtime(
  callback: (pins: PinsOperadores) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('pins_operadores_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'pins_operadores',
        filter: `id=eq.${PINS_ID}`
      },
      async () => {
        try {
          const nuevosPins = await cargarPinsDesdeSupabase();
          callback(nuevosPins);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pinsActualizados"));
          }
        } catch (error) {
          console.error('Error al recargar PINs de operadores en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}




