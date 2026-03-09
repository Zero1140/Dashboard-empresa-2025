import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generarExcelControl = async (maquinas: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Control de Producción');

  // 1. Definimos las columnas (Basado en tu flujo de trabajo)
  worksheet.columns = [
    { header: 'MÁQUINA', key: 'id', width: 12 },
    { header: 'COLOR/TIPO (SISTEMA)', key: 'color', width: 25 },
    { header: 'KG (SISTEMA)', key: 'cantidad', width: 15 },
    { header: 'KG MANUAL (OPERARIO)', key: 'manual', width: 25 }, // Columna para completar
    { header: 'OBSERVACIONES', key: 'obs', width: 30 },
  ];

  // 2. Le damos el estilo "profesional" (Encabezado oscuro)
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '2D3748' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // 3. Cargamos los datos actuales de las máquinas
  maquinas.forEach((m) => {
    const row = worksheet.addRow({
      id: `Máquina ${m.id || m.numero || '?'}`,
      color: m.color || 'Sin material',
      cantidad: m.cantidad || 0,
      manual: '', // Vacío para que escriban
      obs: ''
    });

    // 4. Resaltamos la celda manual en AMARILLO para que el pibe sepa dónde anotar
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

  // 5. Generamos el archivo con la fecha de hoy
  const buffer = await workbook.xlsx.writeBuffer();
  const fechaStr = new Date().toLocaleDateString().replace(/\//g, '-');
  saveAs(new Blob([buffer]), `Planilla_GST3D_${fechaStr}.xlsx`);
};