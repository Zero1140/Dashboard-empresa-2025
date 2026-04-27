# GameLoader — Diseño Técnico
**Fecha:** 2026-04-26  
**Estado:** Aprobado

---

## Resumen

App de escritorio Windows (Python + PyQt6) que automatiza la carga de juegos a consolas PS3 (con MultiMAN) y Xbox RGH vía FTP en red local. Detecta consolas automáticamente, presenta el catálogo de juegos desde el HDD local, y transfiere los juegos seleccionados en cola sin intervención del usuario. Soporta múltiples consolas simultáneas (cada una en su propio hilo).

---

## Contexto del problema

El operador tiene un HDD con juegos organizados por consola (`PS3\`, `Xbox\`). Los clientes dejan sus consolas, indican qué juegos quieren, y el operador transfería manualmente via FileZilla. El proceso requería atención constante. Se necesita automatizar la selección y transferencia completa.

---

## Arquitectura

```
GameLoader (PyQt6 App)
├── scanner.py       → escanea subred local, detecta FTP abierto (puerto 21)
├── detector.py      → identifica tipo de consola y obtiene identificador
├── catalog.py       → lee HDD local y construye catálogo de juegos por tipo
├── queue_manager.py → gestiona colas por consola
├── ftp_worker.py    → Qt Worker Thread con señales de progreso
├── main_window.py   → UI principal (PyQt6)
└── tray.py          → ícono en bandeja del sistema + notificaciones
```

---

## Módulos

### Pre-requisitos en consola
- **PS3:** MultiMAN debe estar corriendo para que el servidor FTP esté activo
- **Xbox:** El dashboard RGH (Freestyle/Aurora) debe estar abierto con FTP habilitado

### scanner.py — Detección de red
- Escanea la subred del adaptador de red activo (ej: `192.168.1.0/24`)
- Busca dispositivos con **puerto 21 abierto** (socket connect timeout 1s)
- Corre en hilo separado para no bloquear la UI
- Se ejecuta al iniciar la app y cada 30 segundos automáticamente
- También disponible con botón "Buscar consolas"

### detector.py — Identificación de consola
Por cada IP con puerto 21 abierto:
1. Intenta FTP login **anónimo** → si directorio raíz contiene `dev_hdd0` → **PS3 con MultiMAN**
2. Intenta FTP login **xbox / xbox** → si directorio raíz contiene `Hdd1:` → **Xbox RGH**
3. Si ninguno funciona → ignorar (puede ser otro dispositivo de red)

**Identificador:** `PS3-{último octeto IP}` o `Xbox-{último octeto IP}` (ej: `PS3-105`).  
El usuario puede renombrarlo con el nombre del cliente desde la UI.

### catalog.py — Catálogo de juegos
- Lee recursivamente las carpetas configuradas:
  - `RUTA_HDD\PS3\` → lista de subcarpetas = juegos PS3
  - `RUTA_HDD\Xbox\` → lista de subcarpetas = juegos Xbox
- Devuelve lista con nombre y ruta local de cada juego
- La ruta del HDD es configurable (primer arranque pide seleccionar carpeta raíz)

### queue_manager.py — Cola por consola
- Diccionario `{console_id: Queue}`
- Cada cola contiene objetos `TransferJob(game_name, local_path, remote_path)`
- Permite agregar juegos a cola, cancelar cola, ver estado

### ftp_worker.py — Transferencia FTP
- Extiende `QThread`, emite señales Qt:
  - `progress(console_id, game_name, bytes_sent, total_bytes)`
  - `job_done(console_id, game_name, success)`
  - `queue_done(console_id)`
- Un worker por consola detectada (paralelo real entre consolas)
- Transfiere **un juego a la vez** por consola (FTP de MultiMAN y Xbox no soportan concurrencia)
- En caso de error en un juego: lo marca como fallido, continúa con el siguiente
- Usa `ftplib.FTP` con `storbinary()` para transferencia binaria
- Transferencia de carpetas: itera recursivamente, crea subdirectorios en destino con `mkd()`

**Rutas destino:**
| Consola | Ruta remota |
|---------|-------------|
| PS3 (MultiMAN) | `/dev_hdd0/GAMES/{nombre_juego}/` |
| Xbox RGH | `Hdd1:\Games\{nombre_juego}\` |

### main_window.py — Interfaz principal
Layout de tres paneles:

```
┌─────────────────────────────────────────────────┐
│  🎮 GameLoader                   [_][□][X]      │
├──────────────────┬──────────────────────────────┤
│ CONSOLAS         │ CATÁLOGO  [🔍 Buscar...]      │
│                  │                               │
│ 🟢 PS3-105       │ ☑ God of War 3               │
│    [Seleccionar] │ ☑ GTA V                       │
│                  │ ☐ Red Dead Redemption         │
│ 🟢 Xbox-110      │ ☑ The Last of Us              │
│    [Seleccionar] │                               │
│                  │      [▶ Cargar a PS3-105]     │
├──────────────────┴──────────────────────────────┤
│ PROGRESO                                         │
│ PS3-105  │ God of War 3   ████████░░ 75%  2.1GB │
│ Xbox-110 │ GTA V          ███░░░░░░░ 30%  4.2GB │
└─────────────────────────────────────────────────┘
```

- Panel izquierdo: consolas detectadas, estado (verde/gris/error), botón renombrar
- Panel derecho: catálogo filtrado por tipo de consola seleccionada, búsqueda, checkboxes
- Panel inferior: progreso en tiempo real por consola, nombre del juego actual, % y bytes
- Al cerrar ventana: minimiza a bandeja (no cierra la app ni detiene transferencias)

### tray.py — Bandeja del sistema
- Ícono en system tray de Windows
- Menú contextual: Abrir, Pausar todo, Salir
- Notificación nativa Windows al completar cada cola: `"PS3-105: ¡Carga completa! 5 juegos cargados"`
- Opción de inicio automático con Windows (clave de registro `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`)

---

## Configuración

Archivo `config.json` en el directorio de la app:
```json
{
  "hdd_root": "D:\\Juegos",
  "ps3_remote_path": "/dev_hdd0/GAMES/",
  "xbox_remote_path": "Hdd1:\\Games\\",
  "scan_interval_seconds": 30,
  "autostart_windows": false
}
```

Primera vez que abre la app: wizard simple para seleccionar la carpeta raíz del HDD.

---

## Manejo de errores

| Situación | Comportamiento |
|-----------|----------------|
| Consola se desconecta durante transferencia | Marca job como fallido, muestra error en UI, continúa cola |
| Juego ya existe en consola | Salta automáticamente (configurable: sobreescribir) |
| Carpeta de juego vacía en HDD | No aparece en catálogo |
| IP no responde al FTP | No aparece en lista de consolas |
| Error de disco lleno en consola | Detiene la cola de esa consola, notificación de error |

---

## Stack técnico

| Componente | Tecnología |
|------------|------------|
| Lenguaje | Python 3.11+ |
| UI | PyQt6 |
| FTP | `ftplib` (stdlib) |
| Threading | `QThread` + señales Qt |
| Network scan | `socket` (stdlib) |
| Empaquetado | PyInstaller → `.exe` único |
| Config | `json` (stdlib) |

Sin dependencias externas salvo PyQt6 y PyInstaller.

---

## Distribución

- `pyinstaller --onefile --windowed --icon=gameloader.ico main.py`
- Genera `GameLoader.exe` portable, sin necesidad de instalar Python
