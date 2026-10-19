// rutas/usuarios.js - Gestión de datos del perfil del usuario logueado
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// ============ GET /api/usuarios/perfil ============
// Obtiene los datos del usuario que tiene la sesión iniciada.
// He modificado esta ruta para que no dependa de un ID en la URL,
// sino que utilice el identificador guardado en la sesión segura.
router.get('/perfil', async (req, res) => {
  try {
    const usuarioId = req.session.usuarioId;

    if (!usuarioId) {
      return res.status(401).json({
        exito: false,
        mensaje: 'Debe iniciar sesión para ver su perfil'
      });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      // Solo devolvemos la información necesaria para el perfil
      select: {
        id: true,
        email: true,
        nombre: true,
        fotoUrl: true,
        fechaCreacion: true
      }
    });

    if (!usuario) {
      return res.status(404).json({ exito: false, mensaje: 'Perfil no encontrado' });
    }

    res.json({ exito: true, datos: usuario });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ exito: false, mensaje: 'Error de servidor' });
  }
});

// ============ GET /api/usuarios (SOLO DESARROLLO) ============
// He mantenido esta ruta pero ahora verifica que haya una sesión activa.
// En un entorno real, aquí añadiríamos una comprobación de rol 'admin'.
router.get('/', async (req, res) => {
  try {
    if (!req.session.usuarioId) {
      return res.status(403).json({ mensaje: 'Acceso denegado' });
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        fechaCreacion: true
      }
    });
    
    res.json({ exito: true, datos: usuarios });
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al listar usuarios' });
  }
});

module.exports = router;