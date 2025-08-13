import { Handler } from '@netlify/functions';

// Usamos 'require' para asegurar la máxima compatibilidad en el entorno de Netlify.
const fetch = require('node-fetch');

const EXCEL_URLS = {
    centros: 'https://regcess.mscbs.es/regcessWeb/do/descargarCentros.xls',
    consultas: 'https://regcess.mscbs.es/regcessWeb/do/descargarConsultas.xls',
    depositos: 'https://regcess.mscbs.es/regcessWeb/do/descargarDepositos.xls',
    psicotropos: 'https://regcess.mscbs.es/regcessWeb/do/descargarPsicotropos.xls'
};

// Opciones para la petición, simulando un navegador para evitar bloqueos.
const fetchOptions = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
};

const handler: Handler = async (event, context) => {
    try {
        const responses = await Promise.all(
            Object.values(EXCEL_URLS).map(url => fetch(url, fetchOptions))
        );

        for (const res of responses) {
            if (!res.ok) {
                console.error(`Fallo al obtener ${res.url}: ${res.statusText}`);
                throw new Error(`No se pudo descargar uno de los archivos de validación.`);
            }
        }

        const buffers = await Promise.all(responses.map(res => res.arrayBuffer()));

        const base64Data = {
            centros: Buffer.from(buffers[0]).toString('base64'),
            consultas: Buffer.from(buffers[1]).toString('base64'),
            depositos: Buffer.from(buffers[2]).toString('base64'),
            psicotropos: Buffer.from(buffers[3]).toString('base64')
        };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(base64Data),
        };

    } catch (error) {
        console.error("Error en la función serverless fetch-external-data:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message || 'Fallo al obtener los archivos externos.' }),
        };
    }
};

export { handler };
