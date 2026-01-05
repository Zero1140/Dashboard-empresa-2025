import { supabase, isSupabaseConfigured } from "./supabase";

const STORAGE_KEY_CATEGORIAS = "gst3d_categorias";

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
  if (!isSupabaseConfigured()) return {};
  
  try {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error al cargar categorías de Supabase:', error);
      return {};
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
    
    // Guardar en localStorage como caché
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(categorias));
    }
    
    return categorias;
  } catch (error) {
    console.error('Error al cargar categorías de Supabase:', error);
    return {};
  }
}

/**
 * Guarda categorías en Supabase
 */
async function guardarCategoriasEnSupabase(categorias: CategoriasData): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  
  try {
    // Convertir objeto a array para Supabase
    const categoriasArray = Object.values(categorias).map(cat => ({
      id: cat.id,
      nombre: cat.nombre,
      items: cat.items || [],
    }));
    
    if (categoriasArray.length === 0) return true;
    
    const { error } = await supabase
      .from('categorias')
      .upsert(categoriasArray, { onConflict: 'id' });
    
    if (error) {
      console.error('Error al guardar categorías en Supabase:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al guardar categorías en Supabase:', error);
    return false;
  }
}

/**
 * Obtiene todas las categorías (desde Supabase si está configurado, sino desde localStorage)
 */
export async function obtenerCategorias(): Promise<CategoriasData> {
  if (typeof window === "undefined") return {};
  
  // Intentar cargar desde Supabase primero
  if (isSupabaseConfigured()) {
    const categorias = await cargarCategoriasDesdeSupabase();
    if (Object.keys(categorias).length > 0) {
      return categorias;
    }
  }
  
  // Fallback a localStorage
  const categoriasGuardadas = localStorage.getItem(STORAGE_KEY_CATEGORIAS);
  if (categoriasGuardadas) {
    try {
      return JSON.parse(categoriasGuardadas);
    } catch (e) {
      console.error("Error al cargar categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Versión síncrona para compatibilidad (solo localStorage)
 */
export function obtenerCategoriasSync(): CategoriasData {
  if (typeof window === "undefined") return {};
  const categoriasGuardadas = localStorage.getItem(STORAGE_KEY_CATEGORIAS);
  if (categoriasGuardadas) {
    try {
      return JSON.parse(categoriasGuardadas);
    } catch (e) {
      console.error("Error al cargar categorías:", e);
      return {};
    }
  }
  return {};
}

/**
 * Guarda las categorías (en Supabase y localStorage)
 */
export async function guardarCategorias(categorias: CategoriasData): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Guardar en localStorage primero (para respuesta inmediata)
  localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(categorias));
  
  // Guardar en Supabase (asíncrono)
  await guardarCategoriasEnSupabase(categorias);
  
  // Disparar evento local
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
  
  // Eliminar de Supabase también
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('categorias').delete().eq('id', categoriaId);
    } catch (error) {
      console.error('Error al eliminar categoría de Supabase:', error);
    }
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
    // Si no hay Supabase, solo escuchar eventos locales
    const handler = () => {
      obtenerCategorias().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("categoriasActualizadas", handler);
      return () => window.removeEventListener("categoriasActualizadas", handler);
    }
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
        // Recargar categorías desde Supabase cuando hay cambios
        const nuevasCategorias = await cargarCategoriasDesdeSupabase();
        callback(nuevasCategorias);
        // Disparar evento local también
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
        }
      }
    )
    .subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}


