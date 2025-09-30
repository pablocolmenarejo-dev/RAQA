// src/components/DatabaseUploadScreen.tsx
import React, { useState } from "react";
import { parsePrueba, parseMultipleMinisteriosAoA } from "@/services/fileParserService";
import { matchClientsAgainstMinisterios } from "@/services/matchingService";
import type { MatchOutput } from "@/types";

interface Props { onResult: (r: MatchOutput) => void; }

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
    card: {
      maxWidth: '700px',
      margin: '40px auto',
      padding: '32px 40px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08)',
      border: '1px solid #e6e9ec',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
      fontSize: '28px',
      fontWeight: 600,
      color: '#0d2f5a',
      margin: 0,
    },
    subtitle: {
      marginTop: '8px',
      fontSize: '16px',
      color: '#5a7184',
      lineHeight: 1.5,
    },
    uploadArea: {
      marginBottom: '28px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: 600,
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
    },
    button: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      fontWeight: 600,
      color: '#ffffff',
      backgroundColor: busy ? '#b0c4de' : '#005a9e',
      border: 'none',
      borderRadius: '8px',
      cursor: busy ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s, box-shadow 0.2s',
      marginTop: '16px',
      boxShadow: '0 4px 12px rgba(0, 90, 158, 0.2)',
    },
  };

  return (
    <div style={styles.card}>
      <header style={styles.header}>
        <img src="/meisys-logo.webp" alt="Meisys Logo" style={styles.logo} />
        <h1 style={styles.title}>RAQA – Buscador de coincidencias</h1>
        <p style={styles.subtitle}>
          Sube tu fichero <strong>PRUEBA.xlsx</strong> y hasta <strong>4 Excel</strong> del Ministerio.
          Calcularemos coincidencias con la metodología determinista (sin IA).
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
        {busy ? "Procesando, por favor espera..." : "Calcular coincidencias"}
      </button>
    </div>
  );
}
