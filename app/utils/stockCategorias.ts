import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

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
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('stock_categorias')
      .select('stock_data')
      .eq('id', STOCK_CATEGORIAS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar stock de categorías de Supabase: ${error.message}`);
    }
    
    if (!data || !data.stock_data) return {};
    
    return data.stock_data as StockCategoria;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar stock de categorías de Supabase: ${error}`);
  }
}

/**
 * Guarda stock de categorías en Supabase
 */
async function guardarStockCategoriasEnSupabase(stock: StockCategoria): Promise<void> {
  requireSupabase();
  
  try {
    const { error } = await supabase
      .from('stock_categorias')
      .upsert({
        id: STOCK_CATEGORIAS_ID,
        stock_data: stock,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar stock de categorías en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar stock de categorías en Supabase: ${error}`);
  }
}

/**
 * Obtiene el stock de categorías (versión asíncrona)
 */
export async function obtenerStockCategorias(): Promise<StockCategoria> {
  if (typeof window === "undefined") return {};
  
  return await cargarStockCategoriasDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockCategoriasSync(): StockCategoria {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerStockCategoriasSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda el stock de categorías (versión asíncrona)
 */
async function guardarStockCategorias(stock: StockCategoria): Promise<void> {
  if (typeof window === "undefined") return;
  
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
  // Intentar usar función atómica de Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('sumar_stock_categoria_atomico', {
        p_categoria_id: categoriaId,
        p_item_nombre: itemNombre,
        p_cantidad: cantidad
      });
      
      if (!error) {
        // Éxito con función atómica
        return;
      } else {
        // Si falla la función atómica, usar método tradicional
        console.warn('Función atómica no disponible, usando método tradicional:', error);
      }
    } catch (error) {
      // Si la función no existe, usar método tradicional
      console.warn('Función atómica no disponible, usando método tradicional:', error);
    }
  }
  
  // Método tradicional (fallback)
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
 * Versión síncrona para compatibilidad (solo modifica datos locales, NO guarda)
 * NOTA: Esta función NO guarda en Supabase. Para guardar, usar sumarStockCategoria() async.
 */
export function sumarStockCategoriaSync(categoriaId: string, itemNombre: string, cantidad: number): StockCategoria {
  const stock = obtenerStockCategoriasSync();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  if (stock[categoriaId][itemNombre] === undefined) {
    stock[categoriaId][itemNombre] = 0;
  }
  stock[categoriaId][itemNombre] += cantidad;
  // NO guardar aquí - las funciones sync solo modifican datos locales
  return stock;
}

/**
 * Resta stock de un item en una categoría (versión asíncrona)
 */
export async function restarStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): Promise<void> {
  // Intentar usar función atómica de Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('restar_stock_categoria_atomico', {
        p_categoria_id: categoriaId,
        p_item_nombre: itemNombre,
        p_cantidad: cantidad
      });
      
      if (!error) {
        // Éxito con función atómica
        return;
      } else {
        // Si falla la función atómica, usar método tradicional
        console.warn('Función atómica no disponible, usando método tradicional:', error);
      }
    } catch (error) {
      // Si la función no existe, usar método tradicional
      console.warn('Función atómica no disponible, usando método tradicional:', error);
    }
  }
  
  // Método tradicional (fallback)
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
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
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
        try {
          const nuevoStock = await cargarStockCategoriasDesdeSupabase();
          callback(nuevoStock);
        } catch (error) {
          console.error('Error al recargar stock de categorías en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}


