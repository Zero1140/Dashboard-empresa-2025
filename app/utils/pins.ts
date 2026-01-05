/**
 * Utilidades para gestionar PINs de operadores
 */

import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_PINS_OPERADORES = "gst3d_pins_operadores";
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
async function cargarPinsDesdeSupabase(): Promise<PinsOperadores | null> {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const { data, error } = await supabase
      .from('pins_operadores')
      .select('pins_data')
      .eq('id', PINS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar PINs de operadores de Supabase:', error);
      return null;
    }
    
    if (!data || !data.pins_data) return null;
    
    const pins = data.pins_data as PinsOperadores;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_PINS_OPERADORES, JSON.stringify(pins));
    }
    
    return pins;
  } catch (error) {
    console.error('Error al cargar PINs de operadores de Supabase:', error);
    return null;
  }
}

/**
 * Guarda PINs en Supabase
 */
async function guardarPinsEnSupabase(pins: PinsOperadores): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('pins_operadores')
      .upsert({
        id: PINS_ID,
        pins_data: pins,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar PINs de operadores en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar PINs de operadores en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene todos los PINs de operadores (versión asíncrona)
 */
export async function obtenerPinsOperadores(): Promise<PinsOperadores> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const pins = await cargarPinsDesdeSupabase();
    if (pins) {
      return pins;
    }
  }
  
  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY_PINS_OPERADORES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar PINs de operadores:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerPinsOperadoresSync(): PinsOperadores {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_PINS_OPERADORES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar PINs de operadores:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los PINs de operadores (versión asíncrona)
 */
async function guardarPinsOperadores(pins: PinsOperadores): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_PINS_OPERADORES, JSON.stringify(pins));
  
  // Guardar en Supabase (asíncrono)
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
    const handler = () => {
      obtenerPinsOperadores().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("pinsActualizados", handler);
      return () => window.removeEventListener("pinsActualizados", handler);
    }
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
        const nuevosPins = await cargarPinsDesdeSupabase();
        if (nuevosPins) {
          callback(nuevosPins);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("pinsActualizados"));
          }
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}




