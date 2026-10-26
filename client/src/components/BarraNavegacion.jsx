// BarraNavegacion es un componente persistente que aparece en todas las páginas.
// He implementado React Router Link en lugar de etiquetas tradicionales
// para que la navegación sea instantánea (sin recargar la página).
// Esto mejora significativamente la experiencia de usuario en aplicaciones SPA.

import { useContext, useState } from 'react';
import { Gamepad2, Library, Sparkles, Info, Calendar, BarChart3, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contextos/AuthContext';
import { API_URL } from '../servicios/api';

// He actualizado la declaración de dependencias visuales en el encabezado del archivo.
// Al incluir BarChart3 dentro de las importaciones de lucide-react, permito que el 
// sistema identifique el componente gráfico necesario para la nueva sección de estadísticas. 
// Esto soluciona el error de referencia (ReferenceError) que estaba bloqueando 
// el renderizado de la interfaz y provocando el fallo general de la página.

function BarraNavegacion() {
  // Consumo el contexto de autenticación global para obtener el estado del usuario.
  // Esto permite que el componente de navegación reaccione de forma reactiva
  // a los cambios de estado sin necesidad de refrescar la página.
  const { usuario, setUsuario } = useContext(AuthContext);

  // Estado del menú desplegable en móvil (botón hamburguesa).
  // Lo cierro al pulsar cualquier enlace para que no quede abierto
  // tapando la página a la que acaba de navegar el usuario.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const cerrarMenu = () => setMenuAbierto(false);

  const manejarCierreSesion = async () => {
    try {
      // La petición de cierre de sesión destruye la cookie en el servidor Node.js.
      await fetch(`${API_URL}/auth/logout`, { 
        method: 'POST',
        credentials: 'include' 
      });
      // Actualizo el estado global a nulo, lo que expulsa al usuario de las rutas
      // protegidas y actualiza la interfaz visual instantáneamente.
      setUsuario(null);
    } catch (error) {
      console.error('Error al cerrar la sesión', error);
    }
  };

  // He actualizado el array de rutas para incluir el acceso al Planificador.
  // Al cambiar el destino a '/planificador', aseguro que el enlace del menú
  // coincida con la ruta definida en App.jsx, evitando errores 404.
  const rutasMenu = [
    { etiqueta: 'Mi Biblioteca', icono: <Library size={18} />, ruta: '/biblioteca' },
    { etiqueta: 'Planificador', icono: <Calendar size={18} />, ruta: '/planificador' },
    { etiqueta: 'Recomendador', icono: <Sparkles size={18} />, ruta: '/recomendador' },
    { etiqueta: 'Estadísticas', icono: <BarChart3 size={18} />, ruta: '/estadisticas' },
    { etiqueta: 'Sobre Mí', icono: <Info size={18} />, ruta: '/sobre-mi' },
  ];

  return (
    // He aplicado posicionamiento fijo (fixed) para que la barra permanezca visible
    // al hacer scroll. El fondo con transparencia (bg-slate-900/80) y desenfoque
    // (backdrop-blur-md) crea un efecto glassmorphism moderno.
    // z-50 asegura que esté siempre por encima de otros elementos.
    <nav className="fixed top-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">

        {/* Logo clicable que lleva al inicio */}
        {/* Uso Link en lugar de a para navegación SPA sin recarga de página */}
        <Link to="/" onClick={cerrarMenu} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Gamepad2 className="text-cyan-400" size={28} />
          <span className="text-xl font-normal text-white tracking-tight">
            HourPlay
          </span>
        </Link>

        {/* Menú de navegación principal */}
        {/* hidden md:flex oculta el menú en móvil y lo muestra en pantallas medianas+ */}
        <div className="hidden md:flex items-center gap-8">
          {rutasMenu.map((item) => (
            // Link de React Router reemplaza a a para navegación SPA
            // key={item.etiqueta} es necesario para que React identifique cada elemento
            <Link
              key={item.etiqueta}
              to={item.ruta}
              className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors duration-200"
            >
              {item.icono}
              <span className="text-sm font-medium">{item.etiqueta}</span>
            </Link>
          ))}
        </div>

        {/* Botón de autenticación */}
        {/* Implemento un renderizado condicional mediante un operador ternario, 
            técnica esencial en el desarrollo de interfaces dinámicas con React. 
            Si el objeto usuario existe, se muestra la opción de cierre de sesión. 
            Si el valor es nulo, se muestra el botón de acceso público. */}
        {/* En móvil este botón pasa al menú desplegable, por eso uso hidden md:flex */}
        <div className="hidden md:flex items-center">
          {usuario ? (
            <button
              onClick={manejarCierreSesion}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-normal transition-all"
            >
              Cerrar Sesión
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-normal transition-all"
            >
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Botón hamburguesa (solo móvil) */}
        <button
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="md:hidden text-slate-300 hover:text-cyan-400 p-2 -mr-2 transition-colors"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
        >
          {menuAbierto ? <X size={26} /> : <Menu size={26} />}
        </button>

      </div>

      {/* Menú desplegable móvil */}
      {/* Mantiene el mismo estilo glassmorphism que la barra y reutiliza rutasMenu,
          así cualquier sección nueva aparece automáticamente en ambos menús. */}
      {menuAbierto && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md">
          <div className="px-4 py-3 flex flex-col gap-1">
            {rutasMenu.map((item) => {
              const activa = location.pathname === item.ruta;
              return (
                <Link
                  key={item.etiqueta}
                  to={item.ruta}
                  onClick={cerrarMenu}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                    ${activa ? 'bg-slate-800 text-cyan-400' : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-400'}`}
                >
                  {item.icono}
                  <span className="text-base font-medium">{item.etiqueta}</span>
                </Link>
              );
            })}

            <div className="mt-2 pt-3 border-t border-slate-800">
              {usuario ? (
                <button
                  onClick={() => { cerrarMenu(); manejarCierreSesion(); }}
                  className="w-full bg-red-600 hover:bg-red-500 text-white px-4 py-3 rounded-lg text-sm font-normal transition-all"
                >
                  Cerrar Sesión
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={cerrarMenu}
                  className="block w-full text-center bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-3 rounded-lg text-sm font-normal transition-all"
                >
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default BarraNavegacion;