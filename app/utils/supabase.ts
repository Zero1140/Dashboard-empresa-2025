import { createClient } from '@supabase/supabase-js';

// Variables de entorno para Supabase
// ESTAS SON OBLIGATORIAS - La aplicación requiere Supabase para funcionar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validar que las variables estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  
  throw new Error(
    `❌ Variables de entorno de Supabase faltantes: ${missingVars.join(', ')}\n` +
    `Por favor, configura estas variables en Render:\n` +
    `- NEXT_PUBLIC_SUPABASE_URL\n` +
    `- NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
    `Ver CONFIGURAR_VARIABLES_RENDER.md para más detalles.`
  );
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Verificar si Supabase está configurado (siempre debería ser true)
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

