/**
 * Utilidad para gestionar rate limiting de impresiones por máquina
 * Restricciones:
 * - Operadores: Máximo 1 bobina (2 etiquetas: 1 chica + 1 grande) cada 2 minutos
 * - Administradores: Hasta 10 etiquetas sin límite de tiempo
 */

const STORAGE_KEY_RATE_LIMIT = "gst3d_rate_limit_maquinas";
const MAX_ETIQUETAS_OPERADOR = 2; // Operadores: 1 bobina = 1 chica + 1 grande = 2 etiquetas
const MAX_ETIQUETAS_ADMIN = 10; // Administradores: hasta 10 etiquetas
const VENTANA_TIEMPO_OPERADOR_MS = 2 * 60 * 1000; // 2 minutos en milisegundos

interface RateLimitEntry {
  maquinaId: number;
  timestamps: number[];
  cantidadEtiquetas: number[]; // Cantidad de etiquetas en cada impresión
}

/**
 * Obtiene el historial de clicks por máquina
 */
function obtenerHistorialRateLimit(): Record<number, RateLimitEntry> {
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
 * Guarda el historial de clicks por máquina
 */
function guardarHistorialRateLimit(historial: Record<number, RateLimitEntry>): void {
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
 * Verifica si se puede imprimir en una máquina (rate limiting)
 * @param maquinaId ID de la máquina
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @param cantidadEtiquetas Cantidad de etiquetas que se quiere imprimir
 * @returns true si se puede imprimir, false si se alcanzó el límite
 */
export function puedeImprimir(maquinaId: number, esAdministrador: boolean, cantidadEtiquetas: number): boolean {
  // Administradores: validar solo cantidad máxima (hasta 10)
  if (esAdministrador) {
    return cantidadEtiquetas <= MAX_ETIQUETAS_ADMIN;
  }
  
  // Operadores: validar cantidad (máximo 1) y tiempo (cada 2 minutos)
  if (cantidadEtiquetas > MAX_ETIQUETAS_OPERADOR) {
    return false;
  }
  
  // Limpiar timestamps antiguos de todas las máquinas antes de verificar
  limpiarTimestampsAntiguos();
  
  const historial = obtenerHistorialRateLimit();
  const entrada = historial[maquinaId];
  
  if (!entrada) {
    return true; // No hay historial, se puede imprimir
  }
  
  // Limpiar timestamps antiguos (fuera de la ventana de 2 minutos)
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  
  // Filtrar timestamps y cantidades que están dentro de la ventana de tiempo
  const indicesValidos: number[] = [];
  entrada.timestamps.forEach((ts, index) => {
    if (ts > limiteTiempo) {
      indicesValidos.push(index);
    }
  });
  
  const timestampsActualizados = entrada.timestamps.filter((_, index) => indicesValidos.includes(index));
  const cantidadesActualizadas = entrada.cantidadEtiquetas.filter((_, index) => indicesValidos.includes(index));
  
  // IMPORTANTE: Actualizar el historial limpiado para que los timestamps antiguos se eliminen permanentemente
  if (timestampsActualizados.length !== entrada.timestamps.length) {
    entrada.timestamps = timestampsActualizados;
    entrada.cantidadEtiquetas = cantidadesActualizadas;
    historial[maquinaId] = entrada;
    guardarHistorialRateLimit(historial);
  }
  
  // Si no hay impresiones recientes (últimos 2 minutos), se puede imprimir
  return timestampsActualizados.length === 0;
}

/**
 * Registra un intento de impresión en una máquina
 * @param maquinaId ID de la máquina
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @param cantidadEtiquetas Cantidad de etiquetas que se está imprimiendo
 * @returns true si se registró exitosamente, false si se alcanzó el límite
 */
export function registrarIntentoImpresion(maquinaId: number, esAdministrador: boolean, cantidadEtiquetas: number): boolean {
  // Administradores: no se registra en rate limiting, pueden imprimir sin límite de tiempo
  if (esAdministrador) {
    if (cantidadEtiquetas > MAX_ETIQUETAS_ADMIN) {
      return false; // Límite de cantidad alcanzado
    }
    return true; // Administradores no tienen límite de tiempo
  }
  
  // Operadores: validar cantidad y tiempo
  // NOTA: MAX_ETIQUETAS_OPERADOR = 2 porque 1 bobina = 1 chica + 1 grande = 2 etiquetas físicas
  if (cantidadEtiquetas > MAX_ETIQUETAS_OPERADOR) {
    return false; // Operadores solo pueden imprimir 1 bobina (2 etiquetas)
  }
  
  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();
  
  // Obtener o crear entrada para esta máquina
  let entrada = historial[maquinaId] || { maquinaId, timestamps: [], cantidadEtiquetas: [] };
  
  // Limpiar timestamps antiguos (fuera de la ventana de 2 minutos)
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  const indicesValidos: number[] = [];
  entrada.timestamps.forEach((ts, index) => {
    if (ts > limiteTiempo) {
      indicesValidos.push(index);
    }
  });
  
  entrada.timestamps = entrada.timestamps.filter((_, index) => indicesValidos.includes(index));
  entrada.cantidadEtiquetas = entrada.cantidadEtiquetas.filter((_, index) => indicesValidos.includes(index));
  
  // Verificar si se puede imprimir (no debe haber impresiones en los últimos 2 minutos)
  if (entrada.timestamps.length > 0) {
    return false; // Límite de tiempo alcanzado
  }
  
  // Agregar nuevo timestamp y cantidad
  entrada.timestamps.push(ahora);
  entrada.cantidadEtiquetas.push(cantidadEtiquetas);
  historial[maquinaId] = entrada;
  
  // Guardar historial
  guardarHistorialRateLimit(historial);
  
  return true;
}

/**
 * Obtiene el tiempo restante hasta que se pueda imprimir nuevamente
 * @param maquinaId ID de la máquina
 * @param esAdministrador true si el usuario es administrador/supervisor
 * @returns Tiempo en milisegundos hasta que se pueda imprimir, o 0 si se puede imprimir ahora
 */
export function obtenerTiempoRestante(maquinaId: number, esAdministrador: boolean): number {
  // Administradores: no tienen límite de tiempo
  if (esAdministrador) {
    return 0;
  }
  
  const historial = obtenerHistorialRateLimit();
  const entrada = historial[maquinaId];
  
  if (!entrada || entrada.timestamps.length === 0) {
    return 0; // No hay historial, se puede imprimir ahora
  }
  
  // Limpiar timestamps antiguos (fuera de la ventana de 2 minutos)
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  
  // Filtrar timestamps y cantidades que están dentro de la ventana de tiempo
  const indicesValidos: number[] = [];
  entrada.timestamps.forEach((ts, index) => {
    if (ts > limiteTiempo) {
      indicesValidos.push(index);
    }
  });
  
  const timestampsActualizados = entrada.timestamps.filter((_, index) => indicesValidos.includes(index));
  const cantidadesActualizadas = entrada.cantidadEtiquetas.filter((_, index) => indicesValidos.includes(index));
  
  // Actualizar el historial si hay timestamps antiguos que limpiar
  if (timestampsActualizados.length !== entrada.timestamps.length) {
    entrada.timestamps = timestampsActualizados;
    entrada.cantidadEtiquetas = cantidadesActualizadas;
    historial[maquinaId] = entrada;
    guardarHistorialRateLimit(historial);
  }
  
  if (timestampsActualizados.length === 0) {
    return 0; // Se puede imprimir ahora
  }
  
  // Obtener el timestamp más reciente
  const timestampMasReciente = Math.max(...timestampsActualizados);
  const tiempoTranscurrido = ahora - timestampMasReciente;
  const tiempoRestante = VENTANA_TIEMPO_OPERADOR_MS - tiempoTranscurrido;
  
  return Math.max(0, tiempoRestante);
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
 * @param maquinaId Opcional: ID de máquina específica a limpiar, o undefined para limpiar todo
 */
export function limpiarHistorialRateLimit(maquinaId?: number): void {
  if (typeof window === "undefined") return;
  
  try {
    if (maquinaId !== undefined) {
      // Limpiar solo una máquina específica
      const historial = obtenerHistorialRateLimit();
      delete historial[maquinaId];
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
 * Limpia automáticamente timestamps antiguos de todas las máquinas
 * Se puede llamar periódicamente para mantener el historial limpio
 */
export function limpiarTimestampsAntiguos(): void {
  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  let historialModificado = false;
  
  Object.keys(historial).forEach((key) => {
    const maquinaId = Number(key);
    const entrada = historial[maquinaId];
    
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
      historial[maquinaId] = entrada;
      historialModificado = true;
      
      // Si no quedan timestamps, eliminar la entrada completa
      if (entrada.timestamps.length === 0) {
        delete historial[maquinaId];
      }
    }
  });
  
  if (historialModificado) {
    guardarHistorialRateLimit(historial);
  }
}


