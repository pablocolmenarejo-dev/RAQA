// src/components/ValidationWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import type { MatchRecord } from "@/types";

export type Decision = "ACCEPTED" | "REJECTED" | "STANDBY";
export type DecisionMap = Record<string, Decision | undefined>;

export const makeMatchKey = (m: MatchRecord) =>
  [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join("||");

const COLORS = { accepted: "#4CAF50", standby:  "#FFC107", rejected: "#F44336", pending:  "#9E9E9E", };

// ***** CORRECCIÓN AQUÍ: Definición correcta de la función Donut *****
function Donut({
  accepted, standby, rejected, pending, size = 180, stroke = 22,
}: { accepted: number; standby: number; rejected: number; pending: number; size?: number; stroke?: number; }) {
// ***** FIN CORRECCIÓN *****
    const total = Math.max(1, accepted + standby + rejected + pending);
    const radius = (size - stroke) / 2;
    const C = 2 * Math.PI * radius;
    const segs = [ { v: accepted, c: COLORS.accepted }, { v: standby,  c: COLORS.standby  }, { v: rejected, c: COLORS.rejected }, { v: pending,  c: COLORS.pending  }, ];
    let offset = 0;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle r={radius} cx={size/2} cy={size/2} fill="transparent" stroke="#eee" strokeWidth={stroke} />
        {segs.map((s, i) => {
          if (s.v === 0) return null; // Evitar dibujar arcos de longitud 0
          const len = C * (s.v / total);
          const dash = `${len} ${C - len}`;
          const el = ( <circle key={i} r={radius} cx={size/2} cy={size/2} fill="transparent" stroke={s.c} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset} transform={`rotate(-90 ${size/2} ${size/2})`} /> ); // Rotar el segmento
          offset += len; return el;
        })}
        {/* White circle overlay to create donut effect if needed, adjust radius */}
        {/* <circle cx={size/2} cy={size/2} r={radius - stroke/2} fill="#fff" /> */}
         {/* Optional center text */}
         {/* <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="20" fontWeight="bold">{total}</text> */}
      </svg>
    );
}


interface Props {
  matches: MatchRecord[] | undefined | null; // Matches already filtered by TIER from App.tsx
  decisions: DecisionMap;
  comments: Record<string, string>;
  onDecide: (m: MatchRecord, d: Decision) => void;
  onComment: (m: MatchRecord, text: string) => void;
  onClose: () => void;
}

