#!/bin/bash
# Script para verificar configuración iOS antes de compilar
# Uso: ./scripts/verify-ios-setup.sh

set -e  # Salir si hay error

echo "🔍 Verificando configuración iOS..."
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Función para verificar archivo
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✅${NC} $2 encontrado: $1"
        return 0
    else
        echo -e "${RED}❌${NC} $2 NO encontrado: $1"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Función para verificar contenido
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✅${NC} $3 encontrado en $1"
        return 0
    else
        echo -e "${YELLOW}⚠️${NC} $3 NO encontrado en $1"
        return 1
    fi
}

# 1. Verificar GoogleService-Info.plist
check_file "ios/GoogleService-Info.plist" "GoogleService-Info.plist"

# 2. Verificar Podfile
check_file "ios/Podfile" "Podfile"

# 3. Verificar Info.plist
check_file "ios/MyFirstApp/Info.plist" "Info.plist"

# 4. Verificar package.json
check_file "package.json" "package.json"

# 5. Verificar que existe node_modules
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅${NC} node_modules existe"
else
    echo -e "${YELLOW}⚠️${NC} node_modules NO existe - ejecuta 'npm install'"
    ERRORS=$((ERRORS + 1))
fi

# 6. Verificar que existe Pods
if [ -d "ios/Pods" ]; then
    echo -e "${GREEN}✅${NC} Pods instalados"
else
    echo -e "${YELLOW}⚠️${NC} Pods NO instalados - ejecuta 'cd ios && pod install'"
    ERRORS=$((ERRORS + 1))
fi

# 7. Verificar workspace
check_file "ios/MyFirstApp.xcworkspace" "Workspace"

# 8. Verificar Info.plist tiene UIBackgroundModes
check_content "ios/MyFirstApp/Info.plist" "UIBackgroundModes" "UIBackgroundModes"

# 9. Verificar package.json tiene notifee
check_content "package.json" "@notifee/react-native" "@notifee/react-native"

# 10. Verificar package.json tiene firebase
check_content "package.json" "@react-native-firebase" "Firebase"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Verificación completa - Todo está listo!${NC}"
    exit 0
else
    echo -e "${RED}❌ Se encontraron $ERRORS error(es)${NC}"
    echo -e "${YELLOW}⚠️  Corrige los errores antes de compilar${NC}"
    exit 1
fi





