import { Client, PotentialMatch } from '@/types';
import { normalizeText } from '@/utils/dataNormalizer';

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
    // Esta función no cambia.
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
 * Busca coincidencias usando una lógica de puntuación por palabras clave, mucho más flexible y precisa.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: { [key: string]: any[] }
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    const matches: PotentialMatch[] = [];

    // 1. Normalizamos los datos del cliente y extraemos sus palabras clave (más de 2 letras).
    const clientCity = normalizeText(client.CITY);
    const clientNameKeywords = normalizeText(`${client.INFO_1 || ''} ${client.INFO_2 || ''}`).split(' ').filter(k => k.length > 2);
    const clientStreetKeywords = normalizeText(client.STREET).split(' ').filter(k => k.length > 2);
    const clientCif = (client.CIF_NIF || '').trim().toUpperCase();
    
    // Suponemos que el código autonómico podría estar en el campo 'Customer' o 'INFO_3'
    const clientAutonomicCode = (client.Customer || client.INFO_3 || '').trim();

    for (const dbName in databases) {
        for (const record of databases[dbName]) {
            // Extraemos y normalizamos los datos del registro de la base de datos
            const recordName = record['Nombre Centro'];
            const recordStreet = record['Nombre de la vía'];
            const recordCity = record['Municipio'];
            const recordCif = (record['CIF'] || '').trim().toUpperCase();
            const recordAutonomicCode = (record['Código Autonómico\ndel Centro'] || '').trim();

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

            // Filtro 3: Coincidencia por Puntuación (solo si las ciudades coinciden)
            const normalizedRecordCity = normalizeText(recordCity);
            if (clientCity && normalizedRecordCity && clientCity === normalizedRecordCity) {
                const normalizedRecordName = normalizeText(recordName);
                const normalizedRecordStreet = normalizeText(recordStreet);

                // Calculamos puntuaciones
                const nameScore = clientNameKeywords.reduce((score, keyword) => score + (normalizedRecordName.includes(keyword) ? 1 : 0), 0);
                const streetScore = clientStreetKeywords.reduce((score, keyword) => score + (normalizedRecordStreet.includes(keyword) ? 1 : 0), 0);

                // Definimos umbrales para considerar una coincidencia
                if (nameScore >= 2 && streetScore >= 1) {
                    matches.push({ reason: `Coincidencia Fuerte (Puntuación: N${nameScore}/C${streetScore})`, ...createMatchObject(record, dbName) });
                } else if (nameScore >= 2) {
                    matches.push({ reason: `Coincidencia Media (Puntuación: N${nameScore})`, ...createMatchObject(record, dbName) });
                } else if (streetScore >= 1 && nameScore >=1) {
                    matches.push({ reason: `Coincidencia Débil (Puntuación: N${nameScore}/C${streetScore})`, ...createMatchObject(record, dbName) });
                }
            }
        }
    }

    // Ordenamos los resultados por la longitud de la razón (las más cortas y específicas primero)
    return matches.sort((a, b) => a.reason.length - b.reason.length).slice(0, 5);
};

// Función de ayuda para crear el objeto de coincidencia y evitar repetición de código
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
