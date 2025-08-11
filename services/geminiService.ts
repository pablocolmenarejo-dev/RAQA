import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS (SIN CAMBIOS) ---
const geoEnrichmentSchema = { type: Type.OBJECT, properties: { enrichedClients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, PROVINCIA: { type: Type.STRING }, CCAA: { type: Type.STRING } }, required: ["id", "PROVINCIA", "CCAA"] } } }, required: ["enrichedClients"] };
const potentialMatchesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { officialName: { type: Type.STRING }, officialAddress: { type: Type.STRING }, cif: { type: Type.STRING }, serviceType: { type: Type.STRING }, authDate: { type: Type.STRING }, gdpStatus: { type: Type.STRING }, sourceDB: { type: Type.STRING }, evidenceUrl: { type: Type.STRING }, codigoAutonomico: { type: Type.STRING }, fechaUltimaAutorizacion: { type: Type.STRING } }, required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"] } };
const keywordSchema = { type: Type.OBJECT, properties: { nameKeyword: { type: Type.STRING }, streetKeyword: { type: Type.STRING } }, required: ["nameKeyword", "streetKeyword"] };


// --- SERVICIO DE BÚSQUEDA (PLACEHOLDER) ---
const searchOnInternalDatabase = async (
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en la base de datos interna con los parámetros:`, params);
    // AQUÍ IRÍA LA LÓGICA DE CONEXIÓN Y CONSULTA A TU BASE DE DATOS
    return [];
};


// --- FUNCIONES DE IA Y ORQUESTACIÓN ---

/**
 * Función de enriquecimiento geográfico (MODIFICADA PARA SER MÁS ROBUSTA).
 */
export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    const cityData = clients.map(c => ({ id: c.id, city: c.CITY }));
    const prompt = `
        You are a Spanish geography expert. Given a JSON list of Spanish cities, provide their corresponding province (PROVINCIA) and autonomous community (CCAA).
        If a city is ambiguous or you cannot determine the location, use your best judgment. The response must be a JSON object matching the provided schema.

        Cities to process:
        ${JSON.stringify(cityData)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: geoEnrichmentSchema
            }
        });

        const result = JSON.parse(response.text);
        const enrichmentMap = new Map(result.enrichedClients.map((item: any) => [item.id, { PROVINCIA: item.PROVINCIA, CCAA: item.CCAA }]));

        return clients.map(client => Object.assign({}, client, enrichmentMap.get(client.id)));

    } catch (error) {
        // --- INICIO DE LA MODIFICACIÓN ---
        // En lugar de lanzar un error que detiene la aplicación,
        // mostramos un aviso en la consola y continuamos sin los datos geográficos.
        console.warn("ADVERTENCIA: El servicio de enriquecimiento geográfico falló. El proceso continuará sin estos datos. Causa probable: datos incorrectos en la columna 'CITY' del Excel o problema de red.", error);
        
        // Devolvemos los clientes originales sin enriquecer para que la app no se detenga.
        return clients;
        // --- FIN DE LA MODIFICACIÓN ---
    }
};

/**
 * Usa la IA para extraer palabras clave.
 */
const extractKeywordsWithAI = async (client: Client): Promise<{ nameKeyword: string; streetKeyword: string }> => {
    // ... (código original sin cambios)
};

/**
 * Orquesta la estrategia de búsqueda inteligente.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    // ... (código original sin cambios)
};
