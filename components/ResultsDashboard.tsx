// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  // Puede llamarse sin parámetro (todos) o con un TIER específico
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
}

export default function ResultsDashboard({ result, decisions = {}, onOpenValidation }: Props) {
  const counts = useMemo(() => {
    const rows = result.matches ?? [];
    let acc = 0, rej = 0, stb = 0;
    for (const m of rows) {
      const d = decisions[makeMatchKey(m)];
      if (d === "ACCEPTED") acc++;
      else if (d === "REJECTED") rej++;
      else if (d === "STANDBY")  stb++;
    }
    return { acc, rej, stb, pending: Math.max(0, rows.length - acc - rej - stb) };
  }, [result.matches, decisions]);

  const card: React.CSSProperties = {
    border: "1px solid #e5e5e5",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#fafafa",
  };

  const clickable: React.CSSProperties = {
    ...card,
    cursor: "pointer",
    transition: "box-shadow .15s ease",
  };

  const pill = (txt: string, bg: string, color = "#333") => (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 999, fontWeight: 700 }}>{txt}</span>
  );

  return (
    <>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(160px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div style={card}>
          <div style={{ fontSize: 12, color: "#666" }}>Total PRUEBA</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{result.summary.n_prueba}</div>
        </div>

        {/* ALTA → abre wizard filtrado */}
        <div
          style={clickable}
          onClick={() => onOpenValidation?.("ALTA")}
          onMouseOver={(e) => ((e.currentTarget.style.boxShadow = "0 0 0 3px #e8f5e9"))}
          onMouseOut={(e) => ((e.currentTarget.style.boxShadow = "none"))}
          title="Validar solo ALTA"
        >
          <div style={{ fontSize: 12, color: "#666" }}>Alta confianza</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{result.summary.alta}</div>
          <div style={{ marginTop: 4 }}>{pill("ALTA", "#e8f5e9", "#2e7d32")}</div>
        </div>

        {/* REVISAR → abre wizard filtrado */}
        <div
          style={clickable}
          onClick={() => onOpenValidation?.("REVISAR")}
          onMouseOver={(e) => ((e.currentTarget.style.boxShadow = "0 0 0 3px #fff8e1"))}
          onMouseOut={(e) => ((e.currentTarget.style.boxShadow = "none"))}
          title="Validar solo REVISAR"
        >
          <div style={{ fontSize: 12, color: "#666" }}>Revisar</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{result.summary.revisar}</div>
          <div style={{ marginTop: 4 }}>{pill("REVISAR", "#fff8e1", "#f57f17")}</div>
        </div>

        {/* SIN → abre wizard filtrado */}
        <div
          style={clickable}
          onClick={() => onOpenValidation?.("SIN")}
          onMouseOver={(e) => ((e.currentTarget.style.boxShadow = "0 0 0 3px #ffebee"))}
          onMouseOut={(e) => ((e.currentTarget.style.boxShadow = "none"))}
          title="Validar solo SIN"
        >
          <div style={{ fontSize: 12, color: "#666" }}>Sin coincidencia</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{result.summary.sin}</div>
          <div style={{ marginTop: 4 }}>{pill("SIN", "#ffebee", "#c62828")}</div>
        </div>

        {/* Bloque Validación y botón general */}
        <div style={card}>
          <div style={{ fontSize: 12, color: "#666" }}>Validación</div>
          <div style={{ fontSize: 14, marginTop: 6, lineHeight: 1.8 }}>
            <div>✅ Aceptadas: <b>{counts.acc}</b></div>
            <div>🟡 Standby: <b>{counts.stb}</b></div>
            <div>❌ Rechazadas: <b>{counts.rej}</b></div>
            <div>⏳ Pendientes: <b>{counts.pending}</b></div>
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => onOpenValidation?.()}
              style={{ padding: "8px 12px", borderRadius: 8, background: "#1976d2", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Ir a Validación
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
