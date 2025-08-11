import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- ESQUEMAS DE DATOS (SIN CAMBIOS) ---

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
            sourceDB: { type: Type.STRING, description: "The real database source ('REGCESS', 'AEMPS')." },
            evidenceUrl: { type: Type.STRING, description: "A real, direct URL to the evidence page or search result." },
            codigoAutonomico: { type: Type.STRING, description: "For 'REGCESS', the regional authorization code of the center." },
            fechaUltimaAutorizacion: { type: Type.STRING, description: "For 'REGCESS', the date of the last authorization (e.g., YYYY-MM-DD)." }
        },
        required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"]
    }
};


// --- SERVICIOS DE BÚSQUEDA REAL (NUEVO) ---
// Estas son las funciones que reemplazarán la simulación.
// Deben ser implementadas para conectar con las fuentes de datos reales.

/**
 * Busca en la base de datos de REGCESS (Ministerio de Sanidad).
 * Esta función debe ser implementada para realizar web scraping o conectar a una API si existiera.
 * @param client - El cliente a buscar.
 * @returns Una promesa con un array de resultados reales.
 */
const searchRegcess = async (client: Client): Promise<PotentialMatch[]> => {
    console.log(`Buscando en REGCESS para el cliente: ${client.INFO_1}`);
    // AQUÍ IRÍA LA LÓGICA DE BÚSQUEDA REAL EN REGCESS
    // Ejemplo:
    // 1. Construir la URL de búsqueda de REGCESS con los datos del cliente.
    // 2. Realizar una petición HTTP (fetch) a esa URL.
    // 3. Analizar el HTML de la respuesta para extraer los datos.
    // 4. Formatear cada resultado como un objeto PotentialMatch.
    // 5. Devolver el array de resultados.

    // De momento, devolvemos un array vacío como placeholder.
    return []; 
};

/**
 * Busca en la base de datos de AEMPS (Agencia Española de Medicamentos y Productos Sanitarios).
 * Esta función debe ser implementada para realizar web scraping.
 * @param client - El cliente a buscar.
 * @returns Una promesa con un array de resultados reales.
 */
const searchAemps = async (client: Client): Promise<PotentialMatch[]> => {
    console.log(`Buscando en AEMPS para el cliente: ${client.INFO_1}`);
    // AQUÍ IRÍA LA LÓGICA DE BÚSQUEDA REAL EN AEMPS
    // (Mismo proceso que para REGCESS)
    
    // De momento, devolvemos un array vacío como placeholder.
    return [];
};


// --- FUNCIONES EXPUESTAS (MODIFICADAS Y SIN CAMBIOS) ---

/**
 * Enriquece los clientes con datos geográficos (PROVINCIA y CCAA).
 * (Esta función no cambia, sigue siendo útil).
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


/**
 * MODIFICADO: Busca coincidencias potenciales utilizando fuentes de datos reales
 * y usa la IA solo para analizar y comparar los resultados obtenidos.
 */
export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];

    // PASO 1: Realizar búsquedas en las fuentes de datos reales.
    // Se podrían añadir más condiciones para buscar en una u otra fuente según el tipo de cliente.
    const regcessResults = await searchRegcess(client);
    const aempsResults = await searchAemps(client);
    const realMatches = [...regcessResults, ...aempsResults];

    // PASO 2: Si la búsqueda real no devuelve NINGÚN resultado, terminamos.
    // La interfaz mostrará "No Matches Found". Esto cumple el requisito de veracidad.
    if (realMatches.length === 0) {
        return [];
    }

    // PASO 3: Si hay resultados, usamos la IA para que los analice y filtre.
    // El rol de la IA cambia: de "simulador" a "asistente de análisis".
    const prompt = `
        You are a highly accurate data analysis assistant for pharmaceutical regulatory compliance.
        Your task is to compare a client's data with a list of REAL potential matches obtained from official Spanish databases (REGCESS, AEMPS).
        
        1.  Carefully analyze the client's information (Name/Info, Address, CIF).
        2.  Compare it against each of the "Real Matches Found".
        3.  Identify which of the real matches are the most likely candidates for the client. A good match should have significant similarities in name and location.
        4.  Return ONLY a JSON array containing the best-fitting matches from the provided list.
        5.  **Crucially: If none of the provided real matches seem to be a plausible match for the client, you MUST return an empty JSON array.** Do not guess or include low-confidence matches.

        Client Data to Validate:
        ${JSON.stringify(client)}

        Real Matches Found (from official sources):
        ${JSON.stringify(realMatches)}

        Return ONLY the filtered JSON array of plausible matches.
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Puedes considerar un modelo más potente si la precisión es crítica
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: potentialMatchesSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error(`Error comparing real matches with Gemini:`, error);
        throw new Error(`The AI service failed to analyze the search results.`);
    }
};
