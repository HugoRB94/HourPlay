const express = require('express');
const crypto = require('crypto');
const router = express.Router();
// Reutilizamos la conexión compartida en lugar de abrir un pool nuevo por archivo
const prisma = require('../prisma');
const { PROVEEDORES } = require('../servicios/oauth');

const EN_PRODUCCION = process.env.NODE_ENV === 'production';

// Para la implementación de la seguridad en el registro,
// he optado por utilizar el módulo nativo crypto de Node.js sin depender de
// librerías externas. Las contraseñas se guardan con scrypt, un algoritmo
// diseñado para ser lento y costoso en memoria, con una sal aleatoria por
// usuario. Así dos contraseñas iguales producen hashes distintos y un ataque
// de fuerza bruta o con tablas precalculadas resulta inviable.
// Formato guardado: scrypt$<sal en hex>$<hash en hex>
const LONGITUD_HASH = 64;

const derivarClave = (password, sal) => new Promise((resolve, reject) => {
  crypto.scrypt(password, sal, LONGITUD_HASH, (err, clave) => (err ? reject(err) : resolve(clave)));
});

const hashearPassword = async (password) => {
  const sal = crypto.randomBytes(16);
  const clave = await derivarClave(password, sal);
  return `scrypt$${sal.toString('hex')}$${clave.toString('hex')}`;
};

// Compara en tiempo constante (timingSafeEqual) para no filtrar información
// por el tiempo de respuesta. Las cuentas antiguas guardaban un SHA-256 sin sal;
// se siguen aceptando y el login las convierte a scrypt (ver necesitaRehash).
const verificarPassword = async (password, guardado) => {
  const [algoritmo, salHex, hashHex] = guardado.split('$');
  let esperado;
  let calculado;
  if (algoritmo === 'scrypt' && salHex && hashHex) {
    esperado = Buffer.from(hashHex, 'hex');
    calculado = await derivarClave(password, Buffer.from(salHex, 'hex'));
  } else {
    esperado = Buffer.from(guardado, 'hex');
    calculado = crypto.createHash('sha256').update(password).digest();
  }
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
};

const necesitaRehash = (guardado) => !guardado.startsWith('scrypt$');

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
    
    const hashPassword = await hashearPassword(password);
    
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
// algoritmo de hash (con la sal guardada) a la contraseña introducida por el usuario.
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

    // Las cuentas creadas con Google, Apple, Facebook o GitHub no tienen contraseña
    if (!usuario.password) {
      return res.status(401).json({ exito: false, mensaje: 'Esta cuenta usa inicio de sesión con Google, Apple, Facebook o GitHub' });
    }

    if (!(await verificarPassword(password, usuario.password))) {
      return res.status(401).json({ exito: false, mensaje: 'Contraseña incorrecta' });
    }

    // Migración transparente: si la cuenta aún tiene el hash SHA-256 antiguo,
    // se aprovecha que ahora conocemos la contraseña correcta para guardarla con scrypt.
    if (necesitaRehash(usuario.password)) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { password: await hashearPassword(password) }
      });
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
    // Las opciones deben coincidir con las de la cookie de sesión (index.js),
    // si no el navegador no la reconoce como la misma y no la borra.
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: EN_PRODUCCION,
      sameSite: process.env.COOKIE_SAMESITE || 'lax'
    });
    
    console.log("=== SESIÓN CERRADA Y COOKIE ELIMINADA CORRECTAMENTE ===");
    res.json({ exito: true, mensaje: 'Sesión cerrada correctamente' });
  });
});

// ============ INICIO DE SESIÓN CON PROVEEDORES EXTERNOS ============
// Flujo OAuth 2.0: el navegador va a /oauth/:proveedor, este redirige a la pantalla
// del proveedor y, tras aceptar, el proveedor devuelve al usuario a /oauth/:proveedor/callback
// con un código de un solo uso que el servidor canjea por el perfil.

// Al terminar se redirige al frontend: primer dominio de CLIENT_URL o Vite en local
const URL_FRONTEND = ((process.env.CLIENT_URL || '').split(',')[0].trim() || 'http://localhost:5173').replace(/\/$/, '');

// El parámetro state protege contra CSRF: se guarda en una cookie propia y se
// comprueba que el proveedor lo devuelva igual. No se guarda en la sesión porque
// Apple vuelve con un POST desde otro dominio y el navegador no envía la cookie
// de sesión (SameSite=lax) en ese caso; esta cookie usa SameSite=none en producción.
const COOKIE_STATE = 'hourplay_oauth_state';
const opcionesCookieState = {
  httpOnly: true,
  secure: EN_PRODUCCION,
  sameSite: EN_PRODUCCION ? 'none' : 'lax',
  path: '/api/auth/oauth',
  maxAge: 1000 * 60 * 10
};

