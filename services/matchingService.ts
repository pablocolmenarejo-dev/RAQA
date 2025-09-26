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
const VIA = new Set(["calle","carrer","avenida","av","avda","paseo","pso","ps","plaza","carretera","ctra","partida","ptda","camino","cno","travesia","tv","ronda"]);

function stripAcc(s:string){return s? s.normalize("NFD").replace(/[\u0300-\u036f]/g,""):"";}
function normText(s:any){ if(typeof s!=="string") return ""; let x=stripAcc(s.toLowerCase()); for(const [p,r] of ABR) x=x.replace(p,r); x=x.replace(/[^\w\s]/g," "); return x.replace(/\s+/g," ").trim(); }
function tokens(s:string){ if(!s) return []; const ts=normText(s).split(/[^0-9a-zñ]+/g); return ts.filter(t=>t && (!STOPWORDS.has(t) || /^\d+$/.test(t))); }
function streetCore(s:string){ return tokens(s).filter(t=>!VIA.has(t)).join(" "); }
function extractNum(s:string){ const n=normText(s); const m1=/(?:^|\s|,)(\d{1,4})(?:\s*[a-z]?)$/.exec(n); if(m1) return m1[1]; const m2=/(?:nº|no|num|numero)\s*(\d{1,4})/.exec(n); return m2? m2[1]:null; }

function tokenSetRatio(a:string,b:string){ const A=new Set(tokens(a)), B=new Set(tokens(b)); if(!A.size&&!B.size) return 0; let inter=0; for(const t of A) if(B.has(t)) inter++; return (2*inter)/(A.size+B.size); }
function partialLike(a:string,b:string){ const grams=(s:string,n:number)=>{ const u=normText(s); const out:string[]=[]; for(let i=0;i+n<=u.length;i++){ const g=u.slice(i,i+n); if(g.trim()) out.push(g);} return new Set(out); }; const A=grams(a,3), B=grams(b,3); if(!A.size&&!B.size) return 0; let inter=0; for(const g of A) if(B.has(g)) inter++; return (2*inter)/(A.size+B.size); }
function fuzzy(a:string,b:string){ return Math.max(tokenSetRatio(a,b), partialLike(a,b)); }

const MIN_LETTERS={ nombre:"E", via:"M", mun:"K", cp:"O", num:"N", ccn:"C", fecha:"Y", oferta:"AC" } as const;
function colIndex(letter:string){ let u=letter.trim().toUpperCase(), idx=0; for(let i=0;i<u.length;i++) idx=idx*26+(u.charCodeAt(i)-64); return idx-1; }

export function matchClientsAgainstMinisterios(
  pruebaRows: PruebaRow[],
  ministeriosAoA: Record<string, MinisterioAoA>,
): MatchOutput {
  // PRUEBA → derivados
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

  const allMatches: MatchRecord[] = [];
  const allTop3: TopCandidate[] = [];

  for(const [source, aoa] of Object.entries(ministeriosAoA)){
    if(!aoa || aoa.length===0) continue;

    // 1) Detectar fila de cabeceras (heurística, como en Python)
    let headerRowIdx = 0, bestKW=-1;
    const KEYS=["nombre","centro","municipio","provincia","comunidad","postal","direccion","dirección","via","vía","numero","número"];
    for(let i=0;i<Math.min(30, aoa.length); i++){
      const row = aoa[i] || [];
      const text = normText((row||[]).join(" "));
      const kw = KEYS.reduce((acc,k)=> acc + (text.includes(k)?1:0), 0);
      if(kw>bestKW){ bestKW=kw; headerRowIdx=i; }
    }
    const headers = aoa[headerRowIdx] || [];
    const body = aoa.slice(headerRowIdx+1).filter(r=> Array.isArray(r) && r.some(v=>v!==null && v!==""));

    // 2) Índices por letra
    const idx = {
      nombre: colIndex(MIN_LETTERS.nombre),
      via:    colIndex(MIN_LETTERS.via),
      mun:    colIndex(MIN_LETTERS.mun),
      cp:     colIndex(MIN_LETTERS.cp),
      num:    colIndex(MIN_LETTERS.num),
      ccn:    colIndex(MIN_LETTERS.ccn),
      fecha:  colIndex(MIN_LETTERS.fecha),
      oferta: colIndex(MIN_LETTERS.oferta),
    };
    const inb = (i:number)=> i>=0 && i < headers.length;
    const dfm = body.map(row=>{
      const g = (i:number)=> inb(i)? row[i] : null;
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

    // 3) Matching (bloqueo CP → municipio; contains en ambos sentidos)
    for(const r of dfp){
      let cand = r._cp ? dfm.filter(m=> m._cp === r._cp) : [];
      if(cand.length===0 && r._mun){
        cand = dfm.filter(m=> m._mun && (m._mun===r._mun || m._mun.includes(r._mun) || r._mun.includes(m._mun)));
      }
      if(cand.length===0){ cand = dfm.slice(0, Math.min(4000, dfm.length)); }

      const scored = cand.map(m=>{
        let s = W_NAME*fuzzy(r._name, m._name) + W_STREET*fuzzy(r._street_core, m._street_core);
        if(r._cp && r._cp===m._cp) s += BONUS_CP;
        if(r._num && m._num && String(r._num)===String(m._num)) s += BONUS_NUM;
        if(r._mun && (m._mun===r._mun || m._mun.includes(r._mun) || r._mun.includes(m._mun))) s += BONUS_MUN;
        s = Math.max(0, Math.min(1, s));
        return { sc: s, m };
      }).sort((a,b)=> b.sc-a.sc);

      if(scored.length){
        const best = scored[0];
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
          MIN_source: source,

          SCORE: Number(best.sc.toFixed(4)),
          TIER: best.sc >= THRESHOLD_ALTA ? "ALTA" : (best.sc >= THRESHOLD_BAJA ? "REVISAR":"SIN"),
        };
        allMatches.push(rec);

        for(let i=0;i<Math.min(3, scored.length);i++){
          const c = scored[i];
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
            CAND_MIN_source: source,
          });
        }
      } else {
        allMatches.push({
          PRUEBA_customer: r._customer,
          PRUEBA_nombre: r._name,
          PRUEBA_street: String(r._raw["STREET"]||""),
          PRUEBA_city: String(r._raw["CITY"]||""),
          PRUEBA_cp: r._cp || null,
          PRUEBA_num: r._num,
          MIN_nombre: null, MIN_via: null, MIN_num: null, MIN_municipio: null, MIN_cp: null,
          MIN_codigo_centro: null, MIN_fecha_autoriz: null, MIN_oferta_asist: null, MIN_source: source,
          SCORE: 0, TIER: "SIN",
        });
      }
    }
  }

  allMatches.sort((a,b)=> {
    const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
    return ca!==0 ? ca : b.SCORE - a.SCORE;
  });

  return {
    matches: allMatches,
    top3: allTop3,
    summary: {
      n_prueba: new Set(dfp.map(d=> d._name+"|"+d._cp+"|"+(d._num??""))).size,
      alta: allMatches.filter(m=> m.TIER==="ALTA").length,
      revisar: allMatches.filter(m=> m.TIER==="REVISAR").length,
      sin: allMatches.filter(m=> m.TIER==="SIN").length,
      thresholds: { alta: THRESHOLD_ALTA, baja: THRESHOLD_BAJA },
    },
  };
}
