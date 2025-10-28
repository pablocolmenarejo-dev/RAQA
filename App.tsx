import React from "react";
import ResultsDashboard from "./components/ResultsDashboard";
import ValidationWizard, {
  MatchRecord,
  ValidationKind,
  ValidationStatus,
} from "./components/ValidationWizard";

type Panel =
  | { type: "NONE" }
  | { type: "KIND"; kind: ValidationKind }
  | { type: "STATUS"; status: ValidationStatus };

const sampleData: MatchRecord[] = [
  {
    PRUEBA_customer: "CL-001",
    PRUEBA_nombre: "Centro Salud Norte",
    PRUEBA_cp: "28001",
    MIN_codigo_centro: "CSN-28001",
    MIN_source: "MIN",
    id: "1",
    estado: "PENDIENTE",
  },
  {
    PRUEBA_customer: "CL-002",
    PRUEBA_nombre: "Hospital Central",
    PRUEBA_cp: "08028",
    MIN_codigo_centro: "HOS-08028",
    MIN_source: "PRUEBA",
    id: "2",
    estado: "PENDIENTE",
  },
];

export default function App() {
  const [panel, setPanel] = React.useState<Panel>({ type: "NONE" });

  // En tu código original probablemente viene de llamadas y filtros reales
  const counts = React.useMemo(() => {
    return {
      pendientesAltaCount: 3,
      pendientesTotalesCount: 8,
      pendientesSinDatosCount: 2,
      pendientesRevisarCount: 5,
    };
  }, []);

  const openValidation = (kind: ValidationKind) => {
    setPanel({ type: "KIND", kind });
  };

  const openValidationStatus = (status: ValidationStatus) => {
    setPanel({ type: "STATUS", status });
  };

  const closeWizard = () => setPanel({ type: "NONE" });

  // Aquí filtras data según panel seleccionado; sustituye por tu lógica real
  const filteredData = React.useMemo<MatchRecord[]>(() => {
    if (panel.type === "NONE") return [];
    // Ejemplo: podrías filtrar por estado o por “kind”
    return sampleData;
  }, [panel]);

  const handleAccept = async (m: MatchRecord) => {
    // TODO: integra con tu backend/estado
    console.log("ACEPTAR", m);
  };
  const handleReject = async (m: MatchRecord) => {
    console.log("RECHAZAR", m);
  };
  const handleStandBy = async (m: MatchRecord) => {
    console.log("STANDBY", m);
  };
  const handleComment = async (m: MatchRecord, comment: string) => {
    console.log("COMENTAR", m, comment);
  };

  const wizardProps =
    panel.type === "KIND"
      ? { kind: panel.kind, status: null as ValidationStatus | null }
      : panel.type === "STATUS"
      ? { kind: null as ValidationKind | null, status: panel.status }
      : { kind: null as ValidationKind | null, status: null as ValidationStatus | null };

  return (
    <div style={{ padding: 20 }}>
      <ResultsDashboard
        title="RAQA – Dashboard"
        pendientesAltaCount={counts.pendientesAltaCount}
        pendientesTotalesCount={counts.pendientesTotalesCount}
        pendientesSinDatosCount={counts.pendientesSinDatosCount}
        pendientesRevisarCount={counts.pendientesRevisarCount}
        onOpenValidation={openValidation}
        onOpenValidationStatus={openValidationStatus}
      />

      <ValidationWizard
        isOpen={panel.type !== "NONE"}
        onClose={closeWizard}
        data={filteredData}
        onAccept={handleAccept}
        onReject={handleReject}
        onStandBy={handleStandBy}
        onComment={handleComment}
        {...wizardProps}
      />
    </div>
  );
}

