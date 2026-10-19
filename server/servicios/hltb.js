// servicios/hltb.js - Cliente propio y controlado para HowLongToBeat (HLTB)
//
// He sustituido la librería 'howlongtobeat' de npm por este módulo porque:
//   1. La librería apuntaba a un endpoint antiguo (/api/search) que HLTB ya
//      no acepta y responde siempre con 403.
//   2. Enviaba un User-Agent aleatorio en cada petición, un patrón típico de
//      bot que provoca el bloqueo de la IP.
//
// La web actual funciona en dos pasos: primero pide un token a
// /api/search/site/init (ligado a la IP y al User-Agent) y después lanza la
// búsqueda en /api/search/site con la cabecera 'x-auth-token'.
//
// Para no saturar a HLTB, este servicio aplica cuatro protecciones:
//   - Caché en memoria por título (una consulta repetida no sale a la red).
//   - Cola secuencial con un intervalo mínimo entre peticiones.
//   - Deduplicación: si dos usuarios añaden el mismo juego a la vez, solo
//     se hace una petición.
//   - Pausa automática (cooldown) si HLTB responde 429 o bloquea el acceso.

const URL_BASE = 'https://howlongtobeat.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CABECERAS = {
  'User-Agent': USER_AGENT,
  Referer: `${URL_BASE}/`,
  Origin: URL_BASE
};

const INTERVALO_MINIMO_MS = 1500;          // Separación mínima entre peticiones
const TIMEOUT_MS = 8000;                   // Tiempo máximo de espera por petición
const COOLDOWN_MS = 10 * 60 * 1000;        // Pausa tras un 429 / bloqueo
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Las duraciones apenas cambian
const CACHE_MAX = 1000;

const cache = new Map();      // titulo normalizado -> { valor, expira }
const enCurso = new Map();    // titulo normalizado -> Promise
let token = null;
let colaPeticiones = Promise.resolve();
let ultimaPeticion = 0;
let pausadoHasta = 0;

// ============ UTILIDADES ============

const normalizar = (texto) => String(texto || '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

// Similitud entre 0 y 1 basada en la distancia de Levenshtein
const similitud = (a, b) => {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    for (let j = 1; j <= b.length; j++) {
      const coste = a[i - 1] === b[j - 1] ? 0 : 1;
      nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + coste);
    }
    fila = nueva;
  }
  return 1 - fila[b.length] / Math.max(a.length, b.length);
};

// HLTB devuelve los tiempos en segundos; los guardamos en horas enteras
const aHoras = (segundos) => (segundos > 0 ? Math.max(1, Math.round(segundos / 3600)) : null);

// Encadena las peticiones para que nunca haya dos a la vez y respeten el intervalo
const enCola = (tarea) => {
  const resultado = colaPeticiones.then(async () => {
    const espera = ultimaPeticion + INTERVALO_MINIMO_MS - Date.now();
    if (espera > 0) await new Promise(r => setTimeout(r, espera));
    try {
      return await tarea();
    } finally {
      ultimaPeticion = Date.now();
    }
  });
  colaPeticiones = resultado.catch(() => {});
  return resultado;
};

// ============ PETICIONES A HLTB ============

