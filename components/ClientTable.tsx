// src/components/ClientTable.tsx
import React from "react"; // Asegúrate de importar React
import type { MatchRecord } from "@/types";
import type { DecisionMap, Decision } from "./ValidationWizard"; // Importar Decision
// makeMatchKey no se usa directamente aquí, pero lo dejamos por si acaso
import { makeMatchKey } from "./ValidationWizard";

interface Props {
  data: (MatchRecord & { __decision?: Decision; __comment?: string })[];
  decisions: DecisionMap;
  comments?: Record<string, string>;
}

// --- NUEVA FUNCIÓN AUXILIAR (copiada de ValidationWizard) ---
/**
 * Resalta "U.83 Farmacia" en un texto dado.
 * @param text Texto completo de la oferta asistencial.
 * @returns Un fragmento de React con el texto resaltado.
 */
function highlightPharmacy(text: string | null | undefined): React.ReactNode {
    if (!text) return text;
    const searchTerm = "U.83 Farmacia";
    const parts = text.split(searchTerm);

    if (parts.length <= 1) {
        return text;
    }

    return (
        <React.Fragment>
            {parts.map((part, index) => (
                <React.Fragment key={index}>
                    {part}
                    {index < parts.length - 1 && <strong>{searchTerm}</strong>}
                </React.Fragment>
            ))}
        </React.Fragment>
    );
}
// --- FIN NUEVA FUNCIÓN ---

// ... (funciones rowBg y tierBadgeStyle sin cambios) ...
function rowBg(dec?: Decision): string | undefined { /* ... */ if (dec === "ACCEPTED") return "#e8f5e9"; if (dec === "REJECTED") return "#ffebee"; return undefined; }
function tierBadgeStyle(tier: string): React.CSSProperties { /* ... */ const base: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, }; if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" }; if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" }; return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" }; }

export default function ClientTable({ data }: Props) {
  // agrupado por Customer (sin cambios)
  const groups: Record<string, (typeof data)[number][]> = {};
  for (const m of data) {
    const k = String(m.PRUEBA_customer ?? "");
    (groups[k] ??= []).push(m);
  }

  return (
    <div>
      {Object.entries(groups).map(([cust, rows], gi) => (
        <div key={gi} style={{ marginTop: 24 }}>
          <h3 style={{ margin: "8px 0" }}>{cust || "SIN CUSTOMER"}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {/* ... (Cabeceras th sin cambios) ... */}
                   <th style={th}>PRUEBA_nombre</th> <th style={th}>PRUEBA_street</th> <th style={th}>PRUEBA_city</th> <th style={th}>PRUEBA_cp</th> <th style={th}>MIN_nombre</th> <th style={th}>MIN_via</th> <th style={th}>MIN_num</th> <th style={th}>MIN_municipio</th> <th style={th}>MIN_cp</th> <th style={th}>SCORE</th> <th style={th}>TIER</th> <th style={th}>Fuente</th> <th style={th}>Código centro (C)</th> <th style={th}>Fecha última aut. (Y)</th> <th style={th}>Oferta asistencial (AC)</th> <th style={th}>Validación</th> <th style={th}>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={i} style={{ background: rowBg(m.__decision) }}>
                    {/* ... (Celdas td anteriores sin cambios) ... */}
                     <td style={td}>{m.PRUEBA_nombre}</td> <td style={td}>{m.PRUEBA_street}</td> <td style={td}>{m.PRUEBA_city}</td> <td style={td}>{m.PRUEBA_cp ?? ""}</td> <td style={td}>{m.MIN_nombre ?? ""}</td> <td style={td}>{m.MIN_via ?? ""}</td> <td style={td}>{m.MIN_num ?? ""}</td> <td style={td}>{m.MIN_municipio ?? ""}</td> <td style={td}>{m.MIN_cp ?? ""}</td> <td style={td}>{m.SCORE.toFixed(3)}</td> <td style={td}><span style={tierBadgeStyle(m.TIER)}>{m.TIER}</span></td> <td style={td}>{m.MIN_source ?? ""}</td> <td style={td}>{m.MIN_codigo_centro ?? ""}</td> <td style={td}>{m.MIN_fecha_autoriz ?? ""}</td>
                    {/* ***** CAMBIO AQUÍ ***** */}
                    <td style={td}>{highlightPharmacy(m.MIN_oferta_asist)}</td>
                    {/* ***** FIN CAMBIO ***** */}
                    <td style={td}>
                      {m.__decision === "ACCEPTED" ? "ACEPTADA"
                        : m.__decision === "REJECTED" ? "RECHAZADA"
                        : m.__decision === "STANDBY" ? "STANDBY"
                        : ""}
                    </td>
                    <td style={{ ...td, maxWidth: 380, whiteSpace: "pre-wrap" }}>{m.__comment ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ... (Estilos th y td sin cambios) ...
const th: React.CSSProperties = { textAlign: "left", borderBottom: "2px solid #ddd", padding: "8px 6px", background: "#f7f7f7", position: "sticky", top: 0, zIndex: 1, };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "6px", verticalAlign: "top", };
