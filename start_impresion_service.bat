@echo off
REM Script de inicio para el servicio de impresión GST3D
REM Ubicación: C:\Users\gst3d\Desktop\start_impresion_service.bat

echo ============================================
echo 🚀 Iniciando Servicio de Impresión GST3D
echo ============================================

REM Verificar que estamos en el directorio correcto
cd /d "%~dp0"

REM Verificar que Python esté instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python no está instalado o no está en el PATH
    echo Instala Python desde https://python.org
    pause
    exit /b 1
)

REM Verificar que las dependencias estén instaladas
python -c "import supabase" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Advertencia: La libreria 'supabase' no está instalada
    echo Instalando dependencias...
    pip install supabase
    if errorlevel 1 (
        echo ❌ ERROR: No se pudo instalar las dependencias
        pause
        exit /b 1
    )
)

REM Verificar que existe el script principal
if not exist "imprimir_etiquetas_servicio.py" (
    echo ❌ ERROR: No se encuentra 'imprimir_etiquetas_servicio.py'
    echo Asegúrate de que el archivo esté en el mismo directorio
    pause
    exit /b 1
)

REM Verificar carpeta de plantillas
if not exist "C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS" (
    echo ⚠️  Advertencia: La carpeta de plantillas no existe
    echo Creando carpeta...
    mkdir "C:\Users\gst3d\OneDrive\Desktop\ETIQUETAS_NUEVAS" 2>nul
)

echo ✅ Verificaciones completadas
echo.
echo 🔄 Iniciando servicio...
echo Presiona Ctrl+C para detener
echo.

REM Iniciar el servicio
python imprimir_etiquetas_servicio.py

REM Si el script termina, mantener la ventana abierta
echo.
echo Servicio detenido. Presiona cualquier tecla para cerrar...
pause >nul