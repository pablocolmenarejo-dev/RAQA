// services/matchingService.ts
// Replica la estrategia del script de Python (mapeo por letras, bloqueo y scoring).

import type {
  MatchOutput,
  MatchRecord,
  TopCandidate,
  Thresholds,
  MinisterioRow,
  PruebaRow,
} from "@/types";

/* ===================== Parámetros idénticos a Python ===================== */
const THRESHOLD_ALTA = 0.85;
const THRESHOLD_BAJA = 0.65;

const BONUS_CP  = 0.35;
const BONUS_NUM = 0.25;
const BONUS_MUN = 0.10;

const W_NAME   = 0.50;
const W_STREET = 0.35;

const STOPWORDS = new Set(["de","del","la","el","los","las","y","en","a","un","una","unos","unas","por","para","al","lo","da","do"]);
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
  "calle","carrer","avenida","av","avda","paseo","pso","ps","plaza",
  "carretera","ctra","partida","ptda","camino","cno","travesia","tv","ronda"
]);

/* ===================== Normalización y tokenización ===================== */
function stripAccents(s: string): string {
  return s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
}
function normalizeText(s: unknown): string {
  if (typeof s !== "string") return "";
  let out = stripAccents(s.toLowerCase());
  for (const [pat, repl] of ABREVIATURAS) out = out.replace(pat, repl);
  out = out.replace(/[^\w\s]/g, " ");
  return out.replace(/\s+/g, " ").trim();
}
function tokens(s: string): string[] {
  if (!s) return [];
  const ts = normalizeText(s).split(/[^0-9a-zñ]+/g);
  return ts.filter(t => t && (!STOPWORDS.has(t) || /^\d+$/.test(t)));
}
function streetCore(s: string): string {
  const ts = tokens(s).filter(t => !VIA_TIPOS.has(t));
  return ts.join(" ");
}
function extractNumVia(s: string): string | null {
  const n = normalizeText(s);
  const p1 = /(?:^|\s|,)(\d{1,4})(?:\s*[a-z]?)$/i.exec(n);
  if (p1) return p1[1];
  const p2 = /(?:nº|no|num|numero)\s*(\d{1,4})/i.exec(n);
  if (p2) return p2[1];
  return null;
}

/* ===================== Fuzzy ≈ max(token_set_ratio, partial_ratio) ===================== */
// Aproximación a token_set_ratio: Dice sobre conjuntos de tokens (2*|A∩B| / (|A|+|B|))
function tokenSetRatioLike(a: string, b: string): number {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return (2 * inter) / (A.size + B.size);
}
// Aproximación a partial_ratio: coincidencia por n-gramas (3) tipo Dice
function partialRatioLike(a: string, b: string): number {
  const grams = (s: string, n: number) => {
    const u = normalizeText(s);
    const out: string[] = [];
    for (let i = 0; i + n <= u.length; i++) {
      const g = u.slice(i, i + n);
      if (g.trim()) out.push(g);
    }
    return new Set(out);
  };
  const A3 = grams(a, 3), B3 = grams(b, 3);
  if (A3.size === 0 && B3.size === 0) return 0;
  let inter = 0;
  for (const g of A3) if (B3.has(g)) inter++;
  return (2 * inter) / (A3.size + B3.size);
}
// Fuzzy final (0..1)
function fuzzyRatio(a: string, b: string): number {
  return Math.max(tokenSetRatioLike(a, b), partialRatioLike(a, b));
}

/* ===================== Mapeo por letras (fijo) ===================== */
const MIN_LETTERS: Record<string, string> = {
  nombre_centro: "E",
  via_nombre: "M",
  municipio: "K",
  cp: "O",
  via_numero: "N",
  codigo_centro: "C",
  fecha_autoriz: "Y",
  oferta_asist: "AC",
};

function excelColToIndex(letter: string): number {
  const u = letter.trim().toUpperCase();
  let idx = 0;
  for (let i = 0; i < u.length; i++) idx = idx * 26 + (u.charCodeAt(i) - 64);
  return idx - 1;
}

function mapMinisterioColsByLetters(rows: MinisterioRow[]) {
  const headers = rows && rows.length ? Object.keys(rows[0] as any) : [];
  const pick = (L: string): string | null => {
    const i = excelColToIndex(L);
    return (i >= 0 && i < headers.length) ? headers[i] : null;
  };
  const mm: Record<string, string | null> = {};
  for (const [k, L] of Object.entries(MIN_LETTERS)) mm[k] = pick(L);
  // Log de depuración
  console.info("[matching] Mapeo por letras (índices según orden de cabeceras):", { headers, mm });
  return mm;
}

