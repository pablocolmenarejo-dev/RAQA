import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch } from '../types';

// Asegúrate de que tu clave de API esté configurada correctamente en las variables de entorno
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { throw new Error("GEMINI_API_KEY environment variable not set"); }

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS PARA LA RESPUESTA DE LA IA ---

// Esquema para el enriquecimiento geográfico
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

// Esquema para las coincidencias potenciales (debe coincidir con tu tipo PotentialMatch)
const potentialMatchesSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            officialName: { type: Type.STRING },
            officialAddress: { type: Type.STRING },
            cif: { type: Type.STRING },
            serviceType: { type: Type.STRING },
            authDate: { type: Type.STRING },
            gdpStatus: { type: Type.STRING },
            sourceDB: { type: Type.STRING },
            evidenceUrl: { type: Type.STRING },
            codigoAutonomico: { type: Type.STRING },
            fechaUltimaAutorizacion: { type: Type.STRING }
        },
        required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"]
    }
};


// --- FUNCIONES EXPORTADAS ---

/**
 * Enriquece una lista de clientes con datos geográficos (Provincia y CCAA) usando la IA.
 * Esta función se mantiene como estaba para seguir preparando los datos del cliente.
 */
export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
    if (!clients || clients.length === 0) return [];
    try {
        const cityData = clients.map(c => ({ id: c.id, city: c.CITY }));
        const prompt = `You are a Spanish geography expert. Given a JSON list of Spanish cities, provide their corresponding province (PROVINCIA) and autonomous community (CCAA). Cities to process: ${JSON.stringify(cityData)}`;
        
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
        
        return clients.map(client => ({ ...client, ...(enrichmentMap.get(client.id) || {}) }));

    } catch (error) {
        console.warn("ADVERTENCIA: El servicio de enriquecimiento geográfico falló. El proceso continuará sin estos datos.", error);
        // Devuelve los clientes sin enriquecer para que la app no se detenga.
        return clients;
    }
};


/**
 * Busca coincidencias potenciales para un cliente dado dentro de las bases de datos externas.
 * Esta es la nueva función que utiliza el prompt detallado.
 */
export const findPotentialMatches = async (
    client: Client,
    databases: any // Objeto con los 4 arrays: centros, consultas, etc.
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    const analysisPrompt = `
        Eres un asistente experto en análisis de datos y validación, especializado en el cumplimiento normativo (GDP) para la industria farmacéutica en España. Tu tarea es procesar un único cliente y compararlo con los datos extraídos de cuatro bases de datos oficiales del gobierno español, que te serán proporcionados en formato JSON.

        **Contexto de la Tarea:**
        Recibirás un objeto 'Client' y un objeto 'Databases' con cuatro arrays: 'centros', 'consultas', 'depositos' y 'psicotropos'.

        **Misión:**
        Encuentra y devuelve una lista de "coincidencias potenciales" ('PotentialMatch') para el cliente, buscando metódicamente en los cuatro conjuntos de datos. Si no encuentras ninguna, devuelve un array vacío.

        **Cliente a procesar:**
        ${JSON.stringify(client)}

        **Bases de datos para la búsqueda:**
        ${JSON.stringify(databases)}

        **Estrategia de Búsqueda por Pasos:**
        1.  **Paso 1: Búsqueda por Identificador Único (CIF/NIF).**
        2.  **Paso 2: Búsqueda por Coincidencia Fuerte (Palabra Clave de Dirección + Palabra Clave de Nombre).**
        3.  **Paso 3: Búsqueda por Coincidencia Media (Palabra Clave de Dirección).**
        4.  **Paso 4: Búsqueda por Coincidencia Débil (Palabra Clave de Nombre).**
        5.  **Paso 5: Búsqueda Amplia (Ciudad).**

        **Análisis y Filtrado Final:**
        Analiza la plausibilidad antes de devolver resultados. Descarta coincidencias claramente incorrectas.

        **Formato de Salida Obligatorio:**
        Tu respuesta DEBE ser un objeto JSON que se ajuste al esquema, conteniendo un array de objetos 'PotentialMatch'. NO incluyas texto adicional fuera del JSON. Si no hay coincidencias, devuelve: {"matches": []}.
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
        return result.matches || [];

    } catch (error) {
        console.error(`Error procesando las coincidencias con Gemini:`, error);
        return [];
    }
};
