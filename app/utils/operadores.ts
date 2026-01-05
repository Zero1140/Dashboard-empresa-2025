import { OPERADORES } from "../data";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_OPERADORES_PERSONALIZADOS = "gst3d_operadores_personalizados";
const STORAGE_KEY_OPERADORES_ELIMINADOS = "gst3d_operadores_eliminados";

/**
 * Carga operadores personalizados desde Supabase
 */
async function cargarOperadoresPersonalizadosDesdeSupabase(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const { data, error } = await supabase
      .from('operadores_personalizados')
      .select('nombre')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error al cargar operadores personalizados de Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) return [];
    
    const operadores = data.map((op: any) => op.nombre);
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS, JSON.stringify(operadores));
    }
    
    return operadores;
  } catch (error) {
    console.error('Error al cargar operadores personalizados de Supabase:', error);
    return [];
  }
}

/**
 * Guarda operadores personalizados en Supabase
 */
async function guardarOperadoresPersonalizadosEnSupabase(operadores: string[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    // Obtener operadores actuales de Supabase
    const { data: operadoresActuales } = await supabase
      .from('operadores_personalizados')
      .select('nombre');
    
    const nombresActuales = operadoresActuales?.map((op: any) => op.nombre) || [];
    
    // Agregar nuevos operadores
    const nuevosOperadores = operadores.filter(op => !nombresActuales.includes(op));
    if (nuevosOperadores.length > 0) {
      const { error } = await supabase
        .from('operadores_personalizados')
        .insert(nuevosOperadores.map(nombre => ({ nombre })));
      
      if (error) {
        console.error('Error al guardar operadores personalizados en Supabase:', error);
        return false;
      }
    }
    
    // Eliminar operadores que ya no están
    const operadoresAEliminar = nombresActuales.filter(op => !operadores.includes(op));
    if (operadoresAEliminar.length > 0) {
      const { error } = await supabase
        .from('operadores_personalizados')
        .delete()
        .in('nombre', operadoresAEliminar);
      
      if (error) {
        console.error('Error al eliminar operadores personalizados de Supabase:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar operadores personalizados en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene los operadores personalizados (versión asíncrona)
 */
export async function obtenerOperadoresPersonalizados(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const operadores = await cargarOperadoresPersonalizadosDesdeSupabase();
    if (operadores.length > 0) {
      return operadores;
    }
  }
  
  // Fallback a localStorage
  const operadoresGuardados = localStorage.getItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS);
  if (operadoresGuardados) {
    try {
      return JSON.parse(operadoresGuardados);
    } catch (e) {
      console.error("Error al cargar operadores personalizados:", e);
      return [];
    }
  }
  return [];
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerOperadoresPersonalizadosSync(): string[] {
  if (typeof window === "undefined") return [];
  const operadoresGuardados = localStorage.getItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS);
  if (operadoresGuardados) {
    try {
      return JSON.parse(operadoresGuardados);
    } catch (e) {
      console.error("Error al cargar operadores personalizados:", e);
      return [];
    }
  }
  return [];
}

/**
 * Guarda los operadores personalizados (versión asíncrona)
 */
export async function guardarOperadoresPersonalizados(operadores: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS, JSON.stringify(operadores));
  
  // Guardar en Supabase (asíncrono)
  await guardarOperadoresPersonalizadosEnSupabase(operadores);
  
  // Disparar evento local
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("operadoresActualizados"));
  }
}

/**
 * Combina los operadores originales con los personalizados, excluyendo los eliminados (versión asíncrona)
 */
export async function obtenerOperadoresCombinados(): Promise<string[]> {
  const operadoresPersonalizados = await obtenerOperadoresPersonalizados();
  const operadoresEliminados = await obtenerOperadoresEliminados();
  const operadoresCombinados = [...OPERADORES, ...operadoresPersonalizados];
  
  // Filtrar los eliminados
  const operadoresFiltrados = operadoresCombinados.filter(
    op => !operadoresEliminados.includes(op)
  );
  
  // Eliminar duplicados y ordenar
  return Array.from(new Set(operadoresFiltrados)).sort();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerOperadoresCombinadosSync(): string[] {
  const operadoresPersonalizados = obtenerOperadoresPersonalizadosSync();
  const operadoresEliminados = obtenerOperadoresEliminadosSync();
  const operadoresCombinados = [...OPERADORES, ...operadoresPersonalizados];
  
  // Filtrar los eliminados
  const operadoresFiltrados = operadoresCombinados.filter(
    op => !operadoresEliminados.includes(op)
  );
  
  // Eliminar duplicados y ordenar
  return Array.from(new Set(operadoresFiltrados)).sort();
}

/**
 * Agrega un nuevo operador (versión asíncrona)
 */
export async function agregarOperador(nombre: string): Promise<void> {
  const operadoresPersonalizados = await obtenerOperadoresPersonalizados();
  const nombreNormalizado = nombre.trim();
  
  if (!nombreNormalizado) return;
  
  // Verificar que no exista ya
  const operadoresCombinados = await obtenerOperadoresCombinados();
  if (operadoresCombinados.includes(nombreNormalizado)) {
    return;
  }
  
  operadoresPersonalizados.push(nombreNormalizado);
  await guardarOperadoresPersonalizados(operadoresPersonalizados);
}

/**
 * Carga operadores eliminados desde Supabase
 */
async function cargarOperadoresEliminadosDesdeSupabase(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  
  try {
    const { data, error } = await supabase
      .from('operadores_eliminados')
      .select('nombre')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error al cargar operadores eliminados de Supabase:', error);
      return [];
    }
    
    if (!data || data.length === 0) return [];
    
    const eliminados = data.map((op: any) => op.nombre);
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_OPERADORES_ELIMINADOS, JSON.stringify(eliminados));
    }
    
    return eliminados;
  } catch (error) {
    console.error('Error al cargar operadores eliminados de Supabase:', error);
    return [];
  }
}

