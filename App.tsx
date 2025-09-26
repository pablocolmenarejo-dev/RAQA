// src/App.tsx
import React, { useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard from "@/components/ValidationWizard";
import { exportMatchesToExcel } from "@/services/reportGeneratorService";
import type { MatchOutput } from "@/types";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  const handleReset = () => {
    console.info("[App] reset");
    setResult(null);
    setShowWizard(false);
  };

  const openValidation = () => {
    console.info("[App] abrir validación, result:", result);
    if (!result) {
      alert("No hay resultados de matching todavía.");
      return;
    }
    if (!Array.isArray(result.matches) || result.matches.length === 0) {
      alert("No hay coincidencias en result.matches. Ejecuta el matching primero.");
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
        <DatabaseUploadScreen
          onResult={(r) => {
            console.info("[App] onResult recibido:", r);
            setResult(r);
          }}
        />
      </div>
    );
  }

  const matches = Array.isArray(result.matches) ? result.matches : [];
  console.info("[App] render resultados; matches:", matches.length, "summary:", result.summary);

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

      {/* Resumen + botón Ir a Validación */}
      <ResultsDashboard
        result={result}
        onOpenValidation={openValidation}
      />

      {/* Tabla por customer */}
      <ClientTable data={matches} />

      {/* Asistente de validación */}
      {showWizard && (
        <ValidationWizard
          matches={matches}
          onClose={() => {
            console.info("[App] cerrar validación");
            setShowWizard(false);
          }}
        />
      )}

      {/* (Opcional) JSON bruto */}
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
