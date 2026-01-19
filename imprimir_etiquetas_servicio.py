#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servicio de Impresión de Etiquetas GST3D - Versión Robusta
Este script lee las impresiones pendientes de Supabase y las imprime físicamente.
Diseñado para ejecutarse 24/7 sin cerrarse nunca.
"""

import os
import sys
import time
import json
import subprocess
import traceback
from datetime import datetime, timedelta
from typing import Optional, Dict, List

from supabase import create_client, Client

# ============================================================================
# CONFIGURACIÓN - TODAS LAS CREDENCIALES AQUÍ
# ============================================================================

# Configuración de Supabase (CREDENCIALES HARDCODEADAS)
SUPABASE_URL = "https://rybokbjrbugvggprnith.supabase.co"
SUPABASE_KEY = "sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"

# Configuración de impresora
RUTA_PRN = "/home/gst3d/etiquetas"  # Ruta donde están los archivos .prn
NOMBRE_IMPRESORA_CHICAS = "ZebraZD420"  # Nombre de la impresora CUPS para etiquetas chicas
NOMBRE_IMPRESORA_GRANDES = "ZebraZD420_Grande"  # Nombre de la impresora CUPS para etiquetas grandes
ID_MAQUINA = "02"  # ID de la máquina para códigos de barras

# Límites
LIMITE_ETIQUETAS_POR_HORA = 100

# Archivos locales
ARCHIVO_ESTADO_HORARIO = "/home/gst3d/estado_contador.txt"
ARCHIVO_CONTADOR_ID = "/home/gst3d/contador_id_numero.txt"
ARCHIVO_LOG_LOCAL = "/home/gst3d/etiquetas_log.json"
ARCHIVO_NOTIFICACIONES = "/home/gst3d/notificaciones_prn.log"

# Intervalo de polling (segundos)
INTERVALO_POLLING = 5

# Configuración de reintentos
MAX_REINTENTOS_CONEXION = 5
ESPERA_REINTENTO = 10  # segundos
ESPERA_ERROR_CRITICO = 30  # segundos antes de reintentar después de error crítico

# Variables globales
etiquetas_impresas_en_hora = 0
hora_de_inicio_del_contador = datetime.now()
supabase_client: Optional[Client] = None
conteo_errores_consecutivos = 0
ultimo_heartbeat = datetime.now()

# ============================================================================
# FUNCIONES DE LOGGING MEJORADAS
# ============================================================================

def log_info(mensaje: str):
    """Log de información con timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ℹ️  {mensaje}")

def log_error(mensaje: str, excepcion: Exception = None):
    """Log de error con timestamp y detalles."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ❌ ERROR: {mensaje}")
    if excepcion:
        print(f"   Excepción: {type(excepcion).__name__}: {str(excepcion)}")

def log_success(mensaje: str):
    """Log de éxito con timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ✅ {mensaje}")