export default function ValidationWizard({
  matches, decisions, comments, onDecide, onComment, onClose
}: Props) {
  const allTierMatches = useMemo(() => Array.isArray(matches) ? matches : [], [matches]);
  const [viewMode, setViewMode] = useState<'pending' | 'completed'>('pending');
  const [idx, setIdx] = useState(0);

  const displayedMatches = useMemo(() => {
    return allTierMatches.filter(m => {
      const decision = decisions[makeMatchKey(m)];
      if (viewMode === 'pending') {
        return decision === undefined || decision === 'STANDBY';
      } else { // viewMode === 'completed'
        return decision === 'ACCEPTED' || decision === 'REJECTED';
      }
    });
  }, [allTierMatches, decisions, viewMode]);

  useEffect(() => {
    setIdx(0);
  }, [displayedMatches]);

  // Adjust index only if it goes out of bounds *after* displayedMatches potentially shrinked
  useEffect(() => {
    if (idx >= displayedMatches.length) {
      setIdx(Math.max(0, displayedMatches.length - 1));
    }
  }, [idx, displayedMatches.length]);


  const tierCounters = useMemo(() => {
    let acc = 0, rej = 0, stb = 0;
    for (const m of allTierMatches) {
      const st = decisions[makeMatchKey(m)];
      if (st === "ACCEPTED") acc++;
      else if (st === "REJECTED") rej++;
      else if (st === "STANDBY")  stb++;
    }
    const pending = Math.max(0, allTierMatches.length - acc - rej - stb); // Ensure non-negative
    return { acc, rej, stb, pending };
  }, [allTierMatches, decisions]);

  const current = displayedMatches[idx];
  const status  = current ? decisions[makeMatchKey(current)] : undefined;
  const comment = current ? (comments[makeMatchKey(current)] ?? "") : "";

  const pct = (n: number) => ((n / Math.max(1, allTierMatches.length)) * 100).toFixed(0) + "%";

  return (
    <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex",
        justifyContent: "center", alignItems: "flex-start", zIndex: 9999,
        overflowY: "auto", padding: "40px 16px"
    }}>
      <div style={{
          background: "#fff", borderRadius: 12, padding: 24, width: "100%",
          maxWidth: 1080, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative"
       }}>
        <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12, padding: "6px 10px", cursor: "pointer", background: '#eee', border: '1px solid #ccc', borderRadius: 4
         }}>
          Cerrar
        </button>

        <h2 style={{ marginTop: 0 }}>Validación de coincidencias</h2>

        {allTierMatches.length === 0 ? (
          <p style={{ marginTop: 8, color: "#b00020" }}>
            No hay coincidencias para este filtro.
          </p>
        ) : (
          <>
            {/* Resumen (Donut based on ALL tier matches) */}
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 18 }}>
              {/* Llamada correcta a Donut con props */}
              <Donut accepted={tierCounters.acc} standby={tierCounters.stb} rejected={tierCounters.rej} pending={tierCounters.pending} />
              <div style={{ fontSize: 14, lineHeight: 1.8 }}>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.accepted, marginRight: 8, borderRadius: 2 }} />
                  <b>Aceptadas:</b> {tierCounters.acc} ({pct(tierCounters.acc)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.standby, marginRight: 8, borderRadius: 2 }} />
                  <b>StandBy:</b> {tierCounters.stb} ({pct(tierCounters.stb)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.rejected, marginRight: 8, borderRadius: 2 }} />
                  <b>Rechazadas:</b> {tierCounters.rej} ({pct(tierCounters.rej)})</div>
                <div><span style={{ display: "inline-block", width: 10, height: 10, background: COLORS.pending, marginRight: 8, borderRadius: 2 }} />
                  <b>Pendientes:</b> {tierCounters.pending} ({pct(tierCounters.pending)})</div>
              </div>
            </div>

            {/* View Mode Toggle and Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                    Registro {displayedMatches.length > 0 ? idx + 1 : 0} / {displayedMatches.length}
                    <span style={{ fontWeight: 400, marginLeft: '8px' }}>({viewMode === 'pending' ? 'Pendientes' : 'Completadas'})</span>
                </p>
                <button
                    onClick={() => setViewMode(prev => prev === 'pending' ? 'completed' : 'pending')}
                    style={{ padding: '6px 12px', cursor: 'pointer', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: 6 }}
                >
                    Ver {viewMode === 'pending' ? `Completadas (${tierCounters.acc + tierCounters.rej})` : `Pendientes (${tierCounters.pending + tierCounters.stb})`}
                </button>
            </div>

            {/* Content Area */}
            {displayedMatches.length === 0 ? (
                 <p style={{color: '#555', marginTop: 20, textAlign: 'center'}}>No hay registros {viewMode === 'pending' ? 'pendientes' : 'completados'} para mostrar.</p>
            ) : current ? (
              <>
                {/* PRUEBA vs MINISTERIO comparison */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                    <h3 style={{ marginTop: 0 }}>PRUEBA</h3>
                    <p><strong>Customer:</strong> {current.PRUEBA_customer ?? ""}</p>
                    <p><strong>Nombre:</strong> {current.PRUEBA_nombre}</p>
                    <p><strong>Calle:</strong> {current.PRUEBA_street}</p>
                    <p><strong>Municipio:</strong> {current.PRUEBA_city}</p>
                    <p><strong>CP:</strong> {current.PRUEBA_cp}</p>
                    <p><strong>Nº vía:</strong> {current.PRUEBA_num}</p>
                  </div>
                  <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, background: status === "ACCEPTED" ? "#e8f5e9" : status === "REJECTED" ? "#ffebee" : status === "STANDBY" ? "#fff8e1" : "#fff", }}>
                    <h3 style={{ marginTop: 0 }}>Ministerio (mejor match)</h3>
                    <p><strong>Nombre:</strong> {current.MIN_nombre}</p>
                    <p><strong>Vía:</strong> {current.MIN_via}</p>
                    <p><strong>Nº vía:</strong> {current.MIN_num}</p>
                    <p><strong>Municipio:</strong> {current.MIN_municipio}</p>
                    <p><strong>CP:</strong> {current.MIN_cp}</p>
                    <p><strong>Código centro (C):</strong> {current.MIN_codigo_centro}</p>
                    <p><strong>Fecha última autorización (Y):</strong> {current.MIN_fecha_autoriz}</p>
                    <p><strong>Oferta asistencial (AC):</strong> {current.MIN_oferta_asist}</p>
                    <div style={{ marginTop: 10, fontSize: 30, fontWeight: 900, color: status === "ACCEPTED" ? COLORS.accepted : status === "REJECTED" ? COLORS.rejected : status === "STANDBY" ? COLORS.standby : "#222", }}>
                      SCORE: {Number(current.SCORE ?? 0).toFixed(3)}
                    </div>
                  </div>
                </div>
                {/* Comments */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Comentarios</label>
                  <textarea value={comment} onChange={(e) => onComment(current, e.target.value)} placeholder="Añade cualquier nota o justificación…" rows={4} style={{ width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: 10, resize: "vertical" }} />
                </div>
              </>
            ) : null }

            {/* Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
              <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0 || displayedMatches.length === 0} style={{ padding: "8px 16px", cursor: (idx === 0 || displayedMatches.length === 0) ? 'not-allowed' : 'pointer' }}> ← Anterior </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => current && onDecide(current, "ACCEPTED")} disabled={!current} style={{ padding: "8px 16px", background: COLORS.accepted, color: "#fff", borderRadius: 6, cursor: current ? 'pointer' : 'not-allowed' }}> Aceptar </button>
                <button onClick={() => current && onDecide(current, "STANDBY")} disabled={!current} style={{ padding: "8px 16px", background: COLORS.standby, color: "#000", borderRadius: 6, cursor: current ? 'pointer' : 'not-allowed' }}> StandBy </button>
                <button onClick={() => current && onDecide(current, "REJECTED")} disabled={!current} style={{ padding: "8px 16px", background: COLORS.rejected, color: "#fff", borderRadius: 6, cursor: current ? 'pointer' : 'not-allowed' }}> Rechazar </button>
              </div>
              <button onClick={() => setIdx(i => Math.min(displayedMatches.length - 1, i + 1))} disabled={idx >= displayedMatches.length - 1 || displayedMatches.length === 0} style={{ padding: "8px 16px", cursor: (idx >= displayedMatches.length - 1 || displayedMatches.length === 0) ? 'not-allowed' : 'pointer' }}> Siguiente → </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
