// servicios/api.js - Configuración centralizada para llamadas al backend
// Este archivo contiene todas las funciones que se comunican con la API REST
// del servidor Node.js. Centralizar estas llamadas facilita el mantenimiento,
// evita la duplicación de código y asegura la consistencia en las políticas 
// de seguridad de la aplicación cliente.

// URL base del servidor backend
// Se toma de VITE_API_URL (configurada en el hosting o en client/.env).
// Si no existe, apunta al servidor local de desarrollo.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Configuración predeterminada para peticiones seguras
// La inclusión de credenciales garantiza que el navegador adjunte la cookie 
// de sesión HTTP-only generada por express-session en cada petición.
const fetchSeguro = (url, opciones = {}) => {
  return fetch(url, {
    ...opciones,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...opciones.headers,
    },
  });
};

// ============ FUNCIONES DE USUARIOS ============

/**
 * Obtiene la lista de todos los usuarios (Ruta pública o protegida según backend)
 * @returns {Promise} Promesa con el array de usuarios
 */
export const obtenerUsuarios = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/usuarios`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario en el sistema (Generalmente gestionado por auth/registro)
 * @param {Object} datosUsuario - Datos del usuario a crear
 * @returns {Promise} Promesa con los datos del usuario creado
 */
export const crearUsuario = async (datosUsuario) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/usuarios`, {
      method: 'POST',
      body: JSON.stringify(datosUsuario),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

// ============ FUNCIONES DE JUEGOS ============

/**
 * Obtiene todos los juegos del usuario autenticado.
 * He refactorizado esta función eliminando la dependencia del usuarioId en la URL.
 * El backend identifica al usuario legítimo a través de la cookie de sesión.
 * @returns {Promise} Promesa con el array de juegos
 */
export const obtenerJuegosUsuario = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener juegos:', error);
    throw error;
  }
};

/**
 * Añade un juego a la biblioteca del usuario
 * @param {Object} datosJuego - Datos del juego a añadir (sin usuarioId)
 * @returns {Promise} Promesa con los datos del juego creado
 */
export const añadirJuego = async (datosJuego) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos`, {
      method: 'POST',
      body: JSON.stringify(datosJuego),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al añadir juego:', error);
    throw error;
  }
};

/**
 * Actualiza los datos de un juego (estado, prioridad, progreso, notas)
 * @param {string} juegoId - ID del juego a actualizar
 * @param {Object} datosActualizados - Datos a actualizar
 * @returns {Promise} Promesa con los datos del juego actualizado
 */
export const actualizarJuego = async (juegoId, datosActualizados) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos/${juegoId}`, {
      method: 'PUT',
      body: JSON.stringify(datosActualizados),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al actualizar juego:', error);
    throw error;
  }
};

/**
 * Elimina un juego de la biblioteca del usuario
 * @param {string} juegoId - ID del juego a eliminar
 * @returns {Promise} Promesa con la confirmación de eliminación
 */
export const eliminarJuego = async (juegoId) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos/${juegoId}`, {
      method: 'DELETE',
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al eliminar juego:', error);
    throw error;
  }
};

// ============ FUNCIONES DE BÚSQUEDA ============

/**
 * Busca juegos en RAWG API. La duración (HowLongToBeat) no se incluye aquí:
 * el servidor la obtiene solo al añadir el juego, para no saturar a HLTB.
 * @param {string} terminoBusqueda - Término a buscar
 * @returns {Promise} Promesa con el array de juegos encontrados
 */
export const buscarJuegos = async (terminoBusqueda) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/busqueda/completo?q=${encodeURIComponent(terminoBusqueda)}`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al buscar juegos:', error);
    throw error;
  }
};

/**
 * Obtiene portadas de juegos populares para el fondo de la página de inicio.
 * Es una ruta pública y el servidor la cachea 24 horas.
 * @returns {Promise<string[]>} URLs de las imágenes (vacío si falla)
 */
export const obtenerPortadasInicio = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/busqueda/portadas`);
    const datos = await respuesta.json();
    return datos.exito ? datos.datos : [];
  } catch (error) {
    console.error('Error al obtener portadas:', error);
    return [];
  }
};

/**
 * Filtra juegos del usuario por estado
 * @param {string} estado - Estado a filtrar
 * @returns {Promise} Promesa con el array de juegos filtrados
 */
export const filtrarJuegosPorEstado = async (estado) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos/filtrar?estado=${estado}`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al filtrar juegos:', error);
    throw error;
  }
};

