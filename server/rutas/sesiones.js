const express = require('express');
const router = express.Router();
// Reutilizamos la conexión compartida en lugar de abrir un pool nuevo por archivo
const prisma = require('../prisma');

// ============ MIDDLEWARE DE PROTECCIÓN ============
// Centralizamos la seguridad: si no hay sesión activa, bloqueamos 
// cualquier intento de lectura, creación o borrado de sesiones.
router.use((req, res, next) => {
  if (!req.session.usuarioId) {
    return res.status(401).json({ error: 'Acceso denegado: Inicie sesión' });
  }
  next();
});

// ============ GET /api/sesiones ============
// He actualizado este endpoint para recuperar las sesiones de planificación.
// La identidad se obtiene de req.session.usuarioId, garantizando que 
// Hugo solo vea sus propias partidas y no las de otros usuarios.
router.get('/', async (req, res) => {
  try {
    const usuarioId = req.session.usuarioId;

    const sesiones = await prisma.sesion.findMany({
      where: { usuarioId: usuarioId },
      orderBy: { fechaInicio: 'asc' }
    });
    
    // Devolvemos los datos directamente para que el frontend los mapee
    res.json(sesiones);
  } catch (error) {
    console.error('Error al obtener sesiones:', error);
    res.status(500).json({ error: 'Error al obtener las sesiones de juego' });
  }
});

// ============ POST /api/sesiones ============
// He modificado el endpoint POST para automatizar la asignación del usuarioId.
// Al extraer el identificador directamente de la sesión, mantenemos la 
// integridad referencial en la base de datos MySQL sin exponer IDs en el cliente.
router.post('/', async (req, res) => {
  try {
    const usuarioId = req.session.usuarioId;
    const { juegoTitulo, fechaInicio, fechaFin, notas } = req.body;

    const nuevaSesion = await prisma.sesion.create({
      data: {
        usuarioId: usuarioId,
        juegoTitulo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin || fechaInicio),
        notas
      }
    });
    res.status(201).json(nuevaSesion);
  } catch (error) {
    console.error('Error al crear sesión:', error);
    res.status(500).json({ error: 'Error al programar la sesión' });
  }
});

// ============ DELETE /api/sesiones/:id ============
// Esta operación realiza un borrado físico en la tabla 'sesion' de MySQL.
// Por seguridad, la cláusula 'where' incluye el usuarioId de la sesión para
// evitar que alguien borre una sesión ajena conociendo solo el ID numérico.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.session.usuarioId;

    await prisma.sesion.deleteMany({
      where: { 
        id: id,
        usuarioId: usuarioId 
      }
    });
    
    res.json({ mensaje: 'Sesión eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar sesión:', error);
    res.status(500).json({ error: 'Error al eliminar la sesión' });
  }
});

module.exports = router;