// /components/LoginScreen.tsx

import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

interface LoginScreenProps {
  // La función ahora aceptará el nombre de usuario como argumento
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
      // Pasamos el nombre de usuario al iniciar sesión con éxito
      onLoginSuccess(username);
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col items-center">
            <img src="/meisys-logo.webp" alt="Meisys Logo" className="h-12 w-auto" />
            <h1 className="mt-4 text-2xl font-bold text-center text-[#333333]">
                Meisys Client Validator
            </h1>
          <p className="text-sm text-gray-600">Por favor, inicia sesión para continuar</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">Usuario</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                autoComplete="username"
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] focus:z-10 sm:text-sm"
                placeholder="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-[#00AEEF] focus:border-[#00AEEF] focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-center text-red-600">{error}</p>
          )}

          <div>
            <button
              type="submit"
              className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-[#00338D] border border-transparent rounded-md group hover:brightness-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00AEEF]"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Acceder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
