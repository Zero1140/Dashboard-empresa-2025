# Script para subir el proyecto GST3D a GitHub
# Ejecutar desde: C:\Users\guill\OneDrive\Escritorio\GST3DAPP\app

Write-Host "Preparando proyecto para subir a GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
Write-Host "Directorio actual: $currentDir" -ForegroundColor Yellow

# Verificar estado de Git
Write-Host ""
Write-Host "Verificando estado de Git..." -ForegroundColor Cyan
git status --short | Select-Object -First 20

Write-Host ""
Write-Host "IMPORTANTE: El repositorio Git esta en un nivel superior." -ForegroundColor Yellow
Write-Host "Esto significa que esta rastreando archivos fuera del proyecto." -ForegroundColor Yellow
Write-Host ""

# Verificar archivos importantes del proyecto
Write-Host "Verificando archivos importantes del proyecto..." -ForegroundColor Cyan
$importantFiles = @(
    "gst3d-app-main",
    "gst3d-push-server-main",
    "ESTADO-ACTUAL-PROYECTO.md",
    "INSTRUCCIONES-GITHUB.md",
    "PLAN-MIGRACION-WINDOWS-A-MAC.md",
    "PLAN-DETALLADO-WINDOWS-COMPLETO.md"
)

foreach ($file in $importantFiles) {
    if (Test-Path $file) {
        Write-Host "   [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "   [NO] $file (NO ENCONTRADO)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "INSTRUCCIONES PARA SUBIR A GITHUB:" -ForegroundColor Cyan
Write-Host ""
Write-Host "OPCION 1: Usar GitHub Desktop (RECOMENDADO)" -ForegroundColor Yellow
Write-Host "   1. Abre GitHub Desktop" -ForegroundColor White
Write-Host "   2. File -> Add Local Repository" -ForegroundColor White
Write-Host "   3. Selecciona: C:\Users\guill\OneDrive\Escritorio\GST3DAPP\app" -ForegroundColor White
Write-Host "   4. Si ya esta agregado, ve a la pestana 'Changes'" -ForegroundColor White
Write-Host "   5. Revisa los cambios y haz commit" -ForegroundColor White
Write-Host "   6. Click en 'Push origin' para subir" -ForegroundColor White
Write-Host ""
Write-Host "OPCION 2: Usar linea de comandos" -ForegroundColor Yellow
Write-Host "   Ejecuta estos comandos:" -ForegroundColor White
Write-Host ""
Write-Host "   git add .gitignore ESTADO-ACTUAL-PROYECTO.md INSTRUCCIONES-GITHUB.md" -ForegroundColor Gray
Write-Host "   git add gst3d-app-main/ gst3d-push-server-main/" -ForegroundColor Gray
Write-Host "   git commit -m 'Agregar proyecto completo GST3D con documentacion'" -ForegroundColor Gray
Write-Host "   git push origin ProyectZer" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTA: El repositorio esta en la rama 'ProyectZer'" -ForegroundColor Yellow
Write-Host "Asegurate de hacer push a la rama correcta." -ForegroundColor Yellow
Write-Host ""

# Verificar si hay un remote configurado
Write-Host "Verificando remotes configurados..." -ForegroundColor Cyan
$remotes = git remote -v
if ($remotes) {
    Write-Host $remotes -ForegroundColor Green
} else {
    Write-Host "   [ADVERTENCIA] No hay remotes configurados" -ForegroundColor Yellow
    Write-Host "   Necesitas agregar un remote antes de hacer push:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Script completado. Sigue las instrucciones arriba." -ForegroundColor Green

