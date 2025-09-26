// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard, { Decision, DecisionMap, makeMatchKey } from "@/components/ValidationWizard";
import { exportMatchesToExcel } from "@/services/reportGeneratorService";
import type { MatchOutput, MatchRecord } from "@/types";

const LS_KEY_DECISIONS = "raqa:decisions:v1";
const LS_KEY_COMMENTS  = "raqa:comments:v1";
type TierFilter = "ALL" | "ALTA" | "REVISAR" | "SIN";

export default function App() {
  const [result, setResult] = useState<MatchOutput | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardFilter, setWizardFilter] = useState<TierFilter>("ALL");

  // Decisiones persistentes (key -> decision)
  const [decisions, setDecisions] = useState<DecisionMap>({});
  // Comentarios persistentes (key -> texto)
  const [comments, setComments] = useState<Record<string, string>>({});

  // Hidratar desde localStorage
  useEffect(() => {
    try {
      const rawD = localStorage.getItem(LS_KEY_DECISIONS);
      if (rawD) setDecisions(JSON.parse(rawD));
    } catch {}
    try {
      const rawC = localStorage.getItem(LS_KEY_COMMENTS);
      if (rawC) setComments(JSON.parse(rawC));
    } catch {}
  }, []);

  // Persistir
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_DECISIONS, JSON.stringify(decisions)); } catch {}
  }, [decisions]);
  useEffect(() => {
    try { localStorage.setItem(LS_KEY_COMMENTS, JSON.stringify(comments)); } catch {}
  }, [comments]);

  // Limpiar claves huérfanas al cambiar matches
  useEffect(() => {
    if (!result?.matches?.length) return;
    const validKeys = new Set(result.matches.map((m) => makeMatchKey(m)));
    setDecisions((prev) => {
      const next: DecisionMap = {};
      for (const [k, v] of Object.entries(prev)) if (validKeys.has(k)) next[k] = v;
      return next;
    });
    setComments((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev)) if (validKeys.has(k)) next[k] = v;
      return next;
    });
  }, [result?.matches]);

  const handleReset = () => {
    setResult(null);
    setShowWizard(false);
    setWizardFilter("ALL");
    // Si prefieres borrar también decisiones/comentarios, descomenta:
    // setDecisions({});
    // setComments({});
  };

  const openValidation = (tier?: "ALTA" | "REVISAR" | "SIN") => {
    if (!result?.matches?.length) {
      alert("No hay coincidencias todavía. Ejecuta el matching primero.");
      return;
    }
    setWizardFilter(tier ?? "ALL");
    setShowWizard(true);
  };

  const handleDecide = (m: MatchRecord, d: Decision) => {
    const key = makeMatchKey(m);
    setDecisions((prev) => ({ ...prev, [key]: d }));
  };
  const handleComment = (m: MatchRecord, text: string) => {
    const key = makeMatchKey(m);
    setComments((prev) => ({ ...prev, [key]: text }));
  };

  // Data anotada (para la tabla)
  const annotated = useMemo(() => {
    const arr = result?.matches ?? [];
    return arr.map((m) => ({
      ...m,
      __decision: decisions[makeMatchKey(m)] as Decision | undefined,
      __comment:  comments[makeMatchKey(m)] ?? "",
    }));
  }, [result?.matches, decisions, comments]);

  // Filtrado para el Wizard
  const matchesForWizard = useMemo(() => {
    const arr = result?.matches ?? [];
    if (wizardFilter === "ALL") return arr;
    return arr.filter((m) => m.TIER === wizardFilter);
  }, [result?.matches, wizardFilter]);

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
          onClick={() => exportMatchesToExcel(result, decisions, comments, "matches.xlsx")}
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
        decisions={decisions}
        onOpenValidation={openValidation}
      />

      <ClientTable data={annotated} decisions={decisions} comments={comments} />

      {showWizard && (
        <ValidationWizard
          matches={matchesForWizard}
          decisions={decisions}
          comments={comments}
          onDecide={handleDecide}
          onComment={handleComment}
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
{JSON.stringify({ result, wizardFilter, decisions, comments }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
