"use client";

import { useState, useEffect, useMemo } from "react";
import { obtenerColoresCombinadosSync } from "../utils/colores";
import { puedeImprimir, registrarIntentoImpresion, obtenerTiempoRestante, formatearTiempoRestante } from "../utils/rateLimiting";
import MachineCard from "./MachineCard";
import { guardarImpresion, guardarCambioOperador, obtenerImpresiones, obtenerImpresionesSync, guardarCambioColor } from "../utils/storage";
import { sumarStock } from "../utils/stock";
import { restarStockCategoria, obtenerStockItem, restarStockCategoriaSync } from "../utils/stockCategorias";
import { obtenerCategoriasArray, agregarCategoria, agregarItemACategoria, obtenerCategoriasArraySync } from "../utils/categorias";
import { obtenerOperadoresAsignados, guardarOperadoresAsignados } from "../utils/operadoresAsignados";
import { obtenerColoresMaquinas, guardarColoresMaquinas } from "../utils/coloresMaquinas";
import { obtenerContadoresEtiquetas, incrementarContadorEtiquetas, obtenerContadoresEtiquetasSync } from "../utils/contadorEtiquetas";
import { useRealtimeSync } from "../utils/useRealtimeSync";
import { ImpresionEtiqueta, CambioOperador, CambioColor } from "../types";
import { limpiarNombre, esLineaLibre } from "../data";
import { generarExcelControl } from '../utils/exportExcel';

const STORAGE_KEY_COLORES_MAQUINAS = "gst3d_colores_maquinas";
const STORAGE_KEY_CONTADOR_ETIQUETAS = "gst3d_contador_etiquetas";

// Nombres de categorías necesarias
const NOMBRE_CATEGORIA_ROLLOS_CHICAS = "Rollos de Etiquetas Chicas";
const NOMBRE_CATEGORIA_ROLLOS_GRANDES = "Rollos de Etiquetas Grandes";
const NOMBRE_CATEGORIA_CAJAS_1K = "Cajas de 1k";
const NOMBRE_CATEGORIA_BOLSAS_SELLADAS = "Bolsas Selladas";

// Nombres de items
const ITEM_ROLLO_CHICAS = "Rollo de Etiquetas Chicas";
const ITEM_ROLLO_GRANDES = "Rollo de Etiquetas Grandes";
const ITEM_CAJA_1K = "Caja de 1k";
const ITEM_BOLSA_SELLADA = "Bolsa Sellada";

interface MaquinasPageProps {
  modoEdicion: boolean;
  supervisorActual: string | null;
  onSupabaseError?: (error: "NOT_CONFIGURED" | "CONNECTION_ERROR") => void;
}

