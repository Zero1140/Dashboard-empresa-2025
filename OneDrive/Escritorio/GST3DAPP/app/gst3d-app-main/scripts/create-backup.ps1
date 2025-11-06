# Script de Backup - Windows
# Ejecutar desde: gst3d-app-main
# Uso: .\scripts\create-backup.ps1

$ErrorActionPreference = "Continue"

Write-Host "📦 CREANDO BACKUP DEL PROYECTO" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: No se encuentra package.json" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde: gst3d-app-main" -ForegroundColor Red
    exit 1
}

# Crear nombre de backup con fecha
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = "..\backup-pre-mac-$timestamp"

Write-Host "📁 Creando directorio de backup..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

Write-Host "✅ Backup en: $backupDir" -ForegroundColor Green
Write-Host ""

# Directorios a excluir (para ahorrar espacio)
$excludeDirs = @(
    "node_modules",
    "android\app\build",
    "android\build",
    "ios\Pods",
    "ios\build",
    "ios\DerivedData",
    ".gradle",
    ".idea",
    ".vscode"
)

Write-Host "📦 Copiando archivos..." -ForegroundColor Yellow

# Copiar proyecto completo
$source = Get-Location
$dest = Join-Path $backupDir "gst3d-app-main"

# Crear estructura
New-Item -ItemType Directory -Path $dest -Force | Out-Null

# Copiar archivos y carpetas (excluyendo las especificadas)
Get-ChildItem -Path $source -Recurse | Where-Object {
    $relativePath = $_.FullName.Substring($source.Path.Length + 1)
    $shouldExclude = $false
    
    foreach ($exclude in $excludeDirs) {
        if ($relativePath -like "$exclude*") {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
} | ForEach-Object {
    $destPath = $_.FullName.Replace($source.Path, $dest)
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    if (-not $_.PSIsContainer) {
        Copy-Item $_.FullName -Destination $destPath -Force
    }
}

Write-Host ""
Write-Host "✅ Backup completado" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Información del backup:" -ForegroundColor Cyan
$backupSize = (Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)
Write-Host "   Tamaño: $backupSizeMB MB" -ForegroundColor Yellow
Write-Host "   Ubicación: $backupDir" -ForegroundColor Yellow
Write-Host ""

# Opción de comprimir
$compress = Read-Host "¿Deseas comprimir el backup? (S/N)"
if ($compress -eq "S" -or $compress -eq "s") {
    Write-Host "📦 Comprimiendo..." -ForegroundColor Yellow
    $zipPath = "$backupDir.zip"
    Compress-Archive -Path $backupDir -DestinationPath $zipPath -Force
    Write-Host "✅ Backup comprimido: $zipPath" -ForegroundColor Green
    
    $zipSize = (Get-Item $zipPath).Length
    $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
    Write-Host "   Tamaño comprimido: $zipSizeMB MB" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 ¡Backup completado exitosamente!" -ForegroundColor Green





