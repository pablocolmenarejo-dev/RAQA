import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS COMPLETOS ---
const geoEnrichmentSchema = { type: Type.OBJECT, properties: { enrichedClients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.INTEGER }, PROVINCIA: { type: Type.STRING }, CCAA: { type: Type.STRING } }, required: ["id", "PROVINCIA", "CCAA"] } } }, required: ["enrichedClients"] };
const potentialMatchesSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { officialName: { type: Type.STRING }, officialAddress: { type: Type.STRING }, cif: { type: Type.STRING }, serviceType: { type: Type.STRING }, authDate: { type: Type.STRING }, gdpStatus: { type: Type.STRING }, sourceDB: { type: Type.STRING }, evidenceUrl: { type: Type.STRING }, codigoAutonomico: { type: Type.STRING }, fechaUltimaAutorizacion: { type: Type.STRING } }, required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"] } };
const keywordSchema = { type: Type.OBJECT, properties: { nameKeyword: { type: Type.STRING }, streetKeyword: { type: Type.STRING } }, required: ["nameKeyword", "streetKeyword"] };

// --- SERVICIO DE BÚSQUEDA (PLACEHOLDER) ---
const searchOnInternalDatabase = async (
    params: { cif?: string; nameKeyword?: string; streetKeyword?: string; city?: string; province?: string; }
): Promise<PotentialMatch[]> => {
    console.log(`Buscando en la BD interna con:`, params);
    // TAREA PENDIENTE: Implementar la búsqueda en la base de datos interna.
    return [];
};

// --- FUNCIONES AUXILIARES ---

// Función mecánica para limpiar y obtener la palabra más larga de un texto.
const getMechanicalKeyword = (text: string): string => {
    if (!text) return '';
    const cleanedText = text
        .toUpperCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Quitar puntuación
        .replace(/\b(C\/|CALLE|Pª|PASEO|AV|AVDA|AVENIDA|PL|PLAZA)\b/g, '') // Quitar prefijos comunes
        .trim();
    
    const words = cleanedText.split(/\s+/);
    // Devolver la palabra más larga, que suele ser la más significativa
    return words.sort((a, b) => b.length - a.length)[0] || '';
};

// --- FUNCIONES DE IA Y ORQUESTACIÓN ---

export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    // ... (sin cambios, se mantiene la versión robusta)
};

const extractKeywordsWithAI = async (client: Client): Promise<{ nameKeyword: string; streetKeyword: string }> => {
    // ... (sin cambios)
};

/**
 * Orquesta la ESTRATEGIA DE BÚSQUEDA MEJORADA EN CASCADA.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    let realMatches: PotentialMatch[] = [];
    let searchStrategyUsed = "No results found";

    // --- ESTRATEGIA DE BÚSQUEDA EN CASCADA MEJORADA ---

    // Intento 1: Búsqueda por CIF (sin cambios)
    if (client.CIF_NIF) {
        searchStrategyUsed = `CIF: ${client.CIF_NIF}`;
        realMatches = await searchOnInternalDatabase({ cif: client.CIF_NIF });
    }

    // Intento 2: Búsqueda por Palabras Clave de la IA (sin cambios)
    if (realMatches.length === 0) {
        const keywords = await extractKeywordsWithAI(client);
        if (keywords.nameKeyword || keywords.streetKeyword) {
            searchStrategyUsed = `AI Keywords: '${keywords.nameKeyword}', '${keywords.streetKeyword}'`;
            realMatches = await searchOnInternalDatabase({
                nameKeyword: keywords.nameKeyword,
                streetKeyword: keywords.streetKeyword,
                city: client.CITY,
                province: client.PROVINCIA
            });
        }
    }
    
    // Intento 3 (NUEVO): Búsqueda por Palabra Clave de la Calle (Mecánico)
    if (realMatches.length === 0 && client.STREET) {
        const streetKeyword = getMechanicalKeyword(client.STREET);
        searchStrategyUsed = `Mechanical Street Keyword: '${streetKeyword}'`;
        realMatches = await searchOnInternalDatabase({ streetKeyword: streetKeyword, province: client.PROVINCIA });
    }

    // Intento 4 (NUEVO): Búsqueda por Palabra Clave del Nombre (Mecánico)
     if (realMatches.length === 0 && client.INFO_1) {
        const nameKeyword = getMechanicalKeyword(client.INFO_1);
        searchStrategyUsed = `Mechanical Name Keyword: '${nameKeyword}'`;
        realMatches = await searchOnInternalDatabase({ nameKeyword: nameKeyword, province: client.PROVINCIA });
    }

    // Intento 5: Búsqueda Amplia por Ciudad (sin cambios)
    if (realMatches.length === 0) {
        searchStrategyUsed = `Broad search in city: ${client.CITY}`;
        realMatches = await searchOnInternalDatabase({ city: client.CITY, province: client.PROVINCIA });
    }

    // --- ANÁLISIS FINAL ---
    if (realMatches.length === 0) return [];

    const analysisPrompt = `
        You are a data analysis assistant. Compare client data with REAL matches found in our database. Return only plausible matches.
        Search strategy used: "${searchStrategyUsed}".
        Client: ${JSON.stringify(client)}
        Matches Found: ${JSON.stringify(realMatches)}
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
        return realMatches; // Devolver resultados brutos si el análisis falla
    }
};
