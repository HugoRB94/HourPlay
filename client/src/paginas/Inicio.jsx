import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, obtenerPortadasInicio } from '../servicios/api';

// Este componente representa la página de inicio (landing page) de HourPlay.
// Su propósito es presentar el proyecto a usuarios que aún no han iniciado sesión,
// explicando qué es la aplicación y motivándolos a registrarse.
// He separado esta página en un componente independiente para seguir el principio
// de responsabilidad única y facilitar el mantenimiento del código.

function Home() {
  // Utilizo el hook useNavigate de React Router para poder redirigir al usuario
  // programáticamente después de comprobar su estado de sesión en el servidor.
  const navigate = useNavigate();

  // Defino estas constantes para mantener el contenido textual separado de la lógica,
  // lo que facilita futuros cambios sin modificar la estructura del componente.
  // Esta práctica es especialmente útil si en el futuro se implementa multiidioma.
  const nombreApp = "HourPlay";
  const descripcionApp = "Tu gestor de videojuegos inteligente";
  const textoBoton = "Empezar a organizar mi biblioteca";

  // Portadas para el mosaico decorativo del fondo. Si la petición falla la
  // lista queda vacía y la página se muestra igual que antes, sin fondo.
  const [portadas, setPortadas] = useState([]);
  const [fondoVisible, setFondoVisible] = useState(false);

  useEffect(() => {
    let montado = true;
    obtenerPortadasInicio().then((urls) => {
      if (montado) setPortadas(urls);
    });
    return () => { montado = false; };
  }, []);

  // Repetimos las portadas hasta tener suficientes para cubrir la pantalla
  const mosaico = portadas.length > 0
    ? Array.from({ length: 36 }, (_, i) => portadas[i % portadas.length])
    : [];

  // He implementado esta función asíncrona para gestionar la acción principal del botón.
  // En lugar de hacer una redirección estática, realizo una petición al endpoint protegido.
  // Si el servidor valida la cookie de sesión (responde 200 OK), el usuario tiene una sesión 
  // activa y lo dirijo a su biblioteca. Si falla (401 Unauthorized), lo redirijo al login.
  const manejarEntrada = async () => {
    try {
      const respuesta = await fetch(`${API_URL}/juegos`, {
        method: 'GET',
        credentials: 'include' // Fundamental para enviar la cookie de sesión automáticamente
      });

      if (respuesta.ok) {
        navigate('/biblioteca');
      } else {
        navigate('/login');
      }
    } catch (error) {
      // Como medida de seguridad y buena experiencia de usuario (UX),
      // ante cualquier caída de red, el flujo por defecto es la pantalla de autenticación.
      navigate('/login');
    }
  };

  return (
    // Utilizo flexbox con dirección de columna para centrar el contenido tanto
    // vertical como horizontalmente. El padding superior (pt-16) compensa la altura
    // de la barra de navegación fija para evitar que el contenido quede oculto.
    // El padding horizontal (px-4) asegura márgenes en dispositivos móviles.
    // 'relative isolate overflow-hidden' crea un contexto propio para que el
    // mosaico del fondo quede detrás del contenido y no desborde la pantalla.
    <main className="relative isolate overflow-hidden flex flex-col items-center justify-center min-h-screen pt-16 px-4">

      {/* Fondo decorativo: mosaico de portadas difuminadas */}
      {/* Es puramente estético (aria-hidden y alt vacío) para no molestar a los
          lectores de pantalla. Las portadas se difuminan, se oscurecen y se
          cubren con un degradado para que el contenido siga leyéndose con claridad.
          Aparece con un fundido suave cuando termina de cargar la primera imagen. */}
      {mosaico.length > 0 && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 -z-10 pointer-events-none transition-opacity duration-1000 ${fondoVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="absolute -inset-[10%] grid grid-cols-3 md:grid-cols-6 gap-3 -rotate-6">
            {mosaico.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                loading={i < 18 ? 'eager' : 'lazy'}
                onLoad={i === 0 ? () => setFondoVisible(true) : undefined}
                className="w-full h-40 md:h-48 object-cover rounded-xl blur-[2px] opacity-50"
              />
            ))}
          </div>
          {/* Capas de oscurecimiento: viñeta radial en el centro (donde está el texto)
              y degradado vertical para fundirse con el resto de la aplicación */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(2,6,23,0.8)_0%,_rgba(2,6,23,0.5)_45%,_rgba(2,6,23,0.2)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-slate-950/90" />
        </div>
      )}

      {/* Título principal con gradiente de color */}
      {/* He aplicado text-6xl como tamaño base y md:text-7xl para pantallas medianas,
          implementando así un diseño responsive que se adapta al tamaño del dispositivo.
          El gradiente (from-cyan-400 to-blue-600) se logra con bg-gradient-to-r
          combinado con text-transparent y bg-clip-text, una técnica moderna de CSS
          que mejora la presentación visual sin sacrificar accesibilidad. */}
      {/* pb-3 evita que bg-clip-text recorte la parte inferior de letras como la "y" */}
      <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 text-center pb-3">
        {nombreApp}
      </h1>

      {/* Descripción secundaria */}
      {/* El color slate-400 proporciona un contraste suave pero legible sobre el fondo oscuro.
          El max-w-2xl limita el ancho del texto para mejorar la legibilidad según
          principios de diseño tipográfico (líneas no demasiado largas). */}
      <p className="mt-6 text-slate-400 text-xl font-medium max-w-2xl text-center leading-relaxed">
        {descripcionApp}
      </p>

      {/* Call-to-Action (CTA) principal */}
      {/* Este botón es el elemento más importante de la landing page, ya que
          dirige a los usuarios hacia el registro/login. Por eso he aplicado:
          - El evento onClick que dispara la función de validación de sesión
          - Un gradiente llamativo que coincide con la paleta de colores del título
          - Sombra (shadow-lg) con tinte cyan para dar profundidad
          - Efecto hover que cambia el gradiente y escala el botón (scale-105)
          - Transición suave (transition-all) para mejorar la experiencia de usuario
          - Esquinas redondeadas (rounded-full) para un diseño moderno */}
      <button 
        onClick={manejarEntrada}
        className="mt-10 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 rounded-full font-bold text-lg shadow-lg shadow-cyan-900/20 transform hover:scale-105 transition-all"
      >
        {textoBoton}
      </button>
    </main>
  );
}

// Exporto el componente como default para poder importarlo fácilmente
// desde otros archivos usando: import Home from './pages/Home'
export default Home;