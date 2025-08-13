// /types.ts

export type ValidationStatusValue = "Validado" | "No Validado" | "Pendiente de Revisión";

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
  // Añadimos INFO_3 para que coincida con los datos de entrada
  INFO_3?: string; 
  CIF_NIF?: string;
}

export interface PotentialMatch {
  officialName: string;
  officialAddress: string;
  cif?: string;
  serviceType?: string;
  authDate?: string;
  gdpStatus?: string;
  sourceDB: string;
  evidenceUrl: string;
  codigoAutonomico?: string;
  fechaUltimaAutorizacion?: string;
  // Añadimos la razón de la coincidencia para mostrarla en la UI
  reason: string; 
}

export interface ValidationResult {
  clientId: number;
  status: ValidationStatusValue;
  reason: string;
  officialData?: PotentialMatch;
}
