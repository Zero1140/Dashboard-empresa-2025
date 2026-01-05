import { useEffect } from 'react';
import { suscribirCategoriasRealtime } from './categorias';
import { suscribirStockRealtime } from './stock';
import { suscribirStockCategoriasRealtime } from './stockCategorias';
import { suscribirOperadoresAsignadosRealtime } from './operadoresAsignados';
import { suscribirColoresMaquinasRealtime } from './coloresMaquinas';
import { suscribirOperadoresPersonalizadosRealtime, suscribirOperadoresEliminadosRealtime } from './operadores';
import { suscribirColoresPersonalizadosRealtime, suscribirColoresEliminadosRealtime } from './colores';
import { suscribirContadorEtiquetasRealtime } from './contadorEtiquetas';
import { suscribirPinsOperadoresRealtime } from './pins';
import { suscribirStockMinimosRealtime, StockMinimosMateriales, StockMinimosCategorias } from './stockMinimos';
import { CategoriasData } from './categorias';
import { StockPorTipo } from './stock';
import { StockCategoria } from './stockCategorias';
import { OperadoresAsignados } from './operadoresAsignados';
import { ColoresPorMaquina } from './coloresMaquinas';
import { ContadorEtiquetas } from './contadorEtiquetas';
import { PinsOperadores } from './pins';

interface RealtimeCallbacks {
  onCategoriasChange?: (categorias: CategoriasData) => void;
  onStockChange?: (stock: StockPorTipo) => void;
  onStockCategoriasChange?: (stock: StockCategoria) => void;
  onOperadoresAsignadosChange?: (asignaciones: OperadoresAsignados) => void;
  onColoresMaquinasChange?: (colores: ColoresPorMaquina) => void;
  onOperadoresPersonalizadosChange?: (operadores: string[]) => void;
  onOperadoresEliminadosChange?: (eliminados: string[]) => void;
  onColoresPersonalizadosChange?: (colores: Record<string, { chica: Record<string, string>; grande: Record<string, string> }>) => void;
  onColoresEliminadosChange?: (eliminados: Record<string, { chica: string[]; grande: string[] }>) => void;
  onContadorEtiquetasChange?: (contador: ContadorEtiquetas) => void;
  onPinsOperadoresChange?: (pins: PinsOperadores) => void;
  onStockMinimosChange?: (data: { materiales: StockMinimosMateriales; categorias: StockMinimosCategorias }) => void;
}

/**
 * Hook para gestionar todas las suscripciones Realtime
 */
export function useRealtimeSync(callbacks: RealtimeCallbacks) {
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    // Suscripción a categorías
    if (callbacks.onCategoriasChange) {
      const unsubscribe = suscribirCategoriasRealtime(callbacks.onCategoriasChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a stock
    if (callbacks.onStockChange) {
      const unsubscribe = suscribirStockRealtime(callbacks.onStockChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a stock de categorías
    if (callbacks.onStockCategoriasChange) {
      const unsubscribe = suscribirStockCategoriasRealtime(callbacks.onStockCategoriasChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a operadores asignados
    if (callbacks.onOperadoresAsignadosChange) {
      const unsubscribe = suscribirOperadoresAsignadosRealtime(callbacks.onOperadoresAsignadosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a colores por máquina
    if (callbacks.onColoresMaquinasChange) {
      const unsubscribe = suscribirColoresMaquinasRealtime(callbacks.onColoresMaquinasChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a operadores personalizados
    if (callbacks.onOperadoresPersonalizadosChange) {
      const unsubscribe = suscribirOperadoresPersonalizadosRealtime(callbacks.onOperadoresPersonalizadosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a operadores eliminados
    if (callbacks.onOperadoresEliminadosChange) {
      const unsubscribe = suscribirOperadoresEliminadosRealtime(callbacks.onOperadoresEliminadosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a colores personalizados
    if (callbacks.onColoresPersonalizadosChange) {
      const unsubscribe = suscribirColoresPersonalizadosRealtime(callbacks.onColoresPersonalizadosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a colores eliminados
    if (callbacks.onColoresEliminadosChange) {
      const unsubscribe = suscribirColoresEliminadosRealtime(callbacks.onColoresEliminadosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a contador de etiquetas
    if (callbacks.onContadorEtiquetasChange) {
      const unsubscribe = suscribirContadorEtiquetasRealtime(callbacks.onContadorEtiquetasChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a PINs de operadores
    if (callbacks.onPinsOperadoresChange) {
      const unsubscribe = suscribirPinsOperadoresRealtime(callbacks.onPinsOperadoresChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Suscripción a stock mínimos
    if (callbacks.onStockMinimosChange) {
      const unsubscribe = suscribirStockMinimosRealtime(callbacks.onStockMinimosChange);
      unsubscribeFunctions.push(unsubscribe);
    }

    // Cleanup: desuscribir todas las suscripciones
    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }, [
    callbacks.onCategoriasChange,
    callbacks.onStockChange,
    callbacks.onStockCategoriasChange,
    callbacks.onOperadoresAsignadosChange,
    callbacks.onColoresMaquinasChange,
    callbacks.onOperadoresPersonalizadosChange,
    callbacks.onOperadoresEliminadosChange,
    callbacks.onColoresPersonalizadosChange,
    callbacks.onColoresEliminadosChange,
    callbacks.onContadorEtiquetasChange,
    callbacks.onPinsOperadoresChange,
    callbacks.onStockMinimosChange,
  ]);
}

