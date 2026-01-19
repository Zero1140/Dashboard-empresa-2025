# 🚀 DEPLOY - Máquina de Impresión GST3D

## 📋 Lista de Archivos y Configuración Necesaria

### 📁 **Archivos a Copiar desde tu PC:**

#### **1. Script Principal Modificado:**
```
imprimir_etiquetas_servicio_modificado.py
```
- ✅ **Ubicación destino:** `C:\Users\gst3d\Desktop\`
- ✅ **Renombrar a:** `imprimir_etiquetas_servicio.py`

#### **2. Dependencias Python:**
```
requirements_impresion.txt
```
- ✅ **Ubicación destino:** `C:\Users\gst3d\Desktop\`
- ✅ **Contenido necesario:**
```txt
supabase>=1.0.0
```

#### **3. Script de Inicio (opcional):**
```
start_impresion_service.bat
```
- ✅ **Ubicación destino:** `C:\Users\gst3d\Desktop\`

### 🔧 **Configuración Necesaria:**

#### **1. Instalar Dependencias:**
```cmd
cd C:\Users\gst3d\Desktop
pip install -r requirements_impresion.txt
```

#### **2. Verificar Rutas:**
- ✅ **RUTA_PRN:** `C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS`
- ✅ **Impresoras:** `\\localhost\ZebraZD420` y `\\localhost\ZebraZD420_Grande`
- ✅ **Archivo de log:** `C:\Users\gst3d\OneDrive\Desktop\notificaciones_prn.log`

#### **3. Credenciales Supabase:**
Ya están hardcodeadas en el script - no necesitan configuración adicional.

### 📂 **Estructura Final en la Máquina de Impresión:**

```
C:\Users\gst3d\Desktop\
├── imprimir_etiquetas_servicio.py          ← Script principal modificado
├── requirements_impresion.txt             ← Dependencias
├── start_impresion_service.bat            ← Script de inicio (opcional)
└── ...

C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS\
├── BLACK.prn                               ← Archivos PRN existentes
├── RED.prn
├── BLUE.prn
├── BLACK_GRANDE.prn
└── ... (se generarán automáticamente nuevos)

C:\Users\gst3d\OneDrive\Desktop\
└── notificaciones_prn.log                 ← Se crea automáticamente
```

### 🚀 **Pasos de Deploy:**

#### **Paso 1: Copiar archivos**
```cmd
# Copiar desde tu USB/Red los archivos:
# - imprimir_etiquetas_servicio_modificado.py → renombrar a imprimir_etiquetas_servicio.py
# - requirements_impresion.txt
```

#### **Paso 2: Instalar dependencias**
```cmd
pip install -r requirements_impresion.txt
```

#### **Paso 3: Verificar rutas**
```cmd
# Verificar que existe la carpeta de plantillas:
dir "C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS"

# Verificar impresoras:
wmic printer list brief
```

#### **Paso 4: Probar el script**
```cmd
cd C:\Users\gst3d\Desktop
python imprimir_etiquetas_servicio.py
```

### 🎯 **Resultado Esperado:**

Al ejecutar, deberías ver:
```
===========================================
🚀 SERVIDOR GST3D - MODO PASAMANOS PRN
===========================================
Conectado a Supabase. Escuchando pedidos

🔍 Verificando archivos PRN...
⚠️  ARCHIVOS PRN FALTANTES:
   ❌ [colores que faltan se listarán aquí]

Conectado a Supabase. Escuchando pedidos
```

### 📞 **Si hay problemas:**

#### **Error de conexión a Supabase:**
- Verificar conexión a internet
- Las credenciales ya están en el código

#### **Error de impresoras:**
- Verificar que las impresoras estén compartidas como `\\localhost\ZebraZD420`
- Revisar permisos de impresión

#### **Error de rutas:**
- Asegurarse que la carpeta `ETIQUETAS_NUEVAS` existe
- Verificar permisos de escritura

### 💡 **Archivos que NO necesitan:**

- ❌ `app/utils/generadorEtiquetas.ts` - Solo para la aplicación web
- ❌ `app/components/MaterialesPage.tsx` - Ya está modificado en tu deploy web
- ❌ Archivos de Next.js/React - Solo para el frontend

### ⚡ **Checklist Final:**

- [ ] Copiar `imprimir_etiquetas_servicio_modificado.py`
- [ ] Renombrar a `imprimir_etiquetas_servicio.py`
- [ ] Copiar `requirements_impresion.txt`
- [ ] Instalar dependencias: `pip install -r requirements_impresion.txt`
- [ ] Verificar carpetas y permisos
- [ ] Probar ejecución
- [ ] Verificar que se conecte a Supabase
- [ ] Confirmar que detecta impresiones pendientes

¡Listo! 🎉</contents>
</xai:function_call">Creé las instrucciones completas. Ahora voy a crear también un batch script opcional para facilitar el inicio del servicio.">
<xai:function_call name="write">
<parameter name="file_path">start_impresion_service.bat