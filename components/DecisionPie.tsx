// src/components/DecisionPie.tsx
import React from "react";

type Props = {
  accepted: number;
  standby: number;
  rejected: number;
  size?: number; // px
};

export default function DecisionPie({ accepted, standby, rejected, size = 160 }: Props) {
  const total = accepted + standby + rejected;
  const a = total ? accepted / total : 0;
  const s = total ? standby / total : 0;
  const r = total ? rejected / total : 0;

  // Utilidad para convertir fracción → arco SVG
  const polar = (cx: number, cy: number, r: number, frac: number, offsetFrac: number) => {
    const tau = Math.PI * 2;
    const start = tau * offsetFrac - Math.PI / 2;
    const end = start + tau * frac;
    const x0 = cx + r * Math.cos(start);
    const y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(end);
    const y1 = cy + r * Math.sin(end);
    const largeArc = frac > 0.5 ? 1 : 0;
    return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
  };

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;

  const segAccepted = polar(cx, cy, radius, a, 0);
  const segStandby  = polar(cx, cy, radius, s, a);
  const segRejected = polar(cx, cy, radius, r, a + s);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="#f0f0f0" />
        {a > 0 && <path d={segAccepted} fill="#2e7d32" stroke="#fff" strokeWidth={1} />}
        {s > 0 && <path d={segStandby} fill="#f57f17" stroke="#fff" strokeWidth={1} />}
        {r > 0 && <path d={segRejected} fill="#c62828" stroke="#fff" strokeWidth={1} />}
      </svg>
      <div style={{ fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: "#2e7d32", display: "inline-block", borderRadius: 2 }} />
          Aceptadas: <strong>{accepted}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: "#f57f17", display: "inline-block", borderRadius: 2 }} />
          Pendientes / Stand-by: <strong>{standby}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, background: "#c62828", display: "inline-block", borderRadius: 2 }} />
          Rechazadas: <strong>{rejected}</strong>
        </div>
        <div style={{ marginTop: 6, color: "#666" }}>
          Total: <strong>{total}</strong>
        </div>
      </div>
    </div>
  );
}
