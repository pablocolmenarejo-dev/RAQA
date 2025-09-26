// src/components/ValidationWizard.tsx
import React, { useState } from "react";
import type { MatchRecord } from "@/types";
import { Pie } from "react-chartjs-2";

interface Props {
  matches: MatchRecord[];
  onClose: () => void;
}

export default function ValidationWizard({ matches, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<number, "ACCEPTED" | "REJECTED" | "STANDBY" | undefined>>({});

  const handleSet = (status: "ACCEPTED" | "REJECTED" | "STANDBY") => {
    setStatuses(prev => ({ ...prev, [idx]: status }));
  };

  const accepted = Object.values(statuses).filter(s => s === "ACCEPTED").length;
  const rejected = Object.values(statuses).filter(s => s === "REJECTED").length;
  const standby  = Object.values(statuses).filter(s => s === "STANDBY").length;
  const pending  = matches.length - accepted - rejected - standby;

  const current = matches[idx];

  const pieData = {
    labels: ["Aceptadas", "StandBy", "Rechazadas", "Pendientes"],
    datasets: [{
      data: [accepted, standby, rejected, pending],
      backgroundColor: ["#4CAF50", "#FFC107", "#F44336", "#9E9E9E"],
    }],
  };

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center",
        zIndex: 9999, overflowY: "auto",
      }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: 24, width: "90%", maxWidth: 900,
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 12, right: 12, padding: "4px 8px", cursor: "pointer" }}
        >
          Cerrar
        </button>

        <h2 style={{ marginTop: 0 }}>Validación de coincidencias</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 20 }}>
          <div style={{ width: 180, height: 180 }}>
            <Pie data={pieData} />
          </div>
          <div>
            <p><strong>Aceptadas:</strong> {accepted} ({((accepted / matches.length) * 100).toFixed(0)}%)</p>
            <p><strong>StandBy:</strong> {standby} ({((standby / matches.length) * 100).toFixed(0)}%)</p>
            <p><strong>Rechazadas:</strong> {rejected} ({((rejected / matches.length) * 100).toFixed(0)}%)</p>
            <p><strong>Pendientes:</strong> {pending} ({((pending / matches.length) * 100).toFixed(0)}%)</p>
          </div>
        </div>

        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          Registro {idx + 1} / {matches.length}
        </p>

        {current && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
            {/* Datos PRUEBA */}
            <div style={{ flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <h3 style={{ marginTop: 0 }}>PRUEBA</h3>
              <p><strong>Customer:</strong> {current.PRUEBA_customer ?? ""}</p>
              <p><strong>Nombre:</strong> {current.PRUEBA_nombre}</p>
              <p><strong>Calle:</strong> {current.PRUEBA_street}</p>
              <p><strong>Municipio:</strong> {current.PRUEBA_city}</p>
              <p><strong>CP:</strong> {current.PRUEBA_cp}</p>
              <p><strong>Nº vía:</strong> {current.PRUEBA_num}</p>
            </div>

            {/* Datos MINISTERIO */}
            <div
              style={{
                flex: 1, border: "1px solid #ddd", borderRadius: 8, padding: 12,
                background:
                  statuses[idx] === "ACCEPTED" ? "#e8f5e9" :
                  statuses[idx] === "REJECTED" ? "#ffebee" : "#fff",
              }}
            >
              <h3 style={{ marginTop: 0 }}>Ministerio (mejor match)</h3>
              <p><strong>Nombre:</strong> {current.MIN_nombre}</p>
              <p><strong>Vía:</strong> {current.MIN_via}</p>
              <p><strong>Nº vía:</strong> {current.MIN_num}</p>
              <p><strong>Municipio:</strong> {current.MIN_municipio}</p>
              <p><strong>CP:</strong> {current.MIN_cp}</p>
              <p><strong>Código centro (C):</strong> {current.MIN_codigo_centro}</p>
              <p><strong>Fecha última autorización (Y):</strong> {current.MIN_fecha_autoriz}</p>
              <p><strong>Oferta asistencial (AC):</strong> {current.MIN_oferta_asist}</p>

              {/* === SCORE grande === */}
              <p
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: statuses[idx] === "ACCEPTED" ? "#2e7d32"
                        : statuses[idx] === "REJECTED" ? "#c62828"
                        : "#333",
                  marginTop: 12,
                }}
              >
                SCORE: {current.SCORE.toFixed(3)}
              </p>
            </div>
          </div>
        )}

        {/* Controles */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
          <button
            onClick={() => setIdx(i => Math.max(0, i - 1))}
            disabled={idx === 0}
            style={{ padding: "8px 16px" }}
          >
            ← Anterior
          </button>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => handleSet("ACCEPTED")}
              style={{ padding: "8px 16px", background: "#4CAF50", color: "white", borderRadius: 6 }}
            >
              Aceptar
            </button>
            <button
              onClick={() => handleSet("STANDBY")}
              style={{ padding: "8px 16px", background: "#FFC107", color: "black", borderRadius: 6 }}
            >
              StandBy
            </button>
            <button
              onClick={() => handleSet("REJECTED")}
              style={{ padding: "8px 16px", background: "#F44336", color: "white", borderRadius: 6 }}
            >
              Rechazar
            </button>
          </div>
          <button
            onClick={() => setIdx(i => Math.min(matches.length - 1, i + 1))}
            disabled={idx === matches.length - 1}
            style={{ padding: "8px 16px" }}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
