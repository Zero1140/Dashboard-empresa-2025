const STORAGE_KEY_STOCK_CATEGORIAS = "gst3d_stock_categorias";

export interface StockCategoria {
  [categoriaId: string]: {
    [itemNombre: string]: number;
  };
}

/**
 * Obtiene el stock de categorías
 */
export function obtenerStockCategorias(): StockCategoria {
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
 * Guarda el stock de categorías
 */
function guardarStockCategorias(stock: StockCategoria): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STOCK_CATEGORIAS, JSON.stringify(stock));
}

/**
 * Establece el stock de un item en una categoría
 */
export function establecerStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategorias();
  if (!stock[categoriaId]) {
    stock[categoriaId] = {};
  }
  stock[categoriaId][itemNombre] = Math.max(0, cantidad);
  guardarStockCategorias(stock);
}

/**
 * Obtiene el stock de un item en una categoría
 */
export function obtenerStockItem(categoriaId: string, itemNombre: string): number {
  const stock = obtenerStockCategorias();
  return stock[categoriaId]?.[itemNombre] || 0;
}

/**
 * Suma stock a un item en una categoría
 */
export function sumarStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategorias();
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
 * Resta stock de un item en una categoría
 */
export function restarStockCategoria(categoriaId: string, itemNombre: string, cantidad: number): void {
  const stock = obtenerStockCategorias();
  if (!stock[categoriaId] || stock[categoriaId][itemNombre] === undefined) {
    return;
  }
  stock[categoriaId][itemNombre] = Math.max(0, stock[categoriaId][itemNombre] - cantidad);
  guardarStockCategorias(stock);
}


