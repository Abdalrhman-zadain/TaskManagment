# TeamTask Setup Guide

## Prerequisites

- Node.js
- PostgreSQL

PostgreSQL download: https://www.postgresql.org/download/windows

## 1. Create the database

1. Install PostgreSQL and keep your password.
2. Open pgAdmin.
3. Create a database named `teamtask`.

## 2. Configure backend env

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD_HERE@localhost:5432/teamtask?schema=public"
```

## 3. Run backend

In `backend`:

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend should run on `http://localhost:5000`.

Swagger docs: `http://localhost:5000/api-docs`

## 4. Run frontend

In a second terminal, in `frontend`:

```bash
npm install
npm run dev
```

Frontend should run on `http://localhost:5173`.

## 5. Local login (seeded users)

After `npm run seed`, use:

- CEO: `ceo@teamtask.com` / `admin123`
- Manager: `manager@teamtask.com` / `admin123`
- Employee: `employee1@teamtask.com` / `admin123`
- Client: `client@teamtask.com` / `admin123`

## 6. Share UI outside your network (Cloudflare Tunnel)

Important: tunnel the **frontend port**, not backend root.  
If you tunnel backend (`5000`), you will only see API JSON.

### A. Start backend

In `backend`:

```bash
npm run dev
```

### B. Start frontend on a fixed port

In `frontend`:

```bash
npm run dev -- --host 0.0.0.0 --port 5175 --strictPort
```

### C. Start Cloudflare tunnel

In `backend`:

```bash
.\cloudflared.exe tunnel --url http://localhost:5175 --no-autoupdate
```

Cloudflare will print a URL like:

```text
https://xxxx.trycloudflare.com
```

Share that URL.

### D. Stop sharing

Press `Ctrl + C` in the tunnel terminal.

## Vite config required for Cloudflare hostnames

`frontend/vite.config.js` must include:

```js
server: {
  host: '0.0.0.0',
  allowedHosts: ['.trycloudflare.com'],
  proxy: {
    '/api': 'http://localhost:5000'
  }
}
```

## Troubleshooting

- `Blocked request. This host is not allowed`  
  Add `allowedHosts: ['.trycloudflare.com']` to Vite server config and restart frontend.
- Login fails in local dev  
  Ensure Vite proxy points to `http://localhost:5000`.
- Only seeing `{"message":"TeamTask API is running"}`  
  You tunneled backend. Tunnel frontend port instead.

## Project structure

```text
teamtask/
|-- backend/
|   |-- prisma/schema.prisma
|   |-- routes/
|   |-- middleware/auth.js
|   |-- server.js
|   `-- .env
`-- frontend/
    |-- src/
    |   |-- pages/
    |   |-- components/
    |   `-- api/client.js
    `-- package.json
```

## Product overview (current roles)

- CEO
- Manager
- Employee
- Client

For full roadmap and deep feature details, see:

- `PROJECT_OVERVIEW.md`
- `FUTURE_WORK.md`
