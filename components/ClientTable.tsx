import React, { useState, useMemo } from 'react';
import { Client, ValidationResult } from '../types';
import StatusBadge from './StatusBadge';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

interface ClientTableProps {
  results: ValidationResult[];
  clients: Client[];
}

const ExpandedRow: React.FC<{ result: ValidationResult }> = ({ result }) => {
    const { officialData } = result;
    return (
        <div className="bg-slate-50 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                    <p className="font-medium text-gray-500">Reason</p>
                    <p className="text-gray-800">{result.reason}</p>
                </div>
                {officialData && (
                    <>
                        <div>
                            <p className="font-medium text-gray-500">Official Name</p>
                            <p className="text-gray-800">{officialData.officialName}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-500">Official Address</p>
                            <p className="text-gray-800">{officialData.officialAddress}</p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-500">Source Database</p>
                            <p className="text-gray-800">{officialData.sourceDB}</p>
                        </div>
                         {officialData.evidenceUrl && (
                            <div className="md:col-span-2">
                                <p className="font-medium text-gray-500">Evidence</p>
                                <a href={officialData.evidenceUrl} target="_blank" rel="noopener noreferrer" className="text-[#00AEEF] hover:underline break-all">
                                    {officialData.evidenceUrl}
                                </a>
                            </div>
                         )}
                    </>
                )}
            </div>
        </div>
    );
};

const ClientTable: React.FC<ClientTableProps> = ({ results, clients }) => {
    const [expandedRow, setExpandedRow] = useState<number | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>({ key: 'INFO_1', direction: 'ascending' });

    const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

    const sortedResults = useMemo(() => {
        let sortableItems = [...results];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const clientA = clientMap.get(a.clientId);
                const clientB = clientMap.get(b.clientId);
                if (!clientA || !clientB) return 0;
                
                let valA: any, valB: any;
                if (sortConfig.key === 'status') {
                    valA = a.status;
                    valB = b.status;
                } else {
                    valA = clientA[sortConfig.key as keyof Client] || '';
                    valB = clientB[sortConfig.key as keyof Client] || '';
                }

                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [results, sortConfig, clientMap]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <ChevronsUpDown className="h-4 w-4 ml-2 text-gray-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ChevronUp className="h-4 w-4 ml-2" />;
        }
        return <ChevronDown className="h-4 w-4 ml-2" />;
    };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('INFO_1')} className="flex items-center">Client Info {getSortIcon('INFO_1')}</button>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('CITY')} className="flex items-center">Location {getSortIcon('CITY')}</button>
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button onClick={() => requestSort('status')} className="flex items-center">Status {getSortIcon('status')}</button>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedResults.map((result) => {
            const client = clientMap.get(result.clientId);
            if (!client) return null;
            const isExpanded = expandedRow === client.id;
            return (
              <React.Fragment key={client.id}>
                <tr className={isExpanded ? 'bg-[#00AEEF]/10' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => setExpandedRow(isExpanded ? null : client.id)}>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-[#00AEEF]"/> : <ChevronDown className="h-5 w-5 text-gray-500"/>}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#333333]">{client.INFO_1 || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{client.INFO_2 || client.CIF_NIF || ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{client.CITY}</div>
                    <div className="text-xs text-gray-400">{client.PROVINCIA}, {client.CCAA}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={result.status} />
                  </td>
                </tr>
                {isExpanded && (
                    <tr>
                        <td colSpan={4}>
                            <ExpandedRow result={result} />
                        </td>
                    </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ClientTable;