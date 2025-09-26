// src/components/ValidationWizard.tsx
import React, { useMemo, useState } from "react";
import type { MatchOutput, MatchRecord } from "@/types";

export type Decision = "accepted" | "rejected" | "standby";
export type DecisionMap = Record<string, Decision>;

type Props = {
  result: MatchOutput;
  decisions: DecisionMap;
  onDecide: (key: string, decision: Decision) => void;
  onClose: () => void;
};

function keyFor(m: MatchRecord, idx: number) {
  // Clave estable por fila de PRUEBA (customer+nombre+street+cp) + índice en el orden mostrado
  return [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_street ?? "",
    m.PRUEBA_cp ?? "",
    idx.toString(),
  ].join("||");
}

export default function ValidationWizard({ result, decisions, onDecide, onClose }: Props) {
  const ordered = useMemo(() => {
    return [...result.matches].sort((a, b) => {
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    });
  }, [result]);

  const [cursor, setCursor] = useState(0);

  const m = ordered[cursor];
  if (!m) {
    return (
      <div style={container}>
        <header style={headerStyle}>
          <h2 style={{ margin: 0, flex: 1 }}>Validación</h2>
          <button onClick={onClose} style={btn}>Cerrar</button>
        </header>
        <p>No hay filas que validar.</p>
      </div>
    );
  }

  const rowKey = keyFor(m, cursor);
  const current = decisions[rowKey];

  const go = (delta: number) => {
    const next = Math.max(0, Math.min(ordered.length - 1, cursor + delta));
    setCursor(next);
  };

  const decide = (d: Decision) => onDecide(rowKey, d);

  return (
    <div style={container}>
      <header style={headerStyle}>
        <h2 style={{ margin: 0, flex: 1 }}>Validación</h2>
        <button onClick={onClose} style={btn}>Cerrar</button>
      </header>

      <div style={{ color: "#666", marginBottom: 8 }}>
        Registro {cursor + 1} de {ordered.length}
      </div>

      <div style={grid}>
        {/* Lado PRUEBA */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>PRUEBA</h3>
          <p><strong>Customer:</strong> {m.PRUEBA_customer ?? ""}</p>
          <p><strong>Nombre:</strong> {m.PRUEBA_nombre}</p>
          <p><strong>Calle:</strong> {m.PRUEBA_street}</p>
          <p><strong>Municipio:</strong> {m.PRUEBA_city}</p>
          <p><strong>CP:</strong> {m.PRUEBA_cp ?? ""}</p>
          <p><strong>Nº vía:</strong> {m.PRUEBA_num ?? ""}</p>
        </div>

        {/* Lado MIN */}
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Coincidencia propuesta</h3>
          <p><strong>Fuente:</strong> {m.MIN_source ?? ""}</p>
          <p><strong>Nombre:</strong> {m.MIN_nombre ?? ""}</p>
          <p><strong>Vía:</strong> {m.MIN_via ?? ""} <strong> Nº:</strong> {m.MIN_num ?? ""}</p>
          <p><strong>Municipio:</strong> {m.MIN_municipio ?? ""}</p>
          <p><strong>CP:</strong> {m.MIN_cp ?? ""}</p>
          <p><strong>SCORE:</strong> {m.SCORE.toFixed(3)} | <strong>TIER:</strong> {m.TIER}</p>
          <p><strong>CCN:</strong> {m.MIN_codigo_centro ?? ""}</p>
          <p><strong>Fecha última autorización:</strong> {m.MIN_fecha_autoriz ?? ""}</p>
          <p><strong>Oferta asistencial:</strong> {m.MIN_oferta_asist ?? ""}</p>
        </div>
      </div>

      {/* Botones de decisión */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          onClick={() => decide("accepted")}
          style={{ ...btn, background: "#2e7d32", color: "#fff", borderColor: "#2e7d32" }}
        >
          Aceptar
        </button>
        <button
          onClick={() => decide("standby")}
          style={{ ...btn, background: "#f57f17", color: "#fff", borderColor: "#f57f17" }}
        >
          Dejar en stand-by
        </button>
        <button
          onClick={() => decide("rejected")}
          style={{ ...btn, background: "#c62828", color: "#fff", borderColor: "#c62828" }}
        >
          Rechazar
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => go(-1)} style={btn}>Anterior</button>
          <button onClick={() => go(1)} style={btn}>Siguiente</button>
        </div>
      </div>

      {/* Estado actual */}
      <div style={{ marginTop: 8, color: "#444" }}>
        Estado actual del registro:{" "}
        <strong>
          {current === "accepted" ? "ACEPTADA" : current === "rejected" ? "RECHAZADA" :
            current === "standby" ? "STAND-BY" : "SIN DECISIÓN"}
        </strong>
      </div>
    </div>
  );
}

const container: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 16,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(240px, 1fr))",
  gap: 12,
};

const card: React.CSSProperties = {
  border: "1px solid #eee",
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

