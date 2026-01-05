/**
 * Utilidades para gestionar niveles mínimos de stock
 */

import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_STOCK_MINIMOS_MATERIALES = "gst3d_stock_minimos_materiales";
const STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS = "gst3d_stock_minimos_categorias";
const STOCK_MINIMOS_ID = "minimos_global";

export interface StockMinimoMaterial {
  tipo: string;
  color: string;
  minimo: number;
}

export interface StockMinimoCategoria {
  categoriaId: string;
  itemNombre: string;
  minimo: number;
}

export interface StockMinimosMateriales {
  [tipo: string]: {
    [color: string]: number; // mínimo por color
  };
}

export interface StockMinimosCategorias {
  [categoriaId: string]: {
    [itemNombre: string]: number; // mínimo por item
  };
}

/**
 * Carga stock mínimos desde Supabase
 */
async function cargarStockMinimosDesdeSupabase(): Promise<{
  materiales: StockMinimosMateriales;
  categorias: StockMinimosCategorias;
} | null> {
  if (!isSupabaseConfigured()) return null;
  
  try {
    const { data, error } = await supabase
      .from('stock_minimos')
      .select('materiales_data, categorias_data')
      .eq('id', STOCK_MINIMOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar stock mínimos de Supabase:', error);
      return null;
    }
    
    if (!data) return null;
    
    const minimos = {
      materiales: (data.materiales_data || {}) as StockMinimosMateriales,
      categorias: (data.categorias_data || {}) as StockMinimosCategorias,
    };
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_MATERIALES, JSON.stringify(minimos.materiales));
      localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS, JSON.stringify(minimos.categorias));
    }
    
    return minimos;
  } catch (error) {
    console.error('Error al cargar stock mínimos de Supabase:', error);
    return null;
  }
}

/**
 * Guarda stock mínimos en Supabase
 */
async function guardarStockMinimosEnSupabase(
  materiales: StockMinimosMateriales,
  categorias: StockMinimosCategorias
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('stock_minimos')
      .upsert({
        id: STOCK_MINIMOS_ID,
        materiales_data: materiales,
        categorias_data: categorias,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar stock mínimos en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar stock mínimos en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene los niveles mínimos configurados para materiales (versión asíncrona)
 */
export async function obtenerStockMinimosMateriales(): Promise<StockMinimosMateriales> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const minimos = await cargarStockMinimosDesdeSupabase();
    if (minimos) {
      return minimos.materiales;
    }
  }
  
  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY_STOCK_MINIMOS_MATERIALES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar mínimos de materiales:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockMinimosMaterialesSync(): StockMinimosMateriales {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_STOCK_MINIMOS_MATERIALES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar mínimos de materiales:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los niveles mínimos de materiales (versión asíncrona)
 */
export async function guardarStockMinimosMateriales(minimos: StockMinimosMateriales): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_MATERIALES, JSON.stringify(minimos));
  
  // Obtener categorías actuales y guardar todo en Supabase
  const categorias = await obtenerStockMinimosCategorias();
  await guardarStockMinimosEnSupabase(minimos, categorias);
}

/**
 * Establece el nivel mínimo para un color específico (versión asíncrona)
 */
export async function establecerMinimoMaterial(tipo: string, color: string, minimo: number): Promise<void> {
  const minimos = await obtenerStockMinimosMateriales();
  if (!minimos[tipo]) {
    minimos[tipo] = {};
  }
  minimos[tipo][color] = minimo;
  await guardarStockMinimosMateriales(minimos);
}

/**
 * Elimina el nivel mínimo de un color (versión asíncrona)
 */
export async function eliminarMinimoMaterial(tipo: string, color: string): Promise<void> {
  const minimos = await obtenerStockMinimosMateriales();
  if (minimos[tipo]) {
    delete minimos[tipo][color];
    if (Object.keys(minimos[tipo]).length === 0) {
      delete minimos[tipo];
    }
    await guardarStockMinimosMateriales(minimos);
  }
}

/**
 * Obtiene el nivel mínimo para un color específico (versión asíncrona)
 */
export async function obtenerMinimoMaterial(tipo: string, color: string): Promise<number> {
  const minimos = await obtenerStockMinimosMateriales();
  return minimos[tipo]?.[color] || 0;
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerMinimoMaterialSync(tipo: string, color: string): number {
  const minimos = obtenerStockMinimosMaterialesSync();
  return minimos[tipo]?.[color] || 0;
}

/**
 * Obtiene los niveles mínimos configurados para categorías (versión asíncrona)
 */
export async function obtenerStockMinimosCategorias(): Promise<StockMinimosCategorias> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const minimos = await cargarStockMinimosDesdeSupabase();
    if (minimos) {
      return minimos.categorias;
    }
  }
  
  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar mínimos de categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockMinimosCategoriasSync(): StockMinimosCategorias {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar mínimos de categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los niveles mínimos de categorías (versión asíncrona)
 */
export async function guardarStockMinimosCategorias(minimos: StockMinimosCategorias): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero
  localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS, JSON.stringify(minimos));
  
  // Obtener materiales actuales y guardar todo en Supabase
  const materiales = await obtenerStockMinimosMateriales();
  await guardarStockMinimosEnSupabase(materiales, minimos);
}

