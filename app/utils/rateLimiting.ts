/**
 * Utilidad para gestionar rate limiting de impresiones por operador
 * Restricciones:
 * - Operadores: Máximo 2 etiquetas (1 chica + 1 grande) cada 2 minutos por operador
 * - Administradores: Sin límite de tiempo ni cantidad (pueden imprimir cuantas quieran)
 */

const STORAGE_KEY_RATE_LIMIT = "gst3d_rate_limit_operadores";
const MAX_ETIQUETAS_OPERADOR = 2; // Operadores: máximo 2 etiquetas (1 chica + 1 grande) cada 2 minutos
const MAX_ETIQUETAS_ADMIN = 999999; // Administradores: sin límite (número muy alto para simular sin límite)
const VENTANA_TIEMPO_OPERADOR_MS = 2 * 60 * 1000; // 2 minutos en milisegundos

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
  if (cantidadEtiquetas > MAX_ETIQUETAS_OPERADOR) {
    return false;
  }
  
  // Limpiar timestamps antiguos de todos los operadores antes de verificar
  limpiarTimestampsAntiguos();

  const historial = obtenerHistorialRateLimit();
  const entrada = historial[operador];
  
  if (!entrada || !entrada.timestamps || entrada.timestamps.length === 0) {
    return true; // No hay historial, se puede imprimir
  }
  
  // Limpiar timestamps antiguos (fuera de la ventana de 2 minutos)
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;
  
  // Filtrar timestamps que están dentro de la ventana de tiempo
  const timestampsActualizados = entrada.timestamps.filter((ts) => ts > limiteTiempo);
  
  // IMPORTANTE: Actualizar el historial limpiado para que los timestamps antiguos se eliminen permanentemente
  if (timestampsActualizados.length !== entrada.timestamps.length) {
    entrada.timestamps = timestampsActualizados;
    entrada.cantidadEtiquetas = entrada.cantidadEtiquetas.filter((_, index) => entrada.timestamps[index] > limiteTiempo);
    historial[operador] = entrada;
    guardarHistorialRateLimit(historial);
  }
  
  // Si no hay impresiones recientes (últimos 2 minutos), se puede imprimir
  return timestampsActualizados.length === 0;
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
  
  // Operadores: validar cantidad y tiempo
  // NOTA: MAX_ETIQUETAS_OPERADOR = 2 porque pueden imprimir 1 chica + 1 grande = 2 etiquetas
  if (cantidadEtiquetas > MAX_ETIQUETAS_OPERADOR) {
    return false; // Operadores solo pueden imprimir máximo 2 etiquetas (1 chica + 1 grande)
  }
  
  // IMPORTANTE: Limpiar timestamps antiguos de TODOS los operadores primero
  // Esto asegura que no haya datos corruptos o timestamps antiguos bloqueando
  limpiarTimestampsAntiguos();

  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_OPERADOR_MS;

  // Obtener o crear entrada para este operador (después de limpiar)
  let entrada = historial[operador] || { operadorId: operador, timestamps: [], cantidadEtiquetas: [] };
  
  // Verificar que la entrada tenga arrays válidos
  if (!entrada.timestamps || !Array.isArray(entrada.timestamps)) {
    entrada.timestamps = [];
  }
  if (!entrada.cantidadEtiquetas || !Array.isArray(entrada.cantidadEtiquetas)) {
    entrada.cantidadEtiquetas = [];
  }
  
  // Filtrar timestamps antiguos (fuera de la ventana de 2 minutos) - VERIFICACIÓN ATÓMICA
  // Usar índices válidos para mantener sincronización entre timestamps y cantidades
  const indicesValidos: number[] = [];
  entrada.timestamps.forEach((ts, index) => {
    if (ts && ts > limiteTiempo) {
      indicesValidos.push(index);
    }
  });
  
  // Filtrar usando los índices válidos para mantener sincronización entre timestamps y cantidades
  entrada.timestamps = entrada.timestamps.filter((_, index) => indicesValidos.includes(index));
  entrada.cantidadEtiquetas = entrada.cantidadEtiquetas.filter((_, index) => indicesValidos.includes(index));
  
  // Si después de limpiar aún hay timestamps, significa que hay una impresión reciente (últimos 2 minutos)
  if (entrada.timestamps.length > 0) {
    // Actualizar historial con la limpieza realizada antes de retornar false
    historial[operador] = entrada;
    guardarHistorialRateLimit(historial);
    return false; // Límite de tiempo alcanzado
  }

  // Si no quedan timestamps después de limpiar y había una entrada, eliminarla completamente del historial
  if (historial[operador] && historial[operador].timestamps && historial[operador].timestamps.length === 0) {
    delete historial[operador];
    guardarHistorialRateLimit(historial);
  }

  // Si llegamos aquí, no hay impresiones recientes, se puede imprimir
  // Agregar nuevo timestamp y cantidad
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
  // Administradores: no tienen límite de tiempo
  if (esAdministrador) {
    return 0;
  }
  
  const historial = obtenerHistorialRateLimit();
  const entrada = historial[operador];
  
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
    historial[operador] = entrada;
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
      historial[maquinaId] = entrada;
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


