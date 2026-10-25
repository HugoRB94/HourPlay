import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contextos/AuthContext';

function RutaProtegida({ children }) {
  const { usuario, cargando } = useContext(AuthContext);

  // Mientras el contexto está preguntando al servidor (fetch),
  // mostramos un estado de carga para evitar redirecciones falsas.
  if (cargando) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-cyan-400">Verificando acceso...</div>;
  }

  // Si ya terminó de cargar y no hay usuario, entonces sí redirigimos al login.
  if (!usuario) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default RutaProtegida;