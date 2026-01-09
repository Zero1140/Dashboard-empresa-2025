# Script de Verificación Completa - Windows
# Ejecutar desde: gst3d-app-main
# Uso: .\scripts\verify-complete-windows.ps1

param(
    [switch]$Detailed = $false
)

$ErrorActionPreference = "Continue"

# Colores
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Error { Write-Host $args -ForegroundColor Red }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Section { Write-Host "`n$('='*60)" -ForegroundColor Cyan; Write-Host $args -ForegroundColor Cyan; Write-Host $('='*60) -ForegroundColor Cyan }

$errors = 0
$warnings = 0
$checks = 0

Write-Section "🔍 VERIFICACIÓN COMPLETA DEL PROYECTO iOS"
Write-Host "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "package.json")) {
    Write-Error "❌ Error: No se encuentra package.json"
    Write-Error "   Ejecuta este script desde: gst3d-app-main"
    exit 1
}

Write-Success "✅ Directorio correcto: $(Get-Location)"

# ============================================================================
# FASE 1: ESTRUCTURA DE CARPETAS
# ============================================================================
Write-Section "FASE 1: ESTRUCTURA DE CARPETAS"

$carpetas = @(
    "ios",
    "ios\MyFirstApp",
    "src",
    "scripts"
)

foreach ($carpeta in $carpetas) {
    $checks++
    if (Test-Path $carpeta) {
        Write-Success "✅ $carpeta"
    } else {
        Write-Error "❌ $carpeta NO existe"
        $errors++
    }
}

# ============================================================================
# FASE 2: ARCHIVOS iOS CRÍTICOS
# ============================================================================
Write-Section "FASE 2: ARCHIVOS iOS CRÍTICOS"

$archivosIOS = @(
    @{Path="ios\GoogleService-Info.plist"; Critical=$true; Description="Configuración Firebase"},
    @{Path="ios\Podfile"; Critical=$true; Description="Dependencias CocoaPods"},
    @{Path="ios\MyFirstApp.xcworkspace"; Critical=$true; Description="Workspace Xcode"},
    @{Path="ios\MyFirstApp\Info.plist"; Critical=$true; Description="Configuración app"},
    @{Path="ios\MyFirstApp\AppDelegate.mm"; Critical=$true; Description="AppDelegate"},
    @{Path="ios\com.wichisoft.gst3d.entitlements"; Critical=$false; Description="Entitlements"}
)

foreach ($archivo in $archivosIOS) {
    $checks++
    if (Test-Path $archivo.Path) {
        Write-Success "✅ $($archivo.Path) - $($archivo.Description)"
        
        if ($Detailed) {
            $size = (Get-Item $archivo.Path).Length
            Write-Host "   Tamaño: $size bytes" -ForegroundColor Gray
        }
    } else {
        if ($archivo.Critical) {
            Write-Error "❌ $($archivo.Path) - $($archivo.Description) [CRÍTICO]"
            $errors++
        } else {
            Write-Warning "⚠️  $($archivo.Path) - $($archivo.Description) [Opcional - se creará en Xcode]"
            $warnings++
        }
    }
}

# ============================================================================
# FASE 3: PACKAGE.JSON Y DEPENDENCIAS
# ============================================================================
Write-Section "FASE 3: PACKAGE.JSON Y DEPENDENCIAS"

$checks++
if (Test-Path "package.json") {
    Write-Success "✅ package.json existe"
    
    try {
        $packageJson = Get-Content package.json -Raw | ConvertFrom-Json
        
        Write-Info "   Nombre: $($packageJson.name)"
        Write-Info "   Versión: $($packageJson.version)"
        
        # Verificar dependencias críticas
        $depsCriticas = @(
            "@notifee/react-native",
            "@react-native-firebase/app",
            "@react-native-firebase/messaging"
        )
        
        Write-Host ""
        foreach ($dep in $depsCriticas) {
            $checks++
            if ($packageJson.dependencies.PSObject.Properties.Name -contains $dep) {
                $version = $packageJson.dependencies.$dep
                Write-Success "✅ $dep : $version"
            } else {
                Write-Error "❌ $dep NO encontrada"
                $errors++
            }
        }
        
        # Verificar engines
        if ($packageJson.engines -and $packageJson.engines.node) {
            Write-Info "   Node requerido: $($packageJson.engines.node)"
        }
    } catch {
        Write-Error "❌ Error al leer package.json: $_"
        $errors++
    }
} else {
    Write-Error "❌ package.json NO existe"
    $errors++
}

