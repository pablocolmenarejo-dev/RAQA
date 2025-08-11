import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS (SIN CAMBIOS) ---
const geoEnrichmentSchema = { /* ...código sin cambios... */ };
const potentialMatchesSchema = { /* ...código sin cambios... */ };
// (He omitido los esquemas para abreviar, pero no cambian respecto al código anterior)

// --- SERVICIOS DE BÚSQUEDA REAL (PLACEHOLDERS) ---

// Esta es la implementación que debe contener la lógica de scraping real.
const searchOnExternalSource = async (
    source: 'REGCESS' | 'AEMPS', 
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en ${source} con los parámetros:`, params);
    // AQUÍ IRÍA LA LÓGICA DE SCRAPING REAL
    // 1. Construir la URL de búsqueda en REGCESS o AEMPS con los parámetros recibidos.
    // 2. Realizar la petición HTTP.
    // 3. Analizar el HTML y extraer los datos.
    // 4. Devolver un array de objetos PotentialMatch.
    
    // Por ahora, devolvemos un array vacío como placeholder.
    return [];
};


// --- FUNCIONES DE IA (MODIFICADAS Y NUEVAS) ---

/**
 * NUEVO: Usa la IA para extraer palabras clave de los datos brutos del cliente.
 */
const extractKeywordsWithAI = async (client: Client): Promise<{ nameKeyword: string; streetKeyword: string }> => {
    const prompt = `
        You are an expert in Spanish addresses and entity names. Given the messy data for a client, extract the most relevant keywords for a database search.
        - For the name, remove generic terms like 'SERVICIO DE FARMACIA', 'COMPLEJO HOSPITALARIO', etc., and keep the core name.
        - For the street, keep the most unique part of the name.

        Example 1:
        Client Data: { "INFO_1": "300001SESCAM-COMP.HOSPITAL U. ALBACETE", "STREET": "HERMANOS FALCO, S/N" }
        Result: { "nameKeyword": "HOSPITAL UNIVERSITARIO ALBACETE", "streetKeyword": "FALCO" }

        Example 2:
        Client Data: { "INFO_1": "Centro de Salud Zona IV", "STREET": "C/ Del Ferrocarril, 23" }
        Result: { "nameKeyword": "Salud Zona IV", "streetKeyword": "Ferrocarril" }

        Now, process this client's data:
        Client Data: ${JSON.stringify({ INFO_1: client.INFO_1, STREET: client.STREET })}
        
        Return ONLY the resulting JSON object.
    `;
    
    // Este schema es para la nueva función de extracción
    const keywordSchema = {
        type: Type.OBJECT,
        properties: {
            nameKeyword: { type: Type.STRING },
            streetKeyword: { type: Type.STRING }
        },
        required: ["nameKeyword", "streetKeyword"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: keywordSchema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error extracting keywords with AI:", error);
        // Si falla la IA, usamos los datos originales como fallback
        return { nameKeyword: client.INFO_1 || '', streetKeyword: client.STREET };
    }
};

/**
 * MODIFICADO: Orquesta la estrategia de búsqueda inteligente en cascada.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    let realMatches: PotentialMatch[] = [];
    let searchStrategyUsed = "No results found";

    // --- ESTRATEGIA DE BÚSQUEDA EN CASCADA ---

    // Intento 1: Búsqueda por CIF (la más fiable)
    if (client.CIF_NIF) {
        searchStrategyUsed = `CIF: ${client.CIF_NIF}`;
        realMatches = await searchOnExternalSource('REGCESS', { cif: client.CIF_NIF });
        if (realMatches.length === 0) {
            realMatches = await searchOnExternalSource('AEMPS', { cif: client.CIF_NIF });
        }
    }

    // Intento 2: Búsqueda por palabras clave (si el intento 1 falló)
    if (realMatches.length === 0) {
        const keywords = await extractKeywordsWithAI(client);
        searchStrategyUsed = `Keywords: '${keywords.nameKeyword}', '${keywords.streetKeyword}' in ${client.CITY}`;
        
        const params = {
            nameKeyword: keywords.nameKeyword,
            streetKeyword: keywords.streetKeyword,
            city: client.CITY,
            province: client.PROVINCIA
        };
        realMatches = await searchOnExternalSource('REGCESS', params);
        if (realMatches.length === 0) {
            realMatches = await searchOnExternalSource('AEMPS', params);
        }
    }

    // Intento 3: Búsqueda amplia por ciudad (último recurso)
    if (realMatches.length === 0) {
        searchStrategyUsed = `Broad search in city: ${client.CITY}`;
        const params = { city: client.CITY, province: client.PROVINCIA };
        realMatches = await searchOnExternalSource('REGCESS', params);
        if (realMatches.length === 0) {
            realMatches = await searchOnExternalSource('AEMPS', params);
        }
    }

    // Si después de todos los intentos no hay resultados, devolvemos array vacío.
    if (realMatches.length === 0) {
        return [];
    }

    // --- ANÁLISIS FINAL POR IA ---
    // Ahora le pasamos a la IA los resultados REALES y la ESTRATEGIA que funcionó.
    
    const analysisPrompt = `
        You are a highly accurate data analysis assistant for pharmaceutical regulatory compliance.
        Your task is to compare a client's data with a list of REAL potential matches obtained from official Spanish databases.
        The search strategy that found these results was: "${searchStrategyUsed}". Use this context to inform your analysis.
        
        1.  Carefully analyze the client's information.
        2.  Compare it against each of the "Real Matches Found".
        3.  Identify the most likely candidates.
        4.  Return ONLY a JSON array containing the best-fitting matches.
        5.  If none of the provided real matches are a plausible match, you MUST return an empty JSON array.

        Client Data to Validate:
        ${JSON.stringify(client)}

        Real Matches Found (from official sources):
        ${JSON.stringify(realMatches)}

        Return ONLY the filtered JSON array of plausible matches.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: potentialMatchesSchema,
            },
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error(`Error comparing real matches with Gemini:`, error);
        throw new Error(`The AI service failed to analyze the search results.`);
    }
};


/**
 * Función de enriquecimiento geográfico (sin cambios).
 */
export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    // ... (código original sin cambios)
    const cityData = clients.map(c => ({ id: c.id, city: c.CITY }));
    const prompt = `
        You are a Spanish geography expert. Given a JSON list of Spanish cities, provide their corresponding province (PROVINCIA) and autonomous community (CCAA).
        If a city is ambiguous, use your best judgment. The response must be a JSON object matching the provided schema. Do not add any text outside the JSON.

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
        console.error("Error during Geo Enrichment with Gemini:", error);
        throw new Error("The AI service failed to provide geographical data.");
    }
};
