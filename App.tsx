// /App.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, ValidationResult, AppStatus, PotentialMatch, ValidationStatusValue } from './types';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ValidationScreen from './components/ValidationScreen';
import ResultsDashboard from './components/ResultsDashboard';
import { enrichClientsWithGeoData, findPotentialMatches } from './services/geminiService';
import { parseClientFile } from './services/fileParserService';
import { Loader2, FileText } from 'lucide-react';
import LoginScreen from './components/LoginScreen';

// YA NO NECESITAMOS LA CASCADA DE BÚSQUEDA AQUÍ
// const SEARCH_CASCADE: SearchMethod[] = ['cif', 'street_keyword', 'name_keyword', 'city_broad'];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const [status, setStatus] = useState<AppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // ELIMINAMOS EL ESTADO PARA EL ÍNDICE DE BÚSQUEDA
  // const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentClient = useMemo(() => clients[currentIndex], [clients, currentIndex]);
  // YA NO NECESITAMOS EL MÉTODO DE BÚSQUEDA ACTUAL
  // const currentSearchMethod = useMemo(() => SEARCH_CASCADE[currentSearchIndex], [currentSearchIndex]);

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };
  
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleProjectNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !selectedFile) {
        setError("Project name is required.");
        return;
    }
    await processFile(selectedFile);
  };
  
  const processFile = async (file: File) => {
    setIsViewingHistory(false);
    setStatus('enriching');
    setError(null);
    setResults([]);
    setClients([]);
    
    try {
      const loadedClients = await parseClientFile(file);
      if (loadedClients.length === 0) {
          throw new Error("The file is empty or has an invalid format.");
      }
      const enrichedClients = await enrichClientsWithGeoData(loadedClients);
      setClients(enrichedClients);
      const initialResults = enrichedClients.map(c => ({ clientId: c.id, status: 'Pendiente de Revisión' as const, reason: 'Not yet processed.' }));
      setResults(initialResults);
      setStatus('validating');
      setCurrentIndex(0);
      // YA NO RESETEAMOS EL ÍNDICE DE BÚSQUEDA
      // setCurrentSearchIndex(0);
    } catch (err) {
      handleProcessingError(err);
    }
  };

  const handleViewHistory = (report: any) => {
    setClients(report.clients);
    setResults(report.results);
    setProjectName(report.projectName);
    setIsViewingHistory(true);
    setStatus('complete');
  };

  const startSearchForCurrentClient = useCallback(async () => {
    if (!currentClient || status !== 'validating') return;
    
    try {
      // LA LLAMADA AHORA ES MÁS SIMPLE: SOLO PASAMOS EL CLIENTE
      const matches = await findPotentialMatches(currentClient);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Failed to find matches for ${currentClient.INFO_1 || `Client #${currentClient.id}`}.`);
    }
  }, [currentClient, status]);

  // ELIMINAMOS EL useEffect QUE REACCIONABA A currentSearchIndex
  useEffect(() => {
    if (status === 'validating' && currentIndex < clients.length) {
      startSearchForCurrentClient();
    } else if (status === 'validating' && currentIndex >= clients.length) {
      setStatus('complete');
    }
  }, [status, currentIndex, clients.length, startSearchForCurrentClient]);
  

  const handleProcessingError = (err: unknown, defaultMessage = "An unknown error occurred.") => {
    console.error("Processing Error:", err);
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    setError(errorMessage);
    setStatus('error');
    setSelectedFile(null);
    setProjectName('');
  };

  const advanceToNext = () => {
    if (currentIndex < clients.length - 1) {
      setCurrentIndex(prev => prev + 1);
      // YA NO HAY ÍNDICE DE BÚSQUEDA QUE RESETEAR
      // setCurrentSearchIndex(0);
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
    // El motivo ahora es más genérico
    updateResult(currentClient.id, 'Validado', `Manually validated from search results.`, match);
    advanceToNext();
  };

  // ESTA FUNCIÓN YA NO ES NECESARIA PORQUE NO HAY "PRÓXIMO INTENTO"
  /*
  const handleRejectMatches = () => {
    if (currentSearchIndex < SEARCH_CASCADE.length - 1) {
      setCurrentSearchIndex(prev => prev + 1);
      setPotentialMatches([]);
    }
  };
  */

  const handleMarkAsNotValidated = () => {
    updateResult(currentClient.id, 'No Validado', 'All search attempts were rejected by the user.');
    advanceToNext();
  };

  const handleReset = () => {
    setStatus('idle');
    setClients([]);
    setResults([]);
    setError(null);
    setCurrentIndex(0);
    // setCurrentSearchIndex(0);
    setPotentialMatches([]);
    setIsViewingHistory(false);
    setSelectedFile(null);
    setProjectName('');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }
  
  if (selectedFile && status === 'idle') {
    // ... (sin cambios en el formulario de nombre de proyecto)
  }

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} />;
      case 'enriching':
        return (/* ... (sin cambios) ... */);
      case 'validating':
         if (!currentClient) return null;
         return (
             <ValidationScreen
                client={currentClient}
                matches={potentialMatches}
                // YA NO PASAMOS ESTOS PROPS
                // searchMethod={currentSearchMethod}
                // isLastAttempt={currentSearchIndex === SEARCH_CASCADE.length - 1}
                onSelectMatch={handleMatchSelected}
                // onReject={handleRejectMatches} // Ya no existe
                onMarkNotValidated={handleMarkAsNotValidated}
                progress={{ current: currentIndex + 1, total: clients.length }}
             />
         );
      case 'complete':
        return <ResultsDashboard results={results} clients={clients} onReset={handleReset} isHistoric={isViewingHistory} projectName={projectName} username={username} />;
      case 'error':
         return (/* ... (sin cambios) ... */);
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