export default function MaquinasPage({ modoEdicion, supervisorActual, onSupabaseError }: MaquinasPageProps) {
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string>("PLA");
  const [operadoresAsignados, setOperadoresAsignados] = useState<Record<number, string>>({
    1: "",
    2: "",
    3: "",
    4: "",
    5: "",
    6: "",
    7: "",
    8: "",
  });
  const [impresiones, setImpresiones] = useState<ImpresionEtiqueta[]>([]);
  const [contadoresEtiquetas, setContadoresEtiquetas] = useState<{ chicas: number; grandes: number }>({ chicas: 0, grandes: 0 });

  // Estado para almacenar colores seleccionados por máquina
  const [coloresPorMaquina, setColoresPorMaquina] = useState<Record<number, { chica: string; grande: string }>>({});

  // Estado para forzar re-render cuando cambian colores
  const [coloresVersion, setColoresVersion] = useState<number>(0);

  // Cargar estado desde Supabase al iniciar
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Cargar operadores asignados desde Supabase
        const asignaciones = await obtenerOperadoresAsignados();
        if (Object.keys(asignaciones).length > 0) {
          setOperadoresAsignados(asignaciones);
        }

        // Cargar colores desde Supabase
        const colores = await obtenerColoresMaquinas();
        if (Object.keys(colores).length > 0) {
          setColoresPorMaquina(colores);
        }

        // Cargar impresiones
        const impresionesData = await obtenerImpresiones();
        setImpresiones(impresionesData);
      } catch (error: any) {
        console.error('Error al cargar datos iniciales:', error);
        if (error?.name === 'SupabaseNotConfiguredError' && onSupabaseError) {
          onSupabaseError('NOT_CONFIGURED');
        } else if (error?.name === 'SupabaseConnectionError' && onSupabaseError) {
          onSupabaseError('CONNECTION_ERROR');
        }
      }
    };

    cargarDatosIniciales();
  }, [onSupabaseError]);

  // Suscripción Realtime para sincronización en tiempo real
  useRealtimeSync({
    onOperadoresAsignadosChange: (asignaciones) => {
      setOperadoresAsignados(asignaciones);
    },
    onColoresMaquinasChange: (colores) => {
      setColoresPorMaquina(colores);
    },
  });

  // Cargar contadores de etiquetas
  useEffect(() => {
    const cargarContadores = async () => {
      try {
        const contadores = await obtenerContadoresEtiquetas();
        setContadoresEtiquetas(contadores);
      } catch (error: any) {
        console.error('Error al cargar contadores:', error);
        if (error?.name === 'SupabaseNotConfiguredError' && onSupabaseError) {
          onSupabaseError('NOT_CONFIGURED');
        } else if (error?.name === 'SupabaseConnectionError' && onSupabaseError) {
          onSupabaseError('CONNECTION_ERROR');
        }
      }
    };

    cargarContadores();
  }, [onSupabaseError]);

  // Actualizar impresiones cada 2 segundos (polling)
  useEffect(() => {
    const actualizarImpresiones = async () => {
      try {
        const impresionesData = await obtenerImpresiones();
        setImpresiones(impresionesData);
      } catch (error: any) {
        console.error('Error al actualizar impresiones:', error);
        if (error?.name === 'SupabaseNotConfiguredError' && onSupabaseError) {
          onSupabaseError('NOT_CONFIGURED');
        } else if (error?.name === 'SupabaseConnectionError' && onSupabaseError) {
          onSupabaseError('CONNECTION_ERROR');
        }
      }
    };

    actualizarImpresiones();
    const interval = setInterval(actualizarImpresiones, 2000);

    return () => clearInterval(interval);
  }, [onSupabaseError]);

  // Listener para actualizaciones de colores
  useEffect(() => {
    const handleColoresActualizados = () => {
      // Forzar re-render incrementando versión
      setColoresVersion(prev => prev + 1);
    };

    window.addEventListener("coloresActualizados", handleColoresActualizados);
    return () => window.removeEventListener("coloresActualizados", handleColoresActualizados);
  }, []);

  // Suscripción Realtime a contador de etiquetas
  useRealtimeSync({
    onContadorEtiquetasChange: setContadoresEtiquetas,
  });

  // Calcular conteo de etiquetas por operador - SOLO DEL DÍA ACTUAL
  const conteoPorOperador = useMemo(() => {
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

    const conteo: Record<string, { chicas: number; grandes: number; total: number }> = {};

    impresionesHoy.forEach((imp) => {
      if (!conteo[imp.operador]) {
        conteo[imp.operador] = { chicas: 0, grandes: 0, total: 0 };
      }
      conteo[imp.operador].chicas += imp.cantidadChicas || 8;
      conteo[imp.operador].grandes += imp.cantidadGrandes || 8;
      conteo[imp.operador].total += (imp.cantidadChicas || 8) + (imp.cantidadGrandes || 8);
    });

    return conteo;
  }, [impresiones]);

  const handleCambiarOperador = async (maquinaId: number, nuevoOperador: string) => {
    const operadorAnterior = operadoresAsignados[maquinaId] || "-";
    const ahora = new Date();

    // Actualizar asignación
    const nuevasAsignaciones = {
      ...operadoresAsignados,
      [maquinaId]: nuevoOperador,
    };
    setOperadoresAsignados(nuevasAsignaciones);
    await guardarOperadoresAsignados(nuevasAsignaciones);

    // Guardar cambio de operador en historial
    const cambio: CambioOperador = {
      id: `${maquinaId}_${Date.now()}_${Math.random()}`,
      maquinaId,
      operadorAnterior,
      operadorNuevo: nuevoOperador,
      supervisor: supervisorActual || "Supervisor",
      fecha: ahora.toISOString(),
      timestamp: Date.now(),
    };
    guardarCambioOperador(cambio).catch((error) => {
      console.error('Error al guardar cambio de operador:', error);
    });
  };

  const handleCambiarColorChica = async (maquinaId: number, color: string) => {
    const colorAnterior = coloresPorMaquina[maquinaId]?.chica || "";
    const ahora = new Date();

    // Actualizar colores
    const nuevosColores = {
      ...coloresPorMaquina,
      [maquinaId]: {
        ...coloresPorMaquina[maquinaId],
        chica: color,
      },
    };
    setColoresPorMaquina(nuevosColores);
    await guardarColoresMaquinas(nuevosColores);

    // Guardar cambio de color en historial
    const cambio: CambioColor = {
      id: `color_${maquinaId}_chica_${Date.now()}_${Math.random()}`,
      maquinaId,
      tipoColor: "chica",
      colorAnterior,
      colorNuevo: color,
      supervisor: supervisorActual || "Supervisor",
      fecha: ahora.toISOString(),
      timestamp: Date.now(),
    };
    guardarCambioColor(cambio);
  };

  const handleCambiarColorGrande = async (maquinaId: number, color: string) => {
    const colorAnterior = coloresPorMaquina[maquinaId]?.grande || "";
    const ahora = new Date();

    // Actualizar colores
    const nuevosColores = {
      ...coloresPorMaquina,
      [maquinaId]: {
        ...coloresPorMaquina[maquinaId],
        grande: color,
      },
    };
    setColoresPorMaquina(nuevosColores);
    await guardarColoresMaquinas(nuevosColores);

    // Guardar cambio de color en historial
    const cambio: CambioColor = {
      id: `color_${maquinaId}_grande_${Date.now()}_${Math.random()}`,
      maquinaId,
      tipoColor: "grande",
      colorAnterior,
      colorNuevo: color,
      supervisor: supervisorActual || "Supervisor",
      fecha: ahora.toISOString(),
      timestamp: Date.now(),
    };
    guardarCambioColor(cambio);
  };

  // Función auxiliar para asegurar que existan las categorías necesarias
  const asegurarCategoriasNecesarias = async () => {
    let categorias = await obtenerCategoriasArray();

    // Verificar y crear categoría de Rollos de Etiquetas Chicas
    let categoriaRollosChicas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_CHICAS);
    if (!categoriaRollosChicas) {
      await agregarCategoria(NOMBRE_CATEGORIA_ROLLOS_CHICAS);
      categorias = await obtenerCategoriasArray();
      categoriaRollosChicas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_CHICAS);
    }
    if (categoriaRollosChicas && !categoriaRollosChicas.items.includes(ITEM_ROLLO_CHICAS)) {
      await agregarItemACategoria(categoriaRollosChicas.id, ITEM_ROLLO_CHICAS);
    }

    // Verificar y crear categoría de Rollos de Etiquetas Grandes
    let categoriaRollosGrandes = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_GRANDES);
    if (!categoriaRollosGrandes) {
      await agregarCategoria(NOMBRE_CATEGORIA_ROLLOS_GRANDES);
      categorias = await obtenerCategoriasArray();
      categoriaRollosGrandes = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_GRANDES);
    }
    if (categoriaRollosGrandes && !categoriaRollosGrandes.items.includes(ITEM_ROLLO_GRANDES)) {
      await agregarItemACategoria(categoriaRollosGrandes.id, ITEM_ROLLO_GRANDES);
    }

    // Verificar y crear categoría de Cajas de 1k
    let categoriaCajas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_CAJAS_1K);
    if (!categoriaCajas) {
      await agregarCategoria(NOMBRE_CATEGORIA_CAJAS_1K);
      categorias = await obtenerCategoriasArray();
      categoriaCajas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_CAJAS_1K);
    }
    if (categoriaCajas && !categoriaCajas.items.includes(ITEM_CAJA_1K)) {
      await agregarItemACategoria(categoriaCajas.id, ITEM_CAJA_1K);
    }

    // Verificar y crear categoría de Bolsas Selladas
    let categoriaBolsas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_BOLSAS_SELLADAS);
    if (!categoriaBolsas) {
      await agregarCategoria(NOMBRE_CATEGORIA_BOLSAS_SELLADAS);
      categorias = await obtenerCategoriasArray();
      categoriaBolsas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_BOLSAS_SELLADAS);
    }
    if (categoriaBolsas && !categoriaBolsas.items.includes(ITEM_BOLSA_SELLADA)) {
      await agregarItemACategoria(categoriaBolsas.id, ITEM_BOLSA_SELLADA);
    }
  };


  const handleImprimir = async (
    maquinaId: number,
    etiquetaChica: string,
    etiquetaGrande: string,
    operador: string,
    tipoMaterial: string,
    cantidadChicas: number,
    cantidadGrandes: number
  ) => {
    // Validar que no se intente imprimir cuando está en Línea Libre
    if (esLineaLibre(operador)) {
      alert("No se puede imprimir cuando la máquina está en estado 'Línea Libre'. Por favor, asigna un operador primero.");
      return;
    }

    // Calcular cantidad total de etiquetas (chicas + grandes)
    const cantidadTotalEtiquetas = cantidadChicas + cantidadGrandes;
    const esAdministrador = modoEdicion; // modoEdicion indica que es supervisor/administrador

    // Registrar intento de impresión por máquina (máximo 2 etiquetas cada 2 minutos)
    const maquinaKey = `maquina_${maquinaId}`;
    if (!registrarIntentoImpresion(maquinaKey, esAdministrador, cantidadTotalEtiquetas)) {
      if (!esAdministrador) {
        const tiempoRestante = obtenerTiempoRestante(maquinaKey, esAdministrador);
        const tiempoFormateado = formatearTiempoRestante(tiempoRestante);
        alert(`⚠️ Límite de impresiones alcanzado para la máquina ${maquinaId}.\n\nSe permite imprimir máximo 2 etiquetas (1 chica + 1 grande) cada 2 minutos por máquina.\n\nCantidad solicitada: ${cantidadTotalEtiquetas} etiquetas\n\nTiempo de espera restante: env. ${tiempoFormateado}.`);
      }
      return;
    }

    // Asegurar que existan las categorías necesarias (asíncrono)
    asegurarCategoriasNecesarias().catch(err =>
      console.error('Error al asegurar categorías:', err)
    );

    // Extraer el color del formato "tipo::color"
    const colorChica = etiquetaChica.includes("::") ? etiquetaChica.split("::")[1] : etiquetaChica;
    const colorGrande = etiquetaGrande.includes("::") ? etiquetaGrande.split("::")[1] : etiquetaGrande;
    const tipoChica = etiquetaChica.includes("::") ? etiquetaChica.split("::")[0] : tipoMaterial;
    const tipoGrande = etiquetaGrande.includes("::") ? etiquetaGrande.split("::")[0] : tipoMaterial;

    // IMPORTANTE: Obtener el color base (sin _GRANDE) para el stock
    // Una bobina = 1 chica + 1 grande, pero el stock es del mismo color base
    const colorBase = colorChica.replace(/_GRANDE$/, ""); // Remover _GRANDE si existe
    const tipoMaterialBase = tipoChica; // Usar el tipo del color chica como base

    // Guardar impresión con las cantidades seleccionadas
    const impresion: ImpresionEtiqueta = {
      id: `${maquinaId}_${Date.now()}_${Math.random()}`,
      maquinaId,
      tipoMaterial: tipoMaterialBase,
      etiquetaChica: colorChica,
      etiquetaGrande: colorGrande,
      operador,
      fecha: new Date().toISOString(),
      timestamp: Date.now(),
      cantidadChicas: cantidadChicas,
      cantidadGrandes: cantidadGrandes,
    };
    guardarImpresion(impresion).then(() => {
      // Actualizar estado local después de guardar
      setImpresiones([...impresiones, impresion]);
    }).catch((error) => {
      console.error('Error al guardar impresión:', error);
      // Aún así actualizar el estado local para que la UI responda
      setImpresiones([...impresiones, impresion]);
    });

    // Sumar al stock del color BASE (sin _GRANDE)
    // Una bobina = 1 chica + 1 grande, pero el stock es del mismo color
    // Calcular cuántas bobinas se crearon (mínimo entre chicas y grandes)
    const bobinasCreadas = Math.min(cantidadChicas, cantidadGrandes);

    // IMPORTANTE: Solo sumar al stock si se crearon bobinas completas
    // El stock se suma por bobina, no por etiqueta individual
    try {
      if (bobinasCreadas > 0) {
        // Sumar al stock del color base (sin _GRANDE) la cantidad de bobinas creadas
        await sumarStock(tipoMaterialBase, colorBase, bobinasCreadas);
        console.log(`Se sumaron ${bobinasCreadas} bobina(s) al stock de ${tipoMaterialBase} ${colorBase}`);
      }
    } catch (err) {
      console.error('Error al sumar stock:', err);
      alert('Error al actualizar el stock. Por favor, verifica la conexión.');
    }

    // Incrementar contador de etiquetas (asíncrono)
    incrementarContadorEtiquetas(cantidadChicas, cantidadGrandes).then(async () => {
      // Obtener contadores actuales después de incrementar
      const contadores = await obtenerContadoresEtiquetas();

      // Verificar si se alcanzaron 1000 etiquetas chicas
      if (contadores.chicas >= 1000) {
        const rollosADescontar = Math.floor(contadores.chicas / 1000);
        const nuevoContadorChicas = contadores.chicas % 1000; // Mantener el resto

        // Obtener categoría de rollos chicas
        const categorias = await obtenerCategoriasArray();
        const categoriaRollosChicas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_CHICAS);
        if (categoriaRollosChicas) {
          await restarStockCategoria(categoriaRollosChicas.id, ITEM_ROLLO_CHICAS, rollosADescontar);
          console.log(`Se descontaron ${rollosADescontar} rollo(s) de etiquetas chicas`);

          // Actualizar contador después de descontar
          await incrementarContadorEtiquetas(-contadores.chicas + nuevoContadorChicas, 0);
        }
      }

      // Verificar si se alcanzaron 1000 etiquetas grandes
      if (contadores.grandes >= 1000) {
        const rollosADescontar = Math.floor(contadores.grandes / 1000);
        const nuevoContadorGrandes = contadores.grandes % 1000; // Mantener el resto

        // Obtener categoría de rollos grandes
        const categorias = await obtenerCategoriasArray();
        const categoriaRollosGrandes = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_ROLLOS_GRANDES);
        if (categoriaRollosGrandes) {
          await restarStockCategoria(categoriaRollosGrandes.id, ITEM_ROLLO_GRANDES, rollosADescontar);
          console.log(`Se descontaron ${rollosADescontar} rollo(s) de etiquetas grandes`);

          // Actualizar contador después de descontar
          await incrementarContadorEtiquetas(0, -contadores.grandes + nuevoContadorGrandes);
        }
      }
    }).catch(err => {
      console.error('Error al actualizar contador de etiquetas:', err);
    });

    // Descontar siempre de Cajas de 1k y Bolsas Selladas
    // Cada bobina (1 chica + 1 grande) descuenta 1 caja y 1 bolsa
    // Si se imprimen múltiples bobinas, se descuenta 1 por cada bobina
    // NOTA: bobinasCreadas ya fue calculado arriba
    try {
      const categorias = await obtenerCategoriasArray();
      const categoriaCajas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_CAJAS_1K);
      const categoriaBolsas = categorias.find(c => c.nombre === NOMBRE_CATEGORIA_BOLSAS_SELLADAS);

      if (categoriaCajas && bobinasCreadas > 0) {
        await restarStockCategoria(categoriaCajas.id, ITEM_CAJA_1K, bobinasCreadas);
        console.log(`Se descontaron ${bobinasCreadas} caja(s) de 1k`);
      }
      if (categoriaBolsas && bobinasCreadas > 0) {
        await restarStockCategoria(categoriaBolsas.id, ITEM_BOLSA_SELLADA, bobinasCreadas);
        console.log(`Se descontaron ${bobinasCreadas} bolsa(s) sellada(s)`);
      }
    } catch (err) {
      console.error('Error al descontar cajas/bolsas:', err);
      // No mostrar alerta aquí para no interrumpir el flujo, pero registrar el error
    }

    // Simular impresión (aquí se conectaría con la API del backend)
    console.log(
      `Máquina ${maquinaId} - Imprimir ${cantidadChicas} etiquetas chicas (${etiquetaChica}) y ${cantidadGrandes} etiquetas grandes (${etiquetaGrande}), Operador: ${operador}, Tipo: ${tipoSeleccionado}`
    );

    // Aquí se puede hacer una llamada a la API para imprimir las etiquetas
    // fetch('/api/imprimir', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     maquinaId,
    //     tipo: tipoSeleccionado,
    //     etiquetaChica,
    //     etiquetaGrande,
    //     cantidadChicas: cantidadChicas,
    //     cantidadGrandes: cantidadGrandes,
    //     operador
    //   })
    // })
  };

  const NUMERO_MAQUINAS = 8;

  return (
    <div className="p-6 lg:p-8 animate-fade-in-up">
      {/* Header elegante mejorado */}
      <div className="card-elegant rounded-2xl p-6 lg:p-8 mb-6 lg:mb-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d4ff]/5 via-transparent to-[#ffb800]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00d4ff]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-6 relative z-10">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-xl shadow-[#00d4ff]/40 ring-2 ring-[#00d4ff]/20">
                <span className="text-2xl">🏭</span>
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                  <span className="bg-gradient-to-r from-white via-[#00d4ff] to-white bg-clip-text text-transparent">
                    Línea de Producción
                  </span>
                </h1>
                <p className="text-[#718096] text-sm font-medium">
                  Sistema de Impresión de Etiquetas
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${modoEdicion
                ? "bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/40 shadow-lg shadow-[#ffb800]/20"
                : "bg-[#2d3748]/50 text-[#a0aec0] border-[#4a5568]"
                }`}>
                {modoEdicion ? "⚡ Supervisor" : "👤 Operador"}
              </div>
            </div>
          </div>
          <div className="relative">
            <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">Material:</label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => setTipoSeleccionado(e.target.value)}
              className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] focus:outline-none focus:ring-2 focus:ring-[#00d4ff] focus:border-[#00d4ff] cursor-pointer font-medium shadow-lg hover:border-[#00d4ff]/50 transition-all duration-200 min-w-[180px]"
            >
              {Object.keys(obtenerColoresCombinadosSync()).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">
              Planilla Diaria:
            </label>
            <button 
              onClick={() => {
                const dataParaExcel = Array.from({ length: NUMERO_MAQUINAS }, (_, i) => {
                  const id = i + 1;
                  return {
                    id: id,
                    color: coloresPorMaquina[id]?.chica || "Sin material",
                    cantidad: conteoPorOperador[operadoresAsignados[id]]?.total || 0,
                    operador: operadoresAsignados[id] || "Sin asignar"
                  };
                });
                generarExcelControl(dataParaExcel);
              }}
              className="group relative flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-green-900/20 transition-all duration-300 active:scale-95 border border-green-400/30"
            >
              {/* Iconito de Excel */}
              <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span>Descargar Reporte</span>
            </button>
        </div>
        </div>

        {/* Indicador de etiquetas faltantes para rollos */}
        <div className="card-elegant rounded-xl p-5 lg:p-6 relative z-10 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#ffb800] to-[#ff9500] flex items-center justify-center shadow-md">
              <span className="text-xl">📦</span>
            </div>
            <h2 className="text-lg lg:text-xl font-bold text-white">Contador de Rollos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Etiquetas Chicas */}
            <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl p-4 border border-[#2d3748]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#a0aec0] text-sm font-semibold">Etiquetas Chicas</span>
                <span className="text-[#00d4ff] text-xs font-bold bg-[#00d4ff]/10 px-2 py-1 rounded">
                  {contadoresEtiquetas.chicas} / 1000
                </span>
              </div>
              <div className="w-full bg-[#0f1419] rounded-full h-3 mb-2 overflow-hidden border border-[#2d3748]">
                <div
                  className="h-full bg-gradient-to-r from-[#00d4ff] to-[#0099cc] transition-all duration-300"
                  style={{ width: `${Math.min((contadoresEtiquetas.chicas / 1000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {Math.max(0, 1000 - contadoresEtiquetas.chicas)}
                </span>
                <span className="text-[#718096] text-sm">
                  {Math.max(0, 1000 - contadoresEtiquetas.chicas) === 1 ? "etiqueta falta" : "etiquetas faltan"}
                </span>
                <span className="text-[#718096] text-sm ml-auto">
                  para descontar 1 rollo
                </span>
              </div>
            </div>

            {/* Etiquetas Grandes */}
            <div className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl p-4 border border-[#2d3748]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#a0aec0] text-sm font-semibold">Etiquetas Grandes</span>
                <span className="text-[#00d4ff] text-xs font-bold bg-[#00d4ff]/10 px-2 py-1 rounded">
                  {contadoresEtiquetas.grandes} / 1000
                </span>
              </div>
              <div className="w-full bg-[#0f1419] rounded-full h-3 mb-2 overflow-hidden border border-[#2d3748]">
                <div
                  className="h-full bg-gradient-to-r from-[#00d4ff] to-[#0099cc] transition-all duration-300"
                  style={{ width: `${Math.min((contadoresEtiquetas.grandes / 1000) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {Math.max(0, 1000 - contadoresEtiquetas.grandes)}
                </span>
                <span className="text-[#718096] text-sm">
                  {Math.max(0, 1000 - contadoresEtiquetas.grandes) === 1 ? "etiqueta falta" : "etiquetas faltan"}
                </span>
                <span className="text-[#718096] text-sm ml-auto">
                  para descontar 1 rollo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Conteo de etiquetas por operador - Mejorado */}
        <div className="card-elegant rounded-xl p-5 lg:p-6 relative z-10">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00d4ff] to-[#0099cc] flex items-center justify-center shadow-md">
                <span className="text-xl">📊</span>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-white">Estadísticas por Operador</h2>
            </div>
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
          {Object.keys(conteoPorOperador).length === 0 ? (
            <div className="text-[#718096] text-center py-12 bg-[#0f1419]/50 rounded-xl border-2 border-dashed border-[#2d3748]">
              <span className="text-4xl block mb-3">📭</span>
              <p className="font-semibold">No hay impresiones registradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(conteoPorOperador)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([operador, conteo], index) => (
                  <div
                    key={operador}
                    className="card-elegant rounded-xl p-4 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                      <span className="text-base">👷</span>
                      <span className="truncate">{operador}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#718096]">Chicas:</span>
                        <span className="text-[#00d4ff] font-bold">{conteo.chicas}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#718096]">Grandes:</span>
                        <span className="text-[#00d4ff] font-bold">{conteo.grandes}</span>
                      </div>
                      <div className="pt-2 mt-2 border-t border-[#2d3748] flex justify-between items-center">
                        <span className="text-[#a0aec0] text-xs font-semibold">Total:</span>
                        <span className="text-[#ffb800] font-bold text-base">{conteo.total}</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid de máquinas - Mejorado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
        {Array.from({ length: NUMERO_MAQUINAS }, (_, i) => i + 1).map(
          (maquinaId) => {
            const operadorMaquina = operadoresAsignados[maquinaId] || "";
            return (
              <MachineCard
                key={maquinaId}
                maquinaId={maquinaId}
                tipoSeleccionado={tipoSeleccionado}
                operador={operadorMaquina}
                conteoOperador={operadorMaquina ? conteoPorOperador[operadorMaquina] : undefined}
                modoEdicion={modoEdicion}
                colorChicaInicial={coloresPorMaquina[maquinaId]?.chica || ""}
                colorGrandeInicial={coloresPorMaquina[maquinaId]?.grande || ""}
                onImprimir={handleImprimir}
                onCambiarOperador={(maquinaId, nuevoOperador) => handleCambiarOperador(maquinaId, nuevoOperador)}
                onCambiarColorChica={handleCambiarColorChica}
                onCambiarColorGrande={handleCambiarColorGrande}
              />
            );
          }
        )}
      </div>
    </div>
  );
}

