// paginas/MiBiblioteca.jsx - Página de gestión de la biblioteca personal de juegos
// Permite al usuario ver, añadir, editar y eliminar juegos de su colección.

import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, Search, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { obtenerJuegosUsuario, eliminarJuego } from '../servicios/api';
import { useNotificaciones } from '../contextos/NotificacionesContext';
import BuscadorJuegos from '../components/BuscadorJuegos';
import EditorJuego from '../components/EditorJuego';
import { coloresNota } from '../utilidades/coloresNota';

function MiBiblioteca() {
  const { notificar, confirmar } = useNotificaciones();
  const [juegos, setJuegos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para controlar qué juego se está editando (null = ninguno)
  const [juegoEditando, setJuegoEditando] = useState(null);

  // Estados para búsqueda, filtros y ordenación
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [ordenacion, setOrdenacion] = useState('fecha_desc'); // fecha_desc, fecha_asc, valoracion_desc, valoracion_asc

  // He eliminado la constante estática que almacenaba el identificador del usuario.
  // En esta nueva arquitectura, el frontend no necesita conocer ni transmitir 
  // quién es el usuario activo, ya que el servidor Node.js extrae esta información 
  // de forma segura e inmutable directamente desde la cookie de sesión HTTP-only.

  const cargarJuegos = async () => {
    try {
      setCargando(true);
      
      // La llamada al servicio de red se ha simplificado. Ya no inyectamos 
      // ningún parámetro de identidad, delegando el control de acceso al backend.
      const respuesta = await obtenerJuegosUsuario();
      
      if (respuesta.exito) {
        setJuegos(respuesta.datos);
      } else {
        setError('No se pudieron cargar los juegos');
      }
    } catch (err) {
      console.error('Error al cargar juegos:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  // Cargar juegos al montar el componente
  useEffect(() => {
    cargarJuegos();
  }, []);

  // Callback cuando se añade un juego nuevo
  const handleJuegoAñadido = () => {
    cargarJuegos();
  };

  // Callback cuando se actualiza un juego
  const handleJuegoActualizado = () => {
    cargarJuegos();
    setJuegoEditando(null);
  };

  // Filtrar y ordenar juegos
  const juegosFiltradosYOrdenados = useMemo(() => {
    let resultado = [...juegos];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(juego => 
        juego.titulo.toLowerCase().includes(termino) ||
        (juego.genero && juego.genero.toLowerCase().includes(termino)) ||
        (juego.plataforma && juego.plataforma.toLowerCase().includes(termino))
      );
    }

    // Filtrar por estado
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(juego => juego.estado === filtroEstado);
    }

    // Ordenar
    resultado.sort((a, b) => {
      switch (ordenacion) {
        case 'fecha_asc':
          return new Date(a.fechaAgregado) - new Date(b.fechaAgregado);
        case 'fecha_desc':
          return new Date(b.fechaAgregado) - new Date(a.fechaAgregado);
        case 'valoracion_desc':
          const valA = a.valoracion || 0;
          const valB = b.valoracion || 0;
          return valB - valA;
        case 'valoracion_asc':
          const valA2 = a.valoracion || 0;
          const valB2 = b.valoracion || 0;
          return valA2 - valB2;
        default:
          return new Date(b.fechaAgregado) - new Date(a.fechaAgregado);
      }
    });

    return resultado;
  }, [juegos, busqueda, filtroEstado, ordenacion]);

  const handleEliminarJuego = async (juegoId, tituloJuego) => {
    const aceptado = await confirmar({
      titulo: 'Eliminar juego',
      mensaje: `¿Estás seguro de que quieres eliminar "${tituloJuego}" de tu biblioteca?`,
      textoConfirmar: 'Eliminar'
    });

    if (!aceptado) return;

    try {
      // Para la eliminación de registros, únicamente enviamos el identificador 
      // del recurso (el juego). El backend verificará de forma autónoma si el 
      // usuario autenticado en la sesión actual es el propietario legítimo.
      const respuesta = await eliminarJuego(juegoId);

      if (respuesta.exito) {
        notificar(`"${tituloJuego}" eliminado de tu biblioteca`);
        cargarJuegos(); // Recargar la lista
      } else {
        notificar('Error al eliminar el juego', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      notificar('Error al eliminar el juego', 'error');
    }
  };

  return (
    <div className="min-h-screen pt-20 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado con título y botón de añadir */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-normal text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            Mi Biblioteca
          </h1>
          
          {!cargando && (
            // Al actualizar la arquitectura de seguridad, el componente BuscadorJuegos
            // ya no requiere recibir el usuarioId como propiedad (evitando el prop drilling).
            <BuscadorJuegos 
              onJuegoAñadido={handleJuegoAñadido}
            />
          )}
        </div>

        {/* ESTADO DE CARGA */}
        {cargando && (
          <div className="flex items-center justify-center py-20">
            <div className="text-slate-400 text-lg">Cargando juegos...</div>
          </div>
        )}

        {/* ESTADO DE ERROR */}
        {error && !cargando && (
          <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* ESTADO VACÍO */}
        {!cargando && !error && juegos.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400 text-lg mb-4">
              Aún no tienes juegos en tu biblioteca
            </p>
            <p className="text-slate-500 text-sm">
              Usa el botón "Añadir Juego" para empezar a construir tu colección
            </p>
          </div>
        )}

        {/* BARRA DE BÚSQUEDA, FILTROS Y ORDENACIÓN */}
        {!cargando && !error && juegos.length > 0 && (
          <div className="mb-8 space-y-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por título, género o plataforma..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Filtros por estado */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-slate-400 mr-2">
                <Filter size={18} />
                <span className="text-sm">Estado:</span>
              </div>
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === 'todos'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Todos ({juegos.length})
              </button>
              <button
                onClick={() => setFiltroEstado('completado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === 'completado'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Completados ({juegos.filter(j => j.estado === 'completado').length})
              </button>
              <button
                onClick={() => setFiltroEstado('jugando')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === 'jugando'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Jugando ({juegos.filter(j => j.estado === 'jugando').length})
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === 'pendiente'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Pendientes ({juegos.filter(j => j.estado === 'pendiente').length})
              </button>
              <button
                onClick={() => setFiltroEstado('abandonado')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filtroEstado === 'abandonado'
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Abandonados ({juegos.filter(j => j.estado === 'abandonado').length})
              </button>
            </div>

            {/* Ordenación */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-slate-400 mr-2">
                <ArrowUpDown size={18} />
                <span className="text-sm">Ordenar:</span>
              </div>
              <button
                onClick={() => setOrdenacion('fecha_desc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ordenacion === 'fecha_desc'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Más recientes
              </button>
              <button
                onClick={() => setOrdenacion('fecha_asc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ordenacion === 'fecha_asc'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Más antiguos
              </button>
              <button
                onClick={() => setOrdenacion('valoracion_desc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ordenacion === 'valoracion_desc'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Mejor valorados
              </button>
              <button
                onClick={() => setOrdenacion('valoracion_asc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  ordenacion === 'valoracion_asc'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
              >
                Peor valorados
              </button>
            </div>

            {/* Contador de resultados */}
            <p className="text-slate-400">
              Mostrando {juegosFiltradosYOrdenados.length} de {juegos.length} {juegos.length === 1 ? 'juego' : 'juegos'}
              {(busqueda || filtroEstado !== 'todos') && (
                <button
                  onClick={() => {
                    setBusqueda('');
                    setFiltroEstado('todos');
                  }}
                  className="ml-2 text-cyan-400 hover:text-cyan-300 text-sm underline"
                >
                  Limpiar filtros
                </button>
              )}
            </p>
          </div>
        )}

        {/* LISTA DE JUEGOS */}
        {!cargando && !error && juegos.length > 0 && (
          <div>
            {juegosFiltradosYOrdenados.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-400 text-lg mb-4">
                  No se encontraron juegos
                </p>
                <p className="text-slate-500 text-sm">
                  Prueba a ajustar los filtros o la búsqueda
                </p>
              </div>
            ) : (
              <>
                {/* Grid de juegos */}
                {/* En móvil muestro 2 columnas con menos separación para aprovechar el ancho */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {juegosFiltradosYOrdenados.map((juego) => (
                <div 
                  key={juego.id} 
                  className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500 transition-all group"
                >
                  {/* Carátula */}
                  {juego.caratulaUrl && (
                    <div className="relative">
                      <img 
                        src={juego.caratulaUrl} 
                        alt={juego.titulo}
                        className="w-full h-32 sm:h-48 object-cover"
                      />

                      {/* Botones de acción (aparecen al hacer hover; en móvil siempre visibles porque no hay hover) */}
                      <div className="absolute top-2 right-2 flex gap-1.5 sm:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setJuegoEditando(juego)}
                          className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 sm:p-2 rounded-lg transition-all"
                          title="Editar juego"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleEliminarJuego(juego.id, juego.titulo)}
                          className="bg-red-600 hover:bg-red-500 text-white p-1.5 sm:p-2 rounded-lg transition-all"
                          title="Eliminar juego"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Info del juego */}
                  <div className="p-3 sm:p-4">
                    <h3 className="text-white font-normal text-sm sm:text-lg mb-1 sm:mb-2 line-clamp-2">
                      {juego.titulo}
                    </h3>

                    <p className="text-slate-400 text-xs sm:text-sm mb-3">
                      {juego.genero} • {juego.plataforma}
                    </p>

                    {/* Estado */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs font-semibold
                          ${juego.estado === 'pendiente' ? 'bg-yellow-900/30 text-yellow-400' : ''}
                          ${juego.estado === 'jugando' ? 'bg-blue-900/30 text-blue-400' : ''}
                          ${juego.estado === 'completado' ? 'bg-green-900/30 text-green-400' : ''}
                          ${juego.estado === 'abandonado' ? 'bg-red-900/30 text-red-400' : ''}
                        `}
                      >
                        {juego.estado.charAt(0).toUpperCase() + juego.estado.slice(1)}
                      </span>

                      <span className="text-slate-500 text-xs">
                        Prioridad: {juego.prioridad}
                      </span>
                    </div>

                    {/* Duración */}
                    {juego.duracionPrincipal && (
                      <p className="text-slate-400 text-xs sm:text-sm mb-3">
                        ⏱️ Historia: {juego.duracionPrincipal}h
                        {juego.duracionTotal && ` • 100%: ${juego.duracionTotal}h`}
                      </p>
                    )}
                    
                    {/* Valoración del usuario */}
                    {juego.valoracion && (() => {
                      const colores = coloresNota(juego.valoracion);
                      return (
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border ${colores.fondo}`}>
                            <span className={`text-xl leading-none ${colores.texto}`}>★</span>
                            <span className={`font-semibold text-base tabular-nums ${colores.texto}`}>
                              {juego.valoracion.toFixed(1)}
                            </span>
                            <span className={`text-sm ${colores.suave}`}>/10</span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Barra de progreso */}
                    {juego.progreso > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Progreso</span>
                          <span>{juego.progreso}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-cyan-500 h-2 rounded-full transition-all"
                            style={{ width: `${juego.progreso}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Notas personales (si existen) */}
                    {/* En móvil las oculto para que las tarjetas no queden demasiado largas */}
                    {juego.notasPersonales && (
                      <div className="hidden sm:block mt-3 p-3 bg-slate-900 rounded border border-slate-700">
                        <p className="text-slate-400 text-xs italic">
                          "{juego.notasPersonales.length > 100 
                            ? juego.notasPersonales.substring(0, 100) + '...' 
                            : juego.notasPersonales}"
                        </p>
                      </div>
                    )}

                    {/* Fecha de añadido */}
                    <div className="mt-3 pt-3 border-t border-slate-700 hidden sm:flex items-center gap-2 text-slate-500 text-xs">
                      <Calendar size={12} />
                      <span>
                        Añadido el {new Date(juego.fechaAgregado).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}

        {/* Modal de edición (solo se muestra si hay un juego seleccionado) */}
        {juegoEditando && (
          <EditorJuego
            juego={juegoEditando}
            onCerrar={() => setJuegoEditando(null)}
            onActualizado={handleJuegoActualizado}
          />
        )}
      </div>
    </div>
  );
}

export default MiBiblioteca;