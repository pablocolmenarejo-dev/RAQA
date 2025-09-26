// src/components/ValidationWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { MatchRecord } from "@/types";

/** Estado de decisión para un match */
export type Decision = "ACCEPTED" | "REJECTED" | "STANDBY";
export type DecisionMap = Record<string, Decision | undefined>;

/** Genera una clave estable para un match (para guardar decisión) */
export function makeMatchKey(m: MatchRecord): string {
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join(" | ");
}

type Status = Decision | undefined;

interface Props {
  /** Lista de coincidencias ya filtradas si aplica (p.ej. ALTA/REVISAR/SIN) */
  matches: MatchRecord[] | undefined | null;
  /** Mapa de decisiones persistentes */
  decisions: DecisionMap;
  /** Callback para guardar una decisión */
  onDecide: (match: MatchRecord, decision: Decision) => void;
  /** Cerrar modal */
  onClose: () => void;
}

const COLORS = {
  accepted: "#4CAF50",
  standby:  "#FFC107",
  rejected: "#F44336",
  pending:  "#9E9E9E",
};

function Donut({
  accepted, standby, rejected, pending, size = 160, stroke = 22,
}: { accepted: number; standby: number; rejected: number; pending: number; size?: number; stroke?: number; }) {
  const total = Math.max(1, accepted + standby + rejected + pending);
  const radius = (size - stroke) / 2;
  const C = 2 * Math.PI * radius;

  const segs = [
    { v: accepted, c: COLORS.accepted },
    { v: standby,  c: COLORS.standby  },
    { v: rejected, c: COLORS.rejected },
    { v: pending,  c: COLORS.pending  },
  ];

  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle r={radius} cx={size/2} cy={size/2} fill="transparent" stroke="#eee" strokeWidth={stroke} />
      {segs.map((s, i) => {
        const len = C * (s.v / total);
        const dash = `${len} ${C - len}`;
        const el = (
          <circle
            key={i}
            r={radius}
            cx={size/2}
            cy={size/2}
            fill="transparent"
            stroke={s.c}
            strokeWidth={stroke}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
          />
        );
        offset += len;
        return el;
      })}
      <circle cx={size/2} cy={size/2} r={radius - stroke/2} fill="#fff" />
    </svg>
  );
}

