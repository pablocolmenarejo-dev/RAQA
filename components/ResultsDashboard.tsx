import React from "react";

type ValidationKind = "ALTA" | "REVISAR" | "SIN";
type ValidationStatus = "PENDING_ALL" | "PENDING_TOTAL" | "PENDING_ALTA" | "PENDING_SIN";

export interface ResultsDashboardProps {
  // Contadores principales que muestras en las tarjetas
  pendientesAltaCount?: number;
  pendientesTotalesCount?: number;
  pendientesSinDatosCount?: number;
  pendientesRevisarCount?: number;

  // Navegación: abrir wizard por tipo de validación
  onOpenValidation?: (kind: ValidationKind) => void;

  // Navegación: abrir wizard por estado (agrega si lo usas)
  onOpenValidationStatus?: (status: ValidationStatus) => void;

  // Título/encabezado opcional
  title?: string;
}

const styles = {
  wrap: {
    display: "grid",
    gridTemplateColumns: "repeat(12, 1fr)",
    gap: "16px",
    width: "100%",
  } as React.CSSProperties,
  header: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  } as React.CSSProperties,
  h1: { margin: 0, fontSize: 20, fontWeight: 600 } as React.CSSProperties,
  grid: {
    gridColumn: "1 / -1",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
    gap: 16,
  } as React.CSSProperties,
  card: {
    borderRadius: 12,
    border: "1px solid #e6e6e6",
    padding: 16,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
    cursor: "pointer",
    userSelect: "none",
    transition: "transform .06s ease, box-shadow .12s ease, border-color .12s ease",
  } as React.CSSProperties,
  cardHover: {
    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
    borderColor: "#d4d4d4",
    transform: "translateY(-1px)",
  } as React.CSSProperties,
  cardTitle: { fontSize: 14, color: "#4b5563", margin: 0 } as React.CSSProperties,
  cardValue: { fontSize: 28, fontWeight: 700, marginTop: 6 } as React.CSSProperties,
  badge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
    background: "#f3f4f6",
    color: "#111827",
    marginTop: 8,
  } as React.CSSProperties,
};

function useHoverStyles() {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const add = (i: number) => () => setHovered(i);
  const remove = () => setHovered(null);
  const styleFor = (i: number) => (hovered === i ? { ...styles.card, ...styles.cardHover } : styles.card);
  return { add, remove, styleFor };
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  pendientesAltaCount = 0,
  pendientesTotalesCount = 0,
  pendientesSinDatosCount = 0,
  pendientesRevisarCount = 0,
  onOpenValidation,
  onOpenValidationStatus,
  title = "Resultados",
}) => {
  const { add, remove, styleFor } = useHoverStyles();

  return (
    <section style={styles.wrap}>
      <div style={styles.header}>
        <h1 style={styles.h1}>{title}</h1>
      </div>

      <div style={styles.grid}>
        {/* Pendientes ALTA */}
        <div
          style={styleFor(0)}
          onMouseEnter={add(0)}
          onMouseLeave={remove}
          onClick={() => onOpenValidation?.("ALTA")}
          title="Ver pendientes de Alta"
          role="button"
          aria-label="Pendientes alta"
        >
          <p style={styles.cardTitle}>Pendientes alta</p>
          <div style={styles.cardValue}>{pendientesAltaCount}</div>
          <span style={styles.badge}>Validación</span>
        </div>

        {/* Pendientes TOTALES */}
        <div
          style={styleFor(1)}
          onMouseEnter={add(1)}
          onMouseLeave={remove}
          onClick={() => onOpenValidationStatus?.("PENDING_TOTAL")}
          title="Ver pendientes totales"
          role="button"
          aria-label="Pendientes totales"
        >
          <p style={styles.cardTitle}>Pendientes totales</p>
          <div style={styles.cardValue}>{pendientesTotalesCount}</div>
          <span style={styles.badge}>Estado</span>
        </div>

        {/* Pendientes SIN DATOS */}
        <div
          style={styleFor(2)}
          onMouseEnter={add(2)}
          onMouseLeave={remove}
          onClick={() => onOpenValidation?.("SIN")}
          title="Ver pendientes sin datos"
          role="button"
          aria-label="Pendientes sin datos"
        >
          <p style={styles.cardTitle}>Pendientes sin datos</p>
          <div style={styles.cardValue}>{pendientesSinDatosCount}</div>
          <span style={styles.badge}>Datos</span>
        </div>

        {/* Pendientes REVISAR */}
        <div
          style={styleFor(3)}
          onMouseEnter={add(3)}
          onMouseLeave={remove}
          onClick={() => onOpenValidation?.("REVISAR")}
          title="Ver pendientes de revisión"
          role="button"
          aria-label="Pendientes revisar"
        >
          <p style={styles.cardTitle}>Pendientes revisar</p>
          <div style={styles.cardValue}>{pendientesRevisarCount}</div>
          <span style={styles.badge}>Revisión</span>
        </div>
      </div>
    </section>
  );
};

export default ResultsDashboard;
