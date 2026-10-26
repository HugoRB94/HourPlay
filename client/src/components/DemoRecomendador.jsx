// DemoRecomendador es una versión de muestra del recomendador para la página de inicio.
// Su objetivo es que el visitante entienda la idea de HourPlay en pocos segundos,
// sin necesidad de registrarse. Funciona con una biblioteca de ejemplo fija, así que
// no hace peticiones al servidor ni necesita sesión.

import { useState } from 'react';
import { Clock, Sparkles, Gamepad2 } from 'lucide-react';

// Mismas opciones de tiempo que el recomendador real (en horas)
const OPCIONES_TIEMPO = [
  { etiqueta: '1 hora', horas: 1 },
  { etiqueta: '2 horas', horas: 2 },
  { etiqueta: '4 horas', horas: 4 },
  { etiqueta: 'Todo el día', horas: 8 }
];

// Biblioteca de ejemplo. Las duraciones son aproximadas (historia principal) y
// cada juego indica para qué sesión es la mejor opción y por qué, con el mismo
// tipo de explicación que genera el servidor en rutas/recomendador.js
const BIBLIOTECA_EJEMPLO = [
  {
    titulo: 'Inside',
    duracion: 3.5,
    progreso: 75,
    color: 'from-amber-500 to-orange-700',
    paraSesion: 1,
    razon: 'Te quedan aproximadamente 50 min para terminarlo: ¡en tu sesión de 1 h puedes acabarlo hoy!'
  },
  {
    titulo: 'What Remains of Edith Finch',
    duracion: 2,
    progreso: 0,
    color: 'from-emerald-500 to-teal-700',
    paraSesion: 2,
    razon: 'Su historia dura aproximadamente 2 h: cabe entera en tu sesión de 2 h.'
  },
  {
    titulo: 'Hollow Knight',
    duracion: 27,
    progreso: 40,
    color: 'from-indigo-500 to-violet-700',
    paraSesion: 4,
    razon: 'Ya lo estás jugando (40% completado). Con 4 h avanzarás aproximadamente un 25% más.'
  },
  {
    titulo: 'Celeste',
    duracion: 8,
    progreso: 0,
    color: 'from-pink-500 to-rose-700',
    paraSesion: 8,
    razon: 'Su historia dura aproximadamente 8 h: cabe entera en tu sesión de 8 h.'
  }
];

function DemoRecomendador() {
  // Sesión elegida por el visitante (null hasta que pulsa una opción)
  const [horasElegidas, setHorasElegidas] = useState(null);
  const elegido = BIBLIOTECA_EJEMPLO.find(juego => juego.paraSesion === horasElegidas);

  return (
    <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur">

      {/* Selector de tiempo disponible */}
      <div className="flex items-center gap-2 text-slate-300 font-semibold">
        <Clock size={20} className="text-cyan-400" />
        ¿Cuánto tiempo tienes hoy?
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {OPCIONES_TIEMPO.map(opcion => (
          <button
            key={opcion.horas}
            onClick={() => setHorasElegidas(opcion.horas)}
            aria-pressed={horasElegidas === opcion.horas}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
              horasElegidas === opcion.horas
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-cyan-500 hover:text-white'
            }`}
          >
            {opcion.etiqueta}
          </button>
        ))}
      </div>

      {/* Biblioteca de ejemplo: el juego recomendado se resalta y el resto se atenúa */}
      <p className="mt-6 text-xs uppercase tracking-wider text-slate-500">Biblioteca de ejemplo</p>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
        {BIBLIOTECA_EJEMPLO.map(juego => {
          const destacado = elegido?.titulo === juego.titulo;
          return (
            <div
              key={juego.titulo}
              className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
                destacado
                  ? 'border-cyan-400 scale-105 shadow-lg shadow-cyan-900/40'
                  : elegido ? 'border-slate-800 opacity-40' : 'border-slate-800'
              }`}
            >
              {/* Carátula simulada con degradado para no depender de imágenes externas */}
              <div className={`h-24 bg-gradient-to-br ${juego.color} flex items-center justify-center`}>
                <Gamepad2 size={32} className="text-white/70" />
              </div>
              <div className="p-3 bg-slate-900">
                <p className="text-sm font-bold truncate" title={juego.titulo}>{juego.titulo}</p>
                <p className="text-xs text-slate-400">~{juego.duracion} h · {juego.progreso}%</p>
                <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500" style={{ width: `${juego.progreso}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explicación de la recomendación (aria-live para que se anuncie al cambiar) */}
      <div aria-live="polite" className="mt-6 min-h-[3.5rem]">
        {elegido ? (
          <p className="flex gap-2 text-slate-200">
            <Sparkles size={20} className="text-cyan-400 shrink-0 mt-0.5" />
            <span><strong>{elegido.titulo}</strong>. {elegido.razon}</span>
          </p>
        ) : (
          <p className="text-slate-500">Elige un tiempo y te diremos qué juego encaja mejor.</p>
        )}
      </div>
    </div>
  );
}

export default DemoRecomendador;
