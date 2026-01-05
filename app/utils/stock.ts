import { obtenerColoresCombinadosSync } from "./colores";
import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_STOCK = "gst3d_stock";
const STOCK_ID = "stock_global";

export interface StockColor {
  tipo: string;
  color: string;
  stock: number;
}

export interface StockPorTipo {
  [tipo: string]: {
    [color: string]: number;
  };
}

/**
 * Carga stock desde Supabase
 */
async function cargarStockDesdeSupabase(): Promise<StockPorTipo> {
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('stock')
      .select('stock_data')
      .eq('id', STOCK_ID)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error al cargar stock de Supabase:', error);
      return {};
    }
    
    if (!data || !data.stock_data) return {};
    
    const stock = data.stock_data as StockPorTipo;
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stock));
    }
    
    return asegurarStockCompleto(stock);
  } catch (error) {
    console.error('Error al cargar stock de Supabase:', error);
    return {};
  }
}

/**
 * Guarda stock en Supabase
 */
async function guardarStockEnSupabase(stock: StockPorTipo): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    const { error } = await supabase
      .from('stock')
      .upsert({
        id: STOCK_ID,
        stock_data: stock,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar stock en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar stock en Supabase:', error);
    return false;
  }
}

// Obtener stock actual (versión asíncrona)
export async function obtenerStock(): Promise<StockPorTipo> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const stock = await cargarStockDesdeSupabase();
    if (Object.keys(stock).length > 0) {
      return stock;
    }
  }
  
  // Fallback a localStorage
  const stored = localStorage.getItem(STORAGE_KEY_STOCK);
  if (!stored) {
    // Inicializar stock en 0 para todos los colores
    return inicializarStock();
  }
  try {
    const stock = JSON.parse(stored);
    // Asegurar que todos los colores existan
    return asegurarStockCompleto(stock);
  } catch {
    return inicializarStock();
  }
}

// Versión síncrona para compatibilidad
export function obtenerStockSync(): StockPorTipo {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_STOCK);
  if (!stored) {
    return {};
  }
  try {
    const stock = JSON.parse(stored);
    return asegurarStockCompleto(stock);
  } catch {
    return {};
  }
}

// Inicializar stock en 0
async function inicializarStock(): Promise<StockPorTipo> {
  const stock: StockPorTipo = {};
  // Usar colores combinados para incluir colores personalizados
  const coloresCombinados = obtenerColoresCombinadosSync();
  Object.keys(coloresCombinados).forEach((tipo) => {
    stock[tipo] = {};
    const coloresChica = Object.keys(coloresCombinados[tipo].chica || {});
    const coloresGrande = Object.keys(coloresCombinados[tipo].grande || {});
    const todosColores = new Set([...coloresChica, ...coloresGrande]);
    todosColores.forEach((color) => {
      stock[tipo][color] = 0;
    });
  });
  await guardarStock(stock);
  return stock;
}

// Asegurar que el stock tenga todos los colores (incluyendo personalizados)
function asegurarStockCompleto(stock: StockPorTipo): StockPorTipo {
  const stockCompleto: StockPorTipo = { ...stock };
  // Usar colores combinados para incluir colores personalizados
  const coloresCombinados = obtenerColoresCombinadosSync();
  Object.keys(coloresCombinados).forEach((tipo) => {
    if (!stockCompleto[tipo]) {
      stockCompleto[tipo] = {};
    }
    const coloresChica = Object.keys(coloresCombinados[tipo].chica || {});
    const coloresGrande = Object.keys(coloresCombinados[tipo].grande || {});
    const todosColores = new Set([...coloresChica, ...coloresGrande]);
    todosColores.forEach((color) => {
      if (stockCompleto[tipo][color] === undefined) {
        stockCompleto[tipo][color] = 0;
      }
    });
  });
  // No guardar aquí, se guardará cuando se llame explícitamente
  return stockCompleto;
}

// Guardar stock (versión asíncrona)
async function guardarStock(stock: StockPorTipo): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stock));
  
  // Guardar en Supabase (asíncrono)
  await guardarStockEnSupabase(stock);
}

// Sumar al stock (versión asíncrona)
export async function sumarStock(tipo: string, color: string, cantidad: number): Promise<void> {
  // Intentar usar función atómica de Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('sumar_stock_atomico', {
        p_tipo: tipo,
        p_color: color,
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
  let stock = await obtenerStock();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  if (stock[tipo][color] === undefined) {
    stock[tipo][color] = 0;
  }
  stock[tipo][color] += cantidad;
  // Asegurar que el stock esté completo (incluye colores personalizados)
  stock = asegurarStockCompleto(stock);
  await guardarStock(stock);
}

// Versión síncrona para compatibilidad
export function sumarStockSync(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStockSync();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  if (stock[tipo][color] === undefined) {
    stock[tipo][color] = 0;
  }
  stock[tipo][color] += cantidad;
  stock = asegurarStockCompleto(stock);
  guardarStock(stock);
}

// Restar del stock (versión asíncrona)
export async function restarStock(tipo: string, color: string, cantidad: number): Promise<void> {
  // Intentar usar función atómica de Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('restar_stock_atomico', {
        p_tipo: tipo,
        p_color: color,
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
  let stock = await obtenerStock();
  if (!stock[tipo] || stock[tipo][color] === undefined) {
    return;
  }
  stock[tipo][color] = Math.max(0, stock[tipo][color] - cantidad);
  // Asegurar que el stock esté completo (incluye colores personalizados)
  stock = asegurarStockCompleto(stock);
  await guardarStock(stock);
}

// Versión síncrona para compatibilidad
export function restarStockSync(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStockSync();
  if (!stock[tipo] || stock[tipo][color] === undefined) {
    return;
  }
  stock[tipo][color] = Math.max(0, stock[tipo][color] - cantidad);
  stock = asegurarStockCompleto(stock);
  guardarStock(stock);
}

// Establecer stock manualmente (versión asíncrona)
export async function establecerStock(tipo: string, color: string, cantidad: number): Promise<void> {
  // Intentar usar función atómica de Supabase si está disponible
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase.rpc('establecer_stock_atomico', {
        p_tipo: tipo,
        p_color: color,
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
  let stock = await obtenerStock();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  stock[tipo][color] = Math.max(0, cantidad);
  
  // Asegurar que el stock esté completo después de establecer un valor
  // Esto garantiza que nuevos colores personalizados se incluyan
  stock = asegurarStockCompleto(stock);
  await guardarStock(stock);
}

// Versión síncrona para compatibilidad
export function establecerStockSync(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStockSync();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  stock[tipo][color] = Math.max(0, cantidad);
  stock = asegurarStockCompleto(stock);
  guardarStock(stock);
}

// Limpiar stock
export async function limpiarStock(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_STOCK);
  
  // Limpiar en Supabase también
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('stock').delete().eq('id', STOCK_ID);
    } catch (error) {
      console.error('Error al limpiar stock de Supabase:', error);
    }
  }
}

/**
 * Suscripción Realtime a cambios en stock
 */
export function suscribirStockRealtime(
  callback: (stock: StockPorTipo) => void
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  
  const subscription = supabase
    .channel('stock_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'stock',
        filter: `id=eq.${STOCK_ID}`
      },
      async () => {
        // Recargar stock desde Supabase cuando hay cambios
        const nuevoStock = await cargarStockDesdeSupabase();
        callback(nuevoStock);
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}


