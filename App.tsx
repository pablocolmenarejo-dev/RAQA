// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard, { Decision, DecisionMap, makeMatchKey } from "@/components/ValidationWizard";
import { exportMatchesToExcel } from "@/services/reportGeneratorService";
import type { MatchOutput, MatchRecord } from "@/types";

const LS_KEY = "raqa:decisions:v1";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Decisiones persistentes (key -> decision)
  const [decisions, setDecisions] = useState<DecisionMap>({});

  // Hidratar desde localStorage al arrancar la app
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setDecisions(JSON.parse(raw));
    } catch {}
  }, []);

  // Persistir en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(decisions));
    } catch {}
  }, [decisions]);

  // Cuando recibimos un nuevo resultado, podemos “limpiar” decisiones huérfanas
  useEffect(() => {
    if (!result?.matches?.length) return;
    const validKeys = new Set(
      result.matches.map((m) => makeMatchKey(m))
    );
    setDecisions((prev) => {
      const next: DecisionMap = {};
      for (const [k, v] of Object.entries(prev)) {
        if (validKeys.has(k)) next[k] = v;
      }
      return next;
    });
  }, [result?.matches]);

  const handleReset = () => {
    setResult(null);
    setShowWizard(false);
    // NO borramos decisions para conservar lo ya validado,
    // si quieres borrar también decisiones, descomenta la siguiente línea:
    // setDecisions({});
  };

  const openValidation = () => {
    if (!result?.matches?.length) {
      alert("No hay coincidencias todavía. Ejecuta el matching primero.");
      return;
    }
    setShowWizard(true);
  };

  const handleDecide = (m: MatchRecord, d: Decision) => {
    const key = makeMatchKey(m);
    setDecisions((prev) => ({ ...prev, [key]: d }));
  };

  // matches anotados con decision actual
  const annotated = useMemo(() => {
    const arr = result?.matches ?? [];
    return arr.map((m) => ({ ...m, __decision: decisions[makeMatchKey(m)] as Decision | undefined }));
  }, [result?.matches, decisions]);

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

      {/* Resumen + botón Ir a Validación; le pasamos las decisiones para el donut */}
      <ResultsDashboard
        result={result}
        decisions={decisions}
        onOpenValidation={openValidation}
      />

      {/* Tabla por customer con badges de estado */}
      <ClientTable data={annotated} decisions={decisions} />

      {/* Asistente de validación (modal) */}
      {showWizard && (
        <ValidationWizard
          matches={result.matches}
          decisions={decisions}
          onDecide={handleDecide}
          onClose={() => setShowWizard(false)}
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
{JSON.stringify({ result, decisions }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
