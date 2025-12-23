/**
 * Script de migración de datos de localStorage a Supabase
 * Ejecutar desde la consola del navegador o desde un componente de administración
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export async function migrarDatosLocalStorageASupabase(): Promise<{
  success: boolean;
  message: string;
  detalles: Record<string, number>;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message: "Supabase no está configurado. Por favor, configura las variables de entorno.",
      detalles: {},
    };
  }

  const detalles: Record<string, number> = {};
  const errores: string[] = [];

  try {
    // 1. Migrar impresiones
    const impresionesRaw = localStorage.getItem("gst3d_impresiones");
    if (impresionesRaw) {
      const impresiones = JSON.parse(impresionesRaw);
      if (Array.isArray(impresiones) && impresiones.length > 0) {
        const impresionesParaMigrar = impresiones.map((imp: any) => ({
          id: imp.id,
          maquina_id: imp.maquinaId,
          tipo_material: imp.tipoMaterial,
          etiqueta_chica: imp.etiquetaChica,
          etiqueta_grande: imp.etiquetaGrande,
          operador: imp.operador,
          fecha: imp.fecha,
          timestamp: imp.timestamp,
          cantidad_chicas: imp.cantidadChicas || 8,
          cantidad_grandes: imp.cantidadGrandes || 8,
        }));

        const { error } = await supabase.from("impresiones").upsert(impresionesParaMigrar, {
          onConflict: "id",
        });
        if (error) {
          errores.push(`Impresiones: ${error.message}`);
        } else {
          detalles.impresiones = impresiones.length;
        }
      }
    }

    // 2. Migrar cambios de operador
    const cambiosOperadorRaw = localStorage.getItem("gst3d_cambios_operador");
    if (cambiosOperadorRaw) {
      const cambios = JSON.parse(cambiosOperadorRaw);
      if (Array.isArray(cambios) && cambios.length > 0) {
        const cambiosParaMigrar = cambios.map((cambio: any) => ({
          id: cambio.id,
          maquina_id: cambio.maquinaId,
          operador_anterior: cambio.operadorAnterior,
          operador_nuevo: cambio.operadorNuevo,
          supervisor: cambio.supervisor || "Sistema",
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        }));

        const { error } = await supabase.from("cambios_operador").upsert(cambiosParaMigrar, {
          onConflict: "id",
        });
        if (error) {
          errores.push(`Cambios operador: ${error.message}`);
        } else {
          detalles.cambiosOperador = cambios.length;
        }
      }
    }

    // 3. Migrar cambios de color
    const cambiosColorRaw = localStorage.getItem("gst3d_cambios_color");
    if (cambiosColorRaw) {
      const cambios = JSON.parse(cambiosColorRaw);
      if (Array.isArray(cambios) && cambios.length > 0) {
        const cambiosParaMigrar = cambios.map((cambio: any) => ({
          id: cambio.id,
          maquina_id: cambio.maquinaId,
          tipo_color: cambio.tipoColor,
          color_anterior: cambio.colorAnterior,
          color_nuevo: cambio.colorNuevo,
          supervisor: cambio.supervisor || "Sistema",
          fecha: cambio.fecha,
          timestamp: cambio.timestamp,
        }));

        const { error } = await supabase.from("cambios_color").upsert(cambiosParaMigrar, {
          onConflict: "id",
        });
        if (error) {
          errores.push(`Cambios color: ${error.message}`);
        } else {
          detalles.cambiosColor = cambios.length;
        }
      }
    }

    // 4. Migrar stock
    const stockRaw = localStorage.getItem("gst3d_stock");
    if (stockRaw) {
      const stock = JSON.parse(stockRaw);
      const { error } = await supabase
        .from("stock")
        .upsert({ id: "stock_global", stock_data: stock }, { onConflict: "id" });
      if (error) {
        errores.push(`Stock: ${error.message}`);
      } else {
        detalles.stock = Object.keys(stock).length;
      }
    }

    // 5. Migrar operadores personalizados
    const operadoresRaw = localStorage.getItem("gst3d_operadores_personalizados");
    if (operadoresRaw) {
      const operadores = JSON.parse(operadoresRaw);
      if (Array.isArray(operadores) && operadores.length > 0) {
        const operadoresParaMigrar = operadores.map((nombre: string) => ({ nombre }));
        const { error } = await supabase
          .from("operadores_personalizados")
          .upsert(operadoresParaMigrar, { onConflict: "nombre" });
        if (error) {
          errores.push(`Operadores personalizados: ${error.message}`);
        } else {
          detalles.operadoresPersonalizados = operadores.length;
        }
      }
    }

    // 6. Migrar operadores eliminados
    const eliminadosRaw = localStorage.getItem("gst3d_operadores_eliminados");
    if (eliminadosRaw) {
      const eliminados = JSON.parse(eliminadosRaw);
      if (Array.isArray(eliminados) && eliminados.length > 0) {
        const eliminadosParaMigrar = eliminados.map((nombre: string) => ({ nombre }));
        const { error } = await supabase
          .from("operadores_eliminados")
          .upsert(eliminadosParaMigrar, { onConflict: "nombre" });
        if (error) {
          errores.push(`Operadores eliminados: ${error.message}`);
        } else {
          detalles.operadoresEliminados = eliminados.length;
        }
      }
    }

    // 7. Migrar PINs
    const pinsRaw = localStorage.getItem("gst3d_pins_operadores");
    if (pinsRaw) {
      const pins = JSON.parse(pinsRaw);
      const pinsArray = Object.entries(pins).map(([operador, pinData]: [string, any]) => ({
        operador,
        pin: pinData.pin,
      }));
      if (pinsArray.length > 0) {
        const { error } = await supabase.from("pins_operadores").upsert(pinsArray, {
          onConflict: "operador",
        });
        if (error) {
          errores.push(`PINs: ${error.message}`);
        } else {
          detalles.pins = pinsArray.length;
        }
      }
    }

    // 8. Migrar stock mínimos
    const minimosRaw = localStorage.getItem("gst3d_stock_minimos");
    if (minimosRaw) {
      const minimos = JSON.parse(minimosRaw);
      const { error } = await supabase
        .from("stock_minimos")
        .upsert({ id: "minimos_global", minimos_data: minimos }, { onConflict: "id" });
      if (error) {
        errores.push(`Stock mínimos: ${error.message}`);
      } else {
        detalles.stockMinimos = Object.keys(minimos).length;
      }
    }

    // 9. Migrar stock categorías
    const stockCategoriasRaw = localStorage.getItem("gst3d_stock_categorias");
    if (stockCategoriasRaw) {
      const stockCategorias = JSON.parse(stockCategoriasRaw);
      const { error } = await supabase
        .from("stock_categorias")
        .upsert({ id: "categorias_global", stock_data: stockCategorias }, { onConflict: "id" });
      if (error) {
        errores.push(`Stock categorías: ${error.message}`);
      } else {
        detalles.stockCategorias = Object.keys(stockCategorias).length;
      }
    }

    // 10. Migrar categorías
    const categoriasRaw = localStorage.getItem("gst3d_categorias");
    if (categoriasRaw) {
      const categorias = JSON.parse(categoriasRaw);
      const categoriasArray = Object.values(categorias).map((cat: any) => ({
        id: cat.id,
        nombre: cat.nombre,
        items: cat.items || [],
      }));
      if (categoriasArray.length > 0) {
        const { error } = await supabase.from("categorias").upsert(categoriasArray, {
          onConflict: "id",
        });
        if (error) {
          errores.push(`Categorías: ${error.message}`);
        } else {
          detalles.categorias = categoriasArray.length;
        }
      }
    }

    // 11. Migrar colores personalizados
    const coloresRaw = localStorage.getItem("gst3d_colores_personalizados");
    if (coloresRaw) {
      const colores = JSON.parse(coloresRaw);
      const { error } = await supabase
        .from("colores_personalizados")
        .upsert({ id: "colores_global", colores_data: colores }, { onConflict: "id" });
      if (error) {
        errores.push(`Colores personalizados: ${error.message}`);
      } else {
        detalles.coloresPersonalizados = Object.keys(colores).length;
      }
    }

    // 12. Migrar colores eliminados
    const coloresEliminadosRaw = localStorage.getItem("gst3d_colores_eliminados");
    if (coloresEliminadosRaw) {
      const coloresEliminados = JSON.parse(coloresEliminadosRaw);
      const { error } = await supabase
        .from("colores_eliminados")
        .upsert({ id: "eliminados_global", eliminados_data: coloresEliminados }, {
          onConflict: "id",
        });
      if (error) {
        errores.push(`Colores eliminados: ${error.message}`);
      } else {
        detalles.coloresEliminados = Object.keys(coloresEliminados).length;
      }
    }

    // 13. Migrar operadores asignados
    const asignacionesRaw = localStorage.getItem("operadores_asignados");
    if (asignacionesRaw) {
      const asignaciones = JSON.parse(asignacionesRaw);
      const { error } = await supabase
        .from("operadores_asignados")
        .upsert({ id: "asignaciones_global", asignaciones_data: asignaciones }, {
          onConflict: "id",
        });
      if (error) {
        errores.push(`Operadores asignados: ${error.message}`);
      } else {
        detalles.operadoresAsignados = Object.keys(asignaciones).length;
      }
    }

    // 14. Migrar colores máquinas
    const coloresMaquinasRaw = localStorage.getItem("gst3d_colores_maquinas");
    if (coloresMaquinasRaw) {
      const coloresMaquinas = JSON.parse(coloresMaquinasRaw);
      const { error } = await supabase
        .from("colores_maquinas")
        .upsert({ id: "colores_maquinas_global", colores_data: coloresMaquinas }, {
          onConflict: "id",
        });
      if (error) {
        errores.push(`Colores máquinas: ${error.message}`);
      } else {
        detalles.coloresMaquinas = Object.keys(coloresMaquinas).length;
      }
    }

    // 15. Migrar contador etiquetas
    const contadorRaw = localStorage.getItem("gst3d_contador_etiquetas");
    if (contadorRaw) {
      const contador = JSON.parse(contadorRaw);
      const { error } = await supabase
        .from("contador_etiquetas")
        .upsert(
          {
            id: "contador_global",
            chicas: contador.chicas || 0,
            grandes: contador.grandes || 0,
          },
          { onConflict: "id" }
        );
      if (error) {
        errores.push(`Contador etiquetas: ${error.message}`);
      } else {
        detalles.contadorEtiquetas = 1;
      }
    }

    const totalMigrado = Object.values(detalles).reduce((sum, val) => sum + val, 0);

    if (errores.length > 0) {
      return {
        success: false,
        message: `Migración completada con errores. ${totalMigrado} elementos migrados.`,
        detalles: { ...detalles, errores: errores.length },
      };
    }

    return {
      success: true,
      message: `Migración exitosa. ${totalMigrado} elementos migrados.`,
      detalles,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error durante la migración: ${error.message}`,
      detalles,
    };
  }
}

