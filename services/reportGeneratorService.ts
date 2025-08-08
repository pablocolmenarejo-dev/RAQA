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

  const canvas = await html2canvas(reportElement, {
    scale: 2, // Aumenta la resolución de la captura para mayor calidad
    useCORS: true,
    backgroundColor: '#ffffff', // Fondo blanco para la captura
  });

  // Volver a mostrar los botones
  buttons.forEach(btn => btn.style.visibility = 'visible');

  const imgData = canvas.toDataURL('image/png');

  // Usamos el constructor de jsPDF desde el objeto window para asegurar compatibilidad
  const doc = new (window as any).jspdf.jsPDF({
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
  const imgHeight = pdfWidth / ratio;

  // Si la altura de la imagen es mayor que la página, se ajustará. 
  // Para informes muy largos se necesitaría un enfoque de múltiples páginas,
  // pero para la mayoría de los casos esto es suficiente.
  let finalHeight = imgHeight;
  if (imgHeight > pdfHeight) {
    console.warn("El contenido es más largo que una página A4, puede que se corte.");
    finalHeight = pdfHeight;
  }

  doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, finalHeight);
  doc.save('PharmaClient_Validation_Report.pdf');
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
