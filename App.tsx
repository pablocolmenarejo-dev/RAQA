// src/App.tsx

import React, { useState } from 'react';
import { AppStatus, Client, ValidationResult } from './types';
import LoginScreen from './components/LoginScreen';
import FileUpload from './components/FileUpload';
import DatabaseUploadScreen from './components/DatabaseUploadScreen';
import ValidationScreen from './components/ValidationScreen';
import ResultsDashboard from './components/ResultsDashboard';
import Layout from './components/Layout';
import { enrichClientsWithGeoData, findPotentialMatches } from './services/geminiService';
import { parseClientFile } from './services/fileParserService';
import './index.css';

function App() {
  const [appStatus, setAppStatus] = useState<AppStatus>('idle');
  const [clients, setClients] = useState<Client[]>([]);
  const [databases, setDatabases] = useState<{ [key: string]: any[] }>({});
  const [currentClientIndex, setCurrentClientIndex] = useState(0);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [username, setUsername] = useState<string | null>(null);

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setAppStatus('project_name');
  };

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setAppStatus('project_name');
  };

  const handleProjectNameSet = async (name: string) => {
    if (!selectedFile) return;
    setProjectName(name);
    setAppStatus('enriching');
    try {
      const parsedClients = await parseClientFile(selectedFile);
      const enrichedClients = await enrichClientsWithGeoData(parsedClients as Client[]);
      setClients(enrichedClients);
      setAppStatus('uploading_databases');
    } catch (error) {
      console.error("Error processing file:", error);
      setAppStatus('error');
    }
  };

  const handleDatabasesLoaded = (db: { [key: string]: any[] }) => {
    setDatabases(db);
    setAppStatus('validating');
    processNextClient(clients[0], db);
  };

  const processNextClient = async (client: Client, db: { [key: string]: any[] }) => {
    const matches = await findPotentialMatches(client, db);
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, matches } : c));
    setAppStatus('validating');
  };

  const handleValidationStep = (result: ValidationResult) => {
    setValidationResults(prev => [...prev, result]);
    const nextClientIndex = currentClientIndex + 1;
    if (nextClientIndex < clients.length) {
      setCurrentClientIndex(nextClientIndex);
      processNextClient(clients[nextClientIndex], databases);
    } else {
      setAppStatus('complete');
    }
  };

  const handleReset = () => {
    setAppStatus('idle');
    setClients([]);
    setDatabases({});
    setCurrentClientIndex(0);
    setValidationResults([]);
    setSelectedFile(null);
    setProjectName('');
    setUsername(null);
  };

  const renderScreen = () => {
    if (!username) {
      return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    switch (appStatus) {
      case 'idle':
        return <FileUpload onFileSelected={handleFileSelected} />;
      case 'project_name':
        return <ProjectNameScreen onProjectNameSet={handleProjectNameSet} />;
      case 'uploading_databases':
        return <DatabaseUploadScreen onDatabasesLoaded={handleDatabasesLoaded} projectName={projectName} />;
      case 'validating':
        const currentClient = clients[currentClientIndex];
        return (
          <ValidationScreen
            client={currentClient}
            matches={currentClient.matches || []}
            onSelectMatch={(match) => handleValidationStep({ clientId: currentClient.id, status: 'Validado', reason: match.reason, officialData: match })}
            onMarkNotValidated={() => handleValidationStep({ clientId: currentClient.id, status: 'No Validado', reason: 'No se encontraron coincidencias adecuadas.' })}
            progress={{ current: currentClientIndex + 1, total: clients.length }}
          />
        );
      case 'complete':
        return <ResultsDashboard results={validationResults} clients={clients} onReset={handleReset} projectName={projectName} username={username} />;
      case 'error':
        return (
          <div className="text-center mt-10">
            <p className="text-red-600 font-semibold text-lg">Ha ocurrido un error. Por favor, reinicia el proceso.</p>
            <button onClick={handleReset} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Volver al inicio</button>
          </div>
        );
      case 'enriching':
      default:
        return (
          <div className="text-center mt-10">
            <p className="text-gray-600 font-semibold text-lg">Procesando...</p>
          </div>
        );
    }
  };

  return (
    <Layout>
      {renderScreen()}
    </Layout>
  );
}

// Nota: Debes crear un componente ProjectNameScreen o integrar la lógica en FileUpload
const ProjectNameScreen: React.FC<{ onProjectNameSet: (name: string) => void }> = ({ onProjectNameSet }) => {
    const [name, setName] = useState('');
    return (
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Set Project Name</h2>
            <p className="text-gray-700 mb-4">Please enter a name for this validation project.</p>
            <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="E.g., Client Validation Q3"
                className="w-full p-2 border rounded-md mb-4"
            />
            <button 
                onClick={() => onProjectNameSet(name)}
                disabled={!name}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md disabled:bg-gray-400"
            >
                Continue
            </button>
        </div>
    );
};

export default App;
