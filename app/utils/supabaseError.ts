/**
 * Errores y mensajes relacionados con Supabase
 */

export class SupabaseNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message || 'Supabase no está configurado correctamente');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export class SupabaseConnectionError extends Error {
  constructor(message?: string) {
    super(message || 'No se pudo conectar a Supabase');
    this.name = 'SupabaseConnectionError';
  }
}

/**
 * Verifica si Supabase está configurado y lanza error si no lo está
 */
export function requireSupabase(): void {
  const { isSupabaseConfigured } = require('./supabase');
  if (!isSupabaseConfigured()) {
    throw new SupabaseNotConfiguredError(
      'Supabase no está configurado. Por favor, configura las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Render.'
    );
  }
}

/**
 * Mensaje de error para mostrar al usuario
 */
export const SUPABASE_ERROR_MESSAGE = {
  NOT_CONFIGURED: {
    title: '⚠️ Supabase no está configurado',
    message: 'El sistema requiere una conexión a Supabase para funcionar correctamente.',
    instructions: [
      '1. Ve a tu proyecto en Supabase Dashboard',
      '2. Navega a Settings → API',
      '3. Copia la "Project URL" y la "anon public" key',
      '4. Ve a Render Dashboard → Environment',
      '5. Agrega las siguientes variables de entorno:',
      '   - NEXT_PUBLIC_SUPABASE_URL = (tu Project URL)',
      '   - NEXT_PUBLIC_SUPABASE_ANON_KEY = (tu anon public key)',
      '6. Reinicia el servicio en Render',
    ],
  },
  CONNECTION_ERROR: {
    title: '❌ Error de conexión a Supabase',
    message: 'No se pudo conectar a la base de datos.',
    instructions: [
      '1. Verifica que las variables de entorno estén correctamente configuradas',
      '2. Verifica que tu proyecto Supabase esté activo',
      '3. Verifica tu conexión a internet',
      '4. Si el problema persiste, contacta al administrador del sistema',
    ],
  },
};

