// rutas/recomendador.js - Motor de recomendación inteligente de HourPlay
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// ============ MIDDLEWARE DE PROTECCIÓN ============
router.use((req, res, next) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ exito: false, mensaje: 'Sesión no válida' });
  }
  next();
});

// La prioridad se guarda como texto, así que se traduce a un peso numérico
const PESO_PRIORIDAD = { alta: 3, media: 2, baja: 1 };

// Formatea horas para los mensajes: 1 -> "1 hora", 2.5 -> "2,5 horas"
const formatearHoras = (horas) => {
  const redondeado = Math.round(horas * 10) / 10;
  return `${String(redondeado).replace('.', ',')} ${redondeado === 1 ? 'hora' : 'horas'}`;
};

// Recupera los juegos pendientes o en curso del usuario
const obtenerPendientes = (usuarioId) => prisma.juegoUsuario.findMany({
  where: { usuarioId, estado: { in: ['pendiente', 'jugando'] } }
});

// Horas que le quedan al usuario para terminar la historia (null si no se conoce)
const horasRestantes = (juego) => {
  if (!juego.duracionPrincipal) return null;
  const restante = juego.duracionPrincipal * (1 - (juego.progreso || 0) / 100);
  return Math.max(restante, 0.5);
};

// ============ ALGORITMO DE PUNTUACIÓN ============
// Cada juego recibe una puntuación según cuánto encaja con la sesión.
// Las tres variables que se cruzan son el tiempo disponible, el tiempo que le
// queda al juego y las preferencias del usuario (prioridad y estado).
const puntuarJuego = (juego, horasSesion) => {
  const restante = horasRestantes(juego);
  let puntuacion = (PESO_PRIORIDAD[juego.prioridad] || 2) * 10;

  if (juego.estado === 'jugando') {
    // Continuar lo que ya se está jugando es lo más natural, y más aún
    // en sesiones largas donde se puede avanzar mucho
    puntuacion += horasSesion >= 4 ? 35 : 15;
  }

  if (restante === null) {
    // Sin duración conocida no podemos razonar sobre el encaje temporal
    return puntuacion;
  }

  if (restante <= horasSesion) {
    // Se puede terminar en esta misma sesión: es la mejor recomendación posible.
    // Cuanto más aproveche el tiempo disponible, mejor (no 20 min en una sesión de 8 h)
    puntuacion += 40 + 20 * (restante / horasSesion);
  } else {
    // No se termina hoy: preferimos los juegos donde la sesión supone un avance notable
    const fraccionAvance = horasSesion / restante;
    puntuacion += 30 * fraccionAvance;
    // En sesiones cortas penalizamos los juegos muy largos (cuesta "entrar" en ellos)
    if (horasSesion <= 2 && restante > 30) puntuacion -= 10;
  }

  return puntuacion;
};

// Elige entre los mejores candidatos con probabilidad proporcional al cuadrado
// de su puntuación: el mejor sale más a menudo, pero no siempre el mismo.
const elegirPonderado = (candidatos) => {
  const peso = (c) => c.puntuacion ** 2;
  const total = candidatos.reduce((suma, c) => suma + peso(c), 0);
  let azar = Math.random() * total;
  for (const candidato of candidatos) {
    azar -= peso(candidato);
    if (azar <= 0) return candidato;
  }
  return candidatos[candidatos.length - 1];
};

// Construye la explicación que verá el usuario
const explicarRecomendacion = (juego, horasSesion) => {
  const restante = horasRestantes(juego);
  const sesion = formatearHoras(horasSesion);

  if (restante === null) {
    return juego.estado === 'jugando'
      ? `Ya lo estás jugando: aprovecha tu sesión de ${sesion} para seguir avanzando.`
      : `Es uno de tus pendientes de prioridad ${juego.prioridad}. Aún no conocemos su duración; puedes indicarla desde tu biblioteca.`;
  }

  if (restante <= horasSesion) {
    return juego.progreso > 0
      ? `Te quedan aproximadamente ${formatearHoras(restante)} para terminarlo: ¡en tu sesión de ${sesion} puedes acabarlo hoy!`
      : `Su historia dura aproximadamente ${formatearHoras(restante)}: cabe entera en tu sesión de ${sesion}.`;
  }

  const porcentaje = Math.round((horasSesion / restante) * 100);
  return juego.estado === 'jugando'
    ? `Ya lo estás jugando (${juego.progreso}% completado). Con ${sesion} avanzarás aproximadamente un ${porcentaje}% más.`
    : `Con ${sesion} completarás aproximadamente un ${porcentaje}% de su historia, un buen avance para empezarlo.`;
};

