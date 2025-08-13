// services/externalDataService.ts
declare const XLSX: any;

// Convierte la primera hoja del Excel a JSON
const parseExcelToJson = (arrayBuffer: ArrayBuffer): any[] => {
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet);
};

// Llama a la función serverless (evita CORS) y parsea los 4 Excels
export const fetchAndParseExternalDatabases = async (): Promise<{
  centros: any[]; consultas: any[]; depositos: any[]; psicotropos: any[];
}> => {
  try {
    // Tu redirect en netlify.toml ya mapea /api/* -> /.netlify/functions/*
    const res = await fetch('/api/fetch-external-data');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as {
      centros: string; consultas: string; depositos: string; psicotropos: string;
    };

    // Decodificar base64 -> ArrayBuffer
    const b64ToArrayBuffer = (b64: string) => {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return bytes.buffer;
    };

    const centros    = parseExcelToJson(b64ToArrayBuffer(data.centros));
    const consultas  = parseExcelToJson(b64ToArrayBuffer(data.consultas));
    const depositos  = parseExcelToJson(b64ToArrayBuffer(data.depositos));
    const psicotropos= parseExcelToJson(b64ToArrayBuffer(data.psicotropos));

    return { centros, consultas, depositos, psicotropos };
  } catch (error) {
    console.error("Error al descargar o procesar las bases externas:", error);
    throw new Error("No se pudieron cargar las bases de datos de validación. Inténtalo de nuevo.");
  }
};
