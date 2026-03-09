"use client";
import React, { useState } from 'react';
import { generarExcelControl } from '../utils/exportExcel';
import { ImpresionEtiqueta } from '../types';

interface BotonReporteProps {
  impresiones: ImpresionEtiqueta[];
}

const BotonReporte: React.FC<BotonReporteProps> = ({ impresiones }) => {
  const [mostrarMenu, setMostrarMenu] = useState(false);

  const obtenerReportePorRango = (diasAtras: number, filtroMes: boolean = false) => {
    const ahora = new Date();
    const dataReporte: any[] = [];
    
    // Si es reporte mensual, filtramos todo el mes actual
    const impresionesFiltradas = impresiones.filter(imp => {
      const fechaImp = new Date(imp.fecha);
      if (filtroMes) return fechaImp.getMonth() === ahora.getMonth() && fechaImp.getFullYear() === ahora.getFullYear();
      
      const limite = new Date();
      limite.setDate(ahora.getDate() - diasAtras);
      limite.setHours(0,0,0,0);
      return fechaImp >= limite;
    });

    // Agrupación mágica: Día_Turno_Maquina_Color
    const agrupado: Record<string, any> = {};

    impresionesFiltradas.forEach(imp => {
      const fecha = new Date(imp.fecha);
      const diaStr = fecha.toLocaleDateString();
      const h = fecha.getHours();
      let turno = "Noche";
      if (h >= 6 && h < 14) turno = "Mañana";
      else if (h >= 14 && h < 22) turno = "Tarde";

      const colorBase = imp.etiquetaChica.replace(/_GRANDE$/, "");
      const key = `${diaStr}_${turno}_${imp.maquinaId}_${colorBase}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          fecha: diaStr,
          turno,
          maquinaId: imp.maquinaId,
          operador: imp.operador,
          color: colorBase,
          cantidad: 0
        };
      }
      agrupado[key].cantidad += (imp.cantidadChicas || 0) + (imp.cantidadGrandes || 0);
    });

    return Object.values(agrupado).sort((a, b) => b.maquinaId - a.maquinaId);
  };

  return (
    <div className="relative inline-block text-left">
      <button 
        onClick={() => setMostrarMenu(!mostrarMenu)}
        className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] hover:border-[#00d4ff]/50 transition-all flex items-center gap-2 shadow-lg"
      >
        <span>📊</span> <span className="font-medium">Reportes Producción</span>
      </button>

      {mostrarMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#1a2332] border border-[#2d3748] shadow-2xl z-50 overflow-hidden">
          <div className="p-2 space-y-1">
            <button onClick={() => { generarExcelControl(obtenerReportePorRango(0), "Turno_Actual"); setMostrarMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#00d4ff]/20 rounded-lg">📅 Hoy</button>
            <button onClick={() => { generarExcelControl(obtenerReportePorRango(3), "Ultimos_3_Dias"); setMostrarMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-white hover:bg-[#00d4ff]/20 rounded-lg">⏳ Últimos 3 días</button>
            <div className="border-t border-[#2d3748] my-1"></div>
            <button onClick={() => { generarExcelControl(obtenerReportePorRango(0, true), "Reporte_Mensual"); setMostrarMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-[#ffb800] hover:bg-[#ffb800]/10 rounded-lg font-bold">🏆 Control Mensual</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotonReporte;