// netlify/functions/fetch-external-data.ts
import type { Handler } from '@netlify/functions';

// Usa el fetch nativo (Node 18+ en Netlify). No hace falta node-fetch.
const EXCEL_URLS = {
  centros_c1:        'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C1',
  centros_c2:        'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C2',
  centros_c3:        'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C3',
  establecimientos_e: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=E',
};

const defaultHeaders = {
  'User-Agent': 'Mozilla/5.0',
  'Accept': '*/*',
};

const fetchWithTimeout = async (url: string, ms = 20000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: defaultHeaders,
      redirect: 'follow',
      // @ts-expect-error: types de Netlify pueden no incluirlo; Node 18 lo soporta
      signal: ctrl.signal,
    });
    return r;
  } finally {
    clearTimeout(t);
  }
};

export const handler: Handler = async () => {
  try {
    const keys = Object.keys(EXCEL_URLS) as (keyof typeof EXCEL_URLS)[];
    const responses = await Promise.all(keys.map(k => fetchWithTimeout(EXCEL_URLS[k])));

    // recopila errores con detalle (status, url)
    const errores = responses
      .map((r, i) => ({ ok: r.ok, status: r.status, key: keys[i], url: EXCEL_URLS[keys[i]] }))
      .filter(x => !x.ok);

    if (errores.length) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Fallo al obtener uno o más ficheros', detalles: errores }, null, 2),
      };
    }

    const buffers = await Promise.all(responses.map(r => r.arrayBuffer()));
    const toB64 = (ab: ArrayBuffer) => Buffer.from(ab).toString('base64');

    const base64Data = {
      centros_c1:         toB64(buffers[0]),
      centros_c2:         toB64(buffers[1]),
      centros_c3:         toB64(buffers[2]),
      establecimientos_e: toB64(buffers[3]),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800'
      },
      body: JSON.stringify(base64Data),
    };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e?.message || 'Error interno en fetch-external-data' }),
    };
  }
};
