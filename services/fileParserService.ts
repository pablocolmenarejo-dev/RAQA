import { Client } from '../types';
import { REQUIRED_COLUMNS } from '../constants';

declare const XLSX: any;

export const parseClientFile = (file: File): Promise<Client[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        if (!e.target?.result) {
          return reject(new Error("File could not be read."));
        }
        
        // Use 'binary' type for strings read with readAsBinaryString
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          return reject(new Error("The file is empty."));
        }

        const headers = Object.keys(json[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

        if (missingColumns.length > 0) {
          return reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
        }

        const clients: Client[] = json.map((row, index) => {
          if (!row.STREET || !row.CITY) {
              throw new Error(`Row ${index + 2} is missing required data in STREET or CITY.`);
          }
          const client: Client = {
            id: index + 1,
            Customer: row.Customer ? String(row.Customer) : undefined,
            STREET: row.STREET,
            CITY: row.CITY,
            INFO_1: row.INFO_1 || undefined,
            INFO_2: row.INFO_2 || undefined,
            CIF_NIF: row.CIF_NIF || undefined,
          };
          return client;
        });

        resolve(clients);
      } catch (err) {
        if(err instanceof Error) {
            reject(new Error(`Error parsing file: ${err.message}`));
        } else {
            reject(new Error('An unknown error occurred during file parsing.'));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Error reading the file."));
    };

    // Use readAsBinaryString for a more robust parsing with SheetJS
    reader.readAsBinaryString(file);
  });
};