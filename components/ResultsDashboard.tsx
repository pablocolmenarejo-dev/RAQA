// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput, MatchRecord } from "@/types"; // Asegúrate de que MatchRecord esté importado si no lo estaba
import type { DecisionMap } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
  // Mantenemos este prop por si quieres filtrar la tabla por estado de validación
  onOpenValidationStatus?: (status: 'ACCEPTED' | 'REJECTED' | 'STANDBY' | 'COMPLETED' | 'PENDING_ALL') => void;
}

// --- Componente Donut (sin cambios respecto a la versión anterior) ---
const COLORS = {
  accepted: "#4CAF50", // Verde
  standby:  "#FFC107", // Ámbar
  rejected: "#F44336", // Rojo
  pending:  "#9E9E9E", // Gris
};

function Donut({
  accepted, standby, rejected, pending, size = 160, stroke = 18,
}: { accepted: number; standby: number; rejected: number; pending: number; size?: number; stroke?: number; }) {
  const total = Math.max(1, accepted + standby + rejected + pending); // Total real de items
  const radius = (size - stroke) / 2;
  const C = 2 * Math.PI * radius;

  const segs = [
    { v: accepted, c: COLORS.accepted, label: 'Aceptadas' },
    { v: standby,  c: COLORS.standby,  label: 'Standby' },
    { v: rejected, c: COLORS.rejected, label: 'Rechazadas'},
    { v: pending,  c: COLORS.pending,  label: 'Pendientes'}, // Pendientes reales (sin decisión)
  ];

  let offset = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle r={radius} cx={size/2} cy={size/2} fill="transparent" stroke="#eee" strokeWidth={stroke} />
        {segs.map((s, i) => {
          if (s.v === 0) return null;
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
              strokeLinecap="butt"
            >
              <title>{`${s.label}: ${s.v} (${(s.v/total*100).toFixed(1)}%)`}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
       <div style={{
         position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
         textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#0d2f5a'
        }}>
         {total} {/* Muestra el total real de registros */}
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
  
  // --- Cálculos Actualizados ---
  const counts = useMemo(() => {
    const rows = result.matches ?? [];
    let acc = 0, rej = 0, stb = 0;
    let pendingAlta = 0, pendingRevisar = 0, pendingSin = 0;

    for (const m of rows) {
      const key = makeMatchKey(m);
      const decision = decisions[key];

      if (decision === "ACCEPTED") {
        acc++;
      } else if (decision === "REJECTED") {
        rej++;
      } else if (decision === "STANDBY") {
        stb++;
        // Contamos Standby como pendientes en la fila superior también
        if (m.TIER === 'ALTA') pendingAlta++;
        else if (m.TIER === 'REVISAR') pendingRevisar++;
        else if (m.TIER === 'SIN') pendingSin++;
      } else {
        // Sin decisión = Pendiente
        if (m.TIER === 'ALTA') pendingAlta++;
        else if (m.TIER === 'REVISAR') pendingRevisar++;
        else if (m.TIER === 'SIN') pendingSin++;
      }
    }
    
    // Pendientes "reales" (sin decisión alguna) para el Donut
    const actualPending = pendingAlta + pendingRevisar + pendingSin - stb; 
    // Pendientes "totales" (sin Aceptar/Rechazar) para la tarjeta superior
    const totalPendingInbox = pendingAlta + pendingRevisar + pendingSin; 
    // Validaciones completadas
    const completed = acc + rej;

    return { 
      acc, rej, stb, 
      pendingAlta, pendingRevisar, pendingSin, 
      actualPending, // Para el Donut
      totalPendingInbox, // Para la tarjeta superior
      completed // Para la tarjeta inferior
    };
  }, [result.matches, decisions]);
  // --- Fin Cálculos ---


  const styles: { [key: string]: React.CSSProperties } = {
    // ... (los estilos definidos en la versión anterior se mantienen: dashboardContainer, sectionTop, sectionBottom, card, cardClickable, etc.)
    dashboardContainer: { fontFamily: "'Lato', sans-serif", marginBottom: '24px' },
    sectionTop: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: '16px', marginBottom: '24px' },
    sectionBottom: { display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: '16px', alignItems: 'stretch' },
    card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)', border: '1px solid #e9eef2', display: 'flex', flexDirection: 'column', gap: '6px' },
    cardClickable: { cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    cardTopLabel: { fontSize: '13px', color: '#5a7184', fontWeight: 400 },
    cardTopValue: { fontSize: '24px', fontWeight: 700, color: '#0d2f5a', lineHeight: 1.2 },
    pill: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, marginTop: 'auto', alignSelf: 'flex-start' },
    chartContainer: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)', border: '1px solid #e9eef2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }, // Añadido position relative
    chartTitle: { fontSize: '14px', fontWeight: 700, color: '#0d2f5a', marginBottom: '12px', textAlign: 'center' as 'center' },
    cardValidation: { padding: '20px', alignItems: 'center', textAlign: 'center' as 'center' },
    cardValidationLabel: { fontSize: '14px', color: '#5a7184', fontWeight: 700, marginBottom: '4px' },
    cardValidationValue: { fontSize: '32px', fontWeight: 700, lineHeight: 1.1, marginBottom: '8px' },
    valueAccepted: { color: COLORS.accepted },
    valueStandby: { color: COLORS.standby },
    valueRejected: { color: COLORS.rejected },
    // Nuevo color para Completadas (usaremos un azul neutro)
    valueCompleted: { color: '#005a9e' }, 
    // Estilo para el botón "Ir a Validación" dentro del chartContainer
    validationButton: {
        width: 'calc(100% - 40px)', // Ancho completo menos padding
        padding: '10px',
        fontSize: '13px',
        fontWeight: 700,
        color: '#ffffff',
        backgroundColor: '#005a9e',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        marginTop: '16px', // Espacio sobre el botón
        boxShadow: '0 4px 10px rgba(0, 90, 158, 0.15)',
    },
  };

  const pillColors = {
    ALTA: { background: "#e8f5e9", color: "#2e7d32" },
    REVISAR: { background: "#fff8e1", color: "#f57f17" },
    SIN: { background: "#ffebee", color: "#c62828" },
  };

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
        {/* --- Sección Superior: Pendientes (Inbox por Tier) --- */}
        <section style={styles.sectionTop}>
          {/* Card: Pendientes Totales (Inbox) */}
          <div style={styles.card}>
            <div style={styles.cardTopLabel}>Pendientes Totales</div>
            <div style={styles.cardTopValue}>{counts.totalPendingInbox}</div>
          </div>

          {/* Card: Pendientes Alta Confianza */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("ALTA")} // Abre wizard filtrado por ALTA (pendientes + standby)
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes de ALTA Confianza"
          >
            <div style={styles.cardTopLabel}>Pendientes Alta</div>
            <div style={styles.cardTopValue}>{counts.pendingAlta}</div>
            <span style={{...styles.pill, ...pillColors.ALTA}}>ALTA</span>
          </div>

          {/* Card: Pendientes Revisar */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("REVISAR")} // Abre wizard filtrado por REVISAR
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes de REVISAR"
          >
            <div style={styles.cardTopLabel}>Pendientes Revisar</div>
            <div style={styles.cardTopValue}>{counts.pendingRevisar}</div>
            <span style={{...styles.pill, ...pillColors.REVISAR}}>REVISAR</span>
          </div>

          {/* Card: Pendientes Sin Coincidencia */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("SIN")} // Abre wizard filtrado por SIN
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes SIN Coincidencia"
          >
            <div style={styles.cardTopLabel}>Pendientes Sin</div>
            <div style={styles.cardTopValue}>{counts.pendingSin}</div>
            <span style={{...styles.pill, ...pillColors.SIN}}>SIN</span>
          </div>
        </section>

        {/* --- Sección Inferior: Gráfico y Estados Finales de Validación --- */}
        <section style={styles.sectionBottom}>
          {/* Gráfico Circular y Botón Validación */}
          <div style={styles.chartContainer}>
             <div style={styles.chartTitle}>Distribución Validación</div>
             <Donut
                accepted={counts.acc}
                standby={counts.stb}
                rejected={counts.rej}
                // Usamos los pendientes REALES (sin decisión) para el gráfico
                pending={counts.actualPending} 
             />
             {/* Botón "Ir a Validación" General */}
             <button
                onClick={() => onOpenValidation?.()} // Llama sin filtro de tier
                style={styles.validationButton}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#004a8d'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
             >
                Ir a Validación ({counts.totalPendingInbox}) {/* Muestra el total pendiente */}
             </button>
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

          {/* Card: Validaciones Completadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Completadas (Aceptadas + Rechazadas)"
             onClick={() => onOpenValidationStatus?.('COMPLETED')} // Nuevo estado posible
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            <div style={styles.cardValidationLabel}>Completadas</div>
            <div style={{...styles.cardValidationValue, ...styles.valueCompleted}}>
                {counts.completed} {/* Suma de acc + rej */}
            </div>
          </div>

        </section>
      </div>
    </>
  );
}