const leerCookie = (req, nombre) => {
  const par = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${nombre}=`));
  return par ? decodeURIComponent(par.slice(nombre.length + 1)) : null;
};

const volverAlLogin = (res, codigoError) => res.redirect(303, `${URL_FRONTEND}/login?error=${codigoError}`);

// Busca al usuario por su cuenta del proveedor; si no existe, lo vincula a una
// cuenta con el mismo email (solo si el proveedor confirma que el email es suyo)
// o crea una nueva.
const obtenerOCrearUsuario = async (proveedor, perfil) => {
  const vinculado = await prisma.usuario.findFirst({
    where: { proveedorAuth: proveedor, proveedorId: perfil.id }
  });
  if (vinculado) return vinculado;

  if (perfil.email) {
    const mismoEmail = await prisma.usuario.findUnique({ where: { email: perfil.email } });
    if (mismoEmail) {
      if (!perfil.emailVerificado) return null;
      if (!mismoEmail.fotoUrl && perfil.fotoUrl) {
        return prisma.usuario.update({ where: { id: mismoEmail.id }, data: { fotoUrl: perfil.fotoUrl } });
      }
      return mismoEmail;
    }
  }

  return prisma.usuario.create({
    data: {
      // El email es obligatorio y único en el modelo; si el proveedor no lo
      // facilita se genera uno interno que no se usa para nada más.
      email: perfil.email || `${proveedor}-${perfil.id}@sin-email.hourplay`,
      nombre: perfil.nombre || null,
      fotoUrl: perfil.fotoUrl || null,
      proveedorAuth: proveedor,
      proveedorId: perfil.id
    }
  });
};

// Lista de proveedores con claves configuradas, para que el frontend sepa qué botones activar
router.get('/proveedores', (req, res) => {
  const disponibles = Object.keys(PROVEEDORES).filter((nombre) => PROVEEDORES[nombre].configurado());
  res.json({ exito: true, proveedores: disponibles });
});

router.get('/oauth/:proveedor', (req, res) => {
  const proveedor = PROVEEDORES[req.params.proveedor];
  if (!proveedor || !proveedor.configurado()) {
    return volverAlLogin(res, 'proveedor_no_disponible');
  }

  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(COOKIE_STATE, `${req.params.proveedor}:${state}`, opcionesCookieState);
  res.redirect(proveedor.urlAutorizacion(state));
});

// Google, GitHub y Facebook vuelven con GET (datos en la query) y Apple con POST
// (datos en un formulario), así que ambos métodos comparten el mismo manejador.
const manejarRetorno = async (req, res) => {
  const nombreProveedor = req.params.proveedor;
  const proveedor = PROVEEDORES[nombreProveedor];
  const datos = req.method === 'POST' ? req.body : req.query;

  const stateGuardado = leerCookie(req, COOKIE_STATE);
  res.clearCookie(COOKIE_STATE, { ...opcionesCookieState, maxAge: undefined });

  if (!proveedor || !proveedor.configurado()) {
    return volverAlLogin(res, 'proveedor_no_disponible');
  }
  // El usuario canceló en la pantalla del proveedor
  if (datos.error || !datos.code) {
    return volverAlLogin(res, 'cancelado');
  }
  if (!datos.state || stateGuardado !== `${nombreProveedor}:${datos.state}`) {
    return volverAlLogin(res, 'state_invalido');
  }

  try {
    const perfil = await proveedor.obtenerPerfil(datos);
    const usuario = await obtenerOCrearUsuario(nombreProveedor, perfil);
    if (!usuario) {
      return volverAlLogin(res, 'email_en_uso');
    }

    // Igual que en el login local, se guarda la sesión antes de redirigir
    req.session.usuarioId = usuario.id;
    req.session.save((err) => {
      if (err) {
        console.error(`Error al guardar sesión (${nombreProveedor}):`, err);
        return volverAlLogin(res, 'error_servidor');
      }
      res.redirect(303, `${URL_FRONTEND}/biblioteca`);
    });
  } catch (error) {
    console.error(`Error en el inicio de sesión con ${nombreProveedor}:`, error);
    volverAlLogin(res, 'error_proveedor');
  }
};

router.get('/oauth/:proveedor/callback', manejarRetorno);
router.post('/oauth/:proveedor/callback', express.urlencoded({ extended: false }), manejarRetorno);

module.exports = router;