// ============ POST /api/recomendador ============
// Body: { tiempoDisponible: minutos, excluirId?: id del último juego sugerido }
router.post('/', async (req, res) => {
  try {
    const minutos = parseInt(req.body.tiempoDisponible, 10);

    if (!Number.isFinite(minutos) || minutos <= 0) {
      return res.status(400).json({ exito: false, mensaje: 'El tiempo disponible debe ser un número de minutos válido' });
    }

    const horasSesion = minutos / 60;
    const pendientes = await obtenerPendientes(req.session.usuarioId);

    if (pendientes.length === 0) {
      return res.json({ exito: true, mensaje: 'No tienes juegos pendientes en tu biblioteca', datos: null });
    }

    // Si el usuario pide otra sugerencia, evitamos repetir la anterior
    const candidatos = pendientes.length > 1 && req.body.excluirId
      ? pendientes.filter(j => j.id !== req.body.excluirId)
      : pendientes;

    const mejores = candidatos
      .map(juego => ({ juego, puntuacion: Math.max(puntuarJuego(juego, horasSesion), 1) }))
      .sort((a, b) => b.puntuacion - a.puntuacion)
      .slice(0, 3);

    const { juego } = elegirPonderado(mejores);
    const restante = horasRestantes(juego);

    res.json({
      exito: true,
      tiempoDisponible: formatearHoras(horasSesion),
      totalJuegosPendientes: pendientes.length,
      datos: {
        ...juego,
        razonRecomendacion: explicarRecomendacion(juego, horasSesion),
        horasRestantes: restante !== null ? Math.round(restante * 10) / 10 : null,
        porcentajeTiempo: restante !== null ? Math.min(100, Math.round((horasSesion / restante) * 100)) : null
      }
    });

  } catch (error) {
    console.error('Error en recomendador:', error);
    res.status(500).json({ exito: false, mensaje: 'Error al obtener recomendación' });
  }
});

// ============ GET /api/recomendador/aleatorio ============
// Modo "Sorpréndeme": selección al azar entre los pendientes, sin repetir
// el último juego mostrado (?excluirId=...) para que se note la variedad.
router.get('/aleatorio', async (req, res) => {
  try {
    const pendientes = await obtenerPendientes(req.session.usuarioId);

    if (pendientes.length === 0) {
      return res.json({ exito: true, mensaje: 'No tienes juegos pendientes en tu biblioteca', datos: null });
    }

    const candidatos = pendientes.length > 1 && req.query.excluirId
      ? pendientes.filter(j => j.id !== req.query.excluirId)
      : pendientes;

    const juego = candidatos[Math.floor(Math.random() * candidatos.length)];
    const restante = horasRestantes(juego);

    let razon = '¡Sorpresa! El azar ha elegido este juego de tu biblioteca.';
    if (juego.estado === 'jugando') razon += ` Ya lo llevas al ${juego.progreso}%, ¿lo retomas?`;
    else if (restante !== null) razon += ` Su historia dura aproximadamente ${formatearHoras(restante)}.`;

    res.json({
      exito: true,
      totalJuegosPendientes: pendientes.length,
      datos: {
        ...juego,
        razonRecomendacion: razon,
        horasRestantes: restante !== null ? Math.round(restante * 10) / 10 : null,
        porcentajeTiempo: null
      }
    });

  } catch (error) {
    console.error('Error en recomendación aleatoria:', error);
    res.status(500).json({ exito: false, mensaje: 'Error en recomendación aleatoria' });
  }
});

module.exports = router;
