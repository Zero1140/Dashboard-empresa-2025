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
  // Obtener de Supabase (obligatorio)
  const { data, error } = await supabase
    .from('impresiones')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);
  
  if (error) {
    console.error('Error al obtener impresiones de Supabase:', error);
    throw new Error(`Error al obtener impresiones: ${error.message}`);
  }
  
  if (!data) {
    return [];
  }
  
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

// Versión síncrona que también usa Supabase (para compatibilidad)
export function obtenerImpresionesSync(): ImpresionEtiqueta[] {
  // En el cliente, podemos hacer una llamada síncrona usando un estado cacheado
  // Por ahora, retornamos array vacío y se cargará asíncronamente
  return [];
}

export async function guardarImpresion(impresion: ImpresionEtiqueta): Promise<void> {
  // Guardar en Supabase (obligatorio)
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
  
  if (error) {
    console.error('Error al guardar impresión en Supabase:', error);
    throw new Error(`Error al guardar impresión: ${error.message}`);
  }
  
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
}

export async function guardarCambioOperador(cambio: CambioOperador): Promise<void> {
  // Guardar en Supabase (obligatorio)
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
  
  if (error) {
    console.error('Error al guardar cambio de operador en Supabase:', error);
    throw new Error(`Error al guardar cambio de operador: ${error.message}`);
  }
  
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
}

export async function obtenerCambiosOperador(): Promise<CambioOperador[]> {
  // Obtener de Supabase (obligatorio)
  const { data, error } = await supabase
    .from('cambios_operador')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);
  
  if (error) {
    console.error('Error al obtener cambios de operador de Supabase:', error);
    throw new Error(`Error al obtener cambios de operador: ${error.message}`);
  }
  
  if (!data) {
    return [];
  }
  
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

export function obtenerCambiosOperadorSync(): CambioOperador[] {
  // Versión síncrona - retorna vacío, se cargará asíncronamente
  return [];
}

export async function guardarCambioColor(cambio: CambioColor): Promise<void> {
  // Guardar en Supabase (obligatorio)
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
  
  if (error) {
    console.error('Error al guardar cambio de color en Supabase:', error);
    throw new Error(`Error al guardar cambio de color: ${error.message}`);
  }
  
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
}

export async function obtenerCambiosColor(): Promise<CambioColor[]> {
  // Obtener de Supabase (obligatorio)
  const { data, error } = await supabase
    .from('cambios_color')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);
  
  if (error) {
    console.error('Error al obtener cambios de color de Supabase:', error);
    throw new Error(`Error al obtener cambios de color: ${error.message}`);
  }
  
  if (!data) {
    return [];
  }
  
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

export function obtenerCambiosColorSync(): CambioColor[] {
  // Versión síncrona - retorna vacío, se cargará asíncronamente
  return [];
}

export function limpiarDatos(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_IMPRESIONES);
  localStorage.removeItem(STORAGE_KEY_CAMBIOS_OPERADOR);
  localStorage.removeItem(STORAGE_KEY_CAMBIOS_COLOR);
}

