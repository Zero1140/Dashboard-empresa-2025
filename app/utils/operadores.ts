import { OPERADORES } from "../data";

const STORAGE_KEY_OPERADORES_PERSONALIZADOS = "gst3d_operadores_personalizados";

/**
 * Obtiene los operadores personalizados desde localStorage
 */
export function obtenerOperadoresPersonalizados(): string[] {
  if (typeof window === "undefined") return [];
  const operadoresGuardados = localStorage.getItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS);
  if (operadoresGuardados) {
    try {
      return JSON.parse(operadoresGuardados);
    } catch (e) {
      console.error("Error al cargar operadores personalizados:", e);
      return [];
    }
  }
  return [];
}

/**
 * Guarda los operadores personalizados en localStorage
 */
export function guardarOperadoresPersonalizados(operadores: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_OPERADORES_PERSONALIZADOS, JSON.stringify(operadores));
}

/**
 * Combina los operadores originales con los personalizados, excluyendo los eliminados
 */
export function obtenerOperadoresCombinados(): string[] {
  const operadoresPersonalizados = obtenerOperadoresPersonalizados();
  const operadoresEliminados = obtenerOperadoresEliminados();
  const operadoresCombinados = [...OPERADORES, ...operadoresPersonalizados];
  
  // Filtrar los eliminados
  const operadoresFiltrados = operadoresCombinados.filter(
    op => !operadoresEliminados.includes(op)
  );
  
  // Eliminar duplicados y ordenar
  return Array.from(new Set(operadoresFiltrados)).sort();
}

/**
 * Agrega un nuevo operador
 */
export function agregarOperador(nombre: string): void {
  const operadoresPersonalizados = obtenerOperadoresPersonalizados();
  const nombreNormalizado = nombre.trim();
  
  if (!nombreNormalizado) return;
  
  // Verificar que no exista ya
  const operadoresCombinados = obtenerOperadoresCombinados();
  if (operadoresCombinados.includes(nombreNormalizado)) {
    return;
  }
  
  operadoresPersonalizados.push(nombreNormalizado);
  guardarOperadoresPersonalizados(operadoresPersonalizados);
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("operadoresActualizados"));
  }
}

/**
 * Elimina un operador
 * Si es original, lo marca como eliminado en una lista separada
 * Si es personalizado, lo elimina directamente
 */
const STORAGE_KEY_OPERADORES_ELIMINADOS = "gst3d_operadores_eliminados";

function obtenerOperadoresEliminados(): string[] {
  if (typeof window === "undefined") return [];
  const eliminados = localStorage.getItem(STORAGE_KEY_OPERADORES_ELIMINADOS);
  if (eliminados) {
    try {
      return JSON.parse(eliminados);
    } catch (e) {
      return [];
    }
  }
  return [];
}

function guardarOperadoresEliminados(eliminados: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_OPERADORES_ELIMINADOS, JSON.stringify(eliminados));
}

export function eliminarOperador(nombre: string): void {
  const nombreNormalizado = nombre.trim();
  
  if (OPERADORES.includes(nombreNormalizado)) {
    // Es un operador original, marcarlo como eliminado
    const eliminados = obtenerOperadoresEliminados();
    if (!eliminados.includes(nombreNormalizado)) {
      eliminados.push(nombreNormalizado);
      guardarOperadoresEliminados(eliminados);
    }
  } else {
    // Es un operador personalizado, eliminarlo directamente
    const operadoresPersonalizados = obtenerOperadoresPersonalizados();
    const nuevosOperadores = operadoresPersonalizados.filter(op => op !== nombreNormalizado);
    guardarOperadoresPersonalizados(nuevosOperadores);
  }
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("operadoresActualizados"));
  }
}

/**
 * Restaura un operador eliminado
 */
export function restaurarOperador(nombre: string): void {
  const eliminados = obtenerOperadoresEliminados();
  const nuevosEliminados = eliminados.filter(op => op !== nombre);
  guardarOperadoresEliminados(nuevosEliminados);
  
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("operadoresActualizados"));
  }
}

