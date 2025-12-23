import { coloresPorTipo } from "../data";

const STORAGE_KEY_COLORES_PERSONALIZADOS = "gst3d_colores_personalizados";
const STORAGE_KEY_COLORES_ELIMINADOS = "gst3d_colores_eliminados";

/**
 * Obtiene los colores personalizados desde localStorage
 */
export function obtenerColoresPersonalizados(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  if (typeof window === "undefined") return {};
  const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_PERSONALIZADOS);
  if (coloresGuardados) {
    try {
      return JSON.parse(coloresGuardados);
    } catch (e) {
      console.error("Error al cargar colores personalizados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Obtiene los colores eliminados desde localStorage
 */
export function obtenerColoresEliminados(): Record<string, {
  chica: string[];
  grande: string[];
}> {
  if (typeof window === "undefined") return {};
  const coloresEliminados = localStorage.getItem(STORAGE_KEY_COLORES_ELIMINADOS);
  if (coloresEliminados) {
    try {
      return JSON.parse(coloresEliminados);
    } catch (e) {
      console.error("Error al cargar colores eliminados:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los colores eliminados en localStorage
 */
export function guardarColoresEliminados(coloresEliminados: Record<string, {
  chica: string[];
  grande: string[];
}>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_COLORES_ELIMINADOS, JSON.stringify(coloresEliminados));
}

/**
 * Elimina un color (lo marca como eliminado)
 */
export function eliminarColor(tipo: string, variante: "chica" | "grande", nombre: string): void {
  const coloresEliminados = obtenerColoresEliminados();
  
  if (!coloresEliminados[tipo]) {
    coloresEliminados[tipo] = { chica: [], grande: [] };
  }
  
  if (!coloresEliminados[tipo][variante].includes(nombre)) {
    coloresEliminados[tipo][variante].push(nombre);
    guardarColoresEliminados(coloresEliminados);
    
    // Disparar evento para actualizar otros componentes
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("coloresActualizados"));
    }
  }
}

/**
 * Restaura un color eliminado
 */
export function restaurarColor(tipo: string, variante: "chica" | "grande", nombre: string): void {
  const coloresEliminados = obtenerColoresEliminados();
  
  if (coloresEliminados[tipo] && coloresEliminados[tipo][variante]) {
    coloresEliminados[tipo][variante] = coloresEliminados[tipo][variante].filter(c => c !== nombre);
    
    // Si no quedan colores eliminados en el tipo, eliminar el tipo
    if (coloresEliminados[tipo].chica.length === 0 && coloresEliminados[tipo].grande.length === 0) {
      delete coloresEliminados[tipo];
    }
    
    guardarColoresEliminados(coloresEliminados);
    
    // Disparar evento para actualizar otros componentes
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("coloresActualizados"));
    }
  }
}

/**
 * Combina los colores originales con los personalizados, excluyendo los eliminados
 */
export function obtenerColoresCombinados(): Record<string, {
  chica: Record<string, string>;
  grande: Record<string, string>;
}> {
  const coloresPersonalizados = obtenerColoresPersonalizados();
  const coloresEliminados = obtenerColoresEliminados();
  const combinados = { ...coloresPorTipo };
  
  // Agregar colores personalizados
  Object.keys(coloresPersonalizados).forEach((tipo) => {
    if (!combinados[tipo]) {
      combinados[tipo] = { chica: {}, grande: {} };
    }
    
    // Combinar colores chicos
    combinados[tipo].chica = {
      ...combinados[tipo].chica,
      ...coloresPersonalizados[tipo].chica,
    };
    
    // Combinar colores grandes
    combinados[tipo].grande = {
      ...combinados[tipo].grande,
      ...coloresPersonalizados[tipo].grande,
    };
  });
  
  // Eliminar colores marcados como eliminados
  Object.keys(coloresEliminados).forEach((tipo) => {
    if (combinados[tipo]) {
      // Eliminar colores chicos
      coloresEliminados[tipo].chica.forEach((color) => {
        delete combinados[tipo].chica[color];
      });
      
      // Eliminar colores grandes
      coloresEliminados[tipo].grande.forEach((color) => {
        delete combinados[tipo].grande[color];
      });
    }
  });
  
  return combinados;
}
