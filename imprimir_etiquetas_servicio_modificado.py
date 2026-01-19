import os
import time
import subprocess
from datetime import datetime
from supabase import create_client

SUPABASE_URL = "https://rybokbjrbugvggprnith.supabase.co"
SUPABASE_KEY = "sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"

RUTA_PRN = r"C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS"

IMPRESORA_CHICAS = r"\\localhost\ZebraZD420"
IMPRESORA_GRANDES = r"\\localhost\ZebraZD420_Grande"

INTERVALO_POLLING = 5

# Configuración de notificaciones
ARCHIVO_NOTIFICACIONES = r"C:\Users\gst3d\OneDrive\Desktop\notificaciones_prn.log"

def obtener_ruta_archivo(color, es_grande):
    color_limpio = color.replace("_GRANDE", "").strip()
    nombre_archivo = f"{color_limpio}_GRANDE.prn" if es_grande else f"{color_limpio}.prn"
    ruta = os.path.join(RUTA_PRN, nombre_archivo)
    return ruta if os.path.exists(ruta) else None

def enviar_a_impresora(ruta_prn, impresora, cantidad, inyectar_fecha=False):
    try:
        ruta_a_imprimir = ruta_prn

        if inyectar_fecha:
            with open(ruta_prn, 'rb') as f:
                contenido = f.read()

            fecha_str = datetime.now().strftime("%d/%m/%Y %H:%M")
            bloque_fecha = f"^FO0,205^FB480,1,0,C^A0N,30,30^FD{fecha_str}^FS".encode('utf-8')

            if b"^XZ" in contenido:
                partes = contenido.rsplit(b"^XZ", 1)
                zpl_final = partes[0] + bloque_fecha + b"^XZ" + partes[1]
            else:
                zpl_final = contenido + b"^XA" + bloque_fecha + b"^XZ"

            ruta_a_imprimir = os.path.join(os.environ['TEMP'], "temp_print_gst3d.prn")
            with open(ruta_a_imprimir, 'wb') as f:
                f.write(zpl_final)

        for i in range(cantidad):
            comando = f'copy /b "{ruta_a_imprimir}" "{impresora}"'
            subprocess.run(comando, shell=True, check=True, capture_output=True)
            print(f"    -> Copia {i+1}/{cantidad} enviada")
            time.sleep(0.2)

        return True
    except Exception as e:
        print(f" Error físico al imprimir: {e}")
        return False

def verificar_archivos_prn_faltantes(supabase):
    """
    Verifica si faltan archivos PRN para colores existentes en la base de datos
    """
    try:
        # Obtener colores personalizados
        colores_response = supabase.table('colores_personalizados').select('colores_data').eq('id', 'colores_global').single()

        colores_faltantes = []

        if colores_response.data and colores_response.data.get('colores_data'):
            colores_data = colores_response.data['colores_data']

            for tipo_material, colores_tipo in colores_data.items():
                # Verificar colores chicos
                if 'chica' in colores_tipo:
                    for color in colores_tipo['chica'].keys():
                        ruta = obtener_ruta_archivo(color, False)
                        if not ruta:
                            colores_faltantes.append(f"{color} (chica) - {tipo_material}")

                # Verificar colores grandes
                if 'grande' in colores_tipo:
                    for color in colores_tipo['grande'].keys():
                        color_sin_sufijo = color.replace("_GRANDE", "")
                        ruta = obtener_ruta_archivo(color_sin_sufijo, True)
                        if not ruta:
                            colores_faltantes.append(f"{color_sin_sufijo} (grande) - {tipo_material}")

        if colores_faltantes:
            print("\n⚠️  ARCHIVOS PRN FALTANTES:")
            for color_faltante in colores_faltantes:
                print(f"   ❌ {color_faltante}")

                # Registrar notificación
                notificar_error_prn(color_faltante.split(' (')[0],
                                  'grande' in color_faltante,
                                  color_faltante.split(' - ')[1])

            print("   💡 Estos colores se agregaron desde la web pero no tienen archivos PRN")
            print("   🔄 Se generarán automáticamente desde la aplicación web\n")

        return colores_faltantes

    except Exception as e:
        print(f"Error verificando archivos PRN faltantes: {e}")
        return []

