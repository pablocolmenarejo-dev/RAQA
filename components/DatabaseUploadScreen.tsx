// src/components/DatabaseUploadScreen.tsx
import React, { useState } from "react";
import { parsePrueba, parseMultipleMinisteriosAoA } from "@/services/fileParserService";
import { matchClientsAgainstMinisterios } from "@/services/matchingService";
import type { MatchOutput } from "@/types";

interface Props { onResult: (r: MatchOutput) => void; }

// Componente para inyectar las fuentes de Google en el head del documento
const GoogleFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Lato:wght@400;700&display=swap');
  `}</style>
);

export default function DatabaseUploadScreen({ onResult }: Props) {
  const [pruebaFile, setPruebaFile] = useState<File | null>(null);
  const [minFiles, setMinFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const handleRun = async () => {
    if (!pruebaFile || !minFiles || minFiles.length === 0) {
      alert("Por favor, selecciona el fichero PRUEBA y al menos un fichero del Ministerio.");
      return;
    }
    try {
      setBusy(true);
      const prueba = await parsePrueba(pruebaFile);
      const ministeriosAoA = await parseMultipleMinisteriosAoA(Array.from(minFiles));
      const out = matchClientsAgainstMinisterios(prueba, ministeriosAoA);
      onResult(out);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Error procesando los ficheros. Revisa la consola para más detalles.");
    } finally {
      setBusy(false);
    }
  };

  // Estilos en línea para reflejar la identidad de Meisys
  const styles: { [key: string]: React.CSSProperties } = {
    // Se asume un fondo claro en el body global, aquí definimos la tarjeta principal
    card: {
      maxWidth: '700px',
      margin: '40px auto',
      padding: '40px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 47, 94, 0.08)',
      border: '1px solid #e9eef2',
      fontFamily: "'Lato', sans-serif", // Fuente Sans-serif para el cuerpo
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
      fontFamily: "'Lora', serif", // Fuente Serif para el titular principal
      fontSize: '32px',
      fontWeight: 600,
      color: '#0d2f5a', // Azul oscuro corporativo
      margin: '0 0 12px 0',
    },
    subtitle: {
      fontSize: '16px',
      color: '#5a7184', // Gris azulado para texto secundario
      lineHeight: 1.6,
    },
    uploadArea: {
      marginBottom: '28px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 700, // Bold para más claridad
      color: '#334e68',
      marginBottom: '12px',
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
      fontWeight: 700, // Botón más prominente
      color: '#ffffff',
      backgroundColor: busy ? '#b0c4de' : '#005a9e', // Azul corporativo de Meisys
      border: 'none',
      borderRadius: '8px',
      cursor: busy ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s, box-shadow 0.2s',
      marginTop: '16px',
      boxShadow: '0 4px 12px rgba(0, 90, 158, 0.2)',
      fontFamily: "'Lato', sans-serif",
    },
  };

  return (
    <>
      <GoogleFonts />
      <div style={styles.card}>
        <header style={styles.header}>
          <img src="/meisys-logo.webp" alt="Meisys Logo" style={styles.logo} />
          <h1 style={styles.title}>Más allá de la consultoría científica</h1>
          <p style={styles.subtitle}>
            Sube tu fichero <strong>PRUEBA</strong> y los ficheros del <strong>Ministerio</strong> para iniciar la validación de datos.
          </p>
        </header>

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

        <button onClick={handleRun} disabled={busy} style={styles.button}>
          {busy ? "Procesando, por favor espera..." : "CONÓCENOS"}
        </button>
      </div>
    </>
  );
}
