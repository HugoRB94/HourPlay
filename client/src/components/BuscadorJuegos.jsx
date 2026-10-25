// components/BuscadorJuegos.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { buscarJuegos, añadirJuego } from '../servicios/api';

// Búsqueda mientras se escribe. Solo consulta RAWG (nunca HowLongToBeat), y
// para no gastar la cuota se espera a que el usuario deje de teclear, se exige
// un mínimo de letras y se reutilizan las búsquedas ya hechas.
const ESPERA_TECLEO_MS = 400;
const MINIMO_CARACTERES = 3;
const cacheBusquedas = new Map(); // Compartida entre aperturas del modal

function BuscadorJuegos({ onJuegoAñadido }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [añadiendoId, setAñadiendoId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const ultimaPeticion = useRef(0);
  const terminoEnCurso = useRef(null);

  const ejecutarBusqueda = async (texto) => {
    const termino = texto.trim().toLowerCase();
    if (termino.length < MINIMO_CARACTERES || termino === terminoEnCurso.current) return;

    if (cacheBusquedas.has(termino)) {
      setResultados(cacheBusquedas.get(termino));
      setBusquedaRealizada(true);
      return;
    }

    // Numeramos cada petición: si llega la respuesta de una búsqueda antigua
    // (el usuario ya ha seguido escribiendo) se descarta para no pisar la actual
    const idPeticion = ++ultimaPeticion.current;
    terminoEnCurso.current = termino;
    setBuscando(true);
    try {
      const respuesta = await buscarJuegos(termino);
      const datos = respuesta.exito ? respuesta.datos : [];
      if (respuesta.exito) cacheBusquedas.set(termino, datos);
      if (idPeticion === ultimaPeticion.current) setResultados(datos);
    } catch (error) {
      console.error('Error al buscar:', error);
      if (idPeticion === ultimaPeticion.current) setResultados([]);
    } finally {
      if (terminoEnCurso.current === termino) terminoEnCurso.current = null;
      if (idPeticion === ultimaPeticion.current) {
        setBuscando(false);
        setBusquedaRealizada(true);
      }
    }
  };

  // Debounce: cada pulsación reinicia el temporizador y solo se busca
  // cuando el usuario lleva ESPERA_TECLEO_MS sin escribir
  useEffect(() => {
    if (busqueda.trim().length < MINIMO_CARACTERES) {
      ultimaPeticion.current++; // Invalida cualquier respuesta pendiente
      setResultados([]);
      setBuscando(false);
      setBusquedaRealizada(false);
      return;
    }
    const temporizador = setTimeout(() => ejecutarBusqueda(busqueda), ESPERA_TECLEO_MS);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Pulsar Enter o el botón busca al momento, sin esperar al debounce
  const handleBuscar = (e) => {
    e.preventDefault();
    ejecutarBusqueda(busqueda);
  };

  // Función para añadir el juego a la base de datos MySQL.
  // En este momento el servidor consulta HowLongToBeat (una sola petición).
  const handleAñadirJuego = async (juego) => {
    if (añadiendoId) return;
    setAñadiendoId(juego.juegoIdExterno);

    try {
      const datosJuego = {
        juegoIdExterno: juego.juegoIdExterno,
        titulo: juego.titulo,
        caratulaUrl: juego.caratulaUrl || '',
        // Guardamos solo el género principal para agrupar bien las estadísticas
        genero: juego.genero?.split(',')[0].trim() || 'Varios',
        plataforma: juego.plataforma || 'PC',
        anio: juego.anio
      };

      const respuesta = await añadirJuego(datosJuego);

      if (respuesta.exito) {
        if (onJuegoAñadido) onJuegoAñadido(respuesta.datos);
        cerrarModal();
        alert(respuesta.datos.duracionPrincipal
          ? `¡Juego añadido! Duración estimada: ${respuesta.datos.duracionPrincipal}h`
          : '¡Juego añadido! No se encontró su duración; puedes indicarla desde el editor.');
      } else {
        alert(respuesta.mensaje || 'No se pudo añadir el juego');
      }
    } catch (error) {
      console.error('Error al añadir juego:', error);
      alert('Error al añadir. Revisa la consola (F12) para más info.');
    } finally {
      setAñadiendoId(null);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setBusqueda('');
    setResultados([]);
    setBusquedaRealizada(false);
  };

  return (
    <div className="mb-8">
      {/* Botón para abrir el buscador */}
      <button
        onClick={() => setModalAbierto(true)}
        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-900/20"
      >
        <Plus size={22} />
        Añadir nuevo juego
      </button>

      {/* Modal del buscador */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Cabecera del Modal */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Explorar Biblioteca Global</h2>
              <button 
                onClick={cerrarModal}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Formulario de búsqueda */}
            <div className="p-6 bg-slate-900/50">
              <form onSubmit={handleBuscar} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 text-slate-500" size={20} />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Empieza a escribir un título (ej: Elden Ring, FIFA...)"
                    autoFocus
                    className="w-full bg-slate-950 text-white px-12 py-3.5 rounded-xl border border-slate-700 focus:border-cyan-500 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={buscando}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {buscando ? 'Buscando...' : 'Buscar'}
                </button>
              </form>
            </div>

            {/* Resultados */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950/30">
              {resultados.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resultados.map((juego) => (
                    <div 
                      key={juego.juegoIdExterno}
                      className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-cyan-500/50 transition-all group"
                    >
                      <div className="flex gap-4 p-4">
                        {juego.caratulaUrl ? (
                          <img 
                            src={juego.caratulaUrl} 
                            alt={juego.titulo} 
                            className="w-24 h-32 object-cover rounded-lg shadow-md" 
                          />
                        ) : (
                          <div className="w-24 h-32 bg-slate-800 rounded-lg flex items-center justify-center text-slate-600 text-xs">Sin imagen</div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg leading-tight mb-1">{juego.titulo}</h3>
                          <p className="text-cyan-500 text-sm font-medium mb-1">{juego.genero}</p>
                          <p className="text-slate-500 text-xs uppercase tracking-wider">{juego.plataforma}</p>
                          {juego.anio && <p className="text-slate-600 text-xs mt-1">{juego.anio}</p>}
                        </div>
                        <button
                          onClick={() => handleAñadirJuego(juego)}
                          disabled={añadiendoId !== null}
                          className="bg-slate-800 hover:bg-cyan-600 text-white p-3 rounded-xl transition-all self-start group-hover:scale-110 disabled:opacity-50 disabled:hover:bg-slate-800 disabled:group-hover:scale-100"
                          title="Añadir a mi lista"
                        >
                          {añadiendoId === juego.juegoIdExterno
                            ? <Loader2 size={24} className="animate-spin" />
                            : <Plus size={24} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !buscando && (
                  <div className="text-center py-12 text-slate-500">
                    <Search className="mx-auto mb-4 opacity-20" size={48} />
                    <p>
                      {busquedaRealizada
                        ? 'No se han encontrado coincidencias para esa búsqueda'
                        : 'Busca tus juegos favoritos para añadirlos a tu colección'}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BuscadorJuegos;