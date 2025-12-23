/**
 * Utilidades para gestionar niveles mínimos de stock
 */

const STORAGE_KEY_STOCK_MINIMOS_MATERIALES = "gst3d_stock_minimos_materiales";
const STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS = "gst3d_stock_minimos_categorias";

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
 * Obtiene los niveles mínimos configurados para materiales
 */
export function obtenerStockMinimosMateriales(): StockMinimosMateriales {
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
 * Guarda los niveles mínimos de materiales
 */
export function guardarStockMinimosMateriales(minimos: StockMinimosMateriales): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_MATERIALES, JSON.stringify(minimos));
}

/**
 * Establece el nivel mínimo para un color específico
 */
export function establecerMinimoMaterial(tipo: string, color: string, minimo: number): void {
  const minimos = obtenerStockMinimosMateriales();
  if (!minimos[tipo]) {
    minimos[tipo] = {};
  }
  minimos[tipo][color] = minimo;
  guardarStockMinimosMateriales(minimos);
}

/**
 * Elimina el nivel mínimo de un color (usa el valor por defecto)
 */
export function eliminarMinimoMaterial(tipo: string, color: string): void {
  const minimos = obtenerStockMinimosMateriales();
  if (minimos[tipo]) {
    delete minimos[tipo][color];
    if (Object.keys(minimos[tipo]).length === 0) {
      delete minimos[tipo];
    }
    guardarStockMinimosMateriales(minimos);
  }
}

/**
 * Obtiene el nivel mínimo para un color específico (retorna 0 si no está configurado)
 */
export function obtenerMinimoMaterial(tipo: string, color: string): number {
  const minimos = obtenerStockMinimosMateriales();
  return minimos[tipo]?.[color] || 0;
}

/**
 * Obtiene los niveles mínimos configurados para categorías
 */
export function obtenerStockMinimosCategorias(): StockMinimosCategorias {
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
 * Guarda los niveles mínimos de categorías
 */
export function guardarStockMinimosCategorias(minimos: StockMinimosCategorias): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STOCK_MINIMOS_CATEGORIAS, JSON.stringify(minimos));
}

/**
 * Establece el nivel mínimo para un item de categoría específico
 */
export function establecerMinimoCategoria(categoriaId: string, itemNombre: string, minimo: number): void {
  const minimos = obtenerStockMinimosCategorias();
  if (!minimos[categoriaId]) {
    minimos[categoriaId] = {};
  }
  minimos[categoriaId][itemNombre] = minimo;
  guardarStockMinimosCategorias(minimos);
}

/**
 * Elimina el nivel mínimo de un item de categoría
 */
export function eliminarMinimoCategoria(categoriaId: string, itemNombre: string): void {
  const minimos = obtenerStockMinimosCategorias();
  if (minimos[categoriaId]) {
    delete minimos[categoriaId][itemNombre];
    if (Object.keys(minimos[categoriaId]).length === 0) {
      delete minimos[categoriaId];
    }
    guardarStockMinimosCategorias(minimos);
  }
}

/**
 * Obtiene el nivel mínimo para un item de categoría específico (retorna 0 si no está configurado)
 */
export function obtenerMinimoCategoria(categoriaId: string, itemNombre: string): number {
  const minimos = obtenerStockMinimosCategorias();
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
  const minimosMateriales = obtenerStockMinimosMateriales();
  const minimosCategorias = obtenerStockMinimosCategorias();

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


