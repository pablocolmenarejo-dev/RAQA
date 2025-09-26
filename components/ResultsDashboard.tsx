// components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput, MatchRecord } from "@/types";
import SummaryChart from "./SummaryChart";

type Props = { result: MatchOutput };

export default function ResultsDashboard({ result }: Props) {
  const counters = useMemo(() => {
    if (result?.summary) {
      return {
        total: result.summary.n_prueba,
        alta: result.summary.alta,
        revisar: result.summary.revisar,
        sin: result.summary.sin,
      };
    }
    // Fallback si no hubiera summary (no debería pasar)
    const matches = result?.matches ?? [];
    return {
      total: matches.length,
      alta: matches.filter((m) => m.TIER === "ALTA").length,
      revisar: matches.filter((m) => m.TIER === "REVISAR").length,
      sin: matches.filter((m) => m.TIER === "SIN").length,
    };
  }, [result]);

  const topSources = useMemo(() => {
    // ranking rápido por fuente (Excel del Ministerio)
    const map = new Map<string, number>();
    for (const m of result.matches) {
      const src = (m.MIN_source ?? "Desconocida").trim() || "Desconocida";
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [result.matches]);

  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ margin: "0 0 8px 0" }}>Resumen</h2>

      <div style={gridCards}>
        <Card title="Total PRUEBA" value={counters.total} />
        <Card title="Alta confianza" value={counters.alta} accent="ALTA" />
        <Card title="Revisar" value={counters.revisar} accent="REVISAR" />
        <Card title="Sin coincidencia" value={counters.sin} accent="SIN" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={panel}>
          <h3 style={h3}>Distribución por TIER</h3>
          <SummaryChart alta={counters.alta} revisar={counters.revisar} sin={counters.sin} total={counters.total} />
        </div>

        <div style={panel}>
          <h3 style={h3}>Top fuentes (Excel Ministerio)</h3>
          {topSources.length === 0 ? (
            <p style={{ color: "#666" }}>Sin datos de fuentes.</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {topSources.map(([src, n]) => (
                <li key={src} style={{ marginBottom: 6 }}>
                  <strong>{src}</strong> — {n}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </section>
  );
}

/* ────────── UI helpers ────────── */

function Card({ title, value, accent }: { title: string; value: number; accent?: MatchRecord["TIER"] }) {
  return (
    <div style={{ ...card, ...(accent ? accentStyle(accent) : {}) }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function accentStyle(tier: MatchRecord["TIER"]): React.CSSProperties {
  if (tier === "ALTA")    return { borderColor: "#c8e6c9", background: "#f3fbf4" };
  if (tier === "REVISAR") return { borderColor: "#ffe082", background: "#fff9e8" };
  return { borderColor: "#ffcdd2", background: "#fff2f3" };
}

const gridCards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(140px, 1fr))",
  gap: 8,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: "10px 12px",
  background: "#fafafa",
};

const panel: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: 12,
  background: "#fff",
};

const h3: React.CSSProperties = { margin: "0 0 8px 0" };
