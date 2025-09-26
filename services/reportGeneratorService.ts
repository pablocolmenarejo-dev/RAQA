// src/services/reportGeneratorService.ts
// Exportador de resultados a Excel usando la librería "xlsx" (Opción A: npm i xlsx)

import type { MatchOutput, MatchRecord } from "@/types";

// Tipos flexibles para decisiones/comentarios:
// - decisions puede ser Record<key, "ACCEPTED"|"REJECTED"|"STANDBY">
// - o Record<key, { decision: "...", comment?: string }>
export type Decision = "ACCEPTED" | "REJECTED" | "STANDBY";
export type DecisionValue = Decision | { decision: Decision; comment?: string };
export type DecisionMapFlexible = Record<string, DecisionValue>;
export type CommentsMap = Record<string, string>;

// Clave estable por fila (debe coincidir con la usada en ValidationWizard/ClientTable)
export function makeMatchKey(m: MatchRecord): string {
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_nombre ?? "",
    m.MIN_cp ?? "",
    m.MIN_source ?? ""
  ].join("||");
}

// Normaliza a { decision, comment }
function readDecisionAndComment(
  dval: DecisionValue | undefined,
  comments?: string | undefined
): { decision?: Decision; comment?: string } {
  if (!dval && !comments) return {};
  if (typeof dval === "string") {
    return { decision: dval, comment: comments };
  }
  if (dval && typeof dval === "object") {
    return { decision: dval.decision, comment: dval.comment ?? comments };
  }
  return { comment: comments };
}

export async function exportMatchesToExcel(
  result: MatchOutput,
  filename = "matches.xlsx",
  // opcionales: si los pasas, añadimos "Validación" y "Comentarios" por fila
  decisions?: DecisionMapFlexible,
  commentsMap?: CommentsMap
) {
  // Carga dinámica de la librería instalada con npm i xlsx
  const XLSX = await import("xlsx");

  const rows = result?.matches ?? [];
  if (!rows.length) {
    alert("No hay resultados para exportar.");
    return;
  }

  // Construimos las filas a exportar (una hoja única)
  const data = rows.map((m) => {
    const key = makeMatchKey(m);
    const commentFromMap = commentsMap ? commentsMap[key] : undefined;
    const { decision, comment } = readDecisionAndComment(decisions?.[key], commentFromMap);

    return {
      // PRUEBA
      "Customer":                m.PRUEBA_customer ?? "",
      "PRUEBA_nombre":           m.PRUEBA_nombre ?? "",
      "PRUEBA_street":           m.PRUEBA_street ?? "",
      "PRUEBA_city":             m.PRUEBA_city ?? "",
      "PRUEBA_cp":               m.PRUEBA_cp ?? "",
      "PRUEBA_num":              m.PRUEBA_num ?? "",

      // MINISTERIO (mejor match)
      "MIN_nombre":              m.MIN_nombre ?? "",
      "MIN_via":                 m.MIN_via ?? "",
      "MIN_num":                 m.MIN_num ?? "",
      "MIN_municipio":           m.MIN_municipio ?? "",
      "MIN_cp":                  m.MIN_cp ?? "",

      // Trazabilidad
      "Fuente":                  m.MIN_source ?? "",
      "Código centro (C)":       m.MIN_codigo_centro ?? "",
      "Fecha última aut. (Y)":   m.MIN_fecha_autoriz ?? "",
      "Oferta asistencial (AC)": m.MIN_oferta_asist ?? "",

      // Scoring
      "SCORE":                   typeof m.SCORE === "number" ? Number(m.SCORE.toFixed(3)) : m.SCORE,
      "TIER":                    m.TIER ?? "",

      // Validación
      "Validación":              decision ? (
                                  decision === "ACCEPTED" ? "ACEPTADA" :
                                  decision === "REJECTED" ? "RECHAZADA" :
                                  "STANDBY"
                                ) : "",
      "Comentarios":             comment ?? ""
    };
  });

  const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RESULTADOS");

  // Ajuste simple de anchos según encabezados
  const headers = Object.keys(data[0] || {});
  (ws as any)["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length + 2, 18), 60) }));

  XLSX.writeFile(wb, filename);
}
