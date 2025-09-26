// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import DecisionPie, { } from "@/components/DecisionPie";
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";

type Props = {
  result: MatchOutput;
  decisions: DecisionMap;
  onOpenValidation: () => void;
};

export default function ResultsDashboard({ result, decisions, onOpenValidation }: Props) {
  const totals = useMemo(() => {
    let accepted = 0, standby = 0, rejected = 0;
    // Un registro no decidido cuenta como "pendiente" (stand-by + sin decidir)
    for (let i = 0; i < result.matches.length; i++) {
      const m = result.matches[i];
      const key = [
        m.PRUEBA_customer ?? "",
        m.PRUEBA_nombre ?? "",
        m.PRUEBA_street ?? "",
        m.PRUEBA_cp ?? "",
        i.toString(),
      ].join("||");
      const d = decisions[key];
      if (d === "accepted") accepted++;
      else if (d === "rejected") rejected++;
      else standby++; // sin decidir o stand-by
    }
    return { accepted, standby, rejected };
  }, [result, decisions]);

  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 8, marginBottom: 16 }}>
        <Card label="Total PRUEBA" value={result.summary.n_prueba} />
        <Card label="Alta confianza" value={result.summary.alta} />
        <Card label="Revisar" value={result.summary.revisar} />
        <Card label="Sin coincidencia" value={result.summary.sin} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <DecisionPie accepted={totals.accepted} standby={totals.standby} rejected={totals.rejected} />
        <button
          onClick={onOpenValidation}
          style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #1976d2", background: "#1976d2", color: "#fff", cursor: "pointer", fontWeight: 700 }}
        >
          Ir a Validación
        </button>
      </div>
    </section>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      border: "1px solid #e5e5e5",
      borderRadius: 8,
      padding: "10px 12px",
      background: "#fafafa",
    }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

