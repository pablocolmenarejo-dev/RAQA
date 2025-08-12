import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, ValidationResult, AppStatus, PotentialMatch, ValidationStatusValue } from './types';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ValidationScreen from './components/ValidationScreen';
import ResultsDashboard from './components/ResultsDashboard';
import LoginScreen from './components/LoginScreen';
import { enrichClientsWithGeoData, findPotentialMatches } from './services/geminiService';
import { parseClientFile } from './services/fileParserService';
// Asumimos que crearás este nuevo servicio para manejar la carga de los Excels.
import { fetchAndParseExternalDatabases } from './services/externalDataService'; 
import { Loader2, FileText, Server, AlertTriangle } from 'lucide-react';

// Definimos un tipo más específico para el estado de la aplicación
type ExtendedAppStatus = AppStatus | 'loading_external_data';

const App: React.FC = () => {
  // --- Estados de Autenticación y Datos Principales ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  // --- Estados del Proceso de Validación ---
  const [status, setStatus] = useState<ExtendedAppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // --- Estados para el Flujo de UI y Datos Externos ---
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // --- NUEVO ESTADO: Almacena los datos de los 4 Excels ---
  const [externalDatabases, setExternalDatabases] = useState<any | null>(null);

  const currentClient = useMemo(() => clients[currentIndex], [clients, currentIndex]);

  // --- Manejadores de Autenticación y Selección de Archivo ---
  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };
  
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setStatus('idle'); // Vuelve al estado idle para mostrar la pantalla de nombre de proyecto
  };

  // --- Flujo Principal de Procesamiento ---
  const handleProjectNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedFile) {
        setError("El nombre del proyecto es obligatorio.");
        return;
    }
    await processFile(selectedFile);
  };
  
  const processFile = async (file: File) => {
    setIsViewingHistory(false);
    setStatus('loading_external_data'); // Nuevo estado para indicar la carga de BDs externas
    setError(null);
    setResults([]);
    setClients([]);
    
    try {
      // Paso 1: Cargar las bases de datos externas si no están ya en memoria.
      let databases = externalDatabases;
      if (!databases) {
        databases = await fetchAndParseExternalDatabases();
        setExternalDatabases(databases); // Guardar en estado para futuras validaciones.
      }
      
      // Paso 2: Procesar el archivo del cliente y enriquecerlo.
      setStatus('enriching');
      const loadedClients = await parseClientFile(file);
      if (loadedClients.length === 0) {
          throw new Error("El archivo está vacío o tiene un formato no válido.");
      }
      const enrichedClients = await enrichClientsWithGeoData(loadedClients);
      setClients(enrichedClients);
      
      // Paso 3: Iniciar la validación.
      const initialResults = enrichedClients.map(c => ({ clientId: c.id, status: 'Pendiente de Revisión' as const, reason: 'Aún no procesado.' }));
      setResults(initialResults);
      setStatus('validating');
      setCurrentIndex(0);

    } catch (err) {
      handleProcessingError(err);
    }
  };

  const startSearchForCurrentClient = useCallback(async () => {
    // Asegurarse de que tenemos todo lo necesario antes de proceder.
    if (!currentClient || status !== 'validating' || !externalDatabases) return;
    
    try {
      // ¡Llamada al servicio de Gemini con el cliente Y las bases de datos!
      const matches = await findPotentialMatches(currentClient, externalDatabases);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Fallo al buscar coincidencias para ${currentClient.INFO_1 || `Cliente #${currentClient.id}`}.`);
    }
  }, [currentClient, status, externalDatabases]); // Añadir 'externalDatabases' a las dependencias.

  // Efecto que dispara la búsqueda para el cliente actual.
  useEffect(() => {
    if (status === 'validating' && currentIndex < clients.length) {
      startSearchForCurrentClient();
    } else if (status === 'validating' && currentIndex >= clients.length) {
      setStatus('complete');
    }
  }, [status, currentIndex, clients.length, startSearchForCurrentClient]);
  
  // --- Funciones Auxiliares y de Navegación ---
  const handleProcessingError = (err: unknown, defaultMessage = "Ha ocurrido un error desconocido.") => {
    console.error("Error de Procesamiento:", err);
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    setError(errorMessage);
    setStatus('error');
    setSelectedFile(null);
    setProjectName('');
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
  };

  // --- Renderizado Condicional del Contenido ---
  const renderContent = () => {
    // Si no está autenticado, mostrar pantalla de Login.
    if (!isAuthenticated) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    // Si se ha seleccionado un archivo, pedir nombre de proyecto.
    if (selectedFile && status === 'idle') {
      return (
        <div className="w-full max-w-lg mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <form onSubmit={handleProjectNameSubmit}>
              <h2 className="text-2xl font-bold text-[#333333] text-center">Nombre del Proyecto</h2>
              <p className="text-center text-gray-600 mt-2 mb-6">Por favor, dale un nombre a esta validación.</p>
              <div className="mb-4">
                <label htmlFor="projectName" className="sr-only">Nombre del Proyecto</label>
                <input 
                  type="text"
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm"
                  placeholder="Ej: Validación Clientes Q4"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center items-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                Iniciar Validación
              </button>
            </form>
          </div>
        </div>
      );
    }

    // Renderizado principal según el estado del proceso.
    switch (status) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} />;
      
      case 'loading_external_data':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Server className="h-16 w-16 animate-pulse text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Cargando Bases de Datos...</h2>
            <p className="text-gray-700 mt-2">
              Descargando los últimos ficheros de validación. Esto solo ocurre una vez por sesión.
            </p>
          </div>
        );
        
      case 'enriching':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Loader2 className="h-16 w-16 animate-spin text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Procesando Archivo...</h2>
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
