// VistaPreviaEstadisticas es una maqueta decorativa de la página de Estadísticas
// para la página de inicio. Imita su aspecto (tarjetas de resumen y top géneros)
// con datos de ejemplo, de modo que el visitante vea cómo será su panel sin
// necesidad de capturas de pantalla que habría que actualizar a mano.

import { Gamepad2, Trophy, Target, Clock, BarChart3 } from 'lucide-react';

// Datos de ejemplo con los mismos rótulos que la página real
const RESUMEN_EJEMPLO = [
  { icono: Gamepad2, color: 'text-cyan-400', etiqueta: 'Total juegos', valor: '42' },
  { icono: Trophy, color: 'text-emerald-400', etiqueta: 'Completados', valor: '18' },
  { icono: Target, color: 'text-blue-400', etiqueta: 'Pendientes', valor: '19' },
  { icono: Clock, color: 'text-amber-400', etiqueta: 'Horas de backlog', valor: '236h' }
];

const GENEROS_EJEMPLO = [
  { nombre: 'Aventura', porcentaje: 38 },
  { nombre: 'RPG', porcentaje: 26 },
  { nombre: 'Plataformas', porcentaje: 19 },
  { nombre: 'Indie', porcentaje: 12 }
];

function VistaPreviaEstadisticas() {
  return (
    // Es solo ilustrativa: aria-hidden evita que los lectores de pantalla lean
    // cifras inventadas. La ligera rotación le da aspecto de "captura" flotante
    // y se endereza al pasar el ratón por encima.
    <div aria-hidden="true" className="relative w-full max-w-lg">
      {/* Halo de color detrás de la tarjeta */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-br from-cyan-500/20 to-blue-700/20 blur-3xl rounded-full" />

      <div className="rotate-2 hover:rotate-0 transition-transform duration-500 bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-2xl shadow-cyan-950/50 backdrop-blur">
        <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          Estadísticas
        </p>

        {/* Tarjetas de resumen */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {RESUMEN_EJEMPLO.map((dato) => {
            const Icono = dato.icono;
            return (
              <div key={dato.etiqueta} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60">
                <Icono size={20} className={dato.color} />
                <div>
                  <p className="text-slate-500 text-xs">{dato.etiqueta}</p>
                  <p className="text-lg font-bold">{dato.valor}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Top géneros con barras horizontales */}
        <div className="mt-4 p-4 rounded-xl bg-slate-800/60">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 size={16} className="text-cyan-400" />
            Top géneros
          </p>
          <div className="mt-3 space-y-2">
            {GENEROS_EJEMPLO.map((genero) => (
              <div key={genero.nombre} className="flex items-center gap-3 text-xs">
                <span className="w-20 text-slate-300">{genero.nombre}</span>
                <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-600"
                    style={{ width: `${genero.porcentaje * 2.5}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-500 tabular-nums">{genero.porcentaje}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VistaPreviaEstadisticas;
