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
 * Obtiene todas las categorías desde localStorage
 */
export function obtenerCategorias(): CategoriasData {
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
 * Guarda las categorías en localStorage
 */
export function guardarCategorias(categorias: CategoriasData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_CATEGORIAS, JSON.stringify(categorias));
}

/**
 * Agrega una nueva categoría
 */
export function agregarCategoria(nombre: string): string {
  const categorias = obtenerCategorias();
  const id = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  categorias[id] = {
    id,
    nombre: nombre.trim(),
    items: [],
  };
  
  guardarCategorias(categorias);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
  }
  
  return id;
}

/**
 * Elimina una categoría
 */
export function eliminarCategoria(categoriaId: string): void {
  const categorias = obtenerCategorias();
  delete categorias[categoriaId];
  guardarCategorias(categorias);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
  }
}

/**
 * Agrega un item a una categoría
 */
export function agregarItemACategoria(categoriaId: string, itemNombre: string): void {
  const categorias = obtenerCategorias();
  if (categorias[categoriaId]) {
    const nombreNormalizado = itemNombre.trim();
    if (nombreNormalizado && !categorias[categoriaId].items.includes(nombreNormalizado)) {
      categorias[categoriaId].items.push(nombreNormalizado);
      guardarCategorias(categorias);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
      }
    }
  }
}

/**
 * Elimina un item de una categoría
 */
export function eliminarItemDeCategoria(categoriaId: string, itemNombre: string): void {
  const categorias = obtenerCategorias();
  if (categorias[categoriaId]) {
    categorias[categoriaId].items = categorias[categoriaId].items.filter(
      item => item !== itemNombre
    );
    guardarCategorias(categorias);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("categoriasActualizadas"));
    }
  }
}

/**
 * Obtiene todas las categorías como array
 */
export function obtenerCategoriasArray(): Categoria[] {
  return Object.values(obtenerCategorias());
}