export default function ValidationWizard({ matches, decisions, onDecide, onClose }: Props) {
  // Normaliza a array
  const rows = Array.isArray(matches) ? matches : [];

  // Índice de registro
  const [idx, setIdx] = useState(0);

  // Mantener el índice dentro de rango cuando cambia el dataset
  useEffect(() => {
    if (rows.length === 0) setIdx(0);
    else if (idx > rows.length - 1) setIdx(rows.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Contadores por estado
  const counters = useMemo(() => {
    let acc = 0, rej = 0, stb = 0;
    for (const m of rows) {
      const d = decisions[makeMatchKey(m)];
      if (d === "ACCEPTED") acc++;
      else if (d === "REJECTED") rej++;
      else if (d === "STANDBY")  stb++;
    }
    const pending = rows.length - acc - rej - stb;
    return { acc, rej, stb, pending };
  }, [rows, decisions]);

  const current = rows[idx];
  const status: Status = current ? decisions[makeMatchKey(current)] : undefined;

  const pct = (n: number) => ((n / Math.max(1, rows.length)) * 100).toFixed(0) + "%";

  // Atajos de teclado: ← → y Esc
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(rows.length - 1, i + 1));
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [rows.length, onClose]);

  // Estilos base
  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 9999,
  };

  // Caja del modal: altura limitada y estructura en columnas
  const dialog: React.CSSProperties = {
    background: "#fff",
    borderRadius: 12,
    width: "min(980px, 100%)",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    overflow: "hidden", // importante: evita que el header se vaya
  };

  // Header pegajoso con borde
  const header: React.CSSProperties = {
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
    padding: "14px 18px",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: 12,
  };

  // Contenido desplazable
  const body: React.CSSProperties = {
    overflow: "auto",
    padding: 18,
  };

  const tag = (text: string, bg: string, color = "#222") => (
    <span style={{ background: bg, color, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{text}</span>
  );

  return (
    <div style={overlay}>
      <div style={dialog}>

        {/* HEADER (sticky) */}
        <div style={header}>
          <h2 style={{ margin: 0, flex: 1 }}>Validación de coincidencias</h2>
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #bbb",
              cursor: "pointer",
              background: "#fafafa",
            }}
          >
            Cerrar
          </button>
        </div>

        {/* BODY (scrollable) */}
        <div style={body}>
          {rows.length === 0 ? (
            <p style={{ marginTop: 8, color: "#b00020" }}>
              No se han recibido coincidencias. Vuelve atrás y ejecuta el matching.
            </p>
          ) : (
            <>
              {/* Resumen con donut */}
              <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 18 }}>
                <Donut accepted={counters.acc} standby={counters.stb} rejected={counters.rej} pending={counters.pending} />
                <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                  <div>
                    <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.accepted, marginRight: 8, borderRadius: 2 }} />
                    <b>Aceptadas:</b> {counters.acc} ({pct(counters.acc)})
                  </div>
                  <div>
                    <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.standby, marginRight: 8, borderRadius: 2 }} />
                    <b>StandBy:</b> {counters.stb} ({pct(counters.stb)})
                  </div>
                  <div>
                    <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.rejected, marginRight: 8, borderRadius: 2 }} />
                    <b>Rechazadas:</b> {counters.rej} ({pct(counters.rej)})
                  </div>
                  <div>
                    <span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.pending,  marginRight: 8, borderRadius: 2 }} />
                    <b>Pendientes:</b> {counters.pending} ({pct(counters.pending)})
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
                Registro {idx + 1} / {rows.length}
              </p>

              {current && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {/* PRUEBA */}
                  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                    <h3 style={{ marginTop: 0 }}>PRUEBA</h3>
                    <p><strong>Customer:</strong> {current.PRUEBA_customer ?? ""}</p>
                    <p><strong>Nombre:</strong> {current.PRUEBA_nombre}</p>
                    <p><strong>Calle:</strong> {current.PRUEBA_street}</p>
                    <p><strong>Municipio:</strong> {current.PRUEBA_city}</p>
                    <p><strong>CP:</strong> {current.PRUEBA_cp}</p>
                    <p><strong>Nº vía:</strong> {current.PRUEBA_num}</p>
                  </div>

                  {/* MINISTERIO */}
                  <div
                    style={{
                      border: "1px solid #ddd",
                      borderRadius: 8,
                      padding: 12,
                      background:
                        status === "ACCEPTED" ? "#e8f5e9" :
                        status === "REJECTED" ? "#ffebee" : "#fff",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>Ministerio (mejor match)</h3>
                    <p><strong>Nombre:</strong> {current.MIN_nombre}</p>
                    <p><strong>Vía:</strong> {current.MIN_via}</p>
                    <p><strong>Nº vía:</strong> {current.MIN_num}</p>
                    <p><strong>Municipio:</strong> {current.MIN_municipio}</p>
                    <p><strong>CP:</strong> {current.MIN_cp}</p>
                    <p><strong>Código centro (C):</strong> {current.MIN_codigo_centro}</p>
                    <p><strong>Fecha última autorización (Y):</strong> {current.MIN_fecha_autoriz}</p>
                    <p><strong>Oferta asistencial (AC):</strong> {current.MIN_oferta_asist}</p>

                    {/* SCORE grande y con color según decisión */}
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 34,
                        fontWeight: 900,
                        letterSpacing: 0.5,
                        color:
                          status === "ACCEPTED" ? "#2e7d32" :
                          status === "REJECTED" ? "#c62828" : "#222",
                      }}
                    >
                      SCORE: {Number(current.SCORE ?? 0).toFixed(3)}{" "}
                      {current.TIER === "ALTA" && tag("ALTA", "#e8f5e9", "#2e7d32")}
                      {current.TIER === "REVISAR" && tag("REVISAR", "#fff8e1", "#f57f17")}
                      {current.TIER === "SIN" && tag("SIN", "#ffebee", "#c62828")}
                    </div>
                  </div>
                </div>
              )}

              {/* Controles (también dentro del área scrollable) */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
                <button onClick={() => setIdx(i => Math.max(0, i - 1))}
                        disabled={idx === 0}
                        style={{ padding: "8px 16px" }}>
                  ← Anterior
                </button>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => current && onDecide(current, "ACCEPTED")}
                    style={{ padding: "8px 16px", background: COLORS.accepted, color: "#fff", borderRadius: 6 }}
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => current && onDecide(current, "STANDBY")}
                    style={{ padding: "8px 16px", background: COLORS.standby, color: "#000", borderRadius: 6 }}
                  >
                    StandBy
                  </button>
                  <button
                    onClick={() => current && onDecide(current, "REJECTED")}
                    style={{ padding: "8px 16px", background: COLORS.rejected, color: "#fff", borderRadius: 6 }}
                  >
                    Rechazar
                  </button>
                </div>

                <button onClick={() => setIdx(i => Math.min(rows.length - 1, i + 1))}
                        disabled={idx === rows.length - 1}
                        style={{ padding: "8px 16px" }}>
                  Siguiente →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

