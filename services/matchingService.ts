// src/services/matchingService.ts

import Papa from 'papaparse';
import { compareTwoStrings } from 'string-similarity';

// Interfaz para definir la estructura de nuestros datos de centros
interface Centro {
  [key: string]: any; // Permite cualquier clave, ya que los CSV tienen columnas diferentes
  id_interno?: number;
  NOMBRE_COMPLETO_INTERNO?: string;
  NOMBRE_NORMALIZADO?: string;
  CP_NORMALIZADO?: string;
  MUNICIPIO_NORMALIZADO?: string;
  TELEFONO_NORMALIZADO?: string;
}

// --- FUNCIÓN DE LIMPIEZA ---
// Limpia y estandariza el texto para poder compararlo
const normalizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  // A mayúsculas y quitar acentos
  let normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  normalized = normalized.toUpperCase();
  // Quitar palabras comunes
  const commonWords = ['C/', 'CALLE', 'AVDA', 'AVENIDA', 'Pº', 'PASEO', 'CTRA', 'CARRETERA', 'S/N', 'HOSPITAL', 'HOSP', 'CLINICA', 'COMPLEJO', 'UNIVERSITARIO', 'GENERAL', 'SERVICIO DE FARMACIA'];
  commonWords.forEach(word => {
    normalized = normalized.replace(new RegExp(word, 'g'), '');
  });
  // Quitar caracteres especiales y dejar solo letras, números y espacios
  normalized = normalized.replace(/[^\w\s]/g, '');
  // Quitar espacios extra
  return normalized.replace(/\s+/g, ' ').trim();
};

const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, ''); // Quita todo lo que no sea un dígito
};


// --- FUNCIÓN PRINCIPAL DEL CRUCE ---
export const findMatches = async (fileOficial: File, fileInterno: File): Promise<any[]> => {
  console.log("Iniciando el proceso de cruce...");

  // 1. Leer y procesar los ficheros CSV
  const dataOficial = await parseCsv(fileOficial);
  const dataInterno = await parseCsv(fileInterno);

  // 2. Normalizar los datos en ambos listados
  const centrosOficiales: Centro[] = dataOficial.map(row => ({
    ...row,
    NOMBRE_NORMALIZADO: normalizeText(row['Nombre Centro']),
    CP_NORMALIZADO: String(row['Código Postal'] || ''),
    MUNICIPIO_NORMALIZADO: normalizeText(row['Municipio']),
    TELEFONO_NORMALIZADO: normalizePhone(row['Teléfono']),
  }));

  const centrosInternos: Centro[] = dataInterno.map((row, index) => {
    const nombreCompleto = `${row['INFO_1'] || ''} ${row['INFO_2'] || ''} ${row['INFO_3'] || ''}`;
    return {
      ...row,
      id_interno: index, // ID único para no repetirlo
      NOMBRE_COMPLETO_INTERNO: nombreCompleto.trim(),
      NOMBRE_NORMALIZADO: normalizeText(nombreCompleto),
      CP_NORMALIZADO: String(row['PostalCode'] || '').replace('.0', ''),
      MUNICIPIO_NORMALIZADO: normalizeText(row['CITY']),
      TELEFONO_NORMALIZADO: normalizePhone(row['Telephone 1']),
    }
  });

  // 3. Lógica de cruce por niveles
  const coincidencias: any[] = [];
  const indicesInternosUsados = new Set<number>();

  // Función para añadir una coincidencia y marcarla como usada
  const addMatch = (oficial: Centro, interno: Centro, nivel: string, similitud: number) => {
      if (indicesInternosUsados.has(interno.id_interno!)) return;
      coincidencias.push({
          nivel_confianza: nivel,
          similitud_nombre: Math.round(similitud * 100),
          nombre_oficial: oficial['Nombre Centro'],
          nombre_interno: interno['NOMBRE_COMPLETO_INTERNO'],
          cp_oficial: oficial['Código Postal'],
          cp_interno: interno['PostalCode'],
          tel_oficial: oficial['Teléfono'],
          tel_interno: interno['Telephone 1'],
      });
      indicesInternosUsados.add(interno.id_interno!);
  };

  // Bucle principal para comparar cada centro oficial con todos los internos
  for (const oficial of centrosOficiales) {
    for (const interno of centrosInternos) {
      if (indicesInternosUsados.has(interno.id_interno!)) continue; // Saltar si ya tiene una coincidencia

      // Nivel 1: CP + Teléfono (Alta Confianza)
      if (oficial.TELEFONO_NORMALIZADO && oficial.TELEFONO_NORMALIZADO === interno.TELEFONO_NORMALIZADO && oficial.CP_NORMALIZADO === interno.CP_NORMALIZADO) {
        addMatch(oficial, interno, 'ALTA (CP + Teléfono)', 1);
        break; // Coincidencia encontrada, pasar al siguiente centro oficial
      }

      // Nivel 2: CP + Nombre Similar (Fuerte Confianza)
      if (oficial.CP_NORMALIZADO === interno.CP_NORMALIZADO) {
        const similitud = compareTwoStrings(oficial.NOMBRE_NORMALIZADO!, interno.NOMBRE_NORMALIZADO!);
        if (similitud > 0.85) {
          addMatch(oficial, interno, 'FUERTE (CP + Nombre Similar)', similitud);
          break; 
        }
      }

      // Nivel 3: Municipio + Nombre Similar (Media Confianza)
      if (oficial.MUNICIPIO_NORMALIZADO && oficial.MUNICIPIO_NORMALIZADO === interno.MUNICIPIO_NORMALIZADO) {
        const similitud = compareTwoStrings(oficial.NOMBRE_NORMALIZADO!, interno.NOMBRE_NORMALIZADO!);
        if (similitud > 0.85) {
           addMatch(oficial, interno, 'MEDIA (Municipio + Nombre Similar)', similitud);
           break;
        }
      }
    }
  }

  console.log(`Proceso finalizado. Se encontraron ${coincidencias.length} coincidencias.`);
  return coincidencias;
};


// --- FUNCIÓN AUXILIAR PARA LEER CSVs ---
const parseCsv = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
        });
    });
};
