// src/services/reportGeneratorService.ts
// Exporta a Excel la tabla visible de matches, incluyendo la columna "Validación".
// Usa SheetJS (xlsx). Detecta la librería tanto si está instalada por npm como si viene por <script>.

import type { MatchOutput, MatchRecord } from "@/types";

// ── Tipos de validación (deben coincidir con la app)
export type Decision = "ACCEPTED" | "REJECTED" | "STANDBY";
export type DecisionMap = Record<string, Decision | undefined>;

// Robust import de XLSX
let XLSXRef: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  XLSXRef = require("xlsx");         // npm i xlsx
} catch {
  // @ts-ignore
  XLSXRef = (window as any).XLSX;    // inyectado vía <script>
}
if (!XLSXRef) {
  throw new Error(
    'No se encontró la librería XLSX. Instala "xlsx" (npm i xlsx) o inclúyela en index.html como <script src="...xlsx.full.min.js"></script>.'
  );
}

/** Clave estable para emparejar un match con su decisión guardada */
function makeMatchKey(m: MatchRecord): string {
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join(" | ");
}

/** Mapea código interno → etiqueta para Excel */
function decisionLabel(d?: Decision): string {
  if (d === "ACCEPTED") return "ACEPTADA";
  if (d === "REJECTED") return "RECHAZADA";
  if (d === "STANDBY")  return "STANDBY";
  return ""; // sin validar
}

/** Exporta la tabla de resultados “tal cual se ve”, en el mismo orden de columnas + Validación */
export function exportMatchesToExcel(
  result: MatchOutput,
  decisions: DecisionMap = {},
  filename = "matches.xlsx"
) {
  const headers = [
    "PRUEBA_nombre",
    "PRUEBA_street",
    "PRUEBA_city",
    "PRUEBA_cp",
    "MIN_nombre",
    "MIN_via",
    "MIN_num",
    "MIN_municipio",
    "MIN_cp",
    "SCORE",
    "TIER",
    "Fuente",
    "Código centro (C)",
    "Fecha última aut. (Y)",
    "Oferta asistencial (AC)",
    "Validación",
  ];

  // Construimos filas en el orden exacto de headers
  const rows = (result?.matches ?? []).map((m) => {
    const key = makeMatchKey(m);
    const val = decisionLabel(decisions[key]);

    const row: Record<string, any> = {
      "PRUEBA_nombre":          m.PRUEBA_nombre ?? "",
      "PRUEBA_street":          m.PRUEBA_street ?? "",
      "PRUEBA_city":            m.PRUEBA_city ?? "",
      "PRUEBA_cp":              m.PRUEBA_cp ?? "",
      "MIN_nombre":             m.MIN_nombre ?? "",
      "MIN_via":                m.MIN_via ?? "",
      "MIN_num":                m.MIN_num ?? "",
      "MIN_municipio":          m.MIN_municipio ?? "",
      "MIN_cp":                 m.MIN_cp ?? "",
      "SCORE":                  typeof m.SCORE === "number" ? m.SCORE.toFixed(3) : "",
      "TIER":                   m.TIER ?? "",
      "Fuente":                 m.MIN_source ?? "",
      "Código centro (C)":      m.MIN_codigo_centro ?? "",
      "Fecha última aut. (Y)":  m.MIN_fecha_autoriz ?? "",
      "Oferta asistencial (AC)":m.MIN_oferta_asist ?? "",
      "Validación":             val,
    };
    return row;
  });

  // Hoja con cabecera en AOA para fijar el orden
  const ws = XLSXRef.utils.aoa_to_sheet([headers]);
  XLSXRef.utils.sheet_add_json(ws, rows, { origin: "A2", skipHeader: true });

  // Ancho de columnas (aproximado para legibilidad)
  ws["!cols"] = [
    { wch: 42 }, // PRUEBA_nombre
    { wch: 26 }, // PRUEBA_street
    { wch: 18 }, // PRUEBA_city
    { wch: 10 }, // PRUEBA_cp
    { wch: 40 }, // MIN_nombre
    { wch: 22 }, // MIN_via
    { wch: 8  }, // MIN_num
    { wch: 16 }, // MIN_municipio
    { wch: 10 }, // MIN_cp
    { wch: 8  }, // SCORE
    { wch: 10 }, // TIER
    { wch: 16 }, // Fuente
    { wch: 16 }, // Código centro
    { wch: 16 }, // Fecha última aut.
    { wch: 60 }, // Oferta asistencial
    { wch: 12 }, // Validación
  ];

  const wb = XLSXRef.utils.book_new();
  XLSXRef.utils.book_append_sheet(wb, ws, "Resultados");
  XLSXRef.writeFile(wb, filename);
}
