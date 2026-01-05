import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_STOCK_CATEGORIAS = "gst3d_stock_categorias";
const STOCK_CATEGORIAS_ID = "categorias_global";

export interface StockCategoria {
  [categoriaId: string]: {
    [itemNombre: string]: number;
  };
}

/**
 * Carga stock de categorías desde Supabase
 */
async function cargarStockCategoriasDesdeSupabase(): Promise<StockCategoria> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('stock_categorias')
      .select('stock_data')
      .eq('id', STOCK_CATEGORIAS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error al cargar stock de categorías de Supabase:', error);
      return {};
    }
    
    if (!data || !data.stock_data) return {};
    
    const stock = data.stock_data as StockCategoria;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_STOCK_CATEGORIAS, JSON.stringify(stock));
    }
    
    return stock;
  } catch (error) {
    console.error('Error al cargar stock de categorías de Supabase:', error);
    return {};
  }
}

/**
 * Guarda stock de categorías en Supabase
 */
async function guardarStockCategoriasEnSupabase(stock: StockCategoria): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('stock_categorias')
      .upsert({
        id: STOCK_CATEGORIAS_ID,
        stock_data: stock,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar stock de categorías en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar stock de categorías en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene el stock de categorías (versión asíncrona)
 */
export async function obtenerStockCategorias(): Promise<StockCategoria> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const stock = await cargarStockCategoriasDesdeSupabase();
    if (Object.keys(stock).length > 0) {
      return stock;
    }
  }
  
  // Fallback a localStorage
  const stockGuardado = localStorage.getItem(STORAGE_KEY_STOCK_CATEGORIAS);
  if (stockGuardado) {
    try {
      return JSON.parse(stockGuardado);
    } catch (e) {
      console.error("Error al cargar stock de categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockCategoriasSync(): StockCategoria {
  if (typeof window === "undefined") return {};
  const stockGuardado = localStorage.getItem(STORAGE_KEY_STOCK_CATEGORIAS);
  if (stockGuardado) {
    try {
      return JSON.parse(stockGuardado);
    } catch (e) {
      console.error("Error al cargar stock de categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda el stock de categorías (versión asíncrona)
 */
async function guardarStockCategorias(stock: StockCategoria): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_STOCK_CATEGORIAS, JSON.stringify(stock));
  
  // Guardar en Supabase (asíncrono)
  await guardarStockCategoriasEnSupabase(stock);
}

/**
 * Establece el stock de un item en una categoría (versión asíncrona)
 */
export async function establecerStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): Promise<void> {
  const stock = await obtenerStockCategorias();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  stock[categoriaId][itemNombre] = Math.max(0, cantidad);
  await guardarStockCategorias(stock);
}

/**
 * Versión síncrona para compatibilidad
 */
export function establecerStockCategoriaSync(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategoriasSync();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  stock[categoriaId][itemNombre] = Math.max(0, cantidad);
  guardarStockCategorias(stock);
}

/**
 * Obtiene el stock de un item en una categoría (versión asíncrona)
 */
export async function obtenerStockItem(categoriaId: string, itemNombre: string): Promise<number> {
  const stock = await obtenerStockCategorias();
  return stock[categoriaId]?.[itemNombre] || 0;
}

/**
 * Versión síncrona para compatibilidad (puede devolver datos desactualizados)
 */
export function obtenerStockItemSync(categoriaId: string, itemNombre: string): number {
  const stock = obtenerStockCategoriasSync();
  return stock[categoriaId]?.[itemNombre] || 0;
}

/**
 * Suma stock a un item en una categoría (versión asíncrona)
 */
export async function sumarStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): Promise<void> {
  const stock = await obtenerStockCategorias();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  if (stock[categoriaId][itemNombre] === undefined) {
    stock[categoriaId][itemNombre] = 0;
  }
  stock[categoriaId][itemNombre] += cantidad;
  await guardarStockCategorias(stock);
}

/**
 * Versión síncrona para compatibilidad
 */
export function sumarStockCategoriaSync(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategoriasSync();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  if (stock[categoriaId][itemNombre] === undefined) {
    stock[categoriaId][itemNombre] = 0;
  }
  stock[categoriaId][itemNombre] += cantidad;
  guardarStockCategorias(stock);
}

/**
 * Resta stock de un item en una categoría (versión asíncrona)
 */
export async function restarStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): Promise<void> {
  const stock = await obtenerStockCategorias();
  if (!stock[categoriaId] || stock[categoriaId][itemNombre] === undefined) {
    return;
  }
  stock[categoriaId][itemNombre] = Math.max(0, stock[categoriaId][itemNombre] - cantidad);
  await guardarStockCategorias(stock);
}

/**
 * Versión síncrona para compatibilidad
 */
export function restarStockCategoriaSync(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategoriasSync();
  if (!stock[categoriaId] || stock[categoriaId][itemNombre] === undefined) {
    return;
  }
  stock[categoriaId][itemNombre] = Math.max(0, stock[categoriaId][itemNombre] - cantidad);
  guardarStockCategorias(stock);
}

/**
 * Suscripción Realtime a cambios en stock de categorías
 */
export function suscribirStockCategoriasRealtime(
  callback: (stock: StockCategoria) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const subscription = supabase
    .channel('stock_categorias_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'stock_categorias',
        filter: `id=eq.${STOCK_CATEGORIAS_ID}`
      },
      async () => {
        // Recargar stock desde Supabase cuando hay cambios
        const nuevoStock = await cargarStockCategoriasDesdeSupabase();
        callback(nuevoStock);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}


