// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput } from "@/types";
import type { DecisionMap } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
  // Añadimos un prop para manejar el click en las tarjetas de validación (opcional)
  onOpenValidationStatus?: (status: 'ACCEPTED' | 'REJECTED' | 'STANDBY' | 'PENDING') => void;
}

// --- Componente Donut (adaptado de ValidationWizard) ---
const COLORS = {
  accepted: "#4CAF50", // Verde
  standby:  "#FFC107", // Ámbar
  rejected: "#F44336", // Rojo
  pending:  "#9E9E9E", // Gris
};

function Donut({
  accepted, standby, rejected, pending, size = 160, stroke = 18, // Ajustar tamaño y grosor
}: { accepted: number; standby: number; rejected: number; pending: number; size?: number; stroke?: number; }) {
  const total = Math.max(1, accepted + standby + rejected + pending);
  const radius = (size - stroke) / 2;
  const C = 2 * Math.PI * radius;

  const segs = [
    { v: accepted, c: COLORS.accepted, label: 'Aceptadas' },
    { v: standby,  c: COLORS.standby,  label: 'Standby' },
    { v: rejected, c: COLORS.rejected, label: 'Rechazadas'},
    { v: pending,  c: COLORS.pending,  label: 'Pendientes'},
  ];

  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}> {/* Rotar para empezar arriba */}
        <circle r={radius} cx={size/2} cy={size/2} fill="transparent" stroke="#eee" strokeWidth={stroke} />
        {segs.map((s, i) => {
          if (s.v === 0) return null; // No dibujar segmentos vacíos
          const len = C * (s.v / total);
          const dash = `${len} ${C - len}`;
          const el = (
            <circle
              key={i}
              r={radius}
              cx={size/2}
              cy={size/2}
              fill="transparent"
              stroke={s.c}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt" // Mejor acabado visual para segmentos finos
            >
              <title>{`${s.label}: ${s.v} (${(s.v/total*100).toFixed(1)}%)`}</title> {/* Tooltip */}
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
       {/* Leyenda central opcional o valor total */}
       <div style={{
         position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
         textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#0d2f5a'
        }}>
         {total}
         <div style={{fontSize: '12px', color: '#5a7184', fontWeight: 400}}>Total</div>
       </div>
    </div>
  );
}
// --- Fin Componente Donut ---


// Componente para inyectar las fuentes de Google
const GoogleFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');
  `}</style>
);

export default function ResultsDashboard({ result, decisions = {}, onOpenValidation, onOpenValidationStatus }: Props) {
  const counts = useMemo(() => {
    const rows = result.matches ?? [];
    let acc = 0, rej = 0, stb = 0;
    for (const m of rows) {
      const d = decisions[makeMatchKey(m)];
      if (d === "ACCEPTED") acc++;
      else if (d === "REJECTED") rej++;
      else if (d === "STANDBY")  stb++;
    }
    const pending = Math.max(0, rows.length - acc - rej - stb);
    return { acc, rej, stb, pending };
  }, [result.matches, decisions]);

  const styles: { [key: string]: React.CSSProperties } = {
    // Contenedor principal
    dashboardContainer: {
        fontFamily: "'Lato', sans-serif",
        marginBottom: '24px',
    },
    // Sección superior (Total y Tiers)
    sectionTop: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)", // 4 columnas iguales
      gap: '16px', // Espacio reducido
      marginBottom: '24px',
    },
    // Sección inferior (Gráfico y Validación)
    sectionBottom: {
      display: "grid",
      // 1 columna para el gráfico (más ancha), 4 para las tarjetas
      gridTemplateColumns: "1.5fr repeat(4, 1fr)",
      gap: '16px',
      alignItems: 'stretch', // Asegura que las tarjetas y el gráfico tengan la misma altura si es posible
    },
    // Tarjeta base (común a todas)
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      padding: '16px', // Padding ligeramente reducido
      boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)',
      border: '1px solid #e9eef2',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px', // Espacio interno reducido
    },
    // Modificador para tarjetas clicables
    cardClickable: {
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    // Estilos específicos para tarjetas superiores (Total, Tiers)
    cardTopLabel: {
      fontSize: '13px', // Ligeramente más pequeño
      color: '#5a7184',
      fontWeight: 400,
    },
    cardTopValue: {
      fontSize: '24px', // Ligeramente más pequeño
      fontWeight: 700,
      color: '#0d2f5a',
      lineHeight: 1.2,
    },
    // Pill para Tiers (sin cambios)
    pill: {
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 700,
      marginTop: 'auto',
      alignSelf: 'flex-start'
    },
    // Contenedor del gráfico
    chartContainer: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)',
        border: '1px solid #e9eef2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartTitle: {
      fontSize: '14px',
      fontWeight: 700,
      color: '#0d2f5a',
      marginBottom: '12px',
      textAlign: 'center' as 'center',
    },
    // Tarjetas inferiores (Validación) - Más prominentes
    cardValidation: {
       padding: '20px', // Más padding
       alignItems: 'center', // Centrar contenido
       textAlign: 'center' as 'center',
    },
    cardValidationLabel: {
      fontSize: '14px',
      color: '#5a7184',
      fontWeight: 700, // Más peso
      marginBottom: '4px',
    },
    cardValidationValue: {
      fontSize: '32px', // Valor más grande
      fontWeight: 700,
      lineHeight: 1.1,
      marginBottom: '8px',
    },
    // Colores específicos para valores de validación
    valueAccepted: { color: COLORS.accepted },
    valueStandby: { color: COLORS.standby },
    valueRejected: { color: COLORS.rejected },
    valuePending: { color: COLORS.pending },
  };

  const pillColors = {
    ALTA: { background: "#e8f5e9", color: "#2e7d32" },
    REVISAR: { background: "#fff8e1", color: "#f57f17" },
    SIN: { background: "#ffebee", color: "#c62828" },
  };

  // Helper para aplicar estilos hover a tarjetas clicables
  const addHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "translateY(-3px)";
    e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
  };
  const removeHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "none";
    e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
  };

  return (
    <>
      <GoogleFonts />
      <div style={styles.dashboardContainer}>
        {/* --- Sección Superior: Total y Tiers --- */}
        <section style={styles.sectionTop}>
          {/* Card: Total Registros */}
          <div style={styles.card}>
            <div style={styles.cardTopLabel}>Total Registros</div>
            <div style={styles.cardTopValue}>{result.summary.n_prueba}</div>
          </div>

          {/* Card: Alta confianza */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("ALTA")}
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar solo ALTA"
          >
            <div style={styles.cardTopLabel}>Alta Confianza</div>
            <div style={styles.cardTopValue}>{result.summary.alta}</div>
            <span style={{...styles.pill, ...pillColors.ALTA}}>ALTA</span>
          </div>

          {/* Card: Revisar */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("REVISAR")}
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar solo REVISAR"
          >
            <div style={styles.cardTopLabel}>Revisar</div>
            <div style={styles.cardTopValue}>{result.summary.revisar}</div>
            <span style={{...styles.pill, ...pillColors.REVISAR}}>REVISAR</span>
          </div>

          {/* Card: Sin coincidencia */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("SIN")}
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar solo SIN"
          >
            <div style={styles.cardTopLabel}>Sin Coincidencia</div>
            <div style={styles.cardTopValue}>{result.summary.sin}</div>
            <span style={{...styles.pill, ...pillColors.SIN}}>SIN</span>
          </div>
        </section>

        {/* --- Sección Inferior: Gráfico y Estados de Validación --- */}
        <section style={styles.sectionBottom}>
          {/* Gráfico Circular */}
          <div style={styles.chartContainer}>
             <div style={styles.chartTitle}>Distribución Validación</div>
             <Donut
                accepted={counts.acc}
                standby={counts.stb}
                rejected={counts.rej}
                pending={counts.pending}
             />
          </div>

          {/* Card: Aceptadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Aceptadas"
             onClick={() => onOpenValidationStatus?.('ACCEPTED')}
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            <div style={styles.cardValidationLabel}>Aceptadas</div>
            <div style={{...styles.cardValidationValue, ...styles.valueAccepted}}>
                {counts.acc}
            </div>
            {/* Opcional: % */}
            {/* <div style={{ fontSize: '12px', color: COLORS.accepted }}>{((counts.acc / (result.matches.length || 1)) * 100).toFixed(0)}%</div> */}
          </div>

          {/* Card: Standby */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Standby"
             onClick={() => onOpenValidationStatus?.('STANDBY')}
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            <div style={styles.cardValidationLabel}>Standby</div>
            <div style={{...styles.cardValidationValue, ...styles.valueStandby}}>
                {counts.stb}
            </div>
          </div>

          {/* Card: Rechazadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Rechazadas"
             onClick={() => onOpenValidationStatus?.('REJECTED')}
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            <div style={styles.cardValidationLabel}>Rechazadas</div>
            <div style={{...styles.cardValidationValue, ...styles.valueRejected}}>
                {counts.rej}
            </div>
          </div>

          {/* Card: Pendientes */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Pendientes"
             onClick={() => onOpenValidationStatus?.('PENDING')}
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            <div style={styles.cardValidationLabel}>Pendientes</div>
            <div style={{...styles.cardValidationValue, ...styles.valuePending}}>
                {counts.pending}
            </div>
          </div>

        </section>
      </div>
    </>
  );
}
