import { obtenerColoresCombinados } from "./colores";

const STORAGE_KEY_STOCK = "gst3d_stock";

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

// Obtener stock actual
export function obtenerStock(): StockPorTipo {
  if (typeof window === "undefined") return {};
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

// Inicializar stock en 0
function inicializarStock(): StockPorTipo {
  const stock: StockPorTipo = {};
  // Usar colores combinados para incluir colores personalizados
  const coloresCombinados = obtenerColoresCombinados();
  Object.keys(coloresCombinados).forEach((tipo) => {
    stock[tipo] = {};
    const coloresChica = Object.keys(coloresCombinados[tipo].chica || {});
    const coloresGrande = Object.keys(coloresCombinados[tipo].grande || {});
    const todosColores = new Set([...coloresChica, ...coloresGrande]);
    todosColores.forEach((color) => {
      stock[tipo][color] = 0;
    });
  });
  guardarStock(stock);
  return stock;
}

// Asegurar que el stock tenga todos los colores (incluyendo personalizados)
function asegurarStockCompleto(stock: StockPorTipo): StockPorTipo {
  const stockCompleto: StockPorTipo = { ...stock };
  // Usar colores combinados para incluir colores personalizados
  const coloresCombinados = obtenerColoresCombinados();
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
  guardarStock(stockCompleto);
  return stockCompleto;
}

// Guardar stock
function guardarStock(stock: StockPorTipo): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_STOCK, JSON.stringify(stock));
}

// Sumar al stock
export function sumarStock(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStock();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  if (stock[tipo][color] === undefined) {
    stock[tipo][color] = 0;
  }
  stock[tipo][color] += cantidad;
  // Asegurar que el stock esté completo (incluye colores personalizados)
  stock = asegurarStockCompleto(stock);
}

// Restar del stock
export function restarStock(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStock();
  if (!stock[tipo] || stock[tipo][color] === undefined) {
    return;
  }
  stock[tipo][color] = Math.max(0, stock[tipo][color] - cantidad);
  // Asegurar que el stock esté completo (incluye colores personalizados)
  stock = asegurarStockCompleto(stock);
}

// Establecer stock manualmente
export function establecerStock(tipo: string, color: string, cantidad: number): void {
  let stock = obtenerStock();
  if (!stock[tipo]) {
    stock[tipo] = {};
  }
  stock[tipo][color] = Math.max(0, cantidad);
  
  // Asegurar que el stock esté completo después de establecer un valor
  // Esto garantiza que nuevos colores personalizados se incluyan
  stock = asegurarStockCompleto(stock);
}

// Limpiar stock
export function limpiarStock(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_STOCK);
}


