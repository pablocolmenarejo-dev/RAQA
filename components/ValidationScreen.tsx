import React from 'react';
import { Client, PotentialMatch, SearchMethod } from '../types';
import { Check, Search, ChevronRight, X, AlertTriangle } from 'lucide-react';

interface ValidationScreenProps {
  client: Client;
  matches: PotentialMatch[];
  searchMethod: SearchMethod;
  isLastAttempt: boolean;
  onSelectMatch: (match: PotentialMatch) => void;
  onReject: () => void;
  onMarkNotValidated: () => void;
  progress: { current: number, total: number };
}

const SearchMethodDescription: React.FC<{ method: SearchMethod }> = ({ method }) => {
    const descriptions = {
        cif: 'Most accurate search using CIF/NIF.',
        street_keyword: 'Searching by street name keyword.',
        name_keyword: 'Searching by client name keyword.',
        city_broad: 'Broad search within the city.'
    };
    return (
        <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Search className="h-4 w-4" />
            <span>Attempting: <strong className="font-semibold text-[#333333]">{method.replace('_', ' ')}</strong> - {descriptions[method]}</span>
        </div>
    );
}

const MatchCard: React.FC<{ match: PotentialMatch, onSelect: () => void }> = ({ match, onSelect }) => (
    <div className="border bg-white rounded-lg p-4 flex flex-col justify-between hover:border-[#00AEEF] hover:shadow-md transition-all">
        <div>
            <p className="font-bold text-[#333333]">{match.officialName}</p>
            <p className="text-sm text-gray-700">{match.officialAddress}</p>
            <div className="text-xs text-gray-600 mt-2 space-y-1">
                 {match.cif && <p><strong>CIF:</strong> {match.cif}</p>}
                 {match.serviceType && <p><strong>Service:</strong> {match.serviceType}</p>}
                 {/* Añadir estas dos condiciones para los nuevos campos */}
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
  searchMethod,
  isLastAttempt,
  onSelectMatch,
  onReject,
  onMarkNotValidated,
  progress
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8">
        {/* Header */}
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Client Info */}
            <div className="lg:col-span-1 border-r-0 lg:border-r lg:pr-8">
                <h3 className="font-semibold text-lg text-[#333333]">Client from File</h3>
                <div className="mt-4 space-y-3 text-sm bg-slate-50 p-4 rounded-lg">
                    <p><strong className="text-gray-600 block">Customer ID:</strong> {client.Customer || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Name/Info 1:</strong> {client.INFO_1 || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Address/Info 2:</strong> {client.INFO_2 || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Street:</strong> {client.STREET}</p>
                    <p><strong className="text-gray-600 block">City:</strong> {client.CITY}</p>
                    <p><strong className="text-gray-600 block">CIF/NIF:</strong> {client.CIF_NIF || 'N/A'}</p>
                    <p><strong className="text-gray-600 block">Enriched Location:</strong> {client.PROVINCIA}, {client.CCAA}</p>
                </div>
            </div>

            {/* Right Panel: Matches */}
            <div className="lg:col-span-2">
                <SearchMethodDescription method={searchMethod} />
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
                            <p className="text-gray-700">This search attempt did not yield any results.</p>
                        </div>
                    )}
                </div>
                {/* Action Buttons */}
                <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                     {!isLastAttempt && (
                        <button 
                            onClick={onReject}
                            className="flex items-center justify-center bg-[#00338D] text-white font-semibold py-2 px-4 rounded-lg hover:brightness-90 transition-all"
                        >
                            None match, try next search method
                            <ChevronRight className="h-4 w-4 ml-2"/>
                        </button>
                     )}
                     {isLastAttempt && (
                        <p className="text-sm text-gray-500 text-center sm:text-left">This was the last search attempt.</p>
                     )}
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
