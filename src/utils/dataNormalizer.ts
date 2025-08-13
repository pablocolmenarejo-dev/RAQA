// Lista de palabras comunes a eliminar de las direcciones y nombres
const STOP_WORDS = [
    'C/', 'CL', 'CALLE', 'AV', 'AVDA', 'AVENIDA', 'Pº', 'PASEO', 'PL', 'PLAZA', 'TRVA', 'TRAVESIA', 
    'S/N', 'DE', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'A', 'DEL'
];

/**
 * Normaliza una cadena de texto para facilitar las comparaciones.
 * 1. Convierte a mayúsculas.
 * 2. Elimina acentos y diéresis.
 * 3. Elimina signos de puntuación.
 * 4. Elimina palabras comunes (stop words).
 * @param text El texto a normalizar.
 * @returns El texto normalizado.
 */
export const normalizeText = (text: string | undefined | null): string => {
    if (!text) return '';

    // 1. Convertir a mayúsculas y quitar acentos/diéresis
    let normalized = text
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // 2. Eliminar puntuación
    normalized = normalized.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

    // 3. Eliminar stop words
    const words = normalized.split(/\s+/);
    const filteredWords = words.filter(word => !STOP_WORDS.includes(word) && word.length > 0);
    
    return filteredWords.join(' ');
};

/**
 * Extrae la palabra clave más significativa (generalmente la más larga) de un texto.
 * @param text El texto del que extraer la palabra clave.
 * @returns La palabra clave principal.
 */
export const getKeyword = (text: string | undefined | null): string => {
    const normalized = normalizeText(text);
    if (!normalized) return '';

    const words = normalized.split(' ');
    // Devuelve la palabra más larga como la más representativa
    return words.sort((a, b) => b.length - a.length)[0] || '';
};
