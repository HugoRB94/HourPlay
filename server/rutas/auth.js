const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// Reutilizamos la conexión compartida en lugar de abrir un pool nuevo por archivo
const prisma = require('../prisma');

// Para la implementación de la seguridad en el registro,
// he optado por utilizar el módulo nativo crypto de Node.js. De esta forma, 
// aplico un hash SHA-256 a la contraseña antes de persistirla en MySQL.
// Así evito el almacenamiento en texto plano, cumpliendo con los estándares
// de seguridad del entorno servidor sin depender de librerías externas.

router.post('/registro', async (req, res) => {
  try {
    const { email, password, nombre } = req.body;

    if (!email || !password) {
      return res.status(400).json({ exito: false, mensaje: 'Email y contraseña son obligatorios' });
    }

    const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
    if (existente) {
      return res.status(409).json({ exito: false, mensaje: 'Este correo electrónico ya está en uso' });
    }
    
    const hashPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email: email,
        password: hashPassword,
        nombre: nombre || null,
        proveedorAuth: 'local',
        proveedorId: email
      }
    });
    
    // He implementado el guardado explícito de la sesión mediante el método 
    // req.session.save(). Esta aproximación garantiza que la cookie de 
    // identificación se emita y persista correctamente en el cliente antes 
    // de realizar la redirección, evitando fallos de autenticación por asincronía.
    req.session.usuarioId = nuevoUsuario.id;
    req.session.save((err) => {
      if (err) {
        console.error("Error al guardar sesión en registro:", err);
        return res.status(500).json({ exito: false, mensaje: 'Error al iniciar sesión tras registro' });
      }
      console.log("=== USUARIO CREADO Y SESIÓN GUARDADA ===", nuevoUsuario.id);
      // Devolvemos también el id para que el cliente guarde el usuario real
      // en el contexto en lugar de un identificador provisional.
      res.json({
        exito: true,
        mensaje: 'Usuario registrado correctamente',
        usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre }
      });
    });
    
  } catch (error) {
    console.error("=== ERROR CRÍTICO AL GUARDAR EN MYSQL ===");
    console.error(error);
    res.status(500).json({ exito: false, mensaje: 'Error al registrar usuario' });
  }
});

// En el proceso de login, el sistema aplica el mismo 
// algoritmo de hash a la contraseña introducida por el usuario en el cliente.
// Luego, compara este resultado con el hash almacenado en la base de datos,
// garantizando la validación de credenciales sin exponer la clave original.

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ exito: false, mensaje: 'Email y contraseña son obligatorios' });
    }
    
    const usuario = await prisma.usuario.findUnique({ where: { email: email } });
    
    if (!usuario) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }
    
    const hashIntento = crypto.createHash('sha256').update(password).digest('hex');
    
    if (usuario.password !== hashIntento) {
      return res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
    }
    
    // Al igual que en el registro, aseguro la persistencia de la sesión 
    // antes de confirmar el éxito del login al frontend.
    req.session.usuarioId = usuario.id;
    req.session.save((err) => {
      if (err) {
        return res.status(500).json({ exito: false, mensaje: 'Error al procesar login' });
      }
      res.json({ exito: true, mensaje: 'Login exitoso', usuario: { nombre: usuario.nombre } });
    });
    
  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al iniciar sesión' });
  }
});

// Estas rutas gestionan el ciclo de vida de la sesión.
// La ruta verificar permite al frontend saber si el usuario sigue conectado 
// tras recargar la página, y la ruta logout destruye la sesión en el servidor.

router.get('/verificar', (req, res) => {
  // Para la depuración en entorno de desarrollo, imprimo el estado de la sesión
  // cada vez que el frontend solicita una verificación de credenciales.
  console.log("Verificando sesión. ID actual:", req.session.usuarioId);
  
  if (req.session.usuarioId) {
    res.json({ exito: true, autenticado: true, usuarioId: req.session.usuarioId });
  } else {
    res.json({ exito: true, autenticado: false });
  }
});

// rutas/auth.js

// Endpoint para cerrar sesión
router.post('/logout', (req, res) => {
  // 1. Destruimos la sesión en el servidor (borra los datos en memoria/DB)
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al destruir sesión:", err);
      return res.status(500).json({ exito: false, mensaje: 'Error al cerrar sesión' });
    }
    
    // 2. IMPORTANTE: Limpiamos la cookie en el navegador del usuario.
    // El nombre 'connect.sid' es el que usa express-session por defecto.
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: false, // Cámbialo a true si usas HTTPS en el futuro
      sameSite: 'lax'
    });
    
    console.log("=== SESIÓN CERRADA Y COOKIE ELIMINADA CORRECTAMENTE ===");
    res.json({ exito: true, mensaje: 'Sesión cerrada correctamente' });
  });
});

module.exports = router;