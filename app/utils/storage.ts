import { ImpresionEtiqueta, CambioOperador, CambioColor } from "../types";
import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const MAX_RECORDS = 1000; // Máximo de registros a mantener

export async function obtenerImpresiones(): Promise<ImpresionEtiqueta[]> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('impresiones')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS);
    
    if (error) {
      throw new SupabaseConnectionError(`Error al obtener impresiones de Supabase: ${error.message}`);
    }
    
    if (!data) return [];
    
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
      estado: imp.estado || 'impresa',
    }));
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al obtener impresiones de Supabase: ${error}`);
  }
}

// Versión síncrona para compatibilidad (solo lectura, puede devolver datos desactualizados)
export function obtenerImpresionesSync(): ImpresionEtiqueta[] {
  if (typeof window === "undefined") return [];
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerImpresionesSync() devolverá un array vacío.');
    return [];
  }
  
  return [];
}

export async function guardarImpresion(impresion: ImpresionEtiqueta): Promise<void> {
  requireSupabase();
  
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
        estado: 'pendiente', // Estado inicial: pendiente de imprimir
      });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar impresión en Supabase: ${error.message}`);
    }
    
    // Limpiar registros antiguos si hay más de MAX_RECORDS
    const { data } = await supabase
      .from('impresiones')
      .select('id')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS + 100);
    
    if (data && data.length > MAX_RECORDS) {
      const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
      const { error: deleteError } = await supabase
        .from('impresiones')
        .delete()
        .in('id', idsAEliminar);
      
      if (deleteError) {
        console.warn('Error al limpiar registros antiguos de impresiones:', deleteError);
      }
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar impresión en Supabase: ${error}`);
  }
}

export async function guardarCambioOperador(cambio: CambioOperador): Promise<void> {
  requireSupabase();
  
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
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar cambio de operador en Supabase: ${error.message}`);
    }
    
    // Limpiar registros antiguos
    const { data } = await supabase
      .from('cambios_operador')
      .select('id')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS + 100);
    
    if (data && data.length > MAX_RECORDS) {
      const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
      const { error: deleteError } = await supabase
        .from('cambios_operador')
        .delete()
        .in('id', idsAEliminar);
      
      if (deleteError) {
        console.warn('Error al limpiar registros antiguos de cambios de operador:', deleteError);
      }
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar cambio de operador en Supabase: ${error}`);
  }
}

export async function obtenerCambiosOperador(): Promise<CambioOperador[]> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('cambios_operador')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS);
    
    if (error) {
      throw new SupabaseConnectionError(`Error al obtener cambios de operador de Supabase: ${error.message}`);
    }
    
    if (!data) return [];
    
    return data.map((cambio: any) => ({
      id: cambio.id,
      maquinaId: cambio.maquina_id,
      operadorAnterior: cambio.operador_anterior,
      operadorNuevo: cambio.operador_nuevo,
      supervisor: cambio.supervisor || "Sistema",
      fecha: cambio.fecha,
      timestamp: cambio.timestamp,
    }));
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al obtener cambios de operador de Supabase: ${error}`);
  }
}

export function obtenerCambiosOperadorSync(): CambioOperador[] {
  if (typeof window === "undefined") return [];
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerCambiosOperadorSync() devolverá un array vacío.');
    return [];
  }
  
  return [];
}

export async function guardarCambioColor(cambio: CambioColor): Promise<void> {
  requireSupabase();
  
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
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar cambio de color en Supabase: ${error.message}`);
    }
    
    // Limpiar registros antiguos
    const { data } = await supabase
      .from('cambios_color')
      .select('id')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS + 100);
    
    if (data && data.length > MAX_RECORDS) {
      const idsAEliminar = data.slice(MAX_RECORDS).map(r => r.id);
      const { error: deleteError } = await supabase
        .from('cambios_color')
        .delete()
        .in('id', idsAEliminar);
      
      if (deleteError) {
        console.warn('Error al limpiar registros antiguos de cambios de color:', deleteError);
      }
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar cambio de color en Supabase: ${error}`);
  }
}

export async function obtenerCambiosColor(): Promise<CambioColor[]> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('cambios_color')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(MAX_RECORDS);
    
    if (error) {
      throw new SupabaseConnectionError(`Error al obtener cambios de color de Supabase: ${error.message}`);
    }
    
    if (!data) return [];
    
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
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al obtener cambios de color de Supabase: ${error}`);
  }
}

export function obtenerCambiosColorSync(): CambioColor[] {
  if (typeof window === "undefined") return [];
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerCambiosColorSync() devolverá un array vacío.');
    return [];
  }
  
  return [];
}

export async function limpiarDatos(): Promise<void> {
  if (typeof window === "undefined") return;
  
  requireSupabase();
  
  try {
    // Limpiar todas las tablas de historial
    await Promise.all([
      supabase.from('impresiones').delete().neq('id', ''),
      supabase.from('cambios_operador').delete().neq('id', ''),
      supabase.from('cambios_color').delete().neq('id', ''),
    ]);
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al limpiar datos en Supabase: ${error}`);
  }
}