# ============================================================================
# FASE 4: VERIFICACIÓN DETALLADA DE ARCHIVOS iOS
# ============================================================================
Write-Section "FASE 4: VERIFICACIÓN DETALLADA iOS"

# GoogleService-Info.plist
$checks++
if (Test-Path "ios\GoogleService-Info.plist") {
    $content = Get-Content "ios\GoogleService-Info.plist" -Raw
    
    if ($content -match "PROJECT_ID") {
        Write-Success "✅ GoogleService-Info.plist tiene PROJECT_ID"
    } else {
        Write-Warning "⚠️  PROJECT_ID no encontrado en GoogleService-Info.plist"
        $warnings++
    }
    
    if ($content -match "com\.wichisoft\.gst3d") {
        Write-Success "✅ Bundle ID correcto en GoogleService-Info.plist"
    } else {
        Write-Warning "⚠️  Verificar Bundle ID en GoogleService-Info.plist"
        $warnings++
    }
} else {
    Write-Error "❌ GoogleService-Info.plist NO existe"
    $errors++
}

# Podfile
$checks++
if (Test-Path "ios\Podfile") {
    $podfileContent = Get-Content "ios\Podfile" -Raw
    
    $verificacionesPodfile = @{
        'platform :ios' = 'Versión iOS'
        'Firebase/Messaging' = 'Firebase Messaging'
        'target.*com.wichisoft.gst3d' = 'Target correcto'
    }
    
    foreach ($verif in $verificacionesPodfile.GetEnumerator()) {
        $checks++
        if ($podfileContent -match [regex]::Escape($verif.Key)) {
            Write-Success "✅ Podfile: $($verif.Value)"
        } else {
            Write-Warning "⚠️  Podfile: $($verif.Value) - Verificar"
            $warnings++
        }
    }
    
    # NUEVO: Verificar versión iOS >= 12.0
    $checks++
    if ($podfileContent -match "platform :ios, '(\d+\.\d+)'") {
        $iosVersion = $matches[1]
        if ([float]$iosVersion -ge 12.0) {
            Write-Success "✅ Podfile: Versión iOS $iosVersion - mayor o igual a 12.0"
        } else {
            Write-Error "❌ Podfile: Versión iOS $iosVersion es muy antigua - debe ser mayor o igual a 12.0"
            $errors++
        }
    }
} else {
    Write-Error "❌ Podfile NO existe"
    $errors++
}

# Info.plist
$checks++
if (Test-Path "ios\MyFirstApp\Info.plist") {
    $infoPlistContent = Get-Content "ios\MyFirstApp\Info.plist" -Raw
    
    if ($infoPlistContent -match "CFBundleIdentifier") {
        Write-Success "✅ Info.plist tiene CFBundleIdentifier"
    } else {
        Write-Warning "⚠️  CFBundleIdentifier no encontrado"
        $warnings++
    }
    
    if ($infoPlistContent -match "UIBackgroundModes") {
        Write-Success "✅ Info.plist tiene UIBackgroundModes"
        
        if ($infoPlistContent -match "remote-notification") {
            Write-Success "✅ UIBackgroundModes incluye remote-notification"
        } else {
            Write-Warning "⚠️  UIBackgroundModes puede necesitar remote-notification"
            $warnings++
        }
    } else {
        Write-Warning '⚠️  UIBackgroundModes no encontrado (configurar en Xcode)'
        $warnings++
    }
    
    # NUEVO: Verificar FirebaseAppDelegateProxyEnabled
    $checks++
    if ($infoPlistContent -match "FirebaseAppDelegateProxyEnabled") {
        if ($infoPlistContent -match "FirebaseAppDelegateProxyEnabled.*false") {
            Write-Success "✅ FirebaseAppDelegateProxyEnabled = false"
        } else {
            Write-Warning "⚠️  FirebaseAppDelegateProxyEnabled existe pero no está en false"
            $warnings++
        }
    } else {
        Write-Warning "FirebaseAppDelegateProxyEnabled no encontrado - opcional, agregar si se necesita manejo manual"
        $warnings++
    }
} else {
    Write-Error "❌ Info.plist NO existe"
    $errors++
}

