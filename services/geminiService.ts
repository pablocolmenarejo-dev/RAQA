import { Client, PotentialMatch } from '@/types';
// CORRECCIÓN: Se ajusta la ruta de importación para que apunte a la carpeta 'src' donde se encuentra el archivo.
import { normalizeText, getKeyword } from '@/src/utils/dataNormalizer';

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
 * Busca coincidencias usando lógica de código, que es más fiable y rápida.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: { [key: string]: any[] }
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    const matches: PotentialMatch[] = [];

    // 1. Normalizamos los datos del cliente UNA SOLA VEZ para eficiencia.
    const clientCity = normalizeText(client.CITY);
    const clientName = normalizeText(`${client.INFO_1 || ''} ${client.INFO_2 || ''}`);
    const clientStreet = normalizeText(client.STREET);
    const clientCif = (client.CIF_NIF || '').trim().toUpperCase();

    // Iteramos sobre cada base de datos (Centros C1, C2, etc.)
    for (const dbName in databases) {
        const dbRecords = databases[dbName];

        for (const record of dbRecords) {
            // Extraemos los datos del registro de la base de datos
            const recordName = record['Nombre Centro'];
            const recordStreet = record['Nombre de la vía'];
            const recordCity = record['Municipio'];
            const recordCif = (record['CIF'] || '').trim().toUpperCase();

            // --- APLICAMOS LA LÓGICA DE FILTROS ---

            // Filtro 1: Coincidencia por CIF (Máxima Prioridad)
            if (clientCif && recordCif && clientCif === recordCif) {
                matches.push({
                    officialName: recordName,
                    officialAddress: `${recordStreet || ''}, ${recordCity || ''}`.trim(),
                    cif: recordCif,
                    sourceDB: dbName,
                    reason: 'Coincidencia por CIF/NIF',
                    evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
                    ...record
                });
                continue; // Si encontramos por CIF, pasamos al siguiente registro
            }

            // Normalizamos los datos del registro actual
            const normalizedRecordCity = normalizeText(recordCity);
            
            // Filtro 2: Coincidencia por Ciudad (Requisito Básico para las demás búsquedas)
            if (clientCity && normalizedRecordCity && clientCity === normalizedRecordCity) {
                const normalizedRecordName = normalizeText(recordName);
                const normalizedRecordStreet = normalizeText(recordStreet);

                const clientNameKeyword = getKeyword(clientName);
                const clientStreetKeyword = getKeyword(clientStreet);

                const nameMatch = clientNameKeyword && normalizedRecordName.includes(clientNameKeyword);
                const streetMatch = clientStreetKeyword && normalizedRecordStreet.includes(clientStreetKeyword);

                // Filtro 3: Coincidencia Fuerte (Nombre + Calle)
                if (nameMatch && streetMatch) {
                    matches.push({
                        officialName: recordName,
                        officialAddress: `${recordStreet || ''}, ${recordCity || ''}`.trim(),
                        cif: recordCif,
                        sourceDB: dbName,
                        reason: 'Coincidencia Fuerte (Nombre, Calle y Ciudad)',
                        evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
                        ...record
                    });
                } 
                // Filtro 4: Coincidencia Media (Solo Nombre)
                else if (nameMatch) {
                     matches.push({
                        officialName: recordName,
                        officialAddress: `${recordStreet || ''}, ${recordCity || ''}`.trim(),
                        cif: recordCif,
                        sourceDB: dbName,
                        reason: 'Coincidencia Media (Nombre y Ciudad)',
                        evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
                        ...record
                    });
                }
                // Filtro 5: Coincidencia Débil (Solo Calle)
                else if (streetMatch) {
                     matches.push({
                        officialName: recordName,
                        officialAddress: `${recordStreet || ''}, ${recordCity || ''}`.trim(),
                        cif: recordCif,
                        sourceDB: dbName,
                        reason: 'Coincidencia Débil (Calle y Ciudad)',
                        evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
                        ...record
                    });
                }
            }
        }
    }

    // Devolvemos un máximo de 5 coincidencias para no saturar la interfaz
    return matches.slice(0, 5);
};
