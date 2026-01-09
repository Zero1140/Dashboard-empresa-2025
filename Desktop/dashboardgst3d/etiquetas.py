#!/usr/bin/env python3
# -- coding: utf-8 --

import os
import tkinter as tk
from datetime import datetime, timedelta
import subprocess
import json
import re


RUTA_PRN = "/home/gst3d/etiquetas"
NOMBRE_IMPRESORA = "Zebra_ZD420-203dpi"
LIMITE_ETIQUETAS_POR_HORA = 100
ARCHIVO_ESTADO_HORARIO = "/home/gst3d/estado_contador.txt"
ARCHIVO_CONTADOR_ID = "/home/gst3d/contador_id_numero.txt"
ARCHIVO_LOG_LOCAL = "/home/gst3d/etiquetas_log.json"
ID_MAQUINA = "02"

etiquetas_impresas_en_hora = 0
hora_de_inicio_del_contador = datetime.now()

colores_por_tipo = {
    "PLA": {
        "BLACK": "#000000",
        "COLORCHANGE": "#808080",
        "FLUORESCENTYELLOW": "#FFFF00",
        "GLITTERGOLD": "#FFD700",
        "LIGHTBROWN": "#A0522D",
        "PASTELBLUE": "#AEC6CF",
        "PINK": "#FFC0CB",
        "BLUE": "#0000FF",
        "CRYSTAL": "#CCE5FF",
        "FUCHSIA": "#FF00FF",
        "GLITTERRED": "#FF6347",
        "LIGHTPINK": "#FFB6C1",
        "PASTELCREAM": "#FFFDD0",
        "RED": "#FF0000",
        "ULTRAWHITE": "#FFFFFF",
        "WHITE": "#F8F8FF",
        "ICEBLUE": "#AEC6CF",
        "FIREFLY": "#FF4500",
        "GLITTERARMYGREEN": "#556B2F",
        "GLITTERSILVER": "#C0C0C0",
        "MUSTARD": "#FFDB58",
        "PASTELGREEN": "#77DD77",
        "SILVER": "#C0C0C0",
        "CAPIBARA": "#A68F6A",
        "ARMYGREEN": "#4B5320",
        "BROWN": "#8B4513",
        "FLUORESCENTGREEN": "#39FF14",
        "GLITTERBLACK": "#222222",
        "GOLD": "#FFD700",
        "NAFTASUPER": "#FA8072",
        "PASTELPINK": "#FFD1DC",
        "VIOLET": "#8A2BE2",
        "ORANGE": "#FFA500",
        "PASTELVIOLET": "#CBAACB",
        "YELLOW": "#FFFF00",
        "APPLEGREEN": "#8DB600",
        "FLUORESCENTORANGE": "#FF8000",
        "GLITTERBLUE": "#4682B4",
        "DARKBLUE": "#0000FF",
        "LIGHTBLUE": "#ADD8E6",
    },
    "SILK": {
        "SALUMINUM": "#4682B4",
        "SBLUE": "#0000FF",
        "SFUCHSIA": "#FF00FF",
        "SGOLD": "#FFD700",
        "SGRAPHITE": "#4B4B4B",
        "SGREEN": "#228B22",
        "SPEACH": "#FFDAB9",
        "SPURPLE": "#800080",
        "SRED": "#FF0000",
        "SROSEGOLD": "#B76E79",
        "SSAND": "#C2B280",
        "SORANGEFLUOR": "#FF8000",
        "SSAND": "#FFD700",
        "SGREENFLUOR": "#556B2F",
        "SMARBLE": "#A7A59B",
        "SPEARL": "#4682B4",
        "SLIGHTBLUE": "#4682B4",
        "SARMYGREEN": "#556B2F",
        "SYELLOWFLUOR": "#FFFF00",
        "OLIVE": "#4B5320",
        #STRI y SBI
        "STRICOLORBLUEGREENYELLOWFLUO": "#5965D8",
        "STRICOLORGOLDGREENFUCHSIA": "#9E8D2E",
        "STRICOLORGOLDGREENPURPLE": "#800080",
        "STRICOLORGOLDPURPLEBLUE": "#001780",
        "STRICOLORGOLDREDBLUE": "#CC3B3B",
        "STRICOLORGREENPURPLEBLUE": "#558A33",
        "STRICOLORGREENREDBLUE": "#77DD77",
        "STRICOLORREDGOLDORANGEFLUO": "#DD7A77",
        "STRICOLORFUCHSIAGOLDORANGEF": "#800080",
        "SLAMBO": "#59C74A",
        "SBICOLORGRAPHITEGREEN": "#4B4B4B",
        "SBICOLORGRAPHITERED": "#FF0000",
        "BICOLORGRAPHITEGOLD": "#77DD77",
        "BICOLORPEARLGOLD": "#DD7A77",
        "SBICOLORGRAPHITEPEARL": "#A0522D",
        "SBICOLORORANGEGOLD": "#AEC6CF",
        "SBICOLORFUCHSIAGOLD": "#800080",
        "SBICOLORGRAPHITEPURPLE": "#800080",
    },
    "PETG": {
        "PWHITE": "#F8F8FF",
        "PBLACK": "#000000",
        "PAPPLEGREEN": "#8DB600",
        "PCRYSTAL": "#CCE5FF",
        "PRED": "#FF0000",
        "PSILVER": "#000000",
        "PVIOLET": "#8A2BE2",
        "PBLUE": "#0000FF",
        "PARMYGREEN": "#8DB600",
        "PCOLORCHANGE": "#808080",
        "PYELLOW": "#FFFF00",
        "TRANSPARENTRED": "#FF0000",
        "TRANSPARENTBLUE": "#3A37BE",
        "TRANSPARENTGREEN": "#29BB55",
        "TRANSPARENTYELLOW": "#F0DB1D",
        "TRANSPARENTBLACK": "#111010",
    },
    "ABS": {
        "ABSBLACK": "#000000",
        "ABSWHITE": "#FFFFFF",
    },
    "ASA": {
        "ASABLACK": "#111111",
        "ASAWHITE": "#FFFFFF",
    },
    "TPU": {
        "TWHITE": "#F8F8FF",
        "TBLACK": "#000000",
        "TRED": "#FF0000",
        "TBLUE": "#0000FF",
        "TSILVER": "#C0C0C0",
    },
    "ESPECIALES": {
        "FC": "#808080",
    },
}


