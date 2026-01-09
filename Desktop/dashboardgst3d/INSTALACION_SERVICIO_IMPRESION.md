# Instalación del Servicio de Impresión en la Computadora Local

## 📋 Requisitos Previos

- ✅ Computadora con Linux (o Windows con WSL)
- ✅ Python 3.7 o superior instalado
- ✅ Impresora Zebra configurada en CUPS
- ✅ Archivos .prn ubicados en `/home/gst3d/etiquetas`
- ✅ Conexión a Internet (para conectar con Supabase)

---

## 🔧 Paso 1: Copiar los Archivos Necesarios

### Opción A: Desde GitHub (si subiste el script)

Si subiste el script a GitHub:
```bash
git clone <tu-repositorio>
# O descarga los archivos necesarios
```

### Opción B: Copiar Manualmente

Necesitas copiar estos archivos a la computadora donde está la impresora:

1. `imprimir_etiquetas_servicio.py` → Copiar a `/home/gst3d/`
2. `requirements_impresion.txt` → Copiar a `/home/gst3d/`

**Ubicación recomendada:**
```bash
/home/gst3d/
├── imprimir_etiquetas_servicio.py
├── requirements_impresion.txt
└── etiquetas/           # Carpeta con archivos .prn
    ├── BLACK.prn
    ├── RED.prn
    └── ...
```

---

## 🐍 Paso 2: Instalar Python y Dependencias

### 2.1. Verificar Python

```bash
python3 --version
```

Debe mostrar Python 3.7 o superior.

### 2.2. Instalar pip (si no está instalado)

```bash
sudo apt update
sudo apt install python3-pip
```

### 2.3. Instalar Dependencias

```bash
cd /home/gst3d
pip3 install -r requirements_impresion.txt
```

O instalar manualmente:

```bash
pip3 install supabase python-dotenv
```

**Nota**: Si prefieres usar un entorno virtual (recomendado):

```bash
cd /home/gst3d
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_impresion.txt
```

---

## ⚙️ Paso 3: Configurar Variables de Entorno

### Opción A: Variables de Sistema (Recomendado)

Edita el archivo `~/.bashrc` o `~/.profile`:

```bash
nano ~/.bashrc
```

Agrega al final:

```bash
export SUPABASE_URL="https://rybokbjrbugvggprnith.supabase.co"
export SUPABASE_KEY="sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"
```

Luego recarga:

```bash
source ~/.bashrc
```

### Opción B: Archivo .env (Alternativa)

Crea un archivo `.env` en `/home/gst3d/`:

```bash
cd /home/gst3d
nano .env
```

Agrega:

