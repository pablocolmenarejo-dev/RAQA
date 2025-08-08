// /App.tsx

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Client, ValidationResult, AppStatus, SearchMethod, PotentialMatch, ValidationStatusValue } from './types';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import ValidationScreen from './components/ValidationScreen';
import ResultsDashboard from './components/ResultsDashboard';
import { enrichClientsWithGeoData, findPotentialMatches } from './services/geminiService';
import { parseClientFile } from './services/fileParserService';
import { Loader2, FileText, ShieldAlert } from 'lucide-react';
import LoginScreen from './components/LoginScreen';

const SEARCH_CASCADE: SearchMethod[] = ['cif', 'street_keyword', 'name_keyword', 'city_broad'];

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  
  const [status, setStatus] = useState<AppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDeleteId, setReportToDeleteId] = useState<string | null>(null);
  const [deleteUsername, setDeleteUsername] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);


  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setIsAuthenticated(true);
  };
  
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setStatus('project_name'); // Nuevo estado para pedir el nombre del proyecto
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
      setCurrentSearchIndex(0);
    } catch (err) {
      handleProcessingError(err, "Failed to process file.");
    }
  };

  const handleViewHistory = (report: any) => {
    setClients(report.clients);
    setResults(report.results);
    setProjectName(report.projectName);
    setIsViewingHistory(true);
    setStatus('complete');
  };

  const handleDeleteHistory = (reportId: string) => {
    setReportToDeleteId(reportId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteUsername === 'admin' && deletePassword === 'PharmaValidator2025!') {
        try {
            const history = JSON.parse(localStorage.getItem('validationHistory') || '[]');
            const updatedHistory = history.filter((report: any) => report.id !== reportToDeleteId);
            localStorage.setItem('validationHistory', JSON.stringify(updatedHistory));
            setHistoryVersion(v => v + 1);
            setShowDeleteModal(false);
            setReportToDeleteId(null);
            setDeleteUsername('');
            setDeletePassword('');
            setDeleteError(null);
        } catch (error) {
            setDeleteError("Error deleting the report.");
        }
    } else {
        setDeleteError("Invalid credentials. Deletion denied.");
    }
  };

  const startSearchForCurrentClient = useCallback(async () => {
    if (!currentClient || status !== 'validating') return;
    if (currentSearchMethod === 'cif' && !currentClient.CIF_NIF) {
        setCurrentSearchIndex(prev => prev + 1); return;
    }
    try {
      const matches = await findPotentialMatches(currentClient, currentSearchMethod);
      setPotentialMatches(matches);
    } catch (err) {
      handleProcessingError(err, `Failed to find matches for ${currentClient.INFO_1 || `Client #${currentClient.id}`}.`);
    }
  }, [currentClient, currentSearchMethod, status]);

  useEffect(() => {
    if (status === 'validating' && currentIndex < clients.length) { startSearchForCurrentClient(); }
    else if (status === 'validating' && currentIndex >= clients.length) { setStatus('complete'); }
  }, [status, currentIndex, clients.length, startSearchForCurrentClient]);
  
  useEffect(() => {
     if (status === 'validating' && currentIndex < clients.length && currentSearchIndex < SEARCH_CASCADE.length) { startSearchForCurrentClient(); }
  }, [currentSearchIndex, status, currentIndex, clients.length, startSearchForCurrentClient]);

  const handleProcessingError = (err: unknown, defaultMessage: string) => {
    console.error("Processing Error:", err);
    const errorMessage = err instanceof Error ? err.message : defaultMessage;
    setError(errorMessage);
    setStatus('error');
    setSelectedFile(null); setProjectName('');
  };

  const advanceToNext = () => {
    if (currentIndex < clients.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentSearchIndex(0);
      setPotentialMatches([]);
    } else {
      setIsViewingHistory(false);
      setStatus('complete');
    }
  };

  const updateResult = (clientId: number, status: ValidationStatusValue, reason: string, officialData?: PotentialMatch) => {
    setResults(prevResults => prevResults.map(r => r.clientId === clientId ? { ...r, status, reason, officialData } : r));
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
    setClients([]); setResults([]); setError(null); setCurrentIndex(0);
    setCurrentSearchIndex(0); setPotentialMatches([]); setIsViewingHistory(false);
    setSelectedFile(null); setProjectName('');
  };
  
  // --- Renderizado Lógico Principal ---

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const renderMainContent = () => {
    switch (status) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} onViewHistory={handleViewHistory} onDeleteHistory={handleDeleteHistory} historyVersion={historyVersion} />;
      
      case 'project_name':
        return (
            <div className="w-full max-w-lg mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form onSubmit={handleProjectNameSubmit}>
                        <h2 className="text-2xl font-bold text-[#333333] text-center">Project Name</h2>
                        <p className="text-center text-gray-600 mt-2 mb-6">Please provide a name for this validation project.</p>
                        <div className="mb-4">
                            <label htmlFor="projectName" className="sr-only">Project Name</label>
                            <input type="text" id="projectName" value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm"
                                placeholder="e.g., Q4 Client Validation" required />
                        </div>
                        <button type="submit" className="w-full flex justify-center items-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all">
                            <FileText className="h-4 w-4 mr-2" />
                            Start Validation
                        </button>
                    </form>
                </div>
            </div>
        );

      case 'enriching':
        return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md">
            <Loader2 className="h-16 w-16 animate-spin text-[#00338D] mb-6" />
            <h2 className="text-2xl font-semibold text-[#333333]">Enriching Data...</h2>
            <p className="text-gray-700 mt-2">Processing project: <span className="font-bold">{projectName}</span></p>
          </div>
        );
      case 'validating':
         if (!currentClient) return null;
         return <ValidationScreen client={currentClient} matches={potentialMatches} searchMethod={currentSearchMethod}
                isLastAttempt={currentSearchIndex === SEARCH_CASCADE.length - 1} onSelectMatch={handleMatchSelected}
                onReject={handleRejectMatches} onMarkNotValidated={handleMarkAsNotValidated}
                progress={{ current: currentIndex + 1, total: clients.length }} />;
      case 'complete':
        return <ResultsDashboard results={results} clients={clients} onReset={handleReset} isHistoric={isViewingHistory} projectName={projectName} username={username} />;
      case 'error':
         return (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md border border-red-200">
            <h2 className="text-2xl font-semibold text-red-600">An Error Occurred</h2>
            <p className="text-gray-700 mt-2 max-w-md">{error}</p>
            <button onClick={handleReset} className="mt-6 bg-[#00338D] text-white font-bold py-2 px-4 rounded-lg hover:brightness-90 transition-all">
              Try Again
            </button>
          </div>
        );
      default:
        return <div>Invalid application state.</div>
    }
  };

  return (
    <>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm">
                <form onSubmit={handleConfirmDelete}>
                    <div className="text-center">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">Confirm Deletion</h3>
                        <p className="mt-2 text-sm text-gray-600">
                            Please enter credentials to permanently delete this report. This action cannot be undone.
                        </p>
                    </div>
                    <div className="mt-6 space-y-4">
                        <input type="text" placeholder="Username" value={deleteUsername} onChange={(e) => setDeleteUsername(e.target.value)}
                            className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm"
                            required />
                        <input type="password" placeholder="Password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
                            className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] sm:text-sm"
                            required />
                    </div>
                     {deleteError && <p className="mt-3 text-center text-sm text-red-600">{deleteError}</p>}
                    <div className="mt-6 flex justify-between gap-4">
                        <button type="button" onClick={() => setShowDeleteModal(false)}
                            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700">
                            Delete
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <Layout>
        <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {renderMainContent()}
        </div>
      </Layout>
    </>
  );
};

export default App;
