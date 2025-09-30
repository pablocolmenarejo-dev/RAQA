// /components/LoginScreen.tsx

import React, { useState } from 'react';
// Se ha eliminado el icono LogIn para un diseño más limpio.

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const HARDCODED_USERNAME = 'admin';
  const HARDCODED_PASSWORD = 'PharmaValidator2025!';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === HARDCODED_USERNAME && password === HARDCODED_PASSWORD) {
      setError(null);
      onLoginSuccess(username);
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  // Estilos en línea para reflejar la identidad de Meisys
  const styles: { [key: string]: React.CSSProperties } = {
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f7f9', // Un fondo gris muy claro
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      padding: '40px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    },
    header: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      alignItems: 'center',
    },
    logo: {
      height: '48px',
      width: 'auto',
    },
    title: {
      marginTop: '16px',
      fontSize: '24px',
      fontWeight: 600,
      color: '#0d2f5a', // Azul oscuro para el texto principal
      textAlign: 'center' as 'center',
    },
    subtitle: {
        color: '#5a7184', // Un gris azulado para el texto secundario
        fontSize: '14px',
    },
    form: {
      marginTop: '32px',
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '18px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '16px',
      color: '#333333',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dde2e7',
      borderRadius: '8px',
      boxSizing: 'border-box' as 'border-box',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    },
    button: {
      width: '100%',
      padding: '14px',
      fontSize: '16px',
      fontWeight: 600,
      color: '#ffffff',
      backgroundColor: '#005a9e', // Azul corporativo de Meisys
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
    },
    error: {
      fontSize: '14px',
      color: '#c62828',
      textAlign: 'center' as 'center',
      marginTop: '16px',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
            <img src="/meisys-logo.webp" alt="Meisys Logo" style={styles.logo} />
            <h1 style={styles.title}>
                Meisys Client Validator
            </h1>
          <p style={styles.subtitle}>Por favor, inicia sesión para continuar</p>
        </div>
        <form style={styles.form} onSubmit={handleLogin}>
          <div>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              style={styles.input}
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={styles.input}
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p style={styles.error}>{error}</p>
          )}

          <div>
            <button
              type="submit"
              style={styles.button}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#004a8d'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#005a9e'}
            >
              Acceder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
