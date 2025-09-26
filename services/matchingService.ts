// services/matchingService.ts
// Metodología determinista de matching (multi-Excel) – sin IA

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type PruebaRow = Record<string, any>;
export type MinisterioRow = Record<string, any>;

export interface MatchRecord {
  // PRUEBA
  PRUEBA_customer?: string | null;
  PRUEBA_nombre: string;
  PRUEBA_street: string;
  PRUEBA_city: string;
  PRUEBA_cp: string | null;
  PRUEBA_num: string | null;

  // MINISTERIO (mejor candidato)
  MIN_nombre: string | null;
  MIN_via: string | null;
  MIN_num: string | null;
  MIN_municipio: string | null;
  MIN_cp: string | null;

  // Claves y fuente (C, Y, AC + nombre del excel)
  MIN_codigo_centro: string | null;
  MIN_fecha_autoriz: string | null;
  MIN_oferta_asist: string | null;
  MIN_source: string | null;

  // Scoring & Tier
  SCORE: number;
  TIER: "ALTA" | "REVISAR" | "SIN";
}

export interface TopCandidate {
  PRUEBA_nombre: string;
  PRUEBA_cp: string | null;
  PRUEBA_num: string | null;

  CAND_RANK: number;
  CAND_SCORE: number;

  CAND_MIN_nombre: string | null;
  CAND_MIN_via: string | null;
  CAND_MIN_num: string | null;
  CAND_MIN_mun: string | null;
  CAND_MIN_cp: string | null;

  CAND_MIN_codigo_centro: string | null;
  CAND_MIN_fecha_autoriz: string | null;
  CAND_MIN_oferta_asist: string | null;
  CAND_MIN_source: string | null;
}