/* ===================== Mapeo PRUEBA ===================== */
function mapPruebaCols(rows: PruebaRow[]) {
  if (!rows || rows.length === 0) throw new Error("PRUEBA está vacío.");
  const cols = new Set(Object.keys(rows[0] || {}));
  const need = ["INFO_1", "STREET", "CITY", "PostalCode"];
  for (const n of need) {
    if (!cols.has(n)) throw new Error(`En PRUEBA falta '${n}'. Columnas: ${Array.from(cols).join(", ")}`);
  }
  return {
    nombre_1: "INFO_1",
    nombre_2: cols.has("INFO_2") ? "INFO_2" : null,
    nombre_3: cols.has("INFO_3") ? "INFO_3" : null,
    street: "STREET",
    city: "CITY",
    cp: "PostalCode",
    customer: cols.has("Customer") ? "Customer" : null,
  };
}

/* ===================== Scoring (idéntico) ===================== */
function scoreRow(
  name_pru: string,
  name_min: string,
  street_pru_core: string,
  street_min_core: string,
  same_cp: boolean,
  same_num: boolean,
  same_mun: boolean
): number {
  const s_name = fuzzyRatio(name_pru, name_min);
  const s_strt = fuzzyRatio(street_pru_core, street_min_core);
  let score = W_NAME * s_name + W_STREET * s_strt;
  if (same_cp)  score += BONUS_CP;
  if (same_num) score += BONUS_NUM;
  if (same_mun) score += BONUS_MUN;
  return Math.max(0, Math.min(1, score));
}

