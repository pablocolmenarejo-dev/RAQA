// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput } from "@/types";
import SummaryChart from "./SummaryChart";

type Props = {
  result: MatchOutput;
  onOpenValidation: () => void; // <- NUEVO: botón que abre el asistente
  // (Opcional) si ya tienes decisiones locales y quieres pintar contadores con ellas,
  // podrías añadir aquí un mapa de decisiones. Por ahora no es necesario.
};

export default function ResultsDashboard({ result, onOpenValidation }: Props) {
  const counters = useMemo(() => {
    if (result?.summary) {
      return {
        total: result.summary.n_prueba,
        alta: result.summary.alta,
        revisar: result.summary.revisar,
        sin: result.summary.sin,
      };
    }
    const matches = result?.matches ?? [];
    return {
      total: matches.length,
      alta: matches.filter((m) => m.TIER === "ALTA").length,
      revisar: matches.filter((m) => m.TIER === "REVISAR").length,
      sin: matches.filter((m) => m.TIER === "SIN").length,
    };
  }, [result]);

  const topSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of result.matches) {
      const src = (m.MIN_source ?? "Desconocida").trim() || "Desconocida";
      map.set(src, (map.get(src) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [result.matches]);

  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h2 style={{ margin: 0, flex: 1 }}>Resumen</h2>
        <button
          onClick={onOpenValidation}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #1976d2",
            background: "#1976d2",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Ir a Validación
        </button>
      </div>

      <div style={gridCards}>
        <Card title="Total PRUEBA" value={counters.total} />
        <Card title="Alta confianza" value={counters.alta} accent="ALTA" />
        <Card title="Revisar" value={counters.revisar} accent="REVISAR" />
        <Card title="Sin coincidencia" value={counters.sin} accent="SIN" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={panel}>
          <h3 style={h3}>Distribución por TIER</h3>
          <SummaryChart
            alta={counters.alta}
            revisar={counters.revisar}
            sin={counters.sin}
            total={counters.total}
          />
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

function Card({ title, value, accent }: { title: string; value: number; accent?: "ALTA" | "REVISAR" | "SIN" }) {
  const badge = accent ? (
    <span style={badgeStyle(accent)}>{accent}</span>
  ) : null;

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
        {badge}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const badgeStyle = (tier: "ALTA" | "REVISAR" | "SIN"): React.CSSProperties => {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    border: "1px solid",
  };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", borderColor: "#c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", borderColor: "#ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", borderColor: "#ffcdd2" };
};

const gridCards: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
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

