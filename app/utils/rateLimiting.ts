/**
 * Utilidad para gestionar rate limiting de impresiones por operador
 * Restricciones:
 * - Operadores: Máximo 2 etiquetas (1 chica + 1 grande) por impresión, sin límite de tiempo
 * - Administradores: Sin límite de tiempo ni cantidad (pueden imprimir cuantas quieran)
 */

const STORAGE_KEY_RATE_LIMIT = "gst3d_rate_limit_operadores";
const MAX_ETIQUETAS_OPERADOR = 2; // Operadores: máximo 2 etiquetas (1 chica + 1 grande) por impresión
const MAX_ETIQUETAS_ADMIN = 999999; // Administradores: sin límite (número muy alto para simular sin límite)
const VENTANA_TIEMPO_OPERADOR_MS = 0; // Sin límite de tiempo para operadores

interface RateLimitEntry {
  operadorId: string; // ID del operador (puede ser el nombre o PIN)
  timestamps: number[];
  cantidadEtiquetas: number[]; // Cantidad de etiquetas en cada impresión
}

/**
 * Obtiene el historial de impresiones por operador
 */
function obtenerHistorialRateLimit(): Record<string, RateLimitEntry> {
  if (typeof window === "undefined") return {};
  
  try {
    const historialGuardado = localStorage.getItem(STORAGE_KEY_RATE_LIMIT);
    if (historialGuardado) {
      return JSON.parse(historialGuardado);
    }
  } catch (error) {
    console.error("Error al cargar historial de rate limit:", error);
  }
  
  return {};
}

/**
 * Guarda el historial de impresiones por operador
 */
function guardarHistorialRateLimit(historial: Record<string, RateLimitEntry>): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY_RATE_LIMIT, JSON.stringify(historial));
  } catch (error) {
    console.error("Error al guardar historial de rate limit:", error);
  }
}

/**
 * Obtiene la cantidad máxima de etiquetas permitidas según el tipo de usuario
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @returns Cantidad máxima de etiquetas permitidas
 */
export function obtenerMaximoEtiquetas(esAdministrador: boolean): number {
  return esAdministrador ? MAX_ETIQUETAS_ADMIN : MAX_ETIQUETAS_OPERADOR;
}

/**
 * Verifica si se puede imprimir por operador (rate limiting)
 * @param operador ID del operador
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @param cantidadEtiquetas Cantidad de etiquetas que se quiere imprimir
 * @returns true si se puede imprimir, false si se alcanzó el límite
 */
export function puedeImprimir(operador: string, esAdministrador: boolean, cantidadEtiquetas: number): boolean {
  // Administradores: sin límite de cantidad ni tiempo
  if (esAdministrador) {
    return true;
  }

  // Operadores: validar cantidad (máximo 2 etiquetas: 1 chica + 1 grande)
  // Sin límite de tiempo - pueden imprimir cuando quieran
  return cantidadEtiquetas <= MAX_ETIQUETAS_OPERADOR;
}

/**
 * Registra un intento de impresión por operador
 * @param operador ID del operador
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @param cantidadEtiquetas Cantidad de etiquetas que se está imprimiendo
 * @returns true si se registró exitosamente, false si se alcanzó el límite
 */
export function registrarIntentoImpresion(operador: string, esAdministrador: boolean, cantidadEtiquetas: number): boolean {
  // Administradores: sin límite de cantidad ni tiempo - siempre permitido
  if (esAdministrador) {
    return true; // Administradores pueden imprimir sin restricciones
  }

  // Operadores: validar cantidad (máximo 2 etiquetas: 1 chica + 1 grande)
  // Sin límite de tiempo - pueden imprimir cuando quieran
  if (cantidadEtiquetas > MAX_ETIQUETAS_OPERADOR) {
    return false; // Operadores solo pueden imprimir máximo 2 etiquetas (1 chica + 1 grande)
  }

  // Limpiar timestamps antiguos de TODOS los operadores para mantener el historial limpio
  limpiarTimestampsAntiguos();

  // Registrar la impresión (sin límite de tiempo)
  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();

  // Obtener o crear entrada para este operador
  let entrada = historial[operador] || { operadorId: operador, timestamps: [], cantidadEtiquetas: [] };

  // Verificar que la entrada tenga arrays válidos
  if (!entrada.timestamps || !Array.isArray(entrada.timestamps)) {
    entrada.timestamps = [];
  }
  if (!entrada.cantidadEtiquetas || !Array.isArray(entrada.cantidadEtiquetas)) {
    entrada.cantidadEtiquetas = [];
  }

  // Agregar nuevo timestamp y cantidad (sin verificar límites de tiempo)
  entrada.timestamps.push(ahora);
  entrada.cantidadEtiquetas.push(cantidadEtiquetas);
  historial[operador] = entrada;

  // Guardar historial
  guardarHistorialRateLimit(historial);

  return true;
}

