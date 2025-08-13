import { Client } from '../types';

declare const XLSX: any;

// Mapeo de posibles nombres de columnas en los archivos de origen a los nombres internos que usa la app.
const COLUMN_MAP: { [key: string]: keyof Client | string } = {
    // Para el archivo de clientes del usuario
    'STREET': 'STREET',
    'CITY': 'CITY',
    'INFO_1': 'INFO_1',
    'INFO_2': 'INFO_2',
    'CIF_NIF': 'CIF_NIF',
    'Customer': 'Customer',

    // Para los archivos de la base de datos del gobierno (REGESS)
    'Nombre de la vía': 'STREET',
    'Municipio': 'CITY',
    'Nombre Centro': 'INFO_1',
    'Código Autonómico\ndel Centro': 'codigoAutonomico',
    'Fecha de última \nAutorización': 'fechaUltimaAutorizacion',
    'Dependencia \nFuncional': 'dependenciaFuncional',
    'Correo \nElectrónico': 'correoElectronico',
    'Número \nCamas': 'numeroCamas'
    // Añade aquí más mapeos si otros archivos tienen nombres de columna diferentes
};

/**
 * Parsea un archivo Excel (o similar) a un array de objetos JSON.
 * Es lo suficientemente inteligente como para encontrar la fila de encabezado y mapear las columnas.
 */
export const parseClientFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) {
          return reject(new Error("No se pudo leer el archivo."));
        }
        
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // --- Lógica Inteligente para Encontrar el Encabezado ---
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        let headerRowIndex = -1;

        // Buscamos la fila que contenga 'STREET' o 'Nombre de la vía'
        for (let R = range.s.r; R <= range.e.r; ++R) {
            const cellAddress = XLSX.utils.encode_cell({c: 0, r: R});
            const firstCell = worksheet[cellAddress];
            
            // Heurística: si una fila contiene alguna de estas cabeceras clave, es la buena.
            const rowAsJson = XLSX.utils.sheet_to_json(worksheet, { range: R, header: 1 });
            if (rowAsJson.length > 0) {
                const headers = rowAsJson[0] as string[];
                if (headers.includes('STREET') || headers.includes('Nombre de la vía') || headers.includes('Nombre Centro')) {
                    headerRowIndex = R;
                    break;
                }
            }
        }

        if (headerRowIndex === -1) {
            // Si no lo encontramos, asumimos que es la primera fila por defecto.
            headerRowIndex = 0;
        }
        
        // Convertimos la hoja a JSON empezando desde la fila de encabezado correcta.
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

        if (jsonData.length === 0) {
          return reject(new Error("El archivo está vacío o no se encontraron datos."));
        }

        // --- Mapeo de Columnas ---
        const mappedData = jsonData.map((row, index) => {
            const newRow: { [key: string]: any } = { id: index + 1 };
            for (const key in row) {
                if (COLUMN_MAP[key]) {
                    const newKey = COLUMN_MAP[key];
                    newRow[newKey] = row[key];
                } else {
                    // Mantenemos las columnas que no están en el mapa por si son útiles
                    newRow[key] = row[key];
                }
            }
            return newRow;
        });

        // Verificación final para el archivo de clientes
        if (file.name.toLowerCase().includes('cliente')) { // Asumimos que el archivo de clientes tiene "cliente" en el nombre
            const firstClient = mappedData[0];
            if (!firstClient.STREET || !firstClient.CITY) {
                return reject(new Error(`El archivo de clientes debe contener las columnas 'STREET' y 'CITY'.`));
            }
        }

        resolve(mappedData);

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido al procesar el archivo.';
        console.error("Error en parseClientFile:", message);
        reject(new Error(message));
      }
    };

    reader.onerror = () => {
      reject(new Error("Hubo un error al leer el archivo."));
    };

    reader.readAsBinaryString(file);
  });
};
