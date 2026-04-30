# GameLoader — Automatización v2: webMAN MOD + HEN Guide

**Fecha:** 2026-04-30
**Rama:** feat/conectores-reales
**Objetivo:** Maximizar la automatización del flujo PS3. La app detecta si webMAN MOD está corriendo y aprovecha su HTTP API. Si solo hay MultiMAN, degrada graciosamente a modo FTP. Cuando HEN no está activo, guía al usuario paso a paso con un servidor local de activación y espera hasta que la consola esté lista.

---

## Alcance

| Incluido | Excluido |
|----------|----------|
| Módulo `webman.py` con HTTP API | Soporte Xbox (sin cambios) |
| Auto-detección webMAN vs MultiMAN | UI de temperatura / sistema |
| Refresh XMB automático post-transferencia | Wake-on-LAN |
| Notificación en PS3 al terminar | Instalación remota de PKGs |
| Diálogo guía de activación HEN | Bundling de archivos exploit |
| Servidor HTTP local para exploit | |
| Polling automático hasta HEN activo | |

---

## Arquitectura

### Nuevos archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `gameloader/webman.py` | Cliente HTTP para webMAN MOD. Expone `WebManClient`. |
| `gameloader/hen_guide_dialog.py` | Diálogo paso a paso para activar HEN. Incluye servidor local y polling. |
| `gameloader/tests/test_webman.py` | Tests unitarios de `WebManClient` (mock HTTP). |

### Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `gameloader/detector.py` | `detect_console()` agrega probe HTTP al port 80. `ConsoleInfo` gana campo `webman: bool`. |
| `gameloader/models.py` | `ConsoleInfo.webman: bool = False` |
| `gameloader/main_window.py` | Badge "WM" en consola webMAN. Llama refresh + notify post-transferencia. Muestra `HenGuideDialog` si HEN no está activo. `__init__` agrega `self._webman_post_workers: Dict[str, QThread] = {}`. |
| `gameloader/ftp_worker.py` | Sin cambios en lógica FTP. |
| `gameloader/tests/test_ftp_worker.py` | Sin cambios. |

---

## Módulo `webman.py`

```python
class WebManClient:
    BASE_TIMEOUT = 3.0   # segundos

    def __init__(self, ip: str, timeout: float = BASE_TIMEOUT)
    def is_available(self) -> bool          # GET / → True si responde en < timeout
    def get_fw_type(self) -> str | None     # "HEN", "CFW", None si falla
    def is_hen_active(self) -> bool         # get_fw_type() == "HEN"
    def refresh_xmb(self) -> bool           # GET /refresh.ps3
    def notify(self, msg: str) -> bool      # GET /notify.ps3?<msg urlencoded>
```

**Endpoints reales:**
- `GET http://<ip>/ps3mapi.ps3?PS3+GETFWTYPE` → JSON `{"type": "HEN"}` o `{"type": "CFW"}`
- `GET http://<ip>/refresh.ps3` → 200 OK
- `GET http://<ip>/notify.ps3?Juegos%20cargados!` → 200 OK

**Reglas:**
- Todos los métodos capturan `requests.RequestException` y devuelven `False` / `None` — nunca lanzan.
- `timeout=3.0` en cada request. No bloquear el hilo principal.
- Los métodos se llaman desde `QThread` (workers), nunca desde el hilo GUI directamente.

**Dependencia:** `requests` (ya en `requirements.txt` de la mayoría de proyectos Python; si no, se agrega).

---

## Auto-detección de modo en `detector.py`

`detect_console(ip)` ya existe. Se extiende:

1. Conectar FTP port 21 → si falla, retorna `None` (sin consola).
2. Si FTP OK → crear `WebManClient(ip)` y llamar `is_available()`.
3. Poblar `ConsoleInfo.webman = True/False`.
4. Retornar `ConsoleInfo`.

El campo `webman` se usa en toda la app para saber qué funciones están disponibles.

---

## Badge en lista de consolas

En `_update_console_item_state` y `_console_label`:
- Si `console.webman == True` → label incluye badge `[WM]` en color verde `#28d860`.
- Si `False` → label sin badge (comportamiento actual).

---

## Post-transferencia automática

En `_on_queue_done` (después de finalizar la cola), al final del método:

```python
if success_count > 0:
    console = self.consoles.get(console_id)
    if console and console.webman:
        worker = WebManPostWorker(console.ip, success_count)
        worker.start()
        self._webman_post_workers[console_id] = worker
```

`WebManPostWorker(QThread)`:
1. Llama `WebManClient.refresh_xmb()`.
2. Llama `WebManClient.notify(f"{success_count} juego(s) cargado(s) correctamente")`.
3. Emite `done` signal (no actualiza UI directamente).
4. Al terminar, `main_window` conecta `worker.finished` a `lambda: self._webman_post_workers.pop(console_id, None)` para limpiar la referencia.

---

## Verificación HEN y diálogo de activación

### Cuándo mostrar el diálogo

En `_preflight_ok(console)` (ya existe, bloquea la transferencia si algo falla):

```python
if not self._hen_ok(console):
    dlg = HenGuideDialog(console.ip, console.webman, self)
    dlg.exec()
    return self._hen_ok(console)   # re-verificar después del diálogo
```

