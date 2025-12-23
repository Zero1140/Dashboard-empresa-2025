"use client";

import { limpiarNombre, esColorOscuro } from "../data";

interface ColorButtonProps {
  etiqueta: string;
  colorHex: string;
  tipo: string;
  onClick: (etiqueta: string, tipo: string) => void;
}

export default function ColorButton({ etiqueta, colorHex, tipo, onClick }: ColorButtonProps) {
  const esOscuro = esColorOscuro(colorHex);
  const nombreLimpio = limpiarNombre(etiqueta, tipo);

  return (
    <button
      onClick={() => onClick(etiqueta, tipo)}
      className="w-full h-24 rounded-lg font-bold text-sm transition-all hover:scale-105 hover:shadow-lg active:scale-95 flex items-center justify-center px-2 py-1"
      style={{
        backgroundColor: colorHex,
        color: esOscuro ? "#FFFFFF" : "#000000",
      }}
      title={nombreLimpio}
    >
      <span className="text-center break-words">{nombreLimpio}</span>
    </button>
  );
}

