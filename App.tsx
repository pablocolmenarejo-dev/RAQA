// src/App.tsx
import React, { useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard, { Decision, DecisionMap } from "@/components/ValidationWizard";
import { exportMatchesToExcel } from "@/services/reportGeneratorService";
import type { MatchOutput } from "@/types";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [decisions, setDecisions] = useState<DecisionMap>({});

  const handleReset = () => {
    setResult(null);
    setShowWizard(false);
    setDecisions({});
  };

  const handleDecide = (idx: number, d: Decision) => {
    setDecisions((prev) => ({ ...prev, [idx]: d }));
  };

  const openValidation = () => {
    if (!result?.matches?.length) {
      alert("No hay matches para validar.");
      return;
    }
    setShowWizard(true);
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
          onClick={() => exportMatchesToExcel(result, "matches.xlsx")}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #0c6",
            background: "#0f9d58",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Exportar Excel
        </button>

        <button
          onClick={handleReset}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", cursor: "pointer" }}
        >
          Reiniciar
        </button>
      </header>

      <ResultsDashboard
        result={result}
        onOpenValidation={openValidation}
      />

      <ClientTable data={result.matches} />

      {showWizard && (
        <ValidationWizard
          matches={result.matches}           {/* ← AQUÍ EL CAMBIO */}
          decisions={decisions}
          onDecide={handleDecide}
          onClose={() => setShowWizard(false)}
        />
      )}

      <details style={{ marginTop: 12 }}>
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
