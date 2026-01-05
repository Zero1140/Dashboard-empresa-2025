import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

const STOCK_MINIMOS_ID = "minimos_global";

export interface StockMinimosMateriales {
  [tipo: string]: {
    [color: string]: number;
  };
}

export interface StockMinimosCategorias {
  [categoriaId: string]: {
    [itemNombre: string]: number;
  };
}

/**
 * Carga stock mínimos desde Supabase
 */
async function cargarStockMinimosDesdeSupabase(): Promise<{
  materiales: StockMinimosMateriales;
  categorias: StockMinimosCategorias;
}> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('stock_minimos')
      .select('*')
      .eq('id', STOCK_MINIMOS_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw new SupabaseConnectionError(`Error al cargar stock mínimos desde Supabase: ${error.message}`);
    }
    
    if (!data) {
      return { materiales: {}, categorias: {} };
    }
    
    // Parsear datos JSONB
    const materiales = (data.materiales_data as any) || {};
    const categorias = (data.categorias_data as any) || {};
    
    return { materiales, categorias };
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar stock mínimos desde Supabase: ${error}`);
  }
}

/**
 * Guarda stock mínimos en Supabase
 */
async function guardarStockMinimosEnSupabase(
  materiales: StockMinimosMateriales,
  categorias: StockMinimosCategorias
): Promise<void> {
  requireSupabase();
  
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
      throw new SupabaseConnectionError(`Error al guardar stock mínimos en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar stock mínimos en Supabase: ${error}`);
  }
}

/**
 * Obtiene los niveles mínimos configurados para materiales (versión asíncrona)
 */
export async function obtenerStockMinimosMateriales(): Promise<StockMinimosMateriales> {
  if (typeof window === "undefined") return {};
  
  const datos = await cargarStockMinimosDesdeSupabase();
  return datos.materiales;
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockMinimosMaterialesSync(): StockMinimosMateriales {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerStockMinimosMaterialesSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda los niveles mínimos para materiales (en Supabase y localStorage)
 */
export async function guardarStockMinimosMateriales(minimos: StockMinimosMateriales): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Cargar categorías actuales para guardar ambas
  const categorias = await obtenerStockMinimosCategorias();
  
  // Guardar en Supabase
  await guardarStockMinimosEnSupabase(minimos, categorias);
  
  // Disparar evento local
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("stockMinimosActualizados"));
  }
}

/**
 * Establece el nivel mínimo para un material específico
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
 * Elimina el nivel mínimo para un material específico
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
  
  const datos = await cargarStockMinimosDesdeSupabase();
  return datos.categorias;
}

/**
 * Versión síncrona para compatibilidad
 */
export function obtenerStockMinimosCategoriasSync(): StockMinimosCategorias {
  if (typeof window === "undefined") return {};
  
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerStockMinimosCategoriasSync() devolverá un objeto vacío.');
    return {};
  }
  
  return {};
}

/**
 * Guarda los niveles mínimos para categorías (en Supabase y localStorage)
 */
export async function guardarStockMinimosCategorias(minimos: StockMinimosCategorias): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Cargar materiales actuales para guardar ambas
  const materiales = await obtenerStockMinimosMateriales();
  
  // Guardar en Supabase
  await guardarStockMinimosEnSupabase(materiales, minimos);
  
  // Disparar evento local
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("stockMinimosActualizados"));
  }
}

/**
 * Establece el nivel mínimo para un item de categoría específico
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
 * Elimina el nivel mínimo para un item de categoría específico
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

/**
 * Suscripción Realtime a cambios en stock mínimos
 */
export function suscribirStockMinimosRealtime(
  callback: (data: { materiales: StockMinimosMateriales; categorias: StockMinimosCategorias }) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('stock_minimos_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'stock_minimos',
        filter: `id=eq.${STOCK_MINIMOS_ID}`
      },
      async () => {
        try {
          const datos = await cargarStockMinimosDesdeSupabase();
          callback(datos);
        } catch (error) {
          console.error('Error al recargar stock mínimos en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}
