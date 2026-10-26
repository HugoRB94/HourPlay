// components/FondoDifuminado.jsx
// Fondo ambiental para todas las secciones salvo la página de inicio, que tiene
// su propio mosaico más visible. Para diferenciarlo de la portada:
// - Si hay sesión, usa las carátulas de la biblioteca del usuario (fondo personal).
// - Si no hay sesión o tiene pocas carátulas, usa las portadas populares.
// - Va mucho más difuminado y oscuro, para no competir con tarjetas y gráficas.
import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../contextos/AuthContext';
import { obtenerJuegosUsuario, obtenerPortadasInicio } from '../servicios/api';

// Por debajo de este número de carátulas el mosaico se ve demasiado repetido
const MINIMO_CARATULAS = 6;

// Igual que en el servidor: como va difuminada, la versión recortada de RAWG basta
const imagenReducida = (url) => url.replace('/media/games/', '/media/crop/600/400/games/');

function FondoDifuminado() {
  const { pathname } = useLocation();
  const { usuario } = useContext(AuthContext);
  const [portadas, setPortadas] = useState([]);
  const [fondoVisible, setFondoVisible] = useState(false);

  useEffect(() => {
    let montado = true;

    const cargar = async () => {
      let urls = [];
      if (usuario) {
        try {
          const resultado = await obtenerJuegosUsuario();
          if (resultado.exito && Array.isArray(resultado.datos)) {
            urls = resultado.datos
              .map(juego => juego.caratulaUrl)
              .filter(Boolean)
              .map(imagenReducida);
          }
        } catch {
          // Si falla, seguimos con las portadas populares
        }
      }
      if (urls.length < MINIMO_CARATULAS) {
        urls = await obtenerPortadasInicio();
      }
      if (montado) setPortadas(urls);
    };

    cargar();
    return () => { montado = false; };
  }, [usuario]);

  // La página de inicio ya tiene su propio fondo
  if (pathname === '/' || portadas.length === 0) return null;

  const mosaico = Array.from({ length: 36 }, (_, i) => portadas[i % portadas.length]);

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 -z-10 pointer-events-none overflow-hidden transition-opacity duration-1000 ${fondoVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div className="absolute -inset-[10%] grid grid-cols-3 md:grid-cols-6 gap-3 -rotate-6">
        {mosaico.map((url, i) => (
          <img
            key={i}
            src={url}
            alt=""
            loading={i < 18 ? 'eager' : 'lazy'}
            onLoad={i === 0 ? () => setFondoVisible(true) : undefined}
            className="w-full h-40 md:h-48 object-cover rounded-xl blur-sm opacity-45"
          />
        ))}
      </div>
      {/* Capa oscura uniforme: aquí el contenido ocupa toda la pantalla, no solo el centro */}
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/70" />
    </div>
  );
}

export default FondoDifuminado;
