// src/components/ClientTable.tsx
import React, { useMemo } from "react";
import type { MatchRecord } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

interface Props {
  data: (MatchRecord & { __decision?: string })[];
  decisions?: DecisionMap;
}

export default function ClientTable({ data, decisions = {} }: Props) {
  const byCustomer = useMemo(() => {
    const map = new Map<string, (MatchRecord & { __decision?: string })[]>();
    for (const r of data) {
      const k = String(r.PRUEBA_customer ?? "—");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return map;
  }, [data]);

  const th = { textAlign: "left" as const, borderBottom: "2px solid #ddd", padding: "8px 6px", background: "#f7f7f7" };
  const td = { borderBottom: "1px solid #eee", padding: "6px", verticalAlign: "top" as const };

  const badge = (txt: string, bg: string, color: string) => (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{txt}</span>
  );

  const decisionBadge = (m: MatchRecord) => {
    const d = decisions[makeMatchKey(m)];
    if (d === "ACCEPTED") return badge("ACEPTADA", "#e8f5e9", "#2e7d32");
    if (d === "REJECTED") return badge("RECHAZADA", "#ffebee", "#c62828");
    if (d === "STANDBY")  return badge("STANDBY",  "#fff8e1", "#f57f17");
    return null;
  };

  return (
    <section style={{ marginBottom: 24 }}>
      {[...byCustomer.entries()].map(([customer, rows]) => (
        <div key={customer} style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>{customer}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
                {rows.map((m, i) => (
                  <tr key={i}>
                    <td style={td}>{m.PRUEBA_nombre}</td>
                    <td style={td}>{m.PRUEBA_street}</td>
                    <td style={td}>{m.PRUEBA_city}</td>
                    <td style={td}>{m.PRUEBA_cp ?? ""}</td>
                    <td style={td}>{m.MIN_nombre ?? ""}</td>
                    <td style={td}>{m.MIN_via ?? ""}</td>
                    <td style={td}>{m.MIN_num ?? ""}</td>
                    <td style={td}>{m.MIN_municipio ?? ""}</td>
                    <td style={td}>{m.MIN_cp ?? ""}</td>
                    <td style={td}>{Number(m.SCORE).toFixed(3)}</td>
                    <td style={td}>
                      {m.TIER === "ALTA"   && badge("ALTA",   "#e8f5e9", "#2e7d32")}
                      {m.TIER === "REVISAR"&& badge("REVISAR","#fff8e1", "#f57f17")}
                      {m.TIER === "SIN"    && badge("SIN",    "#ffebee", "#c62828")}
                    </td>
                    <td style={td}>{(m as any).MIN_source ?? ""}</td>
                    <td style={td}>{(m as any).MIN_codigo_centro ?? ""}</td>
                    <td style={td}>{(m as any).MIN_fecha_autoriz ?? ""}</td>
                    <td style={td}>{(m as any).MIN_oferta_asist ?? ""}</td>
                    <td style={td}>{decisionBadge(m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
