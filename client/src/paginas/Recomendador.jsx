// paginas/Recomendador.jsx - Motor de recomendación inteligente
// Esta es LA FUNCIONALIDAD ESTRELLA de HourPlay que lo diferencia de otros
// gestores de backlog. El usuario indica cuánto tiempo tiene disponible
// y el sistema le recomienda el juego más adecuado de su biblioteca.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Sparkles, Dice6, RefreshCw, Gamepad2, Check } from 'lucide-react';
import { obtenerRecomendacion, obtenerRecomendacionAleatoria, actualizarJuego } from '../servicios/api';

// Opciones de tiempo predefinidas (en minutos)
const OPCIONES_TIEMPO = [
  { etiqueta: '1 hora', minutos: 60, icono: '⏱️', descripcion: 'Sesión rápida' },
  { etiqueta: '2 horas', minutos: 120, icono: '🎮', descripcion: 'Sesión normal' },
  { etiqueta: '4 horas', minutos: 240, icono: '🕐', descripcion: 'Tarde gaming' },
  { etiqueta: 'Todo el día', minutos: 480, icono: '🌅', descripcion: 'Maratón épica' }
];

function Recomendador() {
  const navigate = useNavigate();

  // La identidad del usuario la resuelve el servidor a partir de la cookie de
  // sesión, por lo que el cliente no necesita conocer ni enviar su ID.
  const [recomendacion, setRecomendacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  // Modo activo: { tipo: 'tiempo', minutos } o { tipo: 'sorpresa' }
  const [modo, setModo] = useState(null);
  const [marcandoJugando, setMarcandoJugando] = useState(false);
  const [marcadoJugando, setMarcadoJugando] = useState(false);

  // Lanza la petición según el modo. 'excluirId' evita repetir el juego actual
  // cuando el usuario pide otra sugerencia.
  const pedirRecomendacion = async (nuevoModo, excluirId) => {
    setCargando(true);
    setModo(nuevoModo);
    setMarcadoJugando(false);

    try {
      const respuesta = nuevoModo.tipo === 'sorpresa'
        ? await obtenerRecomendacionAleatoria(excluirId)
        : await obtenerRecomendacion(nuevoModo.minutos, excluirId);

      if (respuesta.exito) {
        setRecomendacion(respuesta);
      } else {
        setRecomendacion({ error: true, mensaje: respuesta.mensaje || 'No se pudo obtener una recomendación' });
      }
    } catch (error) {
      console.error('Error:', error);
      setRecomendacion({ error: true, mensaje: 'Error de conexión con el servidor' });
    } finally {
      setCargando(false);
    }
  };

  const handleOtraSugerencia = () => {
    if (modo) pedirRecomendacion(modo, recomendacion?.datos?.id);
  };

  // "¡A jugar!": pasa el juego a estado 'jugando' en la biblioteca.
  // Se reenvían el resto de campos porque el endpoint PUT sobrescribe
  // progreso y valoración si no se incluyen.
  const handleAJugar = async () => {
    const juego = recomendacion?.datos;
    if (!juego) return;

    if (juego.estado === 'jugando') {
      navigate('/biblioteca');
      return;
    }

    setMarcandoJugando(true);
    try {
      const respuesta = await actualizarJuego(juego.id, {
        estado: 'jugando',
        prioridad: juego.prioridad,
        progreso: juego.progreso,
        valoracion: juego.valoracion,
        notasPersonales: juego.notasPersonales
      });
      if (respuesta.exito) {
        setMarcadoJugando(true);
        setRecomendacion(prev => ({ ...prev, datos: { ...prev.datos, estado: 'jugando' } }));
      } else {
        alert(respuesta.mensaje || 'No se pudo actualizar el juego');
      }
    } catch (error) {
      console.error('Error al marcar como jugando:', error);
      alert('Error de conexión al actualizar el juego');
    } finally {
      setMarcandoJugando(false);
    }
  };

  const juego = recomendacion?.datos;

  return (
    <div className="min-h-screen pt-20 px-4 pb-12">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-4">
            ¿Qué Juego?
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Dime cuánto tiempo tienes y te recomendaré el juego perfecto de tu biblioteca
          </p>
        </div>

        {/* Selector de tiempo */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="text-cyan-400" size={24} />
            ¿Cuánto tiempo tienes disponible?
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {OPCIONES_TIEMPO.map((opcion) => {
              const activa = modo?.tipo === 'tiempo' && modo.minutos === opcion.minutos && recomendacion;
              return (
                <button
                  key={opcion.minutos}
                  onClick={() => pedirRecomendacion({ tipo: 'tiempo', minutos: opcion.minutos })}
                  disabled={cargando}
                  className={`
                    p-6 rounded-xl border-2 transition-all
                    ${activa
                      ? 'bg-cyan-600 border-cyan-400 text-white'
                      : 'bg-slate-800 border-slate-700 hover:border-cyan-500 text-slate-300'
                    }
                    ${cargando ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer'}
                  `}
                >
                  <div className="text-4xl mb-2">{opcion.icono}</div>
                  <div className="font-bold text-lg mb-1">{opcion.etiqueta}</div>
                  <div className="text-xs opacity-75">{opcion.descripcion}</div>
                </button>
              );
            })}
          </div>

          {/* Botón "Sorpréndeme" */}
          <div className="text-center">
            <button
              onClick={() => pedirRecomendacion({ tipo: 'sorpresa' }, juego?.id)}
              disabled={cargando}
              className={`bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-8 py-4 rounded-full font-bold text-lg transition-all flex items-center gap-3 mx-auto disabled:opacity-50 disabled:cursor-not-allowed ${
                modo?.tipo === 'sorpresa' && recomendacion ? 'ring-4 ring-pink-400/40' : ''
              }`}
            >
              <Dice6 size={24} />
              Sorpréndeme
              <Sparkles size={20} />
            </button>
            <p className="text-slate-500 text-sm mt-2">Elige un juego aleatorio de tu biblioteca</p>
          </div>
        </div>

        {/* Estado de carga */}
        {cargando && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-cyan-400 mb-4"></div>
            <p className="text-slate-400">Analizando tu biblioteca...</p>
          </div>
        )}

        {/* Resultado de la recomendación */}
        {!cargando && recomendacion && (
          <div className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 overflow-hidden ${
            modo?.tipo === 'sorpresa' ? 'border-pink-500/30' : 'border-cyan-500/30'
          }`}>

            {recomendacion.error ? (
              // Error de servidor o de conexión
              <div className="p-12 text-center">
                <p className="text-red-400 text-lg mb-6">{recomendacion.mensaje}</p>
                <button
                  onClick={handleOtraSugerencia}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-all inline-flex items-center gap-2"
                >
                  <RefreshCw size={18} /> Reintentar
                </button>
              </div>
            ) : juego ? (
              <div className="md:flex">
                {/* Carátula */}
                {juego.caratulaUrl && (
                  <div className="md:w-1/3">
                    <img
                      src={juego.caratulaUrl}
                      alt={juego.titulo}
                      className="w-full h-64 md:h-full object-cover"
                    />
                  </div>
                )}

                {/* Info del juego recomendado */}
                <div className="flex-1 p-8">
                  <div className="flex items-center gap-3 mb-4">
                    {modo?.tipo === 'sorpresa'
                      ? <Dice6 className="text-pink-400" size={28} />
                      : <Sparkles className="text-cyan-400" size={28} />}
                    <h2 className={`text-2xl font-bold ${modo?.tipo === 'sorpresa' ? 'text-pink-400' : 'text-cyan-400'}`}>
                      {modo?.tipo === 'sorpresa' ? 'El azar ha hablado' : 'Tu recomendación'}
                    </h2>
                  </div>

                  <h3 className="text-3xl font-bold text-white mb-4">{juego.titulo}</h3>

                  <p className="text-slate-300 mb-6">{juego.razonRecomendacion}</p>

                  {/* Detalles */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Género</p>
                      <p className="text-white font-semibold">{juego.genero}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Plataforma</p>
                      <p className="text-white font-semibold">{juego.plataforma}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-sm mb-1">Duración historia</p>
                      <p className="text-cyan-400 font-bold">
                        {juego.duracionPrincipal ? `${juego.duracionPrincipal}h` : 'Desconocida'}
                      </p>
                    </div>
                    {juego.progreso > 0 && juego.horasRestantes !== null ? (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">Te quedan</p>
                        <p className="text-cyan-400 font-bold">~{juego.horasRestantes}h ({juego.progreso}% hecho)</p>
                      </div>
                    ) : juego.duracionTotal ? (
                      <div>
                        <p className="text-slate-500 text-sm mb-1">100% completado</p>
                        <p className="text-cyan-400 font-bold">{juego.duracionTotal}h</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Cuánto avanzará en esta sesión */}
                  {juego.porcentajeTiempo !== null && juego.porcentajeTiempo !== undefined && (
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-4">
                      <div className="flex justify-between text-sm text-slate-400 mb-2">
                        <span>Avance en esta sesión ({recomendacion.tiempoDisponible})</span>
                        <span className="text-cyan-400 font-bold">{juego.porcentajeTiempo}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${juego.porcentajeTiempo}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {recomendacion.totalJuegosPendientes > 0 && (
                    <p className="text-slate-500 text-sm">
                      📊 Elegido entre tus <strong className="text-slate-300">{recomendacion.totalJuegosPendientes}</strong> {recomendacion.totalJuegosPendientes === 1 ? 'juego pendiente' : 'juegos pendientes'}
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleAJugar}
                      disabled={marcandoJugando}
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {marcadoJugando
                        ? <><Check size={20} /> Marcado como jugando · Ir a mi biblioteca</>
                        : juego.estado === 'jugando'
                          ? <><Gamepad2 size={20} /> Ir a mi biblioteca</>
                          : <><Gamepad2 size={20} /> {marcandoJugando ? 'Guardando...' : '¡A jugar!'}</>}
                    </button>
                    {recomendacion.totalJuegosPendientes > 1 && (
                      <button
                        onClick={handleOtraSugerencia}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold transition-all inline-flex items-center justify-center gap-2"
                      >
                        <RefreshCw size={18} /> Otra sugerencia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Biblioteca sin juegos pendientes
              <div className="p-12 text-center">
                <p className="text-slate-400 text-lg mb-4">{recomendacion.mensaje}</p>
                <p className="text-slate-500 mb-6">
                  Añade juegos a tu biblioteca para empezar a recibir recomendaciones
                </p>
                <button
                  onClick={() => navigate('/biblioteca')}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
                >
                  Ir a mi biblioteca
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default Recomendador;
