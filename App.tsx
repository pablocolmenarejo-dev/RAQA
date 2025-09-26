// App.tsx
import React, { useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import type { MatchOutput, MatchRecord } from "@/types";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);

  const handleReset = () => setResult(null);

  // Ordenamos por Customer y SCORE (aunque ya viene ordenado desde el servicio)
  const orderedMatches = useMemo<MatchRecord[]>(() => {
    if (!result) return [];
    return [...result.matches].sort((a, b) => {
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    });
  }, [result]);

  if (!result) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ marginBottom: 12 }}>RAQA – Buscador de coincidencias</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Sube tu fichero <strong>PRUEBA.xlsx</strong> y hasta <strong>4 Excel</strong> del Ministerio.
          Calcularemos coincidencias con la metodología determinista (sin IA).
        </p>
        <DatabaseUploadScreen onResult={setResult} />
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>RAQA – Resultados</h1>
        <button
          onClick={handleReset}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", cursor: "pointer" }}
        >
          Reiniciar
        </button>
      </header>

      {/* Resumen */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div style={cardStyle}>
          <div style={labelStyle}>Total PRUEBA</div>
          <div style={valueStyle}>{result.summary.n_prueba}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Alta confianza</div>
          <div style={valueStyle}>{result.summary.alta}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Revisar</div>
          <div style={valueStyle}>{result.summary.revisar}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Sin coincidencia</div>
          <div style={valueStyle}>{result.summary.sin}</div>
        </div>
      </section>

      {/* Tabla simple de matches */}
      <section style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Matches (ordenados por SCORE)</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Customer</th>
                <th style={thStyle}>PRUEBA_nombre</th>
                <th style={thStyle}>PRUEBA_street</th>
                <th style={thStyle}>PRUEBA_city</th>
                <th style={thStyle}>PRUEBA_cp</th>
                <th style={thStyle}>MIN_nombre</th>
                <th style={thStyle}>MIN_via</th>
                <th style={thStyle}>MIN_num</th>
                <th style={thStyle}>MIN_municipio</th>
                <th style={thStyle}>MIN_cp</th>
                <th style={thStyle}>SCORE</th>
                <th style={thStyle}>TIER</th>
                <th style={thStyle}>Fuente</th>
                <th style={thStyle}>Código centro (C)</th>
                <th style={thStyle}>Fecha última aut. (Y)</th>
                <th style={thStyle}>Oferta asistencial (AC)</th>
              </tr>
            </thead>
            <tbody>
              {orderedMatches.map((m, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{m.PRUEBA_customer ?? ""}</td>
                  <td style={tdStyle}>{m.PRUEBA_nombre}</td>
                  <td style={tdStyle}>{m.PRUEBA_street}</td>
                  <td style={tdStyle}>{m.PRUEBA_city}</td>
                  <td style={tdStyle}>{m.PRUEBA_cp ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_nombre ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_via ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_num ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_municipio ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_cp ?? ""}</td>
                  <td style={tdStyle}>{m.SCORE.toFixed(3)}</td>
                  <td style={tdStyle}>
                    <span style={tierBadgeStyle(m.TIER)}>{m.TIER}</span>
                  </td>
                  <td style={tdStyle}>{m.MIN_source ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_codigo_centro ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_fecha_autoriz ?? ""}</td>
                  <td style={tdStyle}>{m.MIN_oferta_asist ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* (Opcional) Vista rápida del JSON para depuración */}
      <details>
        <summary style={{ cursor: "pointer", marginBottom: 8 }}>Ver JSON bruto</summary>
        <pre
          style={{
            background: "#0b1021",
            color: "#cde6ff",
            padding: 12,
            borderRadius: 8,
            maxHeight: 320,
            overflow: "auto",
            fontSize: 12,
          }}
        >
{JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ───────── estilos inline sencillos para no depender de CSS externo ─────────

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: "10px 12px",
  background: "#fafafa",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
};

const valueStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "8px 6px",
  background: "#f7f7f7",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "6px",
  verticalAlign: "top",
};

function tierBadgeStyle(tier: string): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" };
}
