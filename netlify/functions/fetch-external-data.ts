import { Handler } from '@netlify/functions';
// Si ya lo tienes, deja igual:
const fetch = require('node-fetch');

const EXCEL_URLS = {
  centros_c1: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C1',
  centros_c2: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C2',
  centros_c3: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C3',
  establecimientos_e: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=E'
};

// Opcional: cabeceras “de navegador” por si el origen las exige
const fetchOptions = {
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Accept': '*/*'
  },
  method: 'GET'
};

export const handler: Handler = async () => {
  try {
    // Descargamos en paralelo, servidor→servidor (sin CORS de navegador)
    const keys = Object.keys(EXCEL_URLS) as (keyof typeof EXCEL_URLS)[];
    const responses = await Promise.all(keys.map(k => fetch(EXCEL_URLS[k], fetchOptions)));

    // Si alguna falló, devolvemos cuál
    const bad = responses
      .map((r, i) => ({ ok: r.ok, status: r.status, key: keys[i], url: EXCEL_URLS[keys[i]] }))
      .filter(x => !x.ok);
    if (bad.length) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: 'Fallo al obtener algunos ficheros', detalles: bad }, null, 2)
      };
    }

    const buffers = await Promise.all(responses.map(r => r.arrayBuffer()));
    const toB64 = (ab: ArrayBuffer) => Buffer.from(ab).toString('base64');

    const base64Data = {
      centros_c1:       toB64(buffers[0]),
      centros_c2:       toB64(buffers[1]),
      centros_c3:       toB64(buffers[2]),
      establecimientos_e: toB64(buffers[3]),
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=1800' },
      body: JSON.stringify(base64Data)
    };
  } catch (error: any) {
    console.error('Error en fetch-external-data:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || 'Error interno' }) };
  }
};