/* ===================== API principal: 1..N excels ministerio ===================== */
export function matchClientsAgainstMinisterios(
  pruebaRows: PruebaRow[],
  ministerios: Record<string, MinisterioRow[]>,
  thresholds: Partial<Thresholds> = {}
): MatchOutput {
  const mpr = mapPruebaCols(pruebaRows);

  // Derivados PRUEBA
  const dfp = pruebaRows.map((r) => {
    const name =
      [mpr.nombre_1, mpr.nombre_2, mpr.nombre_3]
        .filter(Boolean)
        .map((k) => String((r as any)[k as string] ?? ""))
        .join(" ")
        .trim();

    const cp = String((r as any)[mpr.cp] ?? "").match(/(\d{5})/)?.[1] ?? "";
    const street = String((r as any)[mpr.street] ?? "");
    return {
      _name: name,
      _cp: cp,
      _street_core: streetCore(street),
      _num: extractNumVia(street),
      _mun: normalizeText(String((r as any)[mpr.city] ?? "")),
      _raw: r,
    };
  });

  const allMatches: MatchRecord[] = [];
  const allTop3: TopCandidate[] = [];

  for (const [source, rows] of Object.entries(ministerios)) {
    if (!rows || rows.length === 0) continue;

    const mm = mapMinisterioColsByLetters(rows);

    // Derivados MIN (según mapeo por letras)
    const dfm = rows.map((row) => {
      const get = (key: string | null) => (key ? (row as any)[key] : null);
      const nombre = String(get(mm.nombre_centro) ?? "");
      const via    = String(get(mm.via_nombre) ?? "");
      const mun    = String(get(mm.municipio) ?? "");
      const cpRaw  = String(get(mm.cp) ?? "");
      const cp     = cpRaw.match(/(\d{5})/)?.[1] ?? "";
      let num: string | null = null;
      if (mm.via_numero) {
        const raw = String(get(mm.via_numero) ?? "");
        const m = normalizeText(raw).match(/(\d{1,4})/);
        num = m ? m[1] : null;
      }
      return {
        _name: normalizeText(nombre),
        _street_core: streetCore(via),
        _mun: normalizeText(mun),
        _cp: cp,
        _num: num,
        _viaRaw: get(mm.via_nombre),
        _munRaw: get(mm.municipio),
        _row: row,
      };
    });

    // Matching fila a fila (bloqueo ESTRICTO como en Python)
    for (const r of dfp) {
      let cand = dfm;
      if (r._cp) {
        cand = cand.filter(m => m._cp === r._cp);
      }
      if (cand.length === 0 && r._mun) {
        cand = dfm.filter(m => m._mun === r._mun); // igualdad exacta (no contains)
      }

      const scored = cand.map(m => {
        const sc = scoreRow(
          r._name, m._name,
          r._street_core, m._street_core,
          Boolean(r._cp && r._cp === m._cp),
          Boolean(r._num && m._num && String(r._num) === String(m._num)),
          Boolean(r._mun && r._mun === m._mun)
        );
        return { sc, m };
      });

      if (scored.length > 0) {
        scored.sort((a, b) => b.sc - a.sc);
        const best = scored[0];

        // Claves C/Y/AC
        const C  = mm.codigo_centro ? (best.m._row as any)[mm.codigo_centro] ?? null : null;
        const Y  = mm.fecha_autoriz ? (best.m._row as any)[mm.fecha_autoriz] ?? null : null;
        const AC = mm.oferta_asist ? (best.m._row as any)[mm.oferta_asist] ?? null : null;

        const rec: MatchRecord = {
          PRUEBA_customer: mpr.customer ? ((r._raw as any)[mpr.customer] ?? null) : null,
          PRUEBA_nombre: r._name,
          PRUEBA_street: String((r._raw as any)[mpr.street] ?? ""),
          PRUEBA_city: String((r._raw as any)[mpr.city] ?? ""),
          PRUEBA_cp: r._cp || null,
          PRUEBA_num: r._num,

          MIN_nombre: best.m._name || null,
          MIN_via: best.m._viaRaw ? String(best.m._viaRaw) : null,
          MIN_num: best.m._num,
          MIN_municipio: best.m._munRaw ? String(best.m._munRaw) : null,
          MIN_cp: best.m._cp || null,

          MIN_codigo_centro: C ? String(C) : null,
          MIN_fecha_autoriz: Y ? String(Y) : null,
          MIN_oferta_asist: AC ? String(AC) : null,
          MIN_source: source,

          SCORE: Number(best.sc.toFixed(4)),
          TIER: best.sc >= THRESHOLD_ALTA ? "ALTA" : (best.sc >= THRESHOLD_BAJA ? "REVISAR" : "SIN"),
        };
        allMatches.push(rec);

        // Top-3
        for (let i = 0; i < Math.min(3, scored.length); i++) {
          const c = scored[i];
          const cC  = mm.codigo_centro ? (c.m._row as any)[mm.codigo_centro] ?? null : null;
          const cY  = mm.fecha_autoriz ? (c.m._row as any)[mm.fecha_autoriz] ?? null : null;
          const cAC = mm.oferta_asist ? (c.m._row as any)[mm.oferta_asist] ?? null : null;
          const cand: TopCandidate = {
            PRUEBA_nombre: r._name,
            PRUEBA_cp: r._cp || null,
            PRUEBA_num: r._num || null,
            CAND_RANK: i + 1,
            CAND_SCORE: Number(c.sc.toFixed(4)),
            CAND_MIN_nombre: c.m._name || null,
            CAND_MIN_via: c.m._viaRaw ? String(c.m._viaRaw) : null,
            CAND_MIN_num: c.m._num,
            CAND_MIN_mun: c.m._munRaw ? String(c.m._munRaw) : null,
            CAND_MIN_cp: c.m._cp || null,
            CAND_MIN_codigo_centro: cC ? String(cC) : null,
            CAND_MIN_fecha_autoriz: cY ? String(cY) : null,
            CAND_MIN_oferta_asist: cAC ? String(cAC) : null,
            CAND_MIN_source: source,
          };
          allTop3.push(cand);
        }
      } else {
        // Sin candidatos (exactamente como tu script)
        allMatches.push({
          PRUEBA_customer: mpr.customer ? ((r._raw as any)[mpr.customer] ?? null) : null,
          PRUEBA_nombre: r._name,
          PRUEBA_street: String((r._raw as any)[mpr.street] ?? ""),
          PRUEBA_city: String((r._raw as any)[mpr.city] ?? ""),
          PRUEBA_cp: r._cp || null,
          PRUEBA_num: r._num,

          MIN_nombre: null, MIN_via: null, MIN_num: null, MIN_municipio: null, MIN_cp: null,
          MIN_codigo_centro: null, MIN_fecha_autoriz: null, MIN_oferta_asist: null, MIN_source: source,

          SCORE: 0, TIER: "SIN",
        });
      }
    }
  }

  // Orden estable por customer y score (como veníamos haciendo)
  allMatches.sort((a, b) => {
    const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
    if (ca !== 0) return ca;
    return b.SCORE - a.SCORE;
  });

  const summary = {
    n_prueba: new Set(dfp.map(d => d._name + "|" + d._cp + "|" + (d._num ?? ""))).size,
    alta: allMatches.filter(m => m.TIER === "ALTA").length,
    revisar: allMatches.filter(m => m.TIER === "REVISAR").length,
    sin: allMatches.filter(m => m.TIER === "SIN").length,
    thresholds: {
      alta: thresholds?.alta ?? THRESHOLD_ALTA,
      baja: thresholds?.baja ?? THRESHOLD_BAJA,
    } as Thresholds,
  };

  return { matches: allMatches, top3: allTop3, summary };
}