def notificar_error_prn(color, es_grande, tipo_material):
    """
    Registra una notificación de error de archivo PRN faltante
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        variante = "grande" if es_grande else "chica"
        mensaje = f"[{timestamp}] ARCHIVO PRN FALTANTE: {color} ({variante}) - {tipo_material}\n"

        # Crear directorio si no existe
        os.makedirs(os.path.dirname(ARCHIVO_NOTIFICACIONES), exist_ok=True)

        # Registrar en archivo de notificaciones
        with open(ARCHIVO_NOTIFICACIONES, 'a', encoding='utf-8') as f:
            f.write(mensaje)

        print(f"   📝 Notificación registrada: {color} ({variante}) - {tipo_material}")

    except Exception as e:
        print(f"Error al registrar notificación: {e}")

def main():
    print("="*50)
    print("🚀 SERVIDOR GST3D - MODO PASAMANOS PRN")
    print("="*50)

    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Conectado a Supabase. Escuchando pedidos")
    except Exception as e:
        print(f"Error de conexión: {e}"); return

    # Verificar archivos PRN faltantes al inicio
    print("\n🔍 Verificando archivos PRN...")
    verificar_archivos_prn_faltantes(supabase)

    # Contador para verificaciones periódicas
    contador_ciclos = 0
    CICLOS_ENTRE_VERIFICACIONES = 100  # Verificar cada ~100 ciclos (500 segundos)

    while True:
        try:
            res = supabase.table('impresiones').select('*').eq('estado', 'pendiente').limit(5).execute()

            for imp in res.data:
                imp_id = imp['id']
                print(f"\n Procesando Pedido #{imp_id}")
                todo_ok = True

                # 1. Etiquetas Chicas
                cant_c = imp.get('cantidad_chicas', 0)
                if cant_c > 0 and imp.get('etiqueta_chica'):
                    ruta = obtener_ruta_archivo(imp['etiqueta_chica'], False)
                    if ruta:
                        if not enviar_a_impresora(ruta, IMPRESORA_CHICAS, cant_c, inyectar_fecha=True):
                            todo_ok = False
                    else:
                        print(f" No se encontró chica: {imp['etiqueta_chica']}")
                        # Notificar archivo faltante
                        notificar_error_prn(imp['etiqueta_chica'], False, "DESCONOCIDO")
                        todo_ok = False

                # 2. Etiquetas Grandes
                cant_g = imp.get('cantidad_grandes', 0)
                if cant_g > 0 and imp.get('etiqueta_grande'):
                    ruta = obtener_ruta_archivo(imp['etiqueta_grande'], True)
                    if ruta:
                        if not enviar_a_impresora(ruta, IMPRESORA_GRANDES, cant_g, inyectar_fecha=False):
                            todo_ok = False
                    else:
                        print(f" No se encontró grande: {imp['etiqueta_grande']}")
                        # Notificar archivo faltante
                        notificar_error_prn(imp['etiqueta_grande'], True, "DESCONOCIDO")
                        todo_ok = False

                nuevo_estado = 'impresa' if todo_ok else 'error'
                supabase.table('impresiones').update({'estado': nuevo_estado}).eq('id', imp_id).execute()
                print(f"✅ Pedido #{imp_id} finalizado como: {nuevo_estado}")

            # Verificación periódica de archivos PRN faltantes
            contador_ciclos += 1
            if contador_ciclos >= CICLOS_ENTRE_VERIFICACIONES:
                contador_ciclos = 0
                print("\n🔍 Verificación periódica de archivos PRN...")
                verificar_archivos_prn_faltantes(supabase)

            time.sleep(INTERVALO_POLLING)
        except KeyboardInterrupt: break
        except Exception as e:
            print(f"\n Error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    main()