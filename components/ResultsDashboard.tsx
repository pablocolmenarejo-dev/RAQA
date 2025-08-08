import React from 'react';
import { Client, ValidationResult, ValidationStatusValue } from '../types';
import ClientTable from './ClientTable';
import { generatePdfReport, generateExcelReport } from '../services/reportGeneratorService';
import { FileDown, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';

interface ResultsDashboardProps {
  results: ValidationResult[];
  clients: Client[];
  onReset: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, clients, onReset }) => {
  const handleDownloadPdf = () => {
    // Ya no necesita argumentos, llamará a la nueva función de captura
    generatePdfReport();
  };

  const handleDownloadExcel = () => {
    generateExcelReport(results, clients);
  };

  const statusCounts = results.reduce((acc, result) => {
    acc[result.status] = (acc[result.status] || 0) + 1;
    return acc;
  }, {} as Record<ValidationStatusValue, number>);

  const summaryItems = [
    { title: 'Validated', count: statusCounts['Validado'] || 0, icon: CheckCircle, color: 'text-green-500' },
    { title: 'Not Validated', count: statusCounts['No Validado'] || 0, icon: XCircle, color: 'text-red-500' },
    { title: 'Pending Review', count: statusCounts['Pendiente de Revisión'] || 0, icon: Clock, color: 'text-yellow-500' },
  ];

  return (
    // Se ha añadido el id="report-content" aquí para marcar todo el div para la captura
    <div className="space-y-6" id="report-content">
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <h2 className="text-2xl font-bold text-[#333333]">Validation Complete</h2>
                <p className="text-gray-700 mt-1">Review the final results for the {clients.length} clients processed.</p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <button
                    onClick={onReset}
                    className="flex items-center justify-center bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Start New Validation
                </button>
                <button
                    onClick={handleDownloadPdf}
                    className="flex items-center justify-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
                >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download PDF
                </button>
                <button
                    onClick={handleDownloadExcel}
                    className="flex items-center justify-center bg-[#00AEEF] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
                >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Excel
                </button>
            </div>
        </div>
      </div>
      
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryItems.map(item => (
          <div key={item.title} className="bg-white p-6 rounded-xl shadow-lg flex items-center space-x-4">
            <item.icon className={`h-10 w-10 ${item.color}`} />
            <div>
              <p className="text-gray-600 text-sm">{item.title}</p>
              <p className="text-2xl font-bold text-[#333333]">{item.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-[#333333] mb-4">Detailed Client Report</h3>
        <ClientTable results={results} clients={clients} />
      </div>
    </div>
  );
};

export default ResultsDashboard;
