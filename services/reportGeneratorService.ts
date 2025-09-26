// services/reportGeneratorService.ts
// Exportación a Excel de resultados: Matches y Top-3 candidatos

import type { MatchOutput, MatchRecord, TopCandidate } from "@/types";

let XLSXRef: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  XLSXRef = require("xlsx");
} catch {
  // @ts-ignore
  XLSXRef = (window as any).XLSX;
}
if (!XLSXRef) {
  throw new Error(
    'No se encontró la librería XLSX. Instala "xlsx" (npm i xlsx) o inclúyela en index.html como <script src="...xlsx.full.min.js"></script>.'
  );
}

function toSheet(data: any[], headerOrder?: string[]) {
  // Si pasamos headerOrder, la usamos para fijar el orden de columnas
  if (headerOrder && headerOrder.length) {
    const normalized = data.map((row) => {
      const out: Record<string, any> = {};
      for (const key of headerOrder) out[key] = (row as any)[key] ?? null;
      return out;
    });
    return XLSXRef.utils.json_to_sheet(normalized, { skipHeader: false, header: headerOrder });
  }
  return XLSXRef.utils.json_to_sheet(data);
}

function downloadWorkbook(wb: any, filename: string) {
  XLSXRef.writeFile(wb, filename, { compression: true });
}

function fmtDateForFilename(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Genera un Excel con dos hojas:
 *  - "Matches": mejor coincidencia por fila de PRUEBA (SCORE/TIER + columnas C/Y/AC + MIN_source)
 *  - "Top3": hasta 3 candidatos por fila (ordenados por score)
 */
export function exportMatchesToExcel(result: MatchOutput, filename?: string) {
  const wb = XLSXRef.utils.book_new();

  // -------- Hoja 1: Matches --------
  const matchesHeader = [
    // PRUEBA
    "PRUEBA_customer",
    "PRUEBA_nombre",
    "PRUEBA_street",
    "PRUEBA_city",
    "PRUEBA_cp",
    "PRUEBA_num",
    // MIN (best)
    "MIN_nombre",
    "MIN_via",
    "MIN_num",
    "MIN_municipio",
    "MIN_cp",
    // Claves + fuente
    "MIN_codigo_centro", // C
    "MIN_fecha_autoriz", // Y
    "MIN_oferta_asist",  // AC
    "MIN_source",
    // Scoring
    "SCORE",
    "TIER"
  ];

  const matchesRows = result.matches.map((m: MatchRecord) => ({
    PRUEBA_customer: m.PRUEBA_customer ?? "",
    PRUEBA_nombre: m.PRUEBA_nombre,
    PRUEBA_street: m.PRUEBA_street,
    PRUEBA_city: m.PRUEBA_city,
    PRUEBA_cp: m.PRUEBA_cp ?? "",
    PRUEBA_num: m.PRUEBA_num ?? "",
    MIN_nombre: m.MIN_nombre ?? "",
    MIN_via: m.MIN_via ?? "",
    MIN_num: m.MIN_num ?? "",
    MIN_municipio: m.MIN_municipio ?? "",
    MIN_cp: m.MIN_cp ?? "",
    MIN_codigo_centro: m.MIN_codigo_centro ?? "",
    MIN_fecha_autoriz: m.MIN_fecha_autoriz ?? "",
    MIN_oferta_asist: m.MIN_oferta_asist ?? "",
    MIN_source: m.MIN_source ?? "",
    SCORE: Number(m.SCORE?.toFixed?.(4) ?? m.SCORE),
    TIER: m.TIER
  }));

  const shMatches = toSheet(matchesRows, matchesHeader);
  XLSXRef.utils.book_append_sheet(wb, shMatches, "Matches");

  // Auto width simple
  autoFitColumns(shMatches, matchesRows);

  // -------- Hoja 2: Top3 --------
  const topHeader = [
    // PRUEBA contexto
    "PRUEBA_nombre",
    "PRUEBA_cp",
    "PRUEBA_num",
    // Candidato
    "CAND_RANK",
    "CAND_SCORE",
    "CAND_MIN_nombre",
    "CAND_MIN_via",
    "CAND_MIN_num",
    "CAND_MIN_mun",
    "CAND_MIN_cp",
    "CAND_MIN_codigo_centro", // C
    "CAND_MIN_fecha_autoriz", // Y
    "CAND_MIN_oferta_asist",  // AC
    "CAND_MIN_source"
  ];

  const topRows = result.top3.map((t: TopCandidate) => ({
    PRUEBA_nombre: t.PRUEBA_nombre,
    PRUEBA_cp: t.PRUEBA_cp ?? "",
    PRUEBA_num: t.PRUEBA_num ?? "",
    CAND_RANK: t.CAND_RANK,
    CAND_SCORE: Number(t.CAND_SCORE?.toFixed?.(4) ?? t.CAND_SCORE),
    CAND_MIN_nombre: t.CAND_MIN_nombre ?? "",
    CAND_MIN_via: t.CAND_MIN_via ?? "",
    CAND_MIN_num: t.CAND_MIN_num ?? "",
    CAND_MIN_mun: t.CAND_MIN_mun ?? "",
    CAND_MIN_cp: t.CAND_MIN_cp ?? "",
    CAND_MIN_codigo_centro: t.CAND_MIN_codigo_centro ?? "",
    CAND_MIN_fecha_autoriz: t.CAND_MIN_fecha_autoriz ?? "",
    CAND_MIN_oferta_asist: t.CAND_MIN_oferta_asist ?? "",
    CAND_MIN_source: t.CAND_MIN_source ?? "",
  }));

  const shTop = toSheet(topRows, topHeader);
  XLSXRef.utils.book_append_sheet(wb, shTop, "Top3");
  autoFitColumns(shTop, topRows);

  // -------- Guardar --------
  const fname = filename || `matches_${fmtDateForFilename()}.xlsx`;
  downloadWorkbook(wb, fname);
}

// Ajuste básico de ancho de columnas según el contenido
function autoFitColumns(sheet: any, rows: any[]) {
  const obj = XLSXRef.utils.sheet_to_json(sheet, { header: 1 });
  const colCount = (obj[0] || []).length;
  const colWidths = Array(colCount).fill(10);

  for (const r of obj) {
    r.forEach((val: any, i: number) => {
      const len = String(val ?? "").length;
      colWidths[i] = Math.max(colWidths[i], Math.min(len + 2, 60)); // tope 60
    });
  }
  sheet["!cols"] = colWidths.map((wch: number) => ({ wch }));
}
