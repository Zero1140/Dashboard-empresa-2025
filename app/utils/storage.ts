import { ImpresionEtiqueta, CambioOperador, CambioColor } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_IMPRESIONES = "gst3d_impresiones";
const STORAGE_KEY_CAMBIOS_OPERADOR = "gst3d_cambios_operador";
const STORAGE_KEY_CAMBIOS_COLOR = "gst3d_cambios_color";
const MAX_RECORDS = 1000; // Máximo de registros a mantener

function obtenerImpresionesRaw(): any[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_IMPRESIONES);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export async function obtenerImpresiones(): Promise<ImpresionEtiqueta[]> {
  // Intentar obtener de Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('impresiones')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_RECORDS);
      
      if (!error && data) {
        return data.map((imp: any) => ({
          id: imp.id,
          maquinaId: imp.maquina_id,
          tipoMaterial: imp.tipo_material,
          etiquetaChica: imp.etiqueta_chica,
          etiquetaGrande: imp.etiqueta_grande,
          operador: imp.operador,
          fecha: imp.fecha,
          timestamp: imp.timestamp,
          cantidadChicas: imp.cantidad_chicas || 8,
          cantidadGrandes: imp.cantidad_grandes || 8,
        }));
      }
    } catch (error) {
      console.error('Error al obtener impresiones de Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  const impresiones = obtenerImpresionesRaw();
  return impresiones.map((imp: any) => ({
    ...imp,
    cantidadChicas: imp.cantidadChicas || 8,
    cantidadGrandes: imp.cantidadGrandes || 8,
  }));
}

// Versión síncrona para compatibilidad (usa localStorage)
export function obtenerImpresionesSync(): ImpresionEtiqueta[] {
  const impresiones = obtenerImpresionesRaw();
  return impresiones.map((imp: any) => ({
    ...imp,
    cantidadChicas: imp.cantidadChicas || 8,
    cantidadGrandes: imp.cantidadGrandes || 8,
  }));
}

export async function guardarImpresion(impresion: ImpresionEtiqueta): Promise<void> {
  // Intentar guardar en Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('impresiones')
        .insert({
          id: impresion.id,
          maquina_id: impresion.maquinaId,
          tipo_material: impresion.tipoMaterial,
          etiqueta_chica: impresion.etiquetaChica,
          etiqueta_grande: impresion.etiquetaGrande,
          operador: impresion.operador,
          fecha: impresion.fecha,
          timestamp: impresion.timestamp,
          cantidad_chicas: impresion.cantidadChicas || 8,
          cantidad_grandes: impresion.cantidadGrandes || 8,
        });
      
      if (!error) {
        // Limpiar registros antiguos si hay más de MAX_RECORDS
        const { data } = await supabase
          .from('impresiones')
          .select('id')
          .order('timestamp', { ascending: false })
          .limit(MAX_RECORDS + 100);
        
        if (data && data.length > MAX_RECORDS) {
          const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
          await supabase
            .from('impresiones')
            .delete()
            .in('id', idsAEliminar);
        }
        return; // Éxito, no usar localStorage
      }
    } catch (error) {
      console.error('Error al guardar impresión en Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  const impresiones = obtenerImpresionesRaw();
  impresiones.push(impresion);
  const impresionesLimitadas = impresiones
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECORDS);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_IMPRESIONES, JSON.stringify(impresionesLimitadas));
  }
}

export async function guardarCambioOperador(cambio: CambioOperador): Promise<void> {
  // Intentar guardar en Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('cambios_operador')
        .insert({
          id: cambio.id,
          maquina_id: cambio.maquinaId,
          operador_anterior: cambio.operadorAnterior,
          operador_nuevo: cambio.operadorNuevo,
          supervisor: cambio.supervisor || 'Sistema',
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        });
      
      if (!error) {
        // Limpiar registros antiguos
        const { data } = await supabase
          .from('cambios_operador')
          .select('id')
          .order('timestamp', { ascending: false })
          .limit(MAX_RECORDS + 100);
        
        if (data && data.length > MAX_RECORDS) {
          const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
          await supabase
            .from('cambios_operador')
            .delete()
            .in('id', idsAEliminar);
        }
        return;
      }
    } catch (error) {
      console.error('Error al guardar cambio de operador en Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  const cambios = obtenerCambiosOperadorSync();
  cambios.push(cambio);
  const cambiosLimitados = cambios
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECORDS);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CAMBIOS_OPERADOR, JSON.stringify(cambiosLimitados));
  }
}

export async function obtenerCambiosOperador(): Promise<CambioOperador[]> {
  // Intentar obtener de Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('cambios_operador')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_RECORDS);
      
      if (!error && data) {
        return data.map((cambio: any) => ({
          id: cambio.id,
          maquinaId: cambio.maquina_id,
          operadorAnterior: cambio.operador_anterior,
          operadorNuevo: cambio.operador_nuevo,
          supervisor: cambio.supervisor || "Sistema",
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        }));
      }
    } catch (error) {
      console.error('Error al obtener cambios de operador de Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  return obtenerCambiosOperadorSync();
}

export function obtenerCambiosOperadorSync(): CambioOperador[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_CAMBIOS_OPERADOR);
  if (!stored) return [];
  try {
    const cambios = JSON.parse(stored);
    return cambios.map((cambio: any) => ({
      ...cambio,
      supervisor: cambio.supervisor || "Sistema",
    }));
  } catch {
    return [];
  }
}

export async function guardarCambioColor(cambio: CambioColor): Promise<void> {
  // Intentar guardar en Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('cambios_color')
        .insert({
          id: cambio.id,
          maquina_id: cambio.maquinaId,
          tipo_color: cambio.tipoColor,
          color_anterior: cambio.colorAnterior,
          color_nuevo: cambio.colorNuevo,
          supervisor: cambio.supervisor || 'Sistema',
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        });
      
      if (!error) {
        // Limpiar registros antiguos
        const { data } = await supabase
          .from('cambios_color')
          .select('id')
          .order('timestamp', { ascending: false })
          .limit(MAX_RECORDS + 100);
        
        if (data && data.length > MAX_RECORDS) {
          const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
          await supabase
            .from('cambios_color')
            .delete()
            .in('id', idsAEliminar);
        }
        return;
      }
    } catch (error) {
      console.error('Error al guardar cambio de color en Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  const cambios = obtenerCambiosColorSync();
  cambios.push(cambio);
  const cambiosLimitados = cambios
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_RECORDS);

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_CAMBIOS_COLOR, JSON.stringify(cambiosLimitados));
  }
}

export async function obtenerCambiosColor(): Promise<CambioColor[]> {
  // Intentar obtener de Supabase primero
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('cambios_color')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(MAX_RECORDS);
      
      if (!error && data) {
        return data.map((cambio: any) => ({
          id: cambio.id,
          maquinaId: cambio.maquina_id,
          tipoColor: cambio.tipo_color as "chica" | "grande",
          colorAnterior: cambio.color_anterior,
          colorNuevo: cambio.color_nuevo,
          supervisor: cambio.supervisor || "Sistema",
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        }));
      }
    } catch (error) {
      console.error('Error al obtener cambios de color de Supabase:', error);
    }
  }
  
  // Fallback a localStorage
  return obtenerCambiosColorSync();
}

export function obtenerCambiosColorSync(): CambioColor[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY_CAMBIOS_COLOR);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function limpiarDatos(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_IMPRESIONES);
  localStorage.removeItem(STORAGE_KEY_CAMBIOS_OPERADOR);
  localStorage.removeItem(STORAGE_KEY_CAMBIOS_COLOR);
}

