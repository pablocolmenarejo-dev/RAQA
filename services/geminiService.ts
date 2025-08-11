import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS (NO CAMBIAN) ---
const geoEnrichmentSchema = { type: Type.OBJECT, properties: { enrichedClients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, PROVINCIA: { type: Type.STRING }, CCAA: { type: Type.STRING } }, required: ["id", "PROVINCIA", "CCAA"] } } }, required: ["enrichedClients"] };
const potentialMatchesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { officialName: { type: Type.STRING }, officialAddress: { type: Type.STRING }, cif: { type: Type.STRING }, serviceType: { type: Type.STRING }, authDate: { type: Type.STRING }, gdpStatus: { type: Type.STRING }, sourceDB: { type: Type.STRING }, evidenceUrl: { type: Type.STRING }, codigoAutonomico: { type: Type.STRING }, fechaUltimaAutorizacion: { type: Type.STRING } }, required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"] } };
const keywordSchema = { type: Type.OBJECT, properties: { nameKeyword: { type: Type.STRING }, streetKeyword: { type: Type.STRING } }, required: ["nameKeyword", "streetKeyword"] };

// --- SERVICIO DE BÚSQUEDA EN BASE DE DATOS INTERNA (EL NUEVO CORAZÓN DEL SISTEMA) ---

/**
 * Esta función busca en tu base de datos interna, que contiene los datos de los Excel de REGCESS y AEMPS.
 * @param params - Objeto con los parámetros de búsqueda (CIF, palabras clave, etc.).
 * @returns Una promesa con un array de resultados de la base de datos.
 */
const searchOnInternalDatabase = async (
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en la base de datos interna con los parámetros:`, params);

    // TAREA PENDIENTE CRÍTICA:
    // Aquí es donde debe ir la lógica para conectar y consultar tu base de datos.
    // Esta función será llamada por la estrategia de búsqueda en cascada.
    //
    // Ejemplo de cómo sería la lógica con una base de datos SQL:
    // 1. const dbConnection = await connectToDatabase();
    // 2. const query = "SELECT * FROM centros_sanitarios WHERE provincia = ? AND (nombre_centro LIKE ? OR nombre_via LIKE ?)";
    // 3. const results = await dbConnection.execute(query, [params.province, `%${params.nameKeyword}%`, `%${params.streetKeyword}%`]);
    // 4. return results.map(row => ({ officialName: row.nombre, officialAddress: row.direccion, ... }));

    // Como aún no tenemos la BD, devolvemos un array vacío como placeholder.
    return [];
};

// --- FUNCIONES DE IA Y ORQUESTACIÓN ---

/**
 * Función de enriquecimiento geográfico (MODIFICADA PARA SER MÁS ROBUSTA).
 * Si falla, no detiene la aplicación.
 */
export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    // ... (El código robusto de la respuesta anterior se mantiene aquí)
    try {
        // ... (lógica de la IA para obtener datos geo)
    } catch (error) {
        console.warn("ADVERTENCIA: El servicio de enriquecimiento geográfico falló. El proceso continuará sin estos datos.", error);
        return clients; // Devuelve los clientes sin enriquecer y continúa.
    }
};

/**
 * Usa la IA para extraer palabras clave limpias para la búsqueda.
 */
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

/**
 * Orquesta la estrategia de búsqueda inteligente contra la base de datos interna.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    let realMatches: PotentialMatch[] = [];
    let searchStrategyUsed = "No results found";

    // --- ESTRATEGIA DE BÚSQUEDA EN CASCADA ---

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

    // --- ANÁLISIS FINAL POR IA ---
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
        // Si la IA de análisis falla, devolvemos los resultados brutos para que el usuario decida.
        return realMatches;
    }
};
