import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, ValidationResult, AppStatus, SearchMethod, PotentialMatch, ValidationStatusValue } from './types';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ValidationScreen from './components/ValidationScreen';
import ResultsDashboard from './components/ResultsDashboard';
import { enrichClientsWithGeoData, findPotentialMatches } from './services/geminiService';
import { Loader2 } from 'lucide-react';
import LoginScreen from './components/LoginScreen'; // <-- 1. Importar el nuevo componente

const SEARCH_CASCADE: SearchMethod[] = ['cif', 'street_keyword', 'name_keyword', 'city_broad'];

const App: React.FC = () => {
  // 2. Añadir estado para la autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [status, setStatus] = useState<AppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);

  const currentClient = useMemo(() => clients[currentIndex], [clients, currentIndex]);
  const currentSearchMethod = useMemo(() => SEARCH_CASCADE[currentSearchIndex], [currentSearchIndex]);

  const handleFileLoaded = async (loadedClients: Client[]) => {
    if (loadedClients.length > 0) {
      setStatus('enriching');
      setError(null);
      setResults([]);
      setClients([]);
      try {
        const enrichedClients = await enrichClientsWithGeoData(loadedClients);
        setClients(enrichedClients);
        const initialResults = enrichedClients.map(c => ({ clientId: c.id, status: 'Pendiente de Revisión' as const, reason: 'Not yet processed.' }));
        setResults(initialResults);
        setStatus('validating');
        setCurrentIndex(0);
        setCurrentSearchIndex(0);
      } catch (err) {
        handleProcessingError(err, "Failed to enrich client data.");
      }
    } else {
      setError("The uploaded file is empty or has an invalid format.");
      setStatus('error');
    }
  };

  const startSearchForCurrentClient = useCallback(async () => {
    if (!currentClient || status !== 'validating') return;
    
    if (currentSearchMethod === 'cif' && !currentClient.CIF_NIF) {
        setCurrentSearchIndex(prev => prev + 1);
        return;
    }

    try {
      const matches = await findPotentialMatches(currentClient, currentSearchMethod);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Failed to find matches for ${currentClient.INFO_1 || `Client #${currentClient.id}`}.`);
    }
  }, [currentClient, currentSearchMethod, status]);

  useEffect(() => {
    if (status === 'validating' && currentIndex < clients.length) {
      startSearchForCurrentClient();
    } else if (status === 'validating' && currentIndex >= clients.length) {
      setStatus('complete');
    }
  }, [status, currentIndex, clients.length, startSearchForCurrentClient]);
  
  useEffect(() => {
     if (status === 'validating' && currentIndex < clients.length && currentSearchIndex < SEARCH_CASCADE.length) {
         startSearchForCurrentClient();
     }
  }, [currentSearchIndex, status, currentIndex, clients.length, startSearchForCurrentClient]);


  const handleProcessingError = (err: unknown, defaultMessage: string) => {
    console.error("Processing Error:", err);
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    setError(errorMessage);
    setStatus('error');
  };

  const advanceToNext = () => {
    if (currentIndex < clients.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentSearchIndex(0);
      setPotentialMatches([]);
    } else {
      setStatus('complete');
    }
  };

  const updateResult = (clientId: number, status: ValidationStatusValue, reason: string, officialData?: PotentialMatch) => {
    setResults(prevResults => prevResults.map(r => 
      r.clientId === clientId ? { ...r, status, reason, officialData } : r
    ));
  };

  const handleMatchSelected = (match: PotentialMatch) => {
    updateResult(currentClient.id, 'Validado', `Manually validated from search results via ${currentSearchMethod}.`, match);
    advanceToNext();
  };

  const handleRejectMatches = () => {
    if (currentSearchIndex < SEARCH_CASCADE.length - 1) {
      setCurrentSearchIndex(prev => prev + 1);
      setPotentialMatches([]);
    }
  };

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
    setCurrentSearchIndex(0);
    setPotentialMatches([]);
  };

  // 3. Renderizar el LoginScreen si el usuario no está autenticado
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return <FileUpload onFileLoaded={handleFileLoaded} />;
      case 'enriching':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Loader2 className="h-16 w-16 animate-spin text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Enriching Data...</h2>
            <p className="text-gray-700 mt-2">
              Automatically adding Province and Autonomous Community information.
            </p>
          </div>
        );
      case 'validating':
         if (!currentClient) return null;
         return (
             <ValidationScreen
                client={currentClient}
                matches={potentialMatches}
                searchMethod={currentSearchMethod}
                isLastAttempt={currentSearchIndex === SEARCH_CASCADE.length - 1}
                onSelectMatch={handleMatchSelected}
                onReject={handleRejectMatches}
                onMarkNotValidated={handleMarkAsNotValidated}
                progress={{ current: currentIndex + 1, total: clients.length }}
             />
         );
      case 'complete':
        return <ResultsDashboard results={results} clients={clients} onReset={handleReset} />;
      case 'error':
         return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md border border-red-200">
            <h2 className="text-2xl font-semibold text-red-600">An Error Occurred</h2>
            <p className="text-gray-700 mt-2 max-w-md">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 bg-[#00338D] text-white font-bold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
            >
              Try Again
            </button>
          </div>
        );
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
