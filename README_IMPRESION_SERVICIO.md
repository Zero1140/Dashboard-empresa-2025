# Servicio de Impresión de Etiquetas GST3D

Este servicio conecta la aplicación web con la impresora física de etiquetas Zebra. Lee las impresiones pendientes de Supabase y las imprime automáticamente.

## 📋 Requisitos Previos

1. **Python 3.7+** instalado
2. **Conexión a Supabase** (configurada)
3. **Impresora Zebra** configurada en CUPS con nombre `Zebra_ZD420-203dpi`
4. **Archivos .prn** ubicados en `/home/gst3d/etiquetas`
5. **Permisos** para ejecutar `lp` (comando de CUPS)

## 🔧 Instalación

### 1. Instalar dependencias

```bash
pip install -r requirements_impresion.txt
```

O manualmente:

```bash
pip install supabase python-dotenv
```

### 2. Configurar variables de entorno

Crea un archivo `.env` en la misma carpeta que el script (opcional, o usa variables de sistema):

```env
SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co
SUPABASE_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

O configúralas como variables de sistema:

```bash
export SUPABASE_URL="https://rybokbjrbugvggprnith.supabase.co"
export SUPABASE_KEY="sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"
```

### 3. Actualizar esquema de Supabase

Ejecuta el script SQL para agregar el campo `estado`:

1. Abre el SQL Editor en Supabase Dashboard
2. Ejecuta el contenido de `web/supabase-add-estado.sql`

```sql
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'impresa', 'error'));

CREATE INDEX IF NOT EXISTS idx_impresiones_estado ON impresiones(estado) WHERE estado = 'pendiente';

UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;
```

### 4. Verificar estructura de archivos .prn

El servicio busca archivos `.prn` en `/home/gst3d/etiquetas` con los siguientes nombres:

- **Etiquetas chicas**: `{COLOR}.prn` (ej: `BLACK.prn`, `RED.prn`)
- **Etiquetas grandes**: `{COLOR}_GRANDE.prn` o `{COLOR}.prn` (ej: `BLACK_GRANDE.prn`)

Los nombres de colores deben coincidir con los del sistema web (ver `web/app/data.ts`).

## 🚀 Ejecución

### Ejecución manual

```bash
python3 imprimir_etiquetas_servicio.py
```

### Ejecución como servicio (Linux - systemd)

1. Crear archivo de servicio `/etc/systemd/system/imprimir-etiquetas.service`:

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

[Install]
WantedBy=multi-user.target
```

2. Habilitar y iniciar el servicio:

```bash
sudo systemctl daemon-reload
sudo systemctl enable imprimir-etiquetas.service
sudo systemctl start imprimir-etiquetas.service
```

3. Ver logs:

```bash
sudo journalctl -u imprimir-etiquetas.service -f
```

### Ejecución con screen/tmux (alternativa simple)

```bash
# Con screen
screen -S impresion
python3 imprimir_etiquetas_servicio.py
# Presiona Ctrl+A luego D para desacoplar

# Volver a la sesión
screen -r impresion
```

## 📊 Funcionamiento

1. **El servicio consulta Supabase** cada 5 segundos (configurable)
2. **Busca impresiones con `estado = 'pendiente'`**
3. **Imprime las etiquetas** (chicas y grandes) según las cantidades especificadas
4. **Actualiza el estado** a `'impresa'` o `'error'` según el resultado

### Flujo de datos

```
Web App (Render)
    ↓
    Guarda impresión con estado='pendiente' en Supabase
    ↓
Servicio Python (local)
    ↓
    Lee impresiones pendientes de Supabase
    ↓
    Imprime físicamente con lp (CUPS)
    ↓
    Actualiza estado a 'impresa' en Supabase
```

## ⚙️ Configuración

Edita las constantes al inicio de `imprimir_etiquetas_servicio.py`:

```python
# Configuración de Supabase
SUPABASE_URL = "https://..."
SUPABASE_KEY = "sb_publishable_..."

# Configuración de impresora
RUTA_PRN = "/home/gst3d/etiquetas"
NOMBRE_IMPRESORA = "Zebra_ZD420-203dpi"
ID_MAQUINA = "02"

# Intervalo de polling (segundos)
INTERVALO_POLLING = 5

# Límite de etiquetas por hora
LIMITE_ETIQUETAS_POR_HORA = 100
```

## 🔍 Mapeo de Colores

El sistema mapea automáticamente los colores del sistema web a los archivos `.prn`:

- **Etiquetas chicas**: `{COLOR}.prn`
  - Ejemplo: `BLACK` → `BLACK.prn`
  - Ejemplo: `RED` → `RED.prn`

- **Etiquetas grandes**: `{COLOR}_GRANDE.prn` o `{COLOR}.prn`
  - Ejemplo: `BLACK_GRANDE` → `BLACK_GRANDE.prn` o `BLACK.prn`
  - Ejemplo: `RED_GRANDE` → `RED_GRANDE.prn` o `RED.prn`

## 🐛 Solución de Problemas

### Error: "No se encontró el archivo de plantilla"

- Verifica que los archivos `.prn` existan en `/home/gst3d/etiquetas`
- Verifica que los nombres coincidan con los colores del sistema web
- Revisa los logs para ver qué nombre está buscando

### Error: "Error al conectar con Supabase"

- Verifica las credenciales de Supabase
- Verifica la conexión a internet
- Revisa que las variables de entorno estén configuradas

### Error: "Error al imprimir"

- Verifica que la impresora esté configurada en CUPS: `lpstat -p`
- Verifica que el nombre de la impresora sea correcto
- Prueba imprimir manualmente: `echo "test" | lp -d Zebra_ZD420-203dpi`

### El servicio no encuentra impresiones pendientes

- Verifica que el campo `estado` esté agregado a la tabla `impresiones`
- Verifica que las impresiones se guarden con `estado='pendiente'` desde la web
- Revisa los logs del servicio para ver errores de conexión

## 📝 Logs

Los logs se guardan en:
- **Consola**: Salida estándar (stdout)
- **Archivo local**: `/home/gst3d/etiquetas_log.json` (historial de impresiones)
- **systemd**: `journalctl -u imprimir-etiquetas.service`

## 🔐 Seguridad

- El servicio usa la clave pública (anon key) de Supabase, que es segura para lectura/escritura con las políticas RLS configuradas
- Los archivos `.prn` deben tener permisos de lectura adecuados
- Considera usar un usuario específico para ejecutar el servicio (no root)

## 📞 Soporte

Para problemas o preguntas:
1. Revisa los logs del servicio
2. Verifica la configuración de Supabase
3. Verifica que la impresora funcione correctamente






