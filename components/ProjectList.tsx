import React from "react";
import type { Project } from "@/types";

interface Props {
  projects: Project[];
  onLoadProject: (id: string) => void;
}

export default function ProjectList({ projects, onLoadProject }: Props) {
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      maxWidth: '700px',
      margin: '40px auto',
      fontFamily: "'Lato', sans-serif",
    },
    title: {
      fontFamily: "'Lora', serif",
      fontSize: '24px',
      fontWeight: 600,
      color: '#0d2f5a',
      marginBottom: '20px',
      borderBottom: '1px solid #e9eef2',
      paddingBottom: '12px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '20px',
    },
    card: {
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e9eef2',
      boxShadow: '0 8px 25px rgba(0, 47, 94, 0.07)',
      padding: '16px',
      cursor: 'pointer',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    },
    cardProjectName: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#005a9e', // Azul corporativo
      marginBottom: '8px',
      // Para truncar texto largo
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    cardUser: {
      fontSize: '13px',
      color: '#5a7184',
      marginBottom: '12px',
      fontStyle: 'italic' as 'italic',
    },
    cardDate: {
      fontSize: '12px',
      color: '#5a7184',
    },
    summary: {
      marginTop: '12px',
      paddingTop: '12px',
      borderTop: '1px solid #f0f4f8',
      display: 'flex',
      justifyContent: 'space-around',
      fontSize: '12px',
      fontWeight: 700,
      textAlign: 'center' as 'center',
    },
    summaryItem: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '2px',
      alignItems: 'center',
    },
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Proyectos Guardados</h2>
      {projects.length === 0 ? (
        <p style={{ color: '#5a7184' }}>
          No hay proyectos guardados. Crea uno nuevo para empezar.
        </p>
      ) : (
        <div style={styles.grid}>
          {projects.slice().reverse().map((p) => ( // .reverse() para mostrar el más nuevo primero
            <div
              key={p.id}
              style={styles.card}
              onClick={() => onLoadProject(p.id)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
              }}
            >
              <div style={styles.cardProjectName} title={p.projectName}>{p.projectName}</div>
              <div style={styles.cardUser}>Por: {p.userName}</div>
              <div style={styles.cardDate}>{formatDate(p.savedAt)}</div>

              {/* Resumen de Tiers */}
              <div style={styles.summary}>
                <div style={{ ...styles.summaryItem, color: '#2e7d32' }}>
                  <span>{p.summary.alta}</span>
                  <span>ALTA</span>
                </div>
                <div style={{ ...styles.summaryItem, color: '#f57f17' }}>
                  <span>{p.summary.revisar}</span>
                  <span>REVISAR</span>
                </div>
                <div style={{ ...styles.summaryItem, color: '#c62828' }}>
                  <span>{p.summary.sin}</span>
                  <span>SIN</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
