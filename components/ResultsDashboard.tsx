// src/components/ResultsDashboard.tsx
import React from "react";
import type { MatchOutput } from "@/types";

interface Props {
  result: MatchOutput;
  onGoValidate: () => void;
}

export default function ResultsDashboard({ result, onGoValidate }: Props) {
  const { summary } = result;

  return (
    <section style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Card label="Total PRUEBA" value={summary.n_prueba} />
        <Card label="Alta confianza" value={summary.alta} />
        <Card label="Revisar" value={summary.revisar} />
        <Card label="Sin coincidencia" value={summary.sin} />
      </div>

      {/* Aquí podrías mantener tu gráfico si ya lo tenías (omito por brevedad) */}

      <div style={{ textAlign: "right" }}>
        <button
          onClick={onGoValidate}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #1565c0",
            background: "#1976d2",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Validar coincidencias
        </button>
      </div>
    </section>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: "10px 12px",
  background: "#fafafa",
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: "#666" };
const valueStyle: React.CSSProperties = { fontSize: 20, fontWeight: 700 };
