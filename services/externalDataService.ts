// services/externalDataService.ts
declare const XLSX: any;

const parseExcelToJson = (arrayBuffer: ArrayBuffer): any[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

export const fetchAndParseExternalDatabases = async (): Promise<{
  centros_c1: any[]; centros_c2: any[]; centros_c3: any[]; establecimientos_e: any[];
}> => {
  // Llamada a TU función (gracias al redirect en netlify.toml)
  const res = await fetch('/api/fetch-external-data');
  if (!res.ok) {
    // Propaga el detalle del serverless para diagnosticar
    let detalle = '';
    try { detalle = JSON.stringify(await res.json()); } catch {}
    throw new Error(`Carga de bases fallida (HTTP ${res.status}) ${detalle}`);
  }

  const data = await res.json() as Record<'centros_c1'|'centros_c2'|'centros_c3'|'establecimientos_e', string>;

  const b64ToArrayBuffer = (b64: string) => {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  };

  return {
    centros_c1:         parseExcelToJson(b64ToArrayBuffer(data.centros_c1)),
    centros_c2:         parseExcelToJson(b64ToArrayBuffer(data.centros_c2)),
    centros_c3:         parseExcelToJson(b64ToArrayBuffer(data.centros_c3)),
    establecimientos_e: parseExcelToJson(b64ToArrayBuffer(data.establecimientos_e)),
  };
};
