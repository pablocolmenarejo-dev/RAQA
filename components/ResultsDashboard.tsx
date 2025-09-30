// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
}

// Componente para inyectar las fuentes de Google
const GoogleFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');
  `}</style>
);

export default function ResultsDashboard({ result, decisions = {}, onOpenValidation }: Props) {
  const counts = useMemo(() => {
    const rows = result.matches ?? [];
    let acc = 0, rej = 0, stb = 0;
    for (const m of rows) {
      const d = decisions[makeMatchKey(m)];
      if (d === "ACCEPTED") acc++;
      else if (d === "REJECTED") rej++;
      else if (d === "STANDBY")  stb++;
    }
    return { acc, rej, stb, pending: Math.max(0, rows.length - acc - rej - stb) };
  }, [result.matches, decisions]);

  const styles: { [key: string]: React.CSSProperties } = {
    section: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
      gap: '20px',
      marginBottom: '24px',
      fontFamily: "'Lato', sans-serif",
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)',
      border: '1px solid #e9eef2',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    cardClickable: {
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    cardLabel: {
      fontSize: '14px',
      color: '#5a7184',
      fontWeight: 400,
    },
    cardValue: {
      fontSize: '28px',
      fontWeight: 700,
      color: '#0d2f5a',
    },
    pill: {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      marginTop: 'auto',
      alignSelf: 'flex-start'
    },
    validationList: {
      listStyle: 'none',
      padding: 0,
      margin: '8px 0',
      fontSize: '14px',
      color: '#334e68',
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '6px'
    },
    button: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      fontWeight: 700,
      color: '#ffffff',
      backgroundColor: '#005a9e',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s, box-shadow 0.2s',
      marginTop: 'auto', // Alinea el botón al final de la tarjeta
      boxShadow: '0 4px 10px rgba(0, 90, 158, 0.15)',
      fontFamily: "'Lato', sans-serif",
    },
  };

  const pillColors = {
    ALTA: { background: "#e8f5e9", color: "#2e7d32" },
    REVISAR: { background: "#fff8e1", color: "#f57f17" },
    SIN: { background: "#ffebee", color: "#c62828" },
  };

  return (
    <>
      <GoogleFonts />
      <section style={styles.section}>
        {/* Card: Total PRUEBA */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Registros</div>
          <div style={styles.cardValue}>{result.summary.n_prueba}</div>
        </div>

        {/* Card: Alta confianza */}
        <div
          style={{ ...styles.card, ...styles.cardClickable }}
          onClick={() => onOpenValidation?.("ALTA")}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
          }}
          title="Validar solo ALTA"
        >
          <div style={styles.cardLabel}>Alta Confianza</div>
          <div style={styles.cardValue}>{result.summary.alta}</div>
          <span style={{...styles.pill, ...pillColors.ALTA}}>ALTA</span>
        </div>

        {/* Card: Revisar */}
        <div
          style={{ ...styles.card, ...styles.cardClickable }}
          onClick={() => onOpenValidation?.("REVISAR")}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
          }}
          title="Validar solo REVISAR"
        >
          <div style={styles.cardLabel}>Revisar</div>
          <div style={styles.cardValue}>{result.summary.revisar}</div>
          <span style={{...styles.pill, ...pillColors.REVISAR}}>REVISAR</span>
        </div>

        {/* Card: Sin coincidencia */}
        <div
          style={{ ...styles.card, ...styles.cardClickable }}
          onClick={() => onOpenValidation?.("SIN")}
           onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-3px)";
            e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
          }}
          title="Validar solo SIN"
        >
          <div style={styles.cardLabel}>Sin Coincidencia</div>
          <div style={styles.cardValue}>{result.summary.sin}</div>
          <span style={{...styles.pill, ...pillColors.SIN}}>SIN</span>
        </div>

        {/* Card: Validación */}
        <div style={styles.card}>
          <div style={styles.cardLabel}>Resumen Validación</div>
          <ul style={styles.validationList}>
            <li>✅ Aceptadas: <b>{counts.acc}</b></li>
            <li>🟡 Standby: <b>{counts.stb}</b></li>
            <li>❌ Rechazadas: <b>{counts.rej}</b></li>
            <li>⏳ Pendientes: <b>{counts.pending}</b></li>
          </ul>
          <button
            onClick={() => onOpenValidation?.()}
            style={styles.button}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#004a8d'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
          >
            Ir a Validación
          </button>
        </div>
      </section>
    </>
  );
}
