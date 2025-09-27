// src/services/reportGeneratorService.ts
import type { MatchOutput, MatchRecord } from "@/types";

// Deducción segura de XLSX desde el script del CDN
function getXLSX(): any {
  // @ts-ignore
  const xlsx = (window as any)?.XLSX;
  if (!xlsx) {
    throw new Error(
      'No se encontró XLSX en window. Asegúrate de tener en index.html: <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>'
    );
  }
  return xlsx;
}

// Normaliza a string el nombre de archivo para evitar "lastIndexOf is not a function"
function normalizeFilename(name?: unknown): string {
  const fallback = "matches.xlsx";
  if (typeof name === "string" && name.trim()) return name.trim();
  try {
    return String(name || fallback);
  } catch {
    return fallback;
  }
}

/**
 * Exporta a Excel las coincidencias.
 * Lee columnas del objeto MatchRecord y añade:
 *  - Validación (si la fila trae __decision)
 *  - Comentarios (si la fila trae __comment)
 *
 * ACEPTA:
 *  - result: MatchOutput (lo típico)
 *  - filename: nombre de archivo (cualquier cosa -> se fuerza a string)
 *
 * NOTA: si quieres que salgan Validación/Comentarios, pasa los "matches"
 * ANOTADOS (los que usas en la tabla) a esta función, o añade __decision/__comment
 * a result.matches antes de exportar.
 */
export function exportMatchesToExcel(
  result: MatchOutput,
  filename?: unknown
): void {
  try {
    const XLSX = getXLSX();
    const fname = normalizeFilename(filename);

    const rows: any[] = (result?.matches ?? []).map((m: MatchRecord & {
      __decision?: string;
      __comment?: string;
    }) => {
      return {
        // PRUEBA
        "Customer": m.PRUEBA_customer ?? "",
        "PRUEBA_nombre": m.PRUEBA_nombre ?? "",
        "PRUEBA_street": m.PRUEBA_street ?? "",
        "PRUEBA_city": m.PRUEBA_city ?? "",
        "PRUEBA_cp": m.PRUEBA_cp ?? "",

        // MINISTERIO
        "MIN_nombre": m.MIN_nombre ?? "",
        "MIN_via": m.MIN_via ?? "",
        "MIN_num": m.MIN_num ?? "",
        "MIN_municipio": m.MIN_municipio ?? "",
        "MIN_cp": m.MIN_cp ?? "",

        // Score y clasif
        "SCORE": typeof m.SCORE === "number" ? Number(m.SCORE.toFixed(3)) : m.SCORE,
        "TIER": m.TIER ?? "",

        // Fuente y claves
        "Fuente": (m as any).MIN_source ?? "",
        "Código centro (C)": (m as any).MIN_codigo_centro ?? "",
        "Fecha última aut. (Y)": (m as any).MIN_fecha_autoriz ?? "",
        "Oferta asistencial (AC)": (m as any).MIN_oferta_asist ?? "",

        // Validación y comentarios (si existen en la fila anotada)
        "Validación": m.__decision ?? "",
        "Comentarios": (m as any).__comment ?? "",
      };
    });

    // Crea el libro y hoja
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });

    // Ajuste de anchos simples (opcional)
    const headers = Object.keys(rows[0] || {
      "Customer": "", "PRUEBA_nombre": "", "PRUEBA_street": "", "PRUEBA_city": "", "PRUEBA_cp": "",
      "MIN_nombre": "", "MIN_via": "", "MIN_num": "", "MIN_municipio": "", "MIN_cp": "",
      "SCORE": "", "TIER": "",
      "Fuente": "", "Código centro (C)": "", "Fecha última aut. (Y)": "", "Oferta asistencial (AC)": "",
      "Validación": "", "Comentarios": "",
    });
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, "RESULTADOS");
    XLSX.writeFile(wb, fname); // <- necesita string, ya forzado arriba

  } catch (err: any) {
    console.error("[exportMatchesToExcel] Error:", err);
    alert(err?.message || "Error exportando a Excel");
  }
}

/**
 * Variante que recibe directamente el array de filas **anotadas** (con __decision/__comment).
 * Úsala si ya tienes en memoria la tabla que pintas.
 */
export function exportAnnotatedToExcel(
  matches: (MatchRecord & { __decision?: string; __comment?: string })[],
  filename?: unknown
): void {
  try {
    const XLSX = getXLSX();
    const fname = normalizeFilename(filename);

    const rows = (matches ?? []).map((m) => ({
      "Customer": m.PRUEBA_customer ?? "",
      "PRUEBA_nombre": m.PRUEBA_nombre ?? "",
      "PRUEBA_street": m.PRUEBA_street ?? "",
      "PRUEBA_city": m.PRUEBA_city ?? "",
      "PRUEBA_cp": m.PRUEBA_cp ?? "",
      "MIN_nombre": m.MIN_nombre ?? "",
      "MIN_via": m.MIN_via ?? "",
      "MIN_num": m.MIN_num ?? "",
      "MIN_municipio": m.MIN_municipio ?? "",
      "MIN_cp": m.MIN_cp ?? "",
      "SCORE": typeof m.SCORE === "number" ? Number(m.SCORE.toFixed(3)) : m.SCORE,
      "TIER": m.TIER ?? "",
      "Fuente": (m as any).MIN_source ?? "",
      "Código centro (C)": (m as any).MIN_codigo_centro ?? "",
      "Fecha última aut. (Y)": (m as any).MIN_fecha_autoriz ?? "",
      "Oferta asistencial (AC)": (m as any).MIN_oferta_asist ?? "",
      "Validación": m.__decision ?? "",
      "Comentarios": (m as any).__comment ?? "",
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
    const headers = Object.keys(rows[0] || {});
    ws["!cols"] = headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(wb, ws, "RESULTADOS");
    XLSX.writeFile(wb, fname);

  } catch (err: any) {
    console.error("[exportAnnotatedToExcel] Error:", err);
    alert(err?.message || "Error exportando a Excel");
  }
}
