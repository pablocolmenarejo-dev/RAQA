// En: src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import DatabaseUploadScreen from "@/components/DatabaseUploadScreen";
import ResultsDashboard from "@/components/ResultsDashboard";
import ClientTable from "@/components/ClientTable";
import ValidationWizard, { Decision, DecisionMap, makeMatchKey } from "@/components/ValidationWizard";
import { exportMatchesToExcel } from "@/services/reportGeneratorService";
import { parsePrueba, parseMultipleMinisteriosAoA } from "@/services/fileParserService";
import { matchClientsAgainstMinisterios } from "@/services/matchingService";

import type { MatchOutput, MatchRecord, Project, ProjectData } from "@/types";

// --- Claves de LocalStorage ---
const LS_KEY_PROJECTS = "raqa:projects:v1";
const LS_KEY_DATA_PREFIX = "raqa:project:data:v1:";

// --- Tipos para Filtros ---
type TierFilter = "ALL" | "ALTA" | "REVISAR" | "SIN";
// Nuevo tipo para el filtro de estado de validación
type ValidationStatusFilter = Decision | 'COMPLETED' | 'PENDING_ALL' | 'ALL';

export default function App() {
  // --- Estados ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<ProjectData | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardFilter, setWizardFilter] = useState<TierFilter>("ALL");
  // Nuevo estado para el filtro de validación
  const [validationStatusFilter, setValidationStatusFilter] = useState<ValidationStatusFilter>('ALL');

  // --- Effects (sin cambios) ---
  useEffect(() => { /* Hidratar proyectos */
    try {
      const rawP = localStorage.getItem(LS_KEY_PROJECTS);
      if (rawP) setProjects(JSON.parse(rawP));
    } catch {}
  }, []);

  useEffect(() => { /* Persistir datos del proyecto activo */
    if (!currentProjectId || !currentData) return;
    const key = LS_KEY_DATA_PREFIX + currentProjectId;
    try {
      localStorage.setItem(key, JSON.stringify(currentData));
    } catch (e) { console.error("Error saving project data", e); }
  }, [currentData, currentProjectId]);

  // --- Funciones Gestión Proyectos (sin cambios) ---
  const loadProject = (id: string) => { /* ... */
      try {
        const key = LS_KEY_DATA_PREFIX + id;
        const rawData = localStorage.getItem(key);
        if (!rawData) throw new Error(`No data found for project ${id}`);
        const data: ProjectData = JSON.parse(rawData);
        const validKeys = new Set(data.matchOutput.matches.map((m) => makeMatchKey(m)));
        const cleanDecisions: DecisionMap = {};
        for (const [k, v] of Object.entries(data.decisions)) if (validKeys.has(k)) cleanDecisions[k] = v;
        const cleanComments: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.comments)) if (validKeys.has(k)) cleanComments[k] = v;
        const cleanData = { ...data, decisions: cleanDecisions, comments: cleanComments };
        setCurrentProjectId(id);
        setCurrentData(cleanData);
        setValidationStatusFilter('ALL'); // Resetear filtro al cargar proyecto
      } catch (e) {
        console.error(e);
        alert("Error al cargar el proyecto. Revisa la consola.");
      }
   };
  const handleCreateProject = async (data: { /* ... */ }) => { /* ... */
      const prueba = await parsePrueba(data.pruebaFile);
      const ministeriosAoA = await parseMultipleMinisteriosAoA(Array.from(data.minFiles));
      const out = matchClientsAgainstMinisterios(prueba, ministeriosAoA);
      const id = new Date().getTime().toString();
      const newProject: Project = { id, projectName: data.projectName, userName: data.userName, savedAt: new Date().toISOString(), summary: out.summary };
      const newData: ProjectData = { matchOutput: out, decisions: {}, comments: {} };
      const updatedProjects = [...projects, newProject];
      localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(updatedProjects));
      localStorage.setItem(LS_KEY_DATA_PREFIX + id, JSON.stringify(newData));
      setProjects(updatedProjects);
      setCurrentProjectId(id);
      setCurrentData(newData);
      setValidationStatusFilter('ALL'); // Resetear filtro al crear proyecto
  };
  const handleDeleteProject = (id: string) => { /* ... */
      const project = projects.find(p => p.id === id);
      const projectName = project?.projectName || "este proyecto";
      if (!window.confirm(`¿Seguro que quieres eliminar "${projectName}"?`)) return;
      try {
        const updatedProjects = projects.filter(p => p.id !== id);
        setProjects(updatedProjects);
        localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(updatedProjects));
        localStorage.removeItem(LS_KEY_DATA_PREFIX + id);
      } catch (e) { console.error("Error deleting project:", e); alert("No se pudo eliminar."); }
  };
  const handleReset = () => { /* ... */
      setCurrentProjectId(null);
      setCurrentData(null);
      setShowWizard(false);
      setWizardFilter("ALL");
      setValidationStatusFilter('ALL'); // Resetear filtro al volver
   };
  const openValidation = (tier?: TierFilter) => { /* ... */
      if (!currentData?.matchOutput?.matches?.length) return alert("No hay coincidencias.");
      setWizardFilter(tier ?? "ALL");
      setShowWizard(true);
   };

  // --- Funciones Validación (sin cambios) ---
  const handleDecide = (m: MatchRecord, d: Decision) => { /* ... */
      if (!currentData) return;
      const key = makeMatchKey(m);
      setCurrentData(prev => ({ ...prev!, decisions: { ...prev!.decisions, [key]: d } }));
   };
  const handleComment = (m: MatchRecord, text: string) => { /* ... */
      if (!currentData) return;
      const key = makeMatchKey(m);
      setCurrentData(prev => ({ ...prev!, comments: { ...prev!.comments, [key]: text } }));
   };
  const handleExport = async () => { /* ... */
      if (!currentData) return;
      const currentProjectMeta = projects.find(p => p.id === currentProjectId);
      const projectName = currentProjectMeta?.projectName || "matches";
      const filename = `${projectName.replace(/ /g, "_")}.xlsx`;
      try { await exportMatchesToExcel(currentData.matchOutput, currentData.decisions, currentData.comments, filename); }
      catch (e: any) { console.error(e); alert(e?.message || "Error al exportar."); }
   };

  // --- Nueva Función para Manejar Filtro de Estado ---
  const handleValidationStatusFilterChange = (status: ValidationStatusFilter) => {
    setValidationStatusFilter(status);
  };

  // --- DATOS DERIVADOS (MEMOIZED) ---

  // Data anotada Y FILTRADA (para la tabla)
  const annotatedAndFiltered = useMemo(() => {
    const arr = currentData?.matchOutput?.matches ?? [];
    const decisionsMap = currentData?.decisions ?? {};
    const commentsMap = currentData?.comments ?? {};

    // Primero anotamos
    const annotated = arr.map((m) => {
      const key = makeMatchKey(m);
      return {
        ...m,
        __decision: decisionsMap[key] as Decision | undefined,
        __comment:  commentsMap[key] ?? "",
      };
    });

    // Luego filtramos según validationStatusFilter
    if (validationStatusFilter === 'ALL') {
      return annotated;
    }
    if (validationStatusFilter === 'COMPLETED') {
      return annotated.filter(m => m.__decision === 'ACCEPTED' || m.__decision === 'REJECTED');
    }
    if (validationStatusFilter === 'PENDING_ALL') {
      return annotated.filter(m => m.__decision !== 'ACCEPTED' && m.__decision !== 'REJECTED');
    }
    // Para ACCEPTED, REJECTED, STANDBY
    return annotated.filter(m => m.__decision === validationStatusFilter);

  }, [currentData, validationStatusFilter]); // Añadimos validationStatusFilter como dependencia

  // Filtrado para el Wizard (sin cambios)
  const matchesForWizard = useMemo(() => { /* ... */
      const arr = currentData?.matchOutput?.matches ?? [];
      if (wizardFilter === "ALL") return arr;
      return arr.filter((m) => m.TIER === wizardFilter);
   }, [currentData?.matchOutput?.matches, wizardFilter]);

  // --- RENDER ---

  if (!currentData) {
    return (
      <div style={{ padding: "16px 0" }}>
        <DatabaseUploadScreen
          projects={projects}
          onLoadProject={loadProject}
          onRunNewProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />
      </div>
    );
  }

  const currentProjectMeta = projects.find(p => p.id === currentProjectId);

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        {/* ... (Título y botones Exportar/Volver sin cambios) ... */}
        <h1 style={{ margin: 0, flex: 1, fontSize: 24 }}>
          {currentProjectMeta?.projectName || "RAQA – Resultados"}
          {currentProjectMeta && ( <span style={{ fontSize: 14, color: '#5a7184', fontWeight: 400, marginLeft: 10 }}> (Por: {currentProjectMeta.userName}) </span> )}
        </h1>
        <button onClick={handleExport} style={{ /*...*/ padding: "8px 12px", borderRadius: 8, border: "1px solid #0c6", background: "#0f9d58", color: "#fff", fontWeight: 600, cursor: "pointer", }}> Exportar Excel </button>
        <button onClick={handleReset} style={{ /*...*/ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", cursor: "pointer", }}> ← Volver a Proyectos </button>
      </header>

      <ResultsDashboard
        result={currentData.matchOutput}
        decisions={currentData.decisions}
        onOpenValidation={openValidation}
        onOpenValidationStatus={handleValidationStatusFilterChange} // <-- Pasamos la nueva función
      />

      {/* Sección para mostrar el filtro activo y botón para limpiarlo */}
      {validationStatusFilter !== 'ALL' && (
        <div style={{ margin: '16px 0', padding: '10px 15px', background: '#e3f2fd', border: '1px solid #bbdefb', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#0d47a1', fontWeight: 500 }}>
            Filtrando por: {validationStatusFilter.replace('_', ' ')}
          </span>
          <button
            onClick={() => setValidationStatusFilter('ALL')}
            style={{ padding: '4px 8px', fontSize: '12px', background: '#90caf9', color: '#0d47a1', border: 'none', borderRadius: '4px', cursor: 'pointer', margin: 0 }}
          >
            Quitar filtro &times;
          </button>
        </div>
      )}

      <ClientTable
        data={annotatedAndFiltered} // <-- Pasamos los datos filtrados
        decisions={currentData.decisions} // decisions y comments no necesitan filtrarse aquí
        comments={currentData.comments}
      />

      {showWizard && (
        <ValidationWizard
          matches={matchesForWizard}
          decisions={currentData.decisions}
          comments={currentData.comments}
          onDecide={handleDecide}
          onComment={handleComment}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* ... (Sección <details> sin cambios) ... */}
       <details style={{ marginTop: 12 }}> <summary style={{ cursor: "pointer", marginBottom: 8 }}>Ver JSON bruto (Debug)</summary> <pre style={{ background: "#0b1021", color: "#cde6ff", padding: 12, borderRadius: 8, maxHeight: 320, overflow: "auto", fontSize: 12, }}> {JSON.stringify({ currentProjectId, currentData, projects, wizardFilter, validationStatusFilter }, null, 2)} </pre> </details>
    </div>
  );
}
