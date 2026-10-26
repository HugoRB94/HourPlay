// components/EditorJuego.jsx - Interfaz original con lógica de datos corregida
import { useState } from 'react';
import { X, Save, Star, MessageSquare, BarChart2, Tag, Clock, Minus, Plus } from 'lucide-react';
import { actualizarJuego } from '../servicios/api';
import { useNotificaciones } from '../contextos/NotificacionesContext';

function EditorJuego({ juego, onCerrar, onActualizado }) {
  const { notificar } = useNotificaciones();
  // Estados vinculados a los nombres de tu tabla MySQL
  const [estado, setEstado] = useState(juego.estado || 'pendiente');
  const [prioridad, setPrioridad] = useState(juego.prioridad || 'media');
  const [progreso, setProgreso] = useState(juego.progreso || 0);
  const [nota, setNota] = useState(juego.valoracion || 0);
  const [notasPersonales, setNotasPersonales] = useState(juego.notasPersonales || '');

  // Mantiene la nota entre 0 y 10 y redondeada a un decimal.
  // Acepta coma o punto como separador ("8,6" o "8.6")
  const limitarNota = (valor) => {
    const numero = Number(String(valor).replace(',', '.'));
    if (!Number.isFinite(numero)) return 0;
    return Math.min(10, Math.max(0, Math.round(numero * 10) / 10));
  };
  const cambiarNota = (incremento) => setNota((actual) => limitarNota(limitarNota(actual) + incremento));
  const [duracion, setDuracion] = useState(juego.duracionPrincipal || '');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const datosActualizados = {
        estado,
        prioridad,
        progreso: parseInt(progreso),
        valoracion: limitarNota(nota),
        notasPersonales: notasPersonales,
        duracionPrincipal: duracion === '' ? null : parseInt(duracion)
      };

      const respuesta = await actualizarJuego(juego.id, datosActualizados);

      if (respuesta.exito) {
        onActualizado();
        notificar('Cambios guardados');
        onCerrar();
      } else {
        notificar('Error al guardar: ' + respuesta.mensaje, 'error');
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      notificar('Error de conexión al guardar', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Cabecera con Degradado */}
        <div className="relative h-32 bg-slate-800">
          {juego.caratulaUrl && (
            <img 
              src={juego.caratulaUrl} 
              className="w-full h-full object-cover opacity-30"
              alt="fondo"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
          <button 
            onClick={onCerrar}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900/50 p-2 rounded-full transition-all"
          >
            <X size={20} />
          </button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-normal text-white">{juego.titulo}</h2>
            <p className="text-cyan-400 text-sm">{juego.plataforma}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Estado y Prioridad */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Tag size={14} /> Estado actual
                </label>
                <select 
                  value={estado} 
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="jugando">Jugando</option>
                  <option value="completado">Completado</option>
                  <option value="abandonado">Abandonado</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <BarChart2 size={14} /> Progreso (%)
                </label>
                <input 
                  type="range" min="0" max="100"
                  value={progreso}
                  onChange={(e) => setProgreso(e.target.value)}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <div className="text-right text-xs text-cyan-500 mt-1">{progreso}% completado</div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Clock size={14} /> Duración historia (horas)
                </label>
                <input
                  type="number" min="1" step="1"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Desconocida"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Columna Derecha: Valoración y Prioridad */}
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                  <Star size={14} /> Tu Valoración
                </label>
                {/* Antes el texto "/ 10" quedaba encima de las flechas nativas del
                    input y las tapaba. Ahora usamos botones propios − / + y ocultamos
                    las flechas del navegador, que además apenas se veían en modo oscuro. */}
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl focus-within:border-cyan-500 transition-all">
                  <button
                    type="button"
                    onClick={() => cambiarNota(-0.1)}
                    disabled={limitarNota(nota) <= 0}
                    aria-label="Bajar nota"
                    className="p-3 text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  >
                    <Minus size={18} />
                  </button>
                  <div className="flex-1 flex items-baseline justify-center gap-1">
                    {/* Campo de texto (no type="number") para que se pueda escribir
                        la coma decimal sin que el navegador vacíe el valor */}
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nota}
                      onChange={(e) => setNota(e.target.value.replace(/[^0-9.,]/g, ''))}
                      onBlur={() => setNota(limitarNota(nota))}
                      aria-label="Valoración de 0 a 10"
                      className="w-14 bg-transparent text-white text-lg font-semibold text-center outline-none"
                    />
                    <span className="text-slate-500">/ 10</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => cambiarNota(0.1)}
                    disabled={limitarNota(nota) >= 10}
                    aria-label="Subir nota"
                    className="p-3 text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {/* Vista rápida en estrellas: cada estrella equivale a 2 puntos y se
                    puede pulsar para fijar la nota directamente */}
                <div className="flex justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((estrella) => {
                    const relleno = Math.min(Math.max(limitarNota(nota) / 2 - (estrella - 1), 0), 1);
                    return (
                      <button
                        key={estrella}
                        type="button"
                        onClick={() => setNota(estrella * 2)}
                        aria-label={`Poner ${estrella * 2} de 10`}
                        className="relative text-slate-600 hover:scale-110 transition-transform"
                      >
                        <Star size={20} />
                        <span className="absolute inset-0 overflow-hidden text-yellow-400" style={{ width: `${relleno * 100}%` }}>
                          <Star size={20} fill="currentColor" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-400 text-sm mb-2 block">Prioridad</label>
                <div className="flex gap-2">
                  {['baja', 'media', 'alta'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPrioridad(p)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                        prioridad === p 
                        ? 'bg-cyan-600 text-slate-900' 
                        : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Área de Comentarios */}
          <div className="mt-6">
            <label className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <MessageSquare size={14} /> Notas personales
            </label>
            <textarea 
              value={notasPersonales}
              onChange={(e) => setNotasPersonales(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white h-28 outline-none focus:border-cyan-500 transition-all resize-none"
              placeholder="Escribe aquí tu opinión sobre el juego..."
            ></textarea>
          </div>

          {/* Botón de Guardar */}
          <div className="mt-8">
            <button 
              type="submit" 
              disabled={enviando}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-cyan-900/20 transition-all disabled:opacity-50"
            >
              <Save size={20} />
              {enviando ? 'Sincronizando...' : 'Actualizar Biblioteca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditorJuego;