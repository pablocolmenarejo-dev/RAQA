// src/components/ClientTable.tsx
import React from "react"; 
import type { MatchRecord } from "@/types";
import type { DecisionMap, Decision } from "./ValidationWizard"; 
import { makeMatchKey } from "./ValidationWizard";

interface Props {
  data: (MatchRecord & { __decision?: Decision; __comment?: string })[];
  decisions: DecisionMap;
  comments?: Record<string, string>;
}

/**
 * Resalta "U.83 Farmacia" en un texto dado.
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
                    {index < parts.length - 1 && <strong style={{color: '#c62828', background: '#ffebee'}}>{searchTerm}</strong>}
                </React.Fragment>
            ))}
        </React.Fragment>
    );
}

// --- Funciones de Estilo ---
function rowBg(dec?: Decision): string | undefined { 
    if (dec === "ACCEPTED") return "#e8f5e9"; 
    if (dec === "REJECTED") return "#ffebee"; 
    return undefined; 
}
function tierBadgeStyle(tier: string): React.CSSProperties { 
    const base: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700, }; 
    if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" }; 
    if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" }; 
    return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" }; 
}

// --- ✅ Estilos de la Tabla (Actualizados) ---
const th: React.CSSProperties = { 
  textAlign: "left", 
  borderBottom: "2px solid var(--meisys-border)", 
  padding: "10px 8px", 
  background: "#f8f9fa", // Fondo de cabecera más limpio
  position: "sticky", 
  top: 0, 
  zIndex: 1, 
  fontFamily: "var(--font-sans)", // Fuente Sans-serif
  fontSize: 12,
  fontWeight: 700,
  color: "var(--meisys-text-secondary)", // Color de texto de cabecera
  textTransform: "uppercase",
  letterSpacing: '0.5px',
};
const td: React.CSSProperties = { 
  borderBottom: "1px solid var(--meisys-border)", 
  padding: "8px", 
  verticalAlign: "top", 
  fontSize: 13,
  color: "var(--meisys-text)",
};
// --- ✅ Fin Estilos ---


export default function ClientTable({ data }: Props) {
  // agrupado por Customer
  const groups: Record<string, (typeof data)[number][]> = {};
  for (const m of data) {
    const k = String(m.PRUEBA_customer ?? "");
    (groups[k] ??= []).push(m);
  }

  return (
    <div>
      {Object.entries(groups).map(([cust, rows], gi) => (
        <div key={gi} style={{ marginTop: gi === 0 ? 0 : 32 }}>
          {/* --- ✅ Título de Grupo Actualizado --- */}
          <h3 style={{ 
            margin: "0 0 16px 0",
            fontFamily: "var(--font-serif)",
            fontSize: 22,
            color: "var(--meisys-blue)",
            borderBottom: '1px solid var(--meisys-border)',
            paddingBottom: '8px'
          }}>
            {cust || "SIN CUSTOMER"}
          </h3>
          {/* --- Fin Título --- */}
          
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
              <thead>
                <tr>
                   <th style={th}>PRUEBA_nombre</th> 
                   <th style={th}>PRUEBA_street</th> 
                   <th style={th}>PRUEBA_city</th> 
                   <th style={th}>PRUEBA_cp</th> 
                   <th style={th}>MIN_nombre</th> 
                   <th style={th}>MIN_via</th> 
                   <th style={th}>MIN_num</th> 
                   <th style={th}>MIN_municipio</th> 
                   <th style={th}>MIN_cp</th> 
                   <th style={th}>SCORE</th> 
                   <th style={th}>TIER</th> 
                   <th style={th}>Fuente</th> 
                   <th style={th}>Código centro (C)</th> 
                   <th style={th}>Fecha última aut. (Y)</th> 
                   <th style={th}>Oferta asistencial (AC)</th> 
                   <th style={th}>Validación</th> 
                   <th style={th}>Comentarios</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={i} style={{ background: rowBg(m.__decision) }}>
                     <td style={td}>{m.PRUEBA_nombre}</td> 
                     <td style={td}>{m.PRUEBA_street}</td> 
                     <td style={td}>{m.PRUEBA_city}</td> 
                     <td style={td}>{m.PRUEBA_cp ?? ""}</td> 
                     <td style={td}>{m.MIN_nombre ?? ""}</td> 
                     <td style={td}>{m.MIN_via ?? ""}</td> 
                     <td style={td}>{m.MIN_num ?? ""}</td> 
                     <td style={td}>{m.MIN_municipio ?? ""}</td> 
                     <td style={td}>{m.MIN_cp ?? ""}</td> 
                     <td style={td}>{m.SCORE.toFixed(3)}</td> 
                     <td style={td}><span style={tierBadgeStyle(m.TIER)}>{m.TIER}</span></td> 
                     <td style={td}>{m.MIN_source ?? ""}</td> 
                     <td style={td}>{m.MIN_codigo_centro ?? ""}</td> 
                     <td style={td}>{m.MIN_fecha_autoriz ?? ""}</td>
                    <td style={td}>{highlightPharmacy(m.MIN_oferta_asist)}</td>
                    <td style={td}>
                      {m.__decision === "ACCEPTED" ? "ACEPTADA"
                        : m.__decision === "REJECTED" ? "RECHAZADA"
                        : m.__decision === "STANDBY" ? "STANDBY"
                        : ""}
                    </td>
                    <td style={{ ...td, maxWidth: 380, whiteSpace: "pre-wrap", fontSize: 12 }}>{m.__comment ?? ""}</td>
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
