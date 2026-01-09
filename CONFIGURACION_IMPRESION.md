# Configuración del Sistema de Impresión de Etiquetas

## 📋 Resumen

Se ha implementado un sistema completo que conecta la aplicación web con la impresora física de etiquetas Zebra usando Supabase como intermediario.

## 🔄 Flujo del Sistema

```
1. Usuario hace clic en "Imprimir Etiquetas" en la web
   ↓
2. Web guarda impresión en Supabase con estado='pendiente'
   ↓
3. Servicio Python (ejecutándose localmente) consulta Supabase cada 5 segundos
   ↓
4. Servicio encuentra impresiones pendientes y las imprime físicamente
   ↓
5. Servicio actualiza estado a 'impresa' o 'error' en Supabase
```

## ✅ Cambios Realizados

### 1. Base de Datos (Supabase)

**Archivo**: `web/supabase-add-estado.sql`

- ✅ Agregado campo `estado` a la tabla `impresiones`
- ✅ Valores posibles: `'pendiente'`, `'impresa'`, `'error'`
- ✅ Índice creado para optimizar consultas de impresiones pendientes
- ✅ Impresiones existentes marcadas como `'impresa'`

**Pasos para aplicar:**
1. Abre Supabase Dashboard > SQL Editor
2. Ejecuta el contenido de `web/supabase-add-estado.sql`

### 2. Aplicación Web

**Archivos modificados:**
- `web/app/types.ts`: Agregado campo `estado?` a `ImpresionEtiqueta`
- `web/app/utils/storage.ts`: 
  - `guardarImpresion()` ahora guarda con `estado='pendiente'`
  - Funciones de lectura incluyen el campo `estado`

**Comportamiento:**
- Cuando se hace clic en "Imprimir Etiquetas", se guarda con `estado='pendiente'`
- El servicio Python detecta estas impresiones y las imprime
- El estado se actualiza automáticamente a `'impresa'` o `'error'`

### 3. Servicio Python de Impresión

**Archivos creados:**
- `imprimir_etiquetas_servicio.py`: Servicio principal
- `requirements_impresion.txt`: Dependencias Python
- `start-impresion-service.sh`: Script de inicio (Linux)
- `README_IMPRESION_SERVICIO.md`: Documentación completa

**Características:**
- ✅ Lee impresiones pendientes de Supabase cada 5 segundos
- ✅ Imprime etiquetas chicas y grandes según las cantidades especificadas
- ✅ Maneja límite de 100 etiquetas por hora
- ✅ Mapea automáticamente colores del sistema web a archivos .prn
- ✅ Actualiza estado en Supabase después de imprimir
- ✅ Logs detallados de todas las operaciones
- ✅ Manejo robusto de errores

## 🚀 Pasos para Configurar

### Paso 1: Actualizar Base de Datos

```sql
-- Ejecutar en Supabase SQL Editor
ALTER TABLE impresiones 
ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente' 
CHECK (estado IN ('pendiente', 'impresa', 'error'));

CREATE INDEX IF NOT EXISTS idx_impresiones_estado 
ON impresiones(estado) WHERE estado = 'pendiente';

UPDATE impresiones SET estado = 'impresa' WHERE estado IS NULL;
```

### Paso 2: Instalar Dependencias Python

En la máquina donde está la impresora:

```bash
pip3 install supabase python-dotenv
```

O usando el archivo de requisitos:

```bash
pip3 install -r requirements_impresion.txt
```

### Paso 3: Configurar Variables de Entorno

```bash
export SUPABASE_URL="https://rybokbjrbugvggprnith.supabase.co"
export SUPABASE_KEY="sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_"
```

O crear archivo `.env`:

```env
SUPABASE_URL=https://rybokbjrbugvggprnith.supabase.co
SUPABASE_KEY=sb_publishable_VAI_JWRKxhjCwcPw_qWXNA_IkXLfKR_
```

### Paso 4: Configurar Ruta de Archivos .prn

Edita `imprimir_etiquetas_servicio.py` y verifica/ajusta:

