// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard, { Decision, DecisionMap } from "@/components/ValidationWizard";
import type { MatchOutput, MatchRecord } from "@/types";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);

  // Decisiones: clave -> 'accepted' | 'rejected' | 'standby'
  const [decisions, setDecisions] = useState<DecisionMap>({});

  // Cargar/guardar en localStorage
  useEffect(() => {
    const raw = localStorage.getItem("raqa_decisions");
    if (raw) {
      try { setDecisions(JSON.parse(raw)); } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("raqa_decisions", JSON.stringify(decisions));
  }, [decisions]);

  const handleReset = () => {
    setResult(null);
    setDecisions({});
    localStorage.removeItem("raqa_decisions");
  };

  const orderedMatches = useMemo<MatchRecord[]>(() => {
    if (!result) return [];
    return [...result.matches].sort((a, b) => {
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    });
  }, [result]);

  const [showWizard, setShowWizard] = useState(false);

  const handleDecide = (key: string, decision: Decision) => {
    setDecisions((prev) => ({ ...prev, [key]: decision }));
  };

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

      {/* Resumen + Pie + botón Validación */}
      <ResultsDashboard
        result={result}
        decisions={decisions}
        onOpenValidation={() => setShowWizard(true)}
      />

      {/* Tabla (puedes añadir una columna que muestre el estado actual si quieres) */}
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

      {/* Asistente de validación (modal simple inline) */}
      {showWizard && result && (
        <ValidationWizard
          result={result}
          decisions={decisions}
          onDecide={handleDecide}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* (Opcional) JSON bruto */}
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
{JSON.stringify({ result, decisions }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle: React.CSSProperties = { textAlign: "left", borderBottom: "2px solid #ddd", padding: "8px 6px", background: "#f7f7f7", position: "sticky", top: 0, zIndex: 1 };
const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "6px", verticalAlign: "top" };

function tierBadgeStyle(tier: string): React.CSSProperties {
  const base: React.CSSProperties = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 700 };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" };
}

