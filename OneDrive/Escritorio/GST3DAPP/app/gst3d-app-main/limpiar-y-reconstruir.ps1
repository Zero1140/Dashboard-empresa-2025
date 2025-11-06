# Script para limpiar cache y reconstruir la app
Write-Host "Limpiando cache y dependencias..." -ForegroundColor Cyan

# Cambiar al directorio de la app
Set-Location -Path $PSScriptRoot

# 1. Limpiar node_modules
Write-Host "Eliminando node_modules..." -ForegroundColor Yellow
if (Test-Path node_modules) {
    Remove-Item -Recurse -Force node_modules
    Write-Host "node_modules eliminado" -ForegroundColor Green
}

# 2. Limpiar cache de npm
Write-Host "Limpiando cache de npm..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "Cache de npm limpiado" -ForegroundColor Green

# 3. Limpiar build de Android
Write-Host "Limpiando build de Android..." -ForegroundColor Yellow
if (Test-Path android\app\build) {
    Remove-Item -Recurse -Force android\app\build
    Write-Host "Build de Android eliminado" -ForegroundColor Green
}

# 4. Limpiar cache de Gradle
if (Test-Path android\.gradle) {
    Remove-Item -Recurse -Force android\.gradle
    Write-Host "Cache de Gradle eliminado" -ForegroundColor Green
}

# 5. Limpiar cache de Metro
if (Test-Path android\app\.gradle) {
    Remove-Item -Recurse -Force android\app\.gradle
}

# 6. Reinstalar dependencias
Write-Host "Reinstalando dependencias..." -ForegroundColor Yellow
npm install
Write-Host "Dependencias reinstaladas" -ForegroundColor Green

# 7. Limpiar cache de pods (si existe iOS)
if (Test-Path ios\Pods) {
    Write-Host "Eliminando Pods..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ios\Pods
    Set-Location ios
    pod install
    Set-Location ..
    Write-Host "Pods reinstalados" -ForegroundColor Green
}

Write-Host ""
Write-Host "Limpieza completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora puedes ejecutar:" -ForegroundColor Cyan
Write-Host "   npm run android" -ForegroundColor White
Write-Host ""
Write-Host "o" -ForegroundColor Cyan
Write-Host ""
Write-Host "   npx react-native run-android" -ForegroundColor White
