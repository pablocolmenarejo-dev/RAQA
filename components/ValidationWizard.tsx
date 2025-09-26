// src/components/ValidationWizard.tsx
import React, { useMemo, useState } from "react";
import type { MatchOutput, MatchRecord } from "@/types";

// Estados de decisión
export type Decision = "ACEPTADA" | "STANDBY" | "RECHAZADA";
export type DecisionMap = Record<number, Decision>; // index en matches -> decisión

type Props = {
  result: MatchOutput;
  decisions: DecisionMap;
  onDecide: (matchIndex: number, d: Decision) => void;
  onClose: () => void;
};

export default function ValidationWizard({ result, decisions, onDecide, onClose }: Props) {
  // Índice del match que estamos validando
  const [i, setI] = useState(0);

  const ordered = result.matches; // ya vienen ordenados en App o matching, pero puede ordenarse aquí si prefieres

  const counters = useMemo(() => {
    let a = 0, s = 0, r = 0, p = 0;
    for (let k = 0; k < ordered.length; k++) {
      const d = decisions[k];
      if (d === "ACEPTADA") a++;
      else if (d === "STANDBY") s++;
      else if (d === "RECHAZADA") r++;
      else p++;
    }
    return { aceptadas: a, standby: s, rechazadas: r, pendientes: p, total: ordered.length };
  }, [ordered, decisions]);

  const m = ordered[i];

  const goto = (delta: number) => {
    const n = ordered.length;
    const j = Math.max(0, Math.min(n - 1, i + delta));
    setI(j);
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <h2 style={{ margin: 0, flex: 1 }}>Validación de coincidencias</h2>
          <button onClick={onClose} style={btnGhost}>Cerrar</button>
        </header>

        {/* Donut de estado */}
        <Donut aceptadas={counters.aceptadas} standby={counters.standby} rechazadas={counters.rechazadas} pendientes={counters.pendientes} total={counters.total} />

        {/* Navegación */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
          <button onClick={() => goto(-1)} disabled={i === 0} style={btn}>← Anterior</button>
          <div style={{ flex: 1, textAlign: "center" }}>
            Registro {i + 1} / {ordered.length}
          </div>
          <button onClick={() => goto(+1)} disabled={i === ordered.length - 1} style={btn}>Siguiente →</button>
        </div>

        {/* Panel comparado */}
        {m ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={panel}>
              <h3 style={{ margin: "0 0 6px 0" }}>PRUEBA</h3>
              <KV k="Customer" v={m.PRUEBA_customer ?? ""} />
              <KV k="Nombre" v={m.PRUEBA_nombre} />
              <KV k="Calle" v={m.PRUEBA_street} />
              <KV k="Municipio" v={m.PRUEBA_city} />
              <KV k="CP" v={m.PRUEBA_cp ?? ""} />
              <KV k="Nº vía" v={m.PRUEBA_num ?? ""} />
            </div>

            <div style={panel}>
              <h3 style={{ margin: "0 0 6px 0" }}>Ministerio (mejor match)</h3>
              <KV k="Nombre" v={m.MIN_nombre ?? ""} />
              <KV k="Vía" v={m.MIN_via ?? ""} />
              <KV k="Nº vía" v={m.MIN_num ?? ""} />
              <KV k="Municipio" v={m.MIN_municipio ?? ""} />
              <KV k="CP" v={m.MIN_cp ?? ""} />
              <KV k="Código centro (C)" v={m.MIN_codigo_centro ?? ""} />
              <KV k="Fecha última autorización (Y)" v={m.MIN_fecha_autoriz ?? ""} />
              <KV k="Oferta asistencial (AC)" v={m.MIN_oferta_asist ?? ""} />
              <KV k="Fuente" v={m.MIN_source ?? ""} />
              <KV k="SCORE" v={m.SCORE.toFixed(4)} />
              <KV k="TIER" v={m.TIER} />
            </div>
          </div>
        ) : (
          <p>No hay registros.</p>
        )}

        {/* Botones de decisión */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button onClick={() => onDecide(i, "ACEPTADA")} style={btnAccept}>Aceptar</button>
          <button onClick={() => onDecide(i, "STANDBY")} style={btnWarn}>StandBy</button>
          <button onClick={() => onDecide(i, "RECHAZADA")} style={btnReject}>Rechazar</button>
        </div>
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 6, fontSize: 13 }}>
      <div style={{ color: "#666" }}>{k}</div>
      <div style={{ fontWeight: 600 }}>{v}</div>
    </div>
  );
}

function Donut(props: { aceptadas: number; standby: number; rechazadas: number; pendientes: number; total: number }) {
  const { aceptadas, standby, rechazadas, pendientes, total } = props;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
      <svg viewBox="0 0 36 36" width={140} height={140}>
        {/* fondo */}
        <path d="M18 2a16 16 0 1 1 0 32a16 16 0 1 1 0-32" fill="#f5f5f5" />
        {/* segmentos */}
        {arc(0, pct(aceptadas), "#2e7d32")}
        {arc(pct(aceptadas), pct(aceptadas) + pct(standby), "#f57f17")}
        {arc(pct(aceptadas) + pct(standby), pct(aceptadas) + pct(standby) + pct(rechazadas), "#c62828")}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        <Legend color="#2e7d32" label="Aceptadas" value={`${aceptadas} (${pct(aceptadas)}%)`} />
        <Legend color="#f57f17" label="StandBy" value={`${standby} (${pct(standby)}%)`} />
        <Legend color="#c62828" label="Rechazadas" value={`${rechazadas} (${pct(rechazadas)}%)`} />
        <Legend color="#666" label="Pendientes" value={`${pendientes} (${pct(pendientes)}%)`} />
      </div>
    </div>
  );
}

// Dibuja arco circular sobre 36x36, del porcentaje start al end (0..100)
function arc(startPct: number, endPct: number, color: string) {
  if (endPct <= startPct) return null;
  const start = (startPct / 100) * 2 * Math.PI;
  const end = (endPct / 100) * 2 * Math.PI;
  const r = 15.5;
  const cx = 18, cy = 18;

  const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
  const large = end - start > Math.PI ? 1 : 0;

  const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  return <path d={d} fill={color} opacity={0.9} />;
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: "inline-block" }} />
      <span style={{ fontWeight: 700 }}>{label}:</span>
      <span>{value}</span>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 9999,
};

const modal: React.CSSProperties = {
  width: "min(1100px, 96vw)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 10px 40px rgba(0,0,0,.25)",
};

const panel: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 10,
  padding: 12,
  background: "#fafafa",
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #999",
  background: "#fff",
  cursor: "pointer",
};

const btnGhost: React.CSSProperties = {
  ...btn,
  borderColor: "#bbb",
};

const btnAccept: React.CSSProperties = {
  ...btn,
  borderColor: "#2e7d32",
  background: "#e8f5e9",
  color: "#2e7d32",
  fontWeight: 700,
};

const btnWarn: React.CSSProperties = {
  ...btn,
  borderColor: "#f57f17",
  background: "#fff8e1",
  color: "#f57f17",
  fontWeight: 700,
};

const btnReject: React.CSSProperties = {
  ...btn,
  borderColor: "#c62828",
  background: "#ffebee",
  color: "#c62828",
  fontWeight: 700,
};
