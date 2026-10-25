// paginas/Login.jsx
import React, { useState } from 'react';
import { User, Lock } from 'lucide-react';
import { API_URL } from '../servicios/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Vital para recibir la cookie
        body: JSON.stringify({ email, password })
      });

      const datos = await respuesta.json();

      if (datos.exito) {
        // SUSTITUIMOS navigate por window.location.href
        // Esto fuerza una recarga completa y asegura que el Navbar 
        // y el resto de la App detecten la sesión activa.
        window.location.href = '/'; 
      } else {
        setError(datos.mensaje);
      }
    } catch (error) {
      setError('Error de conexión con el servidor. Inténtalo más tarde.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md text-white">
        <h2 className="text-3xl text-center mb-8 font-normal text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Iniciar Sesión
        </h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Correo Electrónico</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="tu@correo.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all mt-4 shadow-lg shadow-cyan-900/20"
          >
            Entrar a mi Biblioteca
          </button>
        </form>

        <p className="text-slate-400 text-sm text-center mt-6">
          ¿No tienes cuenta? <a href="/registro" className="text-cyan-400 hover:text-cyan-300 transition-colors">Regístrate aquí</a>
        </p>
      </div>
    </div>
  );
}

export default Login;