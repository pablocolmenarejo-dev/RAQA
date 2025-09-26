// components/SummaryChart.tsx
import React, { useMemo } from "react";

type Props = {
  alta: number;
  revisar: number;
  sin: number;
  total: number;
};

/**
 * Bar chart sencillo (sin librerías):
 *   - 3 barras: ALTA, REVISAR, SIN
 *   - Altura proporcional al total
 */
export default function SummaryChart({ alta, revisar, sin, total }: Props) {
  const data = useMemo(() => {
    const safeTotal = Math.max(1, total);
    return [
      { key: "ALTA",    value: alta,    color: "#2e7d32", bg: "#e8f5e9", border: "#c8e6c9" },
      { key: "REVISAR", value: revisar, color: "#f57f17", bg: "#fff8e1", border: "#ffe082" },
      { key: "SIN",     value: sin,     color: "#c62828", bg: "#ffebee", border: "#ffcdd2" },
    ].map(d => ({
      ...d,
      pct: (d.value / safeTotal) * 100
    }));
  }, [alta, revisar, sin, total]);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, minHeight: 160, padding: 8 }}>
      {data.map(d => (
        <div key={d.key} style={{ textAlign: "center", flex: 1 }}>
          <div style={{
            height: Math.max(6, d.pct) * 1.2, // escala simple
            background: d.bg,
            border: `1px solid ${d.border}`,
            borderRadius: 6,
            position: "relative"
          }}>
            <div style={{
              position: "absolute",
              bottom: 4,
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 12,
              color: d.color,
              fontWeight: 700
            }}>
              {d.value}
            </div>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: d.color }}>{d.key}</div>
        </div>
      ))}
    </div>
  );
}

