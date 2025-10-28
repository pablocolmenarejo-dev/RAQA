// En: components/ProjectList.tsx
import React from "react";
import type { Project } from "@/types";

interface Props {
  projects: Project[];
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void; // <-- AÑADIR PROP
}

export default function ProjectList({ projects, onLoadProject, onDeleteProject }: Props) {
  
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
      position: 'relative', // <-- AÑADIR ESTO
    },
    // --- AÑADIR NUEVO ESTILO PARA EL BOTÓN ---
    deleteButton: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      background: '#ffebee', // Rojo pálido (color de TIER SIN)
      color: '#c62828',    // Rojo (color de TIER SIN)
      border: '1px solid #ffcdd2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: 700,
      lineHeight: '1',
      cursor: 'pointer',
      zIndex: 2, // Para que esté sobre el contenido
      transition: 'background-color 0.2s ease',
    },
    // --- FIN NUEVO ESTILO ---
    cardProjectName: {
      fontSize: '16px',
      fontWeight: 700,
      color: '#005a9e', // Azul corporativo
      marginBottom: '8px',
      // Para truncar texto largo
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      paddingRight: '20px', // Dejar espacio para el botón 'x'
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

  // --- AÑADIR NUEVO HANDLER ---
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // MUY IMPORTANTE: Evita que se dispare el onLoadProject de la tarjeta
    onDeleteProject(id); // Llama a la función de App.tsx (que mostrará la confirmación)
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
              onClick={() => onLoadProject(p.id)} // Click en la tarjeta carga el proyecto
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 12px 25px rgba(0, 47, 94, 0.1)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 47, 94, 0.07)";
              }}
            >
              
              {/* --- AÑADIR BOTÓN DE ELIMINAR --- */}
              <div
                style={styles.deleteButton}
                title="Eliminar proyecto"
                onClick={(e) => handleDeleteClick(e, p.id)} // Click en el botón elimina
                onMouseOver={(e) => { e.currentTarget.style.background = '#ffcdd2'; }} // Efecto hover
                onMouseOut={(e) => { e.currentTarget.style.background = '#ffebee'; }}
              >
                &times; {/* Este es el símbolo "X" */}
              </div>
              {/* --- FIN BOTÓN --- */}

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
