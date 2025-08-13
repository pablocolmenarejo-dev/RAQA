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
 * Busca coincidencias usando una lógica de puntuación por palabras clave, mucho más flexible y precisa.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: { [key: string]: any[] }
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    const potentialMatches: (PotentialMatch & { score: number })[] = [];

    // 1. Normalizamos los datos del cliente y extraemos sus palabras clave.
    const clientCity = normalizeText(client.CITY);
    const clientNameKeywords = new Set(normalizeText(`${client.INFO_1 || ''} ${client.INFO_2 || ''} ${client.INFO_3 || ''}`).split(' ').filter(k => k.length > 2));
    const clientStreetKeywords = new Set(normalizeText(client.STREET).split(' ').filter(k => k.length > 2));
    const clientCif = (client.CIF_NIF || '').trim().toUpperCase();
    const clientAutonomicCode = (client.Customer || '').trim();

    for (const dbName in databases) {
        for (const record of databases[dbName]) {
            const recordName = record['Nombre Centro'];
            const recordStreet = record['Nombre de la vía'];
            const recordCity = record['Municipio'];
            const recordCif = (record['CIF'] || '').trim().toUpperCase();
            const recordAutonomicCode = (record['Código Autonómico\ndel Centro'] || '').toString().trim();

            // --- APLICAMOS LA NUEVA LÓGICA DE FILTROS POR PRIORIDAD ---

            // Filtro 1: Código Autonómico (Máxima Prioridad)
            if (clientAutonomicCode && recordAutonomicCode && clientAutonomicCode === recordAutonomicCode) {
                potentialMatches.push({ reason: 'Coincidencia por Código Autonómico', score: 100, ...createMatchObject(record, dbName) });
                continue;
            }

            // Filtro 2: Coincidencia por CIF
            if (clientCif && recordCif && clientCif === recordCif) {
                potentialMatches.push({ reason: 'Coincidencia por CIF/NIF', score: 100, ...createMatchObject(record, dbName) });
                continue;
            }

            // Filtro 3: Coincidencia por Puntuación (solo si las ciudades coinciden)
            const normalizedRecordCity = normalizeText(recordCity);
            if (clientCity && normalizedRecordCity && clientCity === normalizedRecordCity) {
                const normalizedRecordName = normalizeText(recordName);
                const normalizedRecordStreet = normalizeText(recordStreet);

                const nameMatches = [...clientNameKeywords].filter(keyword => normalizedRecordName.includes(keyword)).length;
                const streetMatches = [...clientStreetKeywords].filter(keyword => normalizedRecordStreet.includes(keyword)).length;

                const nameScore = clientNameKeywords.size > 0 ? (nameMatches / clientNameKeywords.size) * 100 : 0;
                const streetScore = clientStreetKeywords.size > 0 ? (streetMatches / clientStreetKeywords.size) * 100 : 0;

                // Puntuación total ponderada: el nombre es más importante que la calle.
                const totalScore = (nameScore * 0.7) + (streetScore * 0.3);

                if (totalScore > 60) { // Umbral de confianza del 60%
                    potentialMatches.push({
                        reason: `Similitud del ${Math.round(totalScore)}% (Nombre: ${Math.round(nameScore)}%, Dirección: ${Math.round(streetScore)}%)`,
                        score: totalScore,
                        ...createMatchObject(record, dbName)
                    });
                }
            }
        }
    }

    // Ordenamos los resultados por puntuación descendente y devolvemos los 5 mejores.
    return potentialMatches.sort((a, b) => b.score - a.score).slice(0, 5);
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
