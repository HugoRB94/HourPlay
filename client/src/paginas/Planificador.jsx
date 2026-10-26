// components/Planificador.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, X, CheckCircle2, RotateCcw, Trophy } from 'lucide-react';
import SelectorFecha from '../components/SelectorFecha';
import { API_URL, marcarSesionCompletada } from '../servicios/api';
import { useNotificaciones } from '../contextos/NotificacionesContext';

function Planificador() {
  const { notificar, confirmar } = useNotificaciones();
  const [sesiones, setSesiones] = useState([]);
  const [juegos, setJuegos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  // Pestaña visible: 'planificadas' o 'realizadas'
  const [pestana, setPestana] = useState('planificadas');
  const [nuevaSesion, setNuevaSesion] = useState({
    juegoTitulo: '',
    fechaInicio: '',
    notas: ''
  });

  // He eliminado el identificador estatico (UUID) del frontend.
  // En la arquitectura actual, la identidad del usuario es gestionada de forma opaca
  // mediante cookies de sesion HTTP-only, lo que incrementa la seguridad al evitar
  // la exposicion de IDs sensibles en el codigo fuente del cliente.

  useEffect(() => {
    obtenerSesiones();
    obtenerJuegos();
  }, []);

  const obtenerSesiones = async () => {
    try {
      // Ahora invocamos el endpoint sin parametros de ID. 
      // El servidor extraera el usuarioId de la sesion activa.
      const res = await fetch(`${API_URL}/sesiones`, {
        credentials: 'include' // Obligatorio para enviar la cookie de sesion
      });
      const data = await res.json();
      
      // Verificamos si la respuesta es exitosa segun el formato de tu API
      if (Array.isArray(data)) {
        setSesiones(data);
      } else if (data.exito && Array.isArray(data.datos)) {
        setSesiones(data.datos);
      }
    } catch (error) {
      console.error("Error al cargar sesiones", error);
    }
  };

  const obtenerJuegos = async () => {
    try {
      // Simplificamos la consulta eliminando el query parameter del usuarioId.
      const res = await fetch(`${API_URL}/juegos`, {
        credentials: 'include'
      });
      const result = await res.json();
      
      if (result.exito && Array.isArray(result.datos)) {
        setJuegos(result.datos);
      } else {
        setJuegos([]);
      }
    } catch (error) {
      console.error("Error al cargar juegos", error);
      setJuegos([]);
    }
  };

  const guardarSesion = async (e) => {
    e.preventDefault();
    // El calendario propio no admite el atributo 'required', así que validamos aquí
    if (!nuevaSesion.fechaInicio) {
      notificar('Elige un día en el calendario', 'info');
      return;
    }
    try {
      // El cuerpo del POST ya no requiere el campo usuarioId.
      // Esta validacion se realiza ahora en el lado del servidor para
      // prevenir la suplantacion de identidad (ID spoofing).
      const res = await fetch(`${API_URL}/sesiones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          juegoTitulo: nuevaSesion.juegoTitulo,
          fechaInicio: nuevaSesion.fechaInicio,
          notas: nuevaSesion.notas,
          fechaFin: nuevaSesion.fechaInicio
        })
      });

      if (res.ok) {
        setMostrarModal(false);
        obtenerSesiones(); 
        setNuevaSesion({ juegoTitulo: '', fechaInicio: '', notas: '' });
        notificar('¡Sesión programada con éxito!');
      }
    } catch (error) {
      console.error("Error al guardar", error);
    }
  };

  const eliminarSesion = async (id) => {
    const aceptado = await confirmar({
      titulo: 'Borrar sesión',
      mensaje: '¿Seguro que quieres borrar esta sesión?',
      textoConfirmar: 'Borrar'
    });
    if (!aceptado) return;
    try {
      const res = await fetch(`${API_URL}/sesiones/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        obtenerSesiones();
        notificar('Sesión borrada');
      } else {
        notificar('Error al borrar la sesión', 'error');
      }
    } catch (error) {
      console.error("Error al eliminar", error);
      notificar('Error al borrar la sesión', 'error');
    }
  };

  // Cambia la sesion entre planificada y realizada.
  // Actualizamos el estado local al momento para que la tarjeta cambie de pestaña sin esperar.
  const alternarCompletada = async (sesion) => {
    const completada = !sesion.completada;
    setSesiones(prev => prev.map(s => s.id === sesion.id ? { ...s, completada } : s));
    try {
      await marcarSesionCompletada(sesion.id, completada);
    } catch (error) {
      console.error("Error al actualizar", error);
      obtenerSesiones();
    }
  };

  const planificadas = sesiones.filter(s => !s.completada);
  // Las realizadas se muestran de la mas reciente a la mas antigua
  const realizadas = sesiones
    .filter(s => s.completada)
    .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
  const sesionesVisibles = pestana === 'planificadas' ? planificadas : realizadas;

  const pestanas = [
    { id: 'planificadas', etiqueta: 'Planificadas', icono: Clock, total: planificadas.length },
    { id: 'realizadas', etiqueta: 'Realizadas', icono: CheckCircle2, total: realizadas.length }
  ];

  return (
    <div className="min-h-screen pt-24 px-6 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarIcon className="text-cyan-400" />
              Planificador de Partidas
            </h1>
            <p className="text-slate-400 mt-2">Organiza tus proximas sesiones de juego.</p>
          </div>
          
          <button 
            onClick={() => setMostrarModal(true)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all"
          >
            <Plus size={20} />
            Nueva Sesion
          </button>
        </div>

        {/* Pestañas para alternar entre sesiones pendientes y ya jugadas */}
        <div className="flex gap-2 mb-6 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          {pestanas.map(({ id, etiqueta, icono: Icono, total }) => (
            <button
              key={id}
              onClick={() => setPestana(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                pestana === id
                  ? (id === 'planificadas' ? 'bg-cyan-600 text-white' : 'bg-emerald-600 text-white')
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icono size={16} />
              {etiqueta}
              <span className={`text-xs px-2 py-0.5 rounded-full ${pestana === id ? 'bg-black/20' : 'bg-slate-800'}`}>
                {total}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {sesionesVisibles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              {pestana === 'planificadas' ? (
                <>
                  <Clock className="mx-auto text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500">No tienes sesiones programadas.</p>
                </>
              ) : (
                <>
                  <Trophy className="mx-auto text-slate-700 mb-4" size={48} />
                  <p className="text-slate-500">Aun no has marcado ninguna sesion como realizada.</p>
                </>
              )}
            </div>
          ) : (
            sesionesVisibles.map(sesion => (
              <div
                key={sesion.id}
                className={`bg-slate-900 border p-5 rounded-xl flex justify-between items-center transition-all ${
                  sesion.completada ? 'border-emerald-900/60 hover:border-emerald-800' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${sesion.completada ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {sesion.completada && <CheckCircle2 size={18} />}
                    {sesion.juegoTitulo}
                  </h3>
                  <p className="text-slate-300 text-sm">
                    {new Date(sesion.fechaInicio).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {sesion.notas && <p className="text-slate-500 text-xs mt-1 italic">"{sesion.notas}"</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alternarCompletada(sesion)}
                    title={sesion.completada ? 'Volver a planificadas' : 'Marcar como realizada'}
                    className={`p-2 transition-colors ${
                      sesion.completada ? 'text-slate-600 hover:text-cyan-400' : 'text-slate-600 hover:text-emerald-400'
                    }`}
                  >
                    {sesion.completada ? <RotateCcw size={20} /> : <CheckCircle2 size={20} />}
                  </button>
                  <button
                    onClick={() => eliminarSesion(sesion.id)}
                    title="Borrar sesion"
                    className="text-slate-600 hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {mostrarModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-xl font-bold">Programar Partida</h2>
              <button onClick={() => setMostrarModal(false)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            
            <form onSubmit={guardarSesion} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Videojuego</label>
                <select 
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  value={nuevaSesion.juegoTitulo}
                  onChange={(e) => setNuevaSesion({...nuevaSesion, juegoTitulo: e.target.value})}
                >
                  <option value="">Selecciona un juego...</option>
                  {juegos.map(juego => (
                    <option key={juego.id} value={juego.titulo}>{juego.titulo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">¿Cuando vas a jugar?</label>
                {/* Calendario propio para que la semana empiece en lunes */}
                <SelectorFecha
                  valor={nuevaSesion.fechaInicio}
                  onCambio={(fecha) => setNuevaSesion({...nuevaSesion, fechaInicio: fecha})}
                />
                <p className={`text-xs mt-1.5 ${nuevaSesion.fechaInicio ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {nuevaSesion.fechaInicio
                    ? new Date(nuevaSesion.fechaInicio + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Elige un día en el calendario'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Notas u objetivos (opcional)</label>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500 resize-none"
                  rows="3"
                  placeholder="Ej: Pasar el jefe del pantano..."
                  value={nuevaSesion.notas}
                  onChange={(e) => setNuevaSesion({...nuevaSesion, notas: e.target.value})}
                />
              </div>

              <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all mt-4">
                Confirmar Plan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Planificador;