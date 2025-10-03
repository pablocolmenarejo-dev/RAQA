// src/services/matchingService.ts
// Versión: mejor global 1-por-PRUEBA (entre todas las fuentes) **sin perder detección**.
// Mantiene AoA (array-de-arrays) para los Excels del Ministerio.

import type { MatchOutput, MatchRecord, TopCandidate, PruebaRow, MinisterioAoA } from "@/types";

const THRESHOLD_ALTA = 0.85;
const THRESHOLD_BAJA = 0.65;
const BONUS_CP = 0.35, BONUS_NUM = 0.25, BONUS_MUN = 0.10;
const W_NAME = 0.50, W_STREET = 0.35;

const STOPWORDS = new Set(["de","del","la","el","los","las","y","en","a","un","una","unos","unas","por","para","al","lo","da","do"]);
const ABR: Array<[RegExp,string]> = [
  [/\bhosp\.\b/g,"hospital"], [/\bsto\b/g,"santo"], [/\bsta\b/g,"santa"], [/\bs\.\b/g,"san"],
  [/\bcor\.\b/g,"corazon"], [/\bav\.\b/g,"avenida"], [/\bavda\b/g,"avenida"], [/\bavd\b/g,"avenida"],
  [/\bc\/\b/g,"calle"], [/\bcl\.\b/g,"calle"], [/\bpº\b/g,"paseo"], [/\bps\.\b/g,"paseo"], [/\bpso\b/g,"paseo"],
  [/\bctra\b/g,"carretera"], [/\bptda\b/g,"partida"], [/\burg\.\b/g,"urbanizacion"],
];
const VIA = new Set([
  "calle","carrer","avenida","av","avda","paseo","pso","ps","plaza","carretera","ctra","partida","ptda","camino","cno","travesia","tv","ronda"
]);

function stripAcc(s:string){ return s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g,"") : ""; }
function normText(s:any){
  if(typeof s!=="string") return "";
  let x = stripAcc(s.toLowerCase());
  for(const [p,r] of ABR) x = x.replace(p,r);
  x = x.replace(/[^\w\s]/g," ");
  return x.replace(/\s+/g," ").trim();
}
function tokens(s:string){
  if(!s) return [];
  const ts = normText(s).split(/[^0-9a-zñ]+/g);
  return ts.filter(t => t && (!STOPWORDS.has(t) || /^\d+$/.test(t)));
}
function streetCore(s:string){ return tokens(s).filter(t => !VIA.has(t)).join(" "); }
function extractNum(s:string){
  const n = normText(s);
  const m1 = /(?:^|\s|,)(\d{1,4})(?:\s*[a-z]?)$/.exec(n);
  if(m1) return m1[1];
  const m2 = /(?:nº|no|num|numero)\s*(\d{1,4})/.exec(n);
  return m2 ? m2[1] : null;
}

// similitud (aprox. a token_set + partial)
function tokenSetRatio(a:string,b:string){
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  if(!A.size && !B.size) return 0;
  let inter=0; for(const t of A) if(B.has(t)) inter++;
  return (2*inter)/(A.size+B.size);
}
function partialLike(a:string,b:string){
  const grams=(s:string,n:number)=>{
    const u = normText(s); const out:string[]=[];
    for(let i=0;i+n<=u.length;i++){ const g=u.slice(i,i+n); if(g.trim()) out.push(g); }
    return new Set(out);
  };
  const A=grams(a,3), B=grams(b,3);
  if(!A.size && !B.size) return 0;
  let inter=0; for(const g of A) if(B.has(g)) inter++;
  return (2*inter)/(A.size+B.size);
}
function fuzzy(a:string,b:string){ return Math.max(tokenSetRatio(a,b), partialLike(a,b)); }

// fallback por letra
const MIN_LETTERS = { nombre:"E", via:"M", mun:"K", cp:"O", num:"N", ccn:"C", fecha:"Y", oferta:"AC" } as const;
function colIndex(letter:string){ let u=letter.trim().toUpperCase(), idx=0; for(let i=0;i<u.length;i++) idx=idx*26+(u.charCodeAt(i)-64); return idx-1; }

