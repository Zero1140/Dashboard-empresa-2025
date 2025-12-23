"use client";

import { useState } from "react";
import { coloresPorTipo, limpiarNombre } from "../data";

interface ColorGridProps {
  tipo: string;
  onColorClick: (etiqueta: string, tipo: string) => void;
}

export default function ColorGrid({ tipo, onColorClick }: ColorGridProps) {
  const colores = coloresPorTipo[tipo] || {};
  const [colorSeleccionado, setColorSeleccionado] = useState<string>("");

  // Obtener todas las etiquetas ordenadas
  const etiquetas = Object.keys(colores).sort((a, b) => a.localeCompare(b));

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const etiquetaSeleccionada = event.target.value;
    if (etiquetaSeleccionada) {
      setColorSeleccionado(etiquetaSeleccionada);
      onColorClick(etiquetaSeleccionada, tipo);
      // Resetear el selector después de la selección
      setColorSeleccionado("");
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <label className="block text-white text-lg font-semibold mb-4">
        Selecciona un color:
      </label>
      <select
        value={colorSeleccionado}
        onChange={handleSelectChange}
        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer text-lg"
      >
        <option value="">-- Selecciona un color --</option>
        {etiquetas.map((etiqueta) => (
          <option key={etiqueta} value={etiqueta}>
            {limpiarNombre(etiqueta, tipo)}
          </option>
        ))}
      </select>
    </div>
  );
}