def guardar_estado_horario():
    """Guarda el estado actual del contador horario en un archivo."""
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    with open(ARCHIVO_ESTADO_HORARIO, "w") as f:
        f.write(f"{etiquetas_impresas_en_hora}\n")
        f.write(hora_de_inicio_del_contador.isoformat())

def cargar_estado_horario():
    """Carga el estado del contador horario desde un archivo."""
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    if os.path.exists(ARCHIVO_ESTADO_HORARIO):
        try:
            with open(ARCHIVO_ESTADO_HORARIO, "r") as f:
                lineas = f.readlines()
                if len(lineas) >= 2:
                    etiquetas_impresas_en_hora = int(lineas[0].strip())
                    hora_de_inicio_del_contador = datetime.fromisoformat(lineas[1].strip())
        except (ValueError, IOError) as e:
            print(f"Error al cargar el estado del contador horario: {e}. Se reiniciará el contador.")
            guardar_estado_horario()

def leer_contador_id():
    """Lee el contador de ID único desde un archivo."""
    if os.path.exists(ARCHIVO_CONTADOR_ID):
        with open(ARCHIVO_CONTADOR_ID, "r") as f:
            try:
                return int(f.read())
            except:
                return 1
    else:
        return 1

def guardar_contador_id(numero):
    """Guarda el contador de ID único en un archivo."""
    with open(ARCHIVO_CONTADOR_ID, "w") as f:
        f.write(str(numero))

def guardar_log_local(datos):
    """Guarda un log de la etiqueta en un archivo JSON local."""
    try:
        with open(ARCHIVO_LOG_LOCAL, "a") as f:
            json.dump(datos, f)
            f.write("\n")
    except Exception as e:
        print(f"Error al guardar log localmente: {e}")


