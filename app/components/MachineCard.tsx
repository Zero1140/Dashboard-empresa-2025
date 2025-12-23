"use client";

import { useState, useEffect, useMemo } from "react";
import { limpiarNombre, esLineaLibre } from "../data";
import { obtenerColoresCombinados } from "../utils/colores";
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
  const [etiquetaChica, setEtiquetaChica] = useState<string>(colorChicaInicial);
  const [etiquetaGrande, setEtiquetaGrande] = useState<string>(colorGrandeInicial);
  const [tipoMaterialChica, setTipoMaterialChica] = useState<string>(colorChicaInicial ? colorChicaInicial.split("::")[0] : "");
  const [tipoMaterialGrande, setTipoMaterialGrande] = useState<string>(colorGrandeInicial ? colorGrandeInicial.split("::")[0] : "");
  const [cantidadChicas, setCantidadChicas] = useState<number>(8);
  const [cantidadGrandes, setCantidadGrandes] = useState<number>(8);
  const [showCambiarOperadorModal, setShowCambiarOperadorModal] = useState<boolean>(false);
  
  // Estados para filtrar por tipo de material
  const [filtroTipoChica, setFiltroTipoChica] = useState<string>(colorChicaInicial ? colorChicaInicial.split("::")[0] : "PLA");
  const [filtroTipoGrande, setFiltroTipoGrande] = useState<string>(colorGrandeInicial ? colorGrandeInicial.split("::")[0] : "PLA");

  // Actualizar cuando cambien los colores iniciales
  useEffect(() => {
    setEtiquetaChica(colorChicaInicial);
    if (colorChicaInicial) {
      setTipoMaterialChica(colorChicaInicial.split("::")[0]);
    }
  }, [colorChicaInicial]);

  useEffect(() => {
    setEtiquetaGrande(colorGrandeInicial);
    if (colorGrandeInicial) {
      setTipoMaterialGrande(colorGrandeInicial.split("::")[0]);
    }
  }, [colorGrandeInicial]);

  // Obtener todos los tipos de materiales disponibles
  const tiposMateriales = useMemo(() => {
    return Object.keys(obtenerColoresCombinados());
  }, []);

  // Obtener colores filtrados por tipo para etiquetas chicas
  const etiquetasChicasFiltradas = useMemo(() => {
    const coloresCombinados = obtenerColoresCombinados();
    const tipo = filtroTipoChica;
    const colores = coloresCombinados[tipo]?.chica || {};
    const opciones: ColorOption[] = [];
    Object.keys(colores).forEach((color) => {
      opciones.push({ color, tipo, esChica: true });
    });
    return opciones.sort((a, b) => {
      const nombreA = limpiarNombre(a.color, a.tipo);
      const nombreB = limpiarNombre(b.color, b.tipo);
      return nombreA.localeCompare(nombreB);
    });
  }, [filtroTipoChica]);

  // Obtener colores filtrados por tipo para etiquetas grandes
  const etiquetasGrandesFiltradas = useMemo(() => {
    const coloresCombinados = obtenerColoresCombinados();
    const tipo = filtroTipoGrande;
    const colores = coloresCombinados[tipo]?.grande || {};
    const opciones: ColorOption[] = [];
    Object.keys(colores).forEach((color) => {
      opciones.push({ color, tipo, esChica: false });
    });
    return opciones.sort((a, b) => {
      const nombreA = limpiarNombre(a.color, a.tipo);
      const nombreB = limpiarNombre(b.color, b.tipo);
      return nombreA.localeCompare(nombreB);
    });
  }, [filtroTipoGrande]);

  // Obtener el color hexadecimal de una opción
  const obtenerColorHex = (color: string, tipo: string, esChica: boolean): string => {
    const coloresCombinados = obtenerColoresCombinados();
    if (esChica) {
      return coloresCombinados[tipo]?.chica?.[color] || "#808080";
    } else {
      return coloresCombinados[tipo]?.grande?.[color] || "#808080";
    }
  };

  const getDisplayName = (color: string, tipo: string) => {
    const nombreLimpio = limpiarNombre(color, tipo);
    return `${nombreLimpio} ${tipo}`;
  };

  const getValueKey = (color: string, tipo: string) => {
    return `${tipo}::${color}`;
  };

  const handleImprimir = () => {
    if (!etiquetaChica || !etiquetaGrande || !operador || !tipoMaterialChica || !tipoMaterialGrande) {
      alert("Por favor, completa todos los campos antes de imprimir");
      return;
    }
    if (esLineaLibre(operador)) {
      alert("No se puede imprimir cuando la máquina está en estado 'Línea Libre'. Por favor, asigna un operador primero.");
      return;
    }
    if (cantidadChicas < 1 || cantidadChicas > 10 || cantidadGrandes < 1 || cantidadGrandes > 10) {
      alert("La cantidad de etiquetas debe estar entre 1 y 10");
      return;
    }
    onImprimir(maquinaId, etiquetaChica, etiquetaGrande, operador, tipoMaterialChica, cantidadChicas, cantidadGrandes);
  };

  const handleEtiquetaChicaChange = (value: string) => {
    setEtiquetaChica(value);
    if (value) {
      const [tipo, color] = value.split("::");
      setTipoMaterialChica(tipo);
      setFiltroTipoChica(tipo); // Actualizar filtro cuando se selecciona un color
      // Ahora todos pueden cambiar el color (no solo supervisores)
      if (onCambiarColorChica) {
        onCambiarColorChica(maquinaId, value);
      }
    } else {
      setTipoMaterialChica("");
    }
  };

  const handleEtiquetaGrandeChange = (value: string) => {
    setEtiquetaGrande(value);
    if (value) {
      const [tipo, color] = value.split("::");
      setTipoMaterialGrande(tipo);
      setFiltroTipoGrande(tipo); // Actualizar filtro cuando se selecciona un color
      // Ahora todos pueden cambiar el color (no solo supervisores)
      if (onCambiarColorGrande) {
        onCambiarColorGrande(maquinaId, value);
      }
    } else {
      setTipoMaterialGrande("");
    }
  };

  // Actualizar filtros cuando cambian los colores iniciales
  useEffect(() => {
    if (colorChicaInicial) {
      const tipo = colorChicaInicial.split("::")[0];
      setFiltroTipoChica(tipo);
    }
  }, [colorChicaInicial]);

  useEffect(() => {
    if (colorGrandeInicial) {
      const tipo = colorGrandeInicial.split("::")[0];
      setFiltroTipoGrande(tipo);
    }
  }, [colorGrandeInicial]);

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
        {/* Selector de color etiqueta chica */}
        <div className="space-y-2">
          <label className="block text-white text-base font-bold mb-2 uppercase tracking-wide">
            🏷️ Etiqueta Chica
          </label>
          
          {/* Selector de tipo de material para filtrar */}
          <div>
            <label className="block text-[#a0aec0] text-xs font-semibold mb-1.5">
              Tipo de Material:
            </label>
            <select
              value={filtroTipoChica}
              onChange={(e) => {
                setFiltroTipoChica(e.target.value);
                setEtiquetaChica(""); // Limpiar selección al cambiar tipo
                setTipoMaterialChica("");
              }}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg text-sm font-medium"
            >
              {tiposMateriales.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de color con muestra visual */}
          <div>
            <label className="block text-[#a0aec0] text-xs font-semibold mb-1.5">
              Color:
            </label>
            <div className="relative">
              <select
                value={etiquetaChica}
                onChange={(e) => handleEtiquetaChicaChange(e.target.value)}
                className="w-full px-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg text-base font-semibold appearance-none"
              >
                <option value="" className="bg-[#0f1419]">-- Selecciona color --</option>
                {etiquetasChicasFiltradas.map((opcion) => {
                  const colorHex = obtenerColorHex(opcion.color, opcion.tipo, true);
                  return (
                    <option 
                      key={getValueKey(opcion.color, opcion.tipo)} 
                      value={getValueKey(opcion.color, opcion.tipo)}
                      style={{ backgroundColor: colorHex, color: '#000' }}
                    >
                      {limpiarNombre(opcion.color, opcion.tipo)}
                    </option>
                  );
                })}
              </select>
              {/* Muestra de color a la izquierda */}
              {etiquetaChica && (
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md border-2 border-white/40 shadow-md"
                  style={{ backgroundColor: obtenerColorHex(etiquetaChica.split("::")[1] || "", filtroTipoChica, true) }}
                />
              )}
              {/* Flecha del select */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-[#a0aec0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {/* Muestra de color debajo del selector */}
            {etiquetaChica && (
              <div className="mt-2 p-3 rounded-lg border border-[#2d3748] bg-[#0f1419]">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-white/40 shadow-lg flex-shrink-0"
                    style={{ backgroundColor: obtenerColorHex(etiquetaChica.split("::")[1] || "", filtroTipoChica, true) }}
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">
                      {limpiarNombre(etiquetaChica.split("::")[1] || "", filtroTipoChica)}
                    </p>
                    <p className="text-[#a0aec0] text-xs">{filtroTipoChica}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selector de color etiqueta grande */}
        <div className="space-y-2">
          <label className="block text-white text-base font-bold mb-2 uppercase tracking-wide">
            🏷️ Etiqueta Grande
          </label>
          
          {/* Selector de tipo de material para filtrar */}
          <div>
            <label className="block text-[#a0aec0] text-xs font-semibold mb-1.5">
              Tipo de Material:
            </label>
            <select
              value={filtroTipoGrande}
              onChange={(e) => {
                setFiltroTipoGrande(e.target.value);
                setEtiquetaGrande(""); // Limpiar selección al cambiar tipo
                setTipoMaterialGrande("");
              }}
              className="w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg text-sm font-medium"
            >
              {tiposMateriales.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de color con muestra visual */}
          <div>
            <label className="block text-[#a0aec0] text-xs font-semibold mb-1.5">
              Color:
            </label>
            <div className="relative">
              <select
                value={etiquetaGrande}
                onChange={(e) => handleEtiquetaGrandeChange(e.target.value)}
                className="w-full px-12 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg text-base font-semibold appearance-none"
              >
                <option value="" className="bg-[#0f1419]">-- Selecciona color --</option>
                {etiquetasGrandesFiltradas.map((opcion) => {
                  const colorHex = obtenerColorHex(opcion.color, opcion.tipo, false);
                  return (
                    <option 
                      key={getValueKey(opcion.color, opcion.tipo)} 
                      value={getValueKey(opcion.color, opcion.tipo)}
                      style={{ backgroundColor: colorHex, color: '#000' }}
                    >
                      {limpiarNombre(opcion.color, opcion.tipo)}
                    </option>
                  );
                })}
              </select>
              {/* Muestra de color a la izquierda */}
              {etiquetaGrande && (
                <div 
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md border-2 border-white/40 shadow-md"
                  style={{ backgroundColor: obtenerColorHex(etiquetaGrande.split("::")[1] || "", filtroTipoGrande, false) }}
                />
              )}
              {/* Flecha del select */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-[#a0aec0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {/* Muestra de color debajo del selector */}
            {etiquetaGrande && (
              <div className="mt-2 p-3 rounded-lg border border-[#2d3748] bg-[#0f1419]">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-white/40 shadow-lg flex-shrink-0"
                    style={{ backgroundColor: obtenerColorHex(etiquetaGrande.split("::")[1] || "", filtroTipoGrande, false) }}
                  />
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">
                      {limpiarNombre(etiquetaGrande.split("::")[1] || "", filtroTipoGrande)}
                    </p>
                    <p className="text-[#a0aec0] text-xs">{filtroTipoGrande}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selector de cantidad etiquetas chicas */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            📊 Cantidad Etiquetas Chicas
          </label>
          <select
            value={cantidadChicas}
            onChange={(e) => setCantidadChicas(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? "etiqueta" : "etiquetas"}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de cantidad etiquetas grandes */}
        <div>
          <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
            📊 Cantidad Etiquetas Grandes
          </label>
          <select
            value={cantidadGrandes}
            onChange={(e) => setCantidadGrandes(parseInt(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#00d4ff] transition-all duration-200 bg-[#0f1419] text-white border-[#2d3748] hover:border-[#00d4ff]/50 cursor-pointer shadow-lg"
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? "etiqueta" : "etiquetas"}
              </option>
            ))}
          </select>
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
          disabled={!etiquetaChica || !etiquetaGrande || !operador || !tipoMaterialChica || !tipoMaterialGrande || esLineaLibre(operador)}
          className="w-full bg-gradient-to-r from-[#00d4ff] to-[#0099cc] hover:from-[#33ddff] hover:to-[#00b3e6] disabled:from-[#2d3748] disabled:to-[#1a2332] disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl transition-all duration-200 mt-6 shadow-lg shadow-[#00d4ff]/30 hover:shadow-[#00d4ff]/50 disabled:shadow-none hover-lift flex items-center justify-center gap-2"
          title={esLineaLibre(operador) ? "No se puede imprimir en estado Línea Libre" : `Imprime ${cantidadChicas} etiquetas chicas y ${cantidadGrandes} etiquetas grandes`}
        >
          <span className="text-xl">🖨️</span>
          <span>Imprimir Etiquetas</span>
          <span className="text-xs opacity-75">({cantidadChicas}+{cantidadGrandes})</span>
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