/**
 * Guarda operadores eliminados en Supabase
 */
async function guardarOperadoresEliminadosEnSupabase(eliminados: string[]): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    // Obtener eliminados actuales de Supabase
    const { data: eliminadosActuales } = await supabase
      .from('operadores_eliminados')
      .select('nombre');
    
    const nombresActuales = eliminadosActuales?.map((op: any) => op.nombre) || [];
    
    // Agregar nuevos eliminados
    const nuevosEliminados = eliminados.filter(op => !nombresActuales.includes(op));
    if (nuevosEliminados.length > 0) {
      const { error } = await supabase
        .from('operadores_eliminados')
        .insert(nuevosEliminados.map(nombre => ({ nombre })));
      
      if (error) {
        console.error('Error al guardar operadores eliminados en Supabase:', error);
        return false;
      }
    }
    
    // Eliminar operadores que ya no están eliminados
    const operadoresARestaurar = nombresActuales.filter(op => !eliminados.includes(op));
    if (operadoresARestaurar.length > 0) {
      const { error } = await supabase
        .from('operadores_eliminados')
        .delete()
        .in('nombre', operadoresARestaurar);
      
      if (error) {
        console.error('Error al restaurar operadores eliminados de Supabase:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar operadores eliminados en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene los operadores eliminados (versión asíncrona)
 */
export async function obtenerOperadoresEliminados(): Promise<string[]> {
  if (typeof window === "undefined") return [];
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const eliminados = await cargarOperadoresEliminadosDesdeSupabase();
    if (eliminados.length > 0) {
      return eliminados;
    }
  }
  
  // Fallback a localStorage
  const eliminados = localStorage.getItem(STORAGE_KEY_OPERADORES_ELIMINADOS);
  if (eliminados) {
    try {
      return JSON.parse(eliminados);
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerOperadoresEliminadosSync(): string[] {
  if (typeof window === "undefined") return [];
  const eliminados = localStorage.getItem(STORAGE_KEY_OPERADORES_ELIMINADOS);
  if (eliminados) {
    try {
      return JSON.parse(eliminados);
    } catch (e) {
      return [];
    }
  }
  return [];
}

/**
 * Guarda los operadores eliminados (versión asíncrona)
 */
async function guardarOperadoresEliminados(eliminados: string[]): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_OPERADORES_ELIMINADOS, JSON.stringify(eliminados));
  
  // Guardar en Supabase (asíncrono)
  await guardarOperadoresEliminadosEnSupabase(eliminados);
}

export async function eliminarOperador(nombre: string): Promise<void> {
  const nombreNormalizado = nombre.trim();
  
  if (OPERADORES.includes(nombreNormalizado)) {
    // Es un operador original, marcarlo como eliminado
    const eliminados = await obtenerOperadoresEliminados();
    if (!eliminados.includes(nombreNormalizado)) {
      eliminados.push(nombreNormalizado);
      await guardarOperadoresEliminados(eliminados);
    }
  } else {
    // Es un operador personalizado, eliminarlo directamente
    const operadoresPersonalizados = await obtenerOperadoresPersonalizados();
    const nuevosOperadores = operadoresPersonalizados.filter(op => op !== nombreNormalizado);
    await guardarOperadoresPersonalizados(nuevosOperadores);
  }
}

/**
 * Restaura un operador eliminado (versión asíncrona)
 */
export async function restaurarOperador(nombre: string): Promise<void> {
  const eliminados = await obtenerOperadoresEliminados();
  const nuevosEliminados = eliminados.filter(op => op !== nombre);
  await guardarOperadoresEliminados(nuevosEliminados);
}

/**
 * Suscripción Realtime a cambios en operadores personalizados
 */
export function suscribirOperadoresPersonalizadosRealtime(
  callback: (operadores: string[]) => void
): () => void {
  if (!isSupabaseConfigured()) {
    const handler = () => {
      obtenerOperadoresPersonalizados().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("operadoresActualizados", handler);
      return () => window.removeEventListener("operadoresActualizados", handler);
    }
    return () => {};
  }
  
  const subscription = supabase
    .channel('operadores_personalizados_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'operadores_personalizados'
      },
      async () => {
        const nuevosOperadores = await cargarOperadoresPersonalizadosDesdeSupabase();
        callback(nuevosOperadores);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("operadoresActualizados"));
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Suscripción Realtime a cambios en operadores eliminados
 */
export function suscribirOperadoresEliminadosRealtime(
  callback: (eliminados: string[]) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const subscription = supabase
    .channel('operadores_eliminados_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'operadores_eliminados'
      },
      async () => {
        const nuevosEliminados = await cargarOperadoresEliminadosDesdeSupabase();
        callback(nuevosEliminados);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}

