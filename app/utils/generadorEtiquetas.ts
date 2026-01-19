/**
 * Generador automático de archivos .prn para colores nuevos
 * Crea plantillas ZPL basadas en colores agregados desde la interfaz web
 */

import { supabase } from './supabase';
import { requireSupabase } from './supabaseError';

// Plantillas ZPL base para etiquetas
const PLANTILLA_ETIQUETA_CHICA = `^XA
^CF0,30
^FO50,50^GB700,1200,2^FS
^FO70,80^A0N,40,40^FD{{NOMBRE_COLOR}}^FS
^FO70,140^A0N,30,30^FD{{TIPO_MATERIAL}}^FS
^FO70,190^A0N,25,25^FDGST3D - Impresión 3D^FS
^FO70,230^A0N,20,20^FDEtiqueta Chica^FS
^FO400,80^GB200,200,2^FS
^XZ`;

const PLANTILLA_ETIQUETA_GRANDE = `^XA
^CF0,40
^FO50,50^GB700,1600,2^FS
^FO70,100^A0N,60,60^FD{{NOMBRE_COLOR}}^FS
^FO70,180^A0N,40,40^FD{{TIPO_MATERIAL}}^FS
^FO70,250^A0N,35,35^FDGST3D - Impresión 3D^FS
^FO70,310^A0N,25,25^FDEtiqueta Grande^FS
^FO400,100^GB250,300,2^FS
^XZ`;

// Configuración para la API de generación de archivos
const CONFIG_API = {
  url: process.env.NEXT_PUBLIC_API_ETIQUETAS_URL || 'http://localhost:3001',
  endpoint: '/api/generar-etiqueta'
};

/**
 * Genera archivo .prn para un color específico
 */
async function generarArchivoPRN(
  nombreColor: string,
  tipoMaterial: string,
  esGrande: boolean = false
): Promise<string> {
  try {
    const plantilla = esGrande ? PLANTILLA_ETIQUETA_GRANDE : PLANTILLA_ETIQUETA_CHICA;

    // Reemplazar placeholders en la plantilla
    const zplContent = plantilla
      .replace(/{{NOMBRE_COLOR}}/g, nombreColor.toUpperCase())
      .replace(/{{TIPO_MATERIAL}}/g, tipoMaterial.toUpperCase());

    return zplContent;
  } catch (error) {
    console.error('Error generando archivo PRN:', error);
    throw new Error(`No se pudo generar el archivo PRN para ${nombreColor}`);
  }
}

/**
 * Envía archivo PRN al servidor de impresión
 */
async function enviarArchivoPRN(
  nombreArchivo: string,
  contenidoZPL: string
): Promise<boolean> {
  try {
    // Por ahora, simulamos el envío al servidor
    // En producción, esto enviaría el archivo al servidor donde corre el script de impresión
    console.log(`Enviando archivo ${nombreArchivo} al servidor de impresión`);
    console.log('Contenido ZPL:', contenidoZPL.substring(0, 200) + '...');

    // Aquí iría la lógica real para enviar el archivo al servidor
    // Por ejemplo, usando fetch a una API o WebSocket

    return true;
  } catch (error) {
    console.error('Error enviando archivo PRN:', error);
    return false;
  }
}

/**
 * Procesa un nuevo color agregado y genera sus archivos PRN
 */
export async function procesarNuevoColor(
  nombreColor: string,
  tipoMaterial: string,
  variantes: ('chica' | 'grande' | 'ambas')[] = ['ambas']
): Promise<{exito: boolean, mensaje: string}> {
  try {
    requireSupabase();

    const variantesAGenerar = variantes.includes('ambas')
      ? ['chica', 'grande']
      : variantes;

    const resultados = [];

    for (const variante of variantesAGenerar) {
      const esGrande = variante === 'grande';
      const sufijo = esGrande ? '_GRANDE' : '';
      const nombreArchivo = `${nombreColor.toUpperCase()}${sufijo}.prn`;

      // Generar contenido ZPL
      const contenidoZPL = await generarArchivoPRN(nombreColor, tipoMaterial, esGrande);

      // Enviar al servidor de impresión
      const enviado = await enviarArchivoPRN(nombreArchivo, contenidoZPL);

      if (enviado) {
        resultados.push(`✅ ${variante}: ${nombreArchivo}`);
      } else {
        resultados.push(`❌ ${variante}: Error enviando ${nombreArchivo}`);
      }
    }

    const exito = resultados.every(r => r.startsWith('✅'));
    const mensaje = exito
      ? `Archivos PRN generados correctamente:\n${resultados.join('\n')}`
      : `Errores en generación:\n${resultados.join('\n')}`;

    return { exito, mensaje };

  } catch (error) {
    console.error('Error procesando nuevo color:', error);
    return {
      exito: false,
      mensaje: `Error procesando color ${nombreColor}: ${error instanceof Error ? error.message : 'Error desconocido'}`
    };
  }
}

/**
 * Hook para escuchar cambios en colores personalizados y procesar nuevos colores
 */
export function suscribirGeneracionAutomaticaPRN(
  callback?: (resultado: {exito: boolean, mensaje: string, color: string, tipo: string}) => void
) {
  if (!supabase) {
    console.error('Supabase no configurado para generación automática de PRN');
    return () => {};
  }

  // Suscribirse a cambios en colores_personalizados
  const subscription = supabase
    .channel('generacion_prn_colores')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'colores_personalizados'
      },
      async (payload) => {
        try {
          console.log('Nuevo color personalizado detectado:', payload);

          // Procesar el nuevo color
          if (payload.new && payload.new.colores_data) {
            const coloresData = payload.new.colores_data as Record<string, any>;

            // Procesar cada tipo de material
            for (const [tipoMaterial, coloresTipo] of Object.entries(coloresData)) {
              if (coloresTipo.chica) {
                for (const [nombreColor, hex] of Object.entries(coloresTipo.chica)) {
                  const resultado = await procesarNuevoColor(nombreColor, tipoMaterial, ['chica']);
                  if (callback) {
                    callback({...resultado, color: nombreColor, tipo: tipoMaterial});
                  }
                }
              }

              if (coloresTipo.grande) {
                for (const [nombreColor, hex] of Object.entries(coloresTipo.grande)) {
                  const resultado = await procesarNuevoColor(nombreColor, tipoMaterial, ['grande']);
                  if (callback) {
                    callback({...resultado, color: nombreColor, tipo: tipoMaterial});
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error en procesamiento automático de PRN:', error);
          if (callback) {
            callback({
              exito: false,
              mensaje: `Error procesando color automáticamente: ${error instanceof Error ? error.message : 'Error desconocido'}`,
              color: 'desconocido',
              tipo: 'desconocido'
            });
          }
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

/**
 * Verifica si un archivo PRN existe en el servidor
 */
export async function verificarArchivoPRN(
  nombreColor: string,
  esGrande: boolean = false
): Promise<boolean> {
  // Esta función verificaría si el archivo existe en el servidor
  // Por ahora retorna true (simulación)
  return true;
}

/**
 * Lista todos los archivos PRN disponibles
 */
export async function listarArchivosPRN(): Promise<string[]> {
  // Esta función obtendría la lista de archivos PRN del servidor
  // Por ahora retorna una lista simulada
  return [
    'BLACK.prn', 'RED.prn', 'BLUE.prn', 'BLACK_GRANDE.prn', 'RED_GRANDE.prn'
  ];
}