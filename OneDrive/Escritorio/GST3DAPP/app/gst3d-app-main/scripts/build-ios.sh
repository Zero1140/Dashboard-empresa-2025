#!/bin/bash
# Script para compilar iOS
# Uso: ./scripts/build-ios.sh

set -e  # Salir si hay error

echo "🚀 Compilando app iOS..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encuentra package.json"
    echo "   Ejecuta este script desde la raíz del proyecto: gst3d-app-main"
    exit 1
fi

# 2. Instalar dependencias Node.js
echo "📦 Instalando dependencias Node.js..."
npm install

# 3. Verificar configuración
echo ""
echo "🔍 Verificando configuración..."
if [ -f "scripts/verify-ios-setup.sh" ]; then
    chmod +x scripts/verify-ios-setup.sh
    ./scripts/verify-ios-setup.sh
    if [ $? -ne 0 ]; then
        echo "❌ Verificación falló. Corrige los errores antes de continuar."
        exit 1
    fi
else
    echo "⚠️  Script de verificación no encontrado, continuando..."
fi

# 4. Pod install
echo ""
echo "📦 Instalando pods iOS..."
cd ios
pod install
cd ..

# 5. Build con Xcode
echo ""
echo "🔨 Compilando con Xcode..."
echo "   Abriendo Xcode..."
echo ""

# Abrir Xcode
open ios/MyFirstApp.xcworkspace

echo ""
echo -e "${GREEN}✅ Xcode abierto${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 INSTRUCCIONES:"
echo ""
echo "1. En Xcode, selecciona tu dispositivo o simulador"
echo "2. Presiona Cmd+R para compilar y ejecutar"
echo ""
echo "   O para crear un Archive:"
echo "   Product → Archive"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"