`_hen_ok(console)` → nuevo método privado:
- Si `console.webman`: usa `WebManClient.is_hen_active()`.
- Si no: usa el FTP probe existente a `/dev_hdd0/packages/`.

### `HenGuideDialog`

Diálogo modal con dos fases:

**Fase 1 — Instrucciones:**
- Muestra los 3 pasos para activar HEN:
  1. En la PS3: abrí el **Explorador de Internet** (navegador web de la PS3).
  2. Navegá a la dirección que muestra la app (IP de la PC + port 8080, ej: `http://192.168.1.10:8080`).
  3. Seguí las instrucciones en pantalla de la PS3 hasta que aparezca "HEN installed".
- La app muestra la IP detectada automáticamente (via `socket` stdlib).
- Botón "Iniciar servidor" → inicia `HenServerThread`.
- La IP local de la PC se detecta automáticamente con `socket.getsockname()`.

> **Nota sobre el servidor local:** `HenServerThread` sirve una página `index.html` que redirige al browser de la PS3 hacia la URL pública del exploit (`ps3xploit.me`). No se distribuyen archivos del exploit — solo el redirect HTML. Si el usuario no tiene internet en la PS3, la app muestra la URL pública para que la tipee directamente.

**Fase 2 — Esperando:**
- Muestra spinner + "Esperando que HEN esté activo..."
- `HenPoller(QTimer, 5s)` llama `_hen_ok()` repetidamente.
- Cuando detecta HEN activo → muestra "✓ HEN activo. Ya podés cargar juegos." y habilita el botón "Continuar".
- Si el usuario cierra el diálogo antes → la transferencia no arranca (el `_preflight_ok` retorna False).

### `HenServerThread(QThread)`

- Levanta `http.server.HTTPServer` en `0.0.0.0:8080`.
- Sirve un `index.html` que redirige al exploit oficial en `https://ps3xploit.me/hen/ps3hen.html` (no bundlea archivos, usa redirect para evitar distribución de exploits).
- Se detiene cuando el diálogo se cierra.

---

## Flujo completo actualizado

```
Consola detectada (webMAN=True/False)
    ↓
Usuario selecciona juegos → staging
    ↓
Clic "Transferir"
    ↓
_preflight_ok():
    ├─ HEN activo? → Sí → continuar
    └─ No → HenGuideDialog → servidor local + polling
              ↓ HEN detectado
              continuar
    ↓
Verificar espacio libre (ya existente)
    ↓
FTPWorker transfiere (ISO/PKG/FOLDER/ISO_SET → paths correctos)
    ↓
_on_queue_done():
    ├─ Si webMAN: WebManPostWorker → refresh_xmb() + notify()
    ├─ Si PKGs: PkgGuideDialog (ya existente)
    └─ Status bar: resumen de éxitos/fallos
```

---

## Tests

### `test_webman.py` (nuevo)

| Test | Qué verifica |
|------|-------------|
| `test_is_available_true` | Retorna `True` cuando HTTP responde 200 |
| `test_is_available_false` | Retorna `False` en timeout / connection error |
| `test_get_fw_type_hen` | Parsea JSON `{"type":"HEN"}` correctamente |
| `test_get_fw_type_cfw` | Parsea `{"type":"CFW"}` |
| `test_get_fw_type_error` | Retorna `None` si el request falla |
| `test_refresh_xmb_ok` | Retorna `True` en 200 OK |
| `test_refresh_xmb_error` | Retorna `False` si falla sin lanzar |
| `test_notify_encodes_message` | URL-encodea el mensaje correctamente |

### `test_detector.py` (extensión)

| Test | Qué verifica |
|------|-------------|
| `test_webman_flag_true_when_port80_responds` | `ConsoleInfo.webman=True` si HTTP responde |
| `test_webman_flag_false_when_port80_fails` | `ConsoleInfo.webman=False` si solo FTP |

---

## Dependencias nuevas

| Paquete | Motivo | Ya presente |
|---------|--------|------------|
| `requests` | HTTP calls a webMAN | Probablemente no — agregar a `requirements.txt` |
| `http.server` | Servidor local HEN | Stdlib — sin instalar |
| `socket` | Detectar IP local de la PC | Stdlib — sin instalar |

---

## Qué NO cambia

- Lógica FTP (`ftp_worker.py`) — sin tocar.
- Detección de formato (`format_detector.py`) — sin tocar.
- Catálogo, staging, queue manager — sin tocar.
- Flujo Xbox — sin tocar.
- 60 tests existentes deben seguir en verde.

---

## Lo que no se puede automatizar (informe permanente)

| Acción | Por qué no | Qué hace la app |
|--------|-----------|----------------|
| Activar HEN | Exploit corre en WebKit de la PS3; ningún proceso externo puede iniciarlo | Servidor local + guía paso a paso + polling |
| Instalar PKGs | Requiere interacción física en XMB | Guía paso a paso post-transferencia |
| Encender la PS3 | No hay wake-on-LAN en PS3 (salvo excepciones de hardware) | Nada — fuera de alcance |
| Abrir MultiMAN/webMAN | Requiere input en el control de la PS3 | Nada — fuera de alcance |
