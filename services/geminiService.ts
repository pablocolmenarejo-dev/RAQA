// En: services/geminiService.ts

import { GoogleGenAI, Type } from "@google/genai";
import { Client, PotentialMatch } from '../types';

// ... (El resto de tus imports y la configuración de la API se mantienen)

// El esquema de 'potentialMatches' que ya tenías sigue siendo válido.
const potentialMatchesSchema = { /* ... tu esquema actual ... */ };

// --- NUEVA LÓGICA DE LA FUNCIÓN ---

export const findPotentialMatches = async (
    client: Client,
    databases: any // Este objeto contendrá los 4 arrays de datos: centros, consultas, etc.
): Promise<PotentialMatch[]> => {
    if (!client) return [];

    // 1. Construir el prompt dinámicamente
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

    // 2. Realizar la llamada a la API
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // O el modelo que prefieras
            contents: analysisPrompt,
            config: {
                responseMimeType: "application/json",
                // Asumiendo que tienes un esquema para un objeto que contiene un array de matches
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        matches: potentialMatchesSchema
                    },
                    required: ["matches"]
                }
            }
        });

        // Parsear y devolver el resultado
        const result = JSON.parse(response.text);
        return result.matches || [];

    } catch (error) {
        console.error(`Error procesando las coincidencias con Gemini:`, error);
        // En caso de error, puedes devolver el array vacío o manejarlo como prefieras
        return [];
    }
};

// La función 'enrichClientsWithGeoData' puede permanecer igual.