```env
SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co
SUPABASE_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

Guarda y cierra (Ctrl+X, luego Y, luego Enter).

### Opción C: Editar el Script Directamente

Si prefieres, puedes editar directamente `imprimir_etiquetas_servicio.py` y cambiar las líneas 22-23:

```python
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://rybokbjrbugvggprnith.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_")
```

---

## 🖨️ Paso 4: Verificar Configuración de Impresora

### 4.1. Verificar que la Impresora esté Configurada

```bash
lpstat -p
```

Debes ver tu impresora Zebra listada. Si no aparece, configúrala primero con CUPS.

### 4.2. Verificar el Nombre de la Impresora

```bash
lpstat -p -d
```

Busca el nombre exacto de tu impresora Zebra. Por ejemplo: `Zebra_ZD420-203dpi`

### 4.3. Ajustar el Nombre en el Script (si es necesario)

Edita `imprimir_etiquetas_servicio.py` y cambia la línea 27:

```python
NOMBRE_IMPRESORA = "TU_NOMBRE_IMPRESORA_AQUI"  # Cambiar si es diferente
```

---

## 📁 Paso 5: Verificar Archivos .prn

### 5.1. Verificar que Existe la Carpeta

```bash
ls -la /home/gst3d/etiquetas
```

Debes ver los archivos `.prn` allí.

### 5.2. Verificar Permisos

```bash
chmod +r /home/gst3d/etiquetas/*.prn
```

### 5.3. Ajustar Ruta en el Script (si es necesario)

Si tus archivos están en otra ubicación, edita la línea 26:

```python
RUTA_PRN = "/ruta/a/tus/archivos/etiquetas"  # Cambiar si es diferente
```

---

## 🧪 Paso 6: Probar el Script Manualmente

### 6.1. Hacer el Script Ejecutable

```bash
chmod +x /home/gst3d/imprimir_etiquetas_servicio.py
```

### 6.2. Ejecutar una Prueba

```bash
cd /home/gst3d
python3 imprimir_etiquetas_servicio.py
```

Deberías ver:

```
============================================================
🚀 Servicio de Impresión de Etiquetas GST3D
============================================================
Supabase URL: https://rybokbjrbugvggprnith.supabase.co
Ruta plantillas: /home/gst3d/etiquetas
Impresora: Zebra_ZD420-203dpi
Intervalo de polling: 5 segundos
============================================================
✅ Conexión a Supabase establecida

🔄 Iniciando bucle de polling (cada 5 segundos)...
   Presiona Ctrl+C para detener

⏳ No hay impresiones pendientes... (HH:MM:SS)
```

Si ves errores, revísalos antes de continuar.

**Para detener:** Presiona `Ctrl+C`

---

## 🚀 Paso 7: Configurar como Servicio (systemd)

Para que el servicio se ejecute automáticamente al iniciar la computadora:

### 7.1. Crear Archivo de Servicio

```bash
sudo nano /etc/systemd/system/imprimir-etiquetas.service
```

Copia y pega esto (ajusta las rutas y usuario según tu sistema):

```ini
[Unit]
Description=Servicio de Impresión de Etiquetas GST3D
After=network.target

[Service]
Type=simple
User=gst3d
WorkingDirectory=/home/gst3d
Environment="SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co"
Environment="SUPABASE_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"
ExecStart=/usr/bin/python3 /home/gst3d/imprimir_etiquetas_servicio.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Importante**: Cambia `User=gst3d` por tu usuario de Linux.

Si usas un entorno virtual, cambia `ExecStart` a:

```ini
ExecStart=/home/gst3d/venv/bin/python3 /home/gst3d/imprimir_etiquetas_servicio.py
```

### 7.2. Habilitar y Iniciar el Servicio

```bash
# Recargar configuración de systemd
sudo systemctl daemon-reload

# Habilitar para que inicie automáticamente al arrancar
sudo systemctl enable imprimir-etiquetas.service

# Iniciar el servicio ahora
sudo systemctl start imprimir-etiquetas.service

# Verificar estado
sudo systemctl status imprimir-etiquetas.service
```

Deberías ver `active (running)` en verde.

### 7.3. Ver Logs del Servicio

```bash
# Ver logs en tiempo real
sudo journalctl -u imprimir-etiquetas.service -f

# Ver últimos 50 líneas
sudo journalctl -u imprimir-etiquetas.service -n 50
```

### 7.4. Comandos Útiles del Servicio

```bash
# Detener el servicio
sudo systemctl stop imprimir-etiquetas.service

# Reiniciar el servicio
sudo systemctl restart imprimir-etiquetas.service

# Ver estado
sudo systemctl status imprimir-etiquetas.service

# Deshabilitar inicio automático
sudo systemctl disable imprimir-etiquetas.service
```

---

## 🎯 Paso 8: Verificar que Funciona End-to-End

### 8.1. Hacer una Impresión desde la Web

1. Ve a: https://dashboard-empresa-2025.onrender.com/
2. Selecciona una máquina
3. Selecciona materiales y colores
4. Haz clic en **"Imprimir Etiquetas"**

### 8.2. Verificar en Supabase

1. Ve a Supabase Dashboard > Table Editor > impresiones
2. Deberías ver la impresión con `estado = 'pendiente'`

### 8.3. Verificar en el Servicio Python

Revisa los logs:

```bash
sudo journalctl -u imprimir-etiquetas.service -f
```

Deberías ver algo como:

```
📋 Encontradas 1 impresión(es) pendiente(s)

🖨️  Procesando impresión 1_1234567890_0.123
   Máquina: 1 | Operador: Juan
   Material: PLA
   Chicas: 8 x BLACK
   Grandes: 8 x BLACK_GRANDE
✅ Impresas 8/8 etiquetas chicas de PLA - BLACK
✅ Impresas 8/8 etiquetas grandes de PLA - BLACK_GRANDE
✅ Estado actualizado a: impresa
```

### 8.4. Verificar en Supabase Nuevamente

1. Ve a Supabase > Table Editor > impresiones
2. El estado debería haber cambiado a `'impresa'` ✅

### 8.5. Verificar que se Imprimió Físicamente

- ✅ Las etiquetas deberían haber salido de la impresora

---

## 🐛 Solución de Problemas

### ❌ Error: "No se encontró el archivo de plantilla"

**Solución:**
1. Verifica que los archivos `.prn` estén en `/home/gst3d/etiquetas`
2. Verifica que los nombres coincidan con los colores del sistema web
3. Revisa los logs para ver qué nombre está buscando

### ❌ Error: "Error al conectar con Supabase"

**Solución:**
1. Verifica las credenciales de Supabase
2. Verifica la conexión a internet: `ping google.com`
3. Verifica que las variables de entorno estén configuradas

### ❌ Error: "Error al imprimir" o "lp: Unable to print file"

**Solución:**
1. Verifica que la impresora esté configurada: `lpstat -p`
2. Prueba imprimir manualmente: `echo "test" | lp -d Zebra_ZD420-203dpi`
3. Verifica que el nombre de la impresora sea correcto en el script

### ❌ El servicio no inicia

**Solución:**
1. Verifica los logs: `sudo journalctl -u imprimir-etiquetas.service -n 50`
2. Verifica que Python esté en la ruta correcta: `which python3`
3. Verifica permisos: `ls -la /home/gst3d/imprimir_etiquetas_servicio.py`

### ❌ El servicio no encuentra impresiones pendientes

**Solución:**
1. Verifica que el campo `estado` esté agregado a la tabla `impresiones` en Supabase
2. Verifica que las impresiones se guarden con `estado='pendiente'` desde la web
3. Revisa los logs para ver errores de conexión

---

## ✅ Checklist de Instalación

- [ ] Archivos copiados a `/home/gst3d/`
- [ ] Python 3.7+ instalado y funcionando
- [ ] Dependencias instaladas (`pip3 install supabase python-dotenv`)
- [ ] Variables de entorno configuradas
- [ ] Impresora verificada con `lpstat -p`
- [ ] Archivos `.prn` verificados en `/home/gst3d/etiquetas`
- [ ] Script probado manualmente (funciona sin errores)
- [ ] Servicio systemd creado y habilitado
- [ ] Servicio iniciado y corriendo
- [ ] Prueba end-to-end exitosa (imprimir desde web → se imprime físicamente)

---

## 📝 Notas Importantes

- **El servicio consulta Supabase cada 5 segundos** (configurable en el script)
- **El límite es de 100 etiquetas por hora** (configurable en el script)
- **Los logs se guardan en** `/home/gst3d/etiquetas_log.json`
- **Los contadores se guardan en** `/home/gst3d/estado_contador.txt` y `/home/gst3d/contador_id_numero.txt`

---

## 🎉 ¡Listo!

Una vez completado todo, el sistema funcionará así:

1. Usuario hace clic en "Imprimir" en la web
2. Se guarda en Supabase con `estado='pendiente'`
3. El servicio Python lo detecta (en menos de 5 segundos)
4. Imprime las etiquetas físicamente
5. Actualiza el estado a `'impresa'` en Supabase

**¡El sistema está completo y funcionando!** 🚀






