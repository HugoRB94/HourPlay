// paginas/MiBiblioteca.jsx - Página de gestión de la biblioteca personal de juegos
// Permite al usuario ver, añadir, editar y eliminar juegos de su colección.

import { useState, useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { obtenerJuegosUsuario, eliminarJuego } from '../servicios/api';
import BuscadorJuegos from '../components/BuscadorJuegos';
import EditorJuego from '../components/EditorJuego';

function MiBiblioteca() {
  const [juegos, setJuegos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  
  // Estado para controlar qué juego se está editando (null = ninguno)
  const [juegoEditando, setJuegoEditando] = useState(null);

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

  const handleEliminarJuego = async (juegoId, tituloJuego) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que quieres eliminar "${tituloJuego}" de tu biblioteca?`
    );

    if (!confirmar) return;

    try {
      // Para la eliminación de registros, únicamente enviamos el identificador 
      // del recurso (el juego). El backend verificará de forma autónoma si el 
      // usuario autenticado en la sesión actual es el propietario legítimo.
      const respuesta = await eliminarJuego(juegoId);

      if (respuesta.exito) {
        alert('Juego eliminado correctamente');
        cargarJuegos(); // Recargar la lista
      } else {
        alert('Error al eliminar el juego');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar el juego');
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

        {/* LISTA DE JUEGOS */}
        {!cargando && !error && juegos.length > 0 && (
          <div>
            <p className="text-slate-400 mb-6">
              Tienes {juegos.length} {juegos.length === 1 ? 'juego' : 'juegos'} en tu biblioteca
            </p>

            {/* Grid de juegos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {juegos.map((juego) => (
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
                        className="w-full h-48 object-cover"
                      />
                      
                      {/* Botones de acción (aparecen al hacer hover) */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setJuegoEditando(juego)}
                          className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-all"
                          title="Editar juego"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleEliminarJuego(juego.id, juego.titulo)}
                          className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg transition-all"
                          title="Eliminar juego"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Info del juego */}
                  <div className="p-4">
                    <h3 className="text-white font-normal text-lg mb-2">
                      {juego.titulo}
                    </h3>
                    
                    <p className="text-slate-400 text-sm mb-3">
                      {juego.genero} • {juego.plataforma}
                    </p>

                    {/* Estado */}
                    <div className="flex items-center gap-2 mb-3">
                      <span 
                        className={`px-3 py-1 rounded-full text-xs font-semibold
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
                      <p className="text-slate-400 text-sm mb-3">
                        ⏱️ Historia: {juego.duracionPrincipal}h
                        {juego.duracionTotal && ` • 100%: ${juego.duracionTotal}h`}
                      </p>
                    )}
                    
                    {/* Valoración del usuario */}
                    {juego.valoracion && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex items-center gap-1 bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-600/30">
                          <span className="text-yellow-400 text-lg">★</span>
                          <span className="text-yellow-400 font-normal text-sm">
                            {juego.valoracion.toFixed(1)}
                          </span>
                          <span className="text-yellow-600 text-xs">/10</span>
                        </div>
                      </div>
                    )}

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
                    {juego.notasPersonales && (
                      <div className="mt-3 p-3 bg-slate-900 rounded border border-slate-700">
                        <p className="text-slate-400 text-xs italic">
                          "{juego.notasPersonales.length > 100 
                            ? juego.notasPersonales.substring(0, 100) + '...' 
                            : juego.notasPersonales}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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