import React from 'react';
import { Client, PotentialMatch } from '../types';
import { Check, Search, X, AlertTriangle } from 'lucide-react';

interface ValidationScreenProps {
  client: Client;
  matches: PotentialMatch[];
  onSelectMatch: (match: PotentialMatch) => void;
  onMarkNotValidated: () => void;
  progress: { current: number, total: number };
}

const MatchCard: React.FC<{ match: PotentialMatch, onSelect: () => void }> = ({ match, onSelect }) => (
    <div className="border bg-white rounded-lg p-4 flex flex-col justify-between hover:border-[#00AEEF] hover:shadow-md transition-all">
        <div>
            <p className="font-bold text-[#333333]">{match.officialName}</p>
            <p className="text-sm text-gray-700">{match.officialAddress}</p>
            <div className="text-xs text-gray-600 mt-2 space-y-1">
                 {match.cif && <p><strong>CIF:</strong> {match.cif}</p>}
                 {match.serviceType && <p><strong>Service:</strong> {match.serviceType}</p>}
                 {match.codigoAutonomico && <p><strong>Código Autonómico:</strong> {match.codigoAutonomico}</p>}
                 {match.fechaUltimaAutorizacion && <p><strong>Última Autorización:</strong> {match.fechaUltimaAutorizacion}</p>}
                 {match.gdpStatus && <p><strong>GDP:</strong> {match.gdpStatus}</p>}
                 <p><strong>Source:</strong> {match.sourceDB}</p>
            </div>
        </div>
        <div className="mt-4 flex justify-end">
            <button
                onClick={onSelect}
                className="flex items-center justify-center bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
                <Check className="h-4 w-4 mr-2"/>
                Select & Validate
            </button>
        </div>
    </div>
);

const ValidationScreen: React.FC<ValidationScreenProps> = ({
  client,
  matches,
  onSelectMatch,
  onMarkNotValidated,
  progress
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
        <div className="flex justify-between items-center border-b pb-4 mb-6">
            <div>
                <h2 className="text-xl font-bold text-[#333333]">Assisted Validation</h2>
                <p className="text-gray-600">Review the matches and make a selection.</p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-gray-700">Client {progress.current} of {progress.total}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div className="bg-[#00338D] h-2.5 rounded-full" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 border-r-0 lg:border-r lg:pr-8">
                <h3 className="font-semibold text-lg text-[#333333]">Client from File</h3>
                <div className="mt-4 space-y-3 text-sm bg-slate-50 p-4 rounded-lg">
                    <p><strong className="text-gray-600 block">Customer ID:</strong> {client.Customer || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Name/Info 1:</strong> {client.INFO_1 || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Address/Info 2:</strong> {client.INFO_2 || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Street:</strong> {client.STREET}</p>
                    <p><strong className="text-gray-600 block">City:</strong> {client.CITY}</p>
                    <p><strong className="text-gray-600 block">CIF/NIF:</strong> {client.CIF_NIF || 'N/A'}</p>
                    {(client.PROVINCIA || client.CCAA) &&
                        <p><strong className="text-gray-600 block">Enriched Location:</strong> {client.PROVINCIA}{client.CCAA && `, ${client.CCAA}`}</p>
                    }
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Search className="h-4 w-4" />
                    <span>Searching for potential matches in the database...</span>
                </div>

                <div className="mt-4">
                    {matches.length > 0 ? (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-gray-800">Found {matches.length} Potential Match(es)</h4>
                            {matches.map((match, index) => (
                                <MatchCard key={index} match={match} onSelect={() => onSelectMatch(match)} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 px-6 bg-gray-50 rounded-lg">
                            <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-3"/>
                            <h4 className="font-semibold text-[#333333]">No Matches Found</h4>
                            <p className="text-gray-700">The automatic search did not yield any results.</p>
                        </div>
                    )}
                </div>
                
                <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                     <button 
                        onClick={onMarkNotValidated}
                        className="flex items-center justify-center bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                         <X className="h-4 w-4 mr-2"/>
                         Mark as Not Validated
                     </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ValidationScreen;