def imprimir_y_guardar_etiqueta_unificada(nombre_archivo, tipo, color):
    global etiquetas_impresas_en_hora
    global hora_de_inicio_del_contador
    
    tiempo_transcurrido = datetime.now() - hora_de_inicio_del_contador
    if tiempo_transcurrido >= timedelta(hours=1):
        etiquetas_impresas_en_hora = 0
        hora_de_inicio_del_contador = datetime.now()
    
    if etiquetas_impresas_en_hora < LIMITE_ETIQUETAS_POR_HORA:
        id_numero = leer_contador_id()
        numero_formateado = f"{id_numero:010d}"
        fecha_actual = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        contenido_barcode = f"{ID_MAQUINA}-{tipo}-{color}-{numero_formateado}"
        
        ruta_original = os.path.join(RUTA_PRN, f"{nombre_archivo}.prn")
        if not os.path.exists(ruta_original):
            tk.messagebox.showerror("Error", f"No se encontró el archivo de plantilla: {ruta_original}")
            return
        
        with open(ruta_original, 'r') as f:
            zpl_original = f.read()
        zpl_extra = f"""
        ^FO60,60^BY0.5,2,150^BCN,100,Y,N,N^FD{contenido_barcode}^FS
        ^FO30,300^A0N,30,30^FDFecha: {fecha_actual}^FS
        ^FO30,340^A0N,30,30^FDEtiq. ID: {numero_formateado}^FS
        """
        
        zpl_final = zpl_original.replace("^XZ", zpl_extra + "\n^XZ")
        ruta_temp = f"/tmp/{nombre_archivo}_unificada.prn"
        with open(ruta_temp, 'w') as f:
            f.write(zpl_final)

        try:
            # Enviar a la impresora
            subprocess.run(["lp", "-d", NOMBRE_IMPRESORA, ruta_temp], check=True)
            print("Envío a la impresora exitoso.")

            # Guardar log y actualizar contadores
            datos = {
                "fecha": fecha_actual,
                "tipo": str(tipo),
                "color": str(color),
                "id_numero": str(numero_formateado),
                "codigo_barra": str(contenido_barcode),
                "id_maquina": str(ID_MAQUINA)
            }
            guardar_log_local(datos)
            guardar_contador_id(id_numero + 1)
            
            etiquetas_impresas_en_hora += 1
            guardar_estado_horario()
            print(f"Etiquetas impresas en la última hora: {etiquetas_impresas_en_hora}/{LIMITE_ETIQUETAS_POR_HORA}")
            actualizar_etiqueta_contador()
        except subprocess.CalledProcessError as e:
            print(f"Error al imprimir: {e}")
            tk.messagebox.showerror("Error de Impresión", f"No se pudo enviar el archivo a la impresora. Error: {e}")
            
    else:
        proximo_reinicio = hora_de_inicio_del_contador + timedelta(hours=1)
        tiempo_restante = proximo_reinicio - datetime.now()
        minutos_restantes = int(tiempo_restante.total_seconds() / 60)
        segundos_restantes = int(tiempo_restante.total_seconds() % 60)
        
        print(f"Límite de etiquetas por hora ({LIMITE_ETIQUETAS_POR_HORA}) alcanzado.")
        print(f"El contador se reiniciará en {minutos_restantes} minutos y {segundos_restantes} segundos.")
        
        tk.messagebox.showinfo("Límite Alcanzado",
                               f"Límite de etiquetas por hora ({LIMITE_ETIQUETAS_POR_HORA}) alcanzado.\n\n"
                               f"El contador se reiniciará en {minutos_restantes} minutos y {segundos_restantes} segundos.")

def actualizar_etiqueta_contador():
    etiquetas_restantes = LIMITE_ETIQUETAS_POR_HORA - etiquetas_impresas_en_hora
    contador_label.config(text=f"Etiquetas restantes: {etiquetas_restantes}")

def es_color_oscuro(hex_color):
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    luminancia = (0.299 * r + 0.587 * g + 0.114 * b)
    return luminancia < 128

def limpiar_nombre(etiqueta, tipo):
    prefijos = {
        "SILK": ("S", "SBICOLOR", "STRICOLOR"),
        "PETG": ("P", "TRANSPARENT"),
        "ABS": ("ABS",),
        "ASA": ("ASA",),
        "FC": ("F",),
        "TPU": ("T",)
    }

    reemplazos = {
        "COLORCHANGE": "COLOR CHANGE",
        "FLUORESCENT": "FLUO ",
        "GLITTER": "GLIT ",
        "LIGHT": "LIGHT ",
        "DARK": "DARK ",
        "PASTEL": "PASTEL ",
        "ULTRA": "ULTRA ",
        "APPLEGREEN": "APPLE GREEN",
        "ARMYGREEN": "ARMY GREEN",
        "NAFTASUPER": "NAFTA SUPER",
        "ROSEGOLD": "ROSE GOLD",
        "FUCHSIAGOLDORANGEF": "FUCHSIA GOLD ORANGE F",
        "FUCHSIAGOLD": "FUCHSIA GOLD",
        "GRAPHITEPEARL": "GRAPHITE PEARL",
        "PEARLGOLD": "PEARL GOLD",
        "ORANGEGOLD": "ORANGE GOLD",
        "REDGRAPHITE": "RED GRAPHITE",
        "GOLDPURPLEBLUE": "GOLD PURPLE BLUE",
        "GREENPURPLEBLUE": "GREEN PURPLE BLUE",
        "GREENGOLDFUCHSIA": "GREEN GOLD FUCHSIA",
        "REDGOLDBLUE": "RED GOLD BLUE",
        "REDORANGEGOLD": "RED ORANGE GOLD",
        "BLUEYELLOWFGREEN": "BLUE YELLOW GREEN"
    }

    etiqueta_mostrar = etiqueta
    # Quitar prefijos según el tipo de filamento
    for p in prefijos.get(tipo, []):
        if etiqueta_mostrar.startswith(p):
            etiqueta_mostrar = etiqueta_mostrar[len(p):]
            break

    # Aplicar reemplazos de nombres
    for key, value in reemplazos.items():
        etiqueta_mostrar = etiqueta_mostrar.replace(key, value)
    
    # Capitalizar la primera letra
    etiqueta_mostrar = etiqueta_mostrar.strip().capitalize()
    return etiqueta_mostrar


