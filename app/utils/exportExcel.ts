import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarExcelControl = async (data: any[], nombreTurno: string = "Reporte") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Control de Producción');

  // 1. Columnas (Asegurate que coincidan con las de BotonReporte)
  worksheet.columns = [
    { header: 'FECHA', key: 'fecha', width: 12 },
    { header: 'TURNO', key: 'turno', width: 10 },
    { header: 'MÁQ', key: 'maquinaId', width: 12 },
    { header: 'OPERADOR', key: 'operador', width: 20 },
    { header: 'COLOR/MATERIAL', key: 'color', width: 25 },
    { header: 'KG SISTEMA', key: 'cantidad', width: 15 },
    { header: 'KG MANUAL', key: 'manual', width: 20 },
  ];

  // 2. Estilo al encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2D3748' }
  };

  // 3. Cargamos la data
  data.forEach((m) => {
    const row = worksheet.addRow({
      fecha: m.fecha,
      turno: m.turno,
      maquinaId: m.maquinaId !== '---' ? `Máquina ${m.maquinaId}` : '---',
      operador: m.operador,
      color: m.color,
      cantidad: m.cantidad,
      manual: '', // Siempre vacío para que escriban
    });

    // Si es una línea separadora (las que tienen '---')
    if (m.fecha === '---') {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'EDF2F7' } // Gris clarito
        };
      });
    } else {
      // SI NO ES SEPARADOR: Pintamos la celda manual en AMARILLO para el pibe
      const cellManual = row.getCell('manual');
      cellManual.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFF99' }
      };
      cellManual.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }); // <--- Acá se cierra el forEach correctamente

  // 4. Generar y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Control_Produccion_${nombreTurno}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`);
};