// ============ FUNCIONES DEL RECOMENDADOR ============

/**
 * Obtiene una recomendación de juego según el tiempo disponible
 * @param {number} tiempoDisponible - Tiempo en minutos
 * @param {string} [excluirId] - ID del último juego sugerido, para no repetirlo
 * @returns {Promise} Promesa con el juego recomendado
 */
export const obtenerRecomendacion = async (tiempoDisponible, excluirId) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/recomendador`, {
      method: 'POST',
      body: JSON.stringify({ tiempoDisponible, excluirId }),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener recomendación:', error);
    throw error;
  }
};

/**
 * Obtiene una recomendación aleatoria (modo "Sorpréndeme")
 * @param {string} [excluirId] - ID del último juego mostrado, para no repetirlo
 * @returns {Promise} Promesa con el juego recomendado
 */
export const obtenerRecomendacionAleatoria = async (excluirId) => {
  try {
    const parametros = excluirId ? `?excluirId=${encodeURIComponent(excluirId)}` : '';
    const respuesta = await fetchSeguro(`${API_URL}/recomendador/aleatorio${parametros}`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener recomendación aleatoria:', error);
    throw error;
  }
};

// ============ FUNCIONES DE SESIONES (CALENDARIO) ============

/**
 * Obtiene todas las sesiones planificadas del usuario
 * @returns {Promise} Promesa con el array de sesiones
 */
export const obtenerSesiones = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/sesiones`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    throw error;
  }
};

/**
 * Crea una nueva sesión de juego en el calendario
 * @param {Object} datosSesion - Datos de la sesión (sin usuarioId)
 * @returns {Promise} Promesa con los datos de la sesión creada
 */
export const crearSesion = async (datosSesion) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/sesiones`, {
      method: 'POST',
      body: JSON.stringify(datosSesion),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al crear sesión:', error);
    throw error;
  }
};

/**
 * Marca una sesión como realizada o la devuelve a planificada
 * @param {string} sesionId - ID de la sesión
 * @param {boolean} completada - Nuevo estado de la sesión
 * @returns {Promise} Promesa con la confirmación
 */
export const marcarSesionCompletada = async (sesionId, completada) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/sesiones/${sesionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completada }),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al actualizar sesión:', error);
    throw error;
  }
};

/**
 * Elimina una sesión del calendario
 * @param {string} sesionId - ID de la sesión a eliminar
 * @returns {Promise} Promesa con la confirmación
 */
export const eliminarSesion = async (sesionId) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/sesiones/${sesionId}`, {
      method: 'DELETE',
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas agregadas de la biblioteca del usuario
 * @returns {Promise} Promesa con las estadísticas calculadas
 */
export const obtenerEstadisticas = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/juegos/estadisticas`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    throw error;
  }
};
// ============ FUNCIONES DE AUTENTICACIÓN ============
// Estos métodos interactúan con el controlador de auth para gestionar 
// el ciclo de vida de la sesión mediante cookies seguras.

/**
 * Registra un nuevo usuario y establece la sesión inicial
 */
export const registrarUsuario = async (datosRegistro) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/auth/registro`, {
      method: 'POST',
      body: JSON.stringify(datosRegistro),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error en registro:', error);
    throw error;
  }
};

/**
 * Inicia sesión con credenciales existentes
 */
export const loginUsuario = async (credenciales) => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credenciales),
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
};

/**
 * Verifica si existe una sesión activa al cargar la aplicación
 */
export const verificarSesion = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/auth/verificar`);
    return await respuesta.json();
  } catch (error) {
    console.error('Error verificando sesión:', error);
    throw error;
  }
};

/**
 * Cierra la sesión y destruye la cookie en el servidor
 */
export const logoutUsuario = async () => {
  try {
    const respuesta = await fetchSeguro(`${API_URL}/auth/logout`, {
      method: 'POST',
    });
    return await respuesta.json();
  } catch (error) {
    console.error('Error en logout:', error);
    throw error;
  }
};