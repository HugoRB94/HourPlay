// BotonesSociales.jsx - Acceso con Google, Apple, Facebook y GitHub
// Cada botón es un enlace normal al servidor, que se encarga de todo el flujo
// OAuth y devuelve al usuario ya autenticado a /biblioteca. Por eso sirve igual
// para iniciar sesión que para registrarse: si la cuenta no existe, se crea.

import { useEffect, useState } from 'react';
import { API_URL } from '../servicios/api';

// Logotipos oficiales en SVG (lucide-react no incluye iconos de marcas)
const LogoGoogle = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.48 0-.72-.06-1.41-.18-2.03H12z" />
    <path fill="#34A853" d="M5.27 14.29l-.74.57-2.64 2.05C3.57 20.2 7.5 22.5 12 22.5c3.04 0 5.6-1 7.46-2.73l-3.3-2.56c-.9.6-2.06.97-4.16.97-3.2 0-5.9-2.16-6.87-5.07z" />
    <path fill="#4A90E2" d="M1.89 7.09A10.4 10.4 0 0 0 1.5 12c0 1.7.41 3.3 1.13 4.73 0 .01 3.39-2.63 3.39-2.63-.2-.6-.32-1.24-.32-1.9 0-.67.12-1.3.32-1.9z" />
    <path fill="#FBBC05" d="M12 5.98c1.66 0 3.13.57 4.3 1.68l3.22-3.22C17.6 2.66 15.04 1.5 12 1.5 7.5 1.5 3.57 3.8 1.89 7.09l3.48 2.7C6.35 6.88 9.03 5.98 12 5.98z" />
  </svg>
);

const LogoApple = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M16.37 1.43c0 1.14-.42 2.2-1.25 3.08-.9.94-1.99 1.48-3.17 1.39a3.2 3.2 0 0 1-.02-.39c0-1.09.47-2.26 1.31-3.14.42-.45.95-.83 1.6-1.13.64-.29 1.25-.45 1.82-.48.01.22.01.45.01.67zm4.24 15.9c-.36.82-.78 1.58-1.27 2.28-.67.95-1.22 1.6-1.64 1.97-.65.6-1.35.9-2.1.92-.54 0-1.19-.15-1.95-.46-.76-.31-1.46-.46-2.1-.46-.67 0-1.39.15-2.16.46-.77.31-1.39.47-1.86.49-.72.03-1.44-.28-2.15-.95-.46-.4-1.03-1.08-1.71-2.05-.73-1.03-1.33-2.22-1.8-3.58-.5-1.47-.76-2.88-.76-4.26 0-1.58.34-2.94 1.02-4.08a6 6 0 0 1 2.14-2.17 5.76 5.76 0 0 1 2.9-.82c.57 0 1.32.18 2.25.53.93.35 1.52.52 1.78.52.2 0 .86-.2 1.98-.62 1.06-.38 1.95-.54 2.68-.48 1.98.16 3.47.94 4.46 2.35-1.77 1.07-2.65 2.58-2.63 4.51.02 1.51.56 2.76 1.63 3.75.48.46 1.02.81 1.62 1.06-.13.38-.27.74-.42 1.09z" />
  </svg>
);

const LogoFacebook = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
  </svg>
);

const LogoGitHub = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .5z" />
  </svg>
);

const PROVEEDORES = [
  { id: 'google', nombre: 'Google', logo: <LogoGoogle /> },
  { id: 'apple', nombre: 'Apple', logo: <LogoApple /> },
  { id: 'facebook', nombre: 'Facebook', logo: <LogoFacebook /> },
  { id: 'github', nombre: 'GitHub', logo: <LogoGitHub /> },
];

function BotonesSociales() {
  // Proveedores con claves configuradas en el servidor; los demás se muestran desactivados
  const [disponibles, setDisponibles] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/auth/proveedores`, { credentials: 'include' })
      .then((respuesta) => respuesta.json())
      .then((datos) => setDisponibles(datos.proveedores || []))
      .catch(() => setDisponibles([]));
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-slate-500 text-sm">o continúa con</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {PROVEEDORES.map(({ id, nombre, logo }) => {
          const activo = disponibles.includes(id);
          const clases = 'flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-lg py-3 text-sm transition-colors';

          return activo ? (
            <a key={id} href={`${API_URL}/auth/oauth/${id}`} className={`${clases} hover:border-cyan-400 hover:bg-slate-700`}>
              {logo}
              {nombre}
            </a>
          ) : (
            <span key={id} className={`${clases} opacity-40 cursor-not-allowed`} title={`${nombre} no está configurado en el servidor`}>
              {logo}
              {nombre}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default BotonesSociales;
