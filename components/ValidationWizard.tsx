// src/components/ValidationWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { MatchRecord } from "@/types";

type Status = "ACCEPTED" | "REJECTED" | "STANDBY" | undefined;

interface Props {
  matches: MatchRecord[] | undefined | null;
  onClose: () => void;
}

const COLORS = {
  accepted: "#4CAF50",
  standby:  "#FFC107",
  rejected: "#F44336",
  pending:  "#9E9E9E",
};

function Donut({
  accepted, standby, rejected, pending, size = 180, stroke = 22,
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

export default function ValidationWizard({ matches, onClose }: Props) {
  // Defensa: normaliza a array
  const rows = Array.isArray(matches) ? matches : [];

  // Índice de registro
  const [idx, setIdx] = useState(0);
  // Estado de validación por índice
  const [statuses, setStatuses] = useState<Record<number, Status>>({});

  // Si cambia la longitud (o es 0), reubicamos el índice para evitar “out of range”
  useEffect(() => {
    if (rows.length === 0) setIdx(0);
    else if (idx > rows.length - 1) setIdx(rows.length - 1);
  }, [rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const counters = useMemo(() => {
    let acc = 0, rej = 0, stb = 0;
    for (const s of Object.values(statuses)) {
      if (s === "ACCEPTED") acc++;
      else if (s === "REJECTED") rej++;
      else if (s === "STANDBY")  stb++;
    }
    const pending = rows.length - acc - rej - stb;
    return { acc, rej, stb, pending };
  }, [statuses, rows.length]);

  const current = rows[idx];
  const setStatus = (s: Exclude<Status, undefined>) =>
    setStatuses(prev => ({ ...prev, [idx]: s }));

  const pct = (n: number) => ((n / Math.max(1, rows.length)) * 100).toFixed(0) + "%";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", justifyContent: "center", alignItems: "center",
      zIndex: 9999, overflowY: "auto"
    }}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: 24,
        width: "90%", maxWidth: 980, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative"
      }}>
        <button onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, padding: "6px 10px", cursor: "pointer" }}>
          Cerrar
        </button>

        <h2 style={{ marginTop: 0 }}>Validación de coincidencias</h2>

        {rows.length === 0 ? (
          <>
            <p style={{ marginTop: 8, color: "#b00020" }}>
              No se han recibido coincidencias. Vuelve atrás y ejecuta el matching.
            </p>
          </>
        ) : (
          <>
            {/* Resumen con donut */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 18 }}>
              <Donut accepted={counters.acc} standby={counters.stb} rejected={counters.rej} pending={counters.pending} />
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.accepted, marginRight: 8, borderRadius: 2 }} />
                  <b>Aceptadas:</b> {counters.acc} ({pct(counters.acc)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.standby, marginRight: 8, borderRadius: 2 }} />
                  <b>StandBy:</b> {counters.stb} ({pct(counters.stb)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.rejected, marginRight: 8, borderRadius: 2 }} />
                  <b>Rechazadas:</b> {counters.rej} ({pct(counters.rej)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.pending, marginRight: 8, borderRadius: 2 }} />
                  <b>Pendientes:</b> {counters.pending} ({pct(counters.pending)})</div>
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
                <div style={{
                  border: "1px solid #ddd", borderRadius: 8, padding: 12,
                  background:
                    statuses[idx] === "ACCEPTED" ? "#e8f5e9" :
                    statuses[idx] === "REJECTED" ? "#ffebee" : "#fff",
                }}>
                  <h3 style={{ marginTop: 0 }}>Ministerio (mejor match)</h3>
                  <p><strong>Nombre:</strong> {current.MIN_nombre}</p>
                  <p><strong>Vía:</strong> {current.MIN_via}</p>
                  <p><strong>Nº vía:</strong> {current.MIN_num}</p>
                  <p><strong>Municipio:</strong> {current.MIN_municipio}</p>
                  <p><strong>CP:</strong> {current.MIN_cp}</p>
                  <p><strong>Código centro (C):</strong> {current.MIN_codigo_centro}</p>
                  <p><strong>Fecha última autorización (Y):</strong> {current.MIN_fecha_autoriz}</p>
                  <p><strong>Oferta asistencial (AC):</strong> {current.MIN_oferta_asist}</p>

                  <div style={{
                    marginTop: 10, fontSize: 30, fontWeight: 900,
                    color:
                      statuses[idx] === "ACCEPTED" ? "#2e7d32" :
                      statuses[idx] === "REJECTED" ? "#c62828" : "#222",
                  }}>
                    SCORE: {Number(current.SCORE ?? 0).toFixed(3)}
                  </div>
                </div>
              </div>
            )}

            {/* Controles */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))}
                      disabled={idx === 0}
                      style={{ padding: "8px 16px" }}>
                ← Anterior
              </button>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStatus("ACCEPTED")}
                        style={{ padding: "8px 16px", background: COLORS.accepted, color: "#fff", borderRadius: 6 }}>
                  Aceptar
                </button>
                <button onClick={() => setStatus("STANDBY")}
                        style={{ padding: "8px 16px", background: COLORS.standby, color: "#000", borderRadius: 6 }}>
                  StandBy
                </button>
                <button onClick={() => setStatus("REJECTED")}
                        style={{ padding: "8px 16px", background: COLORS.rejected, color: "#fff", borderRadius: 6 }}>
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
  );
}