def log_warning(mensaje: str):
    """Log de advertencia con timestamp."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] ⚠️  {mensaje}")

def notificar_error_prn(color: str, es_grande: bool, tipo_material: str):
    """Registra una notificación de error de archivo PRN faltante."""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        variante = "grande" if es_grande else "chica"
        mensaje = f"[{timestamp}] ARCHIVO PRN FALTANTE: {color} ({variante}) - {tipo_material}\n"

        # Registrar en archivo de notificaciones
        with open(ARCHIVO_NOTIFICACIONES, 'a', encoding='utf-8') as f:
            f.write(mensaje)

        log_warning(f"Archivo PRN faltante registrado: {color} ({variante}) - {tipo_material}")

        # Aquí se podría agregar envío de email, webhook, etc.
        # enviar_notificacion_email(mensaje)
        # enviar_webhook_notificacion(mensaje)

    except Exception as e:
        log_error("Error al registrar notificación PRN", e)

def obtener_notificaciones_pendientes() -> List[str]:
    """Obtiene las notificaciones pendientes."""
    try:
        if not os.path.exists(ARCHIVO_NOTIFICACIONES):
            return []

        with open(ARCHIVO_NOTIFICACIONES, 'r', encoding='utf-8') as f:
            lineas = f.readlines()

        # Retornar las últimas 10 notificaciones
        return [linea.strip() for linea in lineas[-10:]]
    except Exception as e:
        log_error("Error al leer notificaciones", e)
        return []

# ============================================================================
# FUNCIONES AUXILIARES ROBUSTAS
# ============================================================================

def cargar_estado_horario():
    """Carga el estado del contador horario desde un archivo."""
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    try:
        if os.path.exists(ARCHIVO_ESTADO_HORARIO):
            with open(ARCHIVO_ESTADO_HORARIO, "r") as f:
                lineas = f.readlines()
                if len(lineas) >= 2:
                    etiquetas_impresas_en_hora = int(lineas[0].strip())
                    hora_de_inicio_del_contador = datetime.fromisoformat(lineas[1].strip())
                    log_info(f"Estado horario cargado: {etiquetas_impresas_en_hora} etiquetas")
        else:
            guardar_estado_horario()
    except Exception as e:
        log_error("Error al cargar estado horario, usando valores por defecto", e)
        etiquetas_impresas_en_hora = 0
        hora_de_inicio_del_contador = datetime.now()
        guardar_estado_horario()

def guardar_estado_horario():
    """Guarda el estado actual del contador horario en un archivo."""
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    try:
        os.makedirs(os.path.dirname(ARCHIVO_ESTADO_HORARIO), exist_ok=True)
        with open(ARCHIVO_ESTADO_HORARIO, "w") as f:
            f.write(f"{etiquetas_impresas_en_hora}\n")
            f.write(hora_de_inicio_del_contador.isoformat())
    except Exception as e:
        log_error(f"Error al guardar estado horario", e)

def leer_contador_id() -> int:
    """Lee el contador de ID único desde un archivo."""
    try:
        if os.path.exists(ARCHIVO_CONTADOR_ID):
            with open(ARCHIVO_CONTADOR_ID, "r") as f:
                return int(f.read())
    except Exception as e:
        log_error("Error al leer contador ID, usando 1", e)
    return 1

def guardar_contador_id(numero: int):
    """Guarda el contador de ID único en un archivo."""
    try:
        os.makedirs(os.path.dirname(ARCHIVO_CONTADOR_ID), exist_ok=True)
        with open(ARCHIVO_CONTADOR_ID, "w") as f:
            f.write(str(numero))
    except Exception as e:
        log_error(f"Error al guardar contador ID", e)

def guardar_log_local(datos: dict):
    """Guarda un log de la etiqueta en un archivo JSON local."""
    try:
        os.makedirs(os.path.dirname(ARCHIVO_LOG_LOCAL), exist_ok=True)
        with open(ARCHIVO_LOG_LOCAL, "a", encoding='utf-8') as f:
            json.dump(datos, f, ensure_ascii=False)
            f.write("\n")
    except Exception as e:
        log_error("Error al guardar log local", e)

def obtener_nombre_archivo_prn(color: str, es_grande: bool) -> str:
    """
    Obtiene el nombre del archivo .prn basado en el color.
    - Si es grande, busca {color}_GRANDE.prn o {color_sin_sufijo}_GRANDE.prn
    - Si es chica, busca {color}.prn o {color_sin_sufijo}.prn
    """
    try:
        if es_grande:
            color_sin_sufijo = color.replace("_GRANDE", "")
            posibles_nombres = [
                f"{color_sin_sufijo}_GRANDE",
                f"{color_sin_sufijo}",
                color
            ]
        else:
            color_sin_sufijo = color.replace("_GRANDE", "")
            posibles_nombres = [
                color_sin_sufijo,
                color
            ]
        
        # Buscar el archivo que exista
        for nombre in posibles_nombres:
            ruta = os.path.join(RUTA_PRN, f"{nombre}.prn")
            if os.path.exists(ruta):
                return nombre
        
        # Si no se encuentra, retornar el nombre más probable
        color_sin_sufijo = color.replace("_GRANDE", "")
        return color_sin_sufijo if not es_grande else f"{color_sin_sufijo}_GRANDE"
    except Exception as e:
        log_error(f"Error al obtener nombre archivo PRN para {color}", e)
        return color.replace("_GRANDE", "")

def verificar_archivos_prn_faltantes():
    """
    Verifica si faltan archivos PRN para colores existentes en la base de datos
    y notifica si es necesario.
    """
    try:
        # Obtener colores de Supabase
        colores_response = supabase_client.table('colores_personalizados').select('colores_data').eq('id', 'colores_global').single()
        colores_eliminados_response = supabase_client.table('colores_eliminados').select('eliminados_data').eq('id', 'eliminados_global').single()

        colores_faltantes = []

        if colores_response.data and colores_response.data.get('colores_data'):
            colores_data = colores_response.data['colores_data']

            for tipo_material, colores_tipo in colores_data.items():
                # Verificar colores chicos
                if 'chica' in colores_tipo:
                    for color in colores_tipo['chica'].keys():
                        nombre_archivo = obtener_nombre_archivo_prn(color, False)
                        ruta = os.path.join(RUTA_PRN, f"{nombre_archivo}.prn")
                        if not os.path.exists(ruta):
                            colores_faltantes.append(f"{color} (chica) - {tipo_material}")

                # Verificar colores grandes
                if 'grande' in colores_tipo:
                    for color in colores_tipo['grande'].keys():
                        nombre_archivo = obtener_nombre_archivo_prn(color, True)
                        ruta = os.path.join(RUTA_PRN, f"{nombre_archivo}.prn")
                        if not os.path.exists(ruta):
                            colores_faltantes.append(f"{color.replace('_GRANDE', '')} (grande) - {tipo_material}")

        if colores_faltantes:
            log_warning("ARCHIVOS PRN FALTANTES:")
            for color_faltante in colores_faltantes:
                log_warning(f"   ❌ {color_faltante}")
            log_info("   💡 Estos colores se agregaron desde la web pero no tienen archivos PRN")
            log_info("   🔄 Se generarán automáticamente desde la aplicación web")

        return colores_faltantes

    except Exception as e:
        log_error("Error verificando archivos PRN faltantes", e)
        return []

# ============================================================================
# FUNCIÓN DE IMPRESIÓN ROBUSTA
# ============================================================================

def imprimir_etiqueta(tipo_material: str, color: str, es_grande: bool, cantidad: int, 
                      maquina_id: int, operador: str) -> bool:
    """
    Imprime una etiqueta (chica o grande) la cantidad de veces especificada.
    Returns: True si se imprimió correctamente, False en caso contrario
    """
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    try:
        # Verificar límite horario
        tiempo_transcurrido = datetime.now() - hora_de_inicio_del_contador
        if tiempo_transcurrido >= timedelta(hours=1):
            etiquetas_impresas_en_hora = 0
            hora_de_inicio_del_contador = datetime.now()
            guardar_estado_horario()
            log_info("Contador horario reiniciado")
        
        # Verificar si podemos imprimir
        if etiquetas_impresas_en_hora >= LIMITE_ETIQUETAS_POR_HORA:
            log_warning(f"Límite de etiquetas por hora alcanzado ({LIMITE_ETIQUETAS_POR_HORA})")
            return False
        
        # Obtener nombre del archivo .prn
        nombre_archivo_base = obtener_nombre_archivo_prn(color, es_grande)
        ruta_original = os.path.join(RUTA_PRN, f"{nombre_archivo_base}.prn")
        
        if not os.path.exists(ruta_original):
            log_error(f"No se encontró el archivo de plantilla: {ruta_original}")
            return False
        
        # Leer la plantilla ZPL
        try:
            with open(ruta_original, 'r', encoding='utf-8') as f:
                zpl_original = f.read()
        except Exception as e:
            log_error(f"Error al leer plantilla {ruta_original}", e)
            return False
        
        # Imprimir la cantidad especificada
        total_impreso = 0
        for i in range(cantidad):
            try:
                # Verificar límite antes de cada impresión
                if etiquetas_impresas_en_hora >= LIMITE_ETIQUETAS_POR_HORA:
                    log_warning(f"Límite alcanzado después de imprimir {total_impreso} etiquetas")
                    break
                
                # Generar ID único
                id_numero = leer_contador_id()
                numero_formateado = f"{id_numero:010d}"
                fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                
                # Construir código de barras
                color_para_barcode = color.replace("_GRANDE", "")
                contenido_barcode = f"{ID_MAQUINA}-{tipo_material}-{color_para_barcode}-{numero_formateado}"
                
                # Agregar información adicional al ZPL
                zpl_extra = f"""
