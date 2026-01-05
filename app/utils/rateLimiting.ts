/**
 * Utilidad para gestionar rate limiting de impresiones por máquina
 * Restricción: Máximo 2 clicks por hora por máquina
 */

const STORAGE_KEY_RATE_LIMIT = "gst3d_rate_limit_maquinas";
const MAX_CLICKS_POR_HORA = 2;
const VENTANA_TIEMPO_MS = 60 * 60 * 1000; // 1 hora en milisegundos

interface RateLimitEntry {
  maquinaId: number;
  timestamps: number[];
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
 * Limpia timestamps antiguos (fuera de la ventana de tiempo)
 */
function limpiarTimestampsAntiguos(timestamps: number[]): number[] {
  const ahora = Date.now();
  const limiteTiempo = ahora - VENTANA_TIEMPO_MS;
  return timestamps.filter(ts => ts > limiteTiempo);
}

/**
 * Verifica si se puede imprimir en una máquina (rate limiting)
 * @param maquinaId ID de la máquina
 * @returns true si se puede imprimir, false si se alcanzó el límite
 */
export function puedeImprimir(maquinaId: number): boolean {
  const historial = obtenerHistorialRateLimit();
  const entrada = historial[maquinaId];
  
  if (!entrada) {
    return true; // No hay historial, se puede imprimir
  }
  
  // Limpiar timestamps antiguos
  const timestampsActualizados = limpiarTimestampsAntiguos(entrada.timestamps);
  
  // Si hay menos de MAX_CLICKS_POR_HORA, se puede imprimir
  return timestampsActualizados.length < MAX_CLICKS_POR_HORA;
}

/**
 * Registra un intento de impresión en una máquina
 * @param maquinaId ID de la máquina
 * @returns true si se registró exitosamente, false si se alcanzó el límite
 */
export function registrarIntentoImpresion(maquinaId: number): boolean {
  const historial = obtenerHistorialRateLimit();
  const ahora = Date.now();
  
  // Obtener o crear entrada para esta máquina
  let entrada = historial[maquinaId] || { maquinaId, timestamps: [] };
  
  // Limpiar timestamps antiguos
  entrada.timestamps = limpiarTimestampsAntiguos(entrada.timestamps);
  
  // Verificar si se puede imprimir
  if (entrada.timestamps.length >= MAX_CLICKS_POR_HORA) {
    return false; // Límite alcanzado
  }
  
  // Agregar nuevo timestamp
  entrada.timestamps.push(ahora);
  historial[maquinaId] = entrada;
  
  // Guardar historial
  guardarHistorialRateLimit(historial);
  
  return true;
}

/**
 * Obtiene el tiempo restante hasta que se pueda imprimir nuevamente
 * @param maquinaId ID de la máquina
 * @returns Tiempo en milisegundos hasta que se pueda imprimir, o 0 si se puede imprimir ahora
 */
export function obtenerTiempoRestante(maquinaId: number): number {
  const historial = obtenerHistorialRateLimit();
  const entrada = historial[maquinaId];
  
  if (!entrada) {
    return 0; // No hay historial, se puede imprimir ahora
  }
  
  // Limpiar timestamps antiguos
  const timestampsActualizados = limpiarTimestampsAntiguos(entrada.timestamps);
  
  if (timestampsActualizados.length < MAX_CLICKS_POR_HORA) {
    return 0; // Se puede imprimir ahora
  }
  
  // Obtener el timestamp más antiguo
  const timestampMasAntiguo = Math.min(...timestampsActualizados);
  const tiempoTranscurrido = Date.now() - timestampMasAntiguo;
  const tiempoRestante = VENTANA_TIEMPO_MS - tiempoTranscurrido;
  
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

