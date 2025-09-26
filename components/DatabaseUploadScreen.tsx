// components/DatabaseUploadScreen.tsx
import React, { useState } from "react";
import { parsePrueba, parseMultipleMinisterios } from "@/services/fileParserService";
import { matchClientsAgainstMinisterios } from "@/services/matchingService";
import type { MatchOutput } from "@/types";

type Props = {
  /** Recibe el resultado completo del matching (matches/top3/summary) */
  onResult: (result: MatchOutput) => void;
};

export default function DatabaseUploadScreen({ onResult }: Props) {
  const [pruebaFile, setPruebaFile] = useState<File | null>(null);
  const [minFiles, setMinFiles] = useState<(File | null)[]>([null, null, null, null]);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  const handleMinFileChange = (idx: number, file: File | null) => {
    setMinFiles((prev) => {
      const next = [...prev];
      next[idx] = file;
      return next;
    });
  };

  async function handleRun() {
    try {
      if (!pruebaFile) {
        alert("Sube el fichero PRUEBA.xlsx");
        return;
      }
      setLoading(true);
      setStatus("Leyendo PRUEBA.xlsx…");

      // 1) Parse PRUEBA
      const pruebaRows = await parsePrueba(pruebaFile);

      // 2) Parse Ministerios (1..4)
      const selectedMinFiles = minFiles.filter(Boolean) as File[];
      if (selectedMinFiles.length === 0) {
        const sure = confirm("No has subido Excels del Ministerio. ¿Quieres continuar solo con PRUEBA?");
        if (!sure) {
          setLoading(false);
          return;
        }
      }
      setStatus(`Leyendo ${selectedMinFiles.length} Excel(es) del Ministerio…`);
      const ministeriosMap = await parseMultipleMinisterios(selectedMinFiles);

      // 3) Matching (metodología determinista)
      setStatus("Calculando coincidencias…");
      const result = matchClientsAgainstMinisterios(pruebaRows, ministeriosMap);

      // 4) Devolver resultado a la app
      onResult(result);

      // 5) UI
      const { alta, revisar, sin } = result.summary;
      setStatus(`Listo. Alta: ${alta}, Revisar: ${revisar}, Sin: ${sin}`);
    } catch (err: any) {
      console.error(err);
      alert(`Error procesando ficheros: ${err?.message || String(err)}`);
      setStatus("Ha ocurrido un error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 12 }}>Cargar bases de datos</h2>

      <section style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>PRUEBA.xlsx</h3>
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setPruebaFile(e.target.files?.[0] ?? null)}
        />
        {pruebaFile && <p style={{ marginTop: 8 }}>Seleccionado: <strong>{pruebaFile.name}</strong></p>}
      </section>

      <section style={{ marginBottom: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Excels del Ministerio (hasta 4)</h3>

        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <label style={{ display: "block", marginBottom: 4 }}>Fichero {i + 1}</label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => handleMinFileChange(i, e.target.files?.[0] ?? null)}
            />
            {minFiles[i] && <small>Seleccionado: <strong>{minFiles[i]?.name}</strong></small>}
          </div>
        ))}
      </section>

      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #0c6",
          background: loading ? "#e5e5e5" : "#0f9d58",
          color: "#fff",
          cursor: loading ? "not-allowed" : "pointer",
          fontWeight: 600
        }}
      >
        {loading ? "Procesando…" : "Calcular coincidencias"}
      </button>

      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}

