"use client";
import React from 'react';
import { generarExcelControl } from '../utils/exportExcel';
import { ImpresionEtiqueta } from '../types';

interface BotonReporteProps {
  impresiones: ImpresionEtiqueta[];
}

const BotonReporte: React.FC<BotonReporteProps> = ({ impresiones }) => {

  const procesarDiezTurnos = () => {
    const agrupado: Record<string, any> = {};
    const ahora = new Date();

    // 1. Buscamos el inicio del turno actual para ir hacia atrás
    const inicioTurnoActual = new Date(ahora);
    const hora = ahora.getHours();
    if (hora >= 6 && hora < 14) inicioTurnoActual.setHours(6, 0, 0, 0);
    else if (hora >= 14 && hora < 22) inicioTurnoActual.setHours(14, 0, 0, 0);
    else {
      if (hora < 6) inicioTurnoActual.setDate(ahora.getDate() - 1);
      inicioTurnoActual.setHours(22, 0, 0, 0);
    }

    // Filtramos impresiones de los últimos 10 turnos (aprox 80hs atrás)
    const limiteSemanas = new Date(inicioTurnoActual);
    limiteSemanas.setHours(limiteSemanas.getHours() - (8 * 9)); // 9 turnos previos + el actual

    const filtradas = impresiones.filter(imp => new Date(imp.fecha) >= limiteSemanas);

    filtradas.forEach(imp => {
      const f = new Date(imp.fecha);
      const dia = f.toLocaleDateString('es-AR');
      const h = f.getHours();
      
      let turno = "Noche";
      let ordenTurno = 3; // Para ordenar el Excel
      if (h >= 6 && h < 14) { turno = "Mañana"; ordenTurno = 1; }
      else if (h >= 14 && h < 22) { turno = "Tarde"; ordenTurno = 2; }

      const colorBase = imp.etiquetaChica?.replace(/_GRANDE$/, "") || "S/D";
      
      // CLAVE CLAVE: Si cambia el color, se crea un registro nuevo
      const key = `${dia}_${turno}_${imp.maquinaId}_${colorBase}`;

      if (!agrupado[key]) {
        agrupado[key] = {
          fecha: dia,
          turno: turno,
          maquinaId: imp.maquinaId,
          operador: imp.operador || "S/N",
          color: colorBase,
          cantidad: 0,
          sortKey: `${f.getFullYear()}${f.getMonth()}${f.getDate()}_${ordenTurno}`
        };
      }
      agrupado[key].cantidad += (imp.cantidadChicas || 0) + (imp.cantidadGrandes || 0);
    });

    // Ordenar de más nuevo a más viejo
    const listaOrdenada = Object.values(agrupado).sort((a: any, b: any) => b.sortKey.localeCompare(a.sortKey));

    // Insertar separadores entre turnos
    const final: any[] = [];
    listaOrdenada.forEach((item, index) => {
      final.push(item);
      const sig = listaOrdenada[index + 1];
      if (sig && (item.turno !== sig.turno || item.fecha !== sig.fecha)) {
        final.push({ fecha: '---', turno: '---', maquinaId: '---', operador: '---', color: '---', cantidad: null });
      }
    });

    return final;
  };

  return (
    <button 
      onClick={() => generarExcelControl(procesarDiezTurnos(), "Ultimos_10_Turnos")}
      className="bg-[#0f1419] text-white px-5 py-3 rounded-xl border border-[#2d3748] hover:border-emerald-500/50 transition-all flex items-center gap-2 shadow-lg"
    >
      <span>📊</span> <span className="font-medium">Planilla (10 Turnos)</span>
    </button>
  );
};

export default BotonReporte;