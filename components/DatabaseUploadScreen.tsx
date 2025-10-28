// En: components/DatabaseUploadScreen.tsx
import React, { useState } from "react";
import type { Project } from "@/types";
import ProjectList from "@/components/ProjectList"; // Importamos el nuevo componente

// Componente para inyectar las fuentes de Google
const GoogleFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');
  `}</style>
);

interface Props {
  projects: Project[];
  onLoadProject: (id: string) => void;
  onRunNewProject: (data: {
    pruebaFile: File;
    minFiles: FileList;
    projectName: string;
    userName: string;
  }) => Promise<void>; // Lo hacemos asíncrono para manejar 'busy'
  onDeleteProject: (id: string) => void; // <-- AÑADIR ESTA LÍNEA
}

export default function DatabaseUploadScreen({
  projects,
  onLoadProject,
  onRunNewProject,
  onDeleteProject, // <-- AÑADIR ESTA LÍNEA
}: Props) {
  const [pruebaFile, setPruebaFile] = useState<File | null>(null);
  const [minFiles, setMinFiles] = useState<FileList | null>(null);
  const [projectName, setProjectName] = useState("");
  const [userName, setUserName] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setError(null);
    if (!pruebaFile || !minFiles || minFiles.length === 0) {
      setError("Por favor, selecciona el fichero PRUEBA y al menos un fichero del Ministerio.");
      return;
    }
    if (!projectName.trim() || !userName.trim()) {
      setError("Por favor, introduce un nombre de proyecto y un nombre de usuario.");
      return;
    }

    try {
      setBusy(true);
      await onRunNewProject({
        pruebaFile,
        minFiles,
        projectName,
        userName,
      });
      // App.tsx se encargará de la navegación.
      // No necesitamos setBusy(false) porque el componente se desmontará.
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error procesando los ficheros. Revisa la consola.");
      setBusy(false); // Solo si hay error nos quedamos aquí
    }
  };

  // Estilos (mantenemos los mismos que tenías)
  const styles: { [key: string]: React.CSSProperties } = {
    card: {
      maxWidth: '700px',
      margin: '40px auto',
      padding: '40px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 47, 94, 0.08)',
      border: '1px solid #e9eef2',
      fontFamily: "'Lato', sans-serif",
    },
    header: {
      textAlign: 'center' as 'center',
      marginBottom: '40px',
    },
    logo: {
      height: '48px',
      width: 'auto',
      marginBottom: '24px',
    },
    title: {
      fontFamily: "'Lora', serif",
      fontSize: '32px',
      fontWeight: 600,
      color: '#0d2f5a',
      margin: '0 0 12px 0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#5a7184',
      lineHeight: 1.6,
    },
    uploadArea: {
      marginBottom: '28px',
    },
    inputGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      marginBottom: '28px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 700,
      color: '#334e68',
      marginBottom: '12px',
    },
    textInput: {
      width: '100%',
      padding: '12px',
      fontSize: '14px',
      fontFamily: "'Lato', sans-serif",
      color: '#334e68',
      border: '1px solid #dde2e7',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      boxSizing: 'border-box' as 'border-box',
    },
    fileInputContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      border: '1px solid #dde2e7',
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      transition: 'border-color 0.2s',
    },
    fileInput: {
      fontFamily: 'inherit',
      fontSize: '14px',
      color: '#5a7184',
    },
    fileName: {
      color: '#005a9e',
      fontWeight: 500,
      fontStyle: 'italic' as 'italic',
      fontSize: '14px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    button: {
      width: '100%',
      padding: '15px',
      fontSize: '16px',
      fontWeight: 700,
      color: '#ffffff',
      backgroundColor: busy ? '#b0c4de' : '#005a9e',
      border: 'none',
      borderRadius: '8px',
      cursor: busy ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s, box-shadow 0.2s',
      marginTop: '16px',
      boxShadow: '0 4px 12px rgba(0, 90, 158, 0.2)',
      fontFamily: "'Lato', sans-serif",
    },
    error: {
      color: '#c62828',
      background: '#ffebee',
      border: '1px solid #ffcdd2',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '14px',
      marginTop: '16px',
      textAlign: 'center' as 'center',
    },
  };

  return (
    <>
      <GoogleFonts />
      {/* 1. Tarjeta de Nuevo Proyecto */}
      <div style={styles.card}>
        <header style={styles.header}>
          <img src="/meisys-logo.webp" alt="Meisys Logo" style={styles.logo} />
          <h1 style={styles.title}>Iniciar Nueva Validación</h1>
          <p style={styles.subtitle}>
            Sube tu fichero <strong>PRUEBA</strong> y los ficheros del <strong>REGCESS</strong> para crear un proyecto.
          </p>
        </header>

        {/* --- NUEVOS CAMPOS --- */}
        <div style={styles.inputGroup}>
          <div>
            <label htmlFor="project-name" style={styles.label}>3. Nombre del Proyecto</label>
            <input
              id="project-name"
              type="text"
              placeholder="Ej: Validación Q4 2025"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={styles.textInput}
            />
          </div>
          <div>
            <label htmlFor="user-name" style={styles.label}>4. Nombre de Usuario</label>
            <input
              id="user-name"
              type="text"
              placeholder="Ej: Juan Pérez"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={styles.textInput}
            />
          </div>
        </div>
        {/* --- FIN NUEVOS CAMPOS --- */}

        <div style={styles.uploadArea}>
          <label htmlFor="prueba-upload" style={styles.label}>1. Fichero de Clientes (PRUEBA)</label>
          <div style={styles.fileInputContainer}>
            <input
              id="prueba-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setPruebaFile(e.target.files?.[0] ?? null)}
              style={styles.fileInput}
            />
            {pruebaFile && <span style={styles.fileName}>{pruebaFile.name}</span>}
          </div>
        </div>

        <div style={styles.uploadArea}>
          <label htmlFor="ministerio-upload" style={styles.label}>2. Ficheros del Ministerio (hasta 4)</label>
          <div style={styles.fileInputContainer}>
            <input
              id="ministerio-upload"
              type="file"
              accept=".xlsx,.xls"
              multiple
              onChange={(e) => setMinFiles(e.target.files)}
              style={styles.fileInput}
            />
            {minFiles && minFiles.length > 0 && <span style={styles.fileName}>{minFiles.length} archivo(s) seleccionado(s)</span>}
          </div>
        </div>
        
        {error && <div style={styles.error}>{error}</div>}

        <button onClick={handleRun} disabled={busy} style={styles.button}>
          {busy ? "Procesando, por favor espera..." : "Iniciar Validación"}
        </button>
      </div>
      
      {/* 2. Lista de Proyectos Existentes */}
      <ProjectList
        projects={projects}
        onLoadProject={onLoadProject}
        onDeleteProject={onDeleteProject} // <-- Pasar la nueva prop
      />
    </>
  );
}
