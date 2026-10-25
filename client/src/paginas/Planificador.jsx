// components/Planificador.jsx
import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Clock, X } from 'lucide-react';
import SelectorFecha from '../components/SelectorFecha';
import { API_URL } from '../servicios/api';

function Planificador() {
  const [sesiones, setSesiones] = useState([]);
  const [juegos, setJuegos] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
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
      alert('Elige un día en el calendario');
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
        alert('¡Sesion programada con exito!~');
      }
    } catch (error) {
      console.error("Error al guardar", error);
    }
  };

  const eliminarSesion = async (id) => {
    if (!confirm("¿Seguro que quieres borrar esta sesion?")) return;
    try {
      const res = await fetch(`${API_URL}/sesiones/${id}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (res.ok) {
        obtenerSesiones();
      }
    } catch (error) {
      console.error("Error al eliminar", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-24 px-6 text-white">
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

        <div className="grid gap-4">
          {sesiones.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
              <Clock className="mx-auto text-slate-700 mb-4" size={48} />
              <p className="text-slate-500">No tienes sesiones programadas.</p>
            </div>
          ) : (
            sesiones.map(sesion => (
              <div key={sesion.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex justify-between items-center hover:border-slate-700 transition-all">
                <div>
                  <h3 className="text-cyan-400 font-bold text-lg">{sesion.juegoTitulo}</h3>
                  <p className="text-slate-300 text-sm">
                    {new Date(sesion.fechaInicio).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  {sesion.notas && <p className="text-slate-500 text-xs mt-1 italic">"{sesion.notas}"</p>}
                </div>
                <button 
                  onClick={() => eliminarSesion(sesion.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-2"
                >
                  <Trash2 size={20} />
                </button>
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