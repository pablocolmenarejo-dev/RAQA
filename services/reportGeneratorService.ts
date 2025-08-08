import { Client, ValidationResult } from '../types';

declare const XLSX: any;
declare const html2canvas: any;

export const generatePdfReport = async () => {
  const reportElement = document.getElementById('report-content');
  if (!reportElement) {
    console.error("No se pudo encontrar el elemento del informe para capturar.");
    return;
  }

  // Ocultar los botones temporalmente para que no aparezcan en la captura
  const buttons = reportElement.querySelectorAll('button');
  buttons.forEach(btn => btn.style.visibility = 'hidden');

  try {
    const canvas = await html2canvas(reportElement, {
      scale: 2, // Aumenta la resolución de la captura para mayor calidad
      useCORS: true,
      backgroundColor: '#ffffff', // Fondo blanco para la captura
    });

    const imgData = canvas.toDataURL('image/png');

    // **LA CORRECCIÓN CLAVE ESTÁ AQUÍ**
    // Se accede al constructor jsPDF directamente desde el objeto global window.jspdf
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = doc.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calcular la relación de aspecto para que la imagen no se deforme
    const ratio = canvasWidth / canvasHeight;
    const finalHeight = pdfWidth / ratio;

    // Comprobamos que la altura no exceda la del PDF para evitar errores
    const pageHeight = doc.internal.pageSize.getHeight();
    if (finalHeight > pageHeight) {
      console.warn("El contenido es más largo que una página A4, puede que se corte.");
    }

    doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight > pageHeight ? pageHeight : finalHeight);
    doc.save('PharmaClient_Validation_Report.pdf');

  } catch (error) {
    console.error("Error al generar el PDF:", error);
  } finally {
    // Asegurarnos de que los botones siempre vuelvan a ser visibles, incluso si hay un error
    buttons.forEach(btn => btn.style.visibility = 'visible');
  }
};

export const generateExcelReport = (results: ValidationResult[], clients: Client[]) => {
  const clientMap = new Map(clients.map(c => [c.id, c]));

  const dataForSheet = results.map(result => {
    const client = clientMap.get(result.clientId);
    return {
      'Client ID': client?.id,
      'Input Street': client?.STREET,
      'Input City': client?.CITY,
      'Input Info 1': client?.INFO_1,
      'Input Info 2': client?.INFO_2,
      'Input CIF/NIF': client?.CIF_NIF,
      'Enriched Province': client?.PROVINCIA,
      'Enriched CCAA': client?.CCAA,
      'Validation Status': result.status,
      'Validation Reason': result.reason,
      'Official Name Found': result.officialData?.officialName,
      'Official Address Found': result.officialData?.officialAddress,
      'Official CIF Found': result.officialData?.cif,
      'Source Database': result.officialData?.sourceDB,
      'Evidence URL': result.officialData?.evidenceUrl,
    };
  });

  const ws = XLSX.utils.json_to_sheet(dataForSheet);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Validation Results");
  XLSX.writeFile(wb, "PharmaClient_Validation_Details.xlsx");
};
