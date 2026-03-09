"use client";
import React from 'react';
import { generarExcelControl } from '../utils/exportExcel';
import { ImpresionEtiqueta } from '../types';

interface BotonReporteProps {
  impresiones: ImpresionEtiqueta[];
}

const BotonReporte: React.FC<BotonReporteProps> = ({ impresiones }) => {

  const procesarHistorialCompleto = () => {
    const ahora = new Date();
    const agrupado: Record<string, any> = {};

    // Filtramos: Desde hace 3 días a las 00:00 hasta ahora
    const limite = new Date();
    limite.setDate(ahora.getDate() - 3);
    limite.setHours(0, 0, 0, 0);

    const filtradas = impresiones.filter(imp => new Date(imp.fecha) >= limite);

    filtradas.forEach(imp => {
      const f = new Date(imp.fecha);
      const dia = f.toLocaleDateString('es-AR');
      const h = f.getHours();
      
      let turno = "Noche";
      if (h >= 6 && h < 14) turno = "Mañana";
      else if (h >= 14 && h < 22) turno = "Tarde";

      const colorBase = imp.etiquetaChica?.replace(/_GRANDE$/, "") || "S/D";
      // Key para agrupar por Día, Turno, Máquina y Color
      const key = `${dia}_${turno}_${imp.maquinaId}_${colorBase}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          fecha: dia,
          turno: turno,
          maquinaId: imp.maquinaId,
          operador: imp.operador || "S/N",
          color: colorBase,
          cantidad: 0,
          rawDate: f.getTime() // Para ordenar
        };
      }
      agrupado[key].cantidad += (imp.cantidadChicas || 0) + (imp.cantidadGrandes || 0);
    });

    // Ordenamos por fecha (descendente) y luego por turno
    const listaOrdenada = Object.values(agrupado).sort((a: any, b: any) => b.rawDate - a.rawDate);

    // Insertamos líneas separadoras cuando cambia el turno o el día
    const dataConSeparadores: any[] = [];
    listaOrdenada.forEach((item, index) => {
      dataConSeparadores.push(item);
      
      const siguiente = listaOrdenada[index + 1];
      if (siguiente && (item.turno !== siguiente.turno || item.fecha !== siguiente.fecha)) {
        // Fila vacía que sirve de separador
        dataConSeparadores.push({ fecha: '---', turno: '---', maquinaId: '---', operador: '---', color: '---', cantidad: null });
      }
    });

    return dataConSeparadores;
  };

  return (
    <button 
      onClick={() => generarExcelControl(procesarHistorialCompleto(), "Historial_Produccion")}
      className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] hover:border-emerald-500/50 transition-all flex items-center gap-2 shadow-lg"
    >
      <span>📊</span> <span className="font-medium">Descargar Planilla (4 días)</span>
    </button>
  );
};

export default BotonReporte;