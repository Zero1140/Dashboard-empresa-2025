#!/bin/bash
# Script para iniciar el servicio de impresión de etiquetas
# Uso: ./start-impresion-service.sh

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando Servicio de Impresión de Etiquetas GST3D${NC}"
echo ""

# Verificar que Python esté instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 no está instalado${NC}"
    exit 1
fi

# Verificar que exista el script
if [ ! -f "imprimir_etiquetas_servicio.py" ]; then
    echo -e "${RED}❌ No se encontró el archivo imprimir_etiquetas_servicio.py${NC}"
    exit 1
fi

# Verificar dependencias
echo -e "${YELLOW}📦 Verificando dependencias...${NC}"
python3 -c "import supabase" 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Instalando dependencias...${NC}"
    pip3 install -r requirements_impresion.txt
fi

# Verificar variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Variables de entorno no configuradas${NC}"
    echo -e "${YELLOW}   Configúralas o crea un archivo .env${NC}"
    echo ""
    read -p "¿Deseas continuar de todas formas? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        exit 1
    fi
fi

# Iniciar el servicio
echo -e "${GREEN}✅ Iniciando servicio...${NC}"
echo ""
python3 imprimir_etiquetas_servicio.py






