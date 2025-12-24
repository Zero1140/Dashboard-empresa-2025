import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variables de entorno para Supabase
// Estas se deben configurar en Render como variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar si Supabase está configurado
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '';
}

// Crear cliente de Supabase solo si está configurado correctamente
// Si no está configurado, creamos un cliente dummy para evitar errores durante el build
// pero este cliente no funcionará realmente
function createSupabaseClient(): SupabaseClient {
  if (isSupabaseConfigured()) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }
  // Cliente dummy para evitar errores durante el build
  // Este cliente no funcionará pero permitirá que el código compile
  return createClient('https://placeholder.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder');
}

// Cliente de Supabase (dummy si no está configurado)
export const supabase = createSupabaseClient();

