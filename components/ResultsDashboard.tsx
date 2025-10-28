// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput, MatchRecord } from "@/types";
import type { DecisionMap, Decision } from "@/components/ValidationWizard"; // Añadir Decision
import { makeMatchKey } from "@/components/ValidationWizard";

// Añadimos el tipo aquí también para claridad
type ValidationStatusFilter = Decision | 'COMPLETED' | 'PENDING_ALL' | 'ALL';

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
  onOpenValidationStatus?: (status: ValidationStatusFilter) => void; // Tipo actualizado
}

// --- Componente Donut (sin cambios) ---
const COLORS = { /* ... */ accepted: "#4CAF50", standby:  "#FFC107", rejected: "#F44336", pending:  "#9E9E9E" };
function Donut({ /* ... */ }) { /* ... Código del Donut sin cambios ... */
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
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle r={radius} cx={size/2} cy={size/2} fill="transparent" stroke="#eee" strokeWidth={stroke} />
          {segs.map((s, i) => {
            if (s.v === 0) return null;
            const len = C * (s.v / total);
            const dash = `${len} ${C - len}`;
            const el = ( <circle key={i} r={radius} cx={size/2} cy={size/2} fill="transparent" stroke={s.c} strokeWidth={stroke} strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="butt"> <title>{`${s.label}: ${s.v} (${(s.v/total*100).toFixed(1)}%)`}</title> </circle> );
            offset += len;
            return el;
          })}
        </svg>
         <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: '20px', fontWeight: 700, color: '#0d2f5a' }}> {total} <div style={{fontSize: '12px', color: '#5a7184', fontWeight: 400}}>Total</div> </div>
      </div>
    );
 }