^FO60,60^BY0.5,2,150^BCN,100,Y,N,N^FD{contenido_barcode}^FS
^FO30,300^A0N,30,30^FDFecha: {fecha_actual}^FS
^FO30,340^A0N,30,30^FDEtiq. ID: {numero_formateado}^FS
^FO30,380^A0N,25,25^FDMáq: {maquina_id:02d} | Op: {operador[:15]}^FS
"""
                
                # Generar ZPL final
                zpl_final = zpl_original.replace("^XZ", zpl_extra + "\n^XZ")
                
                # Guardar archivo temporal
                ruta_temp = f"/tmp/etiqueta_{id_numero}_{i}_{int(time.time())}.prn"
                try:
                    with open(ruta_temp, 'w', encoding='utf-8') as f:
                        f.write(zpl_final)
                except Exception as e:
                    log_error(f"Error al crear archivo temporal {ruta_temp}", e)
                    continue
                
                # Seleccionar la impresora correcta según el tipo de etiqueta
                nombre_impresora = NOMBRE_IMPRESORA_GRANDES if es_grande else NOMBRE_IMPRESORA_CHICAS
                
                # Enviar a la impresora con reintentos
                exito_impresion = False
                for reintento in range(3):
                    try:
                        resultado = subprocess.run(
                            ["lp", "-d", nombre_impresora, ruta_temp],
                            check=True,
                            capture_output=True,
                            text=True,
                            timeout=30
                        )
                        exito_impresion = True
                        break
                    except subprocess.TimeoutExpired:
                        log_warning(f"Timeout al imprimir en {nombre_impresora} (reintento {reintento + 1}/3)")
                        if reintento < 2:
                            time.sleep(2)
                    except subprocess.CalledProcessError as e:
                        log_error(f"Error al imprimir en {nombre_impresora} (reintento {reintento + 1}/3): {e.stderr}", e)
                        if reintento < 2:
                            time.sleep(2)
                    except Exception as e:
                        log_error(f"Error inesperado al imprimir en {nombre_impresora} (reintento {reintento + 1}/3)", e)
                        if reintento < 2:
                            time.sleep(2)
                
                if not exito_impresion:
                    log_error(f"No se pudo imprimir después de 3 reintentos en {nombre_impresora}: {ruta_temp}")
                    try:
                        os.remove(ruta_temp)
                    except:
                        pass
                    continue
                
                # Guardar log
                try:
                    datos = {
                        "fecha": fecha_actual,
                        "tipo": tipo_material,
                        "color": color,
                        "tipo_etiqueta": "grande" if es_grande else "chica",
                        "id_numero": numero_formateado,
                        "codigo_barra": contenido_barcode,
                        "id_maquina": str(ID_MAQUINA),
                        "maquina_id": maquina_id,
                        "operador": operador,
                        "cantidad": cantidad
                    }
                    guardar_log_local(datos)
                except Exception as e:
                    log_error("Error al guardar log local", e)
                
                # Actualizar contadores
                try:
                    guardar_contador_id(id_numero + 1)
                    etiquetas_impresas_en_hora += 1
                    guardar_estado_horario()
                except Exception as e:
                    log_error("Error al actualizar contadores", e)
                
                total_impreso += 1
                
                # Limpiar archivo temporal
                try:
                    os.remove(ruta_temp)
                except:
                    pass
                    
            except Exception as e:
                log_error(f"Error al procesar etiqueta {i+1}/{cantidad}", e)
                continue
        
        if total_impreso > 0:
            nombre_impresora_usada = NOMBRE_IMPRESORA_GRANDES if es_grande else NOMBRE_IMPRESORA_CHICAS
            log_success(f"Impresas {total_impreso}/{cantidad} etiquetas {'grandes' if es_grande else 'chicas'} de {tipo_material} - {color} en {nombre_impresora_usada}")
            log_info(f"Etiquetas impresas en la última hora: {etiquetas_impresas_en_hora}/{LIMITE_ETIQUETAS_POR_HORA}")
        
        return total_impreso > 0
        
    except Exception as e:
        log_error(f"Error crítico en imprimir_etiqueta", e)
        traceback.print_exc()
        return False

# ============================================================================
# CONEXIÓN A SUPABASE ROBUSTA
# ============================================================================

def conectar_supabase(reintentos: int = MAX_REINTENTOS_CONEXION) -> Optional[Client]:
    """Conecta a Supabase con reintentos automáticos."""
    global supabase_client
    
    for intento in range(reintentos):
        try:
            cliente = create_client(SUPABASE_URL, SUPABASE_KEY)
            # Probar la conexión haciendo una consulta simple
            cliente.table('impresiones').select('id').limit(1).execute()
            supabase_client = cliente
            log_success(f"Conexión a Supabase establecida (intento {intento + 1})")
            return cliente
        except Exception as e:
            if intento < reintentos - 1:
                log_warning(f"Error al conectar con Supabase (intento {intento + 1}/{reintentos}): {str(e)}")
                log_info(f"Reintentando en {ESPERA_REINTENTO} segundos...")
                time.sleep(ESPERA_REINTENTO)
            else:
                log_error(f"Error al conectar con Supabase después de {reintentos} intentos", e)
    
    return None

def verificar_conexion_supabase() -> bool:
    """Verifica que la conexión a Supabase siga activa."""
    global supabase_client
    
    if supabase_client is None:
        return False
    
    try:
        supabase_client.table('impresiones').select('id').limit(1).execute()
        return True
    except Exception:
        return False

def reconectar_supabase_si_es_necesario() -> bool:
    """Reconecta a Supabase si la conexión se perdió."""
    if not verificar_conexion_supabase():
        log_warning("Conexión a Supabase perdida, intentando reconectar...")
        return conectar_supabase() is not None
    return True

# ============================================================================
# FUNCIÓN PRINCIPAL DE PROCESAMIENTO ROBUSTA
# ============================================================================

def procesar_impresion_pendiente(impresion: Dict) -> bool:
    """Procesa una impresión pendiente desde Supabase con manejo robusto de errores."""
    global supabase_client
    
    try:
        if not reconectar_supabase_si_es_necesario():
            log_error("No se pudo reconectar a Supabase para procesar impresión")
            return False
        
        impresion_id = impresion.get('id')
        maquina_id = impresion.get('maquina_id')
        tipo_material = impresion.get('tipo_material')
        etiqueta_chica = impresion.get('etiqueta_chica')
        etiqueta_grande = impresion.get('etiqueta_grande')
        operador = impresion.get('operador', 'Desconocido')
        cantidad_chicas = impresion.get('cantidad_chicas', 8)
        cantidad_grandes = impresion.get('cantidad_grandes', 8)
        
        log_info(f"Procesando impresión {impresion_id}")
        log_info(f"  Máquina: {maquina_id} | Operador: {operador}")
        log_info(f"  Material: {tipo_material}")
        log_info(f"  Chicas: {cantidad_chicas} x {etiqueta_chica}")
        log_info(f"  Grandes: {cantidad_grandes} x {etiqueta_grande}")
        
        # Imprimir etiquetas chicas
        exito_chicas = True
        if cantidad_chicas > 0 and etiqueta_chica:
            try:
                exito_chicas = imprimir_etiqueta(
                    tipo_material=tipo_material,
                    color=etiqueta_chica,
                    es_grande=False,
                    cantidad=cantidad_chicas,
                    maquina_id=maquina_id,
                    operador=operador
                )
            except Exception as e:
                log_error("Error al imprimir etiquetas chicas", e)
                exito_chicas = False
        
        # Imprimir etiquetas grandes
        exito_grandes = True
        if cantidad_grandes > 0 and etiqueta_grande:
            try:
                exito_grandes = imprimir_etiqueta(
                    tipo_material=tipo_material,
                    color=etiqueta_grande,
                    es_grande=True,
                    cantidad=cantidad_grandes,
                    maquina_id=maquina_id,
                    operador=operador
                )
            except Exception as e:
                log_error("Error al imprimir etiquetas grandes", e)
                exito_grandes = False
        
        # Actualizar estado en Supabase con reintentos
        estado_final = 'impresa' if (exito_chicas and exito_grandes) else 'error'
        
        for reintento in range(3):
            try:
                if reconectar_supabase_si_es_necesario():
                    supabase_client.table('impresiones').update({
                        'estado': estado_final
                    }).eq('id', impresion_id).execute()
                    
                    log_success(f"Estado actualizado a: {estado_final}")
                    return True
            except Exception as e:
                if reintento < 2:
                    log_warning(f"Error al actualizar estado (reintento {reintento + 1}/3)", e)
                    time.sleep(2)
                else:
                    log_error("Error al actualizar estado después de 3 reintentos", e)
        
        return False
            
    except Exception as e:
        log_error(f"Error crítico al procesar impresión", e)
        traceback.print_exc()
        return False

def obtener_impresiones_pendientes() -> List[Dict]:
    """Obtiene las impresiones pendientes de Supabase con manejo robusto."""
    global supabase_client
    
    try:
        if not reconectar_supabase_si_es_necesario():
            return []
        
        response = supabase_client.table('impresiones')\
            .select('*')\
            .eq('estado', 'pendiente')\
            .order('timestamp', desc=False)\
            .limit(10)\
            .execute()
        
        return response.data if response.data else []
    except Exception as e:
        log_error("Error al obtener impresiones pendientes", e)
        return []

# ============================================================================
# HEARTBEAT Y MONITOREO
# ============================================================================

def hacer_heartbeat():
    """Registra un heartbeat para indicar que el servicio está vivo."""
    global ultimo_heartbeat
    ultimo_heartbeat = datetime.now()
    # Cada hora, hacer un log más detallado
    if ultimo_heartbeat.minute == 0:
        log_info("💓 Servicio activo - Heartbeat")

# ============================================================================
# BUCLE PRINCIPAL ULTRA ROBUSTO
# ============================================================================

def main():
    """Función principal que ejecuta el bucle de polling - NUNCA SE CIERRA."""
    global conteo_errores_consecutivos
    
    log_info("=" * 70)
    log_info("🚀 Servicio de Impresión de Etiquetas GST3D - Versión Robusta")
    log_info("=" * 70)
    log_info(f"Supabase URL: {SUPABASE_URL}")
    log_info(f"Ruta plantillas: {RUTA_PRN}")
    log_info(f"Impresora etiquetas chicas: {NOMBRE_IMPRESORA_CHICAS}")
    log_info(f"Impresora etiquetas grandes: {NOMBRE_IMPRESORA_GRANDES}")
    log_info(f"Intervalo de polling: {INTERVALO_POLLING} segundos")
    log_info("=" * 70)
    
    # Cargar estado inicial
    cargar_estado_horario()
    
    # Conectar a Supabase
    if conectar_supabase() is None:
        log_error("No se pudo conectar a Supabase. El servicio continuará intentando...")
    
    # Verificar que existe la carpeta de plantillas
    if not os.path.exists(RUTA_PRN):
        log_warning(f"La carpeta {RUTA_PRN} no existe. Creando...")
        try:
            os.makedirs(RUTA_PRN, exist_ok=True)
        except Exception as e:
            log_error(f"No se pudo crear la carpeta {RUTA_PRN}", e)

    # Verificar archivos PRN faltantes al inicio
    log_info("🔍 Verificando archivos PRN...")
    verificar_archivos_prn_faltantes()

    log_info("")
    log_info(f"🔄 Iniciando bucle de polling (cada {INTERVALO_POLLING} segundos)...")
    log_info("   El servicio NUNCA se cerrará automáticamente")
    log_info("   Presiona Ctrl+C para detener manualmente")
    log_info("")

    # Contador para verificaciones periódicas
    contador_ciclos = 0
    CICLOS_ENTRE_VERIFICACIONES = 100  # Verificar cada ~100 ciclos (500 segundos)

    # BUCLE PRINCIPAL - NUNCA SE SALE A MENOS QUE HAYA KeyboardInterrupt
    while True:
        try:
            ciclo_inicio = time.time()
            
            # Obtener impresiones pendientes
            impresiones = obtener_impresiones_pendientes()
            
            if impresiones:
                log_info(f"📋 Encontradas {len(impresiones)} impresión(es) pendiente(s)")
                
                for impresion in impresiones:
                    try:
                        procesar_impresion_pendiente(impresion)
                        time.sleep(1)  # Pequeña pausa entre impresiones
                    except Exception as e:
                        log_error(f"Error al procesar impresión individual", e)
                        continue  # Continuar con la siguiente impresión
            else:
                # Solo mostrar mensaje cada cierto tiempo para no saturar logs
                tiempo_actual = datetime.now()
                if tiempo_actual.second < INTERVALO_POLLING:
                    hacer_heartbeat()
            
            # Verificación periódica de archivos PRN faltantes
            contador_ciclos += 1
            if contador_ciclos >= CICLOS_ENTRE_VERIFICACIONES:
                contador_ciclos = 0
                log_info("🔍 Verificación periódica de archivos PRN...")
                verificar_archivos_prn_faltantes()

            # Reiniciar contador de errores si todo salió bien
            conteo_errores_consecutivos = 0

            # Calcular tiempo de espera (asegurar intervalo mínimo)
            tiempo_ciclo = time.time() - ciclo_inicio
            tiempo_espera = max(0, INTERVALO_POLLING - tiempo_ciclo)
            if tiempo_espera > 0:
                time.sleep(tiempo_espera)
                
        except KeyboardInterrupt:
            log_info("")
            log_info("⏹️  Deteniendo servicio por solicitud del usuario...")
            break
        except Exception as e:
            conteo_errores_consecutivos += 1
            log_error(f"Error en el bucle principal (error #{conteo_errores_consecutivos})", e)
            
            # Si hay demasiados errores consecutivos, esperar más tiempo
            if conteo_errores_consecutivos >= 5:
                log_warning(f"Muchos errores consecutivos. Esperando {ESPERA_ERROR_CRITICO} segundos antes de continuar...")
                time.sleep(ESPERA_ERROR_CRITICO)
                conteo_errores_consecutivos = 0
            else:
                time.sleep(INTERVALO_POLLING)
            
            # Intentar reconectar si hay problemas
            if conteo_errores_consecutivos % 3 == 0:
                log_info("Intentando reconectar a Supabase...")
                conectar_supabase()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log_info("\n👋 Servicio detenido por el usuario")
        sys.exit(0)
    except Exception as e:
        log_error("Error fatal no capturado", e)
        traceback.print_exc()
        log_info("El servicio se reiniciará...")
        # En caso de error fatal, esperar y volver a intentar
        time.sleep(ESPERA_ERROR_CRITICO)
        # Si estamos aquí es porque hay un problema grave, pero continuamos intentando
        log_info("Reiniciando servicio...")
        main()
