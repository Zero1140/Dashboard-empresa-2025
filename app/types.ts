// Tipos para el sistema de etiquetas

export interface ImpresionEtiqueta {
  id: string;
  maquinaId: number;
  tipoMaterial: string;
  etiquetaChica: string;
  etiquetaGrande: string;
  operador: string;
  fecha: string; // ISO string
  timestamp: number; // Unix timestamp
  cantidadChicas: number; // Cantidad de etiquetas chicas (8)
  cantidadGrandes: number; // Cantidad de etiquetas grandes (8)
  estado?: 'pendiente' | 'impresa' | 'error'; // Estado de impresión física
}

export interface CambioOperador {
  id: string;
  maquinaId: number;
  operadorAnterior: string;
  operadorNuevo: string;
  supervisor: string; // Nombre del supervisor que hizo el cambio
  fecha: string; // ISO string
  timestamp: number; // Unix timestamp
}

export interface CambioColor {
  id: string;
  maquinaId: number;
  tipoColor: "chica" | "grande";
  colorAnterior: string;
  colorNuevo: string;
  supervisor: string; // Nombre del supervisor que hizo el cambio
  fecha: string; // ISO string
  timestamp: number; // Unix timestamp
}

export interface Accion {
  id: string;
  tipo: "cambio_operador" | "impresion" | "cambio_color";
  timestamp: number;
  fecha: string;
  maquinaId: number;
  cambioOperador?: CambioOperador;
  cambioColor?: CambioColor;
  impresion?: ImpresionEtiqueta;
}

export interface EstadisticasMaquina {
  maquinaId: number;
  totalImpresiones: number;
  ultimoOperador: string;
  ultimaImpresion?: ImpresionEtiqueta;
  impresiones: ImpresionEtiqueta[];
  cambiosOperador: CambioOperador[];
}

