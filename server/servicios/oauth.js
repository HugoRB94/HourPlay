// servicios/oauth.js - Inicio de sesión con proveedores externos (OAuth 2.0)
// He implementado el flujo "authorization code" a mano con el fetch nativo de Node,
// sin Passport ni librerías extra. Cada proveedor define tres cosas:
//   1. Si está configurado (tiene sus claves en el .env).
//   2. La URL de su pantalla de autorización.
//   3. Cómo canjear el código recibido por el perfil del usuario.
// El perfil se normaliza siempre al mismo formato:
//   { id, email, emailVerificado, nombre, fotoUrl }

const jwt = require('jsonwebtoken');

// URL pública del servidor, necesaria para construir las URLs de retorno (callback)
// que hay que registrar en la consola de cada proveedor.
const URL_SERVIDOR = (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');

const urlRetorno = (proveedor) => `${URL_SERVIDOR}/api/auth/oauth/${proveedor}/callback`;

// Petición auxiliar: lanza un error si el proveedor responde con un código no 2xx
const pedirJSON = async (url, opciones = {}) => {
  const respuesta = await fetch(url, opciones);
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || datos.error) {
    throw new Error(`Respuesta inválida de ${new URL(url).hostname}: ${JSON.stringify(datos)}`);
  }
  return datos;
};

// Canje estándar del código por un token (formulario x-www-form-urlencoded)
const canjearCodigo = (urlToken, parametros) => pedirJSON(urlToken, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
  body: new URLSearchParams(parametros)
});

// ============ GOOGLE ============
const google = {
  configurado: () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),

  urlAutorizacion: (state) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: urlRetorno('google'),
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    state
  }),

  obtenerPerfil: async ({ code }) => {
    const token = await canjearCodigo('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: urlRetorno('google'),
      grant_type: 'authorization_code'
    });
    const perfil = await pedirJSON('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    return {
      id: perfil.sub,
      email: perfil.email,
      emailVerificado: perfil.email_verified === true,
      nombre: perfil.name,
      fotoUrl: perfil.picture
    };
  }
};

// ============ GITHUB ============
const github = {
  configurado: () => Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),

  urlAutorizacion: (state) => 'https://github.com/login/oauth/authorize?' + new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: urlRetorno('github'),
    scope: 'read:user user:email',
    state
  }),

  obtenerPerfil: async ({ code }) => {
    const token = await canjearCodigo('https://github.com/login/oauth/access_token', {
      code,
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      redirect_uri: urlRetorno('github')
    });
    // La API de GitHub exige la cabecera User-Agent
    const cabeceras = { Authorization: `Bearer ${token.access_token}`, 'User-Agent': 'HourPlay' };
    const perfil = await pedirJSON('https://api.github.com/user', { headers: cabeceras });

    // El email del perfil puede ser privado (null). La lista de emails sí lo
    // incluye y además indica cuál es el principal y si está verificado.
    const emails = await pedirJSON('https://api.github.com/user/emails', { headers: cabeceras });
    const principal = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);

    return {
      id: String(perfil.id),
      email: principal?.email || perfil.email,
      emailVerificado: Boolean(principal),
      nombre: perfil.name || perfil.login,
      fotoUrl: perfil.avatar_url
    };
  }
};

// ============ FACEBOOK ============
const VERSION_GRAPH = 'v21.0';

const facebook = {
  configurado: () => Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),

  urlAutorizacion: (state) => `https://www.facebook.com/${VERSION_GRAPH}/dialog/oauth?` + new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: urlRetorno('facebook'),
    response_type: 'code',
    scope: 'email,public_profile',
    state
  }),

  obtenerPerfil: async ({ code }) => {
    const token = await pedirJSON(`https://graph.facebook.com/${VERSION_GRAPH}/oauth/access_token?` + new URLSearchParams({
      code,
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: urlRetorno('facebook')
    }));
    const perfil = await pedirJSON(`https://graph.facebook.com/me?` + new URLSearchParams({
      fields: 'id,name,email,picture.type(large)',
      access_token: token.access_token
    }));
    return {
      id: perfil.id,
      // Facebook solo devuelve emails confirmados, pero puede no devolver ninguno
      // (cuentas creadas con teléfono o si el usuario deniega el permiso).
      email: perfil.email,
      emailVerificado: Boolean(perfil.email),
      nombre: perfil.name,
      fotoUrl: perfil.picture?.data?.url
    };
  }
};

// ============ APPLE ============
// Apple tiene dos particularidades:
//  - El client_secret no es fijo: es un JWT firmado (ES256) con la clave privada .p8.
//  - Al pedir nombre o email responde con un POST (response_mode=form_post) y el
//    nombre solo se envía la PRIMERA vez que el usuario autoriza la aplicación.
const clientSecretApple = () => jwt.sign({}, process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'), {
  algorithm: 'ES256',
  expiresIn: '5m',
  issuer: process.env.APPLE_TEAM_ID,
  subject: process.env.APPLE_CLIENT_ID,
  audience: 'https://appleid.apple.com',
  keyid: process.env.APPLE_KEY_ID
});

const apple = {
  configurado: () => Boolean(
    process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID &&
    process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY
  ),

  urlAutorizacion: (state) => 'https://appleid.apple.com/auth/authorize?' + new URLSearchParams({
    client_id: process.env.APPLE_CLIENT_ID,
    redirect_uri: urlRetorno('apple'),
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'name email',
    state
  }),

  obtenerPerfil: async ({ code, user }) => {
    const token = await canjearCodigo('https://appleid.apple.com/auth/token', {
      code,
      client_id: process.env.APPLE_CLIENT_ID,
      client_secret: clientSecretApple(),
      redirect_uri: urlRetorno('apple'),
      grant_type: 'authorization_code'
    });
    // El id_token llega directamente de Apple por HTTPS en la respuesta del servidor,
    // así que basta con decodificarlo para leer sus datos.
    const datos = jwt.decode(token.id_token);

    let nombre;
    try {
      const { firstName, lastName } = JSON.parse(user || '{}').name || {};
      nombre = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    } catch {
      nombre = undefined;
    }

    return {
      id: datos.sub,
      email: datos.email,
      emailVerificado: datos.email_verified === true || datos.email_verified === 'true',
      nombre,
      fotoUrl: undefined
    };
  }
};

const PROVEEDORES = { google, apple, facebook, github };

module.exports = { PROVEEDORES };
