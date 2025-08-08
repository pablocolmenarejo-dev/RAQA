
import { Client, ValidationResult, ValidationStatusValue } from '../types';

declare const jsPDF: any;
declare const XLSX: any;

export const generatePdfReport = (results: ValidationResult[], clients: Client[]) => {
  const doc = new jsPDF.default();
  
  doc.text("PharmaClient Validator - Assisted Validation Report", 14, 20);
  doc.setFontSize(10);
  doc.text(`Report generated on: ${new Date().toLocaleString()}`, 14, 26);

  const statusCounts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {} as Record<ValidationStatusValue, number>);
  
  let summaryText = 'Summary:\n';
  Object.entries(statusCounts).forEach(([status, count]) => {
    summaryText += `- ${status}: ${count}\n`;
  });
  doc.text(summaryText, 14, 40);

  const clientMap = new Map(clients.map(c => [c.id, c]));
  const tableColumn = ["Client Info", "Final Status", "Details"];
  const tableRows: (string|undefined)[][] = [];

  results.forEach(result => {
    const client = clientMap.get(result.clientId);
    const row = [
      client?.INFO_1 || client?.INFO_2 || `Client #${client?.id}`,
      result.status,
      result.reason
    ];
    tableRows.push(row);
  });

  doc.autoTable(tableColumn, tableRows, { startY: 60 });
  doc.save("PharmaClient_Validation_Report.pdf");
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
