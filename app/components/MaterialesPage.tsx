"use client";

import { useState, useEffect } from "react";
import { coloresPorTipo, limpiarNombre, OPERADORES } from "../data";
import { obtenerColoresCombinados, obtenerColoresCombinadosSync, obtenerColoresPersonalizados, eliminarColor, guardarColoresPersonalizados } from "../utils/colores";
import { obtenerOperadoresCombinados, obtenerOperadoresCombinadosSync, agregarOperador, eliminarOperador } from "../utils/operadores";
import { obtenerCategoriasArray, obtenerCategoriasArraySync, agregarCategoria, eliminarCategoria, agregarItemACategoria, eliminarItemDeCategoria, Categoria } from "../utils/categorias";
import { useRealtimeSync } from "../utils/useRealtimeSync";
import { obtenerMinimoMaterial, obtenerMinimoCategoria, establecerMinimoMaterial, establecerMinimoCategoria, eliminarMinimoMaterial, eliminarMinimoCategoria } from "../utils/stockMinimos";
import { obtenerPinsOperadores, establecerPinOperador, eliminarPinOperador, tienePinOperadorSync } from "../utils/pins";
import NumericKeypad from "./NumericKeypad";

const STORAGE_KEY_COLORES_PERSONALIZADOS = "gst3d_colores_personalizados";

interface ColorPersonalizado {
  nombre: string;
  hex: string;
  tipo: string;
  variante: "chica" | "grande" | "ambas";
}

interface MaterialesPageProps {
  onSupabaseError?: (error: "NOT_CONFIGURED" | "CONNECTION_ERROR") => void;
}

