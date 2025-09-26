// src/services/reportGeneratorService.ts
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";

// Carga perezosa de XLSX que funciona con Vite/ESM y también con un <script> CDN.
// - Si tienes el paquete: npm i xlsx
// - O agrega en index.html: <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>

let XLSXRef: any | null = null;

async function getXLSX(): Promise<any> {
  if (XLSXRef) return XLSXRef;
  try {
    // ESM dinámico (funciona en Vite)
    XLSXRef = await import("xlsx");
    return XLSXRef;
  } catch {
    const w = (window as any) || {};
    if (w.XLSX) {
      XLSXRef = w.XLSX;
      return XLSXRef;
    }
    throw new Error(
      'No se encontró la librería XLSX. Instala "xlsx" (npm i xlsx) o añade el script CDN en index.html.'
    );
  }
}

export async function exportMatchesToExcel(
  result: MatchOutput,
  decisions: DecisionMap = {},
  comments: Record<string, string> = {},
  filename = "matches.xlsx"
): Promise<void> {
  const XLSX = await getXLSX();

  const rows = result.matches.map((m) => {
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
      "Validación":    validacion,
      "Comentarios":   comment,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "MATCHES");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  // descargar
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

