// types.ts
// Tipos compartidos para la metodología de matching determinista (multi-Excel)

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA y MINISTERIO (filas crudas tal como vienen de los XLSX parseados en frontend)
// ─────────────────────────────────────────────────────────────────────────────

export type PruebaRow = Record<string, any>;
export type MinisterioRow = Record<string, any>;

// ─────────────────────────────────────────────────────────────────────────────
// Tiers y umbrales (ref: matchingService.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type MatchTier = "ALTA" | "REVISAR" | "SIN";

export interface Thresholds {
  alta: number; // 0.85 por defecto
  baja: number; // 0.65 por defecto
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultado de matching (una fila emparejada)
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchRecord {
  // --- PRUEBA ---
  PRUEBA_customer?: string | null;
  PRUEBA_nombre: string;
  PRUEBA_street: string;
  PRUEBA_city: string;
  PRUEBA_cp: string | null;
  PRUEBA_num: string | null;

  // --- MINISTERIO (mejor candidato) ---
  MIN_nombre: string | null;
  MIN_via: string | null;
  MIN_num: string | null;
  MIN_municipio: string | null;
  MIN_cp: string | null;

  // Claves Ministerio solicitadas + fuente de Excel
  MIN_codigo_centro: string | null;  // Columna C (REGCESS/CCN)
  MIN_fecha_autoriz: string | null;  // Columna Y (Fecha última autorización)
  MIN_oferta_asist: string | null;   // Columna AC (Oferta asistencial)
  MIN_source: string | null;         // Nombre del Excel origen

  // Scoring
  SCORE: number;         // 0..1
  TIER: MatchTier;       // "ALTA" | "REVISAR" | "SIN"
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-3 candidatos por cada fila de PRUEBA (para revisión rápida en UI)
// ─────────────────────────────────────────────────────────────────────────────

export interface TopCandidate {
  PRUEBA_nombre: string;
  PRUEBA_cp: string | null;
  PRUEBA_num: string | null;

  CAND_RANK: number;      // 1..3
  CAND_SCORE: number;     // 0..1

  CAND_MIN_nombre: string | null;
  CAND_MIN_via: string | null;
  CAND_MIN_num: string | null;
  CAND_MIN_mun: string | null;
  CAND_MIN_cp: string | null;

  CAND_MIN_codigo_centro: string | null; // C
  CAND_MIN_fecha_autoriz: string | null; // Y
  CAND_MIN_oferta_asist: string | null;  // AC
  CAND_MIN_source: string | null;        // Excel origen
}

// ─────────────────────────────────────────────────────────────────────────────
// Payload que devuelve el motor de matching (y que consume el frontend)
// ─────────────────────────────────────────────────────────────────────────────

export interface MatchOutput {
  matches: MatchRecord[];
  top3: TopCandidate[];
  summary: {
    n_prueba: number;   // nº de filas procesadas (PRUEBA)
    alta: number;
    revisar: number;
    sin: number;
    thresholds: Thresholds;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// (Opcional) Estructuras de apoyo para la UI
// ─────────────────────────────────────────────────────────────────────────────

// Agrupar por customer para el “menú por cliente”
export type MatchesByCustomer = Record<string, MatchRecord[]>;

// Resumen por tier para dashboards rápidos
export interface TierCounters {
  ALTA: number;
  REVISAR: number;
  SIN: number;
}
