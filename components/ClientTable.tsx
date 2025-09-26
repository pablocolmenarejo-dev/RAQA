// components/ClientTable.tsx
import React, { useMemo } from "react";
import type { MatchRecord } from "@/types";

type Props = {
  /** Matches devueltos por el motor (result.matches) */
  data: MatchRecord[];
  /** (Opcional) filtrar por tier: "ALTA" | "REVISAR" | "SIN" */
  filterTier?: Array<MatchRecord["TIER"]>;
};

export default function ClientTable({ data, filterTier }: Props) {
  // 1) Filtrar por tier si se solicita
  const filtered = useMemo(() => {
    if (!filterTier || filterTier.length === 0) return data ?? [];
    const set = new Set(filterTier);
    return (data ?? []).filter((m) => set.has(m.TIER));
  }, [data, filterTier]);

  // 2) Agrupar por Customer
  const byCustomer = useMemo(() => {
    const map = new Map<string, MatchRecord[]>();
    for (const m of filtered) {
      const key = (m.PRUEBA_customer ?? "").trim() || "(Sin Customer)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // Orden interno por SCORE desc
    for (const arr of map.values()) {
      arr.sort((a, b) => b.SCORE - a.SCORE);
    }
    // Orden de clientes por nombre
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <div style={{ padding: 12 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Resultados por Customer</h2>
        {/* Puedes añadir aquí controles de filtro por tier si quieres */}
      </header>

      {byCustomer.length === 0 ? (
        <p style={{ color: "#666" }}>No hay datos para mostrar.</p>
      ) : (
        byCustomer.map(([customer, rows]) => {
          const counters = countByTier(rows);
          return (
            <details key={customer} open style={detailsStyle}>
              <summary style={summaryStyle}>
                <span style={{ fontWeight: 700 }}>{customer}</span>
                <span style={{ marginLeft: 8, color: "#666" }}>
                  {rows.length} coincidencia(s) —{" "}
                  <TierPills ALTA={counters.ALTA} REVISAR={counters.REVISAR} SIN={counters.SIN} />
                </span>
              </summary>

              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>PRUEBA_nombre</th>
                      <th style={thStyle}>PRUEBA_street</th>
                      <th style={thStyle}>PRUEBA_city</th>
                      <th style={thStyle}>PRUEBA_cp</th>

                      <th style={thStyle}>MIN_nombre</th>
                      <th style={thStyle}>MIN_via</th>
                      <th style={thStyle}>MIN_num</th>
                      <th style={thStyle}>MIN_municipio</th>
                      <th style={thStyle}>MIN_cp</th>

                      <th style={thStyle}>SCORE</th>
                      <th style={thStyle}>TIER</th>
                      <th style={thStyle}>Fuente</th>

                      <th style={thStyle}>Código centro (C)</th>
                      <th style={thStyle}>Fecha última aut. (Y)</th>
                      <th style={thStyle}>Oferta asistencial (AC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m, i) => (
                      <tr key={i}>
                        <td style={tdStyle}>{m.PRUEBA_nombre}</td>
                        <td style={tdStyle}>{m.PRUEBA_street}</td>
                        <td style={tdStyle}>{m.PRUEBA_city}</td>
                        <td style={tdStyle}>{m.PRUEBA_cp ?? ""}</td>

                        <td style={tdStyle}>{m.MIN_nombre ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_via ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_num ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_municipio ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_cp ?? ""}</td>

                        <td style={tdStyle}>{m.SCORE.toFixed(3)}</td>
                        <td style={tdStyle}><span style={tierBadgeStyle(m.TIER)}>{m.TIER}</span></td>
                        <td style={tdStyle}>{m.MIN_source ?? ""}</td>

                        <td style={tdStyle}>{m.MIN_codigo_centro ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_fecha_autoriz ?? ""}</td>
                        <td style={tdStyle}>{m.MIN_oferta_asist ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })
      )}
    </div>
  );
}

// ───────── Helpers de UI ─────────

function countByTier(rows: MatchRecord[]) {
  return {
    ALTA: rows.filter((r) => r.TIER === "ALTA").length,
    REVISAR: rows.filter((r) => r.TIER === "REVISAR").length,
    SIN: rows.filter((r) => r.TIER === "SIN").length,
  };
}

function TierPills({ ALTA, REVISAR, SIN }: { ALTA: number; REVISAR: number; SIN: number }) {
  return (
    <>
      <span style={pillStyle("#e8f5e9", "#2e7d32", "#c8e6c9")}>ALTA: {ALTA}</span>{" "}
      <span style={pillStyle("#fff8e1", "#f57f17", "#ffe082")}>REVISAR: {REVISAR}</span>{" "}
      <span style={pillStyle("#ffebee", "#c62828", "#ffcdd2")}>SIN: {SIN}</span>
    </>
  );
}

// ───────── estilos inline sencillos ─────────

const detailsStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: 8,
  marginBottom: 12,
  background: "#fafafa",
};

const summaryStyle: React.CSSProperties = {
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  listStyle: "none",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "8px 6px",
  background: "#f7f7f7",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "6px",
  verticalAlign: "top",
};

function tierBadgeStyle(tier: MatchRecord["TIER"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" };
}

function pillStyle(bg: string, color: string, border: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: bg,
    color,
    border: `1px solid ${border}`,
  };
}
