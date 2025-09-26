// Lee PRUEBA como objetos y los Excel del Ministerio como AoA (matriz) para preservar posiciones reales de columnas.
let XLSXRef: any;
try { XLSXRef = require("xlsx"); } catch { XLSXRef = (window as any).XLSX; }
if (!XLSXRef) {
  throw new Error(
    'No se encontró XLSX. Instala "xlsx" (npm i xlsx) o inclúyela en index.html (<script src="...xlsx.full.min.js"></script>).'
  );
}

function pickFirstSheet(wb: any): any {
  if (wb && Array.isArray(wb.SheetNames) && wb.SheetNames.length) return wb.Sheets[wb.SheetNames[0]];
  throw new Error("El libro XLSX no contiene hojas.");
}

function sheetToAoA(sheet: any): any[][] {
  const aoa = XLSXRef.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  return aoa.filter((row: any[]) => row && row.some((v) => v !== null && v !== ""));
}

export async function parsePrueba(file: File): Promise<Record<string, any>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSXRef.read(buf, { type: "array" });
  const sheet = pickFirstSheet(wb);
  return XLSXRef.utils.sheet_to_json(sheet, { defval: null }) as Record<string, any>[];
}

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

