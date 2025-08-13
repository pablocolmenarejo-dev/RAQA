import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, ValidationResult, AppStatus, PotentialMatch, ValidationStatusValue } from '@/types';
import Layout from '@/components/Layout';
import FileUpload from '@/components/FileUpload';
import ValidationScreen from '@/components/ValidationScreen';
import ResultsDashboard from '@/components/ResultsDashboard';
import LoginScreen from '@/components/LoginScreen';
import DatabaseUploadScreen from '@/components/DatabaseUploadScreen'; // <-- NUEVO
import { enrichClientsWithGeoData, findPotentialMatches } from '@/services/geminiService';
import { parseClientFile } from '@/services/fileParserService';
import { Loader2, FileText, AlertTriangle } from 'lucide-react';

// El estado de la app ahora incluye una fase para esperar las bases de datos
type ExtendedAppStatus = AppStatus | 'awaiting_databases';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const [status, setStatus] = useState<ExtendedAppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Estado para guardar las bases de datos subidas por el usuario
  const [externalDatabases, setExternalDatabases] = useState<any | null>(null);

  const currentClient = useMemo(() => clients[currentIndex], [clients, currentIndex]);

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };
  
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setStatus('idle');
  };

  const handleProjectNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedFile) {
        setError("El nombre del proyecto es obligatorio.");
        return;
    }
    // En lugar de procesar, ahora pasamos a esperar las bases de datos
    setStatus('awaiting_databases');
  };
  
  // Esta función se llama desde la nueva pantalla cuando el usuario sube los 4 archivos
  const handleDatabasesLoaded = async (databases: { [key: string]: any[] }) => {
    setExternalDatabases(databases);
    setStatus('enriching');
    
    try {
        if (!selectedFile) throw new Error("No se encontró el archivo de clientes.");

        const loadedClients = await parseClientFile(selectedFile);
        if (loadedClients.length === 0) {
            throw new Error("El archivo de clientes está vacío o no es válido.");
        }
        const enrichedClients = await enrichClientsWithGeoData(loadedClients);
        setClients(enrichedClients);
        
        const initialResults = enrichedClients.map(c => ({ clientId: c.id, status: 'Pendiente de Revisión' as const, reason: 'Aún no procesado.' }));
        setResults(initialResults);
        setStatus('validating');
        setCurrentIndex(0);

    } catch (err) {
        handleProcessingError(err);
    }
  };

  const startSearchForCurrentClient = useCallback(async () => {
    if (!currentClient || status !== 'validating' || !externalDatabases) return;
    
    try {
      const matches = await findPotentialMatches(currentClient, externalDatabases);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Fallo al buscar coincidencias para ${currentClient.INFO_1 || `Cliente #${currentClient.id}`}.`);
    }
  }, [currentClient, status, externalDatabases]);

  useEffect(() => {
    if (status === 'validating' && currentIndex < clients.length) {
      startSearchForCurrentClient();
    } else if (status === 'validating' && currentIndex >= clients.length) {
      setStatus('complete');
    }
  }, [status, currentIndex, clients.length, startSearchForCurrentClient]);
  
  const handleProcessingError = (err: unknown, defaultMessage = "Ha ocurrido un error desconocido.") => {
    console.error("Error de Procesamiento:", err);
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    setError(errorMessage);
    setStatus('error');
  };

  const advanceToNext = () => {
    if (currentIndex < clients.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setPotentialMatches([]);
    } else {
      setIsViewingHistory(false);
      setStatus('complete');
    }
  };

  const updateResult = (clientId: number, status: ValidationStatusValue, reason: string, officialData?: PotentialMatch) => {
    setResults(prevResults => prevResults.map(r => 
      r.clientId === clientId ? { ...r, status, reason, officialData } : r
    ));
  };

  const handleMatchSelected = (match: PotentialMatch) => {
    updateResult(currentClient.id, 'Validado', `Validado manualmente desde los resultados de búsqueda.`, match);
    advanceToNext();
  };

  const handleMarkAsNotValidated = () => {
    updateResult(currentClient.id, 'No Validado', 'El usuario ha rechazado todas las coincidencias.');
    advanceToNext();
  };
  
  const handleViewHistory = (report: any) => {
    setClients(report.clients);
    setResults(report.results);
    setProjectName(report.projectName);
    setIsViewingHistory(true);
    setStatus('complete');
  };

  const handleReset = () => {
    setStatus('idle');
    setClients([]);
    setResults([]);
    setError(null);
    setCurrentIndex(0);
    setPotentialMatches([]);
    setIsViewingHistory(false);
    setSelectedFile(null);
    setProjectName('');
    setExternalDatabases(null);
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    if (selectedFile && status === 'idle') {
      return (
        <div className="w-full max-w-lg mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleProjectNameSubmit}>
              <h2 className="text-2xl font-bold text-[#333333] text-center">Nombre del Proyecto</h2>
              <p className="text-center text-gray-600 mt-2 mb-6">Por favor, dale un nombre a esta validación.</p>
              <input 
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm mb-4"
                placeholder="Ej: Validación Clientes Q4"
                required
              />
              <button
                type="submit"
                className="w-full flex justify-center items-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                Siguiente: Cargar Bases de Datos
              </button>
            </form>
          </div>
        </div>
      );
    }

    switch (status) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} />;
      
      case 'awaiting_databases':
        return <DatabaseUploadScreen onDatabasesLoaded={handleDatabasesLoaded} projectName={projectName} />;

      case 'enriching':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Loader2 className="h-16 w-16 animate-spin text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Procesando Archivos...</h2>
            <p className="text-gray-700 mt-2">
              Analizando clientes para el proyecto: <span className="font-bold">{projectName}</span>
            </p>
          </div>
        );

      case 'validating':
         if (!currentClient) return null;
         return (
             <ValidationScreen
                client={currentClient}
                matches={potentialMatches}
                onSelectMatch={handleMatchSelected}
                onMarkNotValidated={handleMarkAsNotValidated}
                progress={{ current: currentIndex + 1, total: clients.length }}
             />
         );

      case 'complete':
        return <ResultsDashboard results={results} clients={clients} onReset={handleReset} isHistoric={isViewingHistory} projectName={projectName} username={username} />;
      
      case 'error':
         return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md border border-red-200">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-semibold text-red-600">Ha Ocurrido un Error</h2>
            <p className="text-gray-700 mt-2 max-w-md">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 bg-[#00338D] text-white font-bold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
            >
              Volver a Empezar
            </button>
          </div>
        );
      
      default:
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} />;
    }
  };

  return (
    <Layout>
      <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;
