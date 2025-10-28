// src/components/ResultsDashboard.tsx
import React, { useMemo } from "react";
import type { MatchOutput, MatchRecord } from "@/types";
import type { DecisionMap, Decision } from "@/components/ValidationWizard";
import { makeMatchKey } from "@/components/ValidationWizard";

// Define the filter type locally or import if defined centrally
type ValidationStatusFilter = Decision | 'COMPLETED' | 'PENDING_ALL' | 'ALL';

interface Props {
  result: MatchOutput;
  decisions?: DecisionMap;
  onOpenValidation?: (tier?: "ALTA" | "REVISAR" | "SIN") => void;
  onOpenValidationStatus?: (status: ValidationStatusFilter) => void;
}

// --- Componente Donut (Definición Completa) ---
const COLORS = {
  accepted: "#4CAF50", // Verde
  standby:  "#FFC107", // Ámbar
  rejected: "#F44336", // Rojo
  pending:  "#9E9E9E", // Gris
};

function Donut({
  accepted, standby, rejected, pending, size = 160, stroke = 18,
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
         {total}
         <div style={{fontSize: '12px', color: '#5a7184', fontWeight: 400}}>Total</div>
       </div>
    </div>
  );
}
// --- Fin Componente Donut ---

// --- ✅ ELIMINADO ---
// const GoogleFonts = () => ( <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');`}</style> );
// --- FIN ELIMINADO ---

