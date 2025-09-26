// src/types.ts

export type PruebaRow = Record<string, any>;
export type MinisterioAoA = any[][]; // matriz: cada fila es un array, la 1ª fila son cabeceras crudas

export interface MatchRecord {
  PRUEBA_customer: string | null;
  PRUEBA_nombre: string;
  PRUEBA_street: string;
  PRUEBA_city: string;
  PRUEBA_cp: string | null;
  PRUEBA_num: string | null;

  MIN_nombre: string | null;
  MIN_via: string | null;
  MIN_num: string | null;
  MIN_municipio: string | null;
  MIN_cp: string | null;

  MIN_codigo_centro: string | null; // C
  MIN_fecha_autoriz: string | null; // Y
  MIN_oferta_asist: string | null;  // AC
  MIN_source: string;               // nombre del excel ministerial

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
  CAND_MIN_source: string;
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
