// En un nuevo archivo: services/externalDataService.ts

declare const XLSX: any;

const EXCEL_URLS = {
    centros: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C1',
    consultas: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C2',
    depositos: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C3',
    psicotropos: 'https://regcess.mscbs.es/regcessWeb/descargaCentrosAction.do?codTipoCentro=C3'
};

// Función para parsear un buffer de archivo a JSON
const parseExcelToJson = (arrayBuffer: ArrayBuffer): any[] => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
};

// Función principal del servicio
export const fetchAndParseExternalDatabases = async (): Promise<any> => {
    try {
        const [centrosRes, consultasRes, depositosRes, psicotroposRes] = await Promise.all([
            fetch(EXCEL_URLS.centros),
            fetch(EXCEL_URLS.consultas),
            fetch(EXCEL_URLS.depositos),
            fetch(EXCEL_URLS.psicotropos)
        ]);

        const [centrosBuffer, consultasBuffer, depositosBuffer, psicotroposBuffer] = await Promise.all([
            centrosRes.arrayBuffer(),
            consultasRes.arrayBuffer(),
            depositosRes.arrayBuffer(),
            psicotroposRes.arrayBuffer()
        ]);
        
        return {
            centros: parseExcelToJson(centrosBuffer),
            consultas: parseExcelToJson(consultasBuffer),
            depositos: parseExcelToJson(depositosBuffer),
            psicotropos: parseExcelToJson(psicotroposBuffer)
        };
    } catch (error) {
        console.error("Error al descargar o procesar las bases de datos externas:", error);
        throw new Error("No se pudieron cargar las bases de datos de validación. Inténtalo de nuevo.");
    }
};
