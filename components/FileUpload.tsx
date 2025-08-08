// /components/FileUpload.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Client } from '../types';
import { parseClientFile } from '../services/fileParserService';
import { UploadCloud, FileCheck2, AlertTriangle, History, Eye } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (clients: Client[]) => void;
  onViewHistory: (report: any) => void; // Nueva función para ver un informe histórico
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded, onViewHistory }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Cargar el historial desde localStorage al montar el componente
  useEffect(() => {
    try {
      const storedHistory = JSON.parse(localStorage.getItem('validationHistory') || '[]');
      setHistory(storedHistory);
    } catch (error) {
      console.error("Error cargando historial:", error);
      setHistory([]);
    }
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    setFileName(null);
    const file = acceptedFiles[0];
    if (file) {
      try {
        const clients = await parseClientFile(file);
        setFileName(file.name);
        onFileLoaded(clients);
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred while parsing the file.');
        }
      }
    }
  }, [onFileLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
  });

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-3xl mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-[#333333]">Upload Client List</h2>
        <p className="mt-2 text-gray-700">
          Upload an Excel (.xlsx, .xls) or CSV file to begin the validation process.
        </p>
      </div>
      
      <div
        {...getRootProps()}
        className={`mt-6 border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors duration-200 ease-in-out ${
          isDragActive ? 'border-[#00AEEF] bg-[#00AEEF]/10' : 'border-gray-300 hover:border-[#00AEEF]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className="h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-lg font-semibold text-[#00338D]">Drop the file here...</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-gray-700">Drag & drop your file here</p>
              <p className="text-gray-500">or click to select a file</p>
            </>
          )}
        </div>
      </div>
      
      {fileName && !error && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <FileCheck2 className="h-5 w-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">File uploaded: {fileName}</p>
        </div>
      )}
      
      {error && (
         <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-8 bg-gray-50 p-4 rounded-lg border">
        <h4 className="font-semibold text-[#333333]">Required File Format</h4>
        <p className="text-sm text-gray-700 mt-1">Ensure your file contains these columns:</p>
        <ul className="list-disc list-inside mt-2 text-sm text-gray-700 space-y-1">
            <li><code className="bg-gray-200 p-1 rounded">STREET</code>, <code className="bg-gray-200 p-1 rounded">CITY</code> (Required)</li>
            <li><code className="bg-gray-200 p-1 rounded">INFO_1</code>, <code className="bg-gray-200 p-1 rounded">INFO_2</code>, <code className="bg-gray-200 p-1 rounded">CIF_NIF</code> (Optional)</li>
        </ul>
      </div>

      {/* --- SECCIÓN DE HISTORIAL --- */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center mb-4">
            <History className="h-6 w-6 mr-3 text-gray-600" />
            <h3 className="text-xl font-semibold text-[#333333]">Validation History</h3>
          </div>
          <div className="bg-white border rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {history.map((report) => (
                <li key={report.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{`Report from: ${report.date}`}</p>
                    <p className="text-sm text-gray-500">{`${report.clientCount} clients processed`}</p>
                  </div>
                  <button
                    onClick={() => onViewHistory(report)}
                    className="flex items-center justify-center bg-[#00338D] text-white font-semibold py-2 px-3 rounded-lg hover:brightness-90 transition-all text-sm"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
