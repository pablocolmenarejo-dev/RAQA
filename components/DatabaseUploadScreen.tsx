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
      alert("Selecciona PRUEBA.xlsx y al menos un Excel del Ministerio.");
      return;
    }
    try {
      setBusy(true);
      const prueba = await parsePrueba(pruebaFile);                 // objetos
      const ministeriosAoA = await parseMultipleMinisteriosAoA(Array.from(minFiles)); // matrices

      const out = matchClientsAgainstMinisterios(prueba, ministeriosAoA);
      onResult(out);
    } catch (e:any) {
      console.error(e);
      alert(e?.message || "Error procesando ficheros");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      <div style={{ marginBottom: 12 }}>
        <label>PRUEBA.xlsx: </label>
        <input type="file" accept=".xlsx,.xls" onChange={(e)=> setPruebaFile(e.target.files?.[0] ?? null)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Excel Ministerio (1–4): </label>
        <input type="file" accept=".xlsx,.xls" multiple onChange={(e)=> setMinFiles(e.target.files)} />
      </div>
      <button onClick={handleRun} disabled={busy} style={{ padding: "8px 12px", borderRadius: 6 }}>
        {busy ? "Procesando..." : "Calcular coincidencias"}
      </button>
    </div>
  );
}