// ——— mapeo por nombre (prioritario) y fallback por letra ———
function findHeaderIndex(headers:any[], letter:string, predicates: ((s:string)=>boolean)[]): number | null {
  const H = headers.map(h => normText(String(h??"")));
  for (let i=0;i<H.length;i++){
    const h = H[i]; if(!h) continue;
    if (predicates.some(p => p(h))) return i;
  }
  const j = colIndex(letter);
  return (j>=0 && j<headers.length) ? j : null;
}

const isNombreCentro = (s:string)=> s.includes("nombre") && s.includes("centro");
const isNombreVia    = (s:string)=> (s.includes("nombre") && s.includes("via")) || s.includes("direccion") || s.includes("direcion") || s.includes("dir");
const isMunicipio    = (s:string)=> s.includes("municipio");
const isCP           = (s:string)=> (s.includes("codigo") && s.includes("postal")) || s==="cp" || s.includes("postal");
const isNumVia       = (s:string)=> (s.includes("numero") && s.includes("via")) || s.endsWith(" nº") || s.endsWith(" n");
const isCCN          = (s:string)=> (s.includes("codigo") && s.includes("centro") && (s.includes("regcess") || s.includes("normaliz") || s.includes("normalizado"))) || (s.includes("ccn") && s.includes("codigo"));
const isFechaUltAut  = (s:string)=> (s.includes("fecha") && s.includes("ultima") && s.includes("autoriz")) || (s.includes("fecha") && s.includes("autoriz"));
const isOfertaAsist  = (s:string)=> s.includes("oferta") && s.includes("asist");

function safeHeader(headers:any[], i:number|null){ return (i!=null && i>=0 && i<headers.length) ? String(headers[i]) : "(no encontrado)"; }

/** Prepara índices y dfm normalizado por fuente (sobre AoA). */
function prepareSources(ministeriosAoA: Record<string, MinisterioAoA>) {
  const prepped = [] as Array<{
    source: string;
    headers: any[];
    idx: { nombre:number|null; via:number|null; mun:number|null; cp:number|null; num:number|null; ccn:number|null; fecha:number|null; oferta:number|null; };
    dfm: Array<{
      _name: string; _street_core: string; _mun: string; _cp: string; _num: string|null;
      _viaRaw:any; _munRaw:any; _ccn:any; _fecha:any; _oferta:any;
    }>;
  }>;

  for (const [source, aoa] of Object.entries(ministeriosAoA)) {
    if (!aoa || aoa.length === 0) continue;

    // 1) detectar cabeceras
    let headerRowIdx = 0, bestKW=-1;
    const KEYS=["nombre","centro","municipio","provincia","comunidad","postal","direccion","dirección","via","vía","numero","número","regcess"];
    for(let i=0;i<Math.min(30, aoa.length); i++){
      const row = aoa[i] || [];
      const text = normText((row||[]).join(" "));
      const kw = KEYS.reduce((acc,k)=> acc + (text.includes(k)?1:0), 0);
      if(kw>bestKW){ bestKW=kw; headerRowIdx=i; }
    }
    const headers = aoa[headerRowIdx] || [];
    const body = aoa.slice(headerRowIdx+1).filter(r=> Array.isArray(r) && r.some(v=>v!==null && v!==""));

    // 2) índices por nombre (prioridad) + fallback por letra
    const idx = {
      nombre: findHeaderIndex(headers, MIN_LETTERS.nombre, [isNombreCentro]),
      via:    findHeaderIndex(headers, MIN_LETTERS.via,    [isNombreVia]),
      mun:    findHeaderIndex(headers, MIN_LETTERS.mun,    [isMunicipio]),
      cp:     findHeaderIndex(headers, MIN_LETTERS.cp,     [isCP]),
      num:    findHeaderIndex(headers, MIN_LETTERS.num,    [isNumVia]),
      ccn:    findHeaderIndex(headers, MIN_LETTERS.ccn,    [isCCN]),
      fecha:  findHeaderIndex(headers, MIN_LETTERS.fecha,  [isFechaUltAut]),
      oferta: findHeaderIndex(headers, MIN_LETTERS.oferta, [isOfertaAsist]),
    };

    console.info(`[matching][${source}] nombre:`, safeHeader(headers, idx.nombre));
    console.info(`[matching][${source}] via:   `, safeHeader(headers, idx.via));
    console.info(`[matching][${source}] mun:   `, safeHeader(headers, idx.mun));
    console.info(`[matching][${source}] cp:    `, safeHeader(headers, idx.cp));
    console.info(`[matching][${source}] num:   `, safeHeader(headers, idx.num));
    console.info(`[matching][${source}] CCN:   `, safeHeader(headers, idx.ccn));
    console.info(`[matching][${source}] fecha: `, safeHeader(headers, idx.fecha));
    console.info(`[matching][${source}] oferta:`, safeHeader(headers, idx.oferta));

    const inb = (i:number|null)=> i!=null && i>=0 && i < headers.length;

    // 3) dfm normalizado
    const dfm = body.map(row=>{
      const g = (i:number|null)=> inb(i)? row[i as number] : null;
      const nombre = String(g(idx.nombre) ?? "");
      const via    = String(g(idx.via) ?? "");
      const mun    = String(g(idx.mun) ?? "");
      const cpRaw  = String(g(idx.cp) ?? "");
      const cp     = cpRaw.match(/(\d{5})/)?.[1] ?? "";
      const numRaw = String(g(idx.num) ?? "");
      const num    = (normText(numRaw).match(/(\d{1,4})/)||[])[1] || null;

      return {
        _name: normText(nombre),
        _street_core: streetCore(via),
        _mun: normText(mun),
        _cp: cp,
        _num: num,
        _viaRaw: g(idx.via),
        _munRaw: g(idx.mun),
        _ccn: g(idx.ccn),
        _fecha: g(idx.fecha),
        _oferta: g(idx.oferta),
      };
    });

    prepped.push({ source, headers, idx, dfm });
  }

  return prepped;
}

