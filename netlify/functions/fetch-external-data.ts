import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

// URLs actualizadas con los enlaces de descarga directos.
const EXCEL_URLS = {
    centros: 'https://regcess.mscbs.es/regcessWeb/do/descargarCentros.xls',
    consultas: 'https://regcess.mscbs.es/regcessWeb/do/descargarConsultas.xls',
    depositos: 'https://regcess.mscbs.es/regcessWeb/do/descargarDepositos.xls',
    psicotropos: 'https://regcess.mscbs.es/regcessWeb/do/descargarPsicotropos.xls'
};

const handler: Handler = async (event, context) => {
    try {
        // Descargar todos los archivos en paralelo
        const responses = await Promise.all([
            fetch(EXCEL_URLS.centros),
            fetch(EXCEL_URLS.consultas),
            fetch(EXCEL_URLS.depositos),
            fetch(EXCEL_URLS.psicotropos)
        ]);

        // Verificar que todas las respuestas son correctas
        for (const res of responses) {
            if (!res.ok) {
                throw new Error(`Failed to fetch ${res.url}: ${res.statusText}`);
            }
        }

        // Convertir las respuestas a ArrayBuffer (datos binarios)
        const buffers = await Promise.all(responses.map(res => res.arrayBuffer()));

        // Convertir los datos binarios a Base64 para poder enviarlos como JSON
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
        console.error("Error en la función serverless:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Fallo al obtener los archivos externos.' }),
        };
    }
};

export { handler };
