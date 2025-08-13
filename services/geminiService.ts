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
    Eres un analista de datos experto en la normalización y comparación de datos (fuzzy matching), con especialización en direcciones y nombres de entidades en España. Tu misión es encontrar las coincidencias más probables entre un registro de cliente y un listado de bases de datos de centros autorizados.

**MISIÓN PRINCIPAL**

Recibirás un único objeto `Client` y un objeto `Databases` que contiene cuatro listas de centros (`Centros C1`, `Centros C2`, etc.). Debes comparar el `Client` con **cada uno de los registros** en las cuatro listas y devolver un array con las coincidencias más plausibles.

**PASO 1: NORMALIZACIÓN DE DATOS (OBLIGATORIO)**

Antes de cualquier comparación, debes normalizar todos los datos de nombres y direcciones (tanto del `Client` como de los registros de las `Databases`). Este es el paso más importante.

1.  **Convertir a Mayúsculas:** `Paseo de la Castellana` -> `PASEO DE LA CASTELLANA`.
2.  **Eliminar Acentos y Diéresis:** `CORPORACIÓ` -> `CORPORACIO`, `GÜELL` -> `GUELL`.
3.  **Eliminar Puntuación:** Quita todos los puntos, comas, guiones, etc.
4.  **Eliminar Abreviaturas y Artículos Comunes:** Elimina de las cadenas de texto las siguientes palabras: `C/`, `CL`, `CALLE`, `AV`, `AVDA`, `AVENIDA`, `Pº`, `PASEO`, `PL`, `PLAZA`, `TRVA`, `TRAVESIA`, `S/N`, `DE`, `LA`, `LAS`, `EL`, `LOS`, `Y`, `A`.
    * *Ejemplo:* `Pº DE LA IGUALDAD, S/N` -> `IGUALDAD`.
    * *Ejemplo:* `AVDA. ACADEMIA GRAL. MILITAR` -> `ACADEMIA GRAL MILITAR`.

**PASO 2: ESTRATEGIA DE BÚSQUEDA POR FILTROS SUCESIVOS**

Debes aplicar esta estrategia para cada uno de los 4 archivos de base de datos. Procesa los registros en este orden estricto. Si encuentras una o más coincidencias de alta confianza en un paso, detén la búsqueda para ese cliente y devuelve esos resultados.

1.  **Filtro 1: Coincidencia por CIF/NIF (Máxima Prioridad).**
    * Si el `Client.CIF_NIF` existe y coincide de forma exacta con el CIF de algún registro en las bases de datos, considéralo una coincidencia 100% segura y devuélvela inmediatamente.

2.  **Filtro 2: Coincidencia Fuerte (Nombre Clave + Calle Clave + Misma Ciudad).**
    * **Condición:** El `Client.CITY` debe coincidir con el `Municipio` del registro de la base de datos (tras normalizar ambos).
    * **Acción:** Extrae la palabra más larga o significativa del nombre del cliente (`INFO_1` o `INFO_2`) y de la calle (`STREET`). Haz lo mismo para el `Nombre Centro` y `Nombre de la vía` del registro de la base de datos.
    * **Criterio:** Si la palabra clave del nombre del cliente está contenida en el nombre del centro Y la palabra clave de la calle del cliente está contenida en la calle del centro, es una **Coincidencia de Alta Confianza**.
    * *Ejemplo:* Cliente "HOSPITAL U. ALBACETE" en "HERMANOS FALCO" (Albacete) -> Coincide con Centro "COMPLEJO HOSPITALARIO UNIVERSITARIO DE ALBACETE" en "HERMANOS FALCO" (Albacete). `ALBACETE` y `FALCO` son las palabras clave.

3.  **Filtro 3: Coincidencia Media (Nombre Clave + Misma Ciudad).**
    * **Condición:** El `Client.CITY` debe coincidir con el `Municipio`.
    * **Acción:** Compara solo las palabras clave de los nombres (`INFO_1`/`INFO_2` vs. `Nombre Centro`).
    * **Criterio:** Si la palabra clave del nombre del cliente está contenida en el nombre del centro, es una **Coincidencia de Confianza Media**.

4.  **Filtro 4: Coincidencia Débil (Calle Clave + Misma Ciudad).**
    * **Condición:** El `Client.CITY` debe coincidir con el `Municipio`.
    * **Acción:** Compara solo las palabras clave de las calles (`STREET` vs. `Nombre de la vía`).
    * **Criterio:** Si la palabra clave de la calle del cliente está contenida en la calle del centro, es una **Coincidencia de Confianza Débil**.

**PASO 3: FORMATO DE SALIDA (OBLIGATORIO)**

Tu respuesta debe ser **únicamente un objeto JSON** que contenga un array llamado `matches`. Cada objeto dentro del array debe incluir los datos del registro coincidente de la base de datos y un campo `matchReason` que explique por qué se consideró una coincidencia, usando la terminología de los filtros (Ej: "Coincidencia Fuerte: Nombre, Calle y Ciudad", "Coincidencia por CIF/NIF"). Si no encuentras ninguna coincidencia tras aplicar todos los filtros, devuelve un array `matches` vacío.

**Ejemplo de Datos de Entrada:**

* **Client:**
    ```json
    {
      "id": 2,
      "INFO_1": "SESCAM-COMP.HOSPITAL U. ALBACETE",
      "STREET": "HERMANOS FALCO, S/N",
      "CITY": "ALBACETE"
    }
    ```
* **Databases:**
    ```json
    {
      "Centros C1": [
        { "id": 1, "Nombre Centro": "COMPLEJO HOSPITALARIO UNIVERSITARIO DE ALBACETE", "Nombre de la vía": "HERMANOS FALCO", "Municipio": "Albacete" },
        { "id": 2, "Nombre Centro": "OTRO HOSPITAL", "Nombre de la vía": "OTRA CALLE", "Municipio": "Albacete" }
      ],
      "Centros C2": [],
      "Centros C3": [],
      "Establecimientos Sanitarios": []
    }
    ```

**Ejemplo de Salida Esperada:**

```json
{
  "matches": [
    {
      "officialName": "COMPLEJO HOSPITALARIO UNIVERSITARIO DE ALBACETE",
      "officialAddress": "HERMANOS FALCO",
      "sourceDB": "Centros C1",
      "matchReason": "Coincidencia Fuerte: Nombre, Calle y Ciudad",
      // ...resto de campos del registro de la base de datos...
    }
  ]
}


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