# AppDelegate.mm
$checks++
if (Test-Path "ios\MyFirstApp\AppDelegate.mm") {
    $appDelegateContent = Get-Content "ios\MyFirstApp\AppDelegate.mm" -Raw
    
    $verificacionesAppDelegate = @{
        "Firebase.h" = "Import Firebase"
        "\[FIRApp configure\]" = "Configuración Firebase"
        "UNUserNotificationCenter" = "Manejo notificaciones"
    }
    
    foreach ($verif in $verificacionesAppDelegate.GetEnumerator()) {
        $checks++
        if ($appDelegateContent -match $verif.Key) {
            Write-Success "✅ AppDelegate: $($verif.Value)"
        } else {
            Write-Warning "⚠️  AppDelegate: $($verif.Value) - Verificar"
            $warnings++
        }
    }
    
    # NUEVO: Verificar orden Notifee → Firebase (si se usa Notifee)
    $checks++
    if ($appDelegateContent -match "Notifee" -or $appDelegateContent -match "notifee") {
        Write-Warning "⚠️  Notifee detectado - Verificar que se inicializa ANTES de Firebase"
        $warnings++
    }
    
    # NUEVO: Verificar delegate configurado
    $checks++
    if ($appDelegateContent -match "center\.delegate\s*=\s*self") {
        Write-Success "✅ AppDelegate: UNUserNotificationCenter delegate configurado"
    } else {
        Write-Warning "⚠️  AppDelegate: Verificar que center.delegate = self"
        $warnings++
    }
} else {
    Write-Error "❌ AppDelegate.mm NO existe"
    $errors++
}

# ============================================================================
# FASE 5: SCRIPTS Y DOCUMENTACIÓN
# ============================================================================
Write-Section "FASE 5: SCRIPTS Y DOCUMENTACIÓN"

$scripts = @(
    "scripts\verify-ios-setup.sh",
    "scripts\build-ios.sh"
)

foreach ($script in $scripts) {
    $checks++
    if (Test-Path $script) {
        Write-Success "✅ $script"
    } else {
        Write-Warning "⚠️  $script NO existe"
        $warnings++
    }
}

$documentacion = @(
    "ios\CONFIGURACION-XCODE.md",
    "ios\CONFIGURACION-APNS.md",
    "ios\README-CONFIGURACION.md"
)

foreach ($doc in $documentacion) {
    $checks++
    if (Test-Path $doc) {
        Write-Success "✅ $doc"
    } else {
        Write-Warning "⚠️  $doc NO existe"
        $warnings++
    }
}

# ============================================================================
# FASE 6: NODE.JS Y NPM
# ============================================================================
Write-Section "FASE 6: NODE.JS Y NPM"

try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Node.js: $nodeVersion"
        
        $versionNumber = ($nodeVersion -replace 'v', '').Split('.')[0]
        if ([int]$versionNumber -ge 18) {
            Write-Success "✅ Versión Node.js compatible - mayor o igual a 18"
        } else {
            Write-Warning "⚠️  Node.js debe ser >= 18"
            $warnings++
        }
    } else {
        Write-Error "❌ Node.js NO instalado"
        $errors++
    }
} catch {
    Write-Error "❌ Node.js NO instalado"
    $errors++
}

try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ npm: $npmVersion"
    } else {
        Write-Error "❌ npm NO instalado"
        $errors++
    }
} catch {
    Write-Error "❌ npm NO instalado"
    $errors++
}

# ============================================================================
# FASE 7: SERVIDOR PUSH Y SUPABASE
# ============================================================================
Write-Section "FASE 7: SERVIDOR PUSH Y SUPABASE"