export default function MaterialesPage({ onSupabaseError }: MaterialesPageProps = {}) {
  const [coloresPersonalizados, setColoresPersonalizados] = useState<Record<string, {
    chica: Record<string, string>;
    grande: Record<string, string>;
  }>>({});
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("PLA");
  const [showAgregarModal, setShowAgregarModal] = useState<boolean>(false);
  const [showEliminarModal, setShowEliminarModal] = useState<boolean>(false);
  const [showAgregarOperadorModal, setShowAgregarOperadorModal] = useState<boolean>(false);
  const [showEliminarOperadorModal, setShowEliminarOperadorModal] = useState<boolean>(false);
  const [showAgregarCategoriaModal, setShowAgregarCategoriaModal] = useState<boolean>(false);
  const [showEliminarCategoriaModal, setShowEliminarCategoriaModal] = useState<boolean>(false);
  const [showAgregarItemModal, setShowAgregarItemModal] = useState<boolean>(false);
  const [showConfigurarMinimoModal, setShowConfigurarMinimoModal] = useState<boolean>(false);
  const [showConfigurarPinModal, setShowConfigurarPinModal] = useState<boolean>(false);
  const [colorAEliminar, setColorAEliminar] = useState<{ tipo: string; variante: "chica" | "grande"; nombre: string } | null>(null);
  const [operadorAEliminar, setOperadorAEliminar] = useState<string | null>(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<string | null>(null);
  const [categoriaParaItem, setCategoriaParaItem] = useState<string | null>(null);
  const [itemParaMinimo, setItemParaMinimo] = useState<{ tipo: "material" | "categoria"; tipoMaterial?: string; color?: string; categoriaId?: string; itemNombre?: string } | null>(null);
  const [operadorParaPin, setOperadorParaPin] = useState<string | null>(null);
  const [nuevoOperador, setNuevoOperador] = useState<string>("");
  const [nuevaCategoria, setNuevaCategoria] = useState<string>("");
  const [nuevoItem, setNuevoItem] = useState<string>("");
  const [valorMinimo, setValorMinimo] = useState<string>("");
  const [nuevoPin, setNuevoPin] = useState<string>("");
  const [operadores, setOperadores] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pins, setPins] = useState<Record<string, any>>({});
  
  // Formulario para agregar color
  const [nuevoColor, setNuevoColor] = useState<ColorPersonalizado>({
    nombre: "",
    hex: "#000000",
    tipo: "PLA",
    variante: "ambas",
  });

  // Cargar colores personalizados desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const coloresGuardados = localStorage.getItem(STORAGE_KEY_COLORES_PERSONALIZADOS);
    if (coloresGuardados) {
      try {
        setColoresPersonalizados(JSON.parse(coloresGuardados));
      } catch (e) {
        console.error("Error al cargar colores personalizados:", e);
      }
    }
    
    // Cargar operadores, categorías y PINs
    const cargarDatos = async () => {
      try {
        setOperadores(await obtenerOperadoresCombinados());
        const cats = await obtenerCategoriasArray();
        setCategorias(cats);
        setPins(await obtenerPinsOperadores());
      } catch (error: any) {
        console.error('Error al cargar datos de materiales:', error);
        if (error?.name === 'SupabaseNotConfiguredError' && onSupabaseError) {
          onSupabaseError('NOT_CONFIGURED');
        } else if (error?.name === 'SupabaseConnectionError' && onSupabaseError) {
          onSupabaseError('CONNECTION_ERROR');
        }
      }
    };
    cargarDatos();
  }, [onSupabaseError]);

  // Escuchar cambios en operadores, categorías y PINs
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleOperadoresActualizados = async () => {
      setOperadores(await obtenerOperadoresCombinados());
    };
    
    const handleCategoriasActualizadas = async () => {
      const nuevasCategorias = await obtenerCategoriasArray();
      setCategorias(nuevasCategorias);
    };
    
    const handlePinsActualizados = async () => {
      setPins(await obtenerPinsOperadores());
    };
    
    window.addEventListener("operadoresActualizados", handleOperadoresActualizados);
    window.addEventListener("categoriasActualizadas", handleCategoriasActualizadas);
    window.addEventListener("pinsActualizados", handlePinsActualizados);
    
    return () => {
      window.removeEventListener("operadoresActualizados", handleOperadoresActualizados);
      window.removeEventListener("categoriasActualizadas", handleCategoriasActualizadas);
      window.removeEventListener("pinsActualizados", handlePinsActualizados);
    };
  }, []);

  // Suscripción Realtime para todas las entidades
  useRealtimeSync({
    onCategoriasChange: async (nuevasCategoriasData) => {
      const nuevasCategorias = Object.values(nuevasCategoriasData);
      setCategorias(nuevasCategorias);
    },
    onOperadoresPersonalizadosChange: async (nuevosOperadores) => {
      setOperadores(await obtenerOperadoresCombinados());
    },
    onOperadoresEliminadosChange: async () => {
      setOperadores(await obtenerOperadoresCombinados());
    },
    onColoresPersonalizadosChange: () => {
      // Los colores se recargan automáticamente con obtenerColoresCombinadosSync()
      // que se llama en el render, así que no necesitamos actualizar estado aquí
    },
    onColoresEliminadosChange: () => {
      // Los colores se recargan automáticamente con obtenerColoresCombinadosSync()
      // que se llama en el render, así que no necesitamos actualizar estado aquí
    },
    onPinsOperadoresChange: async (nuevosPins) => {
      setPins(nuevosPins);
    },
    onStockMinimosChange: () => {
      // Los stock mínimos se recargan cuando se necesitan
      // No necesitamos mantener estado aquí
    },
  });

  // Combinar colores originales con personalizados (versión síncrona para renderizado)
  const colores = obtenerColoresCombinadosSync();

  const handleAgregarColor = () => {
    if (!nuevoColor.nombre.trim() || !nuevoColor.hex) {
      alert("Por favor, completa todos los campos");
      return;
    }

    const nombreNormalizado = nuevoColor.nombre.toUpperCase().replace(/\s+/g, "");
    const nuevosColores = { ...coloresPersonalizados };

    // Inicializar tipo si no existe
    if (!nuevosColores[nuevoColor.tipo]) {
      nuevosColores[nuevoColor.tipo] = { chica: {}, grande: {} };
    }

    // Agregar color según la variante seleccionada
    if (nuevoColor.variante === "chica" || nuevoColor.variante === "ambas") {
      nuevosColores[nuevoColor.tipo].chica[nombreNormalizado] = nuevoColor.hex;
    }
    if (nuevoColor.variante === "grande" || nuevoColor.variante === "ambas") {
      const nombreGrande = nombreNormalizado + "_GRANDE";
      nuevosColores[nuevoColor.tipo].grande[nombreGrande] = nuevoColor.hex;
    }

    setColoresPersonalizados(nuevosColores);
    // Guardar en Supabase (asíncrono)
    guardarColoresPersonalizados(nuevosColores).catch(err => 
      console.error('Error al guardar colores personalizados:', err)
    );
    
    // Resetear formulario
    setNuevoColor({
      nombre: "",
      hex: "#000000",
      tipo: tipoSeleccionado,
      variante: "ambas",
    });
    setShowAgregarModal(false);
  };

  const handleEliminarColor = (tipo: string, variante: "chica" | "grande", nombre: string) => {
    setColorAEliminar({ tipo, variante, nombre });
    setShowEliminarModal(true);
  };

  const confirmarEliminar = () => {
    if (!colorAEliminar) return;

    // Si es un color personalizado, eliminarlo de los personalizados
    const esPersonalizado = coloresPersonalizados[colorAEliminar.tipo]?.chica[colorAEliminar.nombre] || 
                           coloresPersonalizados[colorAEliminar.tipo]?.grande[colorAEliminar.nombre];
    
    if (esPersonalizado) {
      const nuevosColores = { ...coloresPersonalizados };
      
      if (nuevosColores[colorAEliminar.tipo]) {
        if (colorAEliminar.variante === "chica") {
          delete nuevosColores[colorAEliminar.tipo].chica[colorAEliminar.nombre];
        } else {
          delete nuevosColores[colorAEliminar.tipo].grande[colorAEliminar.nombre];
        }

        // Si no quedan colores en el tipo, eliminar el tipo
        if (Object.keys(nuevosColores[colorAEliminar.tipo].chica).length === 0 &&
            Object.keys(nuevosColores[colorAEliminar.tipo].grande).length === 0) {
          delete nuevosColores[colorAEliminar.tipo];
        }
      }

      setColoresPersonalizados(nuevosColores);
      // Guardar en Supabase (asíncrono)
      guardarColoresPersonalizados(nuevosColores).catch(err => 
        console.error('Error al guardar colores personalizados:', err)
      );
    } else {
      // Si es un color original, marcarlo como eliminado
      eliminarColor(colorAEliminar.tipo, colorAEliminar.variante, colorAEliminar.nombre).catch(err => 
        console.error('Error al eliminar color:', err)
      );
    }
    
    setShowEliminarModal(false);
    setColorAEliminar(null);
  };

  const handleAgregarOperador = async () => {
    if (!nuevoOperador.trim()) {
      alert("Por favor, ingresa un nombre de operador");
      return;
    }

    await agregarOperador(nuevoOperador);
    setNuevoOperador("");
    setShowAgregarOperadorModal(false);
  };

  const handleEliminarOperador = (nombre: string) => {
    setOperadorAEliminar(nombre);
    setShowEliminarOperadorModal(true);
  };

  const confirmarEliminarOperador = async () => {
    if (operadorAEliminar) {
      await eliminarOperador(operadorAEliminar);
      setShowEliminarOperadorModal(false);
      setOperadorAEliminar(null);
    }
  };

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) {
      alert("Por favor, ingresa un nombre de categoría");
      return;
    }

    const categoriaId = await agregarCategoria(nuevaCategoria);
    setNuevaCategoria("");
    setShowAgregarCategoriaModal(false);
    
    // Abrir automáticamente el modal para agregar items a la nueva categoría
    setTimeout(() => {
      setCategoriaParaItem(categoriaId);
      setNuevoItem("");
      setShowAgregarItemModal(true);
    }, 100);
  };

  const handleEliminarCategoria = (categoriaId: string) => {
    setCategoriaAEliminar(categoriaId);
    setShowEliminarCategoriaModal(true);
  };

  const confirmarEliminarCategoria = async () => {
    if (categoriaAEliminar) {
      await eliminarCategoria(categoriaAEliminar);
      setShowEliminarCategoriaModal(false);
      setCategoriaAEliminar(null);
    }
  };

  const handleAgregarItem = (categoriaId: string) => {
    setCategoriaParaItem(categoriaId);
    setNuevoItem("");
    setShowAgregarItemModal(true);
  };

  const confirmarAgregarItem = async (continuar: boolean = false) => {
    if (categoriaParaItem && nuevoItem.trim()) {
      await agregarItemACategoria(categoriaParaItem, nuevoItem);
      setNuevoItem("");
      
      if (!continuar) {
        setCategoriaParaItem(null);
        setShowAgregarItemModal(false);
      }
      // Si continuar es true, el modal se mantiene abierto para agregar más items
    }
  };

  const handleEliminarItem = async (categoriaId: string, itemNombre: string) => {
    await eliminarItemDeCategoria(categoriaId, itemNombre);
  };

  const handleGuardarMinimo = async () => {
    if (!itemParaMinimo) return;
    const minimo = parseInt(valorMinimo) || 0;
    if (itemParaMinimo.tipo === "material" && itemParaMinimo.tipoMaterial && itemParaMinimo.color) {
      if (minimo > 0) {
        await establecerMinimoMaterial(itemParaMinimo.tipoMaterial, itemParaMinimo.color, minimo);
      } else {
        await eliminarMinimoMaterial(itemParaMinimo.tipoMaterial, itemParaMinimo.color);
      }
    } else if (itemParaMinimo.tipo === "categoria" && itemParaMinimo.categoriaId && itemParaMinimo.itemNombre) {
      if (minimo > 0) {
        await establecerMinimoCategoria(itemParaMinimo.categoriaId, itemParaMinimo.itemNombre, minimo);
      } else {
        await eliminarMinimoCategoria(itemParaMinimo.categoriaId, itemParaMinimo.itemNombre);
      }
    }
    setShowConfigurarMinimoModal(false);
    setItemParaMinimo(null);
    setValorMinimo("");
  };

  const handleGuardarPin = async () => {
    if (nuevoPin.length >= 4 && operadorParaPin) {
      await establecerPinOperador(operadorParaPin, nuevoPin);
      setShowConfigurarPinModal(false);
      setOperadorParaPin(null);
      setNuevoPin("");
    }
  };

  const handleEliminarPin = async () => {
    if (operadorParaPin && tienePinOperadorSync(operadorParaPin)) {
      if (confirm(`¿Eliminar el PIN de ${operadorParaPin}?`)) {
        await eliminarPinOperador(operadorParaPin);
      }
    }
    setShowConfigurarPinModal(false);
    setOperadorParaPin(null);
    setNuevoPin("");
  };

  const coloresTipo = colores[tipoSeleccionado] || { chica: {}, grande: {} };
  
  // Filtrar colores para mostrar solo colores base (sin _GRANDE) y evitar duplicados
  const todosColores = new Set<string>();
  Object.keys(coloresTipo.chica || {}).forEach(color => {
    const colorBase = color.replace(/_GRANDE$/, "");
    todosColores.add(colorBase);
  });
  Object.keys(coloresTipo.grande || {}).forEach(color => {
    const colorBase = color.replace(/_GRANDE$/, "");
    todosColores.add(colorBase);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 lg:space-y-8 animate-fade-in-up">
      {/* Header elegante mejorado */}
      <div className="card-elegant rounded-2xl p-6 lg:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/5 via-transparent to-[#ffb800]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                <span className="text-3xl">🎨</span>
              </div>
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  <span className="bg-gradient-to-r from-white via-[#00d4ff] to-white bg-clip-text text-transparent bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
                    Gestión Completa
                  </span>
                </h1>
                <p className="text-[#718096] text-sm lg:text-base font-medium">
                  Materiales • Empleados • Categorías
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setNuevoColor({
                    nombre: "",
                    hex: "#000000",
                    tipo: tipoSeleccionado,
                    variante: "ambas",
                  });
                  setShowAgregarModal(true);
                }}
                className="btn-elegant bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold px-5 py-2.5 lg:px-6 lg:py-3 rounded-xl shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift flex items-center gap-2 text-sm lg:text-base"
              >
                <span>🎨</span>
                <span>Agregar Color</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de tipo mejorado */}
      <div className="card-elegant rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="block text-[#a0aec0] text-xs font-bold uppercase tracking-wider">
            Tipo de Material:
          </label>
          <select
            value={tipoSeleccionado}
            onChange={(e) => setTipoSeleccionado(e.target.value)}
            className="flex-1 max-w-xs bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
          >
            {Object.keys(colores).map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sección de Gestión de Empleados - Mejorada */}
      <div className="card-elegant rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg">
              <span className="text-2xl">👷</span>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">Empleados</h2>
              <p className="text-[#718096] text-xs">Gestionar personal del sistema</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNuevoOperador("");
              setShowAgregarOperadorModal(true);
            }}
            className="btn-elegant bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift flex items-center gap-2 text-sm"
          >
            <span>➕</span>
            <span>Agregar</span>
          </button>
        </div>
        
        {operadores.length === 0 ? (
          <div className="text-[#718096] text-center py-12 bg-[#0f1419]/50 rounded-xl border border-[#2d3748]">
            <span className="text-4xl block mb-3">👥</span>
            <p className="font-semibold">No hay empleados registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {operadores.map((operador) => {
            const esOriginal = OPERADORES.includes(operador);
            return (
              <div
                key={operador}
                className="card-elegant rounded-xl p-4 group/item"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-md flex-shrink-0 ring-1 ring-[#00d4ff]/20">
                    <span className="text-lg">👤</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate mb-1">
                      {operador}
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {esOriginal && (
                        <span className="text-[#718096] text-xs bg-[#1a2332]/50 px-2 py-0.5 rounded-md border border-[#2d3748] inline-block">Sistema</span>
                      )}
                      {tienePinOperadorSync(operador) ? (
                        <span className="text-[#00ff88] text-xs bg-[#00ff88]/10 px-2 py-0.5 rounded-md border border-[#00ff88]/30 inline-block flex items-center gap-1">
                          <span>🔐</span>
                          <span>PIN configurado</span>
                        </span>
                      ) : (
                        <span className="text-[#ffb800] text-xs bg-[#ffb800]/10 px-2 py-0.5 rounded-md border border-[#ffb800]/30 inline-block">
                          Sin PIN
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setOperadorParaPin(operador);
                        setNuevoPin("");
                        setShowConfigurarPinModal(true);
                      }}
                      className="opacity-0 group-hover/item:opacity-100 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                      title="Configurar PIN"
                    >
                      🔐
                    </button>
                    <button
                      onClick={() => handleEliminarOperador(operador)}
                      className="opacity-0 group-hover/item:opacity-100 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                      title={esOriginal ? "Eliminar empleado del sistema" : "Eliminar empleado"}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Sección de Gestión de Categorías - Mejorada */}
      <div className="card-elegant rounded-2xl p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg">
              <span className="text-2xl">📁</span>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">Categorías</h2>
              <p className="text-[#718096] text-xs">Gestionar categorías de stock</p>
            </div>
          </div>
          <button
            onClick={() => {
              setNuevaCategoria("");
              setShowAgregarCategoriaModal(true);
            }}
            className="btn-elegant bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift flex items-center gap-2 text-sm"
          >
            <span>➕</span>
            <span>Nueva Categoría</span>
          </button>
        </div>
        
        {categorias.length === 0 ? (
          <div className="text-[#718096] text-center py-16 bg-[#0f1419]/50 rounded-xl border-2 border-dashed border-[#2d3748]">
            <div className="w-20 h-20 rounded-full bg-[#1a2332] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📁</span>
            </div>
            <p className="font-semibold text-base mb-2">No hay categorías creadas</p>
            <p className="text-sm text-[#718096] max-w-md mx-auto">
              Crea categorías como "Pigmentos", "Cajas" o "Bolsas" para gestionar el stock de diferentes productos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {categorias.map((categoria, index) => (
              <div
                key={categoria.id}
                className="card-elegant rounded-xl p-5 lg:p-6 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-md flex-shrink-0 ring-1 ring-[#00d4ff]/20">
                      <span className="text-xl">📦</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg lg:text-xl font-bold text-white mb-1">{categoria.nombre}</h3>
                      <span className="text-[#718096] text-xs bg-[#1a2332]/50 px-2.5 py-1 rounded-md border border-[#2d3748] inline-block">
                        {categoria.items.length} {categoria.items.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAgregarItem(categoria.id)}
                      className="btn-elegant bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift flex items-center gap-1.5"
                    >
                      <span>➕</span>
                      <span>Item</span>
                    </button>
                    <button
                      onClick={() => handleEliminarCategoria(categoria.id)}
                      className="btn-elegant bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                      title="Eliminar categoría"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {categoria.items.length === 0 ? (
                  <div className="text-[#718096] text-center py-6 bg-[#0a0a0a]/50 rounded-lg border border-[#2d3748]">
                    <p className="text-sm">Esta categoría está vacía</p>
                    <button
                      onClick={() => handleAgregarItem(categoria.id)}
                      className="mt-3 text-[#00d4ff] text-xs font-semibold hover:text-[#33ddff] transition-colors"
                    >
                      Agregar primer item →
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {categoria.items.map((item) => (
                      <div
                        key={item}
                        className="group/item bg-[#0a0a0a]/80 rounded-lg p-3 border border-[#2d3748] hover:border-[#00d4ff]/40 transition-all duration-200 flex items-center justify-between backdrop-blur-sm"
                      >
                        <span className="text-white font-medium text-sm truncate flex-1">{item}</span>
                        <button
                          onClick={() => handleEliminarItem(categoria.id, item)}
                          className="opacity-0 group-hover/item:opacity-100 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-2 py-1 rounded text-xs font-bold transition-all duration-200 ml-2 flex-shrink-0"
                          title="Eliminar item"
                        >
                          ✗
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grid de colores - Mejorado */}
      <div className="card-elegant rounded-2xl p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg">
              <span className="text-2xl">🎨</span>
            </div>
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-white">
                Colores de <span className="text-[#00d4ff]">{tipoSeleccionado}</span>
              </h2>
              <p className="text-[#718096] text-xs">Gestionar colores del material</p>
            </div>
          </div>
        </div>
        {todosColores.size === 0 ? (
          <div className="text-[#718096] text-center py-16 bg-[#0f1419]/50 rounded-xl border-2 border-dashed border-[#2d3748]">
            <div className="w-20 h-20 rounded-full bg-[#1a2332] flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎨</span>
            </div>
            <p className="font-semibold text-base mb-2">No hay colores disponibles</p>
            <p className="text-sm text-[#718096]">Agrega colores para este tipo de material</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from(todosColores)
              .sort((a, b) => a.localeCompare(b))
              .map((colorBase, index) => {
                // Buscar color hex del color base (puede estar como colorBase o colorBase_GRANDE)
                const colorHex = coloresTipo.chica[colorBase] || coloresTipo.grande[colorBase] || 
                                coloresTipo.chica[`${colorBase}_GRANDE`] || coloresTipo.grande[`${colorBase}_GRANDE`] || "#808080";
                
                // Verificar si existe en chica o grande (con o sin _GRANDE)
                const esChica = !!(coloresTipo.chica[colorBase] || coloresTipo.chica[`${colorBase}_GRANDE`]);
                const esGrande = !!(coloresTipo.grande[colorBase] || coloresTipo.grande[`${colorBase}_GRANDE`]);
                
                // Verificar si es personalizado (en chica o grande, con o sin _GRANDE)
                const esPersonalizado = !!(coloresPersonalizados[tipoSeleccionado]?.chica[colorBase] || 
                                          coloresPersonalizados[tipoSeleccionado]?.grande[colorBase] ||
                                          coloresPersonalizados[tipoSeleccionado]?.chica[`${colorBase}_GRANDE`] || 
                                          coloresPersonalizados[tipoSeleccionado]?.grande[`${colorBase}_GRANDE`]);

                return (
                  <div
                    key={colorBase}
                    className="card-elegant rounded-xl p-4 group/item animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Muestra de color mejorada */}
                      <div
                        className="w-14 h-14 rounded-xl border-2 border-[#2d3748] shadow-lg flex-shrink-0 ring-1 ring-[#00d4ff]/10 group-hover/item:ring-[#00d4ff]/30 transition-all duration-200"
                        style={{ backgroundColor: colorHex }}
                      />
                      
                      {/* Nombre del color */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate mb-1.5">
                          {limpiarNombre(colorBase, tipoSeleccionado)}
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {esChica && (
                            <span className="text-[#718096] text-xs bg-[#1a2332]/50 px-2 py-0.5 rounded-md border border-[#2d3748]">Chica</span>
                          )}
                          {esGrande && (
                            <span className="text-[#718096] text-xs bg-[#1a2332]/50 px-2 py-0.5 rounded-md border border-[#2d3748]">Grande</span>
                          )}
                          {esPersonalizado && (
                            <span className="text-[#00d4ff] text-xs bg-[#00d4ff]/10 px-2 py-0.5 rounded-md border border-[#00d4ff]/20">Custom</span>
                          )}
                        </div>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={async () => {
                            const minimoActual = await obtenerMinimoMaterial(tipoSeleccionado, colorBase);
                            setItemParaMinimo({ tipo: "material", tipoMaterial: tipoSeleccionado, color: colorBase });
                            setValorMinimo(minimoActual > 0 ? minimoActual.toString() : "");
                            setShowConfigurarMinimoModal(true);
                          }}
                          className="opacity-0 group-hover/item:opacity-100 bg-gradient-to-r from-[#ffb800] to-[#ff9500] hover:from-[#ffc933] hover:to-[#ffb800] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                          title="Configurar mínimo"
                        >
                          ⚙️
                        </button>
                        <button
                          onClick={() => {
                            // Eliminar ambas variantes si existen
                            if (esChica) {
                              handleEliminarColor(tipoSeleccionado, "chica", colorBase);
                            }
                            if (esGrande) {
                              handleEliminarColor(tipoSeleccionado, "grande", `${colorBase}_GRANDE`);
                            }
                          }}
                          className="opacity-0 group-hover/item:opacity-100 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                          title="Eliminar color"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Modal para agregar color - Mejorado */}
      {showAgregarModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                  <span className="text-2xl">🎨</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Agregar Color</h2>
                  <p className="text-[#718096] text-xs mt-1">Nuevo color para el material</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Nombre del Color:
                  </label>
                  <input
                    type="text"
                    value={nuevoColor.nombre}
                    onChange={(e) => setNuevoColor({ ...nuevoColor, nombre: e.target.value })}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] placeholder-[#718096] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                    placeholder="Ej: Rojo Intenso"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Color (Hex):
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={nuevoColor.hex}
                      onChange={(e) => setNuevoColor({ ...nuevoColor, hex: e.target.value })}
                      className="w-20 h-12 rounded-xl border-2 border-[#2d3748] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={nuevoColor.hex}
                      onChange={(e) => setNuevoColor({ ...nuevoColor, hex: e.target.value })}
                      className="flex-1 bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                      placeholder="#000000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Tipo de Material:
                  </label>
                  <select
                    value={nuevoColor.tipo}
                    onChange={(e) => setNuevoColor({ ...nuevoColor, tipo: e.target.value })}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                  >
                    {Object.keys(colores).map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Variante:
                  </label>
                  <select
                    value={nuevoColor.variante}
                    onChange={(e) => setNuevoColor({ ...nuevoColor, variante: e.target.value as "chica" | "grande" | "ambas" })}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                  >
                    <option value="ambas">Chica y Grande</option>
                    <option value="chica">Solo Chica</option>
                    <option value="grande">Solo Grande</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setShowAgregarModal(false)}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarColor}
                    className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación - Mejorado */}
      {showEliminarModal && colorAEliminar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#ff4757]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff4757]/10 via-transparent to-[#ff4757]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff4757]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center shadow-xl shadow-[#ff4757]/40 ring-2 ring-[#ff4757]/20">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Eliminar Color</h2>
                  <p className="text-[#718096] text-xs mt-1">Confirmar eliminación</p>
                </div>
              </div>

              <p className="text-[#a0aec0] mb-6 leading-relaxed">
                ¿Estás seguro de que deseas eliminar el color{" "}
                <span className="text-white font-semibold">
                  {limpiarNombre(colorAEliminar.nombre, colorAEliminar.tipo)}
                </span>{" "}
                ({colorAEliminar.variante}) del material{" "}
                <span className="text-white font-semibold">{colorAEliminar.tipo}</span>?
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowEliminarModal(false);
                    setColorAEliminar(null);
                  }}
                  className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminar}
                  className="flex-1 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#ff4757]/30 hover:shadow-[#ff4757]/50 hover-lift"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar operador - Mejorado */}
      {showAgregarOperadorModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                  <span className="text-2xl">👷</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Agregar Empleado</h2>
                  <p className="text-[#718096] text-xs mt-1">Nuevo personal del sistema</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Nombre del Empleado:
                  </label>
                  <input
                    type="text"
                    value={nuevoOperador}
                    onChange={(e) => setNuevoOperador(e.target.value)}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] placeholder-[#718096] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                    placeholder="Ej: Juan Pérez"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAgregarOperador();
                    }}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => {
                      setShowAgregarOperadorModal(false);
                      setNuevoOperador("");
                    }}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarOperador}
                    className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación de operador - Mejorado */}
      {showEliminarOperadorModal && operadorAEliminar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#ff4757]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff4757]/10 via-transparent to-[#ff4757]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff4757]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center shadow-xl shadow-[#ff4757]/40 ring-2 ring-[#ff4757]/20">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Eliminar Empleado</h2>
                  <p className="text-[#718096] text-xs mt-1">Confirmar eliminación</p>
                </div>
              </div>

              <p className="text-[#a0aec0] mb-4 leading-relaxed">
                ¿Estás seguro de que deseas eliminar al empleado{" "}
                <span className="text-white font-semibold">{operadorAEliminar}</span>?
              </p>
              {OPERADORES.includes(operadorAEliminar || "") && (
                <div className="bg-[#ffb800]/10 border border-[#ffb800]/30 rounded-lg p-3 mb-4">
                  <p className="text-[#ffb800] text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    Este es un empleado del sistema. Se ocultará pero podrás restaurarlo más tarde.
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowEliminarOperadorModal(false);
                    setOperadorAEliminar(null);
                  }}
                  className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarOperador}
                  className="flex-1 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#ff4757]/30 hover:shadow-[#ff4757]/50 hover-lift"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar categoría - Mejorado */}
      {showAgregarCategoriaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                  <span className="text-2xl">📁</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Nueva Categoría</h2>
                  <p className="text-[#718096] text-xs mt-1">Crear categoría de stock</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Nombre de la Categoría:
                  </label>
                  <input
                    type="text"
                    value={nuevaCategoria}
                    onChange={(e) => setNuevaCategoria(e.target.value)}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] placeholder-[#718096] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                    placeholder="Ej: Pigmentos, Cajas, Bolsas"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAgregarCategoria();
                    }}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => {
                      setShowAgregarCategoriaModal(false);
                      setNuevaCategoria("");
                    }}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleAgregarCategoria}
                    className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para confirmar eliminación de categoría - Mejorado */}
      {showEliminarCategoriaModal && categoriaAEliminar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#ff4757]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff4757]/10 via-transparent to-[#ff4757]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff4757]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center shadow-xl shadow-[#ff4757]/40 ring-2 ring-[#ff4757]/20">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Eliminar Categoría</h2>
                  <p className="text-[#718096] text-xs mt-1">Confirmar eliminación</p>
                </div>
              </div>

              <p className="text-[#a0aec0] mb-6 leading-relaxed">
                ¿Estás seguro de que deseas eliminar la categoría{" "}
                <span className="text-white font-semibold">
                  {categorias.find(c => c.id === categoriaAEliminar)?.nombre}
                </span>?
                <br />
                <span className="text-[#ff4757] text-sm mt-2 block">
                  Esto eliminará todos los items de esta categoría y su stock asociado.
                </span>
              </p>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowEliminarCategoriaModal(false);
                    setCategoriaAEliminar(null);
                  }}
                  className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarEliminarCategoria}
                  className="flex-1 bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#ff4757]/30 hover:shadow-[#ff4757]/50 hover-lift"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar item a categoría - Mejorado */}
      {showAgregarItemModal && categoriaParaItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                  <span className="text-2xl">📦</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Agregar Item</h2>
                  <p className="text-[#718096] text-xs mt-1">
                    Categoría: <span className="text-white font-semibold">{categorias.find(c => c.id === categoriaParaItem)?.nombre}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Nombre del Item:
                  </label>
                  <input
                    type="text"
                    value={nuevoItem}
                    onChange={(e) => setNuevoItem(e.target.value)}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] placeholder-[#718096] shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                    placeholder="Ej: Caja Pequeña, Caja Grande, Caja Mediana, Pigmento Rojo, Pigmento Azul"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmarAgregarItem(false);
                      if (e.key === "Escape") {
                        setShowAgregarItemModal(false);
                        setNuevoItem("");
                        setCategoriaParaItem(null);
                      }
                    }}
                  />
                  <p className="text-[#718096] text-xs mt-2">
                    💡 Presiona Enter para agregar y continuar, o Escape para cancelar
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAgregarItemModal(false);
                      setNuevoItem("");
                      setCategoriaParaItem(null);
                    }}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => confirmarAgregarItem(true)}
                    className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift"
                  >
                    ➕ Agregar y Continuar
                  </button>
                  <button
                    onClick={() => confirmarAgregarItem(false)}
                    className="flex-1 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#33ff99] hover:to-[#00ff88] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00ff88]/30 hover:shadow-[#00ff88]/50 hover-lift"
                  >
                    ✓ Agregar y Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para configurar mínimo */}
      {showConfigurarMinimoModal && itemParaMinimo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#ffb800]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ffb800]/10 via-transparent to-[#ffb800]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffb800]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#ffb800] to-[#ff9500] flex items-center justify-center shadow-xl shadow-[#ffb800]/40 ring-2 ring-[#ffb800]/20">
                  <span className="text-2xl">⚙️</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Configurar Mínimo</h2>
                  <p className="text-[#718096] text-xs mt-1">
                    {itemParaMinimo.tipo === "material" 
                      ? `${itemParaMinimo.tipoMaterial} - ${limpiarNombre(itemParaMinimo.color || "", itemParaMinimo.tipoMaterial || "")}`
                      : `${categorias.find(c => c.id === itemParaMinimo.categoriaId)?.nombre} - ${itemParaMinimo.itemNombre}`
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    Nivel Mínimo de Stock:
                  </label>
                  <input
                    type="number"
                    value={valorMinimo}
                    onChange={(e) => setValorMinimo(e.target.value)}
                    className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#ffb800] focus:border-[#ffb800] placeholder-[#718096] shadow-lg hover:border-[#ffb800]/50 transition-all duration-200"
                    placeholder="Ej: 20"
                    autoFocus
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleGuardarMinimo();
                      }
                      if (e.key === "Escape") {
                        setShowConfigurarMinimoModal(false);
                        setItemParaMinimo(null);
                        setValorMinimo("");
                      }
                    }}
                  />
                  <p className="text-[#718096] text-xs mt-2">
                    💡 Establece el nivel mínimo. Cuando el stock esté por debajo, se mostrará una alerta. Deja en 0 para desactivar.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowConfigurarMinimoModal(false);
                      setItemParaMinimo(null);
                      setValorMinimo("");
                    }}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleGuardarMinimo}
                    className="flex-1 bg-gradient-to-r from-[#ffb800] to-[#ff9500] hover:from-[#ffc933] hover:to-[#ffb800] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#ffb800]/30 hover:shadow-[#ffb800]/50 hover-lift"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para configurar PIN */}
      {showConfigurarPinModal && operadorParaPin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-up p-4">
          <div 
            className="card-elegant rounded-2xl p-6 lg:p-8 max-w-md w-full border-2 border-[#00d4ff]/30 shadow-2xl relative overflow-hidden animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/10 via-transparent to-[#00d4ff]/5"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Configurar PIN</h2>
                  <p className="text-[#718096] text-xs mt-1">
                    Operador: <span className="text-white font-semibold">{operadorParaPin}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
                    PIN / Contraseña:
                  </label>
                  <NumericKeypad
                    value={nuevoPin}
                    onChange={setNuevoPin}
                    maxLength={10}
                    placeholder="Ingresa el PIN (mínimo 4 caracteres)"
                    autoFocus={true}
                    onEnter={() => {
                      if (nuevoPin.length >= 4) {
                        handleGuardarPin();
                      }
                    }}
                    onEscape={() => {
                      setShowConfigurarPinModal(false);
                      setOperadorParaPin(null);
                      setNuevoPin("");
                    }}
                  />
                  <p className="text-[#718096] text-xs mt-2">
                    💡 El operador usará este PIN para iniciar sesión y asignar operadores a las máquinas. Mínimo 4 caracteres.
                  </p>
                  {tienePinOperadorSync(operadorParaPin) && (
                    <p className="text-[#ffb800] text-xs mt-2 font-semibold">
                      ⚠️ Ya existe un PIN configurado. Al guardar se reemplazará.
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleEliminarPin}
                    className="flex-1 bg-[#2d3748] hover:bg-[#4a5568] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 border border-[#4a5568] hover:border-[#6a7488] hover-lift"
                  >
                    {tienePinOperadorSync(operadorParaPin) ? "Eliminar PIN" : "Cancelar"}
                  </button>
                  <button
                    onClick={handleGuardarPin}
                    disabled={nuevoPin.length < 4}
                    className="flex-1 bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 hover-lift disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed"
                  >
                    Guardar PIN
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