export interface MatchOutput {
  matches: MatchRecord[];
  top3: TopCandidate[];
  summary: {
    n_prueba: number;
    alta: number;
    revisar: number;
    sin: number;
    thresholds: { alta: number; baja: number };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Parámetros de scoring (idénticos a los del script Python)
// ─────────────────────────────────────────────────────────────────────────────

const THRESHOLD_ALTA = 0.85;
const THRESHOLD_BAJA = 0.65;

const BONUS_CP = 0.35;
const BONUS_NUM = 0.25;
const BONUS_MUN = 0.10;

const W_NAME = 0.50;
const W_STREET = 0.35;

// Stopwords/abreviaturas/tipos de vía
const STOPWORDS = new Set([
  "de", "del", "la", "el", "los", "las", "y", "en", "a",
  "un", "una", "unos", "unas", "por", "para", "al", "lo", "da", "do"
]);

const ABREVIATURAS: Array<[RegExp, string]> = [
  [/\bhosp\.\b/g, "hospital"],
  [/\bsto\b/g, "santo"], [/\bsta\b/g, "santa"], [/\bs\.\b/g, "san"],
  [/\bcor\.\b/g, "corazon"],
  [/\bav\.\b/g, "avenida"], [/\bavda\b/g, "avenida"], [/\bavd\b/g, "avenida"],
  [/\bc\/\b/g, "calle"], [/\bcl\.\b/g, "calle"],
  [/\bpº\b/g, "paseo"], [/\bps\.\b/g, "paseo"], [/\bpso\b/g, "paseo"],
  [/\bctra\b/g, "carretera"], [/\bptda\b/g, "partida"], [/\burg\.\b/g, "urbanizacion"],
];

const VIA_TIPOS = new Set([
  "calle","carrer","avenida","av","avda","paseo","pso","ps",
  "plaza","carretera","ctra","partida","ptda","camino","cno",
  "travesia","tv","ronda"
]);

// ─────────────────────────────────────────────────────────────────────────────
// Utilidades de normalización y similitud
// ─────────────────────────────────────────────────────────────────────────────

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(s: any): string {
  if (typeof s !== "string") return "";
  let t = stripAccents(s.toLowerCase());
  for (const [re, rep] of ABREVIATURAS) t = t.replace(re, rep);
  t = t.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

function tokens(s: string): string[] {
  const t = normalizeText(s);
  if (!t) return [];
  return t
    .split(/[^0-9a-zñ]+/i)
    .filter(x => x && (!STOPWORDS.has(x) || /^\d+$/.test(x)));
}

function streetCore(s: string): string {
  return tokens(s).filter(x => !VIA_TIPOS.has(x)).join(" ");
}

function extractNumVia(s: string): string | null {
  const t = normalizeText(s);
  let m = t.match(/(?:^|\s|,)(\d{1,4})(?:\s*[a-z]?)$/);
  if (m) return m[1];
  m = t.match(/(?:nº|no|num|numero)\s*(\d{1,4})/);
  return m ? m[1] : null;
}

// Similitud “token_set_ratio”/“partial_ratio” simplificadas en TS

function jaccardSet(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function tokenSetRatio(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  return jaccardSet(A, B);
}

// “partial” simple: ratio de la subsecuencia común más larga / tamaño mayor
function lcsLength(a: string, b: string): number {
  const s = normalizeText(a), t = normalizeText(b);
  const n = s.length, m = t.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = s[i - 1] === t[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[n][m];
}

function partialRatio(a: string, b: string): number {
  const lcs = lcsLength(a, b);
  const denom = Math.max(normalizeText(a).length, normalizeText(b).length) || 1;
  return lcs / denom;
}

function fuzzyRatio(a: string, b: string): number {
  return Math.max(tokenSetRatio(a, b), partialRatio(a, b));
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de acceso a campos (robusto a nombres distintos de columnas)
// ─────────────────────────────────────────────────────────────────────────────

function pick(obj: Record<string, any>, keys: string[]): any {
  for (const k of keys) {
    if (k in obj && obj[k] != null) return obj[k];
  }
  return null;
}

// PRUEBA: nombres esperados
const P_KEYS = {
  nombre: ["INFO_1", "Nombre", "name", "INFO1"],
  nombre2: ["INFO_2", "INFO2"],
  nombre3: ["INFO_3", "INFO3"],
  street: ["STREET", "Direccion", "Dirección", "Calle", "Address"],
  city: ["CITY", "Municipio", "Localidad", "Poblacion", "Población"],
  cp: ["PostalCode", "CP", "Codigo Postal", "Código Postal", "Zip"],
  customer: ["Customer", "Cliente", "IdCliente"]
};

// MINISTERIO: por las cabeceras que has mostrado
const M_KEYS = {
  nombre: ["Nombre Centro", "Nombre", "Denominacion", "Denominación"],
  via: ["Nombre de la vía", "Via", "Vía", "Calle", "Direccion", "Dirección"],
  num: ["Número Vía", "Numero Via", "Nº", "Número"],
  mun: ["Municipio", "Localidad", "Poblacion", "Población"],
  cp: ["Código Postal", "Codigo Postal", "CP"],
  codigoCentro: ["Código de Centro Normalizado REGCESS (CCN)", "Codigo Centro", "Código Centro"],
  fechaAut: ["Fecha de la última autorización", "Fecha última autorización"],
  oferta: ["Oferta Asistencial", "Oferta asistencial"]
};

// ─────────────────────────────────────────────────────────────────────────────
// Preparación de datos
// ─────────────────────────────────────────────────────────────────────────────

function preparePruebaRow(r: PruebaRow) {
  const nom1 = pick(r, P_KEYS.nombre) ?? "";
  const nom2 = pick(r, P_KEYS.nombre2) ?? "";
  const nom3 = pick(r, P_KEYS.nombre3) ?? "";
  const name = [nom1, nom2, nom3].filter(Boolean).join(" ");

  const street = String(pick(r, P_KEYS.street) ?? "");
  const city = String(pick(r, P_KEYS.city) ?? "");
  const cpRaw = String(pick(r, P_KEYS.cp) ?? "");
  const customer = pick(r, P_KEYS.customer);

  const cpMatch = cpRaw.match(/(\d{5})/);
  const cp = cpMatch ? cpMatch[1] : null;
  const num = extractNumVia(street);

  return {
    _name: name,
    _street_core: streetCore(street),
    _num: num,
    _cp: cp,
    _mun: normalizeText(city),
    raw: { street, city, cp, customer }
  };
}

function prepareMinisterioRow(m: MinisterioRow, sourceName: string) {
  const nombre = String(pick(m, M_KEYS.nombre) ?? "");
  const via = String(pick(m, M_KEYS.via) ?? "");
  const num = pick(m, M_KEYS.num);
  const mun = String(pick(m, M_KEYS.mun) ?? "");
  const cpRaw = String(pick(m, M_KEYS.cp) ?? "");

  const cpMatch = cpRaw.match(/(\d{5})/);
  const cp = cpMatch ? cpMatch[1] : null;

  const numNorm = num != null ? (normalizeText(String(num)).match(/(\d{1,4})/)?.[1] ?? null) : null;

  return {
    _name: normalizeText(nombre),
    _street_core: streetCore(via),
    _num: numNorm,
    _mun: normalizeText(mun),
    _cp: cp,
    _MIN_source: sourceName,

    // Guardamos originales para devolverlos
    _orig: {
      nombre,
      via,
      num: num != null ? String(num) : null,
      mun,
      cp: cp,
      codigo_centro: pick(m, M_KEYS.codigoCentro),
      fecha_aut: pick(m, M_KEYS.fechaAut),
      oferta: pick(m, M_KEYS.oferta)
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────

function scoreRow(
  name_pru: string, name_min: string,
  street_pru_core: string, street_min_core: string,
  same_cp: boolean, same_num: boolean, same_mun: boolean
): number {
  const s_name = fuzzyRatio(name_pru, name_min);
  const s_strt = fuzzyRatio(street_pru_core, street_min_core);
  let score = W_NAME * s_name + W_STREET * s_strt;
  if (same_cp) score += BONUS_CP;
  if (same_num) score += BONUS_NUM;
  if (same_mun) score += BONUS_MUN;
  return Math.max(0, Math.min(1, score));
}

function tierFromScore(s: number): "ALTA" | "REVISAR" | "SIN" {
  if (s >= THRESHOLD_ALTA) return "ALTA";
  if (s >= THRESHOLD_BAJA) return "REVISAR";
  return "SIN";
}

// ─────────────────────────────────────────────────────────────────────────────
// API pública del servicio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ejecuta el matching entre PRUEBA y hasta 4 bases del Ministerio.
 * @param pruebaRows Filas del Excel PRUEBA (ya leídas en el frontend).
 * @param ministerioBySource Mapa: nombre_de_excel -> array de filas (cada una con las columnas del ministerio).
 */
export function matchClientsAgainstMinisterios(
  pruebaRows: PruebaRow[],
  ministerioBySource: Record<string, MinisterioRow[]>
): MatchOutput {
  // Preparar PRUEBA
  const P = pruebaRows.map(preparePruebaRow);

  // Preparar MIN (concatenando las 1..4 fuentes con su nombre)
  const M: ReturnType<typeof prepareMinisterioRow>[] = [];
  for (const [source, rows] of Object.entries(ministerioBySource)) {
    if (!rows || !rows.length) continue;
    for (const r of rows) M.push(prepareMinisterioRow(r, source));
  }
  if (!M.length) {
    return {
      matches: [],
      top3: [],
      summary: { n_prueba: 0, alta: 0, revisar: 0, sin: 0, thresholds: { alta: THRESHOLD_ALTA, baja: THRESHOLD_BAJA } }
    };
  }

  const matches: MatchRecord[] = [];
  const top3: TopCandidate[] = [];

  for (const p of P) {
    // Bloqueo por CP; si no hay, bloqueamos por municipio
    let candidates = M;
    if (p._cp) {
      const byCP = candidates.filter(m => m._cp === p._cp);
      if (byCP.length) candidates = byCP;
    }
    if ((!candidates.length || !p._cp) && p._mun) {
      const byMun = M.filter(m => m._mun === p._mun);
      if (byMun.length) candidates = byMun;
    }

    // Puntuar
    const scored = candidates.map(m => {
      const sc = scoreRow(
        p._name, m._name,
        p._street_core, m._street_core,
        Boolean(p._cp && m._cp && p._cp === m._cp),
        Boolean(p._num && m._num && String(p._num) === String(m._num)),
        Boolean(p._mun && m._mun && p._mun === m._mun)
      );
      return { sc, m };
    });

    if (!scored.length) {
      matches.push({
        PRUEBA_customer: p.raw.customer ?? null,
        PRUEBA_nombre: p._name,
        PRUEBA_street: p.raw.street,
        PRUEBA_city: p.raw.city,
        PRUEBA_cp: p._cp,
        PRUEBA_num: p._num,

        MIN_nombre: null, MIN_via: null, MIN_num: null,
        MIN_municipio: null, MIN_cp: null,
        MIN_codigo_centro: null, MIN_fecha_autoriz: null, MIN_oferta_asist: null,
        MIN_source: null,

        SCORE: 0.0, TIER: "SIN"
      });
      continue;
    }

    scored.sort((a, b) => b.sc - a.sc);
    const best = scored[0];

    matches.push({
      PRUEBA_customer: p.raw.customer ?? null,
      PRUEBA_nombre: p._name,
      PRUEBA_street: p.raw.street,
      PRUEBA_city: p.raw.city,
      PRUEBA_cp: p._cp,
      PRUEBA_num: p._num,

      MIN_nombre: best.m._orig.nombre ?? null,
      MIN_via: best.m._orig.via ?? null,
      MIN_num: best.m._orig.num ?? null,
      MIN_municipio: best.m._orig.mun ?? null,
      MIN_cp: best.m._orig.cp ?? null,

      MIN_codigo_centro: (best.m._orig.codigo_centro ?? null) as any,
      MIN_fecha_autoriz: (best.m._orig.fecha_aut ?? null) as any,
      MIN_oferta_asist: (best.m._orig.oferta ?? null) as any,
      MIN_source: best.m._MIN_source ?? null,

      SCORE: Number(best.sc.toFixed(4)),
      TIER: tierFromScore(best.sc)
    });

    for (let i = 0; i < Math.min(3, scored.length); i++) {
      const c = scored[i];
      top3.push({
        PRUEBA_nombre: p._name,
        PRUEBA_cp: p._cp,
        PRUEBA_num: p._num,

        CAND_RANK: i + 1,
        CAND_SCORE: Number(c.sc.toFixed(4)),

        CAND_MIN_nombre: c.m._orig.nombre ?? null,
        CAND_MIN_via: c.m._orig.via ?? null,
        CAND_MIN_num: c.m._orig.num ?? null,
        CAND_MIN_mun: c.m._orig.mun ?? null,
        CAND_MIN_cp: c.m._orig.cp ?? null,

        CAND_MIN_codigo_centro: (c.m._orig.codigo_centro ?? null) as any,
        CAND_MIN_fecha_autoriz: (c.m._orig.fecha_aut ?? null) as any,
        CAND_MIN_oferta_asist: (c.m._orig.oferta ?? null) as any,
        CAND_MIN_source: c.m._MIN_source ?? null
      });
    }
  }

  const alta = matches.filter(x => x.TIER === "ALTA").length;
  const revisar = matches.filter(x => x.TIER === "REVISAR").length;
  const sin = matches.filter(x => x.TIER === "SIN").length;

  return {
    matches: matches.sort((a, b) => {
      // ordenar por customer y por score desc
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    }),
    top3,
    summary: {
      n_prueba: matches.length,
      alta, revisar, sin,
      thresholds: { alta: THRESHOLD_ALTA, baja: THRESHOLD_BAJA }
    }
  };
}

