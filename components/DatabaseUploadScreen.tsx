import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileCheck2, AlertTriangle, Database, ArrowRight } from 'lucide-react';
import { parseClientFile } from '@/services/fileParserService';

// Nombres de los archivos que el usuario debe subir
const DATABASE_TYPES = [
    'Centros C1', 
    'Centros C2', 
    'Centros C3', 
    'Establecimientos Sanitarios'
];

interface DatabaseUploadScreenProps {
  onDatabasesLoaded: (databases: { [key: string]: any[] }) => void;
  projectName: string;
}

const DatabaseUploadScreen: React.FC<DatabaseUploadScreenProps> = ({ onDatabasesLoaded, projectName }) => {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDrop = useCallback((acceptedFiles: File[], type: string) => {
    setError(null);
    const file = acceptedFiles[0];
    if (file) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  }, []);

  const handleContinue = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedData: { [key: string]: any[] } = {};
      await Promise.all(DATABASE_TYPES.map(async (type) => {
        const file = files[type];
        if (!file) {
          throw new Error(`Falta el archivo de ${type}.`);
        }
        // Reutilizamos el parser existente, asumiendo que puede leer cualquier Excel a JSON
        const jsonData = await parseClientFile(file);
        parsedData[type] = jsonData;
      }));
      onDatabasesLoaded(parsedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar los archivos.');
    } finally {
      setIsLoading(false);
    }
  };

  const allFilesUploaded = DATABASE_TYPES.every(type => files[type]);

  const Dropzone = ({ type }: { type: string }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (accepted) => handleDrop(accepted, type),
      maxFiles: 1,
      accept: {
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      },
    });

    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <h3 className="font-semibold text-lg text-gray-800 capitalize">{type}</h3>
        <div
          {...getRootProps()}
          className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-100' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          {files[type] ? (
            <div className="flex items-center justify-center text-green-700">
              <FileCheck2 className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium truncate">{files[type]!.name}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Arrastra o haz clic para subir</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-4xl mx-auto">
      <div className="text-center">
        <Database className="h-12 w-12 mx-auto text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-[#333333]">Cargar Bases de Datos de Validación</h2>
        <p className="mt-2 text-gray-700">
          Para el proyecto <span className="font-bold">{projectName}</span>, por favor, sube los 4 archivos Excel de validación.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {DATABASE_TYPES.map(type => <Dropzone key={type} type={type} />)}
      </div>

      {error && (
        <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!allFilesUploaded || isLoading}
          className="flex items-center justify-center bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto"
        >
          {isLoading ? 'Procesando...' : 'Continuar con la Validación'}
          {!isLoading && <ArrowRight className="h-5 w-5 ml-2" />}
        </button>
      </div>
    </div>
  );
};

export default DatabaseUploadScreen;