/**
 * Obtiene el tiempo restante hasta que se pueda imprimir nuevamente
 * @param operador ID del operador
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @returns Tiempo en milisegundos hasta que se pueda imprimir, o 0 si se puede imprimir ahora
 */
export function obtenerTiempoRestante(operador: string, esAdministrador: boolean): number {
  // Tanto administradores como operadores: no tienen límite de tiempo
  // Los operadores solo tienen límite de cantidad (máximo 2 etiquetas por impresión)
  return 0;
}

/**
 * Formatea el tiempo restante en un string legible
 * @param tiempoRestante Tiempo en milisegundos
 * @returns String formateado (ej: "45 minutos")
 */
export function formatearTiempoRestante(tiempoRestante: number): string {
  if (tiempoRestante <= 0) {
    return "ahora";
  }
  
  const minutos = Math.ceil(tiempoRestante / (60 * 1000));
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  
  if (horas > 0) {
    return `${horas} ${horas === 1 ? "hora" : "horas"}${minutosRestantes > 0 ? ` y ${minutosRestantes} ${minutosRestantes === 1 ? "minuto" : "minutos"}` : ""}`;
  }
  
  return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
}

/**
 * Limpia el historial completo de rate limiting (útil para debugging o reset)
 * @param operadorId Opcional: ID de operador específico a limpiar, o undefined para limpiar todo
 */
export function limpiarHistorialRateLimit(operadorId?: string): void {
  if (typeof window === "undefined") return;
  
  try {
    if (operadorId !== undefined) {
      // Limpiar solo un operador específico
      const historial = obtenerHistorialRateLimit();
      delete historial[operadorId];
      guardarHistorialRateLimit(historial);
    } else {
      // Limpiar todo el historial
      localStorage.removeItem(STORAGE_KEY_RATE_LIMIT);
    }
  } catch (error) {
    console.error("Error al limpiar historial de rate limit:", error);
  }
}

/**
 * Limpia automáticamente timestamps antiguos de todos los operadores
 * Se puede llamar periódicamente para mantener el historial limpio
 */
export function limpiarTimestampsAntiguos(): void {
  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  let historialModificado = false;
  
  Object.keys(historial).forEach((key) => {
    const operadorId = key;
    const entrada = historial[operadorId];
    
    if (!entrada || !entrada.timestamps || entrada.timestamps.length === 0) {
      return;
    }
    
    // Filtrar timestamps antiguos
    const indicesValidos: number[] = [];
    entrada.timestamps.forEach((ts, index) => {
      if (ts > limiteTiempo) {
        indicesValidos.push(index);
      }
    });
    
    const timestampsActualizados = entrada.timestamps.filter((_, index) => indicesValidos.includes(index));
    const cantidadesActualizadas = entrada.cantidadEtiquetas.filter((_, index) => indicesValidos.includes(index));
    
    if (timestampsActualizados.length !== entrada.timestamps.length) {
      entrada.timestamps = timestampsActualizados;
      entrada.cantidadEtiquetas = cantidadesActualizadas;
      historial[operadorId] = entrada;
      historialModificado = true;
      
      // Si no quedan timestamps, eliminar la entrada completa
      if (entrada.timestamps.length === 0) {
        delete historial[operadorId];
      }
    }
  });
  
  if (historialModificado) {
    guardarHistorialRateLimit(historial);
  }
}


