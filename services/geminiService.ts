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

// --- SERVICIO DE BÚSQUEDA EN BASE DE DATOS INTERNA (NUEVO ENFOQUE) ---

/**
 * Esta función ahora busca en tu base de datos interna, que contiene los datos de REGCESS y AEMPS.
 * @param params - Objeto con los parámetros de búsqueda (cif, palabras clave, etc.).
 * @returns Una promesa con un array de resultados de la base de datos.
 */
const searchOnInternalDatabase = async (
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en la base de datos interna con los parámetros:`, params);
    
    // AQUÍ IRÍA LA LÓGICA DE CONEXIÓN Y CONSULTA A TU BASE DE DATOS
    // Esto es ahora una consulta SQL o NoSQL, no web scraping.
    // Ejemplo de cómo sería la lógica:
    // 1. Conectar a la base de datos.
    // 2. Construir una consulta (query) usando los parámetros.
    //    Ejemplo SQL: "SELECT * FROM centros WHERE provincia = ? AND (nombre LIKE ? OR calle LIKE ?)"
    // 3. Ejecutar la consulta.
    // 4. Mapear los resultados de la base de datos al formato de objeto `PotentialMatch`.
    // 5. Devolver el array de resultados.

    // Por ahora, devolvemos un array vacío como placeholder.
    // Cuando la base de datos esté implementada, esta función devolverá datos reales.
    return [];
};


// --- FUNCIONES DE IA (SIN CAMBIOS RESPECTO A LA VERSIÓN ANTERIOR) ---

/**
 * Usa la IA para extraer palabras clave de los datos brutos del cliente.
 */
const extractKeywordsWithAI = async (client: Client): Promise<{ nameKeyword: string; streetKeyword: string }> => {
    // Esta función no cambia, sigue siendo útil para preparar los términos de búsqueda.
    // ... (código de la función sin cambios)
};

// --- ORQUESTADOR PRINCIPAL (MODIFICADO PARA USAR LA BÚSQUEDA EN BD) ---

/**
 * MODIFICADO: Orquesta la estrategia de búsqueda inteligente contra la base de datos interna.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    let realMatches: PotentialMatch[] = [];
    let searchStrategyUsed = "No results found";

    // --- ESTRATEGIA DE BÚSQUEDA EN CASCADA ---

    // Intento 1: Búsqueda por CIF (la más fiable)
    if (client.CIF_NIF) {
        searchStrategyUsed = `CIF: ${client.CIF_NIF}`;
        realMatches = await searchOnInternalDatabase({ cif: client.CIF_NIF });
    }

    // Intento 2: Búsqueda por palabras clave (si el intento 1 falló)
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
    
    // Si después de todos los intentos no hay resultados, devolvemos array vacío.
    if (realMatches.length === 0) {
        return [];
    }

    // --- ANÁLISIS FINAL POR IA ---
    // (Esta parte no cambia, sigue siendo igual de útil)
    const analysisPrompt = `
        You are a highly accurate data analysis assistant for pharmaceutical regulatory compliance.
        Your task is to compare a client's data with a list of REAL potential matches obtained from an internal database.
        The search strategy that found these results was: "${searchStrategyUsed}". Use this context to inform your analysis.
        ...
    `;
    
    try {
        const response = await ai.models.generateContent({ /* ... */ });
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
};
