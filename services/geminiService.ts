import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS COMPLETOS (CORREGIDO) ---

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

const potentialMatchesSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            officialName: { type: Type.STRING, description: "Official name found in the database." },
            officialAddress: { type: Type.STRING, description: "Official address found." },
            cif: { type: Type.STRING, description: "Official CIF/NIF found, if any." },
            serviceType: { type: Type.STRING, description: "For 'Centro Sanitario', the type of service authorized." },
            authDate: { type: Type.STRING, description: "Authorization date found (e.g., YYYY-MM-DD)." },
            gdpStatus: { type: Type.STRING, description: "For 'Distribuidor Mayorista', the GDP certificate status." },
            sourceDB: { type: Type.STRING, description: "The database source ('REGCESS', 'AEMPS')." },
            evidenceUrl: { type: Type.STRING, description: "A direct URL to the evidence page or search result." },
            codigoAutonomico: { type: Type.STRING, description: "For 'REGCESS', the regional authorization code of the center." },
            fechaUltimaAutorizacion: { type: Type.STRING, description: "For 'REGCESS', the date of the last authorization (e.g., YYYY-MM-DD)." }
        },
        required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"]
    }
};

const keywordSchema = {
    type: Type.OBJECT,
    properties: {
        nameKeyword: { type: Type.STRING },
        streetKeyword: { type: Type.STRING }
    },
    required: ["nameKeyword", "streetKeyword"]
};

// --- SERVICIO DE BÚSQUEDA EN BASE DE DATOS INTERNA (PLACEHOLDER) ---

const searchOnInternalDatabase = async (
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en la base de datos interna con los parámetros:`, params);
    // TAREA PENDIENTE CRÍTICA: Implementar la búsqueda en la base de datos interna.
    return [];
};

// --- FUNCIONES DE IA Y ORQUESTACIÓN ---

export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    const cityData = clients.map(c => ({ id: c.id, city: c.CITY }));
    const prompt = `
        You are a Spanish geography expert. Given a JSON list of Spanish cities, provide their corresponding province (PROVINCIA) and autonomous community (CCAA).
        If a city is ambiguous or you cannot determine the location, use your best judgment. The response must be a JSON object matching the provided schema.
        Cities to process: ${JSON.stringify(cityData)}
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: geoEnrichmentSchema }
        });
        const result = JSON.parse(response.text);
        const enrichmentMap = new Map(result.enrichedClients.map((item: any) => [item.id, { PROVINCIA: item.PROVINCIA, CCAA: item.CCAA }]));
        return clients.map(client => Object.assign({}, client, enrichmentMap.get(client.id)));
    } catch (error) {
        console.warn("ADVERTENCIA: El servicio de enriquecimiento geográfico falló. El proceso continuará sin estos datos.", error);
        return clients;
    }
};

const extractKeywordsWithAI = async (client: Client): Promise<{ nameKeyword: string; streetKeyword: string }> => {
    const prompt = `
        You are an expert in Spanish addresses and entity names. From the client data, extract the most relevant keywords for a database search.
        - For the name, remove generic terms and keep the core name.
        - For the street, keep the most unique part.
        Client Data: { "INFO_1": "${client.INFO_1}", "STREET": "${client.STREET}" }
        Return ONLY the resulting JSON object with "nameKeyword" and "streetKeyword".
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: keywordSchema },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error extracting keywords with AI, using fallback.", error);
        return { nameKeyword: client.INFO_1 || '', streetKeyword: client.STREET };
    }
};

export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    let realMatches: PotentialMatch[] = [];
    let searchStrategyUsed = "No results found";

    // Intento 1: Búsqueda por CIF
    if (client.CIF_NIF) {
        searchStrategyUsed = `CIF: ${client.CIF_NIF}`;
        realMatches = await searchOnInternalDatabase({ cif: client.CIF_NIF });
    }

    // Intento 2: Búsqueda por palabras clave
    if (realMatches.length === 0) {
        const keywords = await extractKeywordsWithAI(client);
        searchStrategyUsed = `Keywords: '${keywords.nameKeyword}', '${keywords.streetKeyword}' in ${client.CITY}`;
        realMatches = await searchOnInternalDatabase({
            nameKeyword: keywords.nameKeyword,
            streetKeyword: keywords.streetKeyword,
            city: client.CITY,
            province: client.PROVINCIA
        });
    }

    if (realMatches.length === 0) return [];

    const analysisPrompt = `
        You are a data analysis assistant. Compare the client data with the list of REAL matches found in our database and return only the most plausible matches in a JSON array.
        The search that found these was: "${searchStrategyUsed}".
        If none are a good fit, return an empty array.
        Client Data: ${JSON.stringify(client)}
        Real Matches Found: ${JSON.stringify(realMatches)}
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: analysisPrompt,
            config: { responseMimeType: "application/json", responseSchema: potentialMatchesSchema },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error(`Error comparing matches with Gemini:`, error);
        return realMatches;
    }
};
