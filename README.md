# HourPlay

**Español** | [English](README.en.md)

Aplicación web para organizar tu biblioteca de videojuegos, planificar sesiones de juego y recibir recomendaciones según el tiempo libre que tengas.

- **Frontend** (`client/`): React + Vite + Tailwind CSS
- **Backend** (`server/`): Node.js + Express + Prisma
- **Base de datos**: MySQL
- **APIs externas**: RAWG (catálogo de juegos) y HowLongToBeat (duraciones)

## Requisitos previos

1. Node.js instalado.
2. Un servidor MySQL en ejecución con una base de datos creada (por ejemplo, `hourplay`).
3. Una clave gratuita de la API de RAWG: https://rawg.io/apidocs

## 1. Servidor (backend) y base de datos

```bash
cd server
npm install
```

Copia el archivo de ejemplo de variables de entorno y rellénalo:

```bash
cp .env.example .env
```

| Variable         | Descripción                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | Conexión a MySQL: `mysql://usuario:contraseña@localhost:3306/hourplay` |
| `PORT`           | Puerto del servidor (por defecto `3000`)                           |
| `RAWG_API_KEY`   | Clave de la API de RAWG                                            |
| `SESSION_SECRET` | Clave larga y aleatoria para firmar las cookies de sesión          |

Para generar un `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crea las tablas en la base de datos y arranca el servidor:

```bash
npx prisma db push
npm run dev
```

### Inicio de sesión con Google, Apple, Facebook y GitHub (opcional)

Cada proveedor se activa al rellenar sus claves en `.env` (ver `.env.example`); los que no estén configurados aparecen desactivados en las pantallas de acceso y registro.

En la consola de desarrollador de cada proveedor hay que registrar esta URL de retorno:

```
{SERVER_URL}/api/auth/oauth/{proveedor}/callback
```

Por ejemplo, en local: `http://localhost:3000/api/auth/oauth/google/callback`.

| Variable                                       | Dónde se obtiene                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `SERVER_URL`                                   | URL pública del backend (por defecto `http://localhost:3000`)                    |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`     | Google Cloud Console → Credenciales → ID de cliente OAuth (aplicación web)       |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`     | GitHub → Settings → Developer settings → OAuth Apps                              |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`       | Meta for Developers → app con el producto "Inicio de sesión con Facebook"        |
| `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Apple Developer → Services ID, Team ID y una clave "Sign in with Apple" (.p8) |

Apple solo funciona con HTTPS y un dominio real (no admite `localhost`) y requiere una cuenta de Apple Developer de pago. Tras iniciar sesión, el usuario vuelve al frontend indicado en `CLIENT_URL` (en local, `http://localhost:5173`).

## 2. Cliente (frontend)

En otra terminal, con el servidor en marcha:

```bash
cd client
npm install
npm run dev
```

Abre en el navegador el enlace que aparece en la terminal (normalmente http://localhost:5173).

## Producción

Variables adicionales del servidor:

| Variable          | Descripción                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`        | `production`                                                                |
| `CLIENT_URL`      | Dominio(s) del frontend permitidos por CORS, separados por comas            |
| `COOKIE_SAMESITE` | `lax` (por defecto) o `none` si frontend y backend están en dominios distintos |

Variable del cliente (se fija al compilar con `npm run build`):

| Variable       | Descripción                                                |
| -------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | URL de la API, por ejemplo `https://api.tudominio.com/api` |
