import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch } from '../types';
import { normalizeText, getKeyword } from '../utils/dataNormalizer'; // <-- IMPORTAMOS LA NUEVA AYUDA

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { throw new Error("GEMINI_API_KEY environment variable not set"); }

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS (sin cambios) ---
const geoEnrichmentSchema = { /* ... tu esquema ... */ };
const potentialMatchesSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            officialName: { type: Type.STRING },
            officialAddress: { type: Type.STRING },
            cif: { type: Type.STRING },
            sourceDB: { type: Type.STRING },
            matchReason: { type: Type.STRING },
            // Añadimos el objeto original completo para tener todos los datos
            originalRecord: { type: Type.OBJECT }
        },
        required: ["officialName", "officialAddress", "sourceDB", "matchReason", "originalRecord"]
    }
};

// --- FUNCIONES EXPORTADAS ---

export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    // Esta función no necesita cambios
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
 * Busca coincidencias usando la nueva estrategia híbrida.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: any
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    // **PASO 1: NORMALIZAMOS LOS DATOS DEL CLIENTE CON CÓDIGO**
    const normalizedClient = {
        city: normalizeText(client.CITY),
        name: normalizeText(client.INFO_1 || '' + ' ' + (client.INFO_2 || '')),
        street: normalizeText(client.STREET),
        cif: client.CIF_NIF || ''
    };

    // **PASO 2: CREAMOS UN PROMPT MÁS SIMPLE Y DIRECTO**
    const analysisPrompt = `
    Eres un experto en encontrar coincidencias en datos. Te proporcionaré un cliente con sus datos ya limpios y normalizados, y varias bases de datos. Tu única tarea es encontrar el mejor registro coincidente en las bases de datos.

    **INSTRUCCIONES DE BÚSQUEDA:**
    1.  **Prioridad 1 (CIF/NIF):** Si el CIF del cliente coincide con algún registro, esa es la mejor coincidencia.
    2.  **Prioridad 2 (Nombre + Dirección):** Si no hay coincidencia por CIF, busca el registro cuyo nombre y dirección se parezcan más a los del cliente, SIEMPRE Y CUANDO estén en la misma ciudad. La similitud no tiene que ser exacta. "HOSPITAL U ALBACETE" es similar a "COMPLEJO HOSPITALARIO UNIVERSITARIO ALBACETE".
    3.  **No seas demasiado estricto.** Busca la conexión más lógica y probable.

    **Cliente (Datos Normalizados):**
    ${JSON.stringify(normalizedClient)}

    **Bases de Datos (Datos sin procesar):**
    ${JSON.stringify(databases)}

    **FORMATO DE SALIDA OBLIGATORIO:**
    Devuelve SÓLO un objeto JSON con un array llamado "matches".
    - Si encuentras una buena coincidencia, el array debe contener un único objeto.
    - Si encuentras varias coincidencias muy buenas, devuélvelas todas.
    - Si no encuentras ninguna coincidencia clara, devuelve el array vacío.
    - El objeto de la coincidencia debe incluir el campo "originalRecord" con el registro completo de la base de datos.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        matches: potentialMatchesSchema
                    },
                    required: ["matches"]
                }
            }
        });

        const result = JSON.parse(response.text);
        
        // Mapeamos el resultado para que se ajuste a la estructura que espera la app
        return result.matches.map((match: any) => ({
            officialName: match.officialName,
            officialAddress: match.officialAddress,
            cif: match.cif,
            sourceDB: match.sourceDB,
            reason: match.matchReason, // La razón ahora viene de la IA
            evidenceUrl: 'https://regcess.mscbs.es/regcessWeb/inicioDescargarCentrosAction.do',
            // Añadimos el resto de datos desde el registro original para mostrarlos
            ...match.originalRecord 
        })) || [];

    } catch (error) {
        console.error(`Error procesando las coincidencias con Gemini:`, error);
        return [];
    }
};
