import { Handler } from '@netlify/functions';

// Método de importación más compatible para entornos de servidor.
const fetch = (...args: any[]) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const EXCEL_URLS = {
    centros: 'https://regcess.mscbs.es/regcessWeb/do/descargarCentros.xls',
    consultas: 'https://regcess.mscbs.es/regcessWeb/do/descargarConsultas.xls',
    depositos: 'https://regcess.mscbs.es/regcessWeb/do/descargarDepositos.xls',
    psicotropos: 'https://regcess.mscbs.es/regcessWeb/do/descargarPsicotropos.xls'
};

const handler: Handler = async (event, context) => {
    try {
        const responses = await Promise.all(
            Object.values(EXCEL_URLS).map(url => fetch(url))
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

