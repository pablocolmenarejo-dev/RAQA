// src/components/ClientTable.tsx
import React, { useMemo } from "react";
import type { MatchRecord } from "@/types";

/** Estados de validación que pintamos */
export type Decision = "ACCEPTED" | "REJECTED" | "STANDBY";
export type DecisionMap = Record<string, Decision | undefined>;

/** Clave estable de fila (igual que en ValidationWizard) */
function rowKey(m: MatchRecord): string {
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join(" | ");
}

interface Props {
  data: MatchRecord[];
  /** Mapa de decisiones para colorear filas */
  decisions?: DecisionMap;
}

export default function ClientTable({ data, decisions = {} }: Props) {
  // Agrupar por Customer (como tenías)
  const groups = useMemo(() => {
    const map = new Map<string, MatchRecord[]>();
    for (const r of data) {
      const k = String(r.PRUEBA_customer ?? "SIN CUSTOMER");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    // ordenar dentro del grupo por SCORE desc
    for (const [k, arr] of map) {
      arr.sort((a, b) => b.SCORE - a.SCORE);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [data]);

  const th: React.CSSProperties = {
    textAlign: "left",
    borderBottom: "2px solid #ddd",
    padding: "8px 6px",
    background: "#f7f7f7",
    position: "sticky",
    top: 0,
    zIndex: 1,
    fontSize: 13,
    whiteSpace: "nowrap",
  };

  const td: React.CSSProperties = {
    borderBottom: "1px solid #eee",
    padding: "8px 6px",
    verticalAlign: "top",
    fontSize: 13,
  };

  const badgeTier = (tier: string) => {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid transparent",
    };
    if (tier === "ALTA")
      return <span style={{ ...base, background: "#e8f5e9", color: "#2e7d32", borderColor: "#c8e6c9" }}>ALTA</span>;
    if (tier === "REVISAR")
      return <span style={{ ...base, background: "#fff8e1", color: "#f57f17", borderColor: "#ffe082" }}>REVISAR</span>;
    return <span style={{ ...base, background: "#ffebee", color: "#c62828", borderColor: "#ffcdd2" }}>SIN</span>;
  };

  const badgeDecision = (d?: Decision) => {
    const base: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid transparent",
    };
    if (d === "ACCEPTED")
      return <span style={{ ...base, background: "#e8f5e9", color: "#2e7d32", borderColor: "#c8e6c9" }}>ACEPTADA</span>;
    if (d === "REJECTED")
      return <span style={{ ...base, background: "#ffebee", color: "#c62828", borderColor: "#ffcdd2" }}>RECHAZADA</span>;
    if (d === "STANDBY")
      return <span style={{ ...base, background: "#fff8e1", color: "#f57f17", borderColor: "#ffe082" }}>STANDBY</span>;
    return null;
  };

  const rowStyleFromDecision = (d?: Decision): React.CSSProperties => {
    if (d === "ACCEPTED")
      return { background: "#f3fbf4", borderLeft: "4px solid #2e7d32" };
    if (d === "REJECTED")
      return { background: "#fff6f7", borderLeft: "4px solid #c62828" };
    if (d === "STANDBY")
      return { background: "#fffbf0", borderLeft: "4px solid #f57f17" };
    return {};
  };

  return (
    <div style={{ marginTop: 16 }}>
      {groups.map(([customer, rows]) => (
        <div key={customer} style={{ marginBottom: 28 }}>
          <h3 style={{ margin: "16px 0 8px 0" }}>{customer}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
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
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => {
                  const k = rowKey(m);
                  const d = decisions[k];
                  const rowStyle = rowStyleFromDecision(d);
                  return (
                    <tr key={i} style={rowStyle}>
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
                      <td style={td}>{badgeTier(m.TIER)}</td>
                      <td style={td}>{m.MIN_source ?? ""}</td>
                      <td style={td}>{m.MIN_codigo_centro ?? ""}</td>
                      <td style={td}>{m.MIN_fecha_autoriz ?? ""}</td>
                      <td style={td}>{m.MIN_oferta_asist ?? ""}</td>
                      <td style={td}>{badgeDecision(d)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
