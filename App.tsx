// App.tsx
import React, { useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationScreen from "@/components/ValidationScreen";
import type { MatchOutput } from "@/types";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);

  const handleReset = () => setResult(null);

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

      {/* Resumen con métricas y gráfico */}
      <ResultsDashboard result={result} />

      {/* Menú por Customer con SCORE/TIER/fuente y C/Y/AC */}
      <ClientTable data={result.matches} />

      {/* Pantalla de validación por registro con Top-3 */}
      <ValidationScreen
        result={result}
        onBack={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        onConfirmMatch={(m) => {
          // Aquí podrías marcar el match como confirmado o guardarlo donde corresponda
          console.log("Match confirmado:", m);
        }}
      />

      {/* (Opcional) JSON bruto para depuración */}
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
