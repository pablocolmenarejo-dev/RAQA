// services/fileParserService.ts
// Lectura de Excel en frontend (PRUEBA + Ministerios). Devuelve filas crudas y conserva el nombre del archivo.

let XLSXRef: any;

// 1) Detectar XLSX de forma robusta (npm o script global)
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  XLSXRef = require('xlsx'); // Vite/Node-style
} catch {
  // @ts-ignore
  XLSXRef = (window as any).XLSX;
}
if (!XLSXRef) {
  throw new Error(
    'No se encontró la librería XLSX. Instala "xlsx" (npm i xlsx) o inclúyela en index.html como <script src="...xlsx.full.min.js"></script>.'
  );
}

// 2) Helpers de lectura
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function sheetToJson(sheet: any): Record<string, any>[] {
  // header: 1 = primera fila como encabezados; defval para no perder celdas vacías
  return XLSXRef.utils.sheet_to_json(sheet, { defval: null });
}

function pickFirstNonEmptySheet(wb: any): any {
  // Si hay varias hojas, usamos la primera que tenga contenido > 0
  for (const name of wb.SheetNames) {
    const sh = wb.Sheets[name];
    const range = XLSXRef.utils.decode_range(sh['!ref'] || 'A1:A1');
    const rows = range.e.r - range.s.r + 1;
    const cols = range.e.c - range.s.c + 1;
    if (rows > 1 && cols > 1) return sh;
  }
  // fallback: primera
  return wb.Sheets[wb.SheetNames[0]];
}

// 3) Normalización ligera de cabeceras (opcional, sin transformar valores)
function normalizeHeaders(rows: Record<string, any>[]): Record<string, any>[] {
  if (!rows.length) return rows;
  const first = rows[0];
  const keys = Object.keys(first);
  const map: Record<string, string> = {};
  for (const k of keys) {
    if (!k) continue;
    const nk = String(k).replace(/\s+/g, ' ').trim();
    map[k] = nk;
  }
  return rows.map((r) => {
    const o: Record<string, any> = {};
    for (const [k, v] of Object.entries(r)) {
      const nk = map[k] ?? k;
      o[nk] = v;
    }
    return o;
  });
}

// 4) Parse PRUEBA.xlsx → filas crudas
export async function parsePrueba(file: File): Promise<Record<string, any>[]> {
  const buf = await fileToArrayBuffer(file);
  const wb = XLSXRef.read(buf, { type: 'array' });
  const sheet = pickFirstNonEmptySheet(wb);
  const rows = sheetToJson(sheet);
  // No tocamos nombres de columnas; matchingService se encarga de buscarlas
  return normalizeHeaders(rows);
}

// 5) Parse 1 excel del Ministerio → { source, rows }
export async function parseMinisterio(file: File): Promise<{ source: string; rows: Record<string, any>[] }> {
  const buf = await fileToArrayBuffer(file);
  const wb = XLSXRef.read(buf, { type: 'array' });

  // Heurística: si la primera hoja no tiene cabeceras “útiles”, probar siguientes
  // (matchingService es robusto, pero esto ayuda cuando hay filas de cabecera desplazadas)
  let targetSheet = pickFirstNonEmptySheet(wb);

  // Convertir a objetos
  let rows = sheetToJson(targetSheet);
  rows = normalizeHeaders(rows);

  // Importante: NO transformamos valores (fechas, números, etc.). Devolvemos “tal cual”.
  return { source: file.name, rows };
}

// 6) Parse N excels del Ministerio → mapa source->rows
export async function parseMultipleMinisterios(files: File[]): Promise<Record<string, Record<string, any>[]>> {
  const out: Record<string, Record<string, any>[]> = {};
  for (const f of files) {
    const { source, rows } = await parseMinisterio(f);
    // Filtra filas totalmente vacías (todas las columnas null/empty)
    const clean = rows.filter((r) => Object.values(r).some((v) => v !== null && String(v).trim() !== ''));
    out[source] = clean;
  }
  return out;
}

