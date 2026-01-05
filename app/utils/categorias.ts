import { supabase, isSupabaseConfigured } from "./supabase";
import { requireSupabase, SupabaseNotConfiguredError, SupabaseConnectionError } from "./supabaseError";

export interface Categoria {
  id: string;
  nombre: string;
  items: string[]; // Lista de items/productos en la categoría
}

export interface CategoriasData {
  [categoriaId: string]: Categoria;
}

/**
 * Carga categorías desde Supabase
 */
async function cargarCategoriasDesdeSupabase(): Promise<CategoriasData> {
  requireSupabase();
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al cargar categorías de Supabase: ${error.message}`);
    }
    
    if (!data || data.length === 0) return {};
    
    // Convertir array de Supabase a objeto
    const categorias: CategoriasData = {};
    data.forEach((cat: any) => {
      categorias[cat.id] = {
        id: cat.id,
        nombre: cat.nombre,
        items: cat.items || [],
      };
    });
    
    return categorias;
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al cargar categorías de Supabase: ${error}`);
  }
}

/**
 * Guarda categorías en Supabase
 */
async function guardarCategoriasEnSupabase(categorias: CategoriasData): Promise<void> {
  requireSupabase();
  
  try {
    // Convertir objeto a array para Supabase
    const categoriasArray = Object.values(categorias).map(cat => ({
      id: cat.id,
      nombre: cat.nombre,
      items: cat.items || [],
    }));
    
    if (categoriasArray.length === 0) return;
    
    const { error } = await supabase
      .from('categorias')
      .upsert(categoriasArray, { onConflict: 'id' });
    
    if (error) {
      throw new SupabaseConnectionError(`Error al guardar categorías en Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al guardar categorías en Supabase: ${error}`);
  }
}

/**
 * Obtiene todas las categorías desde Supabase
 */
export async function obtenerCategorias(): Promise<CategoriasData> {
  if (typeof window === "undefined") return {};
  
  return await cargarCategoriasDesdeSupabase();
}

/**
 * Versión síncrona para compatibilidad (solo lectura, puede devolver datos desactualizados)
 * NOTA: Esta función solo debe usarse para lectura. Para escritura, usar las versiones asíncronas.
 */
export function obtenerCategoriasSync(): CategoriasData {
  if (typeof window === "undefined") return {};
  
  // Intentar obtener desde Supabase de forma síncrona (limitado)
  // En producción, esto debería estar en un estado de React o contexto
  if (!isSupabaseConfigured()) {
    console.warn('Supabase no está configurado. obtenerCategoriasSync() devolverá un objeto vacío.');
    return {};
  }
  
  // Para sincronización, necesitamos que el componente use el hook useRealtimeSync
  // Esta función solo devuelve un objeto vacío como fallback
  return {};
}

/**
 * Guarda las categorías en Supabase
 */
export async function guardarCategorias(categorias: CategoriasData): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar SOLO en Supabase
  await guardarCategoriasEnSupabase(categorias);
  
  // Disparar evento local para notificar cambios
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
  }
}

/**
 * Agrega una nueva categoría
 */
export async function agregarCategoria(nombre: string): Promise<string> {
  const categorias = await obtenerCategorias();
  const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  categorias[id] = {
    id,
    nombre: nombre.trim(),
    items: [],
  };
  
  await guardarCategorias(categorias);
  
  return id;
}

/**
 * Elimina una categoría
 */
export async function eliminarCategoria(categoriaId: string): Promise<void> {
  const categorias = await obtenerCategorias();
  delete categorias[categoriaId];
  await guardarCategorias(categorias);
  
  // Eliminar de Supabase
  requireSupabase();
  try {
    const { error } = await supabase.from('categorias').delete().eq('id', categoriaId);
    if (error) {
      throw new SupabaseConnectionError(`Error al eliminar categoría de Supabase: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError || error instanceof SupabaseConnectionError) {
      throw error;
    }
    throw new SupabaseConnectionError(`Error al eliminar categoría de Supabase: ${error}`);
  }
}

/**
 * Agrega un item a una categoría
 */
export async function agregarItemACategoria(categoriaId: string, itemNombre: string): Promise<void> {
  const categorias = await obtenerCategorias();
  if (categorias[categoriaId]) {
    const nombreNormalizado = itemNombre.trim();
    if (nombreNormalizado && !categorias[categoriaId].items.includes(nombreNormalizado)) {
      categorias[categoriaId].items.push(nombreNormalizado);
      await guardarCategorias(categorias);
    }
  }
}

/**
 * Elimina un item de una categoría
 */
export async function eliminarItemDeCategoria(categoriaId: string, itemNombre: string): Promise<void> {
  const categorias = await obtenerCategorias();
  if (categorias[categoriaId]) {
    categorias[categoriaId].items = categorias[categoriaId].items.filter(
      item => item !== itemNombre
    );
    await guardarCategorias(categorias);
  }
}

/**
 * Obtiene todas las categorías como array (versión asíncrona)
 */
export async function obtenerCategoriasArray(): Promise<Categoria[]> {
  const categorias = await obtenerCategorias();
  return Object.values(categorias);
}

/**
 * Obtiene todas las categorías como array (versión síncrona para compatibilidad)
 */
export function obtenerCategoriasArraySync(): Categoria[] {
  return Object.values(obtenerCategoriasSync());
}

/**
 * Suscripción Realtime a cambios en categorías
 */
export function suscribirCategoriasRealtime(
  callback: (categorias: CategoriasData) => void
): () => void {
  if (!isSupabaseConfigured()) {
    console.error('Supabase no está configurado. No se puede suscribir a cambios en tiempo real.');
    return () => {};
  }
  
  const subscription = supabase
    .channel('categorias_changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'categorias'
      },
      async () => {
        try {
          // Recargar categorías desde Supabase cuando hay cambios
          const nuevasCategorias = await cargarCategoriasDesdeSupabase();
          callback(nuevasCategorias);
          // Disparar evento local también
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
          }
        } catch (error) {
          console.error('Error al recargar categorías en Realtime:', error);
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}


