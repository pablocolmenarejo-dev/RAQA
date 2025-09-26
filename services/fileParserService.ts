// src/services/fileParserService.ts
// Lectura de Excel. PRUEBA → objetos; Ministerio → matriz (AoA) para conservar posiciones (columnas por letra).

let XLSXRef: any;
try { XLSXRef = require("xlsx"); } catch { XLSXRef = (window as any).XLSX; }
if (!XLSXRef) {
  throw new Error(
    'No se encontró la librería XLSX. Instala "xlsx" (npm i xlsx) o inclúyela en index.html como <script src="...xlsx.full.min.js"></script>.'
  );
}

function pickFirstSheet(wb: any): any {
  if (wb && Array.isArray(wb.SheetNames) && wb.SheetNames.length) {
    return wb.Sheets[wb.SheetNames[0]];
  }
  throw new Error("El libro XLSX no contiene hojas.");
}

function sheetToAoA(sheet: any): any[][] {
  // header:1 → matriz (incluye cabecera como primera fila) sin reordenar columnas
  const aoa = XLSXRef.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  // limpia filas totalmente vacías al final
  return aoa.filter((row: any[]) => row && row.some((v) => v !== null && v !== ""));
}

// --- PRUEBA: a objetos (como ya venías usando en la UI) ---
export async function parsePrueba(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSXRef.read(buf, { type: "array" });
  const sheet = pickFirstSheet(wb);
  // A objetos: conserva todas las columnas visibles; matchingService se encarga del mapeo
  const rows = XLSXRef.utils.sheet_to_json(sheet, { defval: null });
  return rows as Record<string, any>[];
}

// --- Ministerio: devolvemos AoA para mapear por letras (posición real) ---
export async function parseMinisterioAoA(file: File): Promise<{ source: string; aoa: any[][] }> {
  const buf = await file.arrayBuffer();
  const wb = XLSXRef.read(buf, { type: "array" });
  const sheet = pickFirstSheet(wb);
  const aoa = sheetToAoA(sheet);
  return { source: file.name, aoa };
}

export async function parseMultipleMinisteriosAoA(files: File[]): Promise<Record<string, any[][]>> {
  const out: Record<string, any[][]> = {};
  for (const f of files) {
    const { source, aoa } = await parseMinisterioAoA(f);
    out[source] = aoa;
  }
  return out;
}
