// src/services/reportGeneratorService.ts
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";

// XLSX en navegador (igual que fileParserService)
let XLSXRef: any;
try { XLSXRef = require("xlsx"); } catch { XLSXRef = (window as any).XLSX; }
if (!XLSXRef) throw new Error('No se encontró XLSX. Instala "xlsx" o carga el script global.');

export function exportMatchesToExcel(
  result: MatchOutput,
  decisions: DecisionMap = {},
  comments: Record<string, string> = {},
  filename = "matches.xlsx"
) {
  const { matches } = result;

  const rows = matches.map((m) => {
    const key = [
      m.PRUEBA_customer ?? "",
      m.PRUEBA_nombre ?? "",
      m.PRUEBA_cp ?? "",
      m.MIN_codigo_centro ?? "",
      m.MIN_source ?? "",
    ].join("||");
    const dec = decisions[key];
    const comment = comments[key] ?? "";
    const validacion =
      dec === "ACCEPTED" ? "ACEPTADA" :
      dec === "REJECTED" ? "RECHAZADA" :
      dec === "STANDBY"  ? "STANDBY"  : "";

    return {
      "PRUEBA_nombre": m.PRUEBA_nombre,
      "PRUEBA_street": m.PRUEBA_street,
      "PRUEBA_city":   m.PRUEBA_city,
      "PRUEBA_cp":     m.PRUEBA_cp ?? "",
      "MIN_nombre":    m.MIN_nombre ?? "",
      "MIN_via":       m.MIN_via ?? "",
      "MIN_num":       m.MIN_num ?? "",
      "MIN_municipio": m.MIN_municipio ?? "",
      "MIN_cp":        m.MIN_cp ?? "",
      "SCORE":         Number(m.SCORE.toFixed(3)),
      "TIER":          m.TIER,
      "Fuente":        m.MIN_source ?? "",
      "Código centro (C)": m.MIN_codigo_centro ?? "",
      "Fecha última aut. (Y)": m.MIN_fecha_autoriz ?? "",
      "Oferta asistencial (AC)": m.MIN_oferta_asist ?? "",
      "Validación": validacion,
      "Comentarios": comment,
    };
  });

  const wb = XLSXRef.utils.book_new();
  const ws = XLSXRef.utils.json_to_sheet(rows);
  XLSXRef.utils.book_append_sheet(wb, ws, "MATCHES");

  const wbout = XLSXRef.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}
