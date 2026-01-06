"use client";

import { useState, useEffect, useMemo } from "react";
import { limpiarNombre, esLineaLibre } from "../data";
import { obtenerColoresCombinadosSync } from "../utils/colores";
import CambiarOperadorMaquinaModal from "./CambiarOperadorMaquinaModal";

interface MachineCardProps {
  maquinaId: number;
  tipoSeleccionado: string;
  operador: string;
  conteoOperador?: { chicas: number; grandes: number; total: number };
  modoEdicion: boolean;
  colorChicaInicial?: string;
  colorGrandeInicial?: string;
  onImprimir: (maquinaId: number, etiquetaChica: string, etiquetaGrande: string, operador: string, tipoMaterial: string, cantidadChicas: number, cantidadGrandes: number) => void;
  onCambiarOperador: (maquinaId: number, nuevoOperador: string) => void;
  onCambiarColorChica?: (maquinaId: number, color: string) => void;
  onCambiarColorGrande?: (maquinaId: number, color: string) => void;
}

interface ColorOption {
  color: string;
  tipo: string;
  esChica: boolean;
}

export default function MachineCard({
  maquinaId,
  tipoSeleccionado,
  operador,
  conteoOperador,
  modoEdicion,
  colorChicaInicial = "",
  colorGrandeInicial = "",
  onImprimir,
  onCambiarOperador,
  onCambiarColorChica,
  onCambiarColorGrande,
}: MachineCardProps) {
  // Estado para material seleccionado (por máquina)
  const [materialSeleccionado, setMaterialSeleccionado] = useState<string>(() => {
    if (colorChicaInicial) {
      return colorChicaInicial.split("::")[0];
    }
    return tipoSeleccionado || "PLA"; // Usar el tipo global o PLA por defecto
  });
  
  // Estado unificado: un solo color para ambas etiquetas
  const [colorSeleccionado, setColorSeleccionado] = useState<string>(() => {
    // Si hay colores iniciales, usar el de chica como base (sin _GRANDE)
    if (colorChicaInicial) {
      const [tipo, color] = colorChicaInicial.split("::");
      // Remover sufijo _GRANDE si existe para obtener el color base
      const colorBase = color.replace(/_GRANDE$/, "");
      return `${tipo}::${colorBase}`;
    }
    return "";
  });
  
  const [tipoMaterial, setTipoMaterial] = useState<string>(materialSeleccionado);
  // Un solo selector de cantidad de bobinas (1 bobina = 1 chica + 1 grande)
  const [cantidadBobinas, setCantidadBobinas] = useState<number>(8);
  const [showCambiarOperadorModal, setShowCambiarOperadorModal] = useState<boolean>(false);

  // Actualizar cuando cambien los colores iniciales
  useEffect(() => {
    if (colorChicaInicial) {
      const [tipo, color] = colorChicaInicial.split("::");
      const colorBase = color.replace(/_GRANDE$/, "");
      setColorSeleccionado(`${tipo}::${colorBase}`);
      setMaterialSeleccionado(tipo);
      setTipoMaterial(tipo);
    }
  }, [colorChicaInicial, colorGrandeInicial]);
  
  // Limpiar color cuando cambie el material
  useEffect(() => {
    if (materialSeleccionado) {
      setTipoMaterial(materialSeleccionado);
      // Si el color seleccionado no pertenece al material actual, limpiarlo
      if (colorSeleccionado && !colorSeleccionado.startsWith(`${materialSeleccionado}::`)) {
        setColorSeleccionado("");
      }
    }
  }, [materialSeleccionado]);

  // Obtener colores base (sin _GRANDE) SOLO del material seleccionado
  const coloresDelMaterial = useMemo(() => {
    if (!materialSeleccionado) return [];
    
    const coloresCombinados = obtenerColoresCombinadosSync();
    const opciones: ColorOption[] = [];
    const coloresVistos = new Set<string>(); // Para evitar duplicados
    
    const tipo = materialSeleccionado;
    const coloresTipo = coloresCombinados[tipo];
    
    if (!coloresTipo) return [];
    
    // Primero obtener colores de chica
    const coloresChica = coloresTipo.chica || {};
    Object.keys(coloresChica).forEach((color) => {
      const colorBase = color.replace(/_GRANDE$/, "");
      const key = `${tipo}::${colorBase}`;
      if (!coloresVistos.has(key)) {
        opciones.push({ color: colorBase, tipo, esChica: true });
        coloresVistos.add(key);
      }
    });
    
    // Luego obtener colores de grande (por si hay alguno que no esté en chica)
    const coloresGrande = coloresTipo.grande || {};
    Object.keys(coloresGrande).forEach((color) => {
      const colorBase = color.replace(/_GRANDE$/, "");
      const key = `${tipo}::${colorBase}`;
      if (!coloresVistos.has(key)) {
        opciones.push({ color: colorBase, tipo, esChica: false });
        coloresVistos.add(key);
      }
    });
    
    return opciones.sort((a, b) => {
      const nombreA = limpiarNombre(a.color, a.tipo);
      const nombreB = limpiarNombre(b.color, b.tipo);
      return nombreA.localeCompare(nombreB);
    });
  }, [materialSeleccionado]);
  
  // Obtener lista de materiales disponibles
  const materialesDisponibles = useMemo(() => {
    const coloresCombinados = obtenerColoresCombinadosSync();
    return Object.keys(coloresCombinados).sort();
  }, []);

  const getDisplayName = (color: string, tipo: string) => {
    const nombreLimpio = limpiarNombre(color, tipo);
    return `${nombreLimpio} ${tipo}`;
  };

  const getValueKey = (color: string, tipo: string) => {
    return `${tipo}::${color}`;
  };

  const getColorHex = (color: string, tipo: string, esChica: boolean): string => {
    const coloresCombinados = obtenerColoresCombinadosSync();
    if (esChica) {
      return coloresCombinados[tipo]?.chica?.[color] || coloresCombinados[tipo]?.grande?.[color] || "#808080";
    } else {
      return coloresCombinados[tipo]?.grande?.[color] || coloresCombinados[tipo]?.chica?.[color] || "#808080";
    }
  };

  const handleImprimir = () => {
    if (!colorSeleccionado || !operador || !tipoMaterial) {
      alert("Por favor, selecciona un color antes de imprimir");
      return;
    }
    if (esLineaLibre(operador)) {
      alert("No se puede imprimir cuando la máquina está en estado 'Línea Libre'. Por favor, asigna un operador primero.");
      return;
    }
    if (cantidadBobinas < 0 || cantidadBobinas > 10) {
      alert("La cantidad de bobinas debe estar entre 0 y 10");
      return;
    }
    if (cantidadBobinas === 0) {
      alert("Debes imprimir al menos una bobina");
      return;
    }
    
    // Construir etiquetas: color base para chica, color base + "_GRANDE" para grande
    // 1 bobina = 1 chica + 1 grande
    const [tipo, colorBase] = colorSeleccionado.split("::");
    const etiquetaChica = `${tipo}::${colorBase}`;
    const etiquetaGrande = `${tipo}::${colorBase}_GRANDE`;
    
    // Cantidad de chicas y grandes es igual a la cantidad de bobinas
    onImprimir(maquinaId, etiquetaChica, etiquetaGrande, operador, tipoMaterial, cantidadBobinas, cantidadBobinas);
  };

  const handleColorChange = (value: string) => {
    setColorSeleccionado(value);
    if (value) {
      const [tipo, colorBase] = value.split("::");
      setTipoMaterial(tipo);
      
      // Actualizar ambos colores (chica y grande) cuando se selecciona un color base
      const etiquetaChica = `${tipo}::${colorBase}`;
      const etiquetaGrande = `${tipo}::${colorBase}_GRANDE`;
      
      // Guardar ambos colores en el estado de la máquina
      if (onCambiarColorChica) {
        onCambiarColorChica(maquinaId, etiquetaChica);
      }
      if (onCambiarColorGrande) {
        onCambiarColorGrande(maquinaId, etiquetaGrande);
      }
    } else {
      setTipoMaterial("");
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-6 shadow-2xl border border-[#2d3748] hover:border-[#00d4ff]/30 transition-all duration-300 hover-lift relative overflow-hidden group">
      {/* Efecto de brillo sutil en hover */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4ff]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      {/* Header de la máquina */}
      <div className="mb-6 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4ff]/30">
            <span className="text-xl">⚙️</span>
          </div>
          <h2 className="text-2xl font-bold text-white">
            Máquina {maquinaId}
          </h2>
        </div>
        <div className="h-1 w-16 bg-gradient-to-r from-[#00d4ff] to-transparent rounded-full mx-auto"></div>
      </div>

      <div className="space-y-5 relative z-10">
        {/* Selector de material (primero) */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            📦 Material
          </label>
          <select
            value={materialSeleccionado}
            onChange={(e) => {
              setMaterialSeleccionado(e.target.value);
              setColorSeleccionado(""); // Limpiar color al cambiar material
            }}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg"
          >
            {materialesDisponibles.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </div>

        {/* Selector unificado de color (se usa para ambas etiquetas) - Solo del material seleccionado */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            🎨 Color (Chicas y Grandes)
          </label>
          <div className="relative">
            <select
              value={colorSeleccionado}
              onChange={(e) => handleColorChange(e.target.value)}
              disabled={!materialSeleccionado}
              className="w-full px-4 py-3 pl-12 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">-- Selecciona color --</option>
              {coloresDelMaterial.map((opcion) => {
                const colorHex = getColorHex(opcion.color, opcion.tipo, true);
                return (
                  <option key={getValueKey(opcion.color, opcion.tipo)} value={getValueKey(opcion.color, opcion.tipo)}>
                    {getDisplayName(opcion.color, opcion.tipo)}
                  </option>
                );
              })}
            </select>
            {colorSeleccionado && (
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg border-2 border-[#2d3748] shadow-md flex-shrink-0"
                style={{ backgroundColor: (() => {
                  const [tipo, colorBase] = colorSeleccionado.split("::");
                  return getColorHex(colorBase || "", tipo || materialSeleccionado, true);
                })() }}
              />
            )}
          </div>
          {colorSeleccionado && (
            <p className="text-[#718096] text-xs mt-2 flex items-center gap-1">
              <span>💡</span>
              Este color se aplicará a etiquetas chicas y grandes
            </p>
          )}
          {!materialSeleccionado && (
            <p className="text-[#718096] text-xs mt-2 flex items-center gap-1">
              <span>⚠️</span>
              Primero selecciona un material
            </p>
          )}
        </div>

        {/* Selector unificado de cantidad de bobinas */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            📊 Cantidad de Bobinas
          </label>
          <select
            value={cantidadBobinas}
            onChange={(e) => setCantidadBobinas(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg"
          >
            {Array.from({ length: modoEdicion ? 11 : 2 }, (_, i) => i).map((num) => (
              <option key={num} value={num}>
                {num === 0 ? "0 (sin imprimir)" : `${num} ${num === 1 ? "bobina" : "bobinas"} (${num} chica + ${num} grande)`}
              </option>
            ))}
          </select>
          {cantidadBobinas > 0 && (
            <p className="text-[#718096] text-xs mt-2 flex items-center gap-1">
              <span>💡</span>
              Se imprimirán {cantidadBobinas} etiqueta(s) chica(s) y {cantidadBobinas} etiqueta(s) grande(s)
              {!modoEdicion && (
                <span className="text-[#ffb800] ml-1">
                  (Límite: 1 bobina cada 2 minutos)
                </span>
              )}
              {modoEdicion && (
                <span className="text-[#00d4ff] ml-1">
                  (Límite: hasta 10 bobinas)
                </span>
              )}
            </p>
          )}
        </div>

        {/* Operador asignado */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            👷 Operador
          </label>
          <div className="relative">
            {/* Los operadores ahora pueden cambiar el operador asignado */}
            <button
              type="button"
              onClick={() => setShowCambiarOperadorModal(true)}
              className="w-full bg-[#0f1419] hover:bg-[#1a2332] text-white px-4 py-3 rounded-xl border border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer text-left transition-all duration-200 shadow-lg hover:shadow-[#00d4ff]/10"
            >
              <div className="flex items-center gap-2">
                <span>{operador ? "✅" : "➕"}</span>
                <span className="font-medium">{operador || "Sin asignar - Click para asignar"}</span>
              </div>
            </button>
            {operador && (
              <>
                <p className="text-[#718096] text-xs mt-2 flex items-center gap-1">
                  <span>💡</span>
                  Click para cambiar operador
                </p>
                {conteoOperador && (
                  <div className="mt-3 pt-3 border-t border-[#2d3748] bg-[#0f1419] rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#718096]">Chicas:</span>
                      <span className="text-[#00d4ff] font-bold">{conteoOperador.chicas}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[#718096]">Grandes:</span>
                      <span className="text-[#00d4ff] font-bold">{conteoOperador.grandes}</span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-[#2d3748] flex justify-between items-center">
                      <span className="text-[#a0aec0] text-xs font-semibold">Total:</span>
                      <span className="text-[#ffb800] font-bold">{conteoOperador.total}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mensaje cuando está en Línea Libre */}
        {esLineaLibre(operador) && (
          <div className="mt-4 p-4 bg-gradient-to-r from-[#ffb800]/20 to-[#ff8c00]/20 border border-[#ffb800]/50 rounded-xl">
            <div className="flex items-center gap-2 text-[#ffb800]">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm">Máquina en Línea Libre</p>
                <p className="text-xs text-[#ffb800]/80 mt-1">
                  No se puede imprimir en este estado. Asigna un operador para habilitar la impresión.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de imprimir */}
        <button
          onClick={handleImprimir}
          disabled={!colorSeleccionado || !operador || !tipoMaterial || esLineaLibre(operador)}
          className="w-full bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 mt-6 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 disabled:shadow-none hover-lift flex items-center justify-center gap-2"
          title={esLineaLibre(operador) ? "No se puede imprimir en estado Línea Libre" : `Imprime ${cantidadBobinas} bobina(s) (${cantidadBobinas} chica + ${cantidadBobinas} grande)`}
        >
          <span className="text-xl">🖨️</span>
          <span>Imprimir Etiquetas</span>
          <span className="text-xs opacity-75">({cantidadBobinas} bobina{cantidadBobinas !== 1 ? 's' : ''})</span>
        </button>
      </div>

      {/* Modal para cambiar operador de esta máquina (ahora disponible para todos) */}
      {showCambiarOperadorModal && (
        <CambiarOperadorMaquinaModal
          maquinaId={maquinaId}
          operadorActual={operador}
          isOpen={showCambiarOperadorModal}
          modoEdicion={modoEdicion}
          onClose={() => setShowCambiarOperadorModal(false)}
          onConfirm={(nuevoOperador) => {
            onCambiarOperador(maquinaId, nuevoOperador);
            setShowCambiarOperadorModal(false);
          }}
        />
      )}
    </div>
  );
}

