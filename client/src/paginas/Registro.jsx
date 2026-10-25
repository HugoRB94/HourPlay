import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
// Importamos el contexto para poder avisarle al sistema que ya estamos logueados
import { AuthContext } from '../contextos/AuthContext';
import { API_URL } from '../servicios/api';

function Registro() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Extraemos setUsuario del contexto global de autenticación
  const { setUsuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // La comunicación con la API RESTful del servidor se realiza mediante Fetch.
      // Al establecer la propiedad credentials como include, el navegador gestiona 
      // automáticamente la recepción de la cookie de sesión que emite el backend.
      const respuesta = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ nombre, email, password })
      });

      const datos = await respuesta.json();

      if (datos.exito) {
        // ACTUALIZACIÓN DEL ESTADO GLOBAL:
        // Una vez que el backend confirma la creación del usuario y la sesión,
        // actualizamos manualmente el estado del AuthContext. Esto garantiza que
        // los componentes protegidos (como MiBiblioteca) reconozcan al usuario
        // de forma inmediata sin necesidad de una recarga completa de la página.
        setUsuario({ 
          id: datos.usuario?.id || 'id-provisional',
          nombre: nombre 
        });

        // Redirigimos directamente a la biblioteca para confirmar el acceso
        navigate('/biblioteca');
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
        <h2 className="text-3xl text-center mb-8 font-normal">Crear cuenta en HourPlay</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={manejarEnvio} className="space-y-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Nombre o Alias</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-500" size={20} />
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="Tu nombre en HourPlay"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
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
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-normal py-3 rounded-lg transition-colors mt-4"
          >
            Registrarme y Entrar
          </button>
        </form>

        <p className="text-slate-400 text-sm text-center mt-6">
          ¿Ya tienes una cuenta? <Link to="/login" className="text-cyan-400 hover:text-cyan-300">Inicia sesión aquí</Link>
        </p>
      </div>
    </div>
  );
}

export default Registro;