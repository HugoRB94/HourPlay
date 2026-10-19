# HourPlay

[Español](README.md) | **English**

Web app to organize your video game library, plan play sessions and get recommendations based on how much free time you have.

- **Frontend** (`client/`): React + Vite + Tailwind CSS
- **Backend** (`server/`): Node.js + Express + Prisma
- **Database**: MySQL
- **External APIs**: RAWG (game catalog) and HowLongToBeat (game lengths)

## Prerequisites

1. Node.js installed.
2. A running MySQL server with a database created (for example, `hourplay`).
3. A free RAWG API key: https://rawg.io/apidocs

## 1. Server (backend) and database

```bash
cd server
npm install
```

Copy the example environment file and fill it in:

```bash
cp .env.example .env
```

| Variable         | Description                                                        |
| ---------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`   | MySQL connection: `mysql://user:password@localhost:3306/hourplay`  |
| `PORT`           | Server port (default `3000`)                                       |
| `RAWG_API_KEY`   | RAWG API key                                                       |
| `SESSION_SECRET` | Long random string used to sign session cookies                    |

To generate a `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the database tables and start the server:

```bash
npx prisma db push
npm run dev
```

## 2. Client (frontend)

In another terminal, with the server running:

```bash
cd client
npm install
npm run dev
```

Open the link shown in the terminal in your browser (usually http://localhost:5173).

## Production

Additional server variables:

| Variable          | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `NODE_ENV`        | `production`                                                                |
| `CLIENT_URL`      | Frontend domain(s) allowed by CORS, comma-separated                         |
| `COOKIE_SAMESITE` | `lax` (default) or `none` if frontend and backend are on different domains  |

Client variable (set at build time with `npm run build`):

| Variable       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `VITE_API_URL` | API URL, for example `https://api.yourdomain.com/api`    |