```python
RUTA_PRN = "/home/gst3d/etiquetas"  # Ruta donde están los .prn
NOMBRE_IMPRESORA = "Zebra_ZD420-203dpi"  # Nombre en CUPS
ID_MAQUINA = "02"  # ID para códigos de barras
```

### Paso 5: Iniciar el Servicio

**Opción A: Ejecución manual**
```bash
python3 imprimir_etiquetas_servicio.py
```

**Opción B: Como servicio systemd (recomendado para producción)**
```bash
# Crear servicio (ver README_IMPRESION_SERVICIO.md para detalles)
sudo systemctl enable imprimir-etiquetas.service
sudo systemctl start imprimir-etiquetas.service
```

**Opción C: Con screen/tmux**
```bash
screen -S impresion
python3 imprimir_etiquetas_servicio.py
# Ctrl+A, D para desacoplar
```

## 📁 Estructura de Archivos .prn

El servicio busca archivos `.prn` en la carpeta configurada con los siguientes nombres:

**Etiquetas Chicas:**
- `BLACK.prn`
- `RED.prn`
- `BLUE.prn`
- etc. (nombres según `web/app/data.ts`)

**Etiquetas Grandes:**
- `BLACK_GRANDE.prn` o `BLACK.prn`
- `RED_GRANDE.prn` o `RED.prn`
- etc.

## 🔍 Verificación

### Verificar que el servicio funciona:

1. **En la web**: Hacer clic en "Imprimir Etiquetas"
2. **En Supabase**: Verificar que se creó con `estado='pendiente'`
3. **En el servicio Python**: Debería mostrar "📋 Encontradas X impresión(es) pendiente(s)"
4. **Después de imprimir**: En Supabase debería cambiar a `estado='impresa'`

### Logs del servicio:

El servicio muestra en consola:
- ✅ Impresiones encontradas
- ✅ Proceso de impresión
- ✅ Estado actualizado
- ❌ Errores si los hay

### Verificar impresora:

```bash
# Verificar que la impresora está configurada
lpstat -p

# Probar impresión manual
echo "Test" | lp -d Zebra_ZD420-203dpi
```

## 🐛 Solución de Problemas Comunes

### El servicio no encuentra impresiones pendientes

1. Verifica que el campo `estado` esté agregado a la tabla
2. Verifica que las impresiones se guarden con `estado='pendiente'` desde la web
3. Revisa los logs del servicio para errores de conexión

### Error al imprimir

1. Verifica que la impresora esté configurada: `lpstat -p`
2. Verifica que los archivos .prn existan en la ruta configurada
3. Revisa los logs para ver qué archivo está buscando

### Error de conexión a Supabase

1. Verifica las credenciales en variables de entorno
2. Verifica la conexión a internet
3. Verifica que las políticas RLS permitan lectura/escritura

## 📝 Notas Importantes

- El servicio debe ejecutarse en la misma máquina donde está la impresora
- El servicio funciona en tiempo real (cada 5 segundos consulta Supabase)
- Los archivos .prn deben tener los nombres correctos según los colores del sistema web
- El límite de 100 etiquetas por hora se respeta globalmente
- Los logs se guardan en `/home/gst3d/etiquetas_log.json`

## 🔐 Seguridad

- Usa la clave pública (anon key) de Supabase (segura para uso público)
- Las políticas RLS en Supabase controlan el acceso
- No se requiere acceso directo a la base de datos desde el servicio
- Considera usar un usuario específico para ejecutar el servicio (no root)

## 📞 Siguiente Paso

Una vez configurado todo:

1. ✅ Ejecutar el script SQL en Supabase
2. ✅ Desplegar cambios de la web (si es necesario)
3. ✅ Instalar dependencias Python en la máquina de la impresora
4. ✅ Configurar variables de entorno
5. ✅ Iniciar el servicio Python
6. ✅ Probar haciendo una impresión desde la web
7. ✅ Verificar que se imprima físicamente

¡Listo! El sistema debería funcionar end-to-end. 🎉






