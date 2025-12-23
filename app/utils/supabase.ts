import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno para Supabase
// Estas se deben configurar en Render como variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.length > 0 && supabaseAnonKey.length > 0;
}

// Crear cliente de Supabase solo si está configurado
// Si no está configurado, creamos un cliente dummy que no fallará
let supabaseInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Crear un cliente dummy con valores placeholder para evitar errores en build
  // Este cliente no funcionará para operaciones reales, pero permitirá que el build pase
  supabaseInstance = createClient(
    'https://placeholder.supabase.co',
    'placeholder-key'
  );
}

export const supabase = supabaseInstance;

