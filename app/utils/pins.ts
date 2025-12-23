/**
 * Utilidades para gestionar PINs de operadores
 */

const STORAGE_KEY_PINS_OPERADORES = "gst3d_pins_operadores";

export interface PinOperador {
  operador: string;
  pin: string;
  fechaCreacion: number;
  fechaUltimaModificacion: number;
}

export interface PinsOperadores {
  [operador: string]: PinOperador;
}

/**
 * Obtiene todos los PINs de operadores
 */
export function obtenerPinsOperadores(): PinsOperadores {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem(STORAGE_KEY_PINS_OPERADORES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error al cargar PINs de operadores:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda los PINs de operadores
 */
function guardarPinsOperadores(pins: PinsOperadores): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_PINS_OPERADORES, JSON.stringify(pins));
}

/**
 * Establece o actualiza el PIN de un operador
 */
export function establecerPinOperador(operador: string, pin: string): void {
  const pins = obtenerPinsOperadores();
  const ahora = Date.now();
  
  if (pins[operador]) {
    // Actualizar PIN existente
    pins[operador].pin = pin;
    pins[operador].fechaUltimaModificacion = ahora;
  } else {
    // Crear nuevo PIN
    pins[operador] = {
      operador,
      pin,
      fechaCreacion: ahora,
      fechaUltimaModificacion: ahora,
    };
  }
  
  guardarPinsOperadores(pins);
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinsActualizados"));
  }
}

/**
 * Elimina el PIN de un operador
 */
export function eliminarPinOperador(operador: string): void {
  const pins = obtenerPinsOperadores();
  delete pins[operador];
  guardarPinsOperadores(pins);
  
  // Disparar evento para actualizar otros componentes
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pinsActualizados"));
  }
}

/**
 * Obtiene el PIN de un operador específico
 */
export function obtenerPinOperador(operador: string): string | null {
  const pins = obtenerPinsOperadores();
  return pins[operador]?.pin || null;
}

/**
 * Verifica si un operador tiene PIN configurado
 */
export function tienePinOperador(operador: string): boolean {
  const pins = obtenerPinsOperadores();
  return !!pins[operador]?.pin;
}

/**
 * Verifica si un PIN es correcto para un operador
 */
export function verificarPinOperador(operador: string, pin: string): boolean {
  const pinGuardado = obtenerPinOperador(operador);
  return pinGuardado !== null && pinGuardado === pin;
}


