// src/services/reportGeneratorService.ts
import type { MatchOutput, MatchRecord } from "@/types";

// Importar XLSX desde la dependencia instalada (npm i xlsx)
import * as XLSX from "xlsx";

/**
 * Clave estable para cruzar decisiones/comentarios con los matches.
 * Debe ser idéntica a la usada en ValidationWizard.
 */
function makeMatchKey(m: MatchRecord): string {
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join("||"); // <-- CORREGIDO (5 campos, separador "||")
}

/**
 * Convierte el texto interno de decisión a etiqueta para el Excel.
 */
function decisionToLabel(d?: string): string {
  if (d === "ACCEPTED") return "ACEPTADA";
  if (d === "REJECTED") return "RECHAZADA";
  if (d === "STANDBY")  return "PENDIENTE";
  return "";
}

/**
 * Exporta TODO el resultado a un .xlsx con las columnas visibles,
 * añadiendo “Validación” y “Comentarios”.
 *
 * @param result     Resultado del matching (matches/top3/summary)
 * @param decisions  Mapa de decisiones (key -> "ACCEPTED"|"REJECTED"|"STANDBY")
 * @param comments   Mapa de comentarios (key -> string)
 * @param filename   Nombre del archivo a descargar (string)
 */
export async function exportMatchesToExcel(
  result: MatchOutput,
  decisions: Record<string, "ACCEPTED" | "REJECTED" | "STANDBY" | undefined>,
  comments: Record<string, string>,
  filename = "matches.xlsx"
): Promise<void> {
  const rows = result.matches ?? [];

  // Construir filas "planas" para la hoja (una por match)
  const data = rows.map((m) => {
    // Prioriza anotaciones inline si existen; si no, usa los mapas
    const key = makeMatchKey(m); // <-- Esta llamada ahora usará la clave correcta
    const dInline = (m as any).__decision as (string | undefined);
    const cInline = (m as any).__comment as (string | undefined);

    const decision = dInline ?? decisions?.[key];
    const comment  = cInline ?? comments?.[key] ?? "";

    return {
      // PRUEBA
      "Customer":                m.PRUEBA_customer ?? "",
      "PRUEBA_nombre":           m.PRUEBA_nombre ?? "",
      "PRUEBA_street":           m.PRUEBA_street ?? "",
      "PRUEBA_city":             m.PRUEBA_city ?? "",
      "PRUEBA_cp":               m.PRUEBA_cp ?? "",
      "PRUEBA_num":              m.PRUEBA_num ?? "",

      // MINISTERIO
      "MIN_nombre":              m.MIN_nombre ?? "",
      "MIN_via":                 m.MIN_via ?? "",
      "MIN_num":                 m.MIN_num ?? "",
      "MIN_municipio":           m.MIN_municipio ?? "",
      "MIN_cp":                  m.MIN_cp ?? "",
      "SCORE":                   Number(m.SCORE ?? 0),
      "TIER":                    m.TIER ?? "",
      "Fuente":                  m.MIN_source ?? "",

      // Claves que pediste (C/Y/AC)
      "Código centro (C)":       m.MIN_codigo_centro ?? "",
      "Fecha última aut. (Y)":   m.MIN_fecha_autoriz ?? "",
      "Oferta asistencial (AC)": m.MIN_oferta_asist ?? "",

      // Validación y comentarios
      "Validación":              decisionToLabel(decision), // <-- Ahora se rellenará
      "Comentarios":             comment,                   // <-- Ahora se rellenará
    };
  });

  // Crear libro y hoja
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });

  // Opcional: ajustar anchuras básicas
  const headers = Object.keys(data[0] ?? {
    "Customer": "", "PRUEBA_nombre": "", "PRUEBA_street": "", "PRUEBA_city": "",
    "PRUEBA_cp": "", "PRUEBA_num": "", "MIN_nombre": "", "MIN_via": "", "MIN_num": "",
    "MIN_municipio": "", "MIN_cp": "", "SCORE": "", "TITULO": "", "Fuente": "",
    "Código centro (C)": "", "Fecha última aut. (Y)": "", "Oferta asistencial (AC)": "",
    "Validación": "", "Comentarios": "",
  });

  ws["!cols"] = headers.map((h) => {
    // Anchura aproximada por encabezado
    const base = Math.max(12, h.length + 2);
    // Dar un poco más a campos largos:
    if (["PRUEBA_nombre","MIN_nombre","Oferta asistencial (AC)","Comentarios"].includes(h)) {
      return { wch: Math.max(base, 40) };
    }
    if (["PRUEBA_street","MIN_via"].includes(h)) {
      return { wch: Math.max(base, 28) };
    }
    return { wch: base };
  });

  XLSX.utils.book_append_sheet(wb, ws, "MATCHES");

  // Escribir a ArrayBuffer y disparar descarga (nombre de archivo STRING)
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = typeof filename === "string" ? filename : "matches.xlsx";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}