if (Test-Path "..\gst3d-push-server-main\server.js") {
    Write-Success "✅ Servidor push existe"
    
    $serverContent = Get-Content "..\gst3d-push-server-main\server.js" -Raw
    if ($serverContent -match "supabase") {
        Write-Success "✅ Servidor usa Supabase"
    } else {
        Write-Warning "⚠️  Verificar migración a Supabase"
        $warnings++
    }
    
    # NUEVO: Verificar logs estructurados
    $checks++
    if ($serverContent -match 'pino' -or $serverContent -match 'winston' -or $serverContent -match 'bunyan') {
        Write-Success "✅ Servidor usa logs estructurados"
    } else {
            Write-Warning "⚠️  Servidor usa console.log - considerar migrar a logs estructurados"
        $warnings++
    }
} else {
    Write-Warning '⚠️  Servidor push no encontrado (verificar ubicacion)'
    $warnings++
}

# Verificar variables de entorno Supabase
if (Test-Path "..\gst3d-push-server-main\supabase-client.js") {
    $supabaseClient = Get-Content "..\gst3d-push-server-main\supabase-client.js" -Raw
    
    $checks++
    if ($supabaseClient -match "process\.env\.SUPABASE_URL") {
        Write-Success "✅ SUPABASE_URL usa variable de entorno"
    } else {
        Write-Warning "⚠️  SUPABASE_URL puede estar hardcodeado"
        $warnings++
    }
    
    $checks++
    if ($supabaseClient -match "process\.env\.SUPABASE_SERVICE_ROLE_KEY") {
        Write-Success "✅ SUPABASE_SERVICE_ROLE_KEY usa variable de entorno"
    } else {
        Write-Warning "⚠️  SUPABASE_SERVICE_ROLE_KEY puede estar hardcodeado"
        $warnings++
    }
}

# Verificar estructura de tabla
if (Test-Path "..\gst3d-push-server-main\services\supabase-service.js") {
    $supabaseService = Get-Content "..\gst3d-push-server-main\services\supabase-service.js" -Raw
    
    $checks++
    if ($supabaseService -match "fcm_tokens") {
        Write-Success "✅ Usa tabla fcm_tokens"
    }
    
    # Verificar campos
    $campos = @("token", "platform", "created_at")
    foreach ($campo in $campos) {
        $checks++
        if ($supabaseService -match $campo) {
            Write-Success "✅ Campo '$campo' en tabla"
        }
    }
}

# Verificar cola de retry
if (Test-Path "..\gst3d-push-server-main\package.json") {
    $serverPackage = Get-Content "..\gst3d-push-server-main\package.json" | ConvertFrom-Json
    $colas = @("bull", "bee-queue", "bullmq", "agenda")
    $tieneCola = $false
    
    foreach ($cola in $colas) {
        if ($serverPackage.dependencies.PSObject.Properties.Name -contains $cola) {
            Write-Success "✅ Librería de cola instalada: $cola"
            $tieneCola = $true
            break
        }
    }
    
    if (-not $tieneCola) {
        Write-Warning '⚠️  No se encontro libreria de cola (opcional para produccion)'
        $warnings++
    }
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Section "📊 RESUMEN FINAL"

Write-Host "Total verificaciones: $checks" -ForegroundColor Cyan
Write-Success "✅ Exitosas: $($checks - $errors - $warnings)"
if ($warnings -gt 0) {
    Write-Warning "⚠️  Advertencias: $warnings"
}
if ($errors -gt 0) {
    Write-Error "❌ Errores: $errors"
}

Write-Host ""

if ($errors -eq 0) {
    Write-Success "🎉 ¡TODO ESTÁ LISTO PARA MAC!"
    Write-Host ""
    Write-Info "Próximos pasos:"
    Write-Host "1. Transferir proyecto a Mac" -ForegroundColor Yellow
    Write-Host "2. Seguir: ios/CONFIGURACION-XCODE.md" -ForegroundColor Yellow
    Write-Host "3. Seguir: ios/CONFIGURACION-APNS.md" -ForegroundColor Yellow
    exit 0
} else {
    Write-Error "❌ HAY ERRORES QUE DEBEN CORREGIRSE"
    Write-Host ""
    Write-Info "Revisa los errores arriba antes de mover a Mac"
    exit 1
}

