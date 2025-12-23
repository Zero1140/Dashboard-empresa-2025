#!/bin/bash
# Script de build para Render - Fuerza el uso de npm
set -e

echo "🔧 Usando npm para instalar dependencias..."
npm install

echo "🏗️ Construyendo proyecto..."
npm run build

echo "✅ Build completado exitosamente"