const obtenerToken = async () => {
  const respuesta = await fetch(`${URL_BASE}/api/search/site/init?t=${Date.now()}`, {
    headers: CABECERAS,
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!respuesta.ok) {
    const error = new Error(`HLTB init respondió ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }
  const datos = await respuesta.json();
  token = datos.token;
  return token;
};

const peticionBusqueda = (titulo) => fetch(`${URL_BASE}/api/search/site`, {
  method: 'POST',
  headers: { ...CABECERAS, 'Content-Type': 'application/json', 'x-auth-token': token },
  signal: AbortSignal.timeout(TIMEOUT_MS),
  body: JSON.stringify({
    searchType: 'games',
    searchTerms: titulo.trim().split(/\s+/),
    searchPage: 1,
    size: 20,
    searchOptions: {
      games: {
        userId: 0, platform: '', sortCategory: 'popular', rangeCategory: 'main',
        rangeTime: { min: 0, max: 0 },
        gameplay: { perspective: '', flow: '', genre: '' },
        rangeYear: { min: '', max: '' },
        modifier: ''
      },
      users: { sortCategory: 'postcount' },
      lists: { sortCategory: 'follows' },
      filter: '', sort: 0, randomizer: 0
    },
    useCache: true
  })
});

const buscarEnHLTB = async (titulo) => {
  if (!token) await obtenerToken();

  let respuesta = await peticionBusqueda(titulo);

  // El token caduca: HLTB responde 403 y basta con pedir uno nuevo una vez
  if (respuesta.status === 403) {
    await obtenerToken();
    respuesta = await peticionBusqueda(titulo);
  }

  if (!respuesta.ok) {
    const error = new Error(`HLTB búsqueda respondió ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  const datos = await respuesta.json();
  return Array.isArray(datos.data) ? datos.data : [];
};

// Elige el resultado más parecido al título de RAWG (y al año, si lo tenemos)
const elegirMejorCoincidencia = (resultados, titulo, anio) => {
  const objetivo = normalizar(titulo);
  let mejor = null;
  let mejorPuntuacion = 0;

  for (const juego of resultados) {
    let puntuacion = Math.max(
      similitud(objetivo, normalizar(juego.game_name)),
      similitud(objetivo, normalizar(juego.game_alias))
    );
    if (anio && Number(juego.release_world) === Number(anio)) puntuacion += 0.1;
    if (puntuacion > mejorPuntuacion) {
      mejor = juego;
      mejorPuntuacion = puntuacion;
    }
  }

  // Por debajo de este umbral preferimos no inventar una duración
  return mejorPuntuacion >= 0.6 ? mejor : null;
};

// ============ API PÚBLICA DEL SERVICIO ============

/**
 * Obtiene la duración estimada de un juego.
 * Nunca lanza excepciones: si HLTB falla o no encuentra el juego devuelve
 * { duracionPrincipal: null, duracionTotal: null } para no bloquear al usuario.
 * @param {string} titulo - Título del juego (el que devuelve RAWG)
 * @param {number} [anio] - Año de lanzamiento, ayuda a desambiguar remakes
 */
const obtenerDuracion = async (titulo, anio) => {
  const sinDatos = { duracionPrincipal: null, duracionTotal: null };
  const clave = normalizar(titulo);
  if (!clave) return sinDatos;

  const enCache = cache.get(clave);
  if (enCache && enCache.expira > Date.now()) return enCache.valor;

  if (Date.now() < pausadoHasta) {
    console.warn(`HLTB en pausa por limitación de peticiones; se omite "${titulo}"`);
    return sinDatos;
  }

  if (enCurso.has(clave)) return enCurso.get(clave);

  const promesa = enCola(() => buscarEnHLTB(titulo))
    .then((resultados) => {
      const juego = elegirMejorCoincidencia(resultados, titulo, anio);
      const valor = juego
        ? { duracionPrincipal: aHoras(juego.comp_main), duracionTotal: aHoras(juego.comp_100) }
        : sinDatos;

      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(clave, { valor, expira: Date.now() + CACHE_TTL_MS });
      return valor;
    })
    .catch((error) => {
      if (error.status === 429 || error.status === 403) {
        pausadoHasta = Date.now() + COOLDOWN_MS;
        token = null;
        console.warn(`HLTB limitó las peticiones (${error.status}); pausa de ${COOLDOWN_MS / 60000} minutos`);
      } else {
        console.warn(`HLTB error para "${titulo}":`, error.message);
      }
      return sinDatos;
    })
    .finally(() => enCurso.delete(clave));

  enCurso.set(clave, promesa);
  return promesa;
};

module.exports = { obtenerDuracion };
