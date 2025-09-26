// src/components/ValidationWizard.tsx
import React, { useMemo, useState } from "react";
import type { MatchOutput, MatchRecord, TopCandidate } from "@/types";

type Decision = "ACEPTADO" | "STANDBY" | "RECHAZADO";
interface DecisionsMap {
  [key: string]: { status: Decision; chosenIndex: number | null };
}

interface Props {
  result: MatchOutput;
  onBack: () => void;
  onFinish: (decisions: DecisionsMap) => void;
}

export default function ValidationWizard({ result, onBack, onFinish }: Props) {
  // 1) Agrupar por registro PRUEBA (clave estable)
  type Group = {
    key: string;
    prueba: { customer: string | null; nombre: string; street: string; city: string; cp: string | null; num: string | null };
    candidates: MatchRecord[]; // ya ordenados por SCORE
    top3: TopCandidate[];      // por si quieres enseñarlos en un desplegable
  };

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();

    // clave por registro PRUEBA (nombre+cp+num) – misma que usé para n_prueba
    const makeKey = (m: MatchRecord) => `${m.PRUEBA_nombre}|${m.PRUEBA_cp ?? ""}|${m.PRUEBA_num ?? ""}`;

    // agrupar matches
    for (const m of result.matches) {
      const key = makeKey(m);
      const g = map.get(key) ?? {
        key,
        prueba: {
          customer: m.PRUEBA_customer ?? null,
          nombre: m.PRUEBA_nombre,
          street: m.PRUEBA_street,
          city: m.PRUEBA_city,
          cp: m.PRUEBA_cp ?? null,
          num: m.PRUEBA_num ?? null,
        },
        candidates: [],
        top3: [],
      };
      g.candidates.push(m);
      map.set(key, g);
    }

    // ordenar candidatos por SCORE desc
    for (const g of map.values()) {
      g.candidates.sort((a, b) => b.SCORE - a.SCORE);
    }

    // adjuntar top3 de ese registro PRUEBA (si los quieres enseñar)
    for (const t of result.top3) {
      const key = `${t.PRUEBA_nombre}|${t.PRUEBA_cp ?? ""}|${t.PRUEBA_num ?? ""}`;
      const g = map.get(key);
      if (g) g.top3.push(t);
    }

    // orden global por customer y luego por nombre
    return [...map.values()].sort((a, b) => {
      const ca = (a.prueba.customer ?? "").localeCompare(b.prueba.customer ?? "");
      if (ca !== 0) return ca;
      return a.prueba.nombre.localeCompare(b.prueba.nombre);
    });
  }, [result]);

  const [index, setIndex] = useState(0);
  const [decisions, setDecisions] = useState<DecisionsMap>({});

  const g = groups[index];

  const setDecision = (status: Decision) => {
    const prev = decisions[g.key] || { status: "STANDBY" as Decision, chosenIndex: g.candidates.length ? 0 : null };
    setDecisions({ ...decisions, [g.key]: { status, chosenIndex: prev.chosenIndex } });
  };

  const setChosenCandidate = (i: number) => {
    const prev = decisions[g.key] || { status: "STANDBY" as Decision, chosenIndex: null };
    setDecisions({ ...decisions, [g.key]: { status: prev.status, chosenIndex: i } });
  };

  const goPrev = () => setIndex(i => Math.max(0, i - 1));
  const goNext = () => setIndex(i => Math.min(groups.length - 1, i + 1));

  const progress = Math.round(((index + 1) / groups.length) * 100);
  const currentDecision = decisions[g.key]?.status ?? null;
  const chosenIndex = decisions[g.key]?.chosenIndex ?? (g.candidates.length ? 0 : null);

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <button onClick={onBack} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", background: "white", cursor: "pointer" }}>
          ← Volver
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>Validación de coincidencias</h2>
        <button
          onClick={() => onFinish(decisions)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #2e7d32", background: "#43a047", color: "white", cursor: "pointer" }}
        >
          Finalizar validación
        </button>
      </header>

      {/* Progreso */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666" }}>
          <span>{index + 1} / {groups.length}</span>
          <span>{progress}%</span>
        </div>
        <div style={{ height: 8, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "#1976d2" }} />
        </div>
      </div>

      {/* Layout principal */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 12 }}>
        {/* IZQUIERDA: PRUEBA */}
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>PRUEBA</h3>
          <KV label="Customer" value={g.prueba.customer ?? ""} />
          <KV label="Nombre" value={g.prueba.nombre} />
          <KV label="Calle" value={g.prueba.street} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <KV label="Municipio" value={g.prueba.city} />
            <KV label="CP" value={g.prueba.cp ?? ""} />
          </div>
          <KV label="Nº vía" value={g.prueba.num ?? ""} />
        </div>

        {/* DERECHA: Candidatos */}
        <div style={panelStyle}>
          <h3 style={{ marginTop: 0 }}>
            Candidatos ({g.candidates.length}) {currentDecision ? <small style={{ marginLeft: 8, color: "#666" }}>Estado: {currentDecision}</small> : null}
          </h3>

          {g.candidates.length === 0 ? (
            <div style={emptyStyle}>Sin candidatos para este registro.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {g.candidates.map((c, i) => {
                const selected = chosenIndex === i;
                return (
                  <div key={i} style={{ ...candCard, borderColor: selected ? "#1976d2" : "#e0e0e0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="radio"
                        name={`cand-${g.key}`}
                        checked={selected}
                        onChange={() => setChosenCandidate(i)}
                      />
                      <div style={{ fontWeight: 700 }}>{c.MIN_nombre ?? "(sin nombre)"}</div>
                      <span style={tierBadgeStyle(c.TIER)}>{c.TIER}</span>
                      <span style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>SCORE: {c.SCORE.toFixed(3)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#333" }}>
                      <div><b>Vía:</b> {c.MIN_via ?? ""} {c.MIN_num ?? ""}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                        <div><b>Municipio:</b> {c.MIN_municipio ?? ""}</div>
                        <div><b>CP:</b> {c.MIN_cp ?? ""}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
                        <div><b>CCN (C):</b> {c.MIN_codigo_centro ?? ""}</div>
                        <div><b>Fuente:</b> {c.MIN_source ?? ""}</div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 4 }}>
                        <div><b>Fecha última aut. (Y):</b> {c.MIN_fecha_autoriz ?? ""}</div>
                        <div><b>Oferta asist. (AC):</b> {c.MIN_oferta_asist ?? ""}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => setDecision("ACEPTADO")} style={btnAccept}>Aceptar</button>
            <button onClick={() => setDecision("STANDBY")} style={btnStandby}>StandBy</button>
            <button onClick={() => setDecision("RECHAZADO")} style={btnReject}>Rechazar</button>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 12 }}>
        <button onClick={goPrev} disabled={index === 0} style={navBtn}>← Anterior</button>
        <button onClick={goNext} disabled={index === groups.length - 1} style={navBtn}>Siguiente →</button>
      </div>
    </div>
  );
}

/* helpers UI */
function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 11, color: "#777" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid #e0e0e0",
  borderRadius: 10,
  padding: 12,
  background: "white",
};
const emptyStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 8,
  background: "#fafafa",
  border: "1px dashed #ddd",
  color: "#777",
};

const candCard: React.CSSProperties = {
  border: "2px solid #e0e0e0",
  borderRadius: 12,
  padding: 10,
  background: "#fcfcff",
};

function tierBadgeStyle(tier: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid",
  };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", borderColor: "#c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", borderColor: "#ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", borderColor: "#ffcdd2" };
}

const btnAccept: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #2e7d32", background: "#43a047", color: "white", cursor: "pointer"
};
const btnStandby: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #f57f17", background: "#ffb300", color: "white", cursor: "pointer"
};
const btnReject: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #c62828", background: "#e53935", color: "white", cursor: "pointer"
};
const navBtn: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8, border: "1px solid #999", background: "white", cursor: "pointer"
};
