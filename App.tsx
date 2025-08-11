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

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const [status, setStatus] = useState<AppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const currentClient = useMemo(() => clients[currentIndex], [clients, currentIndex]);

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
      const matches = await findPotentialMatches(currentClient);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Failed to find matches for ${currentClient.INFO_1 || `Client #${currentClient.id}`}.`);
    }
  }, [currentClient, status]);

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
    updateResult(currentClient.id, 'Validado', `Manually validated from search results.`, match);
    advanceToNext();
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
    setPotentialMatches([]);
    setIsViewingHistory(false);
    setSelectedFile(null);
    setProjectName('');
  };

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }
  
  if (selectedFile && status === 'idle') {
    return (
        <Layout>
            <div className="w-full max-w-lg mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form onSubmit={handleProjectNameSubmit}>
                        <h2 className="text-2xl font-bold text-[#333333] text-center">Project Name</h2>
                        <p className="text-center text-gray-600 mt-2 mb-6">Please provide a name for this validation project.</p>
                        <div className="mb-4">
                            <label htmlFor="projectName" className="sr-only">Project Name</label>
                            <input 
                                type="text"
                                id="projectName"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm"
                                placeholder="e.g., Q4 Client Validation"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full flex justify-center items-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Start Validation
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
  }

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} />;
      case 'enriching':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Loader2 className="h-16 w-16 animate-spin text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Enriching Data...</h2>
            <p className="text-gray-700 mt-2">
              Processing project: <span className="font-bold">{projectName}</span>
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
