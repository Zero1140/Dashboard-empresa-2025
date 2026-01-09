@echo off
echo ========================================
echo Iniciando servidor de desarrollo
echo ========================================
echo.

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Verificar si hay procesos usando el puerto 3000 y detenerlos
echo [1/3] Verificando procesos en el puerto 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo     Proceso encontrado: %%a
    taskkill /PID %%a /F >nul 2>&1
    echo     Proceso %%a detenido
)

REM Esperar un momento para que los puertos se liberen
timeout /t 2 /nobreak >nul

REM Verificar que el puerto esté libre
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo     Advertencia: El puerto 3000 aun puede estar en uso
) else (
    echo     Puerto 3000 liberado correctamente
)

echo.
echo [2/3] Cambiando al directorio web...
cd web

echo [3/3] Iniciando servidor Next.js...
echo.
echo ========================================
echo Servidor disponible en: http://localhost:3000
echo Presiona Ctrl+C para detener el servidor
echo ========================================
echo.

REM Ejecutar el servidor de desarrollo
npm run dev

pause


