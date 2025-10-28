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

// --- NUEVAS CLAVES DE LOCALSTORAGE ---
const LS_KEY_PROJECTS = "raqa:projects:v1"; // Lista de metadatos de proyectos
const LS_KEY_DATA_PREFIX = "raqa:project:data:v1:"; // Prefijo para datos de proyecto

type TierFilter = "ALL" | "ALTA" | "REVISAR" | "SIN";

export default function App() {
  // Estado de la aplicación
  const [projects, setProjects] = useState<Project[]>([]); // Lista de todos los proyectos
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<ProjectData | null>(null);
  
  // Estado del Wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardFilter, setWizardFilter] = useState<TierFilter>("ALL");

  // Hidratar lista de proyectos desde localStorage al cargar
  useEffect(() => {
    try {
      const rawP = localStorage.getItem(LS_KEY_PROJECTS);
      if (rawP) setProjects(JSON.parse(rawP));
    } catch {}
  }, []);

  // Persistir decisiones/comentarios CADA VEZ que cambien, en el proyecto activo
  useEffect(() => {
    if (!currentProjectId || !currentData) return;
    
    // Guardamos el objeto ProjectData completo
    const key = LS_KEY_DATA_PREFIX + currentProjectId;
    try {
      localStorage.setItem(key, JSON.stringify(currentData));
    } catch (e) {
      console.error("Error saving project data to localStorage", e);
    }
  }, [currentData, currentProjectId]); // Se ejecuta cuando currentData (y sus hijos) cambian

  // --- FUNCIONES DE GESTIÓN DE PROYECTOS ---

  /**
   * Carga un proyecto existente desde localStorage y lo pone como activo
   */
  const loadProject = (id: string) => {
    try {
      const key = LS_KEY_DATA_PREFIX + id;
      const rawData = localStorage.getItem(key);
      if (!rawData) throw new Error(`No data found for project ${id}`);
      
      const data: ProjectData = JSON.parse(rawData);
      
      // Limpiar claves huérfanas (mantenemos tu lógica original)
      const validKeys = new Set(data.matchOutput.matches.map((m) => makeMatchKey(m)));
      const cleanDecisions: DecisionMap = {};
      for (const [k, v] of Object.entries(data.decisions)) if (validKeys.has(k)) cleanDecisions[k] = v;
      const cleanComments: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.comments)) if (validKeys.has(k)) cleanComments[k] = v;
      
      const cleanData = { ...data, decisions: cleanDecisions, comments: cleanComments };

      setCurrentProjectId(id);
      setCurrentData(cleanData);
      
    } catch (e) {
      console.error(e);
      alert("Error al cargar el proyecto. Revisa la consola.");
    }
  };

  /**
   * Crea, procesa y guarda un proyecto nuevo.
   */
  const handleCreateProject = async (data: {
    pruebaFile: File;
    minFiles: FileList;
    projectName: string;
    userName: string;
  }) => {
    // 1. Parsear y Hacer Matching (lógica movida desde DatabaseUploadScreen)
    const prueba = await parsePrueba(data.pruebaFile);
    const ministeriosAoA = await parseMultipleMinisteriosAoA(Array.from(data.minFiles));
    const out = matchClientsAgainstMinisterios(prueba, ministeriosAoA);

    // 2. Crear nuevos objetos de Proyecto
    const id = new Date().getTime().toString();
    const newProject: Project = {
      id,
      projectName: data.projectName,
      userName: data.userName,
      savedAt: new Date().toISOString(),
      summary: out.summary,
    };
    const newData: ProjectData = {
      matchOutput: out,
      decisions: {}, // Vacío al empezar
      comments: {},  // Vacío al empezar
    };

    // 3. Guardar en localStorage
    const updatedProjects = [...projects, newProject];
    localStorage.setItem(LS_KEY_PROJECTS, JSON.stringify(updatedProjects));
    localStorage.setItem(LS_KEY_DATA_PREFIX + id, JSON.stringify(newData));

    // 4. Actualizar estado para navegar a la pantalla de resultados
    setProjects(updatedProjects);
    setCurrentProjectId(id);
    setCurrentData(newData);
  };

  /**
   * Vuelve a la pantalla de carga (resetea el estado)
   */
  const handleReset = () => {
    setCurrentProjectId(null);
    setCurrentData(null);
    setShowWizard(false);
    setWizardFilter("ALL");
  };

  const openValidation = (tier?: "ALTA" | "REVISAR" | "SIN") => {
    if (!currentData?.matchOutput?.matches?.length) {
      alert("No hay coincidencias todavía. Ejecuta el matching primero.");
      return;
    }
    setWizardFilter(tier ?? "ALL");
    setShowWizard(true);
  };

  // --- FUNCIONES DE VALIDACIÓN (Ahora modifican el estado 'currentData') ---

  const handleDecide = (m: MatchRecord, d: Decision) => {
    if (!currentData) return;
    const key = makeMatchKey(m);
    setCurrentData(prev => ({
      ...prev!,
      decisions: {
        ...prev!.decisions,
        [key]: d
      }
    }));
  };

  const handleComment = (m: MatchRecord, text: string) => {
    if (!currentData) return;
    const key = makeMatchKey(m);
    setCurrentData(prev => ({
      ...prev!,
      comments: {
        ...prev!.comments,
        [key]: text
      }
    }));
  };

  const handleExport = async () => {
    if (!currentData) return;
    
    // Obtenemos el nombre del proyecto actual
    const currentProjectMeta = projects.find(p => p.id === currentProjectId);
    const projectName = currentProjectMeta?.projectName || "matches";
    const filename = `${projectName.replace(/ /g, "_")}.xlsx`;
    
    try {
      await exportMatchesToExcel(
        currentData.matchOutput,
        currentData.decisions,
        currentData.comments,
        filename
      );
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "No se pudo exportar el Excel. Revisa la consola.");
    }
  };

  // --- DATOS DERIVADOS (MEMOIZED) ---

  // Data anotada (para la tabla)
  const annotated = useMemo(() => {
    const arr = currentData?.matchOutput?.matches ?? [];
    const decisions = currentData?.decisions ?? {};
    const comments = currentData?.comments ?? {};
    
    return arr.map((m) => ({
      ...m,
      __decision: decisions[makeMatchKey(m)] as Decision | undefined,
      __comment:  comments[makeMatchKey(m)] ?? "",
    }));
  }, [currentData]);

  // Filtrado para el Wizard
  const matchesForWizard = useMemo(() => {
    const arr = currentData?.matchOutput?.matches ?? [];
    if (wizardFilter === "ALL") return arr;
    return arr.filter((m) => m.TIER === wizardFilter);
  }, [currentData?.matchOutput?.matches, wizardFilter]);

  // --- RENDER ---

  if (!currentData) {
    return (
      <div style={{ padding: "16px 0" }}>
        {/* Pantalla de carga y lista de proyectos */}
        <DatabaseUploadScreen
          projects={projects}
          onLoadProject={loadProject}
          onRunNewProject={handleCreateProject}
        />
      </div>
    );
  }

  // Pantalla de resultados (similar a antes, pero usa 'currentData')
  const currentProjectMeta = projects.find(p => p.id === currentProjectId);

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, flex: 1, fontSize: 24 }}>
          {currentProjectMeta?.projectName || "RAQA – Resultados"}
          {currentProjectMeta && (
            <span style={{ fontSize: 14, color: '#5a7184', fontWeight: 400, marginLeft: 10 }}>
              (Por: {currentProjectMeta.userName})
            </span>
          )}
        </h1>

        <button
          onClick={handleExport}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #0c6",
            background: "#0f9d58",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Exportar Excel
        </button>

        <button
          onClick={handleReset}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #999", cursor: "pointer" }}
        >
          ← Volver a Proyectos
        </button>
      </header>

      <ResultsDashboard
        result={currentData.matchOutput}
        decisions={currentData.decisions}
        onOpenValidation={openValidation}
      />

      <ClientTable
        data={annotated}
        decisions={currentData.decisions}
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

      <details style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", marginBottom: 8 }}>Ver JSON bruto (Debug)</summary>
        <pre
          style={{
            background: "#0b1021",
            color: "#cde6ff",
            padding: 12,
            borderRadius: 8,
            maxHeight: 320,
            overflow: "auto",
            fontSize: 12,
          }}
        >
{JSON.stringify({ currentProjectId, currentData, projects, wizardFilter }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
