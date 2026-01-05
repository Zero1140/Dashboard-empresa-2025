"use client";

import { useState, useEffect } from "react";
import { limpiarNombre } from "../data";
import { obtenerColoresCombinadosSync } from "../utils/colores";
import { obtenerStock, obtenerStockSync, establecerStock, suscribirStockRealtime, StockPorTipo } from "../utils/stock";
import { obtenerCategoriasArray, obtenerCategoriasArraySync, suscribirCategoriasRealtime } from "../utils/categorias";
import { obtenerStockCategorias, obtenerStockCategoriasSync, establecerStockCategoria, suscribirStockCategoriasRealtime, StockCategoria } from "../utils/stockCategorias";
import { useRealtimeSync } from "../utils/useRealtimeSync";
import { obtenerMinimoMaterialSync, obtenerMinimoCategoriaSync, obtenerAlertasStock, AlertaStock } from "../utils/stockMinimos";

interface StockPageProps {
  onSupabaseError?: (error: "NOT_CONFIGURED" | "CONNECTION_ERROR") => void;
}

export default function StockPage({ onSupabaseError }: StockPageProps = {}) {
  const [vistaActiva, setVistaActiva] = useState<"materiales" | "categorias">("materiales");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("PLA");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("");
  const [stock, setStock] = useState<StockPorTipo>({});
  const [stockCategorias, setStockCategorias] = useState<StockCategoria>({});
  const [categorias, setCategorias] = useState(obtenerCategoriasArraySync());
  const [editingColor, setEditingColor] = useState<{ tipo: string; color: string } | null>(null);
  const [editingItem, setEditingItem] = useState<{ categoriaId: string; itemNombre: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);

  // Cargar stock desde Supabase al iniciar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const nuevoStock = await obtenerStock();
        const nuevoStockCategorias = await obtenerStockCategorias();
        const cats = await obtenerCategoriasArray();
        
        setStock(nuevoStock);
        setStockCategorias(nuevoStockCategorias);
        setCategorias(cats);
        if (cats.length > 0 && !categoriaSeleccionada) {
          setCategoriaSeleccionada(cats[0].id);
        }
      } catch (error: any) {
        console.error('Error al cargar datos de stock:', error);
        if (error?.name === 'SupabaseNotConfiguredError' && onSupabaseError) {
          onSupabaseError('NOT_CONFIGURED');
        } else if (error?.name === 'SupabaseConnectionError' && onSupabaseError) {
          onSupabaseError('CONNECTION_ERROR');
        }
      }
    };
    cargarDatos();
  }, [onSupabaseError, categoriaSeleccionada]);

  // Suscripción Realtime para sincronización en tiempo real
  useRealtimeSync({
    onStockChange: (nuevoStock) => {
      setStock(nuevoStock);
      // Recalcular alertas cuando cambia el stock
      const coloresCombinados = obtenerColoresCombinadosSync();
      const nuevasAlertas = obtenerAlertasStock(
        nuevoStock,
        stockCategorias,
        coloresCombinados,
        categorias
      );
      setAlertas(nuevasAlertas);
    },
    onStockCategoriasChange: (nuevoStockCategorias) => {
      setStockCategorias(nuevoStockCategorias);
      // Recalcular alertas cuando cambia el stock de categorías
      const coloresCombinados = obtenerColoresCombinadosSync();
      const nuevasAlertas = obtenerAlertasStock(
        stock,
        nuevoStockCategorias,
        coloresCombinados,
        categorias
      );
      setAlertas(nuevasAlertas);
    },
    onCategoriasChange: async (nuevasCategoriasData) => {
      const nuevasCategorias = Object.values(nuevasCategoriasData);
      setCategorias(nuevasCategorias);
      // Recalcular alertas cuando cambian las categorías
      const coloresCombinados = obtenerColoresCombinadosSync();
      const nuevasAlertas = obtenerAlertasStock(
        stock,
        stockCategorias,
        coloresCombinados,
        nuevasCategorias
      );
      setAlertas(nuevasAlertas);
    },
  });

  // Escuchar cambios en categorías
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleCategoriasActualizadas = async () => {
      const nuevasCategorias = await obtenerCategoriasArray();
      setCategorias(nuevasCategorias);
      // Usar el valor actualizado de nuevasCategorias en lugar de categorias del estado
      if (nuevasCategorias.length > 0 && !categoriaSeleccionada) {
        setCategoriaSeleccionada(nuevasCategorias[0].id);
      }
    };
    
    window.addEventListener("categoriasActualizadas", handleCategoriasActualizadas);
    return () => window.removeEventListener("categoriasActualizadas", handleCategoriasActualizadas);
  }, [categoriaSeleccionada]);

  // Escuchar cambios en colores para actualizar stock automáticamente
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleColoresActualizados = async () => {
      // Cuando se agregan colores personalizados, asegurar que estén en el stock
      const nuevoStock = await obtenerStock();
      setStock(nuevoStock);
    };
    
    window.addEventListener("coloresActualizados", handleColoresActualizados);
    return () => window.removeEventListener("coloresActualizados", handleColoresActualizados);
  }, []);

  const handleEditStock = (tipo: string, color: string, stockActual: number) => {
    setEditingColor({ tipo, color });
    setEditValue(stockActual.toString());
  };

  const handleSaveStock = async () => {
    if (editingColor) {
      const cantidad = parseInt(editValue) || 0;
      await establecerStock(editingColor.tipo, editingColor.color, cantidad);
      const nuevoStock = await obtenerStock();
      setStock(nuevoStock);
      setEditingColor(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingColor(null);
    setEditingItem(null);
    setEditValue("");
  };

  const handleEditStockCategoria = (categoriaId: string, itemNombre: string, stockActual: number) => {
    setEditingItem({ categoriaId, itemNombre });
    setEditValue(stockActual.toString());
  };

  const handleSaveStockCategoria = async () => {
    if (editingItem) {
      const cantidad = parseInt(editValue) || 0;
      await establecerStockCategoria(editingItem.categoriaId, editingItem.itemNombre, cantidad);
      const nuevoStockCategorias = await obtenerStockCategorias();
      setStockCategorias(nuevoStockCategorias);
      setEditingItem(null);
      setEditValue("");
    }
  };

  const coloresCombinados = obtenerColoresCombinadosSync();
  const coloresTipo = coloresCombinados[tipoSeleccionado] || { chica: {}, grande: {} };
  const todosColores = new Set([
    ...Object.keys(coloresTipo.chica || {}),
    ...Object.keys(coloresTipo.grande || {}),
  ]);

  // Obtener stock del tipo seleccionado, inicializar si no existe
  const stockTipo = stock[tipoSeleccionado] || {};
  const stockTotalTipo = Object.values(stockTipo).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div className="p-8 space-y-8">
      {/* Header elegante con alertas */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 shadow-2xl border border-[#2d3748] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4ff]/30">
                <span className="text-3xl">📦</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-white to-[#a0aec0] bg-clip-text text-transparent">
                  Gestión de Stock
                </h1>
                <p className="text-[#718096] mt-1 font-medium">Inventario de materiales y categorías</p>
              </div>
            </div>
            {alertas.length > 0 && (
              <div className="bg-gradient-to-r from-[#ff4757]/20 to-[#cc3846]/20 border-2 border-[#ff4757]/50 rounded-xl px-6 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🚨</span>
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{alertas.length}</div>
                  <div className="text-[#ff6b7a] text-xs font-semibold">
                    {alertas.length === 1 ? "Alerta activa" : "Alertas activas"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard de Alertas Prioritarias */}
      {alertas.length > 0 && (
        <div className="card-elegant rounded-2xl p-6 border-2 border-[#ff4757]/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center shadow-lg">
              <span className="text-2xl">🚨</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Alertas de Stock Bajo</h2>
              <p className="text-[#718096] text-xs">Acción requerida inmediata</p>
            </div>
          </div>
          <div className="space-y-2">
            {alertas.slice(0, 5).map((alerta, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-[#ff4757]/10 to-[#cc3846]/10 border border-[#ff4757]/30 rounded-lg p-4 flex items-center justify-between hover:border-[#ff4757]/50 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ff4757] to-[#cc3846] flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">
                      {alerta.tipo === "material" ? "🎨" : "📦"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">
                      {alerta.tipo === "material" 
                        ? `${alerta.tipoMaterial} - ${limpiarNombre(alerta.color || "", alerta.tipoMaterial || "")}`
                        : `${alerta.categoriaNombre} - ${alerta.itemNombre}`
                      }
                    </div>
                    <div className="text-[#718096] text-xs">
                      Stock actual: <span className="text-[#ff4757] font-bold">{alerta.stockActual}</span> / 
                      Mínimo: <span className="text-white">{alerta.stockMinimo}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <div className="text-[#ff4757] font-bold text-lg">
                    -{alerta.diferencia}
                  </div>
                  <div className="text-[#718096] text-xs">faltan</div>
                </div>
              </div>
            ))}
            {alertas.length > 5 && (
              <div className="text-center pt-2">
                <p className="text-[#718096] text-sm">
                  Y {alertas.length - 5} {alertas.length - 5 === 1 ? "alerta más" : "alertas más"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs de vista */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-6 border border-[#2d3748] shadow-xl">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setVistaActiva("materiales")}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 hover-lift ${
              vistaActiva === "materiales"
                ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg shadow-[#00d4ff]/30"
                : "bg-[#0f1419] text-[#a0aec0] hover:bg-[#1a2332] border border-[#2d3748] hover:border-[#00d4ff]/30"
            }`}
          >
            🎨 Materiales
          </button>
          <button
            onClick={() => setVistaActiva("categorias")}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 hover-lift ${
              vistaActiva === "categorias"
                ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg shadow-[#00d4ff]/30"
                : "bg-[#0f1419] text-[#a0aec0] hover:bg-[#1a2332] border border-[#2d3748] hover:border-[#00d4ff]/30"
            }`}
          >
            📁 Categorías
          </button>
        </div>
      </div>

      {/* Vista de Materiales */}
      {vistaActiva === "materiales" && (
        <>
          {/* Selector de tipo y resumen */}
          <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-6 border border-[#2d3748] shadow-xl">
        <div className="flex justify-between items-center flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[#a0aec0] text-sm font-bold mb-3 uppercase tracking-wide">
              Tipo de Material:
            </label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value)}
              className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
            >
              {Object.keys(coloresCombinados).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="text-right bg-[#0f1419] rounded-xl p-6 border border-[#2d3748] min-w-[200px]">
            <div className="text-[#718096] text-sm font-semibold mb-2 uppercase tracking-wide">Stock Total</div>
            <div className="text-[#00d4ff] text-4xl font-bold">{stockTotalTipo}</div>
            <div className="text-[#718096] text-xs mt-1">unidades</div>
          </div>
        </div>
      </div>

      {/* Grid de stock elegante - 2 columnas */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 border border-[#2d3748] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">📋</span>
          <h2 className="text-2xl font-bold text-white">
            Stock de Colores - <span className="text-[#00d4ff]">{tipoSeleccionado}</span>
          </h2>
        </div>
        {todosColores.size === 0 ? (
          <div className="text-[#718096] text-center py-12 bg-[#0f1419] rounded-xl border border-[#2d3748]">
            <span className="text-4xl block mb-3">📭</span>
            <p className="font-semibold">No hay colores disponibles para este tipo</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {Array.from(todosColores)
              .sort((a, b) => a.localeCompare(b))
              .map((color) => {
                const stockColor = stockTipo[color] || 0;
                const isEditing =
                  editingColor?.tipo === tipoSeleccionado && editingColor?.color === color;
                const colorHex =
                  coloresTipo.chica[color] || coloresTipo.grande[color] || "#808080";
                const minimo = obtenerMinimoMaterialSync(tipoSeleccionado, color);
                const tieneAlerta = minimo > 0 && stockColor < minimo;

                return (
                  <div
                    key={color}
                    className={`rounded-lg p-3 border transition-all duration-200 hover-lift shadow-md ${
                      tieneAlerta
                        ? "bg-gradient-to-br from-[#ff4757]/10 to-[#cc3846]/10 border-[#ff4757]/50 hover:border-[#ff4757]/70"
                        : "bg-gradient-to-br from-[#0f1419] to-[#1a2332] border-[#2d3748] hover:border-[#00d4ff]/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Muestra de color */}
                      <div
                        className="w-12 h-12 rounded-lg border-2 border-[#2d3748] shadow-md flex-shrink-0"
                        style={{ backgroundColor: colorHex }}
                      />
                      
                      {/* Nombre del color */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">
                          {limpiarNombre(color, tipoSeleccionado)}
                        </h3>
                      </div>
                      
                      {/* Stock */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 bg-[#0a0a0a] text-white px-2 py-1.5 rounded-lg border-2 border-[#00d4ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] text-center font-bold text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveStock();
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                        ) : (
                          <div className="text-right">
                            <span className={`text-lg font-bold min-w-[3rem] ${tieneAlerta ? "text-[#ff4757]" : "text-[#00d4ff]"}`}>
                              {stockColor}
                            </span>
                            {minimo > 0 && (
                              <div className="text-xs text-[#718096]">
                                / {minimo}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Indicador de alerta */}
                      {tieneAlerta && (
                        <div className="flex-shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff4757] animate-pulse" title={`Stock bajo: faltan ${minimo - stockColor} unidades`}></div>
                        </div>
                      )}
                      
                      {/* Botones de acción */}
                      <div className="flex-shrink-0">
                        {isEditing ? (
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleSaveStock}
                              className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#33ff99] hover:to-[#00ff88] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                              title="Guardar"
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                              title="Cancelar"
                            >
                              ✗
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditStock(tipoSeleccionado, color, stockColor)}
                            className="bg-[#2d3748] hover:bg-[#4a5568] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border border-[#4a5568] hover:border-[#00d4ff]/50 hover-lift"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
        </>
      )}

      {/* Vista de Categorías */}
      {vistaActiva === "categorias" && (
        <>
          {/* Selector de categoría */}
          {categorias.length > 0 ? (
            <>
              <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-6 border border-[#2d3748] shadow-xl">
                <div className="flex justify-between items-center flex-wrap gap-6">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[#a0aec0] text-sm font-bold mb-3 uppercase tracking-wide">
                      Categoría:
                    </label>
                    <select
                      value={categoriaSeleccionada || categorias[0]?.id || ""}
                      onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                      className="w-full bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
                    >
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-right bg-[#0f1419] rounded-xl p-6 border border-[#2d3748] min-w-[200px]">
                    <div className="text-[#718096] text-sm font-semibold mb-2 uppercase tracking-wide">Stock Total</div>
                    <div className="text-[#00d4ff] text-4xl font-bold">
                      {categoriaSeleccionada 
                        ? (() => {
                            // Solo sumar stock de items que realmente existen en la categoría
                            const categoria = categorias.find(c => c.id === categoriaSeleccionada);
                            if (!categoria) return 0;
                            return categoria.items.reduce((sum, item) => {
                              const stockItem = stockCategorias[categoriaSeleccionada]?.[item] || 0;
                              return sum + stockItem;
                            }, 0);
                          })()
                        : 0}
                    </div>
                    <div className="text-[#718096] text-xs mt-1">unidades</div>
                  </div>
                </div>
              </div>

              {/* Grid de stock de categoría */}
              {categoriaSeleccionada && (
                <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 border border-[#2d3748] shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-2xl">📋</span>
                    <h2 className="text-2xl font-bold text-white">
                      Stock de <span className="text-[#00d4ff]">{categorias.find(c => c.id === categoriaSeleccionada)?.nombre}</span>
                    </h2>
                  </div>
                  {categorias.find(c => c.id === categoriaSeleccionada)?.items.length === 0 ? (
                    <div className="text-[#718096] text-center py-12 bg-[#0f1419] rounded-xl border border-[#2d3748]">
                      <span className="text-4xl block mb-3">📭</span>
                      <p className="font-semibold">No hay items en esta categoría</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {categorias
                        .find(c => c.id === categoriaSeleccionada)
                        ?.items.map((item) => {
                          const stockItem = stockCategorias[categoriaSeleccionada]?.[item] || 0;
                          const isEditing = editingItem?.categoriaId === categoriaSeleccionada && editingItem?.itemNombre === item;
                          const minimo = obtenerMinimoCategoriaSync(categoriaSeleccionada, item);
                          const tieneAlerta = minimo > 0 && stockItem < minimo;

                          return (
                            <div
                              key={item}
                              className={`rounded-lg p-3 border transition-all duration-200 hover-lift shadow-md ${
                                tieneAlerta
                                  ? "bg-gradient-to-br from-[#ff4757]/10 to-[#cc3846]/10 border-[#ff4757]/50 hover:border-[#ff4757]/70"
                                  : "bg-gradient-to-br from-[#0f1419] to-[#1a2332] border-[#2d3748] hover:border-[#00d4ff]/30"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-md flex-shrink-0">
                                  <span className="text-xl">📦</span>
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-white font-semibold text-sm truncate">
                                    {item}
                                  </h3>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      className="w-20 bg-[#0a0a0a] text-white px-2 py-1.5 rounded-lg border-2 border-[#00d4ff] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] text-center font-bold text-sm"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveStockCategoria();
                                        if (e.key === "Escape") handleCancelEdit();
                                      }}
                                    />
                                  ) : (
                                    <div className="text-right">
                                      <span className={`text-lg font-bold min-w-[3rem] ${tieneAlerta ? "text-[#ff4757]" : "text-[#00d4ff]"}`}>
                                        {stockItem}
                                      </span>
                                      {minimo > 0 && (
                                        <div className="text-xs text-[#718096]">
                                          / {minimo}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {/* Indicador de alerta */}
                                {tieneAlerta && (
                                  <div className="flex-shrink-0">
                                    <div className="w-3 h-3 rounded-full bg-[#ff4757] animate-pulse" title={`Stock bajo: faltan ${minimo - stockItem} unidades`}></div>
                                  </div>
                                )}
                                
                                <div className="flex-shrink-0">
                                  {isEditing ? (
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={handleSaveStockCategoria}
                                        className="bg-gradient-to-r from-[#00ff88] to-[#00cc6a] hover:from-[#33ff99] hover:to-[#00ff88] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                                        title="Guardar"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="bg-gradient-to-r from-[#ff4757] to-[#cc3846] hover:from-[#ff5f6d] hover:to-[#ff4757] text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-md hover-lift"
                                        title="Cancelar"
                                      >
                                        ✗
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleEditStockCategoria(categoriaSeleccionada, item, stockItem)}
                                      className="bg-[#2d3748] hover:bg-[#4a5568] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border border-[#4a5568] hover:border-[#00d4ff]/50 hover-lift"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-12 border border-[#2d3748] shadow-2xl text-center">
              <span className="text-6xl block mb-4">📭</span>
              <h2 className="text-2xl font-bold text-white mb-2">No hay categorías creadas</h2>
              <p className="text-[#718096]">
                Ve a la sección de <span className="text-[#00d4ff] font-semibold">Materiales</span> para crear categorías y gestionar su stock
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

