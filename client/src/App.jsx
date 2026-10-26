// App.jsx es el componente raíz que define la estructura y el enrutamiento
// de toda la aplicación. He implementado React Router para gestionar la navegación
// entre páginas sin recargar el navegador (SPA - Single Page Application).

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BarraNavegacion from './components/BarraNavegacion';
import FondoDifuminado from './components/FondoDifuminado';
import Inicio from './paginas/Inicio';
import MiBiblioteca from './paginas/MiBiblioteca';
import Recomendador from './paginas/Recomendador';
import Planificador from './paginas/Planificador';
import Estadisticas from './paginas/Estadisticas';
import SobreMi from './paginas/SobreMi';
import Login from './paginas/Login';
import Registro from './paginas/Registro';

// Importaciones del sistema de seguridad
import { AuthProvider } from './contextos/AuthContext';
import { NotificacionesProvider } from './contextos/NotificacionesContext';
import RutaProtegida from './components/RutaProtegida';

function App() {
  return (
    // La envoltura de la aplicación con AuthProvider implementa el patrón de
    // diseño de contexto global. Esto permite que cualquier componente del árbol
    // de React, independientemente de su profundidad, pueda acceder al estado
    // de autenticación sin necesidad de pasar propiedades manualmente.
    <AuthProvider>
      
      {/* Avisos y confirmaciones propios disponibles en toda la app */}
      <NotificacionesProvider>
      {/* BrowserRouter habilita el sistema de rutas. Envuelve toda la aplicación. */}
      <BrowserRouter>
        
        {/* Contenedor principal con fondo oscuro y texto claro. "relative isolate" crea
            un contexto de apilamiento para que el fondo (-z-10) quede encima del color
            base pero detrás de todo el contenido */}
        <div className="relative isolate min-h-screen bg-slate-950 text-white">

          {/* Fondo difuminado de carátulas en todas las secciones (menos el inicio) */}
          <FondoDifuminado />
          
          {/* La barra de navegación es persistente en todas las secciones */}
          <BarraNavegacion />

          {/* Sistema de rutas para cargar los componentes según la URL */}
          <Routes>
            
            {/* Rutas públicas: Accesibles para cualquier visitante */}
            
            {/* Ruta principal - Landing Page */}
            <Route path="/" element={<Inicio />} />
            
            {/* Sección de información del proyecto */}
            <Route path="/sobre-mi" element={<SobreMi />} />
            
            {/* Permite a los usuarios no autentificados acceder al formulario de credenciales */}
            <Route path="/login" element={<Login />} />
            
            {/* Permite a los usuarios no registrados, registrarse */}
            <Route path="/registro" element={<Registro />} />


            {/* Rutas privadas: Protegidas por el guardián de navegación */}
            {/* Para cumplir con los requisitos de seguridad en el entorno cliente,
                las rutas que exponen datos personales se han encapsulado dentro
                del componente RutaProtegida. Este evalúa el estado de la sesión
                antes de permitir el renderizado de la vista solicitada. */}
                
            {/* Gestión de la biblioteca personal del usuario */}
            <Route 
              path="/biblioteca" 
              element={
                <RutaProtegida>
                  <MiBiblioteca />
                </RutaProtegida>
              } 
            />
            
            {/* Motor de recomendación inteligente */}
            <Route 
              path="/recomendador" 
              element={
                <RutaProtegida>
                  <Recomendador />
                </RutaProtegida>
              } 
            />
            
            {/* Ruta "/planificador" - Gestión de sesiones de juego */}
            {/* He actualizado esta ruta para que apunte al nuevo componente Planificador.
                He sustituido el sistema de calendario anterior por una lista de 
                planificación más eficiente, lo que mejora la gestión de la tabla 
                'sesiones' en la base de datos MySQL. */}
            <Route 
              path="/planificador" 
              element={
                <RutaProtegida>
                  <Planificador />
                </RutaProtegida>
              } 
            />
            
            {/* Ruta "/estadisticas" - Dashboard de métricas y gráficos */}
            {/* Muestra visualizaciones sobre el progreso del usuario, géneros favoritos y tiempo estimado */}
            {/* Utiliza Recharts para generar gráficos profesionales de datos agregados del backend */}
            <Route 
              path="/estadisticas" 
              element={
                <RutaProtegida>
                  <Estadisticas />
                </RutaProtegida>
              } 
            />
            
          </Routes>
        </div>
      </BrowserRouter>
      </NotificacionesProvider>
    </AuthProvider>
  );
}

export default App;