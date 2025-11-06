// Configuración centralizada de la aplicación GST3D
// Este archivo contiene todas las constantes y URLs compartidas

export const API_CONFIG = {
  // URL base del servidor de push notifications
  BASE_URL: 'https://gst3d-push-server-g.onrender.com',
  
  // Endpoints
  HEALTH_ENDPOINT: '/health',
  STATUS_ENDPOINT: '/api/status',
  TOKEN_ENDPOINT: '/api/push/token',
  TOKENS_LIST_ENDPOINT: '/api/push/tokens',
  TOKENS_INFO_ENDPOINT: '/api/push/tokens/info',
  SEND_NOTIFICATION_ENDPOINT: '/api/push/send',
  TEST_NOTIFICATION_ENDPOINT: '/api/push/test',
  LOGS_ENDPOINT: '/api/logs',
  
  // URLs completas
  FULL_HEALTH_URL: 'https://gst3d-push-server-g.onrender.com/health',
  FULL_TOKEN_URL: 'https://gst3d-push-server-g.onrender.com/api/push/token',
  FULL_STATUS_URL: 'https://gst3d-push-server-g.onrender.com/api/status',
  
  // Token de autenticación Bearer
  BEARER_TOKEN: '31W99vbPAlSZPYPYTLKPHJyT1MKwHVi4y8Z1jtmwOPze9dcv4PLYte7AdRxJDaGV',
  
  // Configuración de timeouts (en milisegundos)
  TIMEOUT_SHORT: 3000,   // 3 segundos
  TIMEOUT_MEDIUM: 5000,  // 5 segundos
  TIMEOUT_LONG: 10000,   // 10 segundos
};

// Configuración de Firebase
export const FIREBASE_CONFIG = {
  PROJECT_ID: 'gst3dapp',
  APP_NAME: 'GST3D App',
};

// Configuración de la app
export const APP_CONFIG = {
  VERSION: '2.4-fix-network-check',
  VERSION_CODE: 7,
  MIN_SDK_VERSION: 23,
  TARGET_SDK_VERSION: 34,
};

// Formatos de fecha/hora
export const DATE_FORMATS = {
  ISO: 'ISOString', // new Date().toISOString()
  LOCALE: 'toLocaleString', // new Date().toLocaleString()
  TIME_ONLY: 'toLocaleTimeString', // new Date().toLocaleTimeString()
};

// Logs y debug
export const DEBUG_CONFIG = {
  ENABLED: __DEV__, // Solo en modo desarrollo
  LOG_LEVELS: {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    SUCCESS: 'success',
  },
};

// Validación de tokens FCM
export const TOKEN_VALIDATION = {
  MIN_LENGTH: 50,
  MAX_LENGTH: 250,
  // Formato típico: "prefix:sufijo_largo_de_base64"
  PATTERN: /^[A-Za-z0-9_-]+:[A-Za-z0-9_-]{140,}$/,
};

// Headers HTTP estándar
export const getApiHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_CONFIG.BEARER_TOKEN}`,
});

// Helper para construir URLs completas
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper para logs condicionales
export const debugLog = (message: string, data?: any) => {
  if (DEBUG_CONFIG.ENABLED) {
    console.log(message, data || '');
  }
};

// Exportar configuración completa
export const CONFIG = {
  API: API_CONFIG,
  FIREBASE: FIREBASE_CONFIG,
  APP: APP_CONFIG,
  DATES: DATE_FORMATS,
  DEBUG: DEBUG_CONFIG,
  VALIDATION: TOKEN_VALIDATION,
};

