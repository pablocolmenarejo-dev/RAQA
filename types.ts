// /types.ts

export type ValidationStatusValue = "Validado" | "No Validado" | "Pendiente de Revisión";

// Se añade 'project_name' a los estados posibles de la aplicación
export type AppStatus = 'idle' | 'enriching' | 'validating' | 'complete' | 'error' | 'project_name';

export type SearchMethod = 'cif' | 'street_keyword' | 'name_keyword' | 'city_broad';

export interface Client {
  id: number;
  Customer?: string;
  STREET: string;
  CITY: string;
  PROVINCIA?: string;
  CCAA?: string;
  INFO_1?: string;
  INFO_2?: string;
  CIF_NIF?: string;
}

export interface PotentialMatch {
  officialName: string;
  officialAddress: string;
  cif?: string;
  serviceType?: string;
  authDate?: string;
  gdpStatus?: string;
  sourceDB: string; // e.g., "REGCESS", "AEMPS"
  evidenceUrl: string;
}

export interface ValidationResult {
  clientId: number;
  status: ValidationStatusValue;
  reason: string;
  officialData?: PotentialMatch;
}
