// rutas/busqueda.js - Búsqueda de videojuegos en el catálogo externo (RAWG)
const express = require('express');
const router = express.Router();

// La búsqueda consulta únicamente RAWG. La duración (HowLongToBeat) se obtiene
// solo cuando el usuario añade un juego a su biblioteca (POST /api/juegos).
// Antes se lanzaba una petición a HLTB por cada resultado de la búsqueda, lo
// que multiplicaba el tráfico y acababa provocando el bloqueo de la IP.

// Caché breve de resultados para no repetir la misma búsqueda contra RAWG
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cacheBusquedas = new Map();

// ============ GET /api/busqueda/portadas ============
// Ruta pública: devuelve portadas de juegos populares para el fondo decorativo
// de la página de inicio. Se cachea 24 horas, así que RAWG recibe como mucho
// una petición al día independientemente de cuántos visitantes entren.
const PORTADAS_TTL_MS = 24 * 60 * 60 * 1000;
let cachePortadas = { datos: null, expira: 0 };

// RAWG permite pedir la imagen recortada; como en el fondo va difuminada,
// una versión pequeña pesa mucho menos y se ve igual
const imagenReducida = (url) => url?.replace('/media/games/', '/media/crop/600/400/games/');

router.get('/portadas', async (req, res) => {
  try {
    if (cachePortadas.datos && cachePortadas.expira > Date.now()) {
      return res.json({ exito: true, datos: cachePortadas.datos });
    }

    const respuestaRAWG = await fetch(
      `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&ordering=-added&page_size=24`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!respuestaRAWG.ok) throw new Error(`Fallo en la conexión con RAWG (${respuestaRAWG.status})`);

    const datosRAWG = await respuestaRAWG.json();
    const portadas = (datosRAWG.results || [])
      .map(juego => imagenReducida(juego.background_image))
      .filter(Boolean);

    cachePortadas = { datos: portadas, expira: Date.now() + PORTADAS_TTL_MS };
    res.json({ exito: true, datos: portadas });

  } catch (error) {
    console.error('Error al obtener portadas:', error.message);
    // Si falla pero teníamos portadas antiguas, las servimos igualmente
    res.json({ exito: true, datos: cachePortadas.datos || [] });
  }
});

// ============ GET /api/busqueda/completo ============
router.get('/completo', async (req, res) => {
  try {
    // PROTECCIÓN DE SESIÓN:
    // Verificamos que el usuario esté autenticado antes de permitir
    // el uso de recursos y APIs externas.
    if (!req.session.usuarioId) {
      return res.status(401).json({ exito: false, mensaje: 'Debe iniciar sesión para buscar juegos' });
    }

    const termino = (req.query.q || '').trim();

    if (termino.length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'Término de búsqueda requerido' });
    }

    const clave = termino.toLowerCase();
    const enCache = cacheBusquedas.get(clave);
    if (enCache && enCache.expira > Date.now()) {
      return res.json({ exito: true, datos: enCache.datos });
    }

    const respuestaRAWG = await fetch(
      `https://api.rawg.io/api/games?key=${process.env.RAWG_API_KEY}&search=${encodeURIComponent(termino)}&page_size=10`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!respuestaRAWG.ok) throw new Error(`Fallo en la conexión con RAWG (${respuestaRAWG.status})`);

    const datosRAWG = await respuestaRAWG.json();

    // Filtramos en el servidor y enviamos al cliente solo los campos necesarios
    const juegos = (datosRAWG.results || []).map(juego => ({
      juegoIdExterno: juego.id.toString(), // ID de RAWG
      titulo: juego.name,
      caratulaUrl: juego.background_image,
      genero: juego.genres?.map(g => g.name).join(', ') || 'General',
      plataforma: juego.platforms?.map(p => p.platform.name).slice(0, 3).join(', '),
      anio: juego.released ? Number(juego.released.slice(0, 4)) : null,
      metacritic: juego.metacritic
    }));

    if (cacheBusquedas.size >= CACHE_MAX) cacheBusquedas.delete(cacheBusquedas.keys().next().value);
    cacheBusquedas.set(clave, { datos: juegos, expira: Date.now() + CACHE_TTL_MS });

    res.json({ exito: true, datos: juegos });

  } catch (error) {
    console.error('Error en búsqueda:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al procesar la búsqueda' });
  }
});

module.exports = router;