// --- Componente GoogleFonts (sin cambios) ---
const GoogleFonts = () => ( <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');`}</style> );

export default function ResultsDashboard({ result, decisions = {}, onOpenValidation, onOpenValidationStatus }: Props) {
  
  // --- Cálculos (sin cambios) ---
  const counts = useMemo(() => { /* ... */
      const rows = result.matches ?? [];
      let acc = 0, rej = 0, stb = 0;
      let pendingAlta = 0, pendingRevisar = 0, pendingSin = 0;
      for (const m of rows) {
        const key = makeMatchKey(m);
        const decision = decisions[key];
        if (decision === "ACCEPTED") { acc++; }
        else if (decision === "REJECTED") { rej++; }
        else if (decision === "STANDBY") {
          stb++;
          if (m.TIER === 'ALTA') pendingAlta++; else if (m.TIER === 'REVISAR') pendingRevisar++; else if (m.TIER === 'SIN') pendingSin++;
        } else {
          if (m.TIER === 'ALTA') pendingAlta++; else if (m.TIER === 'REVISAR') pendingRevisar++; else if (m.TIER === 'SIN') pendingSin++;
        }
      }
      const actualPending = pendingAlta + pendingRevisar + pendingSin - stb;
      const totalPendingInbox = pendingAlta + pendingRevisar + pendingSin;
      const completed = acc + rej;
      return { acc, rej, stb, pendingAlta, pendingRevisar, pendingSin, actualPending, totalPendingInbox, completed };
   }, [result.matches, decisions]);

  // --- Estilos (sin cambios) ---
  const styles: { [key: string]: React.CSSProperties } = { /* ... */
    dashboardContainer: { fontFamily: "'Lato', sans-serif", marginBottom: '24px' },
    sectionTop: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: '16px', marginBottom: '24px' },
    sectionBottom: { display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: '16px', alignItems: 'stretch' },
    card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)', border: '1px solid #e9eef2', display: 'flex', flexDirection: 'column', gap: '6px' },
    cardClickable: { cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    cardTopLabel: { fontSize: '13px', color: '#5a7184', fontWeight: 400 },
    cardTopValue: { fontSize: '24px', fontWeight: 700, color: '#0d2f5a', lineHeight: 1.2 },
    pill: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, marginTop: 'auto', alignSelf: 'flex-start' },
    chartContainer: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)', border: '1px solid #e9eef2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    chartTitle: { fontSize: '14px', fontWeight: 700, color: '#0d2f5a', marginBottom: '12px', textAlign: 'center' as 'center' },
    cardValidation: { padding: '20px', alignItems: 'center', textAlign: 'center' as 'center' },
    cardValidationLabel: { fontSize: '14px', color: '#5a7184', fontWeight: 700, marginBottom: '4px' },
    cardValidationValue: { fontSize: '32px', fontWeight: 700, lineHeight: 1.1, marginBottom: '8px' },
    valueAccepted: { color: COLORS.accepted },
    valueStandby: { color: COLORS.standby },
    valueRejected: { color: COLORS.rejected },
    valueCompleted: { color: '#005a9e' },
    validationButton: { width: 'calc(100% - 40px)', padding: '10px', fontSize: '13px', fontWeight: 700, color: '#ffffff', backgroundColor: '#005a9e', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.2s, box-shadow 0.2s', marginTop: '16px', boxShadow: '0 4px 10px rgba(0, 90, 158, 0.15)', },
   };
  const pillColors = { /* ... */ ALTA: { background: "#e8f5e9", color: "#2e7d32" }, REVISAR: { background: "#fff8e1", color: "#f57f17" }, SIN: { background: "#ffebee", color: "#c62828" }, };
  const addHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => { /* ... */ e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)"; };
  const removeHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => { /* ... */ e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)"; };

  return (
    <>
      <GoogleFonts />
      <div style={styles.dashboardContainer}>
        {/* --- Sección Superior: Pendientes (Inbox por Tier) --- */}
        <section style={styles.sectionTop}>
          {/* Card: Pendientes Totales (Inbox) - AHORA CLICABLE */}
          <div
             style={{ ...styles.card, ...styles.cardClickable }}
             onClick={() => onOpenValidationStatus?.('PENDING_ALL')} // <-- Filtra por todos los pendientes
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
             title="Ver todos los Pendientes (incluye Standby)"
          >
            <div style={styles.cardTopLabel}>Pendientes Totales</div>
            <div style={styles.cardTopValue}>{counts.totalPendingInbox}</div>
          </div>

          {/* Card: Pendientes Alta Confianza */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("ALTA")} // Mantenemos abrir Wizard
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes de ALTA Confianza"
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardTopLabel}>Pendientes Alta</div> <div style={styles.cardTopValue}>{counts.pendingAlta}</div> <span style={{...styles.pill, ...pillColors.ALTA}}>ALTA</span>
          </div>

          {/* Card: Pendientes Revisar */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("REVISAR")} // Mantenemos abrir Wizard
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes de REVISAR"
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardTopLabel}>Pendientes Revisar</div> <div style={styles.cardTopValue}>{counts.pendingRevisar}</div> <span style={{...styles.pill, ...pillColors.REVISAR}}>REVISAR</span>
          </div>

          {/* Card: Pendientes Sin Coincidencia */}
          <div
            style={{ ...styles.card, ...styles.cardClickable }}
            onClick={() => onOpenValidation?.("SIN")} // Mantenemos abrir Wizard
            onMouseOver={addHoverEffect}
            onMouseOut={removeHoverEffect}
            title="Validar Pendientes SIN Coincidencia"
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardTopLabel}>Pendientes Sin</div> <div style={styles.cardTopValue}>{counts.pendingSin}</div> <span style={{...styles.pill, ...pillColors.SIN}}>SIN</span>
          </div>
        </section>

        {/* --- Sección Inferior: Gráfico y Estados Finales de Validación --- */}
        <section style={styles.sectionBottom}>
          {/* Gráfico Circular y Botón Validación */}
          <div style={styles.chartContainer}>
             {/* ... Gráfico Donut sin cambios ... */}
              <div style={styles.chartTitle}>Distribución Validación</div> <Donut accepted={counts.acc} standby={counts.stb} rejected={counts.rej} pending={counts.actualPending} />
             {/* Botón "Ir a Validación" General */}
             <button
                onClick={() => onOpenValidation?.()}
                style={styles.validationButton}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#004a8d'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
             >
                Ir a Validación ({counts.totalPendingInbox})
             </button>
          </div>

          {/* Card: Aceptadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Aceptadas"
             onClick={() => onOpenValidationStatus?.('ACCEPTED')} // <-- Llama con 'ACCEPTED'
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardValidationLabel}>Aceptadas</div> <div style={{...styles.cardValidationValue, ...styles.valueAccepted}}> {counts.acc} </div>
          </div>

          {/* Card: Standby */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Standby"
             onClick={() => onOpenValidationStatus?.('STANDBY')} // <-- Llama con 'STANDBY'
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardValidationLabel}>Standby</div> <div style={{...styles.cardValidationValue, ...styles.valueStandby}}> {counts.stb} </div>
          </div>

          {/* Card: Rechazadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Rechazadas"
             onClick={() => onOpenValidationStatus?.('REJECTED')} // <-- Llama con 'REJECTED'
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardValidationLabel}>Rechazadas</div> <div style={{...styles.cardValidationValue, ...styles.valueRejected}}> {counts.rej} </div>
          </div>

          {/* Card: Validaciones Completadas */}
          <div
            style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }}
            title="Ver Completadas (Aceptadas + Rechazadas)"
             onClick={() => onOpenValidationStatus?.('COMPLETED')} // <-- Llama con 'COMPLETED'
             onMouseOver={addHoverEffect}
             onMouseOut={removeHoverEffect}
          >
            {/* ... Contenido sin cambios ... */}
             <div style={styles.cardValidationLabel}>Completadas</div> <div style={{...styles.cardValidationValue, ...styles.valueCompleted}}> {counts.completed} </div>
          </div>

        </section>
      </div>
    </>
  );
}
