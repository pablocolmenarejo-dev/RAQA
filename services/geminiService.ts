import { Client, PotentialMatch } from '@/types';
// CORRECCIÓN: Se ajusta la ruta de importación para que apunte a la carpeta 'src'
import { normalizeText } from '@/src/utils/dataNormalizer';

// Mantenemos la IA solo para el enriquecimiento geográfico inicial.
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { throw new Error("GEMINI_API_KEY environment variable not set"); }
const ai = new GoogleGenAI({ apiKey: API_KEY });
const geoEnrichmentSchema = {
    type: Type.OBJECT,
    properties: {
        enrichedClients: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.INTEGER },
                    PROVINCIA: { type: Type.STRING },
                    CCAA: { type: Type.STRING }
                },
                required: ["id", "PROVINCIA", "CCAA"]
            }
        }
    },
    required: ["enrichedClients"]
};

// --- FUNCIONES EXPORTADAS ---

export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    if (!clients || clients.length === 0) return [];
    try {
        const cityData = clients.map(c => ({ id: c.id, city: c.CITY }));
        const prompt = `You are a Spanish geography expert. Given a JSON list of Spanish cities, provide their corresponding province (PROVINCIA) and autonomous community (CCAA). Cities to process: ${JSON.stringify(cityData)}`;
        const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt, config: { responseMimeType: "application/json", responseSchema: geoEnrichmentSchema } });
        const result = JSON.parse(response.text);
        const enrichmentMap = new Map(result.enrichedClients.map((item: any) => [item.id, { PROVINCIA: item.PROVINCIA, CCAA: item.CCAA }]));
        return clients.map(client => ({ ...client, ...(enrichmentMap.get(client.id) || {}) }));
    } catch (error) {
        console.warn("ADVERTENCIA: El servicio de enriquecimiento geográfico falló.", error);
        return clients;
    }
};

/**
 * Busca coincidencias usando una lógica de palabras clave, siguiendo la nueva estrategia.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: { [key: string]: any[] }
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    const matches: PotentialMatch[] = [];

    // 1. Normalizamos los datos del cliente y extraemos sus palabras clave.
    const clientProvince = normalizeText(client.PROVINCIA);
    const clientNameKeywords = new Set(normalizeText(`${client.INFO_1 || ''} ${client.INFO_2 || ''} ${client.INFO_3 || ''}`).split(' ').filter(k => k.length > 3));
    const clientStreetKeywords = new Set(normalizeText(client.STREET).split(' ').filter(k => k.length > 3));
    const clientCif = (client.CIF_NIF || '').trim().toUpperCase();
    const clientAutonomicCode = (client.Customer || '').trim();

    for (const dbName in databases) {
        for (const record of databases[dbName]) {
            const recordName = record['Nombre Centro'];
            const recordStreet = record['Nombre de la vía'];
            const recordProvince = record['Provincia'];
            const recordCif = (record['CIF'] || '').trim().toUpperCase();
            const recordAutonomicCode = (record['Código Autonómico\ndel Centro'] || '').toString().trim();

            // --- APLICAMOS LA NUEVA LÓGICA DE FILTROS POR PRIORIDAD ---

            // Filtro 1: Código Autonómico (Máxima Prioridad)
            if (clientAutonomicCode && recordAutonomicCode && clientAutonomicCode === recordAutonomicCode) {
                matches.push({ reason: 'Coincidencia por Código Autonómico', ...createMatchObject(record, dbName) });
                continue;
            }

            // Filtro 2: Coincidencia por CIF
            if (clientCif && recordCif && clientCif === recordCif) {
                matches.push({ reason: 'Coincidencia por CIF/NIF', ...createMatchObject(record, dbName) });
                continue;
            }

            // Filtro 3: Coincidencia por palabras clave (solo si las provincias coinciden)
            const normalizedRecordProvince = normalizeText(recordProvince);
            if (clientProvince && normalizedRecordProvince && clientProvince === normalizedRecordProvince) {
                const normalizedRecordName = normalizeText(recordName);
                const normalizedRecordStreet = normalizeText(recordStreet);

                // Buscamos si ALGUNA palabra clave del cliente está en el registro
                const nameMatch = [...clientNameKeywords].some(keyword => normalizedRecordName.includes(keyword));
                const streetMatch = [...clientStreetKeywords].some(keyword => normalizedRecordStreet.includes(keyword));

                if (nameMatch && streetMatch) {
                    matches.push({ reason: `Coincidencia Fuerte (Nombre y Dirección en ${client.PROVINCIA})`, ...createMatchObject(record, dbName) });
                } else if (nameMatch) {
                    matches.push({ reason: `Coincidencia Media (Nombre en ${client.PROVINCIA})`, ...createMatchObject(record, dbName) });
                } else if (streetMatch) {
                    matches.push({ reason: `Coincidencia Débil (Dirección en ${client.PROVINCIA})`, ...createMatchObject(record, dbName) });
                }
            }
        }
    }

    // Eliminamos duplicados basados en el nombre y la dirección
    const uniqueMatches = Array.from(new Map(matches.map(match => [`${match.officialName}-${match.officialAddress}`, match])).values());
    
    return uniqueMatches.slice(0, 5);
};

// Función de ayuda para crear el objeto de coincidencia
const createMatchObject = (record: any, dbName: string): Omit<PotentialMatch, 'reason'> => {
    return {
        officialName: record['Nombre Centro'],
        officialAddress: `${record['Nombre de la vía'] || ''}, ${record['Municipio'] || ''}`.trim(),
        cif: record['CIF'] || '',
        sourceDB: dbName,
        evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
        ...record
    };
};
