const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { obtenerDuracion } = require('../servicios/hltb');

// Convierte un valor de entrada en horas enteras positivas o null
const horasValidas = (valor) => {
  const numero = Math.round(Number(valor));
  return Number.isFinite(numero) && numero > 0 ? numero : null;
};

// ============ MIDDLEWARE DE PROTECCIÓN ============
router.use((req, res, next) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ exito: false, mensaje: 'Sesión no válida' });
  }
  next();
});

// ============ GET /api/juegos ============
router.get('/', async (req, res) => {
  try {
    const juegos = await prisma.juegoUsuario.findMany({
      where: { usuarioId: req.session.usuarioId },
      orderBy: { fechaAgregado: 'desc' }
    });
    res.json({ exito: true, cantidad: juegos.length, datos: juegos });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al obtener juegos' });
  }
});

// ============ POST /api/juegos ============
router.post('/', async (req, res) => {
  try {
    const datos = req.body;
    const usuarioId = req.session.usuarioId;
    const titulo = (datos.titulo || '').trim();

    if (!titulo) {
      return res.status(400).json({ exito: false, mensaje: 'El título del juego es obligatorio' });
    }

    // Evitamos duplicados en la biblioteca del usuario (por ID de RAWG o por título)
    const yaExiste = await prisma.juegoUsuario.findFirst({
      where: {
        usuarioId,
        OR: [
          ...(datos.juegoIdExterno ? [{ juegoIdExterno: String(datos.juegoIdExterno) }] : []),
          { titulo }
        ]
      },
      select: { id: true }
    });

    if (yaExiste) {
      return res.status(409).json({ exito: false, mensaje: 'Este juego ya forma parte de tu biblioteca' });
    }

    // Obtención de la duración, de la opción más barata a la más cara:
    //   1. La que envíe el cliente (introducida a mano).
    //   2. La de otro usuario que ya añadió el mismo juego (sin salir a la red).
    //   3. HowLongToBeat, con una única petición en el momento de añadir.
    let duracion = {
      duracionPrincipal: horasValidas(datos.duracionPrincipal),
      duracionTotal: horasValidas(datos.duracionTotal)
    };

    if (!duracion.duracionPrincipal && datos.juegoIdExterno) {
      const conocido = await prisma.juegoUsuario.findFirst({
        where: {
          juegoIdExterno: String(datos.juegoIdExterno),
          duracionPrincipal: { not: null },
          duracionTotal: { not: null }
        },
        select: { duracionPrincipal: true, duracionTotal: true }
      });
      if (conocido) duracion = conocido;
    }

    if (!duracion.duracionPrincipal) {
      duracion = await obtenerDuracion(titulo, datos.anio);
    }

    // Si no hay duración la guardamos como null (desconocida) en lugar de inventar
    // un valor. El recomendador y las estadísticas ya contemplan este caso, y el
    // usuario puede introducirla a mano desde el editor del juego.
    const nuevoJuego = await prisma.juegoUsuario.create({
      data: {
        titulo,
        caratulaUrl: datos.caratulaUrl || '',
        genero: datos.genero || 'Varios',
        plataforma: datos.plataforma || 'PC',
        duracionPrincipal: duracion.duracionPrincipal,
        duracionTotal: duracion.duracionTotal,
        usuarioId: usuarioId,
        estado: 'pendiente',
        prioridad: 'media',
        progreso: 0,
        valoracion: null,
        juegoIdExterno: datos.juegoIdExterno ? String(datos.juegoIdExterno) : String(Date.now())
      }
    });

    res.status(201).json({ exito: true, datos: nuevoJuego });
  } catch (error) {
    console.error("Error al añadir juego:", error);
    res.status(500).json({ exito: false, mensaje: 'Error al procesar la inserción del juego' });
  }
});

// ============ PUT /api/juegos/:id ============
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, prioridad, progreso, valoracion, notasPersonales, duracionPrincipal } = req.body;

    const juegoActualizado = await prisma.juegoUsuario.update({
      where: {
        id: id,
        usuarioId: req.session.usuarioId
      },
      data: {
        estado,
        prioridad,
        progreso: progreso ? parseInt(progreso) : 0,
        valoracion: valoracion ? parseFloat(valoracion) : null,
        notasPersonales,
        // Permite corregir a mano la duración si HLTB no la encontró
        ...(duracionPrincipal !== undefined && { duracionPrincipal: horasValidas(duracionPrincipal) })
      }
    });

    res.json({
      exito: true,
      mensaje: 'Juego actualizado correctamente',
      datos: juegoActualizado
    });
  } catch (error) {
    console.error('Error al actualizar juego:', error);
    res.status(500).json({ 
      exito: false, 
      mensaje: 'Error al modificar los datos en la base de datos' 
    });
  }
});

// ============ GET /api/juegos/estadisticas ============
router.get('/estadisticas', async (req, res) => {
  try {
    const usuarioId = req.session.usuarioId;

    const juegos = await prisma.juegoUsuario.findMany({
      where: { usuarioId }
    });

    // Contadores basados estrictamente en tu columna 'estado'
    const distribucionEstados = {
      pendiente: juegos.filter(j => j.estado === 'pendiente').length,
      jugando: juegos.filter(j => j.estado === 'jugando').length,
      completado: juegos.filter(j => j.estado === 'completado').length,
      abandonado: juegos.filter(j => j.estado === 'abandonado').length
    };

    const generosCuenta = {};
    juegos.forEach(j => {
      if (j.genero) generosCuenta[j.genero] = (generosCuenta[j.genero] || 0) + 1;
    });

    const topGeneros = Object.entries(generosCuenta)
      .map(([genero, cantidad]) => ({ genero, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Suma de horas del backlog
    const horasEstimadas = juegos
      .filter(j => j.estado === 'pendiente' || j.estado === 'jugando')
      .reduce((total, j) => total + (j.duracionPrincipal || 0), 0);

    // Cálculo del porcentaje de completados sobre el total
    const porcentajeCompletado = juegos.length > 0 
      ? Math.round((distribucionEstados.completado / juegos.length) * 100) 
      : 0;

    // Nota media y podio, solo con los juegos que el usuario ha valorado
    const valorados = juegos.filter(j => j.valoracion !== null && j.valoracion !== undefined);
    const notaMedia = valorados.length > 0
      ? Math.round((valorados.reduce((total, j) => total + j.valoracion, 0) / valorados.length) * 10) / 10
      : null;

    const topValorados = [...valorados]
      .sort((a, b) => b.valoracion - a.valoracion || a.titulo.localeCompare(b.titulo))
      .slice(0, 3)
      .map(j => ({ id: j.id, titulo: j.titulo, caratulaUrl: j.caratulaUrl, valoracion: j.valoracion }));

    res.json({
      exito: true,
      datos: {
        distribucionEstados,
        topGeneros,
        horasEstimadas,
        porcentajeCompletado,
        totalJuegos: juegos.length,
        juegosCompletados: distribucionEstados.completado,
        juegosPendientes: distribucionEstados.pendiente + distribucionEstados.jugando,
        notaMedia,
        juegosValorados: valorados.length,
        topValorados
      }
    });
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al calcular estadísticas' });
  }
});

// ============ DELETE /api/juegos/:id ============
router.delete('/:id', async (req, res) => {
  try {
    await prisma.juegoUsuario.delete({
      where: { 
        id: req.params.id, 
        usuarioId: req.session.usuarioId 
      }
    });
    res.json({ exito: true, mensaje: 'Juego eliminado' });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al eliminar' });
  }
});

module.exports = router;