export function matchClientsAgainstMinisterios(
  pruebaRows: PruebaRow[],
  ministeriosAoA: Record<string, MinisterioAoA>,
): MatchOutput {
  // PRUEBA → derivados
  if(!pruebaRows || pruebaRows.length===0) throw new Error("PRUEBA está vacío.");
  const need = ["INFO_1","STREET","CITY","PostalCode"];
  const cols = new Set(Object.keys(pruebaRows[0]||{}));
  for(const n of need) if(!cols.has(n)) throw new Error(`En PRUEBA falta '${n}'. Columnas: ${Array.from(cols).join(", ")}`);

  const dfp = pruebaRows.map((r)=> {
    const name = [r["INFO_1"]||"", r["INFO_2"]||"", r["INFO_3"]||""].join(" ").trim();
    const cp   = String(r["PostalCode"]||"").match(/(\d{5})/)?.[1] || "";
    const st   = String(r["STREET"]||"");
    return {
      _name: name,
      _cp: cp,
      _street_core: streetCore(st),
      _num: extractNum(st),
      _mun: normText(String(r["CITY"]||"")),
      _raw: r,
      _customer: (r as any)["Customer"] ?? null,
    };
  });

  // Preprocesar todas las fuentes una sola vez
  const sources = prepareSources(ministeriosAoA);

  const allMatches: MatchRecord[] = [];
  const allTop3: TopCandidate[] = [];

  // === NUEVO: 1 fila por cliente PRUEBA (mejor global entre todas las fuentes) ===
  for (const r of dfp) {
    const scoredGlobal: Array<{ sc:number; src:string; m:any }> = [];

    for (const { source, dfm } of sources) {
      // 1) CP exacto
      let cand = r._cp ? dfm.filter(m=> m._cp === r._cp) : [];
      // 2) municipio (contains en ambos sentidos)
      if(cand.length===0 && r._mun){
        cand = dfm.filter(m=> m._mun && (m._mun===r._mun || m._mun.includes(r._mun) || r._mun.includes(m._mun)));
      }
      // 3) capado sin bloqueo (¡esto es lo que faltaba!)
      if(cand.length===0){ cand = dfm.slice(0, Math.min(4000, dfm.length)); }

      for (const m of cand) {
        let s = W_NAME*fuzzy(r._name, m._name) + W_STREET*fuzzy(r._street_core, m._street_core);
        if(r._cp && r._cp===m._cp) s += BONUS_CP;
        if(r._num && m._num && String(r._num)===String(m._num)) s += BONUS_NUM;
        if(r._mun && (m._mun===r._mun || m._mun.includes(r._mun) || r._mun.includes(m._mun))) s += BONUS_MUN;
        s = Math.max(0, Math.min(1, s));
        scoredGlobal.push({ sc: s, src: source, m });
      }
    }

    scoredGlobal.sort((a,b)=> b.sc - a.sc);

    if (scoredGlobal.length) {
      const best = scoredGlobal[0];

      const rec: MatchRecord = {
        PRUEBA_customer: r._customer,
        PRUEBA_nombre: r._name,
        PRUEBA_street: String(r._raw["STREET"]||""),
        PRUEBA_city: String(r._raw["CITY"]||""),
        PRUEBA_cp: r._cp || null,
        PRUEBA_num: r._num,

        MIN_nombre: best.m._name || null,
        MIN_via: best.m._viaRaw ? String(best.m._viaRaw) : null,
        MIN_num: best.m._num,
        MIN_municipio: best.m._munRaw ? String(best.m._munRaw) : null,
        MIN_cp: best.m._cp || null,

        MIN_codigo_centro: best.m._ccn ? String(best.m._ccn) : null,
        MIN_fecha_autoriz: best.m._fecha ? String(best.m._fecha) : null,
        MIN_oferta_asist: best.m._oferta ? String(best.m._oferta) : null,
        MIN_source: best.src,

        SCORE: Number(best.sc.toFixed(4)),
        TIER: best.sc >= THRESHOLD_ALTA ? "ALTA" : (best.sc >= THRESHOLD_BAJA ? "REVISAR":"SIN"),
      };
      allMatches.push(rec);

      // Top-3 GLOBAL para auditoría
      for (let i = 0; i < Math.min(3, scoredGlobal.length); i++) {
        const c = scoredGlobal[i];
        allTop3.push({
          PRUEBA_nombre: r._name,
          PRUEBA_cp: r._cp || null,
          PRUEBA_num: r._num || null,
          CAND_RANK: i+1,
          CAND_SCORE: Number(c.sc.toFixed(4)),
          CAND_MIN_nombre: c.m._name || null,
          CAND_MIN_via: c.m._viaRaw ? String(c.m._viaRaw) : null,
          CAND_MIN_num: c.m._num,
          CAND_MIN_mun: c.m._munRaw ? String(c.m._munRaw) : null,
          CAND_MIN_cp: c.m._cp || null,
          CAND_MIN_codigo_centro: c.m._ccn ? String(c.m._ccn) : null,
          CAND_MIN_fecha_autoriz: c.m._fecha ? String(c.m._fecha) : null,
          CAND_MIN_oferta_asist: c.m._oferta ? String(c.m._oferta) : null,
          CAND_MIN_source: c.src,
        });
      }
    } else {
      // Ninguna fuente dio candidato → 1 sola fila SIN
      allMatches.push({
        PRUEBA_customer: r._customer,
        PRUEBA_nombre: r._name,
        PRUEBA_street: String(r._raw["STREET"]||""),
        PRUEBA_city: String(r._raw["CITY"]||""),
        PRUEBA_cp: r._cp || null,
        PRUEBA_num: r._num,
        MIN_nombre: null, MIN_via: null, MIN_num: null, MIN_municipio: null, MIN_cp: null,
        MIN_codigo_centro: null, MIN_fecha_autoriz: null, MIN_oferta_asist: null, MIN_source: null as any,
        SCORE: 0, TIER: "SIN",
      });
    }
  }

  // Orden estable
  allMatches.sort((a,b)=> {
    const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
    return ca!==0 ? ca : b.SCORE - a.SCORE;
  });

  return {
    matches: allMatches,
    top3: allTop3,
    summary: {
      n_prueba: dfp.length,
      alta: allMatches.filter(m=> m.TIER==="ALTA").length,
      revisar: allMatches.filter(m=> m.TIER==="REVISAR").length,
      sin: allMatches.filter(m=> m.TIER==="SIN").length,
      thresholds: { alta: THRESHOLD_ALTA, baja: THRESHOLD_BAJA },
    },
  };
}

