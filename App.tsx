// src/App.tsx
import React, { useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard from "@/components/ValidationWizard";
import type { MatchOutput, MatchRecord } from "@/types";

type Mode = "results" | "validate" | "upload";

export default function App() {
  const [mode, setMode] = useState<Mode>("upload");
  const [result, setResult] = useState<MatchOutput | null>(null);

  const handleGotResult = (r: MatchOutput) => {
    setResult(r);
    setMode("results");
  };

  const handleReset = () => {
    setResult(null);
    setMode("upload");
  };

  const orderedMatches = useMemo<MatchRecord[]>(() => {
    if (!result) return [];
    return [...result.matches].sort((a, b) => {
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    });
  }, [result]);

  if (mode === "upload" || !result) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ marginBottom: 12 }}>RAQA – Buscador de coincidencias</h1>
        <p style={{ marginTop: 0, color: "#555" }}>
          Sube tu fichero <strong>PRUEBA.xlsx</strong> y hasta <strong>4 Excel</strong> del Ministerio.
          Calcularemos coincidencias con la metodología determinista (sin IA).
        </p>
        <DatabaseUploadScreen onResult={handleGotResult} />
      </div>
    );
  }

  if (mode === "validate") {
    return (
      <ValidationWizard
        result={result}
        onBack={() => setMode("results")}
        onFinish={(decisions) => {
          console.log("Decisiones finales:", decisions);
          setMode("results");
        }}
      />
    );
  }

  // mode === "results"
  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>RAQA – Resultados</h1>
        <button
          onClick={() => setMode("validate")}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1565c0", background: "#1976d2", color: "white", cursor: "pointer" }}
        >
          Ir a validación
        </button>
        <button
          onClick={handleReset}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", cursor: "pointer", background: "white" }}
        >
          Reiniciar
        </button>
      </header>

      {/* Resumen + gráfico + botón a validación */}
      <ResultsDashboard result={result} onGoValidate={() => setMode("validate")} />

      {/* Menú por Customer con SCORE/TIER/fuente y C/Y/AC */}
      <section style={{ marginTop: 16 }}>
        <ClientTable data={orderedMatches} />
      </section>

      {/* (Opcional) JSON para depuración */}
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
