
import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch, SearchMethod } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

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
            sourceDB: { type: Type.STRING, description: "The simulated database source (e.g., 'REGCESS', 'AEMPS')." },
            evidenceUrl: { type: Type.STRING, description: "A simulated URL to the evidence page." }
        },
        required: ["officialName", "officialAddress", "sourceDB", "evidenceUrl"]
    }
};

export const enrichClientsWithGeoData = async (clients: Client[]): Promise<Client[]> => {
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

const getSearchPrompt = (client: Client, method: SearchMethod): string => {
    let searchCriteria = '';
    let instructions = '';

    switch (method) {
        case 'cif':
            searchCriteria = `CIF/NIF: "${client.CIF_NIF}"`;
            instructions = 'This is the most precise search. Find an exact match for this CIF/NIF.';
            break;
        case 'street_keyword':
            searchCriteria = `Street Keyword: "${client.STREET}", Location: "${client.CITY}, ${client.PROVINCIA}, ${client.CCAA}"`;
            instructions = 'Search using the street keyword within the specified location. The name might not match exactly.';
            break;
        case 'name_keyword':
            searchCriteria = `Name/Info Keyword: "${client.INFO_1}", Location: "${client.CITY}, ${client.PROVINCIA}, ${client.CCAA}"`;
            instructions = 'Search using the client name/info keyword within the specified location. The address might not match exactly.';
            break;
        case 'city_broad':
            searchCriteria = `City: "${client.CITY}", Province: "${client.PROVINCIA}", CCAA: "${client.CCAA}"`;
            instructions = 'Perform a broad search for all centers/distributors in the given city. Then, internally filter the results to find the best potential matches based on the client\'s other info fields.';
            break;
    }

    return `
        You are a search engine for Spanish pharmaceutical databases (REGCESS for health centers, AEMPS for distributors).
        You will receive a client's data and a search method. Simulate a search and return a JSON array of 0 to 3 potential matches, adhering to the schema.
        
        Search Method: ${method}
        Instructions: ${instructions}

        Client Data to Search for:
        ${JSON.stringify(client)}

        Simulate the search and return ONLY the JSON array of matches.
    `;
};


export const findPotentialMatches = async (client: Client, method: SearchMethod): Promise<PotentialMatch[]> => {
    if (!client) return [];
    
    const prompt = getSearchPrompt(client, method);
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: potentialMatchesSchema,
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error(`Error finding matches with Gemini (method: ${method}):`, error);
        throw new Error(`The AI service failed to search for client matches.`);
    }
};