/**
 * Establece el nivel mínimo para un item de categoría específico (versión asíncrona)
 */
export async function establecerMinimoCategoria(categoriaId: string, itemNombre: string, minimo: number): Promise<void> {
  const minimos = await obtenerStockMinimosCategorias();
  if (!minimos[categoriaId]) {
    minimos[categoriaId] = {};
  }
  minimos[categoriaId][itemNombre] = minimo;
  await guardarStockMinimosCategorias(minimos);
}

/**
 * Elimina el nivel mínimo de un item de categoría (versión asíncrona)
 */
export async function eliminarMinimoCategoria(categoriaId: string, itemNombre: string): Promise<void> {
  const minimos = await obtenerStockMinimosCategorias();
  if (minimos[categoriaId]) {
    delete minimos[categoriaId][itemNombre];
    if (Object.keys(minimos[categoriaId]).length === 0) {
      delete minimos[categoriaId];
    }
    await guardarStockMinimosCategorias(minimos);
  }
}

/**
 * Obtiene el nivel mínimo para un item de categoría específico (versión asíncrona)
 */
export async function obtenerMinimoCategoria(categoriaId: string, itemNombre: string): Promise<number> {
  const minimos = await obtenerStockMinimosCategorias();
  return minimos[categoriaId]?.[itemNombre] || 0;
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerMinimoCategoriaSync(categoriaId: string, itemNombre: string): number {
  const minimos = obtenerStockMinimosCategoriasSync();
  return minimos[categoriaId]?.[itemNombre] || 0;
}

/**
 * Verifica si hay alertas de stock bajo
 */
export interface AlertaStock {
  tipo: "material" | "categoria";
  tipoMaterial?: string;
  categoriaId?: string;
  categoriaNombre?: string;
  color?: string;
  itemNombre?: string;
  stockActual: number;
  stockMinimo: number;
  diferencia: number;
}

export function obtenerAlertasStock(
  stockMateriales: any,
  stockCategorias: any,
  coloresCombinados: any,
  categorias: any[]
): AlertaStock[] {
  const alertas: AlertaStock[] = [];
  const minimosMateriales = obtenerStockMinimosMaterialesSync();
  const minimosCategorias = obtenerStockMinimosCategoriasSync();

  // Verificar materiales
  Object.keys(stockMateriales).forEach((tipo) => {
    const stockTipo = stockMateriales[tipo] || {};
    const minimosTipo = minimosMateriales[tipo] || {};
    
    Object.keys(stockTipo).forEach((color) => {
      const stockActual = stockTipo[color] || 0;
      const minimo = minimosTipo[color] || 0;
      
      if (minimo > 0 && stockActual < minimo) {
        alertas.push({
          tipo: "material",
          tipoMaterial: tipo,
          color: color,
          stockActual,
          stockMinimo: minimo,
          diferencia: minimo - stockActual,
        });
      }
    });
  });

  // Verificar categorías
  Object.keys(stockCategorias).forEach((categoriaId) => {
    const stockCategoria = stockCategorias[categoriaId] || {};
    const minimosCategoria = minimosCategorias[categoriaId] || {};
    const categoria = categorias.find(c => c.id === categoriaId);
    
    Object.keys(stockCategoria).forEach((itemNombre) => {
      const stockActual = stockCategoria[itemNombre] || 0;
      const minimo = minimosCategoria[itemNombre] || 0;
      
      if (minimo > 0 && stockActual < minimo) {
        alertas.push({
          tipo: "categoria",
          categoriaId,
          categoriaNombre: categoria?.nombre,
          itemNombre,
          stockActual,
          stockMinimo: minimo,
          diferencia: minimo - stockActual,
        });
      }
    });
  });

  // Ordenar por diferencia (más crítico primero)
  return alertas.sort((a, b) => b.diferencia - a.diferencia);
}


