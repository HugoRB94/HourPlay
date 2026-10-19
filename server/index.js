// index.js - Punto de entrada del servidor backend de HourPlay
// Este archivo inicializa Express, configura middlewares básicos y define
// las rutas principales de la API REST que consumirá el frontend React.

// Importación de dependencias necesarias
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importación de las rutas
const rutasUsuarios = require('./rutas/usuarios');
const rutasJuegos = require('./rutas/juegos');
const rutasBusqueda = require('./rutas/busqueda');
const rutasRecomendador = require('./rutas/recomendador');
const rutasSesiones = require('./rutas/sesiones');
const session = require('express-session');
const { PrismaSessionStore } = require('@quixo3/prisma-session-store');
const prisma = require('./prisma');
const authRoutes = require('./rutas/auth');

// Inicialización de la aplicación Express
const app = express();

// Configuración del puerto del servidor
// Si existe la variable de entorno PORT la usa, sino usa 3000 por defecto
// Esto es útil para cuando despleguemos en producción (Railway, Render, etc.)
const PUERTO = process.env.PORT || 3000;

// ============ MIDDLEWARES ============
// Para garantizar una arquitectura robusta, los middlewares se declaran 
// siguiendo un orden estricto de ejecución antes de alcanzar las rutas.

// En producción el servidor va detrás del proxy HTTPS del hosting. Esto hace
// que Express confíe en él y sepa que la conexión original era segura,
// requisito para poder enviar cookies con secure: true.
const EN_PRODUCCION = process.env.NODE_ENV === 'production';
if (EN_PRODUCCION) {
  app.set('trust proxy', 1);
}

// 1. Validación de orígenes en el middleware CORS.
// Se permite cualquier instancia local (localhost o 127.0.0.1) sea cual sea el
// puerto que asigne Vite, y además los dominios indicados en CLIENT_URL
// (separados por comas, por ejemplo: https://tudominio.com,https://www.tudominio.com).
// Se compara el nombre de host exacto y no con includes(), porque includes('localhost')
// también aceptaría orígenes maliciosos como http://localhost.atacante.com.
const ORIGENES_PERMITIDOS = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

const esOrigenLocal = (origen) => {
  try {
    const { hostname } = new URL(origen);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

app.use(cors({
  origin: function (origen, callback) {
    if (!origen || ORIGENES_PERMITIDOS.includes(origen) || (!EN_PRODUCCION && esOrigenLocal(origen))) {
      callback(null, true);
    } else {
      callback(new Error('Petición bloqueada por la política CORS del servidor'));
    }
  },
  credentials: true
}));

// 2. express.json(): Permite que el servidor analice el cuerpo de las peticiones
// entrantes en formato JSON. Su declaración temprana garantiza que el objeto
// req.body esté disponible para los middlewares de sesión y enrutamiento posteriores.
app.use(express.json());

// 3. La implementación del middleware express-session es el núcleo de la
// arquitectura de autenticación con estado en el backend. He configurado
// la sesión con una clave secreta y directivas HTTP-only para mitigar
// vulnerabilidades y ataques de tipo Cross-Site Scripting (XSS).
// La clave se lee de SESSION_SECRET (.env); sin ella el servidor no arranca,
// para no firmar nunca las cookies con una clave conocida.
if (!process.env.SESSION_SECRET) {
  console.error('❌ Falta SESSION_SECRET en el archivo .env (consulta .env.example)');
  process.exit(1);
}

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // Las sesiones se guardan en MySQL (tabla sesiones_login) en lugar de en memoria,
  // así sobreviven a los reinicios del servidor y no crecen sin control.
  store: new PrismaSessionStore(prisma, {
    checkPeriod: 1000 * 60 * 60, // Cada hora se borran las sesiones caducadas
    dbRecordIdIsSessionId: true
  }),
  cookie: {
    secure: EN_PRODUCCION, // En producción solo se envía por HTTPS
    httpOnly: true,
    // 'lax' sirve si frontend y backend comparten dominio (tudominio.com y api.tudominio.com).
    // Si están en dominios distintos (p. ej. vercel.app y railway.app) hay que poner
    // COOKIE_SAMESITE=none en producción.
    sameSite: process.env.COOKIE_SAMESITE || 'lax',
    maxAge: 1000 * 60 * 60 * 24 // Establezco un ciclo de vida de 24 horas para la cookie
  }
}));

// ============ RUTAS DE LA API ============

// La ruta de autenticación se monta inyectando el enrutador modular.
// Gestiona el registro, inicio de sesión y validación de cookies de los usuarios.
app.use('/api/auth', authRoutes);

// Ruta de prueba para verificar que el servidor funciona correctamente
// Cuando accedas a http://localhost:3000/ verás este mensaje
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🎮 Servidor de HourPlay funcionando correctamente',
    version: '1.0.0',
    estado: 'activo',
    endpoints: {
      usuarios: '/api/usuarios',
      juegos: '/api/juegos',
      busqueda: '/api/busqueda',
      recomendador: '/api/recomendador'
    }   
  });
});

// Ruta de prueba para la API
// http://localhost:3000/api/test
app.get('/api/test', (req, res) => {
  res.json({ 
    mensaje: 'API funcionando',
    timestamp: new Date().toISOString()
  });
});

// Todas las rutas de usuarios estarán bajo /api/usuarios
app.use('/api/usuarios', rutasUsuarios);

// Todas las rutas de juegos estarán bajo /api/juegos
app.use('/api/juegos', rutasJuegos);

// Todas las rutas de búsqueda estarán bajo /api/busqueda
app.use('/api/busqueda', rutasBusqueda);

// Todas las rutas del recomendador estarán bajo /api/recomendador
app.use('/api/recomendador', rutasRecomendador);

// Todas las rutas de sesiones estarán bajo /api/sesiones
app.use('/api/sesiones', rutasSesiones);

// ============ MANEJO DE ERRORES 404 ============
// Si ninguna ruta coincide, devuelve un error 404 estructurado
app.use((req, res) => {
  res.status(404).json({
    exito: false,
    mensaje: 'Ruta no encontrada',
    ruta: req.path
  });
});

// ============ INICIO DEL SERVIDOR ============

app.listen(PUERTO, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PUERTO}`);
  console.log(`📦 Base de datos: ${process.env.DATABASE_URL ? 'Conectada' : 'No configurada'}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   - GET    /api/usuarios`);
  console.log(`   - POST   /api/usuarios`);
  console.log(`   - GET    /api/usuarios/:id`);
  console.log(`   - GET    /api/juegos`);
  console.log(`   - POST   /api/juegos`);
  console.log(`   - PUT    /api/juegos/:id`);
  console.log(`   - DELETE /api/juegos/:id`);
  console.log(`   - GET    /api/juegos/filtrar`);
  console.log(`   - GET    /api/busqueda/juegos?q=nombre`);
  console.log(`   - POST   /api/recomendador`);
  console.log(`   - GET    /api/recomendador/aleatorio`);
});