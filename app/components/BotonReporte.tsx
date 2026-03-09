"use client";
import React from 'react';
import { generarExcelControl } from '../utils/exportExcel';
import { ImpresionEtiqueta } from '../types';

interface BotonReporteProps {
  impresiones: ImpresionEtiqueta[];
  operadoresAsignados: Record<number, string>;
  coloresPorMaquina: Record<number, { chica: string; grande: string }>;
}

const BotonReporte: React.FC<BotonReporteProps> = ({ 
  impresiones, 
  operadoresAsignados, 
  coloresPorMaquina 
}) => {

  const obtenerDatosPorTurno = () => {
    const horaActual = new Date().getHours();
    let inicio = 6, fin = 14, nombre = "Mañana";

    if (horaActual >= 14 && horaActual < 22) {
      inicio = 14; fin = 22; nombre = "Tarde";
    } else if (horaActual >= 22 || horaActual < 6) {
      inicio = 22; fin = 6; nombre = "Noche";
    }

    const dataFiltrada = Array.from({ length: 8 }, (_, i) => {
      const id = i + 1;
      const op = operadoresAsignados[id] || "Sin asignar";
      
      const totalTurno = impresiones
        .filter(imp => {
          const h = new Date(imp.fecha).getHours();
          const mismoOp = imp.operador === op;
          // Lógica para turnos (incluye el cruce de medianoche)
          const enHorario = inicio < fin 
            ? (h >= inicio && h < fin) 
            : (h >= 22 || h < 6);
          return mismoOp && enHorario;
        })
        .reduce((acc, curr) => acc + (curr.cantidadChicas || 0) + (curr.cantidadGrandes || 0), 0);

      return {
        id,
        color: coloresPorMaquina[id]?.chica || "Sin material",
        cantidad: totalTurno,
        operador: op
      };
    });

    return { dataFiltrada, nombre };
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-[#a0aec0] text-xs font-bold mb-2 uppercase tracking-wide">Reporte:</label>
      <button 
        onClick={() => {
          const { dataFiltrada, nombre } = obtenerDatosPorTurno();
          generarExcelControl(dataFiltrada, nombre);
        }}
        className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-200 flex items-center gap-2 shadow-lg"
      >
        <span>📊</span>
        <span className="font-medium">Descargar Turno</span>
      </button>
    </div>
  );
};

export default BotonReporte;