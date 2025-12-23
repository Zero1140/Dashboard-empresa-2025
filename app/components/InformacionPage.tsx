"use client";

import { useState, useMemo, useEffect } from "react";
import { obtenerImpresiones, obtenerCambiosOperador, obtenerCambiosColor, obtenerImpresionesSync, obtenerCambiosOperadorSync, obtenerCambiosColorSync } from "../utils/storage";
import { ImpresionEtiqueta, CambioOperador, CambioColor, EstadisticasMaquina, Accion } from "../types";
import { limpiarNombre } from "../data";

export default function InformacionPage() {
  const [filtroMaquina, setFiltroMaquina] = useState<number | "todas">("todas");
  const [vistaActiva, setVistaActiva] = useState<"estadisticas" | "acciones">("acciones");
  const [impresiones, setImpresiones] = useState<ImpresionEtiqueta[]>([]);
  const [cambiosOperador, setCambiosOperador] = useState<CambioOperador[]>([]);
  const [cambiosColor, setCambiosColor] = useState<CambioColor[]>([]);

  // Cargar datos al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      const [impresionesData, cambiosOperadorData, cambiosColorData] = await Promise.all([
        obtenerImpresiones(),
        obtenerCambiosOperador(),
        obtenerCambiosColor(),
      ]);
      setImpresiones(impresionesData);
      setCambiosOperador(cambiosOperadorData);
      setCambiosColor(cambiosColorData);
    };

    // Cargar datos síncronos primero para mostrar algo inmediatamente
    setImpresiones(obtenerImpresionesSync());
    setCambiosOperador(obtenerCambiosOperadorSync());
    setCambiosColor(obtenerCambiosColorSync());

    // Luego cargar datos asíncronos de Supabase si está configurado
    cargarDatos();
  }, []);

  // Crear listado cronológico de acciones
  const accionesCronologicas = useMemo(() => {
    const acciones: Accion[] = [];

    // Agregar cambios de operador
    cambiosOperador.forEach((cambio) => {
      acciones.push({
        id: cambio.id,
        tipo: "cambio_operador",
        timestamp: cambio.timestamp,
        fecha: cambio.fecha,
        maquinaId: cambio.maquinaId,
        cambioOperador: cambio,
      });
    });

    // Agregar cambios de color
    cambiosColor.forEach((cambio) => {
      acciones.push({
        id: cambio.id,
        tipo: "cambio_color",
        timestamp: cambio.timestamp,
        fecha: cambio.fecha,
        maquinaId: cambio.maquinaId,
        cambioColor: cambio,
      });
    });

    // Agregar impresiones
    impresiones.forEach((impresion) => {
      acciones.push({
        id: impresion.id,
        tipo: "impresion",
        timestamp: impresion.timestamp,
        fecha: impresion.fecha,
        maquinaId: impresion.maquinaId,
        impresion: impresion,
      });
    });

    // Ordenar por timestamp descendente (más reciente primero)
    return acciones.sort((a, b) => b.timestamp - a.timestamp);
  }, [impresiones, cambiosOperador, cambiosColor]);

  // Calcular estadísticas por máquina
  const estadisticasPorMaquina = useMemo(() => {
    const estadisticas: Record<number, EstadisticasMaquina> = {};

    // Inicializar máquinas 1-8
    for (let i = 1; i <= 8; i++) {
      estadisticas[i] = {
        maquinaId: i,
        totalImpresiones: 0,
        ultimoOperador: "-",
        impresiones: [],
        cambiosOperador: [],
      };
    }

    // Procesar impresiones
    impresiones.forEach((imp) => {
      if (!estadisticas[imp.maquinaId]) {
        estadisticas[imp.maquinaId] = {
          maquinaId: imp.maquinaId,
          totalImpresiones: 0,
          ultimoOperador: "-",
          impresiones: [],
          cambiosOperador: [],
        };
      }
      estadisticas[imp.maquinaId].impresiones.push(imp);
      estadisticas[imp.maquinaId].totalImpresiones++;
      if (!estadisticas[imp.maquinaId].ultimaImpresion || 
          imp.timestamp > estadisticas[imp.maquinaId].ultimaImpresion!.timestamp) {
        estadisticas[imp.maquinaId].ultimaImpresion = imp;
        estadisticas[imp.maquinaId].ultimoOperador = imp.operador;
      }
    });

    // Procesar cambios de operador
    cambiosOperador.forEach((cambio) => {
      if (!estadisticas[cambio.maquinaId]) {
        estadisticas[cambio.maquinaId] = {
          maquinaId: cambio.maquinaId,
          totalImpresiones: 0,
          ultimoOperador: "-",
          impresiones: [],
          cambiosOperador: [],
        };
      }
      estadisticas[cambio.maquinaId].cambiosOperador.push(cambio);
    });

    return estadisticas;
  }, [impresiones, cambiosOperador]);

  const maquinasFiltradas = useMemo(() => {
    if (filtroMaquina === "todas") {
      return Object.values(estadisticasPorMaquina);
    }
    return estadisticasPorMaquina[filtroMaquina] 
      ? [estadisticasPorMaquina[filtroMaquina]] 
      : [];
  }, [estadisticasPorMaquina, filtroMaquina]);

  // Estadísticas por operador - SOLO DEL DÍA ACTUAL
  const estadisticasPorOperador = useMemo(() => {
    // Obtener fecha de hoy (inicio del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const timestampHoy = hoy.getTime();
    
    // Obtener fecha de mañana (inicio del día siguiente)
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    const timestampManana = manana.getTime();

    // Filtrar solo impresiones del día actual
    const impresionesHoy = impresiones.filter((imp) => {
      const fechaImpresion = new Date(imp.fecha).getTime();
      return fechaImpresion >= timestampHoy && fechaImpresion < timestampManana;
    });

    const stats: Record<string, {
      operador: string;
      totalImpresiones: number;
      totalEtiquetasChicas: number;
      totalEtiquetasGrandes: number;
      totalEtiquetas: number;
      impresiones: ImpresionEtiqueta[];
      maquinas: Set<number>;
    }> = {};

    impresionesHoy.forEach((imp) => {
      if (!stats[imp.operador]) {
        stats[imp.operador] = {
          operador: imp.operador,
          totalImpresiones: 0,
          totalEtiquetasChicas: 0,
          totalEtiquetasGrandes: 0,
          totalEtiquetas: 0,
          impresiones: [],
          maquinas: new Set(),
        };
      }
      stats[imp.operador].impresiones.push(imp);
      stats[imp.operador].totalImpresiones++;
      stats[imp.operador].totalEtiquetasChicas += imp.cantidadChicas || 8;
      stats[imp.operador].totalEtiquetasGrandes += imp.cantidadGrandes || 8;
      stats[imp.operador].totalEtiquetas += (imp.cantidadChicas || 8) + (imp.cantidadGrandes || 8);
      stats[imp.operador].maquinas.add(imp.maquinaId);
    });

    return Object.values(stats).sort((a, b) => b.totalEtiquetas - a.totalEtiquetas);
  }, [impresiones]);

  // Filtrar acciones por máquina si aplica y agrupar por día
  const accionesPorDia = useMemo(() => {
    const filtradas = filtroMaquina === "todas"
      ? accionesCronologicas
      : accionesCronologicas.filter((accion) => accion.maquinaId === filtroMaquina);
    
    // Agrupar por día
    const accionesPorDiaMap: Record<string, Accion[]> = {};
    filtradas.forEach((accion) => {
      const fecha = new Date(accion.fecha);
      const fechaDia = fecha.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      
      if (!accionesPorDiaMap[fechaDia]) {
        accionesPorDiaMap[fechaDia] = [];
      }
      accionesPorDiaMap[fechaDia].push(accion);
    });

    // Convertir a array y ordenar por fecha (más reciente primero)
    return Object.entries(accionesPorDiaMap)
      .sort(([fechaA], [fechaB]) => {
        const dateA = new Date(fechaA.split("/").reverse().join("-"));
        const dateB = new Date(fechaB.split("/").reverse().join("-"));
        return dateB.getTime() - dateA.getTime();
      })
      .map(([fecha, acciones]) => ({ fecha, acciones }));
  }, [accionesCronologicas, filtroMaquina]);

  return (
    <div className="p-8 space-y-8">
      {/* Header elegante */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 shadow-2xl border border-[#2d3748] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-lg shadow-[#00d4ff]/30">
              <span className="text-3xl">📊</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-white to-[#a0aec0] bg-clip-text text-transparent">
                Información y Estadísticas
              </h1>
              <p className="text-[#718096] mt-1 font-medium">Datos técnicos de impresiones y cambios de operadores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs de vista */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-6 border border-[#2d3748] shadow-xl">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setVistaActiva("acciones")}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 hover-lift ${
              vistaActiva === "acciones"
                ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg shadow-[#00d4ff]/30"
                : "bg-[#0f1419] text-[#a0aec0] hover:bg-[#1a2332] border border-[#2d3748] hover:border-[#00d4ff]/30"
            }`}
          >
            📋 Listado de Acciones
          </button>
          <button
            onClick={() => setVistaActiva("estadisticas")}
            className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 hover-lift ${
              vistaActiva === "estadisticas"
                ? "bg-gradient-to-r from-[#00d4ff] to-[#0099cc] text-white shadow-lg shadow-[#00d4ff]/30"
                : "bg-[#0f1419] text-[#a0aec0] hover:bg-[#1a2332] border border-[#2d3748] hover:border-[#00d4ff]/30"
            }`}
          >
            📈 Estadísticas
          </button>
        </div>

        <div className="flex justify-between items-center flex-wrap gap-4">
          <label className="block text-[#a0aec0] text-sm font-bold uppercase tracking-wide">
            Filtrar por Máquina:
          </label>
          <select
            value={filtroMaquina}
            onChange={(e) => setFiltroMaquina(e.target.value === "todas" ? "todas" : parseInt(e.target.value))}
            className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200"
          >
            <option value="todas">Todas las máquinas</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
              <option key={num} value={num}>
                Máquina {num}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Listado de Acciones */}
      {vistaActiva === "acciones" && (
        <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 border border-[#2d3748] shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📋</span>
            <h2 className="text-2xl font-bold text-white">Listado Cronológico de Acciones</h2>
          </div>
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {accionesPorDia.length === 0 ? (
              <div className="text-[#718096] text-center py-12 bg-[#0f1419] rounded-xl border border-[#2d3748]">
                <span className="text-4xl block mb-3">📭</span>
                <p className="font-semibold">No hay acciones registradas</p>
              </div>
            ) : (
              accionesPorDia.map(({ fecha, acciones }) => (
                <div key={fecha} className="space-y-3">
                  {/* Encabezado del día */}
                  <div className="sticky top-0 bg-gradient-to-r from-[#1a2332] to-[#0f1419] rounded-xl p-4 border-b-2 border-[#00d4ff] z-10 shadow-lg">
                    <h3 className="text-lg font-bold text-[#00d4ff] flex items-center gap-2">
                      <span>📅</span>
                      {fecha}
                    </h3>
                    <p className="text-[#718096] text-sm mt-1">
                      {acciones.length} {acciones.length === 1 ? "acción" : "acciones"}
                    </p>
                  </div>

                  {/* Acciones del día */}
                  <div className="space-y-3 pl-4">
                    {acciones.map((accion) => {
                      const fechaHora = new Date(accion.fecha).toLocaleString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      });

                      if (accion.tipo === "cambio_operador" && accion.cambioOperador) {
                        const cambio = accion.cambioOperador;
                        return (
                          <div
                            key={accion.id}
                            className="bg-gradient-to-r from-[#0f1419] to-[#1a2332] rounded-xl p-5 border-l-4 border-[#00d4ff] shadow-lg hover:shadow-[#00d4ff]/20 transition-all duration-200"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-white font-semibold mb-1">
                                  🏭 Máquina {accion.maquinaId} - Cambio de Operador
                                </div>
                                <div className="text-gray-300">
                                  En este horario el supervisor{" "}
                                  <span className="text-[#00d4ff] font-semibold">{cambio.supervisor}</span>{" "}
                                  puso al operador{" "}
                                  <span className="text-[#00d4ff] font-semibold">{cambio.operadorNuevo}</span>
                                  {cambio.operadorAnterior !== "-" && (
                                    <>
                                      {" "}
                                      (reemplazando a{" "}
                                      <span className="text-gray-400">{cambio.operadorAnterior}</span>)
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="text-gray-400 text-sm ml-4 whitespace-nowrap">{fechaHora}</div>
                            </div>
                          </div>
                        );
                      }

                      if (accion.tipo === "cambio_color" && accion.cambioColor) {
                        const cambio = accion.cambioColor;
                        const [tipoNuevo, colorNuevo] = cambio.colorNuevo.includes("::") ? cambio.colorNuevo.split("::") : ["", cambio.colorNuevo];
                        const nombreColorNuevo = limpiarNombre(colorNuevo, tipoNuevo || "PLA");
                        
                        return (
                          <div
                            key={accion.id}
                            className="bg-gradient-to-r from-[#0f1419] to-[#1a2332] rounded-xl p-5 border-l-4 border-[#ffb800] shadow-lg hover:shadow-[#ffb800]/20 transition-all duration-200"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-white font-semibold mb-1">
                                  🎨 Máquina {accion.maquinaId} - Cambio de Color
                                </div>
                                <div className="text-gray-300">
                                  El supervisor{" "}
                                  <span className="text-[#00d4ff] font-semibold">{cambio.supervisor}</span>{" "}
                                  seleccionó el color{" "}
                                  <span className="text-[#ffb800] font-semibold">{nombreColorNuevo}</span>{" "}
                                  para la etiqueta{" "}
                                  <span className="text-[#00d4ff] font-semibold">{cambio.tipoColor === "chica" ? "chica" : "grande"}</span>
                                </div>
                              </div>
                              <div className="text-gray-400 text-sm ml-4 whitespace-nowrap">{fechaHora}</div>
                            </div>
                          </div>
                        );
                      }

                      if (accion.tipo === "impresion" && accion.impresion) {
                        const imp = accion.impresion;
                        const nombreChica = limpiarNombre(imp.etiquetaChica, imp.tipoMaterial);
                        const nombreGrande = limpiarNombre(imp.etiquetaGrande, imp.tipoMaterial);

                        return (
                          <div
                            key={accion.id}
                            className="bg-gradient-to-r from-[#0f1419] to-[#1a2332] rounded-xl p-5 border-l-4 border-[#00ff88] shadow-lg hover:shadow-[#00ff88]/20 transition-all duration-200"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-white font-semibold mb-1">
                                  🖨️ Máquina {accion.maquinaId} - Impresión
                                </div>
                                <div className="text-gray-300">
                                  Operador{" "}
                                  <span className="text-[#00d4ff] font-semibold">{imp.operador}</span>{" "}
                                  imprimió {imp.cantidadChicas} etiquetas chicas del color{" "}
                                  <span className="text-[#ffb800] font-semibold">{nombreChica}</span>{" "}
                                  y {imp.cantidadGrandes} etiquetas grandes del color{" "}
                                  <span className="text-[#ffb800] font-semibold">{nombreGrande}</span>
                                  {" "}(Tipo: {imp.tipoMaterial})
                                </div>
                              </div>
                              <div className="text-gray-400 text-sm ml-4 whitespace-nowrap">{fechaHora}</div>
                            </div>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Vista de Estadísticas (contenido existente) */}
      {vistaActiva === "estadisticas" && (
        <>
      {/* Estadísticas por Máquina */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {maquinasFiltradas.map((stats) => (
          <div key={stats.maquinaId} className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl p-5 border border-[#2d3748] shadow-lg hover:border-[#00d4ff]/30 transition-all duration-200">
            <h3 className="text-lg font-bold text-white mb-3">Máquina {stats.maquinaId}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Impresiones:</span>
                <span className="text-white font-semibold">{stats.totalImpresiones}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Último Operador:</span>
                <span className="text-white font-semibold">{stats.ultimoOperador}</span>
              </div>
              {stats.ultimaImpresion && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-gray-400 text-xs">Última impresión:</p>
                  <p className="text-white text-xs">
                    {new Date(stats.ultimaImpresion.fecha).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Detalles por Máquina */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 border border-[#2d3748] shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-2xl">🔍</span>
          <h2 className="text-2xl font-bold text-white">Detalles por Máquina</h2>
        </div>
        <div className="space-y-6">
          {maquinasFiltradas.map((stats) => (
            <div key={stats.maquinaId} className="bg-gradient-to-br from-[#0f1419] to-[#1a2332] rounded-xl p-5 border border-[#2d3748] shadow-lg">
              <h3 className="text-xl font-bold text-white mb-4">Máquina {stats.maquinaId}</h3>

              {/* Cambios de Operador */}
              <div className="mb-4">
                <h4 className="text-lg font-semibold text-[#00d4ff] mb-2">
                  Cambios de Operador ({stats.cambiosOperador.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {stats.cambiosOperador.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay cambios registrados</p>
                  ) : (
                    stats.cambiosOperador
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 10)
                      .map((cambio) => (
                        <div key={cambio.id} className="bg-[#0a0a0a] p-3 rounded-lg text-sm border border-[#2d3748]">
                          <span className="text-gray-300">
                            {cambio.operadorAnterior} → {cambio.operadorNuevo}
                          </span>
                          <span className="text-[#00d4ff] ml-2">
                            (Supervisor: {cambio.supervisor || "Sistema"})
                          </span>
                          <span className="text-gray-500 ml-2">
                            {new Date(cambio.fecha).toLocaleString()}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Impresiones Recientes */}
              <div>
                <h4 className="text-lg font-semibold text-[#00d4ff] mb-2">
                  Impresiones Recientes ({stats.impresiones.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {stats.impresiones.length === 0 ? (
                    <p className="text-gray-400 text-sm">No hay impresiones registradas</p>
                  ) : (
                    stats.impresiones
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 20)
                      .map((imp) => (
                        <div key={imp.id} className="bg-[#0a0a0a] p-3 rounded-lg text-sm border border-[#2d3748]">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-gray-400">Operador: </span>
                              <span className="text-white font-semibold">{imp.operador}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Fecha: </span>
                              <span className="text-white">
                                {new Date(imp.fecha).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Etiqueta Chica: </span>
                              <span className="text-white">
                                {limpiarNombre(imp.etiquetaChica, imp.tipoMaterial)} 
                                <span className="text-[#00d4ff] ml-2">
                                  ({imp.cantidadChicas || 8} unidades)
                                </span>
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Etiqueta Grande: </span>
                              <span className="text-white">
                                {limpiarNombre(imp.etiquetaGrande, imp.tipoMaterial)}
                                <span className="text-[#00d4ff] ml-2">
                                  ({imp.cantidadGrandes || 8} unidades)
                                </span>
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Tipo: </span>
                              <span className="text-white">{imp.tipoMaterial}</span>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Estadísticas por Operador */}
      <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-2xl p-8 border border-[#2d3748] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Estadísticas por Operador</h2>
          <div className="bg-gradient-to-r from-[#00d4ff]/20 to-[#0099cc]/20 border border-[#00d4ff]/30 rounded-xl px-4 py-2">
            <p className="text-[#00d4ff] text-sm font-semibold">
              📅 {new Date().toLocaleDateString("es-ES", { 
                weekday: "long", 
                year: "numeric", 
                month: "long", 
                day: "numeric" 
              })}
            </p>
            <p className="text-[#718096] text-xs mt-1">
              Se reinician cada 24 horas
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {estadisticasPorOperador.map((stats) => (
            <div key={stats.operador} className="bg-gradient-to-br from-[#0f1419] to-[#1a2332] rounded-xl p-5 border border-[#2d3748] shadow-lg">
              <h3 className="text-lg font-bold text-white mb-3">{stats.operador}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Impresiones:</span>
                  <span className="text-white font-semibold">{stats.totalImpresiones}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Etiquetas Chicas:</span>
                  <span className="text-[#00d4ff] font-semibold">{stats.totalEtiquetasChicas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Etiquetas Grandes:</span>
                  <span className="text-[#00d4ff] font-semibold">{stats.totalEtiquetasGrandes}</span>
                </div>
                <div className="flex justify-between border-t border-gray-600 pt-2 mt-2">
                  <span className="text-gray-400 font-semibold">Total Etiquetas:</span>
                  <span className="text-[#ffb800] font-bold text-base">{stats.totalEtiquetas}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Máquinas usadas:</span>
                  <span className="text-white font-semibold">
                    {Array.from(stats.maquinas).sort().join(", ")}
                  </span>
                </div>
                {stats.impresiones.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-gray-400 text-xs mb-1">Última impresión:</p>
                    <p className="text-white text-xs">
                      {new Date(stats.impresiones.sort((a, b) => b.timestamp - a.timestamp)[0].fecha)
                        .toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