def actualizar_botones(tipo):
    for w in frame_botones.winfo_children():
        w.destroy()

    colores = colores_por_tipo.get(tipo, {})
    cols = 7

    # SILK agrupar por categorías
    if tipo == "SILK":
        categorias = {
            "Normales": sorted([k for k in colores if k.startswith("S") and not k.startswith("SBICOLOR") and not k.startswith("STRICOLOR")]),
            "Bicolor": sorted([k for k in colores if k.startswith("BICO") or k.startswith("S") and "BICO" in k]),
            "Tricolor": sorted([k for k in colores if k.startswith("STRI")])
        }
        row = 0
        for categoria, claves in categorias.items():
            if claves:
                tk.Label(frame_botones, text=f"── {categoria} ──", fg="white", bg="#2e2e2e", font=("Helvetica", 12, "bold")).grid(row=row, column=0, columnspan=cols, pady=(10, 5))
                row += 1
                for idx, etiqueta in enumerate(claves):
                    r, c = divmod(idx, cols)
                    r += row
                    color_hex = colores[etiqueta]
                    fg = "white" if es_color_oscuro(color_hex) else "black"
                    etiqueta_mostrar = limpiar_nombre(etiqueta, tipo)
                    btn = tk.Button(frame_botones, text=etiqueta_mostrar, bg=color_hex, fg=fg, width=20, height=4, wraplength=140, font=("Arial", 10, "bold"), justify="center", command=lambda e=etiqueta, t=tipo: imprimir_y_guardar_etiqueta_unificada(e, t, e))
                    btn.grid(row=r, column=c, padx=5, pady=5, sticky="nsew")
                row += (len(claves) // cols) + (1 if len(claves) % cols > 0 else 0)
    else:
        # Para el resto de los tipos (PLA, PETG, etc.) se muestran todos juntos
        for idx, (etiqueta, color_hex) in enumerate(colores.items()):
            r, c = divmod(idx, cols)
            fg = "white" if es_color_oscuro(color_hex) else "black"
            etiqueta_mostrar = limpiar_nombre(etiqueta, tipo)
            btn = tk.Button(frame_botones, text=etiqueta_mostrar, bg=color_hex, fg=fg, width=20, height=4, wraplength=140, font=("Arial", 10, "bold"), justify="center", command=lambda e=etiqueta, t=tipo: imprimir_y_guardar_etiqueta_unificada(e, t, e))
            btn.grid(row=r, column=c, padx=5, pady=5, sticky="nsew")

    for i in range(cols):
        frame_botones.columnconfigure(i, weight=1)

root = tk.Tk()
root.title("Impresión de etiquetas Filason")
root.configure(bg="#2e2e2e")
root.overrideredirect(True)
root.geometry(f"{root.winfo_screenwidth()}x{root.winfo_screenheight()}+0+0")
root.lift()
root.focus_force()

cargar_estado_horario()

top_frame = tk.Frame(root, bg="#2e2e2e")
top_frame.pack(side="top", fill="x", padx=10, pady=10)

contador_label = tk.Label(top_frame, text=f"Etiquetas restantes: {LIMITE_ETIQUETAS_POR_HORA - etiquetas_impresas_en_hora}", font=("Arial", 16, "bold"), bg="#2e2e2e", fg="white")
contador_label.pack(side="right", padx=10)

tipo_var = tk.StringVar(value="PLA")
tk.OptionMenu(top_frame, tipo_var, *colores_por_tipo.keys(), command=actualizar_botones).pack(side="left", pady=10)

canvas = tk.Canvas(root, bg="#2e2e2e")
frame_botones = tk.Frame(canvas, bg="#2e2e2e")
frame_botones.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
canvas.create_window((0, 0), window=frame_botones, anchor="nw")

sb = tk.Scrollbar(root, orient="vertical", command=canvas.yview, width=20, bg="#2e2e2e")
canvas.configure(yscrollcommand=sb.set)
canvas.pack(side="left", fill="both", expand=True)
sb.pack(side="right", fill="y")

actualizar_botones(tipo_var.get())
root.mainloop()