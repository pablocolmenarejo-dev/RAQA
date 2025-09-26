// services/matchingService.ts
// Estrategia determinista equivalente a tu script Python + detección robusta de columnas del Ministerio.
// - Mapea columnas por NOMBRE (prioritario) y, si falla, por LETRA (E/M/K/O/N/C/Y/AC).
// - Bloqueo progresivo: CP → municipio (contains) → sin bloqueo (capado).
// - Mantiene C/Y/AC, MIN_source y Top-3, con la misma fórmula de SCORE/BONUS que Python.

import type {
  MatchOutput,
  MatchRecord,
  TopCandidate,
  Thresholds,
  MinisterioRow,
  PruebaRow,
} from "@/types";

/* ===================== Parámetros (idénticos al script) ===================== */
const THRESHOLD_ALTA = 0.85;
const THRESHOLD_BAJA = 0.65;

const BONUS_CP  = 0.35;
const BONUS_NUM = 0.25;
const BONUS_MUN = 0.10;

const W_NAME   = 0.50;
const W_STREET = 0.35;

// límites cuando relajamos bloqueo
const MAX_CANDIDATES_NO_BLOCK = 4000; // tope de filas a evaluar sin bloqueo
const TOPK_PER_ROW = 3;

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

/* ===================== Utils de normalización ===================== */
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
function normHeader(s: string): string {
  return normalizeText(String(s).replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim());
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

/* ===================== Similitud (aprox. a token_set/partial) ===================== */
function fuzzyRatio(a: string, b: string): number {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  let inter = 0; for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  const jaccard = union ? inter / union : 0;

  // partial overlap con n-gramas (3)
  const grams = (s: string, n: number) => {
    const u = normalizeText(s); const out: string[] = [];
    for (let i = 0; i + n <= u.length; i++) {
      const g = u.slice(i, i + n);
      if (g.trim()) out.push(g);
    }
    return new Set(out);
  };
  const a3 = grams(a, 3), b3 = grams(b, 3);
  let inter3 = 0; for (const g of a3) if (b3.has(g)) inter3++;
  const dice3 = (2 * inter3) / (a3.size + b3.size || 1);

  return Math.max(jaccard, dice3);
}

/* ===================== Detección de columnas del Ministerio ===================== */
// Mapeo por letras (fallback)
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
  const u = letter.trim().toUpperCase(); let idx = 0;
  for (let i = 0; i < u.length; i++) idx = idx * 26 + (u.charCodeAt(i) - 64);
  return idx - 1;
}
function byLetters(headers: string[]): Record<string, string | null> {
  const out: Record<string, string | null> = {
    nombre_centro: null, via_nombre: null, municipio: null, cp: null, via_numero: null,
    codigo_centro: null, fecha_autoriz: null, oferta_asist: null,
  };
  const pick = (L: string) => {
    const i = excelColToIndex(L);
    return (i >= 0 && i < headers.length) ? headers[i] : null;
  };
  for (const [k, L] of Object.entries(MIN_LETTERS)) out[k] = pick(L);
  return out;
}

// Mapeo por nombre (prioritario)
function byNames(headers: string[]): Record<string, string | null> {
  const H = headers.map(h => ({ raw: h, norm: normHeader(h) }));
  const find = (pred: (s: string) => boolean): string | null => {
    const hit = H.find(h => pred(h.norm));
    return hit ? hit.raw : null;
  };
  return {
    nombre_centro: find(s =>
      s.includes("nombre") && s.includes("centro")
    ),
    via_nombre: find(s =>
      (s.includes("nombre") && s.includes("via")) || s.includes("direccion") || s.includes("direcion") || s.includes("dir")
    ),
    municipio: find(s => s.includes("municipio")),
    cp: find(s => (s.includes("codigo") && s.includes("postal")) || s === "cp" || s.includes("postal")),
    via_numero: find(s => s.includes("numero") && s.includes("via")),
    codigo_centro: find(s =>
      (s.includes("codigo") && s.includes("centro") && (s.includes("regcess") || s.includes("normalizado"))) ||
      (s.includes("codigo") && s.includes("centro"))
    ),
    fecha_autoriz: find(s =>
      (s.includes("fecha") && s.includes("ultima") && s.includes("autoriz")) ||
      (s.includes("fecha") && s.includes("autoriz"))
    ),
    oferta_asist: find(s => s.includes("oferta") && s.includes("asist")),
  };
}

function mapMinisterioColumns(rows: MinisterioRow[]) {
  const headers = rows && rows.length ? Object.keys(rows[0] as any) : [];
  const mapByName = byNames(headers);
  // ¿cuántas encontró?
  const foundByName = Object.values(mapByName).filter(Boolean).length;

  if (foundByName >= 5) {
    console.info("[matching] Ministerio mapeado POR NOMBRE:", mapByName);
    return mapByName;
  }
  // fallback por letras
  const mapByLet = byLetters(headers);
  console.info("[matching] Ministerio mapeado POR LETRAS:", mapByLet);
  return mapByLet;
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

/* ===================== Scoring ===================== */
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

/* ===================== API principal ===================== */
export function matchClientsAgainstMinisterios(
  pruebaRows: PruebaRow[],
  ministerios: Record<string, MinisterioRow[]>,
  thresholds: Partial<Thresholds> = {}
): MatchOutput {
  const mpr = mapPruebaCols(pruebaRows);

  // Derivados PRUEBA
  const dfp = pruebaRows.map((r) => {
    const name = [mpr.nombre_1, mpr.nombre_2, mpr.nombre_3]
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

    const mm = mapMinisterioColumns(rows);

    // Derivados MIN
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

    console.info("[matching] Fuente:", source, "headers:", Object.keys(rows[0] || {}));
    console.info("[matching] Totales MIN:", dfm.length);

    // Matching fila a fila
    for (const r of dfp) {
      // 1) Bloqueo por CP exacto
      let cand = r._cp ? dfm.filter(m => m._cp === r._cp) : [];
      // 2) Si no hay, por municipio (contains; no igualdad exacta)
      if (cand.length === 0 && r._mun) {
        cand = dfm.filter(m => m._mun && m._mun.includes(r._mun));
      }
      // 3) Si sigue vacío, sin bloqueo (capado)
      if (cand.length === 0) {
        cand = dfm.slice(0, MAX_CANDIDATES_NO_BLOCK);
      }

      // Puntuar
      const scored = cand.map(m => {
        const sc = scoreRow(
          r._name, m._name,
          r._street_core, m._street_core,
          Boolean(r._cp && r._cp === m._cp),
          Boolean(r._num && m._num && String(r._num) === String(m._num)),
          Boolean(r._mun && m._mun && (m._mun === r._mun || m._mun.includes(r._mun)))
        );
        return { sc, m };
      });

      scored.sort((a, b) => b.sc - a.sc);

      if (scored.length > 0) {
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
        for (let i = 0; i < Math.min(TOPK_PER_ROW, scored.length); i++) {
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
        // teórico: si dfm.length==0
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

  // Orden estable por customer y score
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