export default function ResultsDashboard({ result, decisions = {}, onOpenValidation, onOpenValidationStatus }: Props) {

  const counts = useMemo(() => {
    // ... (lógica de 'counts' sin cambios) ...
    const rows = result?.matches ?? [];
    let acc = 0, rej = 0, stb = 0;
    let pendingAlta = 0, pendingRevisar = 0, pendingSin = 0;
    for (const m of rows) {
        if (typeof m !== 'object' || m === null || typeof m.TIER === 'undefined') {
          console.warn("Skipping invalid item in result.matches:", m);
          continue; 
        }
      const key = makeMatchKey(m);
      const decision = decisions[key];
      if (decision === "ACCEPTED") { acc++; }
      else if (decision === "REJECTED") { rej++; }
      else if (decision === "STANDBY") {
        stb++;
        if (m.TIER === 'ALTA') pendingAlta++;
        else if (m.TIER === 'REVISAR') pendingRevisar++;
        else if (m.TIER === 'SIN') pendingSin++;
      } else { 
        if (m.TIER === 'ALTA') pendingAlta++;
        else if (m.TIER === 'REVISAR') pendingRevisar++;
        else if (m.TIER === 'SIN') pendingSin++;
      }
    }
    const totalPendingInbox = pendingAlta + pendingRevisar + pendingSin;
    const actualPending = Math.max(0, totalPendingInbox - stb);
    const completed = acc + rej;
    return { acc, rej, stb, pendingAlta, pendingRevisar, pendingSin, actualPending, totalPendingInbox, completed };
  }, [result, decisions]);

  // --- Objeto de Estilos Completo (sin cambios) ---
  const styles: { [key: string]: React.CSSProperties } = {
    // Usamos las variables CSS de index.css
    dashboardContainer: { fontFamily: "var(--font-sans)", marginBottom: '24px' },
    sectionTop: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: '20px', marginBottom: '20px' },
    sectionBottom: { display: "grid", gridTemplateColumns: "1.5fr repeat(4, 1fr)", gap: '20px', alignItems: 'stretch', },
    card: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: 'var(--meisys-card-shadow)', border: '1px solid var(--meisys-border)', display: 'flex', flexDirection: 'column', gap: '6px' },
    cardClickable: { cursor: 'pointer', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    cardTopLabel: { fontSize: '13px', color: 'var(--meisys-text-secondary)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardTopValue: { fontSize: '28px', fontWeight: 700, color: 'var(--meisys-title)', lineHeight: 1.2 },
    pill: { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, marginTop: 'auto', alignSelf: 'flex-start' },
    chartContainer: { backgroundColor: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: 'var(--meisys-card-shadow)', border: '1px solid var(--meisys-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    chartTitle: { fontSize: '14px', fontWeight: 700, color: 'var(--meisys-title)', marginBottom: '12px', textAlign: 'center' as 'center', textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardValidation: { padding: '20px', alignItems: 'center', textAlign: 'center' as 'center' },
    cardValidationLabel: { fontSize: '14px', color: 'var(--meisys-text-secondary)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardValidationValue: { fontSize: '32px', fontWeight: 700, lineHeight: 1.1, marginBottom: '8px', fontFamily: 'var(--font-serif)' },
    valueAccepted: { color: COLORS.accepted },
    valueStandby: { color: COLORS.standby },
    valueRejected: { color: COLORS.rejected },
    valueCompleted: { color: 'var(--meisys-blue)' },
    // Aplicamos la clase de botón
    validationButton: { ...styles.validationButton, width: 'calc(100% - 40px)', marginTop: '16px', },
   };
  // --- Fin Objeto de Estilos ---

  const pillColors = { ALTA: { background: "#e8f5e9", color: "#2e7d32" }, REVISAR: { background: "#fff8e1", color: "#f57f17" }, SIN: { background: "#ffebee", color: "#c62828" }, };
  const addHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)"; };
  const removeHoverEffect = (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "var(--meisys-card-shadow)"; };

  if (!result) {
     return <div style={{padding: '20px', textAlign: 'center', color: 'var(--meisys-text-secondary)'}}>Cargando datos del dashboard...</div>;
  }

  return (
    <>
      {/* --- ✅ ELIMINADO GoogleFonts --- */}
      <div style={styles.dashboardContainer}>
        {/* Sección Superior: Pendientes */}
        <section style={styles.sectionTop}>
            <div style={{ ...styles.card, ...styles.cardClickable }} onClick={() => onOpenValidationStatus?.('PENDING_ALL')} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect} title="Ver todos los Pendientes (incluye Standby)">
                <div style={styles.cardTopLabel}>Pendientes Totales</div><div style={styles.cardTopValue}>{counts.totalPendingInbox}</div>
            </div>
            <div style={{ ...styles.card, ...styles.cardClickable }} onClick={() => onOpenValidation?.("ALTA")} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect} title="Validar Pendientes de ALTA Confianza">
                <div style={styles.cardTopLabel}>Pendientes Alta</div> <div style={styles.cardTopValue}>{counts.pendingAlta}</div> <span style={{...styles.pill, ...pillColors.ALTA}}>ALTA</span>
            </div>
             <div style={{ ...styles.card, ...styles.cardClickable }} onClick={() => onOpenValidation?.("REVISAR")} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect} title="Validar Pendientes de REVISAR">
                <div style={styles.cardTopLabel}>Pendientes Revisar</div> <div style={styles.cardTopValue}>{counts.pendingRevisar}</div> <span style={{...styles.pill, ...pillColors.REVISAR}}>REVISAR</span>
            </div>
            <div style={{ ...styles.card, ...styles.cardClickable }} onClick={() => onOpenValidation?.("SIN")} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect} title="Validar Pendientes SIN Coincidencia">
                <div style={styles.cardTopLabel}>Pendientes Sin</div> <div style={styles.cardTopValue}>{counts.pendingSin}</div> <span style={{...styles.pill, ...pillColors.SIN}}>SIN</span>
            </div>
        </section>

        {/* Sección Inferior: Gráfico y Estados Finales */}
        <section style={styles.sectionBottom}>
            <div style={styles.chartContainer}>
                 <div style={styles.chartTitle}>Distribución Validación</div>
                 <Donut accepted={counts.acc} standby={counts.stb} rejected={counts.rej} pending={counts.actualPending} />
                 <button onClick={() => onOpenValidation?.()} className="btn btn-primary" style={styles.validationButton}> 
                   Ir a Validación ({counts.totalPendingInbox}) 
                 </button>
            </div>
            <div style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }} title="Ver Aceptadas" onClick={() => onOpenValidationStatus?.('ACCEPTED')} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect}>
                <div style={styles.cardValidationLabel}>Aceptadas</div> <div style={{...styles.cardValidationValue, ...styles.valueAccepted}}> {counts.acc} </div>
            </div>
            <div style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }} title="Ver Standby" onClick={() => onOpenValidationStatus?.('STANDBY')} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect}>
                 <div style={styles.cardValidationLabel}>Standby</div> <div style={{...styles.cardValidationValue, ...styles.valueStandby}}> {counts.stb} </div>
            </div>
            <div style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }} title="Ver Rechazadas" onClick={() => onOpenValidationStatus?.('REJECTED')} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect}>
                <div style={styles.cardValidationLabel}>Rechazadas</div> <div style={{...styles.cardValidationValue, ...styles.valueRejected}}> {counts.rej} </div>
            </div>
            <div style={{ ...styles.card, ...styles.cardValidation, ...styles.cardClickable }} title="Ver Completadas (Aceptadas + Rechazadas)" onClick={() => onOpenValidationStatus?.('COMPLETED')} onMouseOver={addHoverEffect} onMouseOut={removeHoverEffect}>
                <div style={styles.cardValidationLabel}>Completadas</div> <div style={{...styles.cardValidationValue, ...styles.valueCompleted}}> {counts.completed} </div>
            </div>
        </section>
      </div>
    </>
  );
}
