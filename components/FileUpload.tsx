import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Client } from '../types';
import { parseClientFile } from '../services/fileParserService';
import { UploadCloud, FileCheck2, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onFileLoaded: (clients: Client[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoaded }) => {
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

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
            <li><code className="bg-gray-200 p-1 rounded">STREET</code>: Street name for searching (e.g., "Valcorchero")</li>
            <li><code className="bg-gray-200 p-1 rounded">CITY</code>: City for searching (e.g., "Plasencia")</li>
            <li><code className="bg-gray-200 p-1 rounded">INFO_1</code> (Optional): Client Name (e.g., "Hospital Virgen del Puerto")</li>
            <li><code className="bg-gray-200 p-1 rounded">INFO_2</code> (Optional): Full address for display</li>
            <li><code className="bg-gray-200 p-1 rounded">CIF_NIF</code> (Optional): Tax ID for precise search</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;