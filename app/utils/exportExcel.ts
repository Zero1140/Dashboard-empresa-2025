import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarExcelControl = async (data: any[], nombreTurno: string = "Reporte") => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Control de Producción');

// En app/utils/exportExcel.ts
worksheet.columns = [
  { header: 'FECHA', key: 'fecha', width: 12 },
  { header: 'TURNO', key: 'turno', width: 10 },
  { header: 'MÁQ', key: 'maquinaId', width: 8 },
  { header: 'OPERADOR', key: 'operador', width: 20 },
  { header: 'COLOR/MATERIAL', key: 'color', width: 25 },
  { header: 'KG SISTEMA', key: 'cantidad', width: 15 },
  { header: 'KG MANUAL', key: 'manual', width: 20 },
];

  // 2. Estilo profesional al encabezado
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2D3748' }
  };

  // 3. Cargamos la data (USAMOS 'data', no 'maquinas')
  data.forEach((m) => {
    const row = worksheet.addRow({
      id: `Máquina ${m.id}`,
      color: m.color || 'Sin material',
      cantidad: m.cantidad || 0,
      manual: '', 
      obs: ''
    });

    // Resaltamos la celda manual en AMARILLO para el pibe
    const cellManual = row.getCell('manual');
    cellManual.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFF99' }
    };
    cellManual.border = {
      top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
    };
  });

  // 4. Generar y descargar
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Control_Produccion_${nombreTurno}_${new Date().toLocaleDateString()}.xlsx`);
};