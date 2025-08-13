// src/App.tsx

import React, { useState } from 'react';
import { findMatches } from './services/matchingService'; // Importamos nuestro "cerebro"
import FileUpload from './components/FileUpload'; // Importamos tu componente para subir ficheros
import './App.css'; // Importamos los estilos

function App() {
  // Estados para guardar los ficheros que el usuario sube
  const [fileOficial, setFileOficial] = useState<File | null>(null);
  const [fileInterno, setFileInterno] = useState<File | null>(null);

  // Estado para guardar la lista de coincidencias que encontremos
  const [matches, setMatches] = useState<any[]>([]);
  // Estado para mostrar un mensaje de "Cargando..." mientras se procesan los datos
  const [isLoading, setIsLoading] = useState(false);

  // Esta función se ejecuta cuando el usuario hace clic en el botón "Analizar"
  const handleAnalyzeClick = async () => {
    if (!fileOficial || !fileInterno) {
      alert('Por favor, sube ambos ficheros para continuar.');
      return;
    }
    setIsLoading(true); // Empezamos a cargar
    setMatches([]); // Limpiamos los resultados de análisis anteriores

    try {
      // ¡Aquí ocurre la magia! Llamamos a nuestro "cerebro" para que encuentre las coincidencias
      const results = await findMatches(fileOficial, fileInterno);
      setMatches(results); // Guardamos los resultados encontrados
    } catch (error) {
      console.error('Ha ocurrido un error durante el análisis:', error);
      alert('Ha ocurrido un error al procesar los ficheros. Revisa la consola para más detalles.');
    } finally {
      setIsLoading(false); // Terminamos de cargar
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Validador de Clientes</h1>
        <p>Sube el fichero oficial y el fichero interno para encontrar coincidencias.</p>
      </header>

      <main className="App-main">
        <div className="file-uploaders">
          {/* Usamos tu componente FileUpload para el fichero oficial */}
          <div className="uploader-container">
            <h2>Fichero Oficial (centros_C1)</h2>
            <FileUpload onFileSelect={setFileOficial} />
          </div>
          {/* Y otra vez para el fichero interno */}
          <div className="uploader-container">
            <h2>Fichero Interno (PRUEBA)</h2>
            <FileUpload onFileSelect={setFileInterno} />
          </div>
        </div>

        <button onClick={handleAnalyzeClick} disabled={!fileOficial || !fileInterno || isLoading}>
          {isLoading ? 'Analizando, por favor espera...' : 'Analizar Coincidencias'}
        </button>

        {/* Si hay resultados, mostramos la tabla */}
        {matches.length > 0 && !isLoading && (
          <div className="results-container">
            <h2>Resultados Encontrados ({matches.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Nivel de Confianza</th>
                  <th>Similitud de Nombre</th>
                  <th>Nombre Oficial</th>
                  <th>Nombre Interno</th>
                  <th>CP Oficial</th>
                  <th>CP Interno</th>
                  <th>Teléfono Oficial</th>
                  <th>Teléfono Interno</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match, index) => (
                  <tr key={index}>
                    <td>{match.nivel_confianza}</td>
                    <td>{match.similitud_nombre}%</td>
                    <td>{match.nombre_oficial}</td>
                    <td>{match.nombre_interno}</td>
                    <td>{match.cp_oficial}</td>
                    <td>{match.cp_interno}</td>
                    <td>{match.tel_oficial}</td>
                    <td>{match.tel_interno}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Si no hay resultados después de analizar, mostramos un mensaje */}
        {matches.length === 0 && !isLoading && fileOficial && fileInterno && (
             <div className="results-container">
                <h2>No se encontraron coincidencias con los criterios actuales.</h2>
             </div>
        )}
      </main>
    </div>
  );
}

export default